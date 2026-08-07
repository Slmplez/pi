using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetReadTextCodeArguments
{
    public string ComponentPath { get; set; }
    public string MethodName { get; set; }
    public string Section { get; set; }
    public bool EmitJson { get; set; }
}

public sealed class AscetReadCodeResult
{
    public string ComponentPath { get; set; }
    public AscetComponentKind ComponentKind { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
    public string Section { get; set; }
    public string MethodName { get; set; }
    public string Text { get; set; }
}

public static class AscetReadTextCode
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetReadTextCodeArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            ComponentLocatorService locator = new ComponentLocatorService();
            TextCodeService textCodeService = new TextCodeService();
            MethodCatalogService methods = new MethodCatalogService();
            StateMachineAnalysisService stateMachineAnalysis = new StateMachineAnalysisService();

            AscetItemPath parsed = AscetItemPath.Parse(arguments.ComponentPath);
            AscetItemRef component = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
            AscetReadCodeResult result = GetReadCodeResult(arguments, component, textCodeService, methods, stateMachineAnalysis);

            string output = arguments.EmitJson
                ? FormatJsonOutput(result)
                : FormatTextOutput(result);

            Console.SetOut(originalOut);
            Console.Write(output);
            return 0;
        }
        catch (Exception ex)
        {
            Console.SetOut(originalOut);
            Console.Error.WriteLine(FormatException(ex));
            return 1;
        }
        finally
        {
            Console.SetOut(originalOut);
            if (suppressedOut != null)
            {
                suppressedOut.Dispose();
            }
        }
    }

    public static AscetReadTextCodeArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec read_text_code <component-path> [--method-name <name>] [--section <auto|header|body|external-c|all>] [--json]");
        }

        AscetReadTextCodeArguments result = new AscetReadTextCodeArguments
        {
            ComponentPath = NormalizeComponentPath(args[0]),
            MethodName = String.Empty,
            Section = "auto",
            EmitJson = false
        };

        for (int i = 1; i < args.Length; i++)
        {
            string argument = args[i];
            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                result.EmitJson = true;
                continue;
            }

            if (String.Equals(argument, "--section", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --section.");
                }

                result.Section = NormalizeSection(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--method-name", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --method-name.");
                }

                result.MethodName = NormalizeMethodName(args[++i]);
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        return result;
    }

    private static string NormalizeSection(string value)
    {
        string normalized = (value ?? String.Empty).Trim().ToLowerInvariant();
        switch (normalized)
        {
            case "auto":
            case "body":
            case "all":
            case "header":
            case "external-c":
                return normalized;
            default:
                throw new AscetReadException("invalid_section", "section", "Unsupported section '" + value + "'. Expected auto, header, body, external-c, or all.");
        }
    }

    public static string NormalizeComponentPath(string componentPath)
    {
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            throw new AscetReadException("invalid_argument", "normalize_component_path", "Component path must not be empty.");
        }

        string normalized = componentPath.Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }

        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException("invalid_argument", "normalize_component_path", "Component path must contain a component name.");
        }

        return normalized;
    }

    private static string NormalizeMethodName(string methodName)
    {
        if (String.IsNullOrWhiteSpace(methodName))
        {
            throw new AscetReadException("invalid_argument", "normalize_method_name", "Method name must not be empty.");
        }

        return methodName.Trim();
    }

    private static AscetReadCodeResult GetReadCodeResult(
        AscetReadTextCodeArguments arguments,
        AscetItemRef component,
        TextCodeService textCodeService,
        MethodCatalogService methods,
        StateMachineAnalysisService stateMachineAnalysis)
    {
        if (component == null)
        {
            throw new AscetReadException("component_not_found", "read_code", "Component could not be resolved.");
        }

        EnsureCodeTargetSupported(component);

        string section = arguments == null ? "auto" : (arguments.Section ?? "auto");
        string methodName = arguments == null ? String.Empty : (arguments.MethodName ?? String.Empty);

        if (component.LanguageKind == AscetLanguageKind.ESDL)
        {
            EnsureEsdlSectionSupported(section);
        }

        if (!String.IsNullOrWhiteSpace(methodName))
        {
            EnsureMethodCodeSupported(component);
            AscetMethodCode methodCode = methods.GetMethodCode(component, methodName);
            if (methodCode == null)
            {
                throw new AscetReadException("method_not_found",
                    "read_code",
                    "Method '" + methodName + "' was not found in component '" + component.Path + "'.");
            }

            return new AscetReadCodeResult
            {
                ComponentPath = component.Path,
                ComponentKind = component.Kind,
                LanguageKind = component.LanguageKind,
                Section = section,
                MethodName = methodCode.MethodName ?? methodName,
                Text = methodCode.Code ?? String.Empty
            };
        }

        if (component.LanguageKind == AscetLanguageKind.C)
        {
            AscetTextCode textCode = textCodeService.GetTextCode(component);
            return new AscetReadCodeResult
            {
                ComponentPath = component.Path,
                ComponentKind = component.Kind,
                LanguageKind = component.LanguageKind,
                Section = section,
                MethodName = String.Empty,
                Text = SelectCCodeSection(section, textCode)
            };
        }

        if (component.LanguageKind == AscetLanguageKind.ESDL)
        {
            string text =
                component.Kind == AscetComponentKind.StateMachine
                    ? BuildStateMachineEsdlText(stateMachineAnalysis.GetSemanticSummary(component), section)
                    : JoinMethodCodes(methods.GetAllMethodCodes(component));
            if (String.IsNullOrWhiteSpace(text))
            {
                throw new AscetReadException("text_code_not_supported", "read_code", "ESDL code view is not available for this target.");
            }

            return new AscetReadCodeResult
            {
                ComponentPath = component.Path,
                ComponentKind = component.Kind,
                LanguageKind = component.LanguageKind,
                Section = section,
                MethodName = String.Empty,
                Text = text
            };
        }

        throw new AscetReadException("text_code_not_supported", "read_code", "Code view is not available for this target.");
    }

    private static void EnsureCodeTargetSupported(AscetItemRef component)
    {
        if (component.Kind == AscetComponentKind.Project || component.Kind == AscetComponentKind.Container)
        {
            throw new AscetReadException("unsupported_target_kind", "read_code", "Target kind does not provide a code view.");
        }

        if (component.LanguageKind == AscetLanguageKind.BDE)
        {
            throw new AscetReadException("text_code_not_supported", "read_code", "Code view is not available for BDE components.");
        }
    }

    private static void EnsureMethodCodeSupported(AscetItemRef component)
    {
        EnsureCodeTargetSupported(component);
    }

    private static void EnsureEsdlSectionSupported(string section)
    {
        if (String.Equals(section, "header", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(section, "external-c", StringComparison.OrdinalIgnoreCase))
        {
            throw new AscetReadException("invalid_section", "section", "Requested code section is not supported for this target.");
        }
    }

    private static string SelectCCodeSection(string section, AscetTextCode textCode)
    {
        string headerCode = textCode == null ? String.Empty : (textCode.HeaderCode ?? String.Empty);
        string externalCCode = textCode == null ? String.Empty : (textCode.ExternalCCode ?? String.Empty);

        switch ((section ?? "auto").Trim().ToLowerInvariant())
        {
            case "header":
                return headerCode;
            case "external-c":
            case "body":
                return externalCCode;
            case "all":
                return AscetReadComponentCode.FormatTextCode(textCode);
            case "auto":
            default:
                if (!String.IsNullOrWhiteSpace(externalCCode))
                {
                    return externalCCode;
                }

                return headerCode;
        }
    }

    private static string JoinMethodCodes(IList<AscetMethodCode> methodCodes)
    {
        if (methodCodes == null || methodCodes.Count == 0)
        {
            return String.Empty;
        }

        StringBuilder builder = new StringBuilder();

        for (int i = 0; i < methodCodes.Count; i++)
        {
            AscetMethodCode methodCode = methodCodes[i];
            if (methodCode == null || String.IsNullOrWhiteSpace(methodCode.Code))
            {
                continue;
            }

            if (builder.Length > 0)
            {
                builder.AppendLine();
            }

            builder.Append("=== Method: ")
                .Append(methodCode.MethodName ?? String.Empty)
                .Append(" (")
                .Append(methodCode.MethodKind.ToString())
                .Append(") ===")
                .AppendLine();
            builder.Append(methodCode.Code ?? String.Empty);
            if (!String.IsNullOrEmpty(methodCode.Code) && !methodCode.Code.EndsWith(Environment.NewLine, StringComparison.Ordinal))
            {
                builder.AppendLine();
            }
        }

        return builder.ToString();
    }

    private static string BuildStateMachineEsdlText(AscetStateMachineSemanticSummary summary, string section)
    {
        if (summary == null)
        {
            return String.Empty;
        }

        string normalizedSection = (section ?? "auto").Trim().ToLowerInvariant();
        StringBuilder builder = new StringBuilder();

        if (normalizedSection == "all")
        {
            AppendStateMachineBindings(builder, summary.States, "EntryAction", "ExitAction", "StaticAction");
            AppendStateMachineBindings(builder, summary.Transitions, "Trigger", "Guard", "Action");

            string methodsText = JoinMethodCodes(summary.Methods);
            if (!String.IsNullOrWhiteSpace(methodsText))
            {
                if (builder.Length > 0)
                {
                    builder.AppendLine();
                }

                builder.Append(methodsText);
            }

            return builder.ToString();
        }

        AppendStateMachineBindings(builder, summary.Transitions, "Trigger", "Guard", "Action");
        if (builder.Length == 0)
        {
            AppendStateMachineBindings(builder, summary.States, "EntryAction", "ExitAction", "StaticAction");
        }

        return builder.ToString();
    }

    private static void AppendStateMachineBindings(
        StringBuilder builder,
        IList<AscetStateSemanticRef> states,
        params string[] roles)
    {
        if (builder == null || states == null)
        {
            return;
        }

        for (int i = 0; i < states.Count; i++)
        {
            AscetStateSemanticRef state = states[i];
            if (state == null || state.Bindings == null)
            {
                continue;
            }

            for (int j = 0; j < state.Bindings.Count; j++)
            {
                AscetStateMachineMethodBindingRef binding = state.Bindings[j];
                if (!ShouldIncludeBinding(binding, roles))
                {
                    continue;
                }

                AppendBindingCode(builder, "State", state.Name, binding);
            }
        }
    }

    private static void AppendStateMachineBindings(
        StringBuilder builder,
        IList<AscetTransitionSemanticRef> transitions,
        params string[] roles)
    {
        if (builder == null || transitions == null)
        {
            return;
        }

        for (int i = 0; i < transitions.Count; i++)
        {
            AscetTransitionSemanticRef transition = transitions[i];
            if (transition == null || transition.Bindings == null)
            {
                continue;
            }

            for (int j = 0; j < transition.Bindings.Count; j++)
            {
                AscetStateMachineMethodBindingRef binding = transition.Bindings[j];
                if (!ShouldIncludeBinding(binding, roles))
                {
                    continue;
                }

                AppendBindingCode(builder, "Transition", transition.Name, binding);
            }
        }
    }

    private static bool ShouldIncludeBinding(AscetStateMachineMethodBindingRef binding, string[] roles)
    {
        if (binding == null || String.IsNullOrWhiteSpace(binding.Code))
        {
            return false;
        }

        if (roles == null || roles.Length == 0)
        {
            return true;
        }

        for (int i = 0; i < roles.Length; i++)
        {
            if (String.Equals(binding.Role, roles[i], StringComparison.Ordinal))
            {
                return true;
            }
        }

        return false;
    }

    private static void AppendBindingCode(StringBuilder builder, string ownerType, string ownerName, AscetStateMachineMethodBindingRef binding)
    {
        if (builder == null || binding == null || String.IsNullOrWhiteSpace(binding.Code))
        {
            return;
        }

        if (builder.Length > 0)
        {
            builder.AppendLine();
        }

        builder.Append("=== ")
            .Append(ownerType ?? String.Empty)
            .Append(": ")
            .Append(ownerName ?? String.Empty)
            .Append(" / ")
            .Append(binding.Role ?? String.Empty);

        if (!String.IsNullOrWhiteSpace(binding.MethodName))
        {
            builder.Append(" / ").Append(binding.MethodName);
        }

        builder.Append(" ===").AppendLine();
        builder.Append(binding.Code ?? String.Empty);
        if (!String.IsNullOrEmpty(binding.Code) && !binding.Code.EndsWith(Environment.NewLine, StringComparison.Ordinal))
        {
            builder.AppendLine();
        }
    }

    public static string FormatTextOutput(AscetReadCodeResult result)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(result == null ? String.Empty : (result.ComponentPath ?? String.Empty)).AppendLine();
        builder.Append("ComponentKind: ").Append(result == null ? AscetComponentKind.Unknown.ToString() : result.ComponentKind.ToString()).AppendLine();
        builder.Append("LanguageKind: ").Append(result == null ? AscetLanguageKind.Unknown.ToString() : result.LanguageKind.ToString()).AppendLine();
        builder.Append("Section: ").Append(result == null ? String.Empty : (result.Section ?? String.Empty)).AppendLine();
        if (result != null && !String.IsNullOrWhiteSpace(result.MethodName))
        {
            builder.Append("Method: ").Append(result.MethodName).AppendLine();
        }
        builder.AppendLine("Code:");
        builder.Append(result == null ? String.Empty : (result.Text ?? String.Empty));
        if (result != null && !String.IsNullOrEmpty(result.Text) && !result.Text.EndsWith(Environment.NewLine, StringComparison.Ordinal))
        {
            builder.AppendLine();
        }

        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetReadCodeResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = result == null ? String.Empty : (result.ComponentPath ?? String.Empty);
        payload["componentKind"] = result == null ? AscetComponentKind.Unknown.ToString() : result.ComponentKind.ToString();
        payload["kind"] = result == null ? "unknown" : KindToSchema(result.ComponentKind);
        payload["languageKind"] = result == null ? AscetLanguageKind.Unknown.ToString() : result.LanguageKind.ToString();
        payload["section"] = result == null ? "auto" : (result.Section ?? "auto");
        payload["text"] = result == null ? String.Empty : (result.Text ?? String.Empty);
        if (result != null && !String.IsNullOrWhiteSpace(result.MethodName))
        {
            payload["methodName"] = result.MethodName;
        }
        return AscetJsonContract.Serialize(payload);
    }

    private static string KindToSchema(AscetComponentKind kind)
    {
        switch (kind)
        {
            case AscetComponentKind.Class:
                return "class";
            case AscetComponentKind.Module:
                return "module";
            case AscetComponentKind.StateMachine:
                return "statemachine";
            case AscetComponentKind.Project:
                return "project";
            case AscetComponentKind.ContinuousTimeBlock:
                return "continuous-time-block";
            case AscetComponentKind.Enumeration:
                return "enumeration";
            case AscetComponentKind.Record:
                return "record";
            case AscetComponentKind.Icon:
                return "icon";
            case AscetComponentKind.Signal:
                return "signal";
            case AscetComponentKind.Container:
                return "container";
            default:
                return "unknown";
        }
    }

    private static string FormatException(Exception ex)
    {
        AscetReadException ascet = ex as AscetReadException;
        if (ascet != null)
        {
            return ascet.Code + ":" + ascet.Operation + ":" + ascet.Message;
        }

        return ex.GetType().FullName + ":" + ex.Message;
    }
}
