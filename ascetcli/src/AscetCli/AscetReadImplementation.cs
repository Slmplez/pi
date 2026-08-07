using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

public sealed class AscetReadImplementationArguments
{
    public string ComponentPath { get; set; }
    public AscetImplementationReadMode Mode { get; set; }
    public string ImplementationName { get; set; }
    public bool EmitJson { get; set; }
    public bool ListOnly { get; set; }
}

public static class AscetReadImplementation
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetReadImplementationArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();

            ComponentLocatorService locator = new ComponentLocatorService();
            ImplementationReadService implementations = new ImplementationReadService();

            AscetItemPath parsed = AscetItemPath.Parse(arguments.ComponentPath);
            AscetItemRef component = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);

            string output;
            if (arguments.ListOnly)
            {
                AscetImplementationCatalog catalog = implementations.ListImplementations(component);
                output = arguments.EmitJson ? FormatListJsonOutput(catalog) : FormatListTextOutput(catalog);
            }
            else
            {
                AscetImplementationSnapshot snapshot = implementations.ReadImplementation(
                    component,
                    arguments.Mode,
                    arguments.ImplementationName);
                output = arguments.EmitJson ? FormatJsonOutput(snapshot) : FormatTextOutput(snapshot);
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

    public static AscetReadImplementationArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException(
                "invalid_argument",
                "parse_arguments",
                "usage: AscetCli.exe exec read_implementation <component-path> [--list] [--default|--class-impl|--impl <name>] [--json]");
        }

        AscetReadImplementationArguments result = new AscetReadImplementationArguments
        {
            ComponentPath = NormalizeComponentPath(args[0]),
            Mode = AscetImplementationReadMode.Default,
            ImplementationName = String.Empty,
            EmitJson = false,
            ListOnly = false
        };

        bool modeSelected = false;
        for (int i = 1; i < args.Length; i++)
        {
            string argument = args[i];
            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                result.EmitJson = true;
                continue;
            }

            if (String.Equals(argument, "--list", StringComparison.OrdinalIgnoreCase))
            {
                if (modeSelected)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "--list can not be combined with implementation selection flags.");
                }

                result.ListOnly = true;
                continue;
            }

            if (result.ListOnly)
            {
                throw new AscetReadException("invalid_argument", "parse_arguments", "--list can not be combined with implementation selection flags.");
            }

            if (String.Equals(argument, "--default", StringComparison.OrdinalIgnoreCase))
            {
                EnsureModeNotAlreadySelected(modeSelected, argument);
                result.Mode = AscetImplementationReadMode.Default;
                result.ImplementationName = String.Empty;
                modeSelected = true;
                continue;
            }

            if (String.Equals(argument, "--class-impl", StringComparison.OrdinalIgnoreCase))
            {
                EnsureModeNotAlreadySelected(modeSelected, argument);
                result.Mode = AscetImplementationReadMode.Class;
                result.ImplementationName = String.Empty;
                modeSelected = true;
                continue;
            }

            if (String.Equals(argument, "--impl", StringComparison.OrdinalIgnoreCase))
            {
                EnsureModeNotAlreadySelected(modeSelected, argument);
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing implementation name after --impl.");
                }

                result.Mode = AscetImplementationReadMode.Named;
                result.ImplementationName = NormalizeImplementationName(args[++i]);
                modeSelected = true;
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        if (result.Mode == AscetImplementationReadMode.Named && String.IsNullOrWhiteSpace(result.ImplementationName))
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "Named implementation mode requires a non-empty implementation name.");
        }

        return result;
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

    public static string NormalizeImplementationName(string implementationName)
    {
        if (String.IsNullOrWhiteSpace(implementationName))
        {
            throw new AscetReadException("invalid_argument", "normalize_implementation_name", "Implementation name must not be empty.");
        }

        return implementationName.Trim();
    }

    public static string NormalizeImplementationNameAllowEmpty(string implementationName)
    {
        return String.IsNullOrWhiteSpace(implementationName)
            ? String.Empty
            : implementationName.Trim();
    }

    public static string FormatTextOutput(AscetImplementationSnapshot snapshot)
    {
        if (snapshot == null)
        {
            throw new AscetReadException("invalid_argument", "format_text_output", "Implementation snapshot must not be null.");
        }

        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(snapshot.ComponentPath ?? String.Empty).AppendLine();
        builder.Append("Kind: ").Append(snapshot.ComponentKind.ToString()).AppendLine();
        builder.Append("Language: ").Append(snapshot.LanguageKind.ToString()).AppendLine();
        builder.Append("ImplementationSourceKind: ").Append(snapshot.ImplementationSourceKind ?? String.Empty).AppendLine();
        builder.Append("Mode: ").Append(snapshot.Mode.ToString()).AppendLine();

        if (!String.IsNullOrWhiteSpace(snapshot.RequestedImplementationName))
        {
            builder.Append("RequestedImplementation: ").Append(snapshot.RequestedImplementationName).AppendLine();
        }

        builder.Append("Implementation: ").Append(snapshot.ResolvedImplementationName ?? String.Empty).AppendLine();
        builder.Append("MemoryLocation: ").Append(snapshot.MemoryLocation ?? String.Empty).AppendLine();
        builder.Append("Options: GenerateMethodBody=")
            .Append(snapshot.OptionGenerateMethodBody)
            .Append(" OptimizeMethodCalls=")
            .Append(snapshot.OptionOptimizeMethodCalls)
            .AppendLine();

        IList<AscetElementImplementationRef> elements = snapshot.Elements ?? new List<AscetElementImplementationRef>();
        builder.Append("Elements: ").Append(elements.Count).AppendLine();
        for (int i = 0; i < elements.Count; i++)
        {
            AppendElement(builder, elements[i], 2);
        }

        if (snapshot.TypeDefinition != null)
        {
            builder.Append("TypeDefinition: ").Append(snapshot.TypeDefinition.Name ?? String.Empty).AppendLine();
            IList<string> enumerators = snapshot.TypeDefinition.Enumerators ?? new List<string>();
            builder.Append("Enumerators: ").Append(enumerators.Count).AppendLine();
            for (int i = 0; i < enumerators.Count; i++)
            {
                builder.Append("  - ").Append(enumerators[i] ?? String.Empty).AppendLine();
            }
        }

        return builder.ToString();
    }

    public static string FormatListTextOutput(AscetImplementationCatalog catalog)
    {
        if (catalog == null)
        {
            throw new AscetReadException("invalid_argument", "format_list_text_output", "Implementation catalog must not be null.");
        }

        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(catalog.ComponentPath ?? String.Empty).AppendLine();
        builder.Append("Kind: ").Append(catalog.ComponentKind.ToString()).AppendLine();
        builder.Append("Language: ").Append(catalog.LanguageKind.ToString()).AppendLine();
        builder.Append("ImplementationSourceKind: ").Append(catalog.ImplementationSourceKind ?? String.Empty).AppendLine();
        builder.Append("DefaultImplementation: ").Append(catalog.DefaultImplementationName ?? String.Empty).AppendLine();
        builder.Append("ClassImplementation: ").Append(catalog.ClassImplementationName ?? String.Empty).AppendLine();

        IList<AscetImplementationListEntry> implementations = catalog.Implementations ?? new List<AscetImplementationListEntry>();
        builder.Append("Implementations: ").Append(implementations.Count).AppendLine();
        for (int i = 0; i < implementations.Count; i++)
        {
            AscetImplementationListEntry entry = implementations[i];
            builder.Append("  - ")
                .Append(entry == null ? String.Empty : (entry.Name ?? String.Empty))
                .Append(" [Default=")
                .Append(entry != null && entry.IsDefault)
                .Append(" Class=")
                .Append(entry != null && entry.IsClassImplementation)
                .Append("]")
                .AppendLine();
        }

        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetImplementationSnapshot snapshot)
    {
        if (snapshot == null)
        {
            throw new AscetReadException("invalid_argument", "format_json_output", "Implementation snapshot must not be null.");
        }

        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return AscetJsonContract.Serialize(BuildSerializableSnapshot(snapshot));
    }

    public static string FormatListJsonOutput(AscetImplementationCatalog catalog)
    {
        if (catalog == null)
        {
            throw new AscetReadException("invalid_argument", "format_list_json_output", "Implementation catalog must not be null.");
        }

        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return AscetJsonContract.Serialize(BuildSerializableCatalog(catalog));
    }

    private static void EnsureModeNotAlreadySelected(bool modeSelected, string argument)
    {
        if (modeSelected)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "Multiple implementation modes were provided. Conflicting argument: '" + argument + "'.");
        }
    }

    private static void AppendElement(StringBuilder builder, AscetElementImplementationRef element, int indent)
    {
        string prefix = new string(' ', indent);
        string detailPrefix = new string(' ', indent + 2);

        builder.Append(prefix)
            .Append("- ")
            .Append(element == null ? String.Empty : (element.ElementName ?? String.Empty))
            .Append(" [")
            .Append(element == null ? String.Empty : (element.ElementKind ?? String.Empty))
            .Append("] Primitive=")
            .Append(element != null && element.IsPrimitive)
            .AppendLine();

        if (element == null)
        {
            return;
        }

        builder.Append(detailPrefix)
            .Append("View: Type=")
            .Append(element.DisplayType ?? String.Empty)
            .Append(" Scope=")
            .Append(element.DisplayScope ?? String.Empty)
            .Append(" Kind=")
            .Append(element.DisplayKind ?? String.Empty)
            .Append(" Memory=")
            .Append(element.DisplayMemory ?? String.Empty)
            .Append(" Calibration=")
            .Append(element.DisplayCalibration ?? String.Empty)
            .Append(" Unit=")
            .Append(element.Unit ?? String.Empty)
            .Append(" Comment=")
            .Append(element.Comment ?? String.Empty)
            .AppendLine();

        if (!String.IsNullOrWhiteSpace(element.ImplementationItemKind) ||
            !String.IsNullOrWhiteSpace(element.MemoryLocation) ||
            !String.IsNullOrWhiteSpace(element.RecordLayout))
        {
            builder.Append(detailPrefix)
                .Append("ImplItem: ")
                .Append(element.ImplementationItemKind ?? String.Empty)
                .Append(" Memory=")
                .Append(element.MemoryLocation ?? String.Empty)
                .Append(" RecordLayout=")
                .Append(element.RecordLayout ?? String.Empty)
                .AppendLine();
        }

        if (!String.IsNullOrWhiteSpace(element.ImplType) ||
            !String.IsNullOrWhiteSpace(element.ModelType) ||
            !String.IsNullOrWhiteSpace(element.AdditionalInfo))
        {
            builder.Append(detailPrefix)
                .Append("ImplType=")
                .Append(element.ImplType ?? String.Empty)
                .Append(" ModelType=")
                .Append(element.ModelType ?? String.Empty)
                .Append(" AdditionalInfo=")
                .Append(element.AdditionalInfo ?? String.Empty)
                .AppendLine();
        }

        if (!String.IsNullOrWhiteSpace(element.ChildImplementationName))
        {
            builder.Append(detailPrefix)
                .Append("ChildImplementation: ")
                .Append(element.ChildImplementationName)
                .AppendLine();
        }

        if (!String.IsNullOrWhiteSpace(element.ReferencedComponentPath))
        {
            builder.Append(detailPrefix)
                .Append("ReferencedComponent: ")
                .Append(element.ReferencedComponentPath)
                .AppendLine();
        }

        IList<AscetImplInfoBinding> bindings = element.ImplInfos ?? new List<AscetImplInfoBinding>();
        for (int bindingIndex = 0; bindingIndex < bindings.Count; bindingIndex++)
        {
            AppendImplInfo(builder, bindings[bindingIndex], detailPrefix);
        }

        IList<AscetElementImplementationRef> childElements = element.ChildElements ?? new List<AscetElementImplementationRef>();
        if (childElements.Count > 0)
        {
            builder.Append(detailPrefix)
                .Append("ChildElements: ")
                .Append(childElements.Count)
                .AppendLine();

            for (int i = 0; i < childElements.Count; i++)
            {
                AppendElement(builder, childElements[i], indent + 4);
            }
        }
    }

    private static void AppendImplInfo(StringBuilder builder, AscetImplInfoBinding binding, string prefix)
    {
        if (builder == null || binding == null || binding.Info == null)
        {
            return;
        }

        builder.Append(prefix)
            .Append("ImplInfo[")
            .Append(binding.Role ?? String.Empty)
            .Append("]: ImplType=")
            .Append(binding.Info.ImplType ?? String.Empty)
            .Append(" Formula=")
            .Append(binding.Info.FormulaName ?? String.Empty)
            .Append(" Quantization=")
            .Append(binding.Info.Quantization ?? String.Empty)
            .Append(" LimitAssignment=")
            .Append(binding.Info.LimitAssignment)
            .Append(" LimitOverflow=")
            .Append(binding.Info.LimitOverflow)
            .Append(" OverflowStrategy=")
            .Append(binding.Info.OverflowStrategy ?? String.Empty)
            .Append(" Master=")
            .Append(binding.Info.IsMasterModel);

        if (!String.IsNullOrWhiteSpace(binding.Info.AdditionalInfo))
        {
            builder.Append(" AdditionalInfo=").Append(binding.Info.AdditionalInfo);
        }

        AppendRange(builder, " IntegerImplRange=", binding.Info.IntegerImplRange);
        AppendRange(builder, " IntegerPhysicalRange=", binding.Info.IntegerPhysicalRange);
        AppendRange(builder, " LongImplRange=", binding.Info.LongImplRange);
        AppendRange(builder, " LongPhysicalRange=", binding.Info.LongPhysicalRange);
        AppendRange(builder, " FloatImplRange=", binding.Info.FloatImplRange);
        AppendRange(builder, " FloatPhysicalRange=", binding.Info.FloatPhysicalRange);
        AppendRange(builder, " DoubleImplRange=", binding.Info.DoubleImplRange);
        AppendRange(builder, " DoublePhysicalRange=", binding.Info.DoublePhysicalRange);
        builder.AppendLine();
    }

    private static void AppendRange(StringBuilder builder, string label, string value)
    {
        if (builder == null || String.IsNullOrWhiteSpace(value))
        {
            return;
        }

        builder.Append(label).Append(value);
    }

    internal static IDictionary<string, object> BuildSerializableSnapshot(AscetImplementationSnapshot snapshot)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["ComponentPath"] = snapshot.ComponentPath ?? String.Empty;
        result["ComponentKind"] = snapshot.ComponentKind.ToString();
        result["LanguageKind"] = snapshot.LanguageKind.ToString();
        result["ImplementationSourceKind"] = snapshot.ImplementationSourceKind ?? String.Empty;
        result["Mode"] = snapshot.Mode.ToString();
        result["RequestedImplementationName"] = snapshot.RequestedImplementationName ?? String.Empty;
        result["ResolvedImplementationName"] = snapshot.ResolvedImplementationName ?? String.Empty;
        result["MemoryLocation"] = snapshot.MemoryLocation ?? String.Empty;
        result["OptionGenerateMethodBody"] = snapshot.OptionGenerateMethodBody;
        result["OptionOptimizeMethodCalls"] = snapshot.OptionOptimizeMethodCalls;
        result["Elements"] = BuildSerializableElements(snapshot.Elements);
        if (snapshot.TypeDefinition != null)
        {
            result["TypeDefinition"] = BuildSerializableTypeDefinition(snapshot.TypeDefinition);
        }
        return result;
    }

    private static IDictionary<string, object> BuildSerializableCatalog(AscetImplementationCatalog catalog)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["ComponentPath"] = catalog.ComponentPath ?? String.Empty;
        result["ComponentKind"] = catalog.ComponentKind.ToString();
        result["LanguageKind"] = catalog.LanguageKind.ToString();
        result["ImplementationSourceKind"] = catalog.ImplementationSourceKind ?? String.Empty;
        result["DefaultImplementationName"] = catalog.DefaultImplementationName ?? String.Empty;
        result["ClassImplementationName"] = catalog.ClassImplementationName ?? String.Empty;
        result["Implementations"] = BuildSerializableImplementationEntries(catalog.Implementations);
        return result;
    }

    private static IDictionary<string, object> BuildSerializableTypeDefinition(AscetTypeDefinitionRef typeDefinition)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["Name"] = typeDefinition == null ? String.Empty : (typeDefinition.Name ?? String.Empty);
        List<string> enumerators = new List<string>();
        IList<string> source = typeDefinition == null ? null : typeDefinition.Enumerators;
        if (source != null)
        {
            for (int i = 0; i < source.Count; i++)
            {
                enumerators.Add(source[i] ?? String.Empty);
            }
        }

        result["Enumerators"] = enumerators;
        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableImplementationEntries(IList<AscetImplementationListEntry> implementations)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (implementations == null)
        {
            return result;
        }

        for (int i = 0; i < implementations.Count; i++)
        {
            AscetImplementationListEntry entry = implementations[i];
            Dictionary<string, object> item = new Dictionary<string, object>();
            item["Name"] = entry == null ? String.Empty : (entry.Name ?? String.Empty);
            item["IsDefault"] = entry != null && entry.IsDefault;
            item["IsClassImplementation"] = entry != null && entry.IsClassImplementation;
            result.Add(item);
        }

        return result;
    }

    internal static IList<IDictionary<string, object>> BuildSerializableElements(IList<AscetElementImplementationRef> elements)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (elements == null)
        {
            return result;
        }

        for (int i = 0; i < elements.Count; i++)
        {
            AscetElementImplementationRef element = elements[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["ElementName"] = element == null ? String.Empty : (element.ElementName ?? String.Empty);
            entry["ElementKind"] = element == null ? String.Empty : (element.ElementKind ?? String.Empty);
            entry["IsPrimitive"] = element != null && element.IsPrimitive;
            entry["DisplayType"] = element == null ? String.Empty : (element.DisplayType ?? String.Empty);
            entry["DisplayScope"] = element == null ? String.Empty : (element.DisplayScope ?? String.Empty);
            entry["DisplayKind"] = element == null ? String.Empty : (element.DisplayKind ?? String.Empty);
            entry["CanonicalScope"] = element == null ? String.Empty : (element.CanonicalScope ?? String.Empty);
            entry["CanonicalKind"] = element == null ? String.Empty : (element.CanonicalKind ?? String.Empty);
            entry["MessageKind"] = element == null ? String.Empty : (element.MessageKind ?? String.Empty);
            entry["IsVolatile"] = element != null && element.IsVolatile;
            entry["DisplayMemory"] = element == null ? String.Empty : (element.DisplayMemory ?? String.Empty);
            entry["IsCalibration"] = element != null && element.IsCalibration;
            entry["DisplayCalibration"] = element == null ? String.Empty : (element.DisplayCalibration ?? String.Empty);
            entry["Unit"] = element == null ? String.Empty : (element.Unit ?? String.Empty);
            entry["Comment"] = element == null ? String.Empty : (element.Comment ?? String.Empty);
            entry["ImplementationItemKind"] = element == null ? String.Empty : (element.ImplementationItemKind ?? String.Empty);
            entry["MemoryLocation"] = element == null ? String.Empty : (element.MemoryLocation ?? String.Empty);
            entry["RecordLayout"] = element == null ? String.Empty : (element.RecordLayout ?? String.Empty);
            entry["ImplType"] = element == null ? String.Empty : (element.ImplType ?? String.Empty);
            entry["ModelType"] = element == null ? String.Empty : (element.ModelType ?? String.Empty);
            entry["AdditionalInfo"] = element == null ? String.Empty : (element.AdditionalInfo ?? String.Empty);
            entry["ChildImplementationName"] = element == null ? String.Empty : (element.ChildImplementationName ?? String.Empty);
            entry["ReferencedComponentPath"] = element == null ? String.Empty : (element.ReferencedComponentPath ?? String.Empty);
            entry["ChildElements"] = BuildSerializableElements(element == null ? null : element.ChildElements);
            entry["ImplInfos"] = BuildSerializableImplInfos(element == null ? null : element.ImplInfos);
            result.Add(entry);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableImplInfos(IList<AscetImplInfoBinding> bindings)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (bindings == null)
        {
            return result;
        }

        for (int i = 0; i < bindings.Count; i++)
        {
            AscetImplInfoBinding binding = bindings[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["Role"] = binding == null ? String.Empty : (binding.Role ?? String.Empty);
            entry["Info"] = BuildSerializableImplInfo(binding == null ? null : binding.Info);
            result.Add(entry);
        }

        return result;
    }

    private static IDictionary<string, object> BuildSerializableImplInfo(AscetImplInfoRef info)
    {
        Dictionary<string, object> entry = new Dictionary<string, object>();
        if (info == null)
        {
            entry["ImplType"] = String.Empty;
            entry["FormulaName"] = String.Empty;
            entry["Quantization"] = String.Empty;
            entry["AdditionalInfo"] = String.Empty;
            entry["LimitAssignment"] = false;
            entry["LimitOverflow"] = false;
            entry["OverflowStrategy"] = String.Empty;
            entry["IsMasterModel"] = false;
            entry["IntegerImplRange"] = String.Empty;
            entry["IntegerPhysicalRange"] = String.Empty;
            entry["LongImplRange"] = String.Empty;
            entry["LongPhysicalRange"] = String.Empty;
            entry["FloatImplRange"] = String.Empty;
            entry["FloatPhysicalRange"] = String.Empty;
            entry["DoubleImplRange"] = String.Empty;
            entry["DoublePhysicalRange"] = String.Empty;
            return entry;
        }

        entry["ImplType"] = info.ImplType ?? String.Empty;
        entry["FormulaName"] = info.FormulaName ?? String.Empty;
        entry["Quantization"] = info.Quantization ?? String.Empty;
        entry["AdditionalInfo"] = info.AdditionalInfo ?? String.Empty;
        entry["LimitAssignment"] = info.LimitAssignment;
        entry["LimitOverflow"] = info.LimitOverflow;
        entry["OverflowStrategy"] = info.OverflowStrategy ?? String.Empty;
        entry["IsMasterModel"] = info.IsMasterModel;
        entry["IntegerImplRange"] = info.IntegerImplRange ?? String.Empty;
        entry["IntegerPhysicalRange"] = info.IntegerPhysicalRange ?? String.Empty;
        entry["LongImplRange"] = info.LongImplRange ?? String.Empty;
        entry["LongPhysicalRange"] = info.LongPhysicalRange ?? String.Empty;
        entry["FloatImplRange"] = info.FloatImplRange ?? String.Empty;
        entry["FloatPhysicalRange"] = info.FloatPhysicalRange ?? String.Empty;
        entry["DoubleImplRange"] = info.DoubleImplRange ?? String.Empty;
        entry["DoublePhysicalRange"] = info.DoublePhysicalRange ?? String.Empty;
        return entry;
    }

    private static string FormatException(Exception ex)
    {
        AscetReadException ascet = ex as AscetReadException;
        if (ascet != null)
        {
            return ascet.Code + " [" + ascet.Operation + "]: " + ascet.Message;
        }

        return ex.GetType().FullName + ": " + ex.Message;
    }
}
