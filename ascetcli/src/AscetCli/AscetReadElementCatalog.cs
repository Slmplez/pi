using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetReadElementCatalogArguments
{
    public string ComponentPath { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetReadElementCatalog
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetReadElementCatalogArguments parsed = ParseArguments(args);
            if (parsed.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            ComponentElementSyncService service = new ComponentElementSyncService();
            AscetElementCatalogReadResult catalog = service.ReadCatalog(new AscetItemRef { Path = parsed.ComponentPath });
            string output = parsed.EmitJson ? FormatJsonOutput(catalog) : FormatTextOutput(catalog);

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

    public static AscetReadElementCatalogArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec read_element_catalog <component-path> [--json]");
        }

        AscetReadElementCatalogArguments result = new AscetReadElementCatalogArguments
        {
            ComponentPath = NormalizeComponentPath(args[0]),
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

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        return result;
    }

    public static string FormatTextOutput(AscetElementCatalogReadResult catalog)
    {
        if (catalog == null)
        {
            throw new AscetReadException("invalid_argument", "format_text_output", "Element catalog result must not be null.");
        }

        AscetElementSpecDocument document = catalog.Document ?? new AscetElementSpecDocument { Elements = new List<AscetElementSpec>() };
        IList<AscetElementSpec> elements = document.Elements ?? new List<AscetElementSpec>();
        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(catalog.ComponentPath ?? String.Empty).AppendLine();
        builder.Append("Elements: ").Append(elements.Count).AppendLine();

        for (int i = 0; i < elements.Count; i++)
        {
            AscetElementSpec element = elements[i];
            if (element == null)
            {
                continue;
            }

            builder.Append("Element: ").Append(element.Name ?? String.Empty)
                .Append(" [").Append(element.Kind.ToString()).Append("]")
                .Append(" ModelType=").Append(element.ModelType ?? String.Empty)
                .Append(" Scope=").Append(element.Scope ?? String.Empty);

            if (element.Length.HasValue)
            {
                builder.Append(" Length=").Append(element.Length.Value);
            }

            if (!String.IsNullOrWhiteSpace(element.EnumerationPath))
            {
                builder.Append(" EnumerationPath=").Append(element.EnumerationPath);
            }

            if (!String.IsNullOrWhiteSpace(element.TableDimension))
            {
                builder.Append(" TableDimension=").Append(element.TableDimension);
            }

            if (element.XValues != null)
            {
                builder.Append(" XValues=").Append(FormatValue(element.XValues));
            }

            if (element.YValues != null)
            {
                builder.Append(" YValues=").Append(FormatValue(element.YValues));
            }

            if (element.Values != null)
            {
                builder.Append(" Values=").Append(FormatValue(element.Values));
            }

            if (!String.IsNullOrWhiteSpace(element.ReferencedComponentPath))
            {
                builder.Append(" Ref=").Append(element.ReferencedComponentPath);
            }

            if (!String.IsNullOrWhiteSpace(element.Unit))
            {
                builder.Append(" Unit=").Append(element.Unit);
            }

            if (!String.IsNullOrWhiteSpace(element.Comment))
            {
                builder.Append(" Comment=").Append(element.Comment);
            }

            if (element.Calibration.HasValue)
            {
                builder.Append(" Calibration=").Append(element.Calibration.Value);
            }

            if (element.Data != null)
            {
                builder.Append(" Value=").Append(FormatValue(element.Data.Value));
            }

            if (element.Impl != null)
            {
                if (!String.IsNullOrWhiteSpace(element.Impl.MemoryLocation))
                {
                    builder.Append(" MemoryLocation=").Append(element.Impl.MemoryLocation);
                }

                if (!String.IsNullOrWhiteSpace(element.Impl.ValueType))
                {
                    builder.Append(" ValueType=").Append(element.Impl.ValueType);
                }

                if (!String.IsNullOrWhiteSpace(element.Impl.Formula))
                {
                    builder.Append(" Formula=").Append(element.Impl.Formula);
                }
            }

            builder.AppendLine();
        }

        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetElementCatalogReadResult catalog)
    {
        return AscetJsonContract.Serialize(BuildCatalogPayload(catalog));
    }

    private static Dictionary<string, object> BuildCatalogPayload(AscetElementCatalogReadResult catalog)
    {
        AscetElementSpecDocument document = catalog == null ? null : catalog.Document;
        Dictionary<string, object> payload = BuildDocumentPayload(document);
        Dictionary<string, object> identity = new Dictionary<string, object>();

        if (catalog != null && !String.IsNullOrWhiteSpace(catalog.ComponentOid))
        {
            identity["componentOID"] = catalog.ComponentOid;
        }

        if (catalog != null && catalog.ElementOids != null && catalog.ElementOids.Count > 0)
        {
            Dictionary<string, object> elementOids = new Dictionary<string, object>(StringComparer.Ordinal);
            List<string> names = new List<string>(catalog.ElementOids.Keys);
            names.Sort(StringComparer.Ordinal);
            for (int i = 0; i < names.Count; i++)
            {
                string name = names[i];
                string oid;
                if (!String.IsNullOrWhiteSpace(name) && catalog.ElementOids.TryGetValue(name, out oid) && !String.IsNullOrWhiteSpace(oid))
                {
                    elementOids[name] = oid;
                }
            }

            if (elementOids.Count > 0)
            {
                identity["elementOIDs"] = elementOids;
            }
        }

        if (identity.Count > 0)
        {
            payload["identity"] = identity;
        }

        return payload;
    }

    private static Dictionary<string, object> BuildDocumentPayload(AscetElementSpecDocument document)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        List<Dictionary<string, object>> elements = new List<Dictionary<string, object>>();
        IList<AscetElementSpec> values = document == null ? null : document.Elements;

        if (values != null)
        {
            for (int i = 0; i < values.Count; i++)
            {
                AscetElementSpec element = values[i];
                if (element != null)
                {
                    elements.Add(BuildElementPayload(element));
                }
            }
        }

        payload["elements"] = elements;
        return payload;
    }

    private static Dictionary<string, object> BuildElementPayload(AscetElementSpec element)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["name"] = element.Name ?? String.Empty;
        payload["kind"] = (element.Kind.ToString() ?? String.Empty).ToLowerInvariant();

        if (!String.IsNullOrWhiteSpace(element.ModelType))
        {
            payload["modelType"] = element.ModelType;
        }

        if (!String.IsNullOrWhiteSpace(element.Scope))
        {
            payload["scope"] = element.Scope;
        }

        if (element.PhysicalRange != null)
        {
            payload["physicalRange"] = BuildRangePayload(element.PhysicalRange);
        }

        if (element.Length.HasValue)
        {
            payload["length"] = element.Length.Value;
        }

        if (!String.IsNullOrWhiteSpace(element.EnumerationPath))
        {
            payload["enumerationPath"] = element.EnumerationPath;
        }

        if (!String.IsNullOrWhiteSpace(element.TableDimension))
        {
            payload["tableDimension"] = element.TableDimension;
        }

        if (element.XValues != null)
        {
            payload["xValues"] = CloneValue(element.XValues);
        }

        if (element.YValues != null)
        {
            payload["yValues"] = CloneValue(element.YValues);
        }

        if (element.Values != null)
        {
            payload["values"] = CloneValue(element.Values);
        }

        if (!String.IsNullOrWhiteSpace(element.ReferencedComponentPath))
        {
            payload["referencedComponentPath"] = element.ReferencedComponentPath;
        }

        if (!String.IsNullOrWhiteSpace(element.Unit))
        {
            payload["unit"] = element.Unit;
        }

        if (!String.IsNullOrWhiteSpace(element.Comment))
        {
            payload["comment"] = element.Comment;
        }

        if (element.Calibration.HasValue)
        {
            payload["calibration"] = element.Calibration.Value;
        }

        if (element.ConfigurationProvenance != null)
        {
            Dictionary<string, object> provenance = new Dictionary<string, object>();
            if (element.ConfigurationProvenance.DataConfiguration != null)
            {
                provenance["dataConfiguration"] = BuildConfigurationProvenancePayload(element.ConfigurationProvenance.DataConfiguration);
            }
            if (element.ConfigurationProvenance.ImplementationConfiguration != null)
            {
                provenance["implementationConfiguration"] = BuildConfigurationProvenancePayload(element.ConfigurationProvenance.ImplementationConfiguration);
            }
            if (provenance.Count > 0)
            {
                payload["configurationProvenance"] = provenance;
            }
        }

        if (element.Data != null)
        {
            Dictionary<string, object> data = new Dictionary<string, object>();
            data["value"] = CloneValue(element.Data.Value);
            payload["data"] = data;
        }

        if (element.Impl != null)
        {
            Dictionary<string, object> impl = new Dictionary<string, object>();
            if (!String.IsNullOrWhiteSpace(element.Impl.MemoryLocation))
            {
                impl["memoryLocation"] = element.Impl.MemoryLocation;
            }

            if (!String.IsNullOrWhiteSpace(element.Impl.ValueType))
            {
                impl["valueType"] = element.Impl.ValueType;
            }

            if (element.Impl.ImplementationRange != null)
            {
                impl["implementationRange"] = BuildRangePayload(element.Impl.ImplementationRange);
            }

            if (!String.IsNullOrWhiteSpace(element.Impl.Formula))
            {
                impl["formula"] = element.Impl.Formula;
            }

            if (element.Impl.LimitAssignments.HasValue)
            {
                impl["limitAssignments"] = element.Impl.LimitAssignments.Value;
            }

            if (impl.Count > 0)
            {
                payload["impl"] = impl;
            }
        }

        return payload;
    }

    private static Dictionary<string, object> BuildConfigurationProvenancePayload(AscetConfigurationProvenance provenance)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["source"] = provenance == null ? String.Empty : (provenance.Source ?? String.Empty);
        payload["configurationName"] = provenance == null ? String.Empty : (provenance.ConfigurationName ?? String.Empty);
        payload["selected"] = provenance != null && provenance.Selected;
        return payload;
    }

    private static Dictionary<string, object> BuildRangePayload(AscetElementRangeSpec range)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["min"] = CloneValue(range == null ? null : range.Min);
        payload["max"] = CloneValue(range == null ? null : range.Max);
        return payload;
    }

    private static object CloneValue(object value)
    {
        if (value == null)
        {
            return null;
        }

        IList list = value as IList;
        if (list != null && !(value is string))
        {
            List<object> result = new List<object>();
            for (int i = 0; i < list.Count; i++)
            {
                result.Add(CloneValue(list[i]));
            }
            return result;
        }

        return value;
    }

    private static string FormatValue(object value)
    {
        if (value == null)
        {
            return String.Empty;
        }

        IList list = value as IList;
        if (list != null && !(value is string))
        {
            string[] parts = new string[list.Count];
            for (int i = 0; i < list.Count; i++)
            {
                parts[i] = FormatValue(list[i]);
            }
            return "[" + String.Join(", ", parts) + "]";
        }

        return Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture) ?? String.Empty;
    }

    private static string NormalizeComponentPath(string componentPath)
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

    private static string FormatException(Exception ex)
    {
        StringBuilder builder = new StringBuilder();
        int depth = 0;
        while (ex != null)
        {
            builder.Append("Exception[").Append(depth).Append("]: ").Append(ex.GetType().FullName).AppendLine();
            builder.Append("Message: ").Append(ex.Message).AppendLine();
            if (!String.IsNullOrEmpty(ex.StackTrace))
            {
                builder.AppendLine("StackTrace:");
                builder.AppendLine(ex.StackTrace);
            }

            builder.AppendLine();
            ex = ex.InnerException;
            depth++;
        }

        return builder.ToString();
    }
}
