using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Xml;

public sealed class AscetDependencySnapshotRecord
{
    public string TargetPath { get; set; }
    public string ElementName { get; set; }
    public string SnapshotPath { get; set; }
    public string SnapshotHash { get; set; }
    public IDictionary<string, string> ScalarTypeXmlByVariant { get; set; }
}

public static class AscetDependencySnapshotStore
{
    public static string ComputeStateHash(IList<AscetElementDependencyDataVariantState> states)
    {
        if (states == null)
        {
            return String.Empty;
        }
        List<string> parts = new List<string>();
        for (int i = 0; i < states.Count; i++)
        {
            AscetElementDependencyDataVariantState state = states[i];
            if (state != null)
            {
                parts.Add((state.VariantName ?? String.Empty) + "\n" + (state.ScalarTypeXml ?? String.Empty) + "\n" + (state.HasDependency ? "1" : "0"));
            }
        }
        parts.Sort(StringComparer.Ordinal);
        byte[] bytes = Encoding.UTF8.GetBytes(String.Join("\n--variant--\n", parts.ToArray()));
        using (SHA256 sha = SHA256.Create())
        {
            byte[] hash = sha.ComputeHash(bytes);
            StringBuilder builder = new StringBuilder();
            for (int i = 0; i < hash.Length; i++)
            {
                builder.Append(hash[i].ToString("x2"));
            }
            return builder.ToString();
        }
    }

    public static AscetDependencySnapshotRecord Save(
        string targetPath,
        string elementName,
        IList<AscetElementDependencyDataVariantState> states)
    {
        if (states == null || states.Count == 0)
        {
            throw new AscetReadException("dependency_snapshot_unavailable", "save_dependency_snapshot", "No DataVariant state is available to snapshot.");
        }

        Dictionary<string, string> values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (int i = 0; i < states.Count; i++)
        {
            AscetElementDependencyDataVariantState state = states[i];
            if (state == null || !state.HasScalarType || String.IsNullOrWhiteSpace(state.ScalarTypeXml))
            {
                throw new AscetReadException(
                    "dependency_snapshot_unavailable",
                    "save_dependency_snapshot",
                    "DataVariant '" + (state == null ? String.Empty : state.VariantName) + "' does not expose ScalarType data.");
            }
            values[state.VariantName ?? String.Empty] = state.ScalarTypeXml;
        }

        string path = ResolvePath(targetPath, elementName);
        Directory.CreateDirectory(Path.GetDirectoryName(path));
        XmlDocument document = new XmlDocument();
        XmlElement root = document.CreateElement("DependencySnapshot");
        root.SetAttribute("targetPath", targetPath ?? String.Empty);
        root.SetAttribute("elementName", elementName ?? String.Empty);
        root.SetAttribute("createdAtUtc", DateTime.UtcNow.ToString("O"));
        document.AppendChild(root);
        foreach (KeyValuePair<string, string> value in values)
        {
            XmlElement variant = document.CreateElement("Variant");
            variant.SetAttribute("name", value.Key ?? String.Empty);
            XmlDocument fragment = new XmlDocument();
            fragment.LoadXml(value.Value);
            if (fragment.DocumentElement == null || !String.Equals(fragment.DocumentElement.Name, "ScalarType", StringComparison.Ordinal))
            {
                throw new AscetReadException("invalid_snapshot", "save_dependency_snapshot", "Snapshot value for DataVariant '" + value.Key + "' is not ScalarType XML.");
            }
            variant.AppendChild(document.ImportNode(fragment.DocumentElement, true));
            root.AppendChild(variant);
        }

        string temporary = path + ".tmp-" + Guid.NewGuid().ToString("N");
        try
        {
            SaveDocument(document, temporary);
            if (File.Exists(path))
            {
                File.Delete(path);
            }
            File.Move(temporary, path);
        }
        finally
        {
            if (File.Exists(temporary))
            {
                File.Delete(temporary);
            }
        }
        return Load(targetPath, elementName);
    }

    public static AscetDependencySnapshotRecord Load(string targetPath, string elementName)
    {
        string path = ResolvePath(targetPath, elementName);
        if (!File.Exists(path))
        {
            throw new AscetReadException(
                "dependency_snapshot_not_found",
                "load_dependency_snapshot",
                "No dependency snapshot exists for '" + (targetPath ?? String.Empty) + "' element '" + (elementName ?? String.Empty) + "'.");
        }

        XmlDocument document = new XmlDocument();
        document.Load(path);
        XmlElement root = document.DocumentElement;
        if (root == null || !String.Equals(root.Name, "DependencySnapshot", StringComparison.Ordinal) ||
            !String.Equals(root.GetAttribute("targetPath"), targetPath ?? String.Empty, StringComparison.OrdinalIgnoreCase) ||
            !String.Equals(root.GetAttribute("elementName"), elementName ?? String.Empty, StringComparison.Ordinal))
        {
            throw new AscetReadException("dependency_snapshot_mismatch", "load_dependency_snapshot", "Dependency snapshot identity does not match the requested target and element.");
        }

        Dictionary<string, string> values = new Dictionary<string, string>(StringComparer.Ordinal);
        XmlNodeList variants = root.GetElementsByTagName("Variant");
        for (int i = 0; i < variants.Count; i++)
        {
            XmlElement variant = variants[i] as XmlElement;
            XmlElement scalar = variant == null ? null : FindDirectChild(variant, "ScalarType");
            if (variant == null || scalar == null)
            {
                throw new AscetReadException("dependency_snapshot_corrupt", "load_dependency_snapshot", "Dependency snapshot contains a Variant without ScalarType.");
            }
            values[variant.GetAttribute("name") ?? String.Empty] = scalar.OuterXml;
        }
        if (values.Count == 0)
        {
            throw new AscetReadException("dependency_snapshot_corrupt", "load_dependency_snapshot", "Dependency snapshot contains no DataVariant values.");
        }

        return new AscetDependencySnapshotRecord
        {
            TargetPath = targetPath ?? String.Empty,
            ElementName = elementName ?? String.Empty,
            SnapshotPath = path,
            SnapshotHash = ComputeFileHash(path),
            ScalarTypeXmlByVariant = values
        };
    }

    public static void Delete(string targetPath, string elementName)
    {
        string path = ResolvePath(targetPath, elementName);
        if (File.Exists(path))
        {
            File.Delete(path);
        }
    }

    public static string ResolvePath(string targetPath, string elementName)
    {
        string root = Environment.GetEnvironmentVariable("ASCET_DEPENDENCY_SNAPSHOT_ROOT");
        if (String.IsNullOrWhiteSpace(root))
        {
            root = Path.Combine(Path.GetTempPath(), "pi-ascet-extension", "dependency-snapshots");
        }
        return Path.Combine(Path.GetFullPath(root), ComputeKey(targetPath, elementName) + ".xml");
    }

    private static string ComputeKey(string targetPath, string elementName)
    {
        byte[] bytes = Encoding.UTF8.GetBytes((targetPath ?? String.Empty).Trim().ToLowerInvariant() + "\n" + (elementName ?? String.Empty));
        using (SHA256 sha = SHA256.Create())
        {
            byte[] hash = sha.ComputeHash(bytes);
            StringBuilder builder = new StringBuilder();
            for (int i = 0; i < 16; i++)
            {
                builder.Append(hash[i].ToString("x2"));
            }
            return builder.ToString();
        }
    }

    private static string ComputeFileHash(string path)
    {
        using (FileStream stream = File.OpenRead(path))
        using (SHA256 sha = SHA256.Create())
        {
            byte[] hash = sha.ComputeHash(stream);
            StringBuilder builder = new StringBuilder();
            for (int i = 0; i < hash.Length; i++)
            {
                builder.Append(hash[i].ToString("x2"));
            }
            return builder.ToString();
        }
    }

    private static XmlElement FindDirectChild(XmlElement parent, string name)
    {
        if (parent == null)
        {
            return null;
        }
        for (int i = 0; i < parent.ChildNodes.Count; i++)
        {
            XmlElement child = parent.ChildNodes[i] as XmlElement;
            if (child != null && String.Equals(child.Name, name, StringComparison.Ordinal))
            {
                return child;
            }
        }
        return null;
    }

    private static void SaveDocument(XmlDocument document, string path)
    {
        XmlWriterSettings settings = new XmlWriterSettings();
        settings.Encoding = new UTF8Encoding(false);
        settings.Indent = true;
        using (XmlWriter writer = XmlWriter.Create(path, settings))
        {
            document.Save(writer);
        }
    }
}
