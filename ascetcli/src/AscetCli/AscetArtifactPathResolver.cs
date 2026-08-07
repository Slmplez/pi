using System;
using System.IO;

public static class AscetArtifactPathResolver
{
    public static string ResolveReadableFilePath(string filePath)
    {
        if (String.IsNullOrWhiteSpace(filePath))
        {
            return filePath;
        }

        string trimmed = filePath.Trim();
        if (File.Exists(trimmed))
        {
            return trimmed;
        }

        string translated = TranslateUnixStylePath(trimmed);
        if (!String.Equals(translated, trimmed, StringComparison.Ordinal) && File.Exists(translated))
        {
            return translated;
        }

        return trimmed;
    }

    public static string TranslateUnixStylePath(string filePath)
    {
        if (String.IsNullOrWhiteSpace(filePath))
        {
            return filePath;
        }

        string trimmed = filePath.Trim();
        if (trimmed.Equals("/tmp", StringComparison.OrdinalIgnoreCase))
        {
            return Path.GetTempPath().TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        }

        if (trimmed.StartsWith("/tmp/", StringComparison.OrdinalIgnoreCase))
        {
            string relative = trimmed.Substring(5).Replace('/', Path.DirectorySeparatorChar);
            return Path.Combine(Path.GetTempPath(), relative);
        }

        if (trimmed.StartsWith("/mnt/", StringComparison.OrdinalIgnoreCase) && trimmed.Length >= 7 && trimmed[6] == '/')
        {
            char drive = Char.ToUpperInvariant(trimmed[5]);
            if (drive >= 'A' && drive <= 'Z')
            {
                string suffix = trimmed.Length > 7 ? trimmed.Substring(7).Replace('/', '\\') : String.Empty;
                return drive + @":\" + suffix;
            }
        }

        if (trimmed.Length >= 3 && trimmed[0] == '/' && Char.IsLetter(trimmed[1]) && trimmed[2] == '/')
        {
            char drive = Char.ToUpperInvariant(trimmed[1]);
            string suffix = trimmed.Substring(3).Replace('/', '\\');
            return drive + @":\" + suffix;
        }

        return filePath;
    }

    public static string FormatResolvedPathSuffix(string originalPath, string resolvedPath)
    {
        if (String.Equals(originalPath ?? String.Empty, resolvedPath ?? String.Empty, StringComparison.Ordinal))
        {
            return String.Empty;
        }

        return " Resolved path: '" + resolvedPath + "'.";
    }
}
