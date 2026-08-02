using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;

public sealed class AscetTestExportManifestValidation
{
    public bool IsValid;
    public string Path;
    public Dictionary<string, object> Manifest;
    public List<AscetTestValidationIssue> Errors;
    public List<AscetTestValidationIssue> Warnings;

    public AscetTestExportManifestValidation()
    {
        IsValid = true;
        Path = String.Empty;
        Manifest = new Dictionary<string, object>();
        Errors = new List<AscetTestValidationIssue>();
        Warnings = new List<AscetTestValidationIssue>();
    }
}

public static class AscetTestExportManifestService
{
    public static AscetTestExportManifestValidation Validate(
        Dictionary<string, object> request,
        string runDirectory,
        bool required)
    {
        AscetTestExportManifestValidation result = new AscetTestExportManifestValidation();
        Dictionary<string, object> verification = AscetTestContracts.GetDictionary(request, "verification");
        string path = FirstNonEmpty(
            AscetTestContracts.GetString(verification, "exportManifestPath"),
            AscetTestContracts.GetString(request, "exportManifestPath"));
        if (String.IsNullOrWhiteSpace(path))
        {
            if (required) AddError(result, "exportManifestPath", "export_manifest_missing", "A generated C export manifest is required before build.");
            else result.Warnings.Add(Issue("exportManifestPath", "export_manifest_not_supplied", "No generated C export manifest was supplied."));
            return Complete(result);
        }

        string resolvedPath;
        try { resolvedPath = AscetTestContracts.ResolvePath(path, runDirectory); }
        catch (Exception ex)
        {
            AddError(result, "exportManifestPath", "export_manifest_invalid", ex.Message);
            return Complete(result);
        }
        result.Path = resolvedPath;
        if (!File.Exists(resolvedPath))
        {
            AddError(result, "exportManifestPath", "export_manifest_missing", "Generated C export manifest was not found: " + resolvedPath);
            return Complete(result);
        }

        Dictionary<string, object> envelope;
        try { envelope = AscetTestContracts.ReadObject(resolvedPath, "exportManifest"); }
        catch (Exception ex)
        {
            AddError(result, "exportManifestPath", "export_manifest_invalid", ex.Message);
            return Complete(result);
        }

        Dictionary<string, object> manifest = AscetTestContracts.GetDictionary(envelope, "generatedCodeManifest");
        if (manifest == null) manifest = envelope;
        result.Manifest = manifest;

        if (envelope.ContainsKey("succeeded") && !AscetTestContracts.GetBoolean(envelope, "succeeded", false))
            AddError(result, "succeeded", "export_failed", "ASCET export manifest reports succeeded=false.");
        RequireString(manifest, result, "schemaVersion", "ascet-generated-c-export/v1", "export_manifest_schema_invalid", "Generated C export manifest schemaVersion is invalid.");
        RequireString(manifest, result, "status", "ready", "export_not_ready", "Generated C export manifest is not ready.");

        string requestedComponent = Normalize(AscetTestContracts.GetString(request, "componentPath"));
        string manifestComponent = Normalize(AscetTestContracts.GetString(manifest, "componentPath"));
        if (!String.IsNullOrWhiteSpace(requestedComponent) && !String.Equals(requestedComponent, manifestComponent, StringComparison.OrdinalIgnoreCase))
            AddError(result, "componentPath", "export_component_mismatch", "Generated C export componentPath does not match the request.");

        string manifestDirectory = System.IO.Path.GetDirectoryName(resolvedPath);
        string generatedDir = ResolveManifestPath(manifest, "generatedDir", manifestDirectory);
        if (String.IsNullOrWhiteSpace(generatedDir) || !Directory.Exists(generatedDir))
            AddError(result, "generatedDir", "generated_c_directory_missing", "Generated C directory is missing: " + generatedDir);

        string componentSource = ResolveManifestPath(manifest, "componentSourcePath", manifestDirectory);
        if (String.IsNullOrWhiteSpace(componentSource) || !File.Exists(componentSource))
            AddError(result, "componentSourcePath", "generated_c_source_missing", "Generated component C source is missing: " + componentSource);
        else
        {
            if (!componentSource.EndsWith(".c", StringComparison.OrdinalIgnoreCase))
                AddError(result, "componentSourcePath", "generated_c_source_invalid", "Component source must be a C file.");
            if (!IsWithin(componentSource, generatedDir))
                AddError(result, "componentSourcePath", "generated_c_source_outside_manifest", "Component source is outside generatedDir.");
        }

        ValidateManifestFiles(manifest, "sourceFiles", ".c", generatedDir, result);
        ValidateManifestFiles(manifest, "headerFiles", ".h", generatedDir, result);
        ValidateRequestedSources(request, generatedDir, result);
        result.Manifest["manifestPath"] = resolvedPath;
        result.Manifest["resolvedGeneratedDir"] = generatedDir;
        result.Manifest["resolvedComponentSourcePath"] = componentSource;
        return Complete(result);
    }

    private static AscetTestExportManifestValidation Complete(AscetTestExportManifestValidation result)
    {
        result.IsValid = result.Errors.Count == 0;
        return result;
    }

    private static void ValidateRequestedSources(Dictionary<string, object> request, string generatedDir, AscetTestExportManifestValidation result)
    {
        IList values = AscetTestContracts.GetValue(request, "generatedCSources") as IList;
        if (values == null) return;
        for (int index = 0; index < values.Count; index++)
        {
            string source = Convert.ToString(values[index]);
            string resolved = AscetTestContracts.ResolvePath(source, Directory.GetCurrentDirectory());
            if (!File.Exists(resolved)) AddError(result, "generatedCSources", "generated_c_source_missing", "Requested generated C source is missing: " + resolved);
            else if (!IsWithin(resolved, generatedDir)) AddError(result, "generatedCSources", "generated_c_source_outside_manifest", "Requested generated C source is outside generatedDir: " + resolved);
        }
    }

    private static void ValidateManifestFiles(Dictionary<string, object> manifest, string key, string extension, string generatedDir, AscetTestExportManifestValidation result)
    {
        IList values = AscetTestContracts.GetValue(manifest, key) as IList;
        if (values == null) return;
        for (int index = 0; index < values.Count; index++)
        {
            string value = Convert.ToString(values[index]);
            string resolved = AscetTestContracts.ResolvePath(value, generatedDir);
            if (!File.Exists(resolved)) AddError(result, key, "generated_file_missing", "Generated manifest file is missing: " + resolved);
            else if (!String.IsNullOrWhiteSpace(extension) && !resolved.EndsWith(extension, StringComparison.OrdinalIgnoreCase)) AddError(result, key, "generated_file_invalid", "Generated manifest file has an unexpected extension: " + resolved);
            else if (!IsWithin(resolved, generatedDir)) AddError(result, key, "generated_file_outside_manifest", "Generated manifest file is outside generatedDir: " + resolved);
        }
    }

    private static string ResolveManifestPath(Dictionary<string, object> manifest, string key, string baseDirectory)
    {
        string value = AscetTestContracts.GetString(manifest, key);
        return String.IsNullOrWhiteSpace(value) ? String.Empty : AscetTestContracts.ResolvePath(value, baseDirectory);
    }

    private static bool IsWithin(string path, string directory)
    {
        if (String.IsNullOrWhiteSpace(path) || String.IsNullOrWhiteSpace(directory)) return false;
        try
        {
            string root = System.IO.Path.GetFullPath(directory).TrimEnd('\\', '/') + System.IO.Path.DirectorySeparatorChar;
            string candidate = System.IO.Path.GetFullPath(path);
            return candidate.StartsWith(root, StringComparison.OrdinalIgnoreCase);
        }
        catch { return false; }
    }

    private static void RequireString(Dictionary<string, object> source, AscetTestExportManifestValidation result, string key, string expected, string code, string message)
    {
        if (!String.Equals(AscetTestContracts.GetString(source, key), expected, StringComparison.OrdinalIgnoreCase)) AddError(result, key, code, message);
    }

    private static void AddError(AscetTestExportManifestValidation result, string path, string code, string message)
    {
        result.Errors.Add(Issue(path, code, message));
    }

    private static string Normalize(string value) { return (value ?? String.Empty).Replace('/', '\\').Trim(); }
    private static string FirstNonEmpty(params string[] values)
    {
        for (int index = 0; index < values.Length; index++) if (!String.IsNullOrWhiteSpace(values[index])) return values[index];
        return String.Empty;
    }
    private static AscetTestValidationIssue Issue(string path, string code, string message) { return new AscetTestValidationIssue { Path = path, Code = code, Message = message }; }
}
