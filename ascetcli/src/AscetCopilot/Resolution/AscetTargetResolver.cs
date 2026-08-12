using System;
using System.Collections.Generic;
using System.Reflection;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public sealed class AscetTargetRequest
{
    public string Path { get; set; }
    public string Oid { get; set; }
    public string ExpectedKind { get; set; }
}

public sealed class AscetTargetCandidate
{
    public object NativeItem { get; set; }
    public string CanonicalPath { get; set; }
    public string TargetOid { get; set; }
    public string TargetKind { get; set; }
    public string OwnerPath { get; set; }
    public string OwnerOid { get; set; }
    public string ReferenceOid { get; set; }
}

public sealed class AscetResolvedTarget
{
    public object NativeItem { get; set; }
    public string RequestedPath { get; set; }
    public string CanonicalPath { get; set; }
    public string TargetOid { get; set; }
    public string TargetKind { get; set; }
    public string OwnerPath { get; set; }
    public string OwnerOid { get; set; }
    public string ReferenceOid { get; set; }
    public string ResolutionKind { get; set; }
    public IList<string> AliasPaths { get; set; }
}

public interface IAscetTargetResolutionBackend
{
    AscetTargetCandidate ResolveDatabasePath(string path);
    AscetTargetCandidate ResolveProjectChild(string projectPath, string childName);
    AscetTargetCandidate ResolveOid(string oid);
}

public sealed class AscetTargetResolver
{
    private readonly IAscetTargetResolutionBackend backend;

    public AscetTargetResolver(IAscetTargetResolutionBackend backend)
    {
        if (backend == null) throw new ArgumentNullException("backend");
        this.backend = backend;
    }

    public AscetResolvedTarget Resolve(AscetTargetRequest request)
    {
        if (request == null) throw new AscetReadException("invalid_target", "resolve_target", "Target request must not be null.");
        string requestedPath = NormalizePath(request.Path);
        string requestedOid = NormalizeToken(request.Oid);
        if (String.IsNullOrWhiteSpace(requestedPath) && String.IsNullOrWhiteSpace(requestedOid))
            throw new AscetReadException("invalid_target", "resolve_target", "A target path or OID is required.");

        string resolutionKind = "oid";
        AscetTargetCandidate byPath = null;
        if (!String.IsNullOrWhiteSpace(requestedPath))
        {
            int separator = requestedPath.LastIndexOf("::", StringComparison.Ordinal);
            if (separator >= 0)
            {
                string projectPath = requestedPath.Substring(0, separator);
                string childName = requestedPath.Substring(separator + 2);
                if (String.IsNullOrWhiteSpace(projectPath) || String.IsNullOrWhiteSpace(childName))
                    throw new AscetReadException("invalid_project_child_path", "resolve_target", "Project child path must contain both Project path and child name.");
                byPath = backend.ResolveProjectChild(projectPath, childName);
                resolutionKind = "project_reference";
            }
            else
            {
                byPath = backend.ResolveDatabasePath(requestedPath);
                resolutionKind = "database_path";
            }
        }

        AscetTargetCandidate byOid = String.IsNullOrWhiteSpace(requestedOid) ? null : backend.ResolveOid(requestedOid);
        AscetTargetCandidate candidate = byPath ?? byOid;
        if (candidate == null)
            throw new AscetReadException("target_not_found", "resolve_target", "ASCET target could not be resolved.");

        RequireStableIdentity(candidate);
        if (byPath != null && byOid != null && !String.Equals(byPath.TargetOid, byOid.TargetOid, StringComparison.Ordinal))
            throw new AscetReadException("target_identity_mismatch", "resolve_target", "Target path and OID resolve to different ASCET objects.");
        if (!String.IsNullOrWhiteSpace(request.ExpectedKind) &&
            !String.Equals(NormalizeKind(request.ExpectedKind), NormalizeKind(candidate.TargetKind), StringComparison.OrdinalIgnoreCase))
            throw new AscetReadException("unsupported_target_kind", "resolve_target", "Resolved target kind '" + candidate.TargetKind + "' does not match expected kind '" + request.ExpectedKind + "'.");

        List<string> aliases = new List<string>();
        AddAlias(aliases, requestedPath);
        AddAlias(aliases, candidate.CanonicalPath);
        AddAlias(aliases, candidate.OwnerPath);
        return new AscetResolvedTarget
        {
            NativeItem = candidate.NativeItem,
            RequestedPath = requestedPath,
            CanonicalPath = candidate.CanonicalPath ?? String.Empty,
            TargetOid = candidate.TargetOid,
            TargetKind = candidate.TargetKind ?? String.Empty,
            OwnerPath = candidate.OwnerPath ?? candidate.CanonicalPath ?? String.Empty,
            OwnerOid = candidate.OwnerOid ?? candidate.TargetOid,
            ReferenceOid = candidate.ReferenceOid ?? String.Empty,
            ResolutionKind = resolutionKind,
            AliasPaths = aliases
        };
    }

    private static void RequireStableIdentity(AscetTargetCandidate candidate)
    {
        if (candidate == null || String.IsNullOrWhiteSpace(candidate.TargetOid))
            throw new AscetReadException("target_identity_unavailable", "resolve_target", "Resolved target does not expose a stable OID.");
    }

    private static string NormalizePath(string value)
    {
        string normalized = (value ?? String.Empty).Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal)) normalized = normalized.Substring(1);
        return normalized;
    }

    private static string NormalizeToken(string value)
    {
        return String.IsNullOrWhiteSpace(value) ? String.Empty : value.Trim();
    }

    private static string NormalizeKind(string value)
    {
        string normalized = NormalizeToken(value).ToLowerInvariant();
        return normalized.EndsWith("component", StringComparison.Ordinal) ? normalized.Substring(0, normalized.Length - "component".Length) : normalized;
    }

    private static void AddAlias(IList<string> aliases, string value)
    {
        if (aliases == null || String.IsNullOrWhiteSpace(value)) return;
        for (int i = 0; i < aliases.Count; i++) if (String.Equals(aliases[i], value, StringComparison.OrdinalIgnoreCase)) return;
        aliases.Add(value);
    }
}

public sealed class ToolApiAscetTargetResolutionBackend : IAscetTargetResolutionBackend
{
    private readonly AscetDataBase database;

    public ToolApiAscetTargetResolutionBackend(AscetDataBase database)
    {
        if (database == null) throw new ArgumentNullException("database");
        this.database = database;
    }

    public AscetTargetCandidate ResolveDatabasePath(string path)
    {
        AscetItemPath parsed = AscetItemPath.Parse(path);
        DataBaseItem item = database.GetItemInFolder(parsed.ItemName, parsed.FolderPath ?? String.Empty);
        if (item == null)
        {
            try
            {
                item = AscetGetService.ResolveFolder(database, path) as DataBaseItem;
            }
            catch (AscetReadException error)
            {
                if (!String.Equals(error.Code, "folder_not_found", StringComparison.Ordinal)) throw;
            }
        }
        if (item == null) throw new AscetReadException("target_not_found", "resolve_target", "No ASCET item was found at '" + path + "'.");
        return Candidate(item, null, null);
    }

    public AscetTargetCandidate ResolveProjectChild(string projectPath, string childName)
    {
        AscetTargetCandidate projectCandidate = ResolveDatabasePath(projectPath);
        AscetProject project = projectCandidate.NativeItem as AscetProject;
        if (project == null) throw new AscetReadException("invalid_project_child_path", "resolve_target", "Path before '::' is not an ASCET Project.");
        object reference = InvokeOptional(project, "GetModule", childName);
        if (reference == null) throw new AscetReadException("target_not_found", "resolve_target", "Project child '" + childName + "' was not found.");
        object represented = InvokeOptional(reference, "GetRepresentedClass");
        DataBaseItem item = represented as DataBaseItem;
        if (item == null) throw new AscetReadException("represented_component_missing", "resolve_target", "Project child '" + childName + "' has no represented Component.");
        return Candidate(item, GetOid(reference), projectCandidate.CanonicalPath);
    }

    public AscetTargetCandidate ResolveOid(string oid)
    {
        MethodInfo method = database.GetType().GetMethod("GetItemForOID", new Type[] { typeof(string) });
        DataBaseItem item = method == null ? null : method.Invoke(database, new object[] { oid }) as DataBaseItem;
        if (item == null) throw new AscetReadException("target_not_found", "resolve_target", "No ASCET item was found for OID '" + oid + "'.");
        return Candidate(item, null, null);
    }

    private static AscetTargetCandidate Candidate(DataBaseItem item, string referenceOid, string projectPath)
    {
        string oid = GetOid(item);
        string canonicalPath = GetString(item, new string[] { "GetNameWithPath", "GetPath", "GetName" });
        return new AscetTargetCandidate
        {
            NativeItem = item,
            CanonicalPath = canonicalPath,
            TargetOid = oid,
            TargetKind = item == null ? String.Empty : item.GetType().Name,
            OwnerPath = canonicalPath,
            OwnerOid = oid,
            ReferenceOid = referenceOid ?? String.Empty
        };
    }

    private static object InvokeOptional(object target, string methodName, params object[] arguments)
    {
        if (target == null) return null;
        MethodInfo[] methods = target.GetType().GetMethods(BindingFlags.Public | BindingFlags.Instance);
        for (int i = 0; i < methods.Length; i++)
        {
            if (!String.Equals(methods[i].Name, methodName, StringComparison.Ordinal) || methods[i].GetParameters().Length != arguments.Length) continue;
            return methods[i].Invoke(target, arguments);
        }
        return null;
    }

    private static string GetOid(object target)
    {
        return GetString(target, new string[] { "GetOID", "GetOid", "GetObjectOID", "GetObjectId" });
    }

    private static string GetString(object target, string[] methodNames)
    {
        if (target == null || methodNames == null) return String.Empty;
        for (int i = 0; i < methodNames.Length; i++)
        {
            object value = InvokeOptional(target, methodNames[i]);
            string text = value == null ? String.Empty : Convert.ToString(value);
            if (!String.IsNullOrWhiteSpace(text)) return text;
        }
        return String.Empty;
    }
}