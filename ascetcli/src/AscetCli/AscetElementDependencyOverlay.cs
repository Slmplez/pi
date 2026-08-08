using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Xml;

public sealed class AscetElementDependencyOverlayResult
{
    public IList<string> SpecHashes { get; set; }
    public IDictionary<string, string> ElementOids { get; set; }
}

public static class AscetElementDependencyOverlay
{
    public static AscetElementDependencyOverlayResult Describe(IList<string> specFiles)
    {
        AscetElementDependencyOverlayResult result = new AscetElementDependencyOverlayResult
        {
            SpecHashes = new List<string>(),
            ElementOids = new Dictionary<string, string>(StringComparer.Ordinal)
        };
        if (specFiles == null)
        {
            return result;
        }

        for (int i = 0; i < specFiles.Count; i++)
        {
            string path = ResolveSpecPath(specFiles[i]);
            string json = File.ReadAllText(path);
            ((List<string>)result.SpecHashes).Add(ComputeSha256(json));
            AscetElementSpecDocument document = AscetElementSpecDocumentParser.ParseJson(json);
            IList<AscetElementSpec> elements = document == null ? null : document.Elements;
            if (elements == null)
            {
                continue;
            }
            for (int j = 0; j < elements.Count; j++)
            {
                AscetElementSpec element = elements[j];
                if (element == null || String.IsNullOrWhiteSpace(element.Name))
                {
                    continue;
                }
                if (result.ElementOids.ContainsKey(element.Name))
                {
                    throw new AscetReadException("overlay_element_duplicate", "dependency_overlay", "Element '" + element.Name + "' is defined by more than one overlay spec.");
                }
                result.ElementOids[element.Name] = CreateDeterministicOid(element.Name);
            }
        }
        return result;
    }

    public static AscetElementDependencyOverlayResult Apply(string mainAmdPath, string dataAmdPath, IList<string> specFiles)
    {
        AscetElementDependencyOverlayResult evidence = Describe(specFiles);
        if (specFiles == null || specFiles.Count == 0)
        {
            return evidence;
        }
        if (String.IsNullOrWhiteSpace(mainAmdPath) || !File.Exists(mainAmdPath))
        {
            throw new AscetReadException("main_amd_not_found", "dependency_overlay", "A main AMD file is required for dependency overlay preflight.");
        }

        XmlDocument main = Load(mainAmdPath);
        XmlDocument data = String.IsNullOrWhiteSpace(dataAmdPath) || !File.Exists(dataAmdPath) ? null : Load(dataAmdPath);
        for (int i = 0; i < specFiles.Count; i++)
        {
            string path = ResolveSpecPath(specFiles[i]);
            AscetElementSpecDocument document = AscetElementSpecDocumentParser.ParseJson(File.ReadAllText(path));
            IList<AscetElementSpec> elements = document == null ? null : document.Elements;
            if (elements == null)
            {
                continue;
            }
            for (int j = 0; j < elements.Count; j++)
            {
                ApplyElement(main, data, elements[j], evidence.ElementOids);
            }
        }
        Save(main, mainAmdPath);
        if (data != null)
        {
            Save(data, dataAmdPath);
        }
        return evidence;
    }

    public static string CreateDeterministicOid(string elementName)
    {
        string hash = ComputeSha256(elementName ?? String.Empty);
        return "_040ov" + hash.Substring(0, 24);
    }

    private static void ApplyElement(XmlDocument main, XmlDocument data, AscetElementSpec spec, IDictionary<string, string> elementOids)
    {
        if (spec == null || String.IsNullOrWhiteSpace(spec.Name))
        {
            return;
        }
        if (spec.Kind != AscetElementSpecKind.Parameter && spec.Kind != AscetElementSpecKind.Variable)
        {
            return;
        }

        XmlElement element = FindByAttribute(main, "Element", "name", spec.Name);
        bool created = element == null;
        if (created)
        {
            XmlElement elements = First(main, "Elements");
            if (elements == null)
            {
                throw new AscetReadException("invalid_main_amd", "dependency_overlay", "Main AMD does not contain an Elements node.");
            }
            element = main.CreateElement("Element");
            element.SetAttribute("name", spec.Name);
            string oid = elementOids.ContainsKey(spec.Name) ? elementOids[spec.Name] : CreateDeterministicOid(spec.Name);
            element.SetAttribute("OID", oid);
            XmlElement elementAttributes = main.CreateElement("ElementAttributes");
            XmlElement scalarType = main.CreateElement("ScalarType");
            XmlElement scalarAttributes = main.CreateElement("ScalarAttributes");
            scalarType.AppendChild(scalarAttributes);
            elementAttributes.AppendChild(scalarType);
            element.AppendChild(elementAttributes);
            elements.AppendChild(element);
        }

        XmlElement attributes = FindFirstDescendant(element, "ScalarAttributes") ?? FindFirstDescendant(element, "PrimitiveAttributes");
        if (attributes == null)
        {
            throw new AscetReadException("unsupported_overlay_element", "dependency_overlay", "Element '" + spec.Name + "' is not a scalar primitive and cannot participate in dependency overlay preflight.");
        }
        attributes.SetAttribute("kind", spec.Kind == AscetElementSpecKind.Parameter ? "parameter" : "variable");
        if (!String.IsNullOrWhiteSpace(spec.Scope))
        {
            attributes.SetAttribute("scope", spec.Scope);
        }
        if (created)
        {
            attributes.SetAttribute("dependent", "false");
        }

        if (data != null && !String.Equals(spec.Scope, "imported", StringComparison.OrdinalIgnoreCase))
        {
            EnsureDataEntry(data, spec, element.GetAttribute("OID"));
        }
    }

    private static void EnsureDataEntry(XmlDocument data, AscetElementSpec spec, string elementOid)
    {
        XmlElement existing = FindByAttribute(data, "DataEntry", "elementName", spec.Name);
        if (existing != null)
        {
            return;
        }
        XmlElement root = data.DocumentElement;
        if (root == null)
        {
            throw new AscetReadException("invalid_data_amd", "dependency_overlay", "Data AMD has no document element.");
        }
        XmlElement entry = data.CreateElement("DataEntry");
        entry.SetAttribute("elementName", spec.Name);
        entry.SetAttribute("elementOID", elementOid ?? String.Empty);
        XmlElement variant = data.CreateElement("DataVariant");
        variant.SetAttribute("name", "default");
        XmlElement scalarType = data.CreateElement("ScalarType");
        object value = spec.Data == null ? null : spec.Data.Value;
        if (value is bool)
        {
            XmlElement logical = data.CreateElement("Logical");
            logical.SetAttribute("value", ((bool)value) ? "true" : "false");
            scalarType.AppendChild(logical);
        }
        else
        {
            XmlElement numeric = data.CreateElement("Numeric");
            numeric.SetAttribute("value", value == null ? "0.0" : Convert.ToString(value, CultureInfo.InvariantCulture));
            scalarType.AppendChild(numeric);
        }
        variant.AppendChild(scalarType);
        entry.AppendChild(variant);
        root.AppendChild(entry);
    }

    private static string ResolveSpecPath(string value)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            throw new AscetReadException("invalid_overlay_spec", "dependency_overlay", "Overlay spec path must not be empty.");
        }
        string path = Path.GetFullPath(value);
        if (!File.Exists(path))
        {
            throw new AscetReadException("overlay_spec_not_found", "dependency_overlay", "Overlay spec file '" + value + "' was not found.");
        }
        return path;
    }

    private static XmlDocument Load(string path)
    {
        XmlDocument document = new XmlDocument();
        document.PreserveWhitespace = true;
        document.Load(path);
        return document;
    }

    private static void Save(XmlDocument document, string path)
    {
        XmlWriterSettings settings = new XmlWriterSettings
        {
            Encoding = new UTF8Encoding(false),
            Indent = false,
            OmitXmlDeclaration = document.FirstChild == null || document.FirstChild.NodeType != XmlNodeType.XmlDeclaration
        };
        using (XmlWriter writer = XmlWriter.Create(path, settings))
        {
            document.Save(writer);
        }
    }

    private static XmlElement First(XmlDocument document, string name)
    {
        XmlNodeList nodes = document.GetElementsByTagName(name);
        return nodes.Count == 0 ? null : nodes[0] as XmlElement;
    }

    private static XmlElement FindByAttribute(XmlDocument document, string name, string attribute, string value)
    {
        XmlNodeList nodes = document.GetElementsByTagName(name);
        for (int i = 0; i < nodes.Count; i++)
        {
            XmlElement element = nodes[i] as XmlElement;
            if (element != null && String.Equals(element.GetAttribute(attribute), value, StringComparison.Ordinal))
            {
                return element;
            }
        }
        return null;
    }

    private static XmlElement FindFirstDescendant(XmlElement parent, string name)
    {
        if (parent == null)
        {
            return null;
        }
        XmlNodeList nodes = parent.GetElementsByTagName(name);
        return nodes.Count == 0 ? null : nodes[0] as XmlElement;
    }

    private static string ComputeSha256(string value)
    {
        using (SHA256 algorithm = SHA256.Create())
        {
            byte[] digest = algorithm.ComputeHash(Encoding.UTF8.GetBytes(value ?? String.Empty));
            StringBuilder builder = new StringBuilder(digest.Length * 2);
            for (int i = 0; i < digest.Length; i++)
            {
                builder.Append(digest[i].ToString("x2"));
            }
            return builder.ToString();
        }
    }
}