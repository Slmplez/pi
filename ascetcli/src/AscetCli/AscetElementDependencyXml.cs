using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
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

public sealed class AscetElementDependencyDataVariantMapping
{
    public string VariantName { get; set; }
    public string FormalName { get; set; }
    public string FormalOid { get; set; }
    public string ValueName { get; set; }
    public string ValueOid { get; set; }
    public string ValueKind { get; set; }
    public string ValueScope { get; set; }
}

public sealed class AscetElementDependencyDataVariantState
{
    public string VariantName { get; set; }
    public bool HasDependency { get; set; }
    public bool HasScalarType { get; set; }
    public string ScalarTypeXml { get; set; }
    public IList<AscetElementDependencyDataVariantMapping> Mappings { get; set; }
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

    public static IDictionary<string, string> NormalizeDependencyMappings(string formula, IDictionary<string, string> mappings)
    {
        return NormalizeMappings(formula, mappings);
    }

    public static IList<AscetElementDependencyDataVariantState> ReadDataVariantStates(string dataAmdPath, string elementName)
    {
        XmlDocument document = Load(dataAmdPath);
        XmlElement dataEntry = FindDataEntry(document, elementName);
        if (dataEntry == null)
        {
            throw new AscetReadException("dependency_data_entry_not_found", "read_dependency_data_variants", "No DataEntry for element '" + elementName + "' was found in '" + dataAmdPath + "'.");
        }

        List<AscetElementDependencyDataVariantState> states = new List<AscetElementDependencyDataVariantState>();
        IList<XmlElement> variants = FindDirectChildren(dataEntry, "DataVariant");
        for (int i = 0; i < variants.Count; i++)
        {
            XmlElement variant = variants[i];
            XmlElement dependency = FindDirectChild(variant, "Dependency");
            IList<XmlElement> parameters = dependency == null ? new List<XmlElement>() : FindDirectChildren(dependency, "Parameter");
            List<AscetElementDependencyDataVariantMapping> mappings = new List<AscetElementDependencyDataVariantMapping>();
            for (int j = 0; j < parameters.Count; j++)
            {
                XmlElement parameter = parameters[j];
                mappings.Add(new AscetElementDependencyDataVariantMapping
                {
                    VariantName = variant.GetAttribute("name") ?? String.Empty,
                    FormalName = parameter.GetAttribute("formalName") ?? String.Empty,
                    FormalOid = parameter.GetAttribute("formalOID") ?? String.Empty,
                    ValueName = parameter.GetAttribute("valueName") ?? String.Empty,
                    ValueOid = parameter.GetAttribute("valueOID") ?? String.Empty
                });
            }

            states.Add(new AscetElementDependencyDataVariantState
            {
                VariantName = variant.GetAttribute("name") ?? String.Empty,
                HasDependency = dependency != null,
                HasScalarType = FindDirectChild(variant, "ScalarType") != null,
                ScalarTypeXml = FindDirectChild(variant, "ScalarType") == null ? String.Empty : FindDirectChild(variant, "ScalarType").OuterXml,
                Mappings = mappings
            });
        }

        return states;
    }

    public static IList<AscetElementDependencyDataVariantState> ReadDataVariantStates(string mainAmdPath, string dataAmdPath, string elementName)
    {
        IList<AscetElementDependencyDataVariantState> states = ReadDataVariantStates(dataAmdPath, elementName);
        XmlDocument mainDocument = Load(mainAmdPath);
        for (int i = 0; i < states.Count; i++)
        {
            AscetElementDependencyDataVariantState state = states[i];
            if (state == null || state.Mappings == null)
            {
                continue;
            }

            for (int j = 0; j < state.Mappings.Count; j++)
            {
                AscetElementDependencyDataVariantMapping mapping = state.Mappings[j];
                XmlElement valueElement = mapping == null ? null : FindElement(mainDocument, mapping.ValueName);
                XmlElement valueAttributes = valueElement == null ? null : FindScalarAttributes(valueElement);
                if (mapping != null && valueAttributes != null)
                {
                    mapping.ValueKind = NormalizeDependencyValueKind(valueAttributes.GetAttribute("kind") ?? String.Empty);
                    mapping.ValueScope = valueAttributes.GetAttribute("scope") ?? String.Empty;
                }
            }
        }

        return states;
    }

    public static void VerifyDataVariantMappings(string mainAmdPath, string dataAmdPath, string elementName, IDictionary<string, string> mappings)
    {
        VerifyDataVariantMappings(mainAmdPath, dataAmdPath, elementName, mappings, String.Empty, null, null);
    }

    public static void VerifyDataVariantMappings(
        string mainAmdPath,
        string dataAmdPath,
        string elementName,
        IDictionary<string, string> mappings,
        string variantPolicy,
        IList<string> variantNames,
        IDictionary<string, string> expectedTargetKinds)
    {
        XmlDocument mainDocument = Load(mainAmdPath);
        XmlElement element = FindElement(mainDocument, elementName);
        XmlElement attributes = element == null ? null : FindScalarAttributes(element);
        if (attributes == null)
        {
            throw new AscetReadException("element_not_found", "verify_dependency_data_variants", "Element '" + elementName + "' was not found in '" + mainAmdPath + "'.");
        }

        string formula = ReadFormulaCode(element, attributes);
        IDictionary<string, string> expectedMappings = NormalizeMappings(formula, mappings);
        Dictionary<string, string> formalOids = ReadExistingFormalOids(attributes);
        IList<AscetElementDependencyDataVariantState> states = SelectVariantStates(
            ReadDataVariantStates(mainAmdPath, dataAmdPath, elementName),
            variantPolicy,
            variantNames,
            "verify_dependency_data_variants");
        if (states.Count == 0)
        {
            throw new AscetReadException("dependency_data_variant_not_found", "verify_dependency_data_variants", "No selected DataVariant for element '" + elementName + "' was found in '" + dataAmdPath + "'.");
        }

        foreach (AscetElementDependencyDataVariantState state in states)
        {
            if (state == null)
            {
                continue;
            }

            if (!state.HasDependency || state.HasScalarType)
            {
                throw new AscetReadException("dependency_mapping_readback_mismatch", "verify_dependency_data_variants", "DataVariant '" + state.VariantName + "' must contain Dependency only while dependency mappings are active.");
            }

            if (state.Mappings == null || state.Mappings.Count != expectedMappings.Count)
            {
                throw new AscetReadException("dependency_mapping_readback_mismatch", "verify_dependency_data_variants", "DataVariant '" + state.VariantName + "' contains " + (state.Mappings == null ? 0 : state.Mappings.Count) + " mappings; expected " + expectedMappings.Count + ".");
            }

            foreach (KeyValuePair<string, string> expected in expectedMappings)
            {
                AscetElementDependencyDataVariantMapping actual = FindMapping(state.Mappings, expected.Key);
                if (actual == null)
                {
                    throw new AscetReadException("dependency_mapping_readback_mismatch", "verify_dependency_data_variants", "DataVariant '" + state.VariantName + "' is missing formal '" + expected.Key + "'.");
                }

                string expectedFormalOid = formalOids.ContainsKey(expected.Key) ? formalOids[expected.Key] : String.Empty;
                string expectedKind = expectedTargetKinds != null && expectedTargetKinds.ContainsKey(expected.Key)
                    ? NormalizeDependencyValueKind(expectedTargetKinds[expected.Key])
                    : String.Empty;
                if (String.IsNullOrWhiteSpace(actual.FormalName) ||
                    String.IsNullOrWhiteSpace(actual.FormalOid) ||
                    (!String.IsNullOrWhiteSpace(expectedFormalOid) && !String.Equals(actual.FormalOid, expectedFormalOid, StringComparison.Ordinal)) ||
                    !String.Equals(actual.ValueName, expected.Value, StringComparison.Ordinal) ||
                    String.IsNullOrWhiteSpace(actual.ValueOid) ||
                    (!String.IsNullOrWhiteSpace(expectedKind) && !String.Equals(actual.ValueKind, expectedKind, StringComparison.Ordinal)))
                {
                    throw new AscetReadException("dependency_mapping_readback_mismatch", "verify_dependency_data_variants", "DataVariant '" + state.VariantName + "' mapping for formal '" + expected.Key + "' has formalName='" + actual.FormalName + "' formalOID='" + actual.FormalOid + "' valueName='" + actual.ValueName + "' valueOID='" + actual.ValueOid + "' targetKind='" + actual.ValueKind + "' targetScope='" + actual.ValueScope + "'.");
                }
            }
        }
    }

    private static AscetElementDependencyDataVariantMapping FindMapping(IList<AscetElementDependencyDataVariantMapping> mappings, string formalName)
    {
        if (mappings == null)
        {
            return null;
        }

        for (int i = 0; i < mappings.Count; i++)
        {
            AscetElementDependencyDataVariantMapping mapping = mappings[i];
            if (mapping != null && String.Equals(mapping.FormalName, formalName, StringComparison.Ordinal))
            {
                return mapping;
            }
        }

        return null;
    }

    public static void SetMainAmdDependencyAndFormula(string mainAmdPath, string dataAmdPath, string elementName, bool dependent, string formula, IDictionary<string, string> mappings, bool clearFormula)
    {
        SetMainAmdDependencyAndFormula(mainAmdPath, dataAmdPath, elementName, dependent, formula, mappings, null, clearFormula, String.Empty, null, String.Empty, null);
    }

    public static void SetMainAmdDependencyAndFormula(
        string mainAmdPath,
        string dataAmdPath,
        string elementName,
        bool dependent,
        string formula,
        IDictionary<string, string> mappings,
        bool clearFormula,
        string variantPolicy,
        IList<string> variantNames,
        string restorationPolicy,
        IDictionary<string, string> restorationValues)
    {
        SetMainAmdDependencyAndFormula(mainAmdPath, dataAmdPath, elementName, dependent, formula, mappings, null, clearFormula, variantPolicy, variantNames, restorationPolicy, restorationValues);
    }

    public static void SetMainAmdDependencyAndFormula(
        string mainAmdPath,
        string dataAmdPath,
        string elementName,
        bool dependent,
        string formula,
        IDictionary<string, string> mappings,
        IDictionary<string, Dictionary<string, string>> variantMappings,
        bool clearFormula,
        string variantPolicy,
        IList<string> variantNames,
        string restorationPolicy,
        IDictionary<string, string> restorationValues)
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

        Dictionary<string, string> effectiveMappings = MergeVariantMappings(formula, mappings, variantMappings);
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
            WriteDataMappings(dataAmdPath, elementName, element == null ? String.Empty : (element.GetAttribute("OID") ?? String.Empty), mainAmdPath, mappings, variantMappings, formalOids, variantPolicy, variantNames);
        }
        else if (!dependent && !String.IsNullOrWhiteSpace(dataAmdPath))
        {
            RestoreIndependentData(mainAmdPath, dataAmdPath, elementName, variantPolicy, variantNames, restorationPolicy, restorationValues);
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

    private static Dictionary<string, string> MergeVariantMappings(
        string formula,
        IDictionary<string, string> mappings,
        IDictionary<string, Dictionary<string, string>> variantMappings)
    {
        Dictionary<string, string> merged = NormalizeMappings(String.Empty, mappings);
        if (variantMappings != null)
        {
            foreach (KeyValuePair<string, Dictionary<string, string>> variant in variantMappings)
            {
                Dictionary<string, string> normalized = NormalizeMappings(String.Empty, variant.Value);
                foreach (KeyValuePair<string, string> mapping in normalized)
                {
                    if (!merged.ContainsKey(mapping.Key))
                    {
                        merged[mapping.Key] = mapping.Value;
                    }
                }
            }
        }
        if (merged.Count == 0 && !String.IsNullOrWhiteSpace(formula))
        {
            throw new AscetReadException("dependency_mappings_required", "set_dependency_xml", "Dependency formulas require explicit formal-to-value mappings.");
        }
        return merged;
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
                    throw new AscetReadException("invalid_argument", "set_dependency_xml", "Dependency formula mappings must use non-empty formal and value element names.");
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
            throw new AscetReadException(
                "dependency_mappings_required",
                "set_dependency_xml",
                "Dependency formulas require explicit formal-to-value mappings; identifier inference is disabled because ASCET formulas use C syntax.");
        }

        return result;
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
                formalOids[formalName] = CreateLocalOid(document, formalOids, ReadOwningElementName(attributes) + "|" + formalName);
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

    private static void WriteDataMappings(string dataAmdPath, string elementName, string elementOid, string mainAmdPath, IDictionary<string, string> mappings, IDictionary<string, Dictionary<string, string>> variantMappings, IDictionary<string, string> formalOids, string variantPolicy, IList<string> variantNames)
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

        string dataEntryOid = dataEntry.GetAttribute("elementOID") ?? String.Empty;
        if (!String.IsNullOrWhiteSpace(elementOid) && !String.IsNullOrWhiteSpace(dataEntryOid) && !String.Equals(dataEntryOid, elementOid, StringComparison.Ordinal))
        {
            throw new AscetReadException("dependency_data_entry_oid_mismatch", "set_dependency_xml", "DataEntry for element '" + elementName + "' has elementOID='" + dataEntryOid + "' but main AMD element OID is '" + elementOid + "'.");
        }

        if (!String.IsNullOrWhiteSpace(elementOid) && String.IsNullOrWhiteSpace(dataEntryOid))
        {
            dataEntry.SetAttribute("elementOID", elementOid);
        }

        IList<XmlElement> variants = SelectVariantElements(dataEntry, variantPolicy, variantNames, "set_dependency_xml");

        for (int i = 0; i < variants.Count; i++)
        {
            string variantName = variants[i].GetAttribute("name") ?? String.Empty;
            IDictionary<string, string> mappingsForVariant = mappings;
            if (variantMappings != null && variantMappings.ContainsKey(variantName))
            {
                mappingsForVariant = variantMappings[variantName];
            }
            Dictionary<string, string> normalizedMappings = NormalizeMappings(String.Empty, mappingsForVariant);
            if (normalizedMappings.Count == 0)
            {
                throw new AscetReadException("dependency_mappings_required", "set_dependency_xml", "Selected DataVariant '" + variantName + "' has no dependency mappings.");
            }

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
            IList<string> formalNames = SortedKeys(normalizedMappings);
            for (int j = 0; j < formalNames.Count; j++)
            {
                string formalName = formalNames[j];
                string valueName = normalizedMappings[formalName];
                if (String.Equals(valueName, elementName, StringComparison.Ordinal))
                {
                    throw new AscetReadException("dependency_cycle", "set_dependency_xml", "Formal '" + formalName + "' cannot map dependent element '" + elementName + "' to itself.");
                }

                XmlElement valueElement = FindElement(mainDocument, valueName);
                XmlElement valueAttributes = valueElement == null ? null : FindScalarAttributes(valueElement);
                if (valueElement == null || valueAttributes == null)
                {
                    throw new AscetReadException("dependency_value_not_found", "set_dependency_xml", "Mapped value '" + valueName + "' was not found in component XML.");
                }

                string kind = NormalizeDependencyValueKind(valueAttributes.GetAttribute("kind") ?? String.Empty);
                bool supportedValue = String.Equals(kind, "parameter", StringComparison.Ordinal) ||
                    String.Equals(kind, "dependent", StringComparison.Ordinal) ||
                    String.Equals(kind, "constant", StringComparison.Ordinal) ||
                    String.Equals(kind, "systemconstant", StringComparison.Ordinal);
                if (!supportedValue)
                {
                    throw new AscetReadException("invalid_dependency_mapping", "set_dependency_xml", "Mapped value '" + valueName + "' must be a Parameter, Constant, or System Constant, but kind is '" + (valueAttributes.GetAttribute("kind") ?? String.Empty) + "'.");
                }

                string valueOid = valueElement.GetAttribute("OID") ?? String.Empty;
                if (String.IsNullOrWhiteSpace(valueOid))
                {
                    throw new AscetReadException("invalid_dependency_mapping", "set_dependency_xml", "Mapped value '" + valueName + "' must expose an OID.");
                }

                if (formalOids != null && !formalOids.ContainsKey(formalName))
                {
                    formalOids[formalName] = CreateLocalOid(mainDocument, formalOids, elementName + "|" + formalName);
                }

                XmlElement parameter = dataDocument.CreateElement("Parameter");
                parameter.SetAttribute("formalName", formalName);
                parameter.SetAttribute("formalOID", formalOids == null || !formalOids.ContainsKey(formalName) ? String.Empty : formalOids[formalName]);
                parameter.SetAttribute("valueName", valueName);
                parameter.SetAttribute("valueOID", valueOid);
                dependency.AppendChild(parameter);
            }
        }

        RemoveXmlSignatures(dataDocument);
        Save(dataDocument, dataAmdPath);
    }

    private static void RestoreIndependentData(
        string mainAmdPath,
        string dataAmdPath,
        string elementName,
        string variantPolicy,
        IList<string> variantNames,
        string restorationPolicy,
        IDictionary<string, string> restorationValues)
    {
        XmlDocument document = Load(dataAmdPath);
        XmlElement dataEntry = FindDataEntry(document, elementName);
        if (dataEntry == null)
        {
            throw new AscetReadException("dependency_data_entry_not_found", "restore_independent_data", "No DataEntry for element '" + elementName + "' was found in '" + dataAmdPath + "'.");
        }

        IList<XmlElement> variants = SelectVariantElements(dataEntry, variantPolicy, variantNames, "restore_independent_data");
        string policy = restorationPolicy == null ? String.Empty : restorationPolicy.Trim();
        if (String.IsNullOrWhiteSpace(policy))
        {
            throw new AscetReadException("independent_value_restoration_required", "restore_independent_data", "Independent conversion requires valueRestoration policy fromSnapshot, explicit, or ascetDefault.");
        }

        for (int i = 0; i < variants.Count; i++)
        {
            XmlElement variant = variants[i];
            string name = variant.GetAttribute("name") ?? String.Empty;
            RemoveChildren(variant, "Dependency");
            RemoveChildren(variant, "ScalarType");

            XmlElement scalar;
            if (String.Equals(policy, "fromSnapshot", StringComparison.OrdinalIgnoreCase))
            {
                string xml = restorationValues != null && restorationValues.ContainsKey(name) ? restorationValues[name] : String.Empty;
                if (String.IsNullOrWhiteSpace(xml))
                {
                    throw new AscetReadException("independent_value_restoration_required", "restore_independent_data", "Snapshot restoration is missing ScalarType XML for DataVariant '" + name + "'.");
                }

                XmlDocument fragment = new XmlDocument();
                fragment.LoadXml(xml);
                if (fragment.DocumentElement == null || !String.Equals(fragment.DocumentElement.Name, "ScalarType", StringComparison.Ordinal))
                {
                    throw new AscetReadException("invalid_snapshot", "restore_independent_data", "Snapshot for DataVariant '" + name + "' must contain a ScalarType element.");
                }
                scalar = document.ImportNode(fragment.DocumentElement, true) as XmlElement;
            }
            else
            {
                string value = restorationValues != null && restorationValues.ContainsKey(name) ? restorationValues[name] : String.Empty;
                if (String.Equals(policy, "explicit", StringComparison.OrdinalIgnoreCase) && String.IsNullOrWhiteSpace(value))
                {
                    throw new AscetReadException("independent_value_restoration_required", "restore_independent_data", "Explicit restoration is missing a value for DataVariant '" + name + "'.");
                }
                bool ascetDefault = String.Equals(policy, "ascetDefault", StringComparison.OrdinalIgnoreCase);
                if (!ascetDefault && !String.Equals(policy, "explicit", StringComparison.OrdinalIgnoreCase))
                {
                    throw new AscetReadException("invalid_argument", "restore_independent_data", "Unknown restoration policy '" + policy + "'.");
                }

                scalar = CreateScalarTypeForValue(document, mainAmdPath, elementName, ascetDefault ? null : value);
            }

            variant.AppendChild(scalar);
        }

        Save(document, dataAmdPath);
    }

    private static XmlElement CreateScalarTypeForValue(XmlDocument dataDocument, string mainAmdPath, string elementName, string explicitValue)
    {
        XmlDocument mainDocument = Load(mainAmdPath);
        XmlElement element = FindElement(mainDocument, elementName);
        XmlElement elementAttributes = element == null ? null : FindDirectChild(element, "ElementAttributes");
        string basicModelType = elementAttributes == null ? String.Empty : (elementAttributes.GetAttribute("basicModelType") ?? String.Empty);
        if (String.IsNullOrWhiteSpace(basicModelType) && elementAttributes != null)
        {
            basicModelType = elementAttributes.GetAttribute("modelType") ?? String.Empty;
        }
        bool logical = String.Equals(basicModelType, "log", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(basicModelType, "logic", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(basicModelType, "boolean", StringComparison.OrdinalIgnoreCase);

        XmlElement scalar = dataDocument.CreateElement("ScalarType");
        XmlElement valueElement = dataDocument.CreateElement(logical ? "Logic" : "Numeric");
        if (String.IsNullOrWhiteSpace(explicitValue))
        {
            valueElement.SetAttribute("value", logical ? "false" : "0.0");
        }
        else if (logical)
        {
            bool parsed;
            if (!Boolean.TryParse(explicitValue, out parsed))
            {
                throw new AscetReadException("invalid_argument", "restore_independent_data", "Logical explicit restoration value must be true or false.");
            }
            valueElement.SetAttribute("value", parsed ? "true" : "false");
        }
        else
        {
            valueElement.SetAttribute("value", explicitValue);
        }
        scalar.AppendChild(valueElement);
        return scalar;
    }

    private static IList<XmlElement> SelectVariantElements(XmlElement dataEntry, string variantPolicy, IList<string> variantNames, string stage)
    {
        IList<XmlElement> variants = FindDirectChildren(dataEntry, "DataVariant");
        if (variants.Count == 0)
        {
            throw new AscetReadException("dependency_data_variant_not_found", stage, "No DataVariant exists for element '" + (dataEntry == null ? String.Empty : dataEntry.GetAttribute("elementName")) + "'.");
        }

        string policy = variantPolicy == null ? String.Empty : variantPolicy.Trim().ToLowerInvariant();
        if (String.IsNullOrWhiteSpace(policy))
        {
            if (variants.Count == 1)
            {
                return variants;
            }
            throw new AscetReadException("data_variant_selection_required", stage, "Multiple DataVariants exist; choose variantPolicy default, selected, or all explicitly.");
        }

        List<XmlElement> selected = new List<XmlElement>();
        if (String.Equals(policy, "all", StringComparison.Ordinal))
        {
            for (int i = 0; i < variants.Count; i++)
            {
                selected.Add(variants[i]);
            }
            return selected;
        }

        if (String.Equals(policy, "default", StringComparison.Ordinal))
        {
            for (int i = 0; i < variants.Count; i++)
            {
                if (String.Equals(variants[i].GetAttribute("name"), "default", StringComparison.OrdinalIgnoreCase))
                {
                    selected.Add(variants[i]);
                    return selected;
                }
            }
            throw new AscetReadException("data_variant_not_found", stage, "variantPolicy default requires a DataVariant named 'default'.");
        }

        if (!String.Equals(policy, "selected", StringComparison.Ordinal))
        {
            throw new AscetReadException("invalid_argument", stage, "variantPolicy must be default, selected, or all.");
        }
        if (variantNames == null || variantNames.Count == 0)
        {
            throw new AscetReadException("data_variant_selection_required", stage, "variantPolicy selected requires at least one variant name.");
        }

        Dictionary<string, XmlElement> byName = new Dictionary<string, XmlElement>(StringComparer.Ordinal);
        for (int i = 0; i < variants.Count; i++)
        {
            byName[variants[i].GetAttribute("name") ?? String.Empty] = variants[i];
        }
        for (int i = 0; i < variantNames.Count; i++)
        {
            string name = variantNames[i] == null ? String.Empty : variantNames[i].Trim();
            if (String.IsNullOrWhiteSpace(name) || !byName.ContainsKey(name))
            {
                throw new AscetReadException("data_variant_not_found", stage, "Selected DataVariant '" + name + "' does not exist.");
            }
            if (!selected.Contains(byName[name]))
            {
                selected.Add(byName[name]);
            }
        }
        return selected;
    }

    private static IList<AscetElementDependencyDataVariantState> SelectVariantStates(
        IList<AscetElementDependencyDataVariantState> states,
        string variantPolicy,
        IList<string> variantNames,
        string stage)
    {
        XmlDocument temporary = new XmlDocument();
        XmlElement entry = temporary.CreateElement("DataEntry");
        temporary.AppendChild(entry);
        Dictionary<string, AscetElementDependencyDataVariantState> byName = new Dictionary<string, AscetElementDependencyDataVariantState>(StringComparer.Ordinal);
        for (int i = 0; i < states.Count; i++)
        {
            AscetElementDependencyDataVariantState state = states[i];
            XmlElement variant = temporary.CreateElement("DataVariant");
            variant.SetAttribute("name", state == null ? String.Empty : (state.VariantName ?? String.Empty));
            entry.AppendChild(variant);
            if (state != null)
            {
                byName[state.VariantName ?? String.Empty] = state;
            }
        }

        IList<XmlElement> selectedElements = SelectVariantElements(entry, variantPolicy, variantNames, stage);
        List<AscetElementDependencyDataVariantState> selected = new List<AscetElementDependencyDataVariantState>();
        for (int i = 0; i < selectedElements.Count; i++)
        {
            string name = selectedElements[i].GetAttribute("name") ?? String.Empty;
            if (byName.ContainsKey(name))
            {
                selected.Add(byName[name]);
            }
        }
        return selected;
    }

    private static string NormalizeDependencyValueKind(string value)
    {
        return String.IsNullOrWhiteSpace(value)
            ? String.Empty
            : value.Trim().Replace("-", String.Empty).Replace("_", String.Empty).Replace(" ", String.Empty).ToLowerInvariant();
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

    private static string CreateLocalOid(XmlDocument document, IDictionary<string, string> reservedOids, string seed)
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
            string candidate = prefix + CreateDeterministicBase36Suffix(seed, i, 30 - prefix.Length);
            if (!used.ContainsKey(candidate))
            {
                return candidate;
            }
        }

        throw new AscetReadException("oid_generation_failed", "set_dependency_xml", "Could not generate a unique ASCET-style formal OID.");
    }

    private static string ReadOwningElementName(XmlElement node)
    {
        XmlNode current = node;
        while (current != null)
        {
            XmlElement element = current as XmlElement;
            if (element != null && String.Equals(element.Name, "Element", StringComparison.OrdinalIgnoreCase))
            {
                return element.GetAttribute("name") ?? String.Empty;
            }
            current = current.ParentNode;
        }
        return String.Empty;
    }

    private static string CreateDeterministicBase36Suffix(string seed, int attempt, int length)
    {
        const string alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
        string input = (seed ?? String.Empty) + "\n" + attempt.ToString();
        byte[] digest;
        using (SHA256 algorithm = SHA256.Create())
        {
            digest = algorithm.ComputeHash(Encoding.UTF8.GetBytes(input));
        }
        StringBuilder builder = new StringBuilder(length);
        for (int i = 0; builder.Length < length; i++)
        {
            builder.Append(alphabet[digest[i % digest.Length] % alphabet.Length]);
        }
        return builder.ToString();
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
