using System;
using System.Collections.Generic;

public static class AscetDatabaseCatalogContractTest
{
    public static int Main()
    {
        try
        {
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
