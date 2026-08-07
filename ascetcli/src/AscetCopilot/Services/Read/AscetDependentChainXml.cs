using System;
using System.Collections.Generic;
using System.IO;
using System.Xml;

public sealed class AscetDependentChainInput
{
    public string VariantName { get; set; }
    public string FormalName { get; set; }
    public string FormalOid { get; set; }
    public string ValueName { get; set; }
    public string ValueOid { get; set; }
    public string ValueKind { get; set; }
    public string ValueScope { get; set; }
    public string ValueElementTypeName { get; set; }
    public bool ExportExists { get; set; }
    public string ExportName { get; set; }
    public string ExportScope { get; set; }
    public string ExportElementTypeName { get; set; }
    public string ExportOwnerPath { get; set; }
    public string ExportDiscovery { get; set; }
    public IList<AscetDependentChainExportCandidate> ExportCandidates { get; set; }
    public string Issue { get; set; }
}

public sealed class AscetDependentChainExportCandidate
{
    public string Name { get; set; }
    public string Scope { get; set; }
    public string Type { get; set; }
    public string Owner { get; set; }
}

public sealed class AscetDependentChainDependent
{
    public string Name { get; set; }
    public string Oid { get; set; }
    public string Scope { get; set; }
    public string Kind { get; set; }
    public string Dependency { get; set; }
    public string Formula { get; set; }
}

public sealed class AscetDependentChainXmlResult
{
    public string DependentName { get; set; }
    public string DependentOid { get; set; }
    public string DependentKind { get; set; }
    public string DependentScope { get; set; }
    public string Dependency { get; set; }
    public string FormulaCode { get; set; }
    public IList<AscetDependentChainInput> Inputs { get; set; }
    public IList<string> Issues { get; set; }
}

public static class AscetDependentChainXml
{
    public static AscetDependentChainXmlResult ReadExportDirectory(string directory, string dependentElementName)
    {
        if (String.IsNullOrWhiteSpace(directory) || !Directory.Exists(directory))
        {
            throw new AscetReadException("invalid_argument", "read_dependent_chain_xml", "Export directory '" + (directory ?? String.Empty) + "' does not exist.");
        }

        string mainAmd = FindMainAmd(directory);
        if (String.IsNullOrWhiteSpace(mainAmd))
        {
            throw new AscetReadException("xml_not_found", "read_dependent_chain_xml", "No *.main.amd file was found in '" + directory + "'.");
        }

        string dataAmd = FindDataAmd(directory, mainAmd);
        return Read(mainAmd, dataAmd, dependentElementName);
    }

    public static AscetDependentChainXmlResult Read(string mainAmdPath, string dataAmdPath, string dependentElementName)
    {
        if (String.IsNullOrWhiteSpace(dependentElementName))
        {
            throw new AscetReadException("invalid_argument", "read_dependent_chain_xml", "Dependent element name must not be empty.");
        }

        XmlDocument mainDocument = LoadRequired(mainAmdPath, "main AMD");
        XmlDocument dataDocument = LoadOptional(dataAmdPath);
        List<string> issues = new List<string>();
        List<AscetDependentChainInput> inputs = new List<AscetDependentChainInput>();

        XmlElement dependentElement = FindElement(mainDocument, dependentElementName.Trim());
        AscetDependentChainXmlResult result = new AscetDependentChainXmlResult
        {
            DependentName = dependentElementName.Trim(),
            DependentOid = dependentElement == null ? String.Empty : (dependentElement.GetAttribute("OID") ?? String.Empty),
            DependentKind = String.Empty,
            DependentScope = String.Empty,
            Dependency = "n/a",
            FormulaCode = String.Empty,
            Inputs = inputs,
            Issues = issues
        };

        if (dependentElement == null)
        {
            issues.Add("dependent_element_not_found");
            return result;
        }

        XmlElement attributes = FindScalarAttributes(dependentElement);
        if (attributes == null)
        {
            issues.Add("dependent_not_scalar");
            return result;
        }

        string kind = attributes.GetAttribute("kind") ?? String.Empty;
        string scope = attributes.GetAttribute("scope") ?? String.Empty;
        bool dependentFlag = String.Equals(attributes.GetAttribute("dependent"), "true", StringComparison.OrdinalIgnoreCase);
        bool kindDependent = String.Equals(kind, "dependent", StringComparison.OrdinalIgnoreCase);
        bool isParameter = String.Equals(kind, "parameter", StringComparison.OrdinalIgnoreCase) || kindDependent;

        result.DependentKind = kind;
        result.DependentScope = scope;
        result.Dependency = isParameter ? ((dependentFlag || kindDependent) ? "dependent" : "independent") : "n/a";

        if (!isParameter)
        {
            issues.Add("dependent_not_parameter");
        }

        if (!String.Equals(result.Dependency, "dependent", StringComparison.OrdinalIgnoreCase))
        {
            issues.Add("dependent_not_dependent");
        }

        XmlElement formula = FindFirstChildElement(dependentElement, "Formula");
        if (formula != null)
        {
            result.FormulaCode = formula.GetAttribute("code") ?? String.Empty;
        }
        else
        {
            issues.Add("formula_not_found");
        }

        if (dataDocument == null)
        {
            issues.Add("data_amd_not_found");
            return result;
        }

        XmlElement dataEntry = FindDataEntry(dataDocument, dependentElementName.Trim());
        if (dataEntry == null)
        {
            issues.Add("dependency_data_entry_not_found");
            return result;
        }

        XmlNodeList variants = dataEntry.GetElementsByTagName("DataVariant");
        for (int i = 0; i < variants.Count; i++)
        {
            XmlElement variant = variants[i] as XmlElement;
            if (variant == null)
            {
                continue;
            }

            string variantName = variant.GetAttribute("name") ?? String.Empty;
            XmlNodeList parameters = variant.GetElementsByTagName("Parameter");
            for (int j = 0; j < parameters.Count; j++)
            {
                XmlElement parameter = parameters[j] as XmlElement;
                if (parameter == null)
                {
                    continue;
                }

                AscetDependentChainInput input = new AscetDependentChainInput
                {
                    VariantName = variantName,
                    FormalName = parameter.GetAttribute("formalName") ?? String.Empty,
                    FormalOid = parameter.GetAttribute("formalOID") ?? String.Empty,
                    ValueName = parameter.GetAttribute("valueName") ?? String.Empty,
                    ValueOid = parameter.GetAttribute("valueOID") ?? String.Empty,
                    ValueKind = String.Empty,
                    ValueScope = String.Empty,
                    ValueElementTypeName = String.Empty,
                    ExportExists = false,
                    ExportName = String.Empty,
                    ExportScope = String.Empty,
                    ExportElementTypeName = String.Empty,
                    ExportOwnerPath = String.Empty,
                    ExportDiscovery = String.Empty,
                    ExportCandidates = new List<AscetDependentChainExportCandidate>(),
                    Issue = String.Empty
                };

                XmlElement valueElement = FindElement(mainDocument, input.ValueName);
                XmlElement valueAttributes = valueElement == null ? null : FindScalarAttributes(valueElement);
                if (valueAttributes != null)
                {
                    input.ValueKind = valueAttributes.GetAttribute("kind") ?? String.Empty;
                    input.ValueScope = valueAttributes.GetAttribute("scope") ?? String.Empty;
                }

                inputs.Add(input);
            }
        }

        if (inputs.Count == 0)
        {
            issues.Add("dependency_mapping_not_found");
        }

        return result;
    }

    public static string FindMainAmd(string directory)
    {
        if (String.IsNullOrWhiteSpace(directory) || !Directory.Exists(directory))
        {
            return String.Empty;
        }

        string[] matches = Directory.GetFiles(directory, "*.main.amd", SearchOption.AllDirectories);
        if (matches == null || matches.Length == 0)
        {
            return String.Empty;
        }

        Array.Sort(matches, StringComparer.OrdinalIgnoreCase);
        return matches[0];
    }

    public static string FindDataAmd(string directory, string mainAmdPath)
    {
        if (String.IsNullOrWhiteSpace(directory) || !Directory.Exists(directory))
        {
            return String.Empty;
        }

        if (!String.IsNullOrWhiteSpace(mainAmdPath))
        {
            string name = Path.GetFileName(mainAmdPath);
            if (!String.IsNullOrWhiteSpace(name) && name.EndsWith(".main.amd", StringComparison.OrdinalIgnoreCase))
            {
                string candidate = Path.Combine(Path.GetDirectoryName(mainAmdPath), name.Substring(0, name.Length - ".main.amd".Length) + ".data.amd");
                if (File.Exists(candidate))
                {
                    return candidate;
                }
            }
        }

        string[] matches = Directory.GetFiles(directory, "*.data.amd", SearchOption.AllDirectories);
        if (matches == null || matches.Length == 0)
        {
            return String.Empty;
        }

        Array.Sort(matches, StringComparer.OrdinalIgnoreCase);
        return matches[0];
    }

    private static XmlDocument LoadRequired(string path, string label)
    {
        if (String.IsNullOrWhiteSpace(path) || !File.Exists(path))
        {
            throw new AscetReadException("invalid_argument", "load_dependent_chain_xml", label + " file '" + (path ?? String.Empty) + "' does not exist.");
        }

        XmlDocument document = new XmlDocument();
        document.PreserveWhitespace = false;
        document.Load(path);
        return document;
    }

    private static XmlDocument LoadOptional(string path)
    {
        if (String.IsNullOrWhiteSpace(path) || !File.Exists(path))
        {
            return null;
        }

        XmlDocument document = new XmlDocument();
        document.PreserveWhitespace = false;
        document.Load(path);
        return document;
    }

    private static XmlElement FindElement(XmlDocument document, string elementName)
    {
        if (document == null || String.IsNullOrWhiteSpace(elementName))
        {
            return null;
        }

        XmlNodeList elements = document.GetElementsByTagName("Element");
        for (int i = 0; i < elements.Count; i++)
        {
            XmlElement element = elements[i] as XmlElement;
            if (element != null && String.Equals(element.GetAttribute("name"), elementName, StringComparison.Ordinal))
            {
                return element;
            }
        }

        return null;
    }

    private static XmlElement FindDataEntry(XmlDocument document, string elementName)
    {
        if (document == null || String.IsNullOrWhiteSpace(elementName))
        {
            return null;
        }

        XmlNodeList entries = document.GetElementsByTagName("DataEntry");
        for (int i = 0; i < entries.Count; i++)
        {
            XmlElement entry = entries[i] as XmlElement;
            if (entry != null && String.Equals(entry.GetAttribute("elementName"), elementName, StringComparison.Ordinal))
            {
                return entry;
            }
        }

        return null;
    }

    private static XmlElement FindScalarAttributes(XmlElement element)
    {
        if (element == null)
        {
            return null;
        }

        XmlNodeList nodes = element.GetElementsByTagName("ScalarAttributes");
        if (nodes != null && nodes.Count > 0)
        {
            return nodes[0] as XmlElement;
        }

        // ASCET 6.1.x exports primitive scalar elements as
        // PrimitiveAttributes. Keep ScalarAttributes for older exports, but
        // treat both XML shapes as the same scalar metadata contract.
        nodes = element.GetElementsByTagName("PrimitiveAttributes");
        if (nodes == null || nodes.Count == 0)
        {
            return null;
        }

        return nodes[0] as XmlElement;
    }

    private static XmlElement FindFirstChildElement(XmlElement element, string name)
    {
        if (element == null || String.IsNullOrWhiteSpace(name))
        {
            return null;
        }

        XmlNodeList nodes = element.GetElementsByTagName(name);
        if (nodes == null || nodes.Count == 0)
        {
            return null;
        }

        return nodes[0] as XmlElement;
    }
}
