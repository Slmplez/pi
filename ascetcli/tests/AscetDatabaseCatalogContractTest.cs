using System;
using System.Collections.Generic;
using System.IO;

public static class AscetDatabaseCatalogContractTest
{
    public static int Main()
    {
        try
        {
            string identityRoot = Path.Combine(Path.GetTempPath(), "ascet-identity-" + Guid.NewGuid().ToString("N"));
            string firstContainer = Path.Combine(identityRoot, "first", "Db");
            string firstDatabase = Path.Combine(firstContainer, "AscetDb_1");
            string secondContainer = Path.Combine(identityRoot, "second", "Db");
            Directory.CreateDirectory(firstDatabase);
            Directory.CreateDirectory(secondContainer);
            try
            {
                AscetDatabaseRef consistentIdentity = AscetDatabaseIdentityResolver.Resolve(firstDatabase, firstContainer);
                AssertEqual("consistent", consistentIdentity.IdentityStatus, "full database name within reported path");
                AssertEqual(Path.GetFullPath(firstDatabase).TrimEnd('\\'), consistentIdentity.CanonicalPath, "canonical database path");
                AssertEqual(0, consistentIdentity.IdentityIssues.Count, "consistent database identity issues");

                AscetDatabaseRef mismatchedIdentity = AscetDatabaseIdentityResolver.Resolve(firstDatabase, secondContainer);
                AssertEqual("inconsistent", mismatchedIdentity.IdentityStatus, "database name/path mismatch status");
                AssertTrue(mismatchedIdentity.IdentityIssues.Contains("database_name_path_mismatch"), "database mismatch issue");
                AssertEqual(Path.GetFullPath(firstDatabase).TrimEnd('\\'), mismatchedIdentity.CanonicalPath, "mismatch preserves current handle path");

                AscetDatabaseRef shortNameIdentity = AscetDatabaseIdentityResolver.Resolve("AscetDb_1", firstContainer);
                AssertEqual("consistent", shortNameIdentity.IdentityStatus, "short database name resolution");
                AssertEqual(Path.GetFullPath(firstDatabase).TrimEnd('\\'), shortNameIdentity.CanonicalPath, "short database canonical path");
            }
            finally
            {
                if (Directory.Exists(identityRoot)) Directory.Delete(identityRoot, true);
            }

            IList<DatabaseCatalogIdentity> identities = DatabaseCatalogContract.DeduplicateIdentities(
                new DatabaseCatalogIdentity[]
                {
                    new DatabaseCatalogIdentity { Path = "Project::Module", Oid = "module-1" },
                    new DatabaseCatalogIdentity { Path = "Library\\Module", Oid = "module-1" },
                    new DatabaseCatalogIdentity { Path = "Library\\Other", Oid = "module-2" }
                });
            AssertEqual(2, identities.Count, "OID deduplication");
            AssertEqual("Library\\Module", identities[0].Path, "canonical Module path preference");

            Dictionary<string, object> requestPayload = new Dictionary<string, object>(StringComparer.Ordinal);
            requestPayload["scanParameterClasses"] = true;
            requestPayload["scanParameterEnumerationUsage"] = true;
            requestPayload["scanMessages"] = true;
            requestPayload["scanMessageEnumerationUsage"] = true;
            requestPayload["messageDepth"] = 0;
            requestPayload["projects"] = new object[]
            {
                new Dictionary<string, object> { { "path", "DB\\Project" }, { "oid", "project-1" } },
                new Dictionary<string, object> { { "path", "DB\\ProjectAlias" }, { "oid", "project-1" } }
            };
            requestPayload["modules"] = new object[]
            {
                new Dictionary<string, object> { { "path", "DB\\Module" }, { "oid", "module-1" } },
                new Dictionary<string, object> { { "path", "DB\\ModuleAlias" }, { "oid", "module-1" } }
            };
            requestPayload["classCandidates"] = new object[]
            {
                new Dictionary<string, object> { { "path", "DB\\Parameter\\Class" }, { "oid", "class-1" } },
                new Dictionary<string, object> { { "path", "DB\\Parameter\\ClassAlias" }, { "oid", "class-1" } }
            };
            DatabaseCatalogLiveRequest parsedRequest = DatabaseCatalogService.ParseRequest(requestPayload);
            AssertTrue(parsedRequest.ScanParameterClasses, "request Parameter scan flag");
            AssertTrue(parsedRequest.ScanParameterEnumerationUsage, "request Parameter Enumeration scan flag");
            AssertTrue(parsedRequest.ScanMessages, "request Message scan flag");
            AssertTrue(parsedRequest.ScanMessageEnumerationUsage, "request Message Enumeration scan flag");
            AssertEqual(1, parsedRequest.Projects.Count, "request Project OID deduplication");
            AssertEqual(1, parsedRequest.Modules.Count, "request Module OID deduplication");
            AssertEqual(1, parsedRequest.ClassCandidates.Count, "request Class OID deduplication");

            Dictionary<string, object> databaseTreePayload = new Dictionary<string, object>(StringComparer.Ordinal);
            databaseTreePayload["scope"] = "database";
            AscetGetRequest databaseTreeRequest = AscetGetService.ParseRequest(databaseTreePayload, "get_tree");
            AssertEqual("database", databaseTreeRequest.ScopeKind, "database Tree scope");
            AssertEqual(0, databaseTreeRequest.MaxFolders, "database Tree folder budget");
            AssertEqual(0, databaseTreeRequest.MaxComponents, "database Tree component budget");

            AscetGetRequest databaseIdentityRequest = AscetGetService.ParseRequest(
                new Dictionary<string, object>(StringComparer.Ordinal),
                "get_database_identity");
            AssertEqual("database", databaseIdentityRequest.ScopeKind, "database identity scope");

            Dictionary<string, object> invalidDatabaseIdentityPayload = new Dictionary<string, object>(StringComparer.Ordinal);
            invalidDatabaseIdentityPayload["depth"] = 1;
            AssertReadError(
                delegate { AscetGetService.ParseRequest(invalidDatabaseIdentityPayload, "get_database_identity"); },
                "invalid_argument",
                "database identity rejects request fields");

            Dictionary<string, object> invalidScopedElementsPayload = new Dictionary<string, object>(StringComparer.Ordinal);
            invalidScopedElementsPayload["scope"] = "database";
            AssertReadError(
                delegate { AscetGetService.ParseRequest(invalidScopedElementsPayload, "get_elements"); },
                "invalid_scope",
                "scope is restricted to get_tree");

            Dictionary<string, object> depthBoundedDatabaseTreePayload = new Dictionary<string, object>(StringComparer.Ordinal);
            depthBoundedDatabaseTreePayload["scope"] = "database";
            depthBoundedDatabaseTreePayload["depth"] = 1;
            AssertReadError(
                delegate { AscetGetService.ParseRequest(depthBoundedDatabaseTreePayload, "get_tree"); },
                "invalid_scope",
                "database Tree rejects explicit default depth");

            Dictionary<string, object> boundedDatabaseTreePayload = new Dictionary<string, object>(StringComparer.Ordinal);
            boundedDatabaseTreePayload["scope"] = "database";
            boundedDatabaseTreePayload["targetPathPrefix"] = "DB\\Project";
            AssertReadError(
                delegate { AscetGetService.ParseRequest(boundedDatabaseTreePayload, "get_tree"); },
                "invalid_scope",
                "database Tree rejects bounded target");

            AscetDatabaseRef databaseRef = new AscetDatabaseRef { Name = "DB", Path = "C:\\Repo\\DB" };
            List<Dictionary<string, object>> completeItems = new List<Dictionary<string, object>>
            {
                new Dictionary<string, object> { { "path", "DB" }, { "oid", "folder-1" }, { "kind", "folder" } },
                new Dictionary<string, object> { { "path", "DB\\Project" }, { "oid", "project-1" }, { "kind", "project" } },
                new Dictionary<string, object> { { "path", "DB\\Enumeration" }, { "oid", "enum-1" }, { "kind", "enumeration" } }
            };
            AscetGetTraversalState completeState = new AscetGetTraversalState
            {
                RootCollectionStarted = true,
                RootCollectionAvailable = true,
                RootCollectionCompleted = true,
                ProjectCollectionCompleted = true,
                FolderCollectionCompleted = true,
                ComponentCollectionCompleted = true,
                EnumerationCollectionCompleted = true
            };
            Dictionary<string, object> completeCoverage = AscetGetService.BuildCoverage(
                "get_tree",
                databaseTreeRequest,
                completeState,
                databaseRef,
                completeItems);
            AssertEqual("complete_for_scope", completeCoverage["status"] as string, "complete database Tree coverage status");
            AssertEqual("complete", completeCoverage["completeness"] as string, "complete database Tree completeness");

            AscetGetTraversalState incompleteProjectState = new AscetGetTraversalState
            {
                RootCollectionStarted = true,
                RootCollectionAvailable = true,
                RootCollectionCompleted = true,
                ProjectCollectionCompleted = false,
                FolderCollectionCompleted = true,
                ComponentCollectionCompleted = true,
                EnumerationCollectionCompleted = true
            };
            Dictionary<string, object> incompleteProjectCoverage = AscetGetService.BuildCoverage(
                "get_tree",
                databaseTreeRequest,
                incompleteProjectState,
                databaseRef,
                completeItems);
            AssertEqual("partial", incompleteProjectCoverage["status"] as string, "incomplete Project collector coverage status");
            Dictionary<string, object> incompleteCollectors = incompleteProjectCoverage["collectors"] as Dictionary<string, object>;
            Dictionary<string, object> incompleteProjectCollector = incompleteCollectors["projects"] as Dictionary<string, object>;
            AssertEqual(false, (bool)incompleteProjectCollector["completed"], "incomplete Project collector proof");

            AscetGetTraversalState unavailableRootState = new AscetGetTraversalState { RootCollectionStarted = true };
            unavailableRootState.RecordCollectionError("root_collection_unavailable");
            Dictionary<string, object> unavailableRootCoverage = AscetGetService.BuildCoverage(
                "get_tree",
                databaseTreeRequest,
                unavailableRootState,
                databaseRef,
                new List<Dictionary<string, object>>());
            AssertEqual("failed", unavailableRootCoverage["status"] as string, "null root collection coverage status");
            AssertEqual("failed", unavailableRootCoverage["completeness"] as string, "null root collection completeness");

            AscetGetTraversalState partialState = new AscetGetTraversalState
            {
                RootCollectionStarted = true,
                RootCollectionAvailable = true,
                RootCollectionCompleted = false
            };
            partialState.RecordCollectionError("folder_items_unavailable:DB");
            Dictionary<string, object> partialCoverage = AscetGetService.BuildCoverage(
                "get_tree",
                databaseTreeRequest,
                partialState,
                databaseRef,
                completeItems);
            AssertEqual("partial", partialCoverage["status"] as string, "collector failure coverage status");
            AssertEqual("partial", partialCoverage["completeness"] as string, "collector failure completeness");

            AscetGetTraversalState emptyRootState = new AscetGetTraversalState
            {
                RootCollectionStarted = true,
                RootCollectionAvailable = true,
                RootCollectionEmpty = true
            };
            emptyRootState.RecordCollectionError("root_collection_empty");
            Dictionary<string, object> emptyRootCoverage = AscetGetService.BuildCoverage(
                "get_tree",
                databaseTreeRequest,
                emptyRootState,
                databaseRef,
                new List<Dictionary<string, object>>());
            AssertEqual("failed", emptyRootCoverage["status"] as string, "empty root collection coverage status");

            AssertEqual("send_message", DatabaseCatalogContract.NormalizeMessageKind(true, false, false), "send kind");
            AssertEqual("receive_message", DatabaseCatalogContract.NormalizeMessageKind(false, true, false), "receive kind");
            AssertEqual("send_receive_message", DatabaseCatalogContract.NormalizeMessageKind(true, true, true), "send/receive kind priority");

            string first = DatabaseCatalogContract.BuildFallbackMessageId("ab", "c", "send_message");
            string second = DatabaseCatalogContract.BuildFallbackMessageId("a", "bc", "send_message");
            AssertTrue(!String.Equals(first, second, StringComparison.Ordinal), "fallback message identity separators");
            AssertEqual(first, DatabaseCatalogContract.BuildFallbackMessageId("ab", "c", "send_message"), "fallback message identity stability");

            AssertTrue(!DatabaseCatalogContract.IsVerifiedParameterClass(0, 0, 0, 0, 0), "Methods=0 alone must be rejected");
            AssertTrue(!DatabaseCatalogContract.IsVerifiedParameterClass(1, 1, 0, 1, 0), "classes with methods must be rejected");
            AssertTrue(DatabaseCatalogContract.IsVerifiedParameterClass(0, 1, 0, 1, 0), "direct Parameter evidence");
            AssertTrue(DatabaseCatalogContract.IsVerifiedParameterClass(0, 0, 0, 0, 1), "verified child evidence");

            OperationDescriptor descriptor = OperationRegistry.ResolveOrThrow("get_database_catalog");
            AssertEqual("pooled_read", descriptor.LaneId, "operation lane");
            AssertTrue(!descriptor.HostEligible, "operation must force one-shot execution");
            AssertTrue(!descriptor.SupportsBatch, "operation must not expose batch routing");
            AssertEqual("expensive_scan", descriptor.ExecutionProfile.HostSafety, "operation execution profile");

            OperationDescriptor identityDescriptor = OperationRegistry.ResolveOrThrow("get_database_identity");
            AssertEqual("pooled_read", identityDescriptor.LaneId, "database identity operation lane");
            AssertTrue(identityDescriptor.HostEligible, "database identity operation is host eligible");
            AssertTrue(!identityDescriptor.MutatesDatabase, "database identity operation is read only");

            HashSet<string> edgeKeys = new HashSet<string>(StringComparer.Ordinal);
            AssertTrue(edgeKeys.Add(DatabaseCatalogContract.EdgeKey("parent", "child")), "first edge accepted");
            AssertTrue(!edgeKeys.Add(DatabaseCatalogContract.EdgeKey("parent", "child")), "duplicate edge rejected");

            Console.WriteLine("AscetDatabaseCatalogContractTest passed");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.ToString());
            return 1;
        }
    }


    private static void AssertReadError(Action action, string expectedCode, string label)
    {
        try
        {
            action();
        }
        catch (AscetReadException ex)
        {
            AssertEqual(expectedCode, ex.Code, label);
            return;
        }
        throw new InvalidOperationException("Assertion failed: " + label + "; expected AscetReadException");
    }

    private static void AssertTrue(bool condition, string label)
    {
        if (!condition) throw new InvalidOperationException("Assertion failed: " + label);
    }

    private static void AssertEqual<T>(T expected, T actual, string label)
    {
        if (!EqualityComparer<T>.Default.Equals(expected, actual))
        {
            throw new InvalidOperationException("Assertion failed: " + label + "; expected=" + expected + "; actual=" + actual);
        }
    }
}
