using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml;

public sealed class AscetElementDependencyXmlState
{
    public string ElementName { get; set; }
    public string Kind { get; set; }
    public string Scope { get; set; }
    public bool IsParameter { get; set; }
    public bool IsDependent { get; set; }
    public string FormulaCode { get; set; }
}

public sealed class AscetElementDependencyCandidate
{
    public string ElementName { get; set; }
    public string Kind { get; set; }
    public string Scope { get; set; }
    public string Schema { get; set; }
    public string BeforeDependency { get; set; }
    public string FormulaCode { get; set; }
    public bool IsParameter { get; set; }
    public bool IsDependent { get; set; }
    public bool Supported { get; set; }
    public string UnsupportedReason { get; set; }
}

public static class AscetElementDependencyXml
{
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

    public static AscetElementDependencyXmlState ReadMainAmd(string mainAmdPath, string elementName)
    {
        XmlDocument document = Load(mainAmdPath);
        XmlElement element = FindElement(document, elementName);
        XmlElement attributes = element == null ? null : FindScalarAttributes(element);
        if (attributes == null)
        {
            return null;
        }

        string kind = attributes.GetAttribute("kind") ?? String.Empty;
        bool kindDependent = String.Equals(kind, "dependent", StringComparison.OrdinalIgnoreCase);
        bool kindParameter = String.Equals(kind, "parameter", StringComparison.OrdinalIgnoreCase);
        bool dependentFlag = String.Equals(attributes.GetAttribute("dependent"), "true", StringComparison.OrdinalIgnoreCase);

        return new AscetElementDependencyXmlState
        {
            ElementName = elementName,
            Kind = kind,
            Scope = attributes.GetAttribute("scope") ?? String.Empty,
            IsParameter = kindParameter || kindDependent,
            IsDependent = kindDependent || (kindParameter && dependentFlag),
            FormulaCode = ReadFormulaCode(element, attributes)
        };
    }

    public static AscetElementDependencyCandidate FindCandidate(string mainAmdPath, string elementName)
    {
        IList<AscetElementDependencyCandidate> candidates = FindCandidates(mainAmdPath, elementName);
        if (candidates == null || candidates.Count == 0)
        {
            return null;
        }

        if (candidates.Count > 1)
        {
            throw new AscetReadException("element_ambiguous", "find_dependency_candidate", "Element '" + (elementName ?? String.Empty) + "' is ambiguous in '" + mainAmdPath + "'.");
        }

        return candidates[0];
    }

    public static IList<AscetElementDependencyCandidate> FindCandidates(string mainAmdPath, string elementNameOrEmpty)
    {
        XmlDocument document = Load(mainAmdPath);
        List<AscetElementDependencyCandidate> candidates = new List<AscetElementDependencyCandidate>();
        XmlNodeList elements = document.GetElementsByTagName("Element");
        string requested = elementNameOrEmpty == null ? String.Empty : elementNameOrEmpty.Trim();

        for (int i = 0; i < elements.Count; i++)
        {
            XmlElement element = elements[i] as XmlElement;
            if (element == null)
            {
                continue;
            }

            string name = element.GetAttribute("name") ?? String.Empty;
            if (!String.IsNullOrWhiteSpace(requested) && !String.Equals(name, requested, StringComparison.Ordinal))
            {
                continue;
            }

            candidates.Add(BuildCandidate(element));
        }

        return candidates;
    }

    public static void SetMainAmdDependency(string mainAmdPath, string elementName, bool dependent)
    {
        SetMainAmdDependencyAndFormula(mainAmdPath, String.Empty, elementName, dependent, String.Empty, null, false);
    }

    public static void SetMainAmdDependencyAndFormula(string mainAmdPath, string dataAmdPath, string elementName, bool dependent, string formula, IDictionary<string, string> mappings, bool clearFormula)
    {
        XmlDocument document = Load(mainAmdPath);
        XmlElement element = FindElement(document, elementName);
        XmlElement attributes = element == null ? null : FindScalarAttributes(element);
        if (attributes == null)
        {
            throw new AscetReadException("element_not_found", "set_dependency_xml", "Element '" + elementName + "' was not found in '" + mainAmdPath + "'.");
        }

        string kind = attributes.GetAttribute("kind") ?? String.Empty;
        bool supported = String.Equals(kind, "parameter", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(kind, "dependent", StringComparison.OrdinalIgnoreCase);
        if (!supported)
        {
            throw new AscetReadException("invalid_dependency_target", "set_dependency_xml", "Element '" + elementName + "' is not a parameter-like scalar in '" + mainAmdPath + "'.");
        }

        string scope = attributes.GetAttribute("scope") ?? String.Empty;
        if (!String.IsNullOrWhiteSpace(scope) && !String.Equals(scope, "local", StringComparison.OrdinalIgnoreCase))
        {
            throw new AscetReadException("invalid_dependency_target", "set_dependency_xml", "Element '" + elementName + "' must be a local parameter in '" + mainAmdPath + "'.");
        }

        attributes.SetAttribute("kind", "parameter");
        attributes.SetAttribute("dependent", dependent ? "true" : "false");

        Dictionary<string, string> effectiveMappings = NormalizeMappings(formula, mappings);
        Dictionary<string, string> formalOids = ReadExistingFormalOids(attributes);
        if (!String.IsNullOrWhiteSpace(formula) && !dependent)
        {
            throw new AscetReadException("invalid_argument", "set_dependency_xml", "Dependency formula can only be written when the target dependency state is dependent.");
        }

        if (!String.IsNullOrWhiteSpace(formula) && clearFormula)
        {
            throw new AscetReadException("invalid_argument", "set_dependency_xml", "Dependency formula and clearFormula cannot be used together.");
        }

        if (clearFormula)
        {
            RemoveFormula(attributes);
        }
        else if (!String.IsNullOrWhiteSpace(formula))
        {
            WriteFormula(document, attributes, formula.Trim(), effectiveMappings, formalOids);
        }

        RemoveXmlSignatures(document);
        Save(document, mainAmdPath);

        if (!String.IsNullOrWhiteSpace(formula) && effectiveMappings.Count > 0)
        {
            WriteDataMappings(dataAmdPath, elementName, element == null ? String.Empty : (element.GetAttribute("OID") ?? String.Empty), mainAmdPath, effectiveMappings, formalOids);
        }
    }

    private static AscetElementDependencyCandidate BuildCandidate(XmlElement element)
    {
        string elementName = element == null ? String.Empty : (element.GetAttribute("name") ?? String.Empty);
        XmlElement attributes = FindScalarAttributes(element);
        if (attributes == null)
        {
            return new AscetElementDependencyCandidate
            {
                ElementName = elementName,
                Kind = String.Empty,
                Scope = String.Empty,
                Schema = "not-scalar",
                BeforeDependency = "n/a",
                IsParameter = false,
                IsDependent = false,
                Supported = false,
                UnsupportedReason = "no_scalar_attributes"
            };
        }

        string kind = attributes.GetAttribute("kind") ?? String.Empty;
        string scope = attributes.GetAttribute("scope") ?? String.Empty;
        bool kindParameter = String.Equals(kind, "parameter", StringComparison.OrdinalIgnoreCase);
        bool kindDependent = String.Equals(kind, "dependent", StringComparison.OrdinalIgnoreCase);
        bool dependentFlag = String.Equals(attributes.GetAttribute("dependent"), "true", StringComparison.OrdinalIgnoreCase);
        bool isDependent = kindDependent || (kindParameter && dependentFlag);
        string schemaPrefix = AttributeSchemaPrefix(attributes);
        string schema = kindParameter ? schemaPrefix + "-parameter-dependent-flag" : (kindDependent ? schemaPrefix + "-dependent-kind" : schemaPrefix + "-" + kind.ToLowerInvariant());
        bool supported = kindParameter && (String.IsNullOrWhiteSpace(scope) || String.Equals(scope, "local", StringComparison.OrdinalIgnoreCase));
        string reason = String.Empty;

        if (kindDependent)
        {
            reason = "dependent_kind_not_write_allowlisted";
        }
        else if (!kindParameter)
        {
            reason = "kind_not_parameter";
        }
        else if (String.Equals(scope, "imported", StringComparison.OrdinalIgnoreCase))
        {
            reason = "imported_parameter";
            supported = false;
        }
        else if (!String.IsNullOrWhiteSpace(scope) && !String.Equals(scope, "local", StringComparison.OrdinalIgnoreCase))
        {
            reason = "scope_not_local";
            supported = false;
        }

        return new AscetElementDependencyCandidate
        {
            ElementName = elementName,
            Kind = kind,
            Scope = scope,
            Schema = schema,
            BeforeDependency = isDependent ? "dependent" : (kindParameter ? "independent" : "n/a"),
            FormulaCode = ReadFormulaCode(element, attributes),
            IsParameter = kindParameter || kindDependent,
            IsDependent = isDependent,
            Supported = supported,
            UnsupportedReason = supported ? String.Empty : reason
        };
    }

    private static Dictionary<string, string> NormalizeMappings(string formula, IDictionary<string, string> mappings)
    {
        Dictionary<string, string> result = new Dictionary<string, string>(StringComparer.Ordinal);
        if (mappings != null)
        {
            foreach (KeyValuePair<string, string> mapping in mappings)
            {
                string formal = mapping.Key == null ? String.Empty : mapping.Key.Trim();
                string imported = mapping.Value == null ? String.Empty : mapping.Value.Trim();
                if (String.IsNullOrWhiteSpace(formal) || String.IsNullOrWhiteSpace(imported))
                {
                    throw new AscetReadException("invalid_argument", "set_dependency_xml", "Dependency formula mappings must use non-empty formal and imported parameter names.");
                }

                if (result.ContainsKey(formal))
                {
                    throw new AscetReadException("invalid_argument", "set_dependency_xml", "Duplicate dependency formula mapping formal name '" + formal + "'.");
                }

                result[formal] = imported;
            }
        }

        if (result.Count == 0 && !String.IsNullOrWhiteSpace(formula))
        {
            IList<string> references = ExtractFormulaReferences(formula);
            for (int i = 0; i < references.Count; i++)
            {
                if (!result.ContainsKey(references[i]))
                {
                    result[references[i]] = references[i];
                }
            }
        }

        return result;
    }

    private static IList<string> ExtractFormulaReferences(string formula)
    {
        List<string> result = new List<string>();
        if (String.IsNullOrWhiteSpace(formula))
        {
            return result;
        }

        MatchCollection matches = Regex.Matches(formula, "[A-Za-z_][A-Za-z0-9_]*");
        for (int i = 0; i < matches.Count; i++)
        {
            string value = matches[i].Value;
            if (IsFormulaKeyword(value))
            {
                continue;
            }

            if (!result.Contains(value))
            {
                result.Add(value);
            }
        }

        return result;
    }

    private static bool IsFormulaKeyword(string value)
    {
        return String.Equals(value, "true", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(value, "false", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(value, "and", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(value, "or", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(value, "not", StringComparison.OrdinalIgnoreCase);
    }

    private static void WriteFormula(XmlDocument document, XmlElement attributes, string formula, IDictionary<string, string> mappings, IDictionary<string, string> formalOids)
    {
        XmlElement formulaElement = FindDirectChild(attributes, "Formula");
        if (formulaElement == null)
        {
            formulaElement = document.CreateElement("Formula");
            attributes.AppendChild(formulaElement);
        }

        formulaElement.SetAttribute("code", formula);
        RemoveChildren(formulaElement, "Formal");

        if (mappings == null)
        {
            return;
        }

        IList<string> formalNames = SortedKeys(mappings);
        for (int i = 0; i < formalNames.Count; i++)
        {
            string formalName = formalNames[i];
            if (formalOids != null && !formalOids.ContainsKey(formalName))
            {
                formalOids[formalName] = CreateLocalOid(document, formalOids);
            }

            XmlElement formal = document.CreateElement("Formal");
            formal.SetAttribute("name", formalName);
            if (formalOids != null && formalOids.ContainsKey(formalName))
            {
                formal.SetAttribute("OID", formalOids[formalName]);
            }

            formulaElement.AppendChild(formal);
        }
    }

    private static void RemoveFormula(XmlElement attributes)
    {
        XmlElement formula = FindDirectChild(attributes, "Formula");
        if (formula != null && formula.ParentNode != null)
        {
            formula.ParentNode.RemoveChild(formula);
        }
    }

    private static void WriteDataMappings(string dataAmdPath, string elementName, string elementOid, string mainAmdPath, IDictionary<string, string> mappings, IDictionary<string, string> formalOids)
    {
        if (String.IsNullOrWhiteSpace(dataAmdPath) || !File.Exists(dataAmdPath))
        {
            throw new AscetReadException("data_amd_not_found", "set_dependency_xml", "Data AMD file is required to write dependency formula mappings.");
        }

        XmlDocument dataDocument = Load(dataAmdPath);
        XmlDocument mainDocument = Load(mainAmdPath);
        XmlElement dataEntry = FindDataEntry(dataDocument, elementName);
        if (dataEntry == null)
        {
            throw new AscetReadException("dependency_data_entry_not_found", "set_dependency_xml", "No DataEntry for element '" + elementName + "' was found in '" + dataAmdPath + "'.");
        }

        if (!String.IsNullOrWhiteSpace(elementOid) && String.IsNullOrWhiteSpace(dataEntry.GetAttribute("elementOID")))
        {
            dataEntry.SetAttribute("elementOID", elementOid);
        }

        IList<XmlElement> variants = FindDirectChildren(dataEntry, "DataVariant");
        if (variants.Count == 0)
        {
            XmlElement variant = dataDocument.CreateElement("DataVariant");
            variant.SetAttribute("name", "default");
            dataEntry.AppendChild(variant);
            variants.Add(variant);
        }

        for (int i = 0; i < variants.Count; i++)
        {
            // A dependent DataVariant is represented by Dependency only. Keeping
            // the old ScalarType payload alongside it makes ASCET reject the AMD
            // import even though main.amd contains a valid formula.
            RemoveChildren(variants[i], "ScalarType");

            XmlElement dependency = FindDirectChild(variants[i], "Dependency");
            if (dependency == null)
            {
                dependency = dataDocument.CreateElement("Dependency");
                variants[i].AppendChild(dependency);
            }

            RemoveChildren(dependency, "Parameter");
            IList<string> formalNames = SortedKeys(mappings);
            for (int j = 0; j < formalNames.Count; j++)
            {
                string formalName = formalNames[j];
                string importedName = mappings[formalName];
                XmlElement imported = FindElement(mainDocument, importedName);
                XmlElement importedAttributes = imported == null ? null : FindScalarAttributes(imported);
                if (imported == null || importedAttributes == null)
                {
                    throw new AscetReadException("imported_parameter_not_found", "set_dependency_xml", "Imported parameter '" + importedName + "' was not found in component XML.");
                }

                string scope = importedAttributes.GetAttribute("scope") ?? String.Empty;
                string kind = importedAttributes.GetAttribute("kind") ?? String.Empty;
                bool parameterLike = String.Equals(kind, "parameter", StringComparison.OrdinalIgnoreCase) ||
                    String.Equals(kind, "dependent", StringComparison.OrdinalIgnoreCase);
                if (!parameterLike || !String.Equals(scope, "imported", StringComparison.OrdinalIgnoreCase))
                {
                    throw new AscetReadException("invalid_dependency_mapping", "set_dependency_xml", "Mapped value '" + importedName + "' must be an imported parameter.");
                }

                string valueOid = imported.GetAttribute("OID") ?? String.Empty;
                if (String.IsNullOrWhiteSpace(valueOid))
                {
                    throw new AscetReadException("invalid_dependency_mapping", "set_dependency_xml", "Mapped value '" + importedName + "' must expose an OID.");
                }

                if (formalOids != null && !formalOids.ContainsKey(formalName))
                {
                    formalOids[formalName] = CreateLocalOid(mainDocument, formalOids);
                }

                XmlElement parameter = dataDocument.CreateElement("Parameter");
                parameter.SetAttribute("formalName", formalName);
                parameter.SetAttribute("formalOID", formalOids == null || !formalOids.ContainsKey(formalName) ? String.Empty : formalOids[formalName]);
                parameter.SetAttribute("valueName", importedName);
                parameter.SetAttribute("valueOID", valueOid);
                dependency.AppendChild(parameter);
            }
        }

        RemoveXmlSignatures(dataDocument);
        Save(dataDocument, dataAmdPath);
    }

    private static string ReadFormulaCode(XmlElement element, XmlElement attributes)
    {
        XmlElement formula = FindDirectChild(element, "Formula");
        if (formula == null)
        {
            formula = FindDirectChild(attributes, "Formula");
        }

        return formula == null ? String.Empty : (formula.GetAttribute("code") ?? String.Empty);
    }

    private static Dictionary<string, string> ReadExistingFormalOids(XmlElement attributes)
    {
        Dictionary<string, string> result = new Dictionary<string, string>(StringComparer.Ordinal);
        XmlElement formula = FindDirectChild(attributes, "Formula");
        if (formula == null)
        {
            return result;
        }

        XmlNodeList formals = formula.GetElementsByTagName("Formal");
        for (int i = 0; i < formals.Count; i++)
        {
            XmlElement formal = formals[i] as XmlElement;
            if (formal == null)
            {
                continue;
            }

            string name = formal.GetAttribute("name") ?? String.Empty;
            string oid = formal.GetAttribute("OID") ?? String.Empty;
            if (!String.IsNullOrWhiteSpace(name) && !String.IsNullOrWhiteSpace(oid))
            {
                result[name] = oid;
            }
        }

        return result;
    }

    private static IList<string> SortedKeys(IDictionary<string, string> values)
    {
        List<string> keys = new List<string>();
        if (values != null)
        {
            foreach (KeyValuePair<string, string> entry in values)
            {
                keys.Add(entry.Key);
            }
        }

        keys.Sort(StringComparer.Ordinal);
        return keys;
    }

    private static string CreateLocalOid(XmlDocument document, IDictionary<string, string> reservedOids)
    {
        IDictionary<string, bool> used = CollectOids(document);
        if (reservedOids != null)
        {
            foreach (KeyValuePair<string, string> entry in reservedOids)
            {
                if (!String.IsNullOrWhiteSpace(entry.Value) && !used.ContainsKey(entry.Value))
                {
                    used[entry.Value] = true;
                }
            }
        }

        string prefix = FindAscetOidPrefix(used);
        for (int i = 0; i < 100; i++)
        {
            string candidate = prefix + CreateBase36Suffix(30 - prefix.Length);
            if (!used.ContainsKey(candidate))
            {
                return candidate;
            }
        }

        throw new AscetReadException("oid_generation_failed", "set_dependency_xml", "Could not generate a unique ASCET-style formal OID.");
    }

    private static IDictionary<string, bool> CollectOids(XmlDocument document)
    {
        Dictionary<string, bool> result = new Dictionary<string, bool>(StringComparer.Ordinal);
        if (document == null)
        {
            return result;
        }

        XmlNodeList nodes = document.GetElementsByTagName("*");
        for (int i = 0; i < nodes.Count; i++)
        {
            XmlElement element = nodes[i] as XmlElement;
            if (element == null || element.Attributes == null)
            {
                continue;
            }

            AddOidAttribute(result, element, "OID");
            AddOidAttribute(result, element, "elementOID");
            AddOidAttribute(result, element, "formalOID");
            AddOidAttribute(result, element, "valueOID");
        }

        return result;
    }

    private static void AddOidAttribute(IDictionary<string, bool> result, XmlElement element, string attributeName)
    {
        string value = element.GetAttribute(attributeName) ?? String.Empty;
        if (!String.IsNullOrWhiteSpace(value) && !result.ContainsKey(value))
        {
            result[value] = true;
        }
    }

    private static string FindAscetOidPrefix(IDictionary<string, bool> used)
    {
        if (used != null)
        {
            foreach (KeyValuePair<string, bool> entry in used)
            {
                string oid = entry.Key ?? String.Empty;
                if (oid.Length == 30 && oid.StartsWith("_040", StringComparison.Ordinal))
                {
                    return oid.Substring(0, 6);
                }
            }
        }

        return "_040ts";
    }

    private static string CreateBase36Suffix(int length)
    {
        const string alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
        byte[] bytes = Guid.NewGuid().ToByteArray();
        StringBuilder builder = new StringBuilder(length);
        int index = 0;
        while (builder.Length < length)
        {
            if (index >= bytes.Length)
            {
                bytes = Guid.NewGuid().ToByteArray();
                index = 0;
            }

            builder.Append(alphabet[bytes[index] % alphabet.Length]);
            index++;
        }

        return builder.ToString();
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

    private static XmlElement FindDirectChild(XmlElement parent, string name)
    {
        IList<XmlElement> children = FindDirectChildren(parent, name);
        return children.Count == 0 ? null : children[0];
    }

    private static IList<XmlElement> FindDirectChildren(XmlElement parent, string name)
    {
        List<XmlElement> children = new List<XmlElement>();
        if (parent == null || String.IsNullOrWhiteSpace(name))
        {
            return children;
        }

        XmlNodeList nodes = parent.ChildNodes;
        for (int i = 0; i < nodes.Count; i++)
        {
            XmlElement child = nodes[i] as XmlElement;
            if (child != null && String.Equals(child.Name, name, StringComparison.Ordinal))
            {
                children.Add(child);
            }
        }

        return children;
    }

    private static void RemoveChildren(XmlElement parent, string name)
    {
        IList<XmlElement> children = FindDirectChildren(parent, name);
        for (int i = 0; i < children.Count; i++)
        {
            if (children[i].ParentNode != null)
            {
                children[i].ParentNode.RemoveChild(children[i]);
            }
        }
    }

    private static XmlDocument Load(string path)
    {
        if (String.IsNullOrWhiteSpace(path) || !File.Exists(path))
        {
            throw new AscetReadException("invalid_argument", "load_dependency_xml", "Main AMD file '" + (path ?? String.Empty) + "' does not exist.");
        }

        XmlDocument document = new XmlDocument();
        document.PreserveWhitespace = false;
        document.Load(path);
        return document;
    }

    private static XmlElement FindScalarAttributes(XmlDocument document, string elementName)
    {
        XmlElement element = FindElement(document, elementName);
        return element == null ? null : FindScalarAttributes(element);
    }

    private static XmlElement FindScalarAttributes(XmlElement element)
    {
        if (element == null)
        {
            return null;
        }

        XmlElement scalar = FindFirstDescendant(element, "ScalarAttributes");
        if (scalar != null)
        {
            return scalar;
        }

        return FindFirstDescendant(element, "PrimitiveAttributes");
    }

    private static XmlElement FindFirstDescendant(XmlElement element, string name)
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

    private static string AttributeSchemaPrefix(XmlElement attributes)
    {
        if (attributes != null && String.Equals(attributes.Name, "PrimitiveAttributes", StringComparison.Ordinal))
        {
            return "primitive";
        }

        return "scalar";
    }

    private static void Save(XmlDocument document, string path)
    {
        // Exported AMD files carry an XML-DSig signature. Any content mutation
        // invalidates it, so never write a stale signature into the import payload.
        RemoveXmlSignatures(document);

        XmlWriterSettings settings = new XmlWriterSettings();
        settings.Encoding = new UTF8Encoding(false);
        settings.Indent = true;
        using (XmlWriter writer = XmlWriter.Create(path, settings))
        {
            document.Save(writer);
        }
    }

    private static void RemoveXmlSignatures(XmlDocument document)
    {
        if (document == null)
        {
            return;
        }

        XmlNodeList signatures = document.GetElementsByTagName("Signature", "http://www.w3.org/2000/09/xmldsig#");
        while (signatures.Count > 0)
        {
            XmlNode signature = signatures[0];
            if (signature == null || signature.ParentNode == null)
            {
                break;
            }

            signature.ParentNode.RemoveChild(signature);
        }
    }
}
