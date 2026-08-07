using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

public enum AscetSetStateMachineCodeOperation
{
    SetMethod = 1,
    SetStateEntryActionEsdl = 2,
    SetStateExitActionEsdl = 3,
    SetStateStaticActionEsdl = 4,
    BindStateEntryActionMethod = 5,
    BindStateExitActionMethod = 6,
    BindStateStaticActionMethod = 7,
    SetTransitionConditionEsdl = 8,
    SetTransitionActionEsdl = 9,
    BindTransitionConditionMethod = 10,
    BindTransitionActionMethod = 11,
    SetStartState = 12
}

public sealed class AscetSetStateMachineCodeArguments
{
    public string StateMachinePath { get; set; }
    public AscetSetStateMachineCodeOperation Operation { get; set; }
    public AscetStateSelector StateSelector { get; set; }
    public AscetTransitionSelector TransitionSelector { get; set; }
    public string MethodName { get; set; }
    public string CodeFilePath { get; set; }
    public bool VerifyReadback { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetSetStateMachineCode
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetSetStateMachineCodeArguments parsed = ParseArguments(args);
            if (parsed.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            string code = RequiresCodeFile(parsed.Operation) ? ReadCodeFile(parsed.CodeFilePath, parsed.Operation) : null;
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            ComponentLocatorService locator = new ComponentLocatorService();
            ComponentWriteRouter router = new ComponentWriteRouter();
            AscetItemPath itemPath = AscetItemPath.Parse(parsed.StateMachinePath);
            AscetItemRef stateMachine = locator.FindItemInFolder(itemPath.ItemName, itemPath.FolderPath);
            string output;

            switch (parsed.Operation)
            {
                case AscetSetStateMachineCodeOperation.SetMethod:
                    AscetMethodWriteResult methodResult = router.SetMethodCode(stateMachine, parsed.MethodName, code, parsed.VerifyReadback);
                    output = parsed.EmitJson ? FormatMethodJsonOutput(parsed.Operation, methodResult) : FormatMethodTextOutput(parsed.Operation, methodResult);
                    break;
                case AscetSetStateMachineCodeOperation.SetStateEntryActionEsdl:
                    output = FormatStateMachineOutput(parsed, router.SetStateEntryActionEsdl(stateMachine, parsed.StateSelector, code, parsed.VerifyReadback));
                    break;
                case AscetSetStateMachineCodeOperation.SetStateExitActionEsdl:
                    output = FormatStateMachineOutput(parsed, router.SetStateExitActionEsdl(stateMachine, parsed.StateSelector, code, parsed.VerifyReadback));
                    break;
                case AscetSetStateMachineCodeOperation.SetStateStaticActionEsdl:
                    output = FormatStateMachineOutput(parsed, router.SetStateStaticActionEsdl(stateMachine, parsed.StateSelector, code, parsed.VerifyReadback));
                    break;
                case AscetSetStateMachineCodeOperation.BindStateEntryActionMethod:
                    output = FormatStateMachineOutput(parsed, router.BindStateEntryActionMethod(stateMachine, parsed.StateSelector, parsed.MethodName, parsed.VerifyReadback));
                    break;
                case AscetSetStateMachineCodeOperation.BindStateExitActionMethod:
                    output = FormatStateMachineOutput(parsed, router.BindStateExitActionMethod(stateMachine, parsed.StateSelector, parsed.MethodName, parsed.VerifyReadback));
                    break;
                case AscetSetStateMachineCodeOperation.BindStateStaticActionMethod:
                    output = FormatStateMachineOutput(parsed, router.BindStateStaticActionMethod(stateMachine, parsed.StateSelector, parsed.MethodName, parsed.VerifyReadback));
                    break;
                case AscetSetStateMachineCodeOperation.SetTransitionConditionEsdl:
                    output = FormatStateMachineOutput(parsed, router.SetTransitionConditionEsdl(stateMachine, parsed.TransitionSelector, code, parsed.VerifyReadback));
                    break;
                case AscetSetStateMachineCodeOperation.SetTransitionActionEsdl:
                    output = FormatStateMachineOutput(parsed, router.SetTransitionActionEsdl(stateMachine, parsed.TransitionSelector, code, parsed.VerifyReadback));
                    break;
                case AscetSetStateMachineCodeOperation.BindTransitionConditionMethod:
                    output = FormatStateMachineOutput(parsed, router.BindTransitionConditionMethod(stateMachine, parsed.TransitionSelector, parsed.MethodName, parsed.VerifyReadback));
                    break;
                case AscetSetStateMachineCodeOperation.BindTransitionActionMethod:
                    output = FormatStateMachineOutput(parsed, router.BindTransitionActionMethod(stateMachine, parsed.TransitionSelector, parsed.MethodName, parsed.VerifyReadback));
                    break;
                case AscetSetStateMachineCodeOperation.SetStartState:
                    output = FormatStateMachineOutput(parsed, router.SetStartState(stateMachine, parsed.StateSelector, parsed.VerifyReadback));
                    break;
                default:
                    throw new AscetReadException("invalid_argument", "main", "Unsupported state-machine write operation '" + parsed.Operation.ToString() + "'.");
            }

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

    public static AscetSetStateMachineCodeArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 3)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec set_state_machine_code <state-machine-path> <operation> <state-name|source-state target-state priority|method-name> <code-file|method-name?> [--verify-readback] [--json]");
        }

        AscetSetStateMachineCodeOperation operation = ParseOperation(args[1]);
        AscetSetStateMachineCodeArguments result = new AscetSetStateMachineCodeArguments
        {
            StateMachinePath = NormalizeComponentPath(args[0]),
            Operation = operation,
            StateSelector = null,
            TransitionSelector = null,
            MethodName = String.Empty,
            CodeFilePath = String.Empty,
            VerifyReadback = false,
            EmitJson = false
        };

        int index = 2;
        switch (operation)
        {
            case AscetSetStateMachineCodeOperation.SetMethod:
                EnsureRemaining(args, index, 2, operation, "set-method expects <method-name> <code-file>.");
                result.MethodName = NormalizeRequiredValue(args[index++], "Method name must not be empty.");
                result.CodeFilePath = NormalizeRequiredValue(args[index++], "Code file path must not be empty.");
                break;
            case AscetSetStateMachineCodeOperation.SetStateEntryActionEsdl:
            case AscetSetStateMachineCodeOperation.SetStateExitActionEsdl:
            case AscetSetStateMachineCodeOperation.SetStateStaticActionEsdl:
                EnsureRemaining(args, index, 2, operation, operation.ToString() + " expects <state-name> <code-file>.");
                result.StateSelector = new AscetStateSelector { Name = NormalizeRequiredValue(args[index++], "State name must not be empty.") };
                result.CodeFilePath = NormalizeRequiredValue(args[index++], "Code file path must not be empty.");
                break;
            case AscetSetStateMachineCodeOperation.BindStateEntryActionMethod:
            case AscetSetStateMachineCodeOperation.BindStateExitActionMethod:
            case AscetSetStateMachineCodeOperation.BindStateStaticActionMethod:
                EnsureRemaining(args, index, 2, operation, operation.ToString() + " expects <state-name> <method-name>.");
                result.StateSelector = new AscetStateSelector { Name = NormalizeRequiredValue(args[index++], "State name must not be empty.") };
                result.MethodName = NormalizeRequiredValue(args[index++], "Method name must not be empty.");
                break;
            case AscetSetStateMachineCodeOperation.SetTransitionConditionEsdl:
            case AscetSetStateMachineCodeOperation.SetTransitionActionEsdl:
                EnsureRemaining(args, index, 4, operation, operation.ToString() + " expects <source-state> <target-state> <priority> <code-file>.");
                result.TransitionSelector = ParseTransitionSelector(args[index++], args[index++], args[index++]);
                result.CodeFilePath = NormalizeRequiredValue(args[index++], "Code file path must not be empty.");
                break;
            case AscetSetStateMachineCodeOperation.BindTransitionConditionMethod:
            case AscetSetStateMachineCodeOperation.BindTransitionActionMethod:
                EnsureRemaining(args, index, 4, operation, operation.ToString() + " expects <source-state> <target-state> <priority> <method-name>.");
                result.TransitionSelector = ParseTransitionSelector(args[index++], args[index++], args[index++]);
                result.MethodName = NormalizeRequiredValue(args[index++], "Method name must not be empty.");
                break;
            case AscetSetStateMachineCodeOperation.SetStartState:
                EnsureRemaining(args, index, 1, operation, "set-start-state expects <state-name>.");
                result.StateSelector = new AscetStateSelector { Name = NormalizeRequiredValue(args[index++], "State name must not be empty.") };
                break;
            default:
                throw new AscetReadException("invalid_argument", "parse_arguments", "Unsupported state-machine write operation '" + operation.ToString() + "'.");
        }

        for (int i = index; i < args.Length; i++)
        {
            string argument = args[i];
            if (String.Equals(argument, "--verify-readback", StringComparison.OrdinalIgnoreCase))
            {
                result.VerifyReadback = true;
                continue;
            }
            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                result.EmitJson = true;
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        return result;
    }

    public static AscetSetStateMachineCodeOperation ParseOperation(string value)
    {
        string normalized = NormalizeRequiredValue(value, "Operation must not be empty.").ToLowerInvariant();
        switch (normalized)
        {
            case "set-method":
                return AscetSetStateMachineCodeOperation.SetMethod;
            case "set-state-entry-esdl":
                return AscetSetStateMachineCodeOperation.SetStateEntryActionEsdl;
            case "set-state-exit-esdl":
                return AscetSetStateMachineCodeOperation.SetStateExitActionEsdl;
            case "set-state-static-esdl":
                return AscetSetStateMachineCodeOperation.SetStateStaticActionEsdl;
            case "bind-state-entry-method":
                return AscetSetStateMachineCodeOperation.BindStateEntryActionMethod;
            case "bind-state-exit-method":
                return AscetSetStateMachineCodeOperation.BindStateExitActionMethod;
            case "bind-state-static-method":
                return AscetSetStateMachineCodeOperation.BindStateStaticActionMethod;
            case "set-transition-condition-esdl":
                return AscetSetStateMachineCodeOperation.SetTransitionConditionEsdl;
            case "set-transition-action-esdl":
                return AscetSetStateMachineCodeOperation.SetTransitionActionEsdl;
            case "bind-transition-condition-method":
                return AscetSetStateMachineCodeOperation.BindTransitionConditionMethod;
            case "bind-transition-action-method":
                return AscetSetStateMachineCodeOperation.BindTransitionActionMethod;
            case "set-start-state":
                return AscetSetStateMachineCodeOperation.SetStartState;
            default:
                throw new AscetReadException("invalid_argument", "parse_operation", "Unknown state-machine write operation '" + value + "'.");
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

    public static bool RequiresCodeFile(AscetSetStateMachineCodeOperation operation)
    {
        return operation == AscetSetStateMachineCodeOperation.SetMethod ||
               operation == AscetSetStateMachineCodeOperation.SetStateEntryActionEsdl ||
               operation == AscetSetStateMachineCodeOperation.SetStateExitActionEsdl ||
               operation == AscetSetStateMachineCodeOperation.SetStateStaticActionEsdl ||
               operation == AscetSetStateMachineCodeOperation.SetTransitionConditionEsdl ||
               operation == AscetSetStateMachineCodeOperation.SetTransitionActionEsdl;
    }

    public static string ReadCodeFile(string codeFilePath)
    {
        return ReadCodeFile(codeFilePath, AscetSetStateMachineCodeOperation.SetMethod);
    }

    public static string ReadCodeFile(string codeFilePath, AscetSetStateMachineCodeOperation operation)
    {
        if (String.IsNullOrWhiteSpace(codeFilePath))
        {
            throw new AscetReadException("invalid_argument", "read_code_file", "Code file path must not be empty.");
        }

        string resolvedPath = AscetArtifactPathResolver.ResolveReadableFilePath(codeFilePath);
        if (!File.Exists(resolvedPath))
        {
            throw new AscetReadException("code_file_not_found", "read_code_file", "Code file '" + codeFilePath + "' was not found." + AscetArtifactPathResolver.FormatResolvedPathSuffix(codeFilePath, resolvedPath));
        }

        string code = File.ReadAllText(resolvedPath);
        if (operation == AscetSetStateMachineCodeOperation.SetMethod && LooksLikeFullStateMachineDefinition(code))
        {
            throw new AscetReadException("invalid_code_file", "read_code_file", "State-machine set-method code file must contain a method body, not a full state machine definition.");
        }

        return code;
    }

    private static bool LooksLikeFullStateMachineDefinition(string code)
    {
        if (String.IsNullOrWhiteSpace(code))
        {
            return false;
        }

        string trimmed = code.TrimStart();
        return trimmed.StartsWith("statemachine ", StringComparison.OrdinalIgnoreCase) &&
               trimmed.IndexOf('{') >= 0;
    }

    public static string FormatMethodTextOutput(AscetSetStateMachineCodeOperation operation, AscetMethodWriteResult result)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("StateMachine: ").Append(result == null ? String.Empty : (result.ComponentPath ?? String.Empty)).AppendLine();
        builder.Append("Operation: ").Append(operation.ToString()).AppendLine();
        builder.Append("Method: ").Append(result == null ? String.Empty : (result.MethodName ?? String.Empty)).Append(" (").Append(result == null ? AscetMethodKind.Unknown.ToString() : result.MethodKind.ToString()).Append(")").AppendLine();
        builder.Append("PreviousCodeLength: ").Append(result == null ? 0 : result.PreviousCodeLength).AppendLine();
        builder.Append("NewCodeLength: ").Append(result == null ? 0 : result.NewCodeLength).AppendLine();
        builder.Append("WriteSucceeded: ").Append(result != null && result.WriteSucceeded).AppendLine();
        builder.Append("VerifyReadbackRequested: ").Append(result != null && result.VerifyReadbackRequested).AppendLine();
        builder.Append("ReadbackVerified: ").Append(result != null && result.ReadbackVerified).AppendLine();
        return builder.ToString();
    }

    public static string FormatMethodJsonOutput(AscetSetStateMachineCodeOperation operation, AscetMethodWriteResult result)
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        Dictionary<string, object> entry = new Dictionary<string, object>();
        entry["Operation"] = operation.ToString();
        entry["ComponentPath"] = result == null ? String.Empty : (result.ComponentPath ?? String.Empty);
        entry["ComponentKind"] = result == null ? AscetComponentKind.Unknown.ToString() : result.ComponentKind.ToString();
        entry["LanguageKind"] = result == null ? AscetLanguageKind.Unknown.ToString() : result.LanguageKind.ToString();
        entry["MethodName"] = result == null ? String.Empty : (result.MethodName ?? String.Empty);
        entry["MethodKind"] = result == null ? AscetMethodKind.Unknown.ToString() : result.MethodKind.ToString();
        entry["PreviousCodeLength"] = result == null ? 0 : result.PreviousCodeLength;
        entry["NewCodeLength"] = result == null ? 0 : result.NewCodeLength;
        entry["WriteSucceeded"] = result != null && result.WriteSucceeded;
        entry["VerifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        entry["ReadbackVerified"] = result != null && result.ReadbackVerified;
        return AscetJsonContract.Serialize(entry);
    }

    public static string FormatStateMachineTextOutput(AscetSetStateMachineCodeOperation operation, AscetStateMachineWriteResult result)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("StateMachine: ").Append(result == null ? String.Empty : (result.ComponentPath ?? String.Empty)).AppendLine();
        builder.Append("Operation: ").Append(operation.ToString()).AppendLine();
        builder.Append("Target: ").Append(result == null ? String.Empty : (result.TargetName ?? String.Empty)).AppendLine();
        builder.Append("PreviousValue: ").Append(result == null ? String.Empty : (result.PreviousValue ?? String.Empty)).AppendLine();
        builder.Append("NewValue: ").Append(result == null ? String.Empty : (result.NewValue ?? String.Empty)).AppendLine();
        builder.Append("WriteSucceeded: ").Append(result != null && result.WriteSucceeded).AppendLine();
        builder.Append("VerifyReadbackRequested: ").Append(result != null && result.VerifyReadbackRequested).AppendLine();
        builder.Append("ReadbackVerified: ").Append(result != null && result.ReadbackVerified).AppendLine();
        return builder.ToString();
    }

    public static string FormatStateMachineJsonOutput(AscetSetStateMachineCodeOperation operation, AscetStateMachineWriteResult result)
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        Dictionary<string, object> entry = new Dictionary<string, object>();
        entry["Operation"] = operation.ToString();
        entry["ComponentPath"] = result == null ? String.Empty : (result.ComponentPath ?? String.Empty);
        entry["LanguageKind"] = result == null ? AscetLanguageKind.Unknown.ToString() : result.LanguageKind.ToString();
        entry["TargetName"] = result == null ? String.Empty : (result.TargetName ?? String.Empty);
        entry["PreviousValue"] = result == null ? String.Empty : (result.PreviousValue ?? String.Empty);
        entry["NewValue"] = result == null ? String.Empty : (result.NewValue ?? String.Empty);
        entry["WriteSucceeded"] = result != null && result.WriteSucceeded;
        entry["VerifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        entry["ReadbackVerified"] = result != null && result.ReadbackVerified;
        return AscetJsonContract.Serialize(entry);
    }

    private static string FormatStateMachineOutput(AscetSetStateMachineCodeArguments parsed, AscetStateMachineWriteResult result)
    {
        return parsed.EmitJson ? FormatStateMachineJsonOutput(parsed.Operation, result) : FormatStateMachineTextOutput(parsed.Operation, result);
    }

    private static void EnsureRemaining(string[] args, int startIndex, int requiredCount, AscetSetStateMachineCodeOperation operation, string message)
    {
        if (args.Length < startIndex + requiredCount)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", message);
        }
    }

    private static AscetTransitionSelector ParseTransitionSelector(string sourceName, string targetName, string priorityText)
    {
        int priority;
        if (!Int32.TryParse(NormalizeRequiredValue(priorityText, "Transition priority must not be empty."), out priority))
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "Transition priority must be an integer.");
        }

        return new AscetTransitionSelector
        {
            SourceName = NormalizeRequiredValue(sourceName, "Transition source state must not be empty."),
            TargetName = NormalizeRequiredValue(targetName, "Transition target state must not be empty."),
            Priority = priority
        };
    }

    private static string NormalizeRequiredValue(string value, string message)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", message);
        }
        return value.Trim();
    }

    public static string FormatException(Exception ex)
    {
        AscetReadException ascet = ex as AscetReadException;
        if (ascet != null)
        {
            return ascet.Code + ":" + ascet.Operation + ":" + ascet.Message;
        }

        return ex.GetType().FullName + ":" + ex.Message;
    }
}
