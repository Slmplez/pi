using System;
using System.Collections.Generic;

public static class AscetTargetResolverContractTest
{
    public static int Main()
    {
        TestDatabasePathAndOidResolveSameTarget();
        TestProjectChildPreservesAliasAndOwner();
        TestGetTreeUsesSharedProjectChildResolution();
        TestMismatchedPathAndOidAreRejected();
        TestMissingStableIdentityIsRejected();
        Console.WriteLine("AscetTargetResolverContractTest passed.");
        return 0;
    }

    private static void TestDatabasePathAndOidResolveSameTarget()
    {
        FakeBackend backend = new FakeBackend();
        backend.Paths["Package\\C"] = Candidate("Package\\C", "oid-c", "Class");
        backend.Oids["oid-c"] = backend.Paths["Package\\C"];
        AscetResolvedTarget result = new AscetTargetResolver(backend).Resolve(new AscetTargetRequest { Path = "Package/C", Oid = "oid-c" });
        Equal("oid-c", result.TargetOid, "path and OID should resolve one target");
        Equal("database_path", result.ResolutionKind, "database path resolution kind");
        Equal(1, result.AliasPaths.Count, "normalized requested/canonical path should deduplicate");
    }

    private static void TestProjectChildPreservesAliasAndOwner()
    {
        FakeBackend backend = new FakeBackend();
        backend.ProjectChildren["Projects\\P::CM_AVH"] = new AscetTargetCandidate
        {
            NativeItem = new object(),
            CanonicalPath = "PlatformLibrary\\Package\\CM_AVH",
            TargetOid = "shared-oid",
            TargetKind = "Module",
            OwnerPath = "PlatformLibrary\\Package\\CM_AVH",
            OwnerOid = "shared-oid",
            ReferenceOid = "project-reference-oid"
        };
        AscetResolvedTarget result = new AscetTargetResolver(backend).Resolve(new AscetTargetRequest { Path = "Projects\\P::CM_AVH" });
        Equal("project_reference", result.ResolutionKind, "project child resolution kind");
        Equal("shared-oid", result.TargetOid, "represented component OID");
        Equal("project-reference-oid", result.ReferenceOid, "project reference OID");
        Equal(2, result.AliasPaths.Count, "project and package aliases");
    }

    private static void TestGetTreeUsesSharedProjectChildResolution()
    {
        FakeBackend backend = new FakeBackend();
        AscetTargetCandidate representedComponent = new AscetTargetCandidate
        {
            NativeItem = new object(),
            CanonicalPath = "PlatformLibrary\\Package\\CM_AVH",
            TargetOid = "shared-oid",
            TargetKind = "Module",
            OwnerPath = "PlatformLibrary\\Package\\CM_AVH",
            OwnerOid = "shared-oid",
            ReferenceOid = "project-reference-oid"
        };
        backend.ProjectChildren["Projects\\P::CM_AVH"] = representedComponent;
        backend.Oids["shared-oid"] = representedComponent;

        AscetResolvedTarget result = AscetGetService.ResolveTreeTarget(
            new AscetGetRequest { Path = "Projects\\P::CM_AVH", Oid = "shared-oid", Depth = 0 },
            backend);

        Equal("shared-oid", result.TargetOid, "get_tree represented Component OID");
        Equal("Projects\\P::CM_AVH", result.RequestedPath, "get_tree requested alias");
        Equal("project_reference", result.ResolutionKind, "get_tree Project child resolution kind");
    }
    private static void TestMismatchedPathAndOidAreRejected()
    {
        FakeBackend backend = new FakeBackend();
        backend.Paths["Package\\C"] = Candidate("Package\\C", "oid-c", "Class");
        backend.Oids["oid-other"] = Candidate("Package\\Other", "oid-other", "Class");
        ExpectCode("target_identity_mismatch", delegate
        {
            new AscetTargetResolver(backend).Resolve(new AscetTargetRequest { Path = "Package\\C", Oid = "oid-other" });
        });
    }

    private static void TestMissingStableIdentityIsRejected()
    {
        FakeBackend backend = new FakeBackend();
        backend.Paths["Package\\C"] = Candidate("Package\\C", String.Empty, "Class");
        ExpectCode("target_identity_unavailable", delegate
        {
            new AscetTargetResolver(backend).Resolve(new AscetTargetRequest { Path = "Package\\C" });
        });
    }

    private static AscetTargetCandidate Candidate(string path, string oid, string kind)
    {
        return new AscetTargetCandidate
        {
            NativeItem = new object(),
            CanonicalPath = path,
            TargetOid = oid,
            TargetKind = kind,
            OwnerPath = path,
            OwnerOid = oid
        };
    }

    private static void ExpectCode(string code, Action action)
    {
        try { action(); }
        catch (AscetReadException error)
        {
            Equal(code, error.Code, "structured error code");
            return;
        }
        throw new InvalidOperationException("Expected AscetReadException code " + code + ".");
    }

    private static void Equal(object expected, object actual, string message)
    {
        if (!Object.Equals(expected, actual)) throw new InvalidOperationException(message + ": expected=" + expected + ", actual=" + actual);
    }

    private sealed class FakeBackend : IAscetTargetResolutionBackend
    {
        public readonly IDictionary<string, AscetTargetCandidate> Paths = new Dictionary<string, AscetTargetCandidate>(StringComparer.Ordinal);
        public readonly IDictionary<string, AscetTargetCandidate> Oids = new Dictionary<string, AscetTargetCandidate>(StringComparer.Ordinal);
        public readonly IDictionary<string, AscetTargetCandidate> ProjectChildren = new Dictionary<string, AscetTargetCandidate>(StringComparer.Ordinal);

        public AscetTargetCandidate ResolveDatabasePath(string path)
        {
            AscetTargetCandidate value;
            if (Paths.TryGetValue(path, out value)) return value;
            throw new AscetReadException("target_not_found", "resolve_target", "Missing path " + path + ".");
        }

        public AscetTargetCandidate ResolveProjectChild(string projectPath, string childName)
        {
            AscetTargetCandidate value;
            if (ProjectChildren.TryGetValue(projectPath + "::" + childName, out value)) return value;
            throw new AscetReadException("target_not_found", "resolve_target", "Missing Project child.");
        }

        public AscetTargetCandidate ResolveOid(string oid)
        {
            AscetTargetCandidate value;
            if (Oids.TryGetValue(oid, out value)) return value;
            throw new AscetReadException("target_not_found", "resolve_target", "Missing OID " + oid + ".");
        }
    }
}