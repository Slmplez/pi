using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Web.Script.Serialization;

public static class AscetCliJsonOutputTest
{
    private static readonly JavaScriptSerializer Serializer = new JavaScriptSerializer();

    public static int Main()
    {
        try
        {
            TestAscetCliExecutableExists();
            TestFolderKindParseAndSchema();
            TestComponentClassifierRecognizesFolderDatabaseItems();
            TestListFoldersJsonIncludesNavigationMetadata();
            TestFolderReadServiceReusesListComponentsFolderEnumeration();
            TestListFoldersExecutableUsesFolderReadService();
            TestTopLevelListFoldersJsonUsesWorkspaceOwnerKind();
            TestCreateFolderJsonIncludesCreationSummary();
            TestCreateComponentIfExistsPolicyParsing();
            TestCreateComponentExpectedDefaultScaffold();
            TestDeleteFolderSupportsTopLevelFolderRemoval();
            TestListComponentsJsonIncludesNavigationMetadata();
            TestListComponentsAcceptsDatabaseRootFolderPath();
            TestListComponentsFolderKindIncludesFolders();
            TestListComponentsAllKindKeepsUnknownCandidates();
            TestListComponentsRecursiveFilteringIsLimitAware();
            TestResolveComponentJsonIncludesNavigationMetadata();
            TestResolveComponentKeepsUnknownCandidates();
            TestResolveComponentParsesAndExposesMatchMode();
            TestSearchCommandsRejectBlankQueries();
            TestSearchComponentsMatchesPathSeparatorsConsistently();
            TestResolveComponentBuildReadRequestUsesRecursiveScope();
            TestReadComponentChildrenPayloadIncludesNavigationMetadata();
            TestReadComponentChildrenMethodsGroupDoesNotRequireImplementation();
            TestReadComponentChildrenUsesLightweightDefaultPaths();
            TestReadComponentRefsAvoidsDefaultSnapshotTrace();
            TestReadElementRefsPreflightsImplementationBeforeReferences();
            TestReadComponentUsedByPreflightsTargetComponent();
            TestReadComponentUsedByRejectsBlankScopeArgument();
            TestShowOccurrencesIgnoresRecoverableComponentSearchFailures();
            TestSearchOccurrencesTargetParsingAndPayload();
            TestSearchOccurrencesElementTargetPreservesElementPagingAndCounts();
            TestReadComponentSnapshotJsonCarriesTopLevelMetadata();
            TestWarmSearchIndexComponentsPartitionKeepsProjectsAsObjects();
            TestDiffComponentSnapshotRoutesStateMachineToLightweightDiff();
            TestDiffComponentSnapshotRejectsKindMismatchBeforeChildDiff();
            TestReadTextCodeThrowsMethodNotFoundInSource();
            TestDiffMethodCodeRecognizesNestedMethodNotFound();
            TestDiffMethodCodeRecognizesStructuredMethodNotFound();
            TestReadStateMachineFlowParsesDetailLevel();
            TestReadStateMachineFlowSummaryJsonIsCompact();
            TestReadBlockDiagramJsonDefaultsToSemanticGraph();
            TestReadBlockDiagramSemanticOperationsTraceControlAndDataFlow();
            Console.WriteLine("AscetCliJsonOutputTest passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void TestAscetCliExecutableExists()
    {
        string baseDirectory = AppDomain.CurrentDomain.BaseDirectory;
        string binDirectory = Path.GetFullPath(Path.Combine(baseDirectory, "..", "bin"));
        string exePath = Path.Combine(binDirectory, "AscetCli.exe");
        AssertTrue(File.Exists(exePath), "AscetCli.exe should exist in the ascet-csharp bin output.");
    }

    private static void TestListFoldersJsonIncludesNavigationMetadata()
    {
        AscetListFoldersArguments arguments = new AscetListFoldersArguments
        {
            RootPath = "Workspace\\Lesson8",
            Depth = 1,
            EmitJson = true
        };

        AscetListFolders.FolderTreeNode tree = new AscetListFolders.FolderTreeNode
        {
            Name = "Lesson8",
            Path = "Workspace\\Lesson8",
            Children = new List<AscetListFolders.FolderTreeNode>
            {
                new AscetListFolders.FolderTreeNode
                {
                    Name = "SubFolder",
                    Path = "Workspace\\Lesson8\\SubFolder",
                    Children = new List<AscetListFolders.FolderTreeNode>()
                }
            }
        };

        Dictionary<string, object> payload = DeserializeObject(AscetListFolders.FormatJsonOutput(arguments, tree));
        Dictionary<string, object> folder = GetFirstDictionaryFromList(payload, "folders");

        AssertEqual("Lesson8", GetString(folder, "displayName"), "list_folders should expose item.displayName");
        AssertEqual("Workspace", GetString(folder, "parentPath"), "list_folders should expose item.parentPath");
        AssertEqual("folder", GetString(folder, "ownerKind"), "list_folders should expose item.ownerKind");
        AssertEqual("folder", GetString(folder, "kind"), "list_folders should expose item.kind for folder nodes");
        AssertEqual("container", GetString(folder, "targetKind"), "list_folders should classify folder nodes as containers");
        AssertEqual("folder", GetString(folder, "objectKind"), "list_folders should expose folder objectKind");
    }

    private static void TestCreateComponentIfExistsPolicyParsing()
    {
        AssertFalse(
            AscetCreateComponent.ParseIfExists("fail"),
            "create_component ifExists=fail should reject existing components.");
        AssertTrue(
            AscetCreateComponent.ParseIfExists("return-existing"),
            "create_component ifExists=return-existing should return the existing component.");
    }

    private static void TestCreateComponentExpectedDefaultScaffold()
    {
        AssertExpectedDefaultScaffold(
            BuildCreateComponentResult(AscetComponentKind.Class, AscetLanguageKind.ESDL, true, false),
            "calc",
            new string[] { "method:calc" },
            "ESDL class create_component should expose expected calc scaffold.");
        AssertExpectedDefaultScaffold(
            BuildCreateComponentResult(AscetComponentKind.Module, AscetLanguageKind.ESDL, true, false),
            "process",
            new string[] { "method:process" },
            "ESDL module create_component should expose expected process scaffold.");
        AssertExpectedDefaultScaffold(
            BuildCreateComponentResult(AscetComponentKind.StateMachine, AscetLanguageKind.Unknown, true, false),
            "trigger",
            new string[] { "method:trigger", "variable:sm" },
            "State machine create_component should expose expected trigger and sm scaffold.");
        AssertExpectedDefaultScaffold(
            BuildCreateComponentResult(AscetComponentKind.Class, AscetLanguageKind.ESDL, false, true),
            String.Empty,
            new string[0],
            "Existing create_component result should not expose expected generated items.");
        AssertExpectedDefaultScaffold(
            BuildCreateComponentResult(AscetComponentKind.Class, AscetLanguageKind.BDE, true, false),
            String.Empty,
            new string[0],
            "BDE class create_component should not infer expected scaffold without verified behavior.");
    }

    private static AscetComponentCreateResult BuildCreateComponentResult(
        AscetComponentKind componentKind,
        AscetLanguageKind languageKind,
        bool created,
        bool alreadyExisted)
    {
        return new AscetComponentCreateResult
        {
            ComponentPath = "DEMO\\ScaffoldProbe",
            FolderPath = "DEMO",
            ComponentName = "ScaffoldProbe",
            ComponentKind = componentKind,
            LanguageKind = languageKind,
            Created = created,
            AlreadyExisted = alreadyExisted,
            Summary = "summary"
        };
    }

    private static void AssertExpectedDefaultScaffold(
        AscetComponentCreateResult result,
        string expectedEntryMethod,
        string[] expectedItems,
        string message)
    {
        Dictionary<string, object> payload = DeserializeObject(AscetCreateComponent.FormatJsonOutput(result));
        Dictionary<string, object> scaffold = GetDictionary(payload, "expectedDefaultScaffold");
        AssertTrue(scaffold != null, message + " expectedDefaultScaffold should be present.");
        AssertFalse(GetBool(scaffold, "verified"), message + " expectedDefaultScaffold should be explicitly unverified.");
        AssertEqual(expectedEntryMethod, GetString(scaffold, "defaultEntryMethod"), message);

        IList items = ToList(scaffold.ContainsKey("generatedItems") ? scaffold["generatedItems"] : null);
        int actualCount = items == null ? 0 : items.Count;
        AssertEqual(Convert.ToString(expectedItems.Length), Convert.ToString(actualCount), message + " generated item count should match.");

        for (int i = 0; i < expectedItems.Length; i++)
        {
            Dictionary<string, object> item = items[i] as Dictionary<string, object>;
            AssertTrue(item != null, message + " generated item should be an object.");
            string actual = GetString(item, "kind") + ":" + GetString(item, "name");
            AssertEqual(expectedItems[i], actual, message + " generated item should match.");
        }
    }

    private static void TestFolderKindParseAndSchema()
    {
        AssertEqual("folder", AscetDatabaseExplorerCommon.KindToSchema(AscetComponentKind.Folder), "KindToSchema should serialize folder kind");
        AssertEqual("folder", AscetDatabaseExplorerCommon.KindToOutputSchema(AscetComponentKind.Folder), "KindToOutputSchema should serialize folder kind");
        AssertEqual("folder", AscetDatabaseExplorerCommon.ParseKind("folder").ToString().ToLowerInvariant(), "ParseKind should accept folder");
        AssertEqual("unknown", AscetDatabaseExplorerCommon.ParseKind("all").ToString().ToLowerInvariant(), "ParseKind should treat all as no kind filter");
        AssertEqual("all", AscetDatabaseExplorerCommon.KindToFilterSchema(AscetComponentKind.Unknown), "KindToFilterSchema should expose Unknown filters as all/no-filter");
    }

    private static void TestComponentClassifierRecognizesFolderDatabaseItems()
    {
        string sourcePath = FindPathUpwards("src", "ascetcli", "src", "AscetCopilot", "AscetReadDomain.cs");
        string source = File.ReadAllText(sourcePath);
        int methodStart = source.IndexOf("public AscetComponentKind GetComponentKind(DataBaseItem item)", StringComparison.Ordinal);
        int nextMethodStart = source.IndexOf("public AscetLanguageKind GetLanguageKind(DataBaseItem item)", StringComparison.Ordinal);
        AssertTrue(methodStart >= 0 && nextMethodStart > methodStart, "ComponentClassifier.GetComponentKind source block should be discoverable.");

        string methodSource = source.Substring(methodStart, nextMethodStart - methodStart);
        int folderProbeIndex = methodSource.IndexOf("item is AscetFolder", StringComparison.Ordinal);
        int folderTypeIndex = methodSource.IndexOf("HasTypeName(item, \"Folder\")", StringComparison.Ordinal);
        int containerIndex = methodSource.IndexOf("SafeGetBool(item, \"IsContainer\")", StringComparison.Ordinal);

        AssertTrue(
            folderProbeIndex >= 0,
            "ComponentClassifier should probe AscetFolder DataBaseItems before falling back to unknown.");
        AssertTrue(
            folderTypeIndex >= 0,
            "ComponentClassifier should recognize folder-like DataBaseItems by runtime type name.");
        AssertTrue(
            containerIndex > folderTypeIndex,
            "ComponentClassifier should classify folders before generic containers.");
    }

    private static void TestFolderReadServiceReusesListComponentsFolderEnumeration()
    {
        string sourcePath = FindPathUpwards("src", "ascetcli", "src", "AscetCopilot", "Services", "Read", "FolderReadService.cs");
        string source = File.ReadAllText(sourcePath);

        AssertTrue(
            source.IndexOf("new ComponentReadService()", StringComparison.Ordinal) >= 0,
            "FolderReadService should reuse ComponentReadService so list_folders browse matches list_components folder discovery.");
        AssertTrue(
            source.IndexOf("ComponentReadRequest componentRequest", StringComparison.Ordinal) >= 0,
            "FolderReadService should construct a ComponentReadRequest for folder discovery.");
        AssertTrue(
            source.IndexOf("componentRequest.Kind = AscetComponentKind.Unknown", StringComparison.Ordinal) >= 0,
            "FolderReadService should reuse list_components browse semantics before validating folder candidates.");
        AssertTrue(
            source.IndexOf("componentRequest.Recursive = false", StringComparison.Ordinal) >= 0,
            "FolderReadService browse should enumerate direct child folders, not recursive descendants.");
        AssertTrue(
            source.IndexOf("ReadBoundDatabase(componentRequest", StringComparison.Ordinal) >= 0,
            "FolderReadService should obtain folder children through ComponentReadService.ReadBoundDatabase.");
        AssertTrue(
            source.IndexOf("ResolveFolder(database, itemPath)", StringComparison.Ordinal) >= 0,
            "FolderReadService should validate list_components candidates as real ASCET folders.");
    }

    private static void TestListFoldersExecutableUsesFolderReadService()
    {
        string sourcePath = FindPathUpwards("src", "ascetcli", "src", "AscetCli", "AscetListFolders.cs");
        string source = File.ReadAllText(sourcePath);

        AssertTrue(
            source.IndexOf("new FolderReadService()", StringComparison.Ordinal) >= 0,
            "AscetListFolders should use FolderReadService so standalone and exec list_folders share the same folder discovery path.");
        AssertTrue(
            source.IndexOf("ReadCurrentDatabase(ToRequest(arguments))", StringComparison.Ordinal) >= 0,
            "AscetListFolders should execute FolderReadService.ReadCurrentDatabase instead of its local folder tree builder.");
        AssertTrue(
            source.IndexOf("BuildTree(arguments)", StringComparison.Ordinal) < 0,
            "AscetListFolders should not call the legacy local BuildTree path that can return empty children.");
    }

    private static void TestListComponentsJsonIncludesNavigationMetadata()
    {
        AscetListComponentsArguments arguments = new AscetListComponentsArguments
        {
            FolderPath = "Workspace\\Lesson8",
            Kind = AscetComponentKind.Unknown,
            Query = String.Empty,
            Limit = 0,
            Recursive = false,
            EmitJson = true
        };

        List<AscetItemRef> items = new List<AscetItemRef>
        {
            new AscetItemRef
            {
                Name = "IdleCon",
                Path = "Workspace\\Lesson8\\IdleCon",
                Kind = AscetComponentKind.Module,
                LanguageKind = AscetLanguageKind.BDE
            }
        };

        Dictionary<string, object> payload = DeserializeObject(AscetListComponents.FormatJsonOutput(arguments, items));
        Dictionary<string, object> item = GetFirstDictionaryFromList(payload, "items");

        AssertEqual("IdleCon", GetString(item, "displayName"), "list_components should expose item.displayName");
        AssertEqual("Workspace\\Lesson8", GetString(item, "parentPath"), "list_components should expose item.parentPath");
        AssertEqual("folder", GetString(item, "ownerKind"), "list_components should expose item.ownerKind");
        AssertEqual("component", GetString(item, "targetKind"), "list_components should expose item.targetKind");
        AssertEqual("module", GetString(item, "objectKind"), "list_components should expose item.objectKind");

        Dictionary<string, object> containerPayload = DeserializeObject(
            AscetListComponents.FormatJsonOutput(
                arguments,
                new List<AscetItemRef>
                {
                    new AscetItemRef
                    {
                        Name = "Project",
                        Path = "Workspace\\Lesson8\\Project",
                        Kind = AscetComponentKind.Project,
                        LanguageKind = AscetLanguageKind.Unknown
                    }
                }));
        Dictionary<string, object> containerItem = GetFirstDictionaryFromList(containerPayload, "items");
        AssertEqual("container", GetString(containerItem, "targetKind"), "list_components should classify project items as containers");
        AssertEqual("project", GetString(containerItem, "objectKind"), "list_components should classify project items with their concrete object kind");
    }

    private static void TestListComponentsAcceptsDatabaseRootFolderPath()
    {
        AscetListComponentsArguments emptyPath = AscetListComponents.ParseArguments(new string[] { "", "--json" });
        AscetListComponentsArguments slashPath = AscetListComponents.ParseArguments(new string[] { "/", "--json" });
        AscetListComponentsArguments backslashPath = AscetListComponents.ParseArguments(new string[] { "\\", "--json" });
        AscetListComponentsArguments nestedPath = AscetListComponents.ParseArguments(new string[] { "/DEMO/", "--json" });

        AssertEqual(String.Empty, emptyPath.FolderPath, "list_components should accept empty folderPath as database root");
        AssertEqual(String.Empty, slashPath.FolderPath, "list_components should accept / folderPath as database root");
        AssertEqual(String.Empty, backslashPath.FolderPath, "list_components should accept \\ folderPath as database root");
        AssertEqual("DEMO", nestedPath.FolderPath, "list_components should still normalize non-root folder paths");

        ComponentReadService service = new ComponentReadService();
        ComponentReadRequest payloadRoot = service.ParsePayload(new Dictionary<string, object> { { "folderPath", "/" } });
        ComponentReadRequest payloadNested = service.ParsePayload(new Dictionary<string, object> { { "folderPath", "/DEMO/" } });

        AssertEqual(String.Empty, payloadRoot.FolderPath, "host list_components payload should accept / folderPath as database root");
        AssertEqual("DEMO", payloadNested.FolderPath, "host list_components payload should still normalize non-root folder paths");

        bool createFolderRejectedRoot = false;
        try
        {
            AscetCreateFolder.ParseArguments(new string[] { "" });
        }
        catch (AscetReadException ex)
        {
            createFolderRejectedRoot = String.Equals("invalid_argument", ex.Code, StringComparison.Ordinal);
        }

        AssertTrue(createFolderRejectedRoot, "create_folder should keep rejecting empty folderPath");
    }

    private static void TestListComponentsFolderKindIncludesFolders()
    {
        AscetListComponentsArguments arguments = new AscetListComponentsArguments
        {
            FolderPath = "Workspace\\Lesson8",
            Kind = AscetComponentKind.Folder,
            Query = String.Empty,
            Limit = 0,
            Recursive = false,
            EmitJson = true
        };

        List<AscetItemRef> items = new List<AscetItemRef>
        {
            new AscetItemRef
            {
                Name = "SubFolder",
                Path = "Workspace\\Lesson8\\SubFolder",
                Kind = AscetComponentKind.Folder,
                LanguageKind = AscetLanguageKind.Unknown
            }
        };

        Dictionary<string, object> payload = DeserializeObject(AscetListComponents.FormatJsonOutput(arguments, items));
        Dictionary<string, object> item = GetFirstDictionaryFromList(payload, "items");
        Dictionary<string, object> counts = payload["counts"] as Dictionary<string, object>;

        AssertEqual("folder", GetString(item, "kind"), "list_components kind=folder should expose folder kind");
        AssertEqual("container", GetString(item, "targetKind"), "list_components should classify folder items as containers");
        AssertEqual("folder", GetString(item, "objectKind"), "list_components should classify folder items with folder object kind");
        AssertEqual("folder", GetString((Dictionary<string, object>)payload["filters"], "kind"), "list_components filters should preserve folder kind");
        AssertTrue(counts != null, "list_components should expose counts for folder listings");
        AssertEqual("1", Convert.ToString(counts["items"]), "list_components counts should include the folder item");
        AssertEqual("1", Convert.ToString(counts["folders"]), "list_components counts should include folders");
        AssertEqual("0", Convert.ToString(counts["modules"]), "list_components folder counts should not count folders as modules");
    }

    private static void TestListComponentsAllKindKeepsUnknownCandidates()
    {
        AscetListComponentsArguments parsed = AscetListComponents.ParseArguments(
            new string[] { "Workspace\\Lesson8", "--kind", "all", "--recursive", "--json" });
        AssertEqual(AscetComponentKind.Unknown.ToString(), parsed.Kind.ToString(), "list_components --kind all should parse as no kind filter");
        AssertEqual("True", parsed.Recursive.ToString(), "list_components --recursive should stay enabled with --kind all");

        List<AscetItemRef> items = new List<AscetItemRef>
        {
            new AscetItemRef
            {
                Name = "IdleCon",
                Path = "Workspace\\Lesson8\\IdleCon",
                Kind = AscetComponentKind.Module,
                LanguageKind = AscetLanguageKind.BDE
            },
            new AscetItemRef
            {
                Name = "MaybeFolder",
                Path = "Workspace\\Lesson8\\MaybeFolder",
                Kind = AscetComponentKind.Unknown,
                LanguageKind = AscetLanguageKind.Unknown
            }
        };

        Dictionary<string, object> payload = DeserializeObject(AscetListComponents.FormatJsonOutput(parsed, items));
        IList values = ToList(payload["items"]);
        AssertEqual("2", Convert.ToString(values.Count), "list_components all/no-filter output should keep mixed known and unknown candidates");
        AssertFalse(payload.ContainsKey("cursor"), "list_components should not add cursor protocol fields");
        AssertFalse(payload.ContainsKey("searchComplete"), "list_components should not add searchComplete protocol fields");

        Dictionary<string, object> unknownItem = values[1] as Dictionary<string, object>;
        AssertTrue(unknownItem != null, "list_components unknown candidate should serialize as an object");
        AssertEqual("MaybeFolder", GetString(unknownItem, "name"), "list_components unknown candidate should preserve name");
        AssertEqual("Workspace\\Lesson8\\MaybeFolder", GetString(unknownItem, "path"), "list_components unknown candidate should preserve path");
        AssertEqual("unknown", GetString(unknownItem, "kind"), "list_components unknown candidate should serialize unknown kind");
        AssertEqual("Unknown", GetString(unknownItem, "languageKind"), "list_components unknown candidate should preserve languageKind");
        AssertEqual("Workspace\\Lesson8", GetString(unknownItem, "parentPath"), "list_components unknown candidate should preserve parentPath");
        AssertEqual("unknown", GetString(unknownItem, "objectKind"), "list_components unknown candidate should preserve objectKind");
        AssertEqual("component", GetString(unknownItem, "targetKind"), "list_components unknown candidate should preserve targetKind");
    }

    private static void TestListComponentsRecursiveFilteringIsLimitAware()
    {
        string sourcePath = FindPathUpwards("src", "ascetcli", "src", "AscetCopilot", "Services", "Read", "ComponentReadService.cs");
        string source = File.ReadAllText(sourcePath);
        int methodStart = source.IndexOf("private IList<AscetItemRef> ListFilteredItems", StringComparison.Ordinal);
        int nextMethodStart = source.IndexOf("private IList<AscetItemRef> ListItemsInFolder", StringComparison.Ordinal);
        AssertTrue(methodStart >= 0 && nextMethodStart > methodStart, "ComponentReadService.ListFilteredItems source block should be discoverable.");

        string methodSource = source.Substring(methodStart, nextMethodStart - methodStart);
        AssertTrue(
            methodSource.IndexOf("ListItemsInFolder(database, normalizedRequest.FolderPath, normalizedRequest.Recursive)", StringComparison.Ordinal) < 0,
            "list_components should not collect the full recursive folder tree before applying query and limit.");
        AssertTrue(
            source.IndexOf("ShouldStopComponentCollection", StringComparison.Ordinal) >= 0,
            "ComponentReadService should stop recursive list_components collection once the filtered result reaches the requested limit.");
        AssertTrue(
            source.IndexOf("AscetDatabaseExplorerCommon.ItemMatchesFilter", StringComparison.Ordinal) >= 0,
            "ComponentReadService recursive collection should reuse the shared kind/query filter predicate during traversal.");
    }

    private static void TestCreateFolderJsonIncludesCreationSummary()
    {
        AscetCreateFolderResult result = new AscetCreateFolderResult
        {
            FolderPath = "Workspace\\Lesson8\\NewFolder",
            Created = true,
            CreatedCount = 2,
            ExistingCount = 1,
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            Summary = "Created folder path Workspace\\Lesson8\\NewFolder."
        };

        Dictionary<string, object> payload = DeserializeObject(AscetCreateFolder.FormatJsonOutput(result));

        AssertEqual("Workspace\\Lesson8\\NewFolder", GetString(payload, "folderPath"), "create_folder should expose folderPath");
        AssertTrue(GetBool(payload, "created"), "create_folder should expose created");
        AssertEqual("2", GetString(payload, "createdCount"), "create_folder should expose createdCount");
        AssertEqual("1", GetString(payload, "existingCount"), "create_folder should expose existingCount");
        AssertTrue(GetBool(payload, "readbackVerified"), "create_folder should expose readbackVerified");
    }

    private static void TestDeleteFolderSupportsTopLevelFolderRemoval()
    {
        string sourcePath = FindPathUpwards("src", "ascetcli", "src", "AscetCopilot", "AscetFolderDelete.cs");
        string source = File.ReadAllText(sourcePath);

        AssertTrue(
            source.IndexOf("parentContainer = database;", StringComparison.Ordinal) >= 0,
            "delete_folder should keep database as the parent container for top-level folders.");
        AssertTrue(
            source.IndexOf("GetMethod(\"Remove\"", StringComparison.Ordinal) >= 0,
            "delete_folder should use the AscetDataBase.Remove(Folder, recursive) API for top-level folders.");
        AssertTrue(
            source.IndexOf("GetMethod(\"RemoveFolder\"", StringComparison.Ordinal) >= 0,
            "delete_folder should keep using folder RemoveFolder for nested folders.");
    }

    private static void TestTopLevelListFoldersJsonUsesWorkspaceOwnerKind()
    {
        AscetListFoldersArguments arguments = new AscetListFoldersArguments
        {
            RootPath = String.Empty,
            Depth = 1,
            EmitJson = true
        };

        AscetListFolders.FolderTreeNode tree = new AscetListFolders.FolderTreeNode
        {
            Name = String.Empty,
            Path = String.Empty,
            Children = new List<AscetListFolders.FolderTreeNode>
            {
                new AscetListFolders.FolderTreeNode
                {
                    Name = "WorkspaceRoot",
                    Path = "WorkspaceRoot",
                    Children = new List<AscetListFolders.FolderTreeNode>()
                }
            }
        };

        Dictionary<string, object> payload = DeserializeObject(AscetListFolders.FormatJsonOutput(arguments, tree));
        Dictionary<string, object> folder = GetFirstDictionaryFromList(payload, "folders");

        AssertEqual("workspace", GetString(folder, "ownerKind"), "top-level list_folders entries should expose workspace ownerKind");
    }

    private static void TestResolveComponentJsonIncludesNavigationMetadata()
    {
        AscetResolveComponentArguments arguments = new AscetResolveComponentArguments
        {
            Query = "IdleCon",
            ScopePath = "Workspace\\Lesson8",
            Kind = AscetComponentKind.Unknown,
            Limit = 10,
            EmitJson = true
        };

        List<AscetItemRef> items = new List<AscetItemRef>
        {
            new AscetItemRef
            {
                Name = "IdleCon",
                Path = "Workspace\\Lesson8\\IdleCon",
                Kind = AscetComponentKind.Module,
                LanguageKind = AscetLanguageKind.BDE
            }
        };

        Dictionary<string, object> payload = AscetResolveComponent.BuildPayload(arguments, items);
        Dictionary<string, object> item = GetFirstDictionaryFromList(payload, "matches");

        AssertEqual("IdleCon", GetString(item, "displayName"), "resolve_component should expose item.displayName");
        AssertEqual("Workspace\\Lesson8", GetString(item, "parentPath"), "resolve_component should expose item.parentPath");
        AssertEqual("folder", GetString(item, "ownerKind"), "resolve_component should expose item.ownerKind");
    }

    private static void TestResolveComponentKeepsUnknownCandidates()
    {
        AscetResolveComponentArguments parsed = AscetResolveComponent.ParseArguments(
            new string[] { "Idle", "--scope", "Workspace\\Lesson8", "--kind", "all", "--limit", "5", "--json" });
        AssertEqual(AscetComponentKind.Unknown.ToString(), parsed.Kind.ToString(), "resolve_component --kind all should parse as no kind filter");

        List<AscetItemRef> items = new List<AscetItemRef>
        {
            new AscetItemRef
            {
                Name = "IdleCon",
                Path = "Workspace\\Lesson8\\IdleCon",
                Kind = AscetComponentKind.Module,
                LanguageKind = AscetLanguageKind.BDE
            },
            new AscetItemRef
            {
                Name = "IdleCandidate",
                Path = "Workspace\\Lesson8\\IdleCandidate",
                Kind = AscetComponentKind.Unknown,
                LanguageKind = AscetLanguageKind.Unknown
            }
        };

        Dictionary<string, object> payload = AscetResolveComponent.BuildPayload(parsed, items);
        IList values = ToList(payload["matches"]);
        AssertEqual("2", Convert.ToString(values.Count), "resolve_component should keep mixed known and unknown candidates");

        Dictionary<string, object> unknownItem = values[1] as Dictionary<string, object>;
        AssertTrue(unknownItem != null, "resolve_component unknown candidate should serialize as an object");
        AssertEqual("IdleCandidate", GetString(unknownItem, "name"), "resolve_component unknown candidate should preserve name");
        AssertEqual("Workspace\\Lesson8\\IdleCandidate", GetString(unknownItem, "path"), "resolve_component unknown candidate should preserve path");
        AssertEqual("unknown", GetString(unknownItem, "kind"), "resolve_component unknown candidate should serialize unknown kind");
        AssertEqual("Unknown", GetString(unknownItem, "languageKind"), "resolve_component unknown candidate should preserve languageKind");
        AssertEqual("Workspace\\Lesson8", GetString(unknownItem, "parentPath"), "resolve_component unknown candidate should preserve parentPath");
        AssertEqual("unknown", GetString(unknownItem, "objectKind"), "resolve_component unknown candidate should preserve objectKind");
        AssertEqual("component", GetString(unknownItem, "targetKind"), "resolve_component unknown candidate should preserve targetKind");
    }

    private static void TestResolveComponentBuildReadRequestUsesRecursiveScope()
    {
        AscetResolveComponentArguments arguments = new AscetResolveComponentArguments
        {
            Query = "IdleCon",
            ScopePath = "Workspace\\Lesson8",
            Kind = AscetComponentKind.Module,
            Limit = 3,
            EmitJson = true
        };

        ComponentReadRequest request = AscetResolveComponent.BuildComponentReadRequest(arguments);
        AssertEqual("Workspace\\Lesson8", request.FolderPath, "resolve_component should preserve the scoped folder path");
        AssertEqual("True", request.Recursive.ToString(), "resolve_component should always read recursively within scope");
        AssertEqual("3", request.Limit.ToString(), "resolve_component should preserve the match limit");
        AssertEqual("IdleCon", request.Query, "resolve_component should preserve the query text");
        AssertEqual(arguments.Kind.ToString(), request.Kind.ToString(), "resolve_component should preserve the component kind filter");
    }

    private static void TestResolveComponentParsesAndExposesMatchMode()
    {
        AscetResolveComponentArguments parsed = AscetResolveComponent.ParseArguments(
            new string[] { "PID*", "--scope", "DEMO", "--match", "glob", "--limit", "5", "--json" });

        AssertEqual("glob", parsed.MatchMode, "resolve_component should parse --match glob");

        Dictionary<string, object> payload = AscetResolveComponent.BuildPayload(parsed, new AscetItemRef[0]);
        Dictionary<string, object> filters = payload["filters"] as Dictionary<string, object>;
        AssertTrue(filters != null, "resolve_component payload should include filters.");
        AssertEqual("glob", GetString(filters, "match"), "resolve_component payload should expose the selected match mode");
    }

    private static void TestSearchCommandsRejectBlankQueries()
    {
        AssertInvalidArgument(
            delegate() { AscetResolveComponent.ParseArguments(new string[] { "", "--scope", "DEMO", "--json" }); },
            "resolve_component should reject an empty query before parsing scope flags.");
        AssertInvalidArgument(
            delegate() { AscetResolveComponent.ParseArguments(new string[] { "--scope", "DEMO", "--json" }); },
            "resolve_component should reject option-first input as a missing query instead of shifting --scope into the query slot.");
        AssertInvalidArgument(
            delegate() { AscetSearchElements.ParseArguments(new string[] { "", "--component", "DEMO\\PID", "--json" }); },
            "search_elements should reject an empty query before scanning components.");
        AssertInvalidArgument(
            delegate() { AscetSearchElements.ParseArguments(new string[] { "--component", "DEMO\\PID", "--json" }); },
            "search_elements should reject option-first input as a missing query instead of shifting --component into the query slot.");
        AssertInvalidArgument(
            delegate() { AscetSearchOccurrences.ParseArguments(new string[] { "", "--target", "component", "--json" }); },
            "search_occurrences should reject an empty query before dispatching child searches.");
        AssertInvalidArgument(
            delegate() { AscetSearchOccurrences.ParseArguments(new string[] { "--target", "component", "--json" }); },
            "search_occurrences should reject option-first input as a missing query instead of shifting --target into the query slot.");
    }

    private static void TestSearchComponentsMatchesPathSeparatorsConsistently()
    {
        AssertTrue(
            AscetSearchComponents.MatchesQuery("PID", "DEMO\\PID", "DEMO/PID", "exact"),
            "search_components exact matching should accept slash-separated path queries.");
        AssertTrue(
            AscetSearchComponents.MatchesQuery("PID", "DEMO\\PID", "DEMO/P*", "glob"),
            "search_components glob matching should normalize path separators.");
        AssertTrue(
            AscetSearchComponents.MatchesQuery("PID", "DEMO\\PID", "DEMO/P", "contains"),
            "search_components contains matching should normalize path separators.");
        AssertFalse(
            AscetSearchComponents.MatchesQuery("PID", "DEMO\\PID", "*", "contains"),
            "search_components contains matching should treat '*' as a literal character.");
    }

    private static void TestReadComponentChildrenPayloadIncludesNavigationMetadata()
    {
        AscetReadComponentChildrenArguments arguments = new AscetReadComponentChildrenArguments
        {
            ComponentPath = "Workspace\\Lesson8\\IdleCon",
            Group = "all",
            EmitJson = true
        };

        Dictionary<string, object> snapshot = new Dictionary<string, object>();
        snapshot["Methods"] = new object[]
        {
            new Dictionary<string, object>
            {
                { "MethodName", "Main" },
                { "MethodKind", "process" }
            }
        };
        snapshot["Implementation"] = new Dictionary<string, object>
        {
            {
                "Elements",
                new object[]
                {
                    new Dictionary<string, object>
                    {
                        { "ElementName", "Gain" },
                        { "DisplayKind", "Parameter" },
                        { "ElementKind", "Scalar" },
                        { "DisplayType", "real64" },
                        { "DisplayScope", "public" },
                        { "ReferencedComponentPath", String.Empty }
                    }
                }
            }
        };
        snapshot["Diagrams"] = new object[]
        {
            new Dictionary<string, object>
            {
                { "Name", "Main" },
                { "DiagramKind", "BlockDiagram" },
                { "OwningComponentPath", "Workspace\\Lesson8\\IdleCon" }
            }
        };

        Dictionary<string, object> payload = AscetReadComponentChildren.BuildPayload(arguments, snapshot);
        AssertContainsString(GetStringList(payload, "availableGroups"), "methods", "read_children should expose availableGroups");
        AssertContainsString(GetStringList(payload, "availableGroups"), "elements", "read_children should expose availableGroups");
        AssertContainsString(GetStringList(payload, "availableGroups"), "diagrams", "read_children should expose diagrams in availableGroups");

        Dictionary<string, object> counts = payload["counts"] as Dictionary<string, object>;
        AssertTrue(counts != null, "read_children should expose counts");
        AssertTrue(counts.ContainsKey("methods"), "read_children counts should include methods");
        AssertTrue(counts.ContainsKey("elements"), "read_children counts should include elements");
        AssertTrue(counts.ContainsKey("components"), "read_children counts should include components");
        AssertTrue(counts.ContainsKey("arrays"), "read_children counts should include arrays");
        AssertTrue(counts.ContainsKey("parameters"), "read_children counts should include parameters");
        AssertTrue(counts.ContainsKey("variables"), "read_children counts should include variables");
        AssertTrue(counts.ContainsKey("diagrams"), "read_children counts should include diagrams");
        AssertEqual("1", Convert.ToString(counts["diagrams"]), "read_children counts should include diagram count");

        Dictionary<string, object> item = GetFirstDictionaryFromList(payload, "items");
        AssertTrue(item.ContainsKey("displayName"), "read_children items should expose displayName");
        AssertTrue(item.ContainsKey("parentPath"), "read_children items should expose parentPath");
        AssertTrue(item.ContainsKey("ownerKind"), "read_children items should expose ownerKind");
        AssertEqual("component", GetString(item, "ownerKind"), "read_children items should expose semantic ownerKind");

        AscetReadComponentChildrenArguments diagramArguments = new AscetReadComponentChildrenArguments
        {
            ComponentPath = "Workspace\\Lesson8\\IdleCon",
            Group = "diagrams",
            EmitJson = true
        };
        Dictionary<string, object> diagramPayload = AscetReadComponentChildren.BuildPayload(diagramArguments, snapshot);
        AssertEqual("diagrams", GetString(diagramPayload, "selectedGroup"), "read_children should preserve diagrams selectedGroup");
        Dictionary<string, object> diagramCounts = diagramPayload["counts"] as Dictionary<string, object>;
        AssertTrue(diagramCounts != null, "read_children diagrams should expose counts");
        AssertEqual("1", Convert.ToString(diagramCounts["items"]), "read_children diagrams should expose one item");
        AssertEqual("1", Convert.ToString(diagramCounts["diagrams"]), "read_children diagrams should expose diagram count");
        Dictionary<string, object> diagramItem = GetFirstDictionaryFromList(diagramPayload, "items");
        AssertEqual("diagrams", GetString(diagramItem, "group"), "read_children diagram item should use diagrams group");
        AssertEqual("Main", GetString(diagramItem, "name"), "read_children diagram item should expose diagram name");
        AssertEqual("BlockDiagram", GetString(diagramItem, "kind"), "read_children diagram item should expose diagram kind");
        AssertEqual("Workspace\\Lesson8\\IdleCon::Main", GetString(diagramItem, "path"), "read_children diagram item should expose diagram path");

        Dictionary<string, object> listDiagramsPayload = new Dictionary<string, object>();
        listDiagramsPayload["componentPath"] = "Workspace\\Lesson8\\IdleCon";
        listDiagramsPayload["items"] = new object[]
        {
            new Dictionary<string, object>
            {
                { "name", "Main" },
                { "kind", "BlockDiagram" },
                { "supportsReadBlockDiagram", true }
            }
        };
        Dictionary<string, object> lightDiagramPayload = AscetReadComponentChildren.BuildDiagramOnlyPayload(diagramArguments, listDiagramsPayload);
        AssertEqual("diagrams", GetString(lightDiagramPayload, "selectedGroup"), "read_children diagram-only path should preserve selectedGroup");
        Dictionary<string, object> lightDiagramCounts = lightDiagramPayload["counts"] as Dictionary<string, object>;
        AssertTrue(lightDiagramCounts != null, "read_children diagram-only path should expose counts");
        AssertEqual("1", Convert.ToString(lightDiagramCounts["items"]), "read_children diagram-only path should expose one item");
    }

    private static void TestReadComponentChildrenMethodsGroupDoesNotRequireImplementation()
    {
        AscetReadComponentChildrenArguments arguments = new AscetReadComponentChildrenArguments
        {
            ComponentPath = "Workspace\\Lesson8\\IdleCon",
            Group = "methods",
            EmitJson = true
        };

        Dictionary<string, object> snapshot = new Dictionary<string, object>();
        snapshot["Methods"] = new object[]
        {
            new Dictionary<string, object>
            {
                { "MethodName", "Main" },
                { "MethodKind", "process" }
            }
        };

        Dictionary<string, object> payload = AscetReadComponentChildren.BuildPayload(arguments, snapshot);
        AssertEqual("methods", GetString(payload, "selectedGroup"), "read_children methods should preserve selectedGroup");
        Dictionary<string, object> counts = payload["counts"] as Dictionary<string, object>;
        AssertTrue(counts != null, "read_children methods should expose counts");
        AssertEqual("1", Convert.ToString(counts["items"]), "read_children methods should expose method item count");
        AssertEqual("1", Convert.ToString(counts["methods"]), "read_children methods should count methods");
        AssertEqual("0", Convert.ToString(counts["elements"]), "read_children methods should not require implementation elements");
        Dictionary<string, object> item = GetFirstDictionaryFromList(payload, "items");
        AssertEqual("methods", GetString(item, "group"), "read_children methods item should use methods group");
        AssertEqual("Main", GetString(item, "name"), "read_children methods item should expose method name");
    }

    private static void TestReadComponentChildrenUsesLightweightDefaultPaths()
    {
        string sourcePath = FindPathUpwards("src", "ascetcli", "src", "AscetCli", "AscetReadComponentChildren.cs");
        string source = File.ReadAllText(sourcePath);

        AssertTrue(
            source.IndexOf("new MethodReadService().ReadCurrentDatabase", StringComparison.Ordinal) >= 0,
            "preview_children should use in-process method reads for method previews.");
        AssertTrue(
            source.IndexOf("new ImplementationReadService().ReadImplementation", StringComparison.Ordinal) >= 0,
            "preview_children should use in-process implementation reads for implementation element previews.");
        AssertTrue(
            source.IndexOf("RunSiblingCliExecOrExe(\r\n                \"list_methods\"", StringComparison.Ordinal) < 0,
            "preview_children should not spawn list_methods for method previews.");
        AssertTrue(
            source.IndexOf("RunSiblingCliExecOrExe(\r\n                \"read_implementation\"", StringComparison.Ordinal) < 0,
            "preview_children should not spawn read_implementation for implementation element previews.");
        AssertTrue(
            source.IndexOf("\"read_component_snapshot\"", StringComparison.Ordinal) < 0,
            "preview_children should not load full component snapshots on default child groups.");

        string hostSourcePath = FindPathUpwards("src", "ascetcli", "src", "AscetCli", "Host", "AscetReadHostDispatcher.cs");
        string hostSource = File.ReadAllText(hostSourcePath);
        AssertTrue(
            hostSource.IndexOf("\"read_component_snapshot\"", StringComparison.Ordinal) < 0,
            "read host preview_children should not load full component snapshots.");
    }

    private static void TestReadComponentRefsAvoidsDefaultSnapshotTrace()
    {
        string sourcePath = FindPathUpwards("src", "ascetcli", "src", "AscetCli", "AscetReadComponentRefs.cs");
        string source = File.ReadAllText(sourcePath);

        AssertTrue(
            source.IndexOf("\"read_component_snapshot\"", StringComparison.Ordinal) < 0,
            "component_refs should not load component snapshots by default.");
        AssertTrue(
            source.IndexOf("ReferenceTrace", StringComparison.Ordinal) < 0,
            "component_refs should not build snapshot trace by default.");
        AssertTrue(
            source.IndexOf("BuildReferencesFromImplementation", StringComparison.Ordinal) >= 0,
            "component_refs should derive default outgoing references from implementation data.");
        AssertTrue(
            source.IndexOf("RunSiblingCliExecOrExe(\"read_references\"", StringComparison.Ordinal) < 0,
            "component_refs should not spawn read_references for outgoing references.");
        AssertTrue(
            source.IndexOf("new ReferenceReadService().GetReferenceGraph", StringComparison.Ordinal) < 0,
            "component_refs should not use the heavy reference graph reader by default.");
        AssertTrue(
            source.IndexOf("\"read_component_used_by\"", StringComparison.Ordinal) >= 0,
            "component_refs direction=both should still be able to add incoming used_by references.");
    }

    private static void TestReadElementRefsPreflightsImplementationBeforeReferences()
    {
        string sourcePath = FindPathUpwards("src", "ascetcli", "src", "AscetCli", "AscetReadElementRefs.cs");
        string source = File.ReadAllText(sourcePath);
        int implementationIndex = source.IndexOf("LoadImplementation(arguments.ComponentPath)", StringComparison.Ordinal);
        int referencesIndex = source.IndexOf("LoadReferences(arguments.ComponentPath)", StringComparison.Ordinal);

        AssertTrue(implementationIndex >= 0, "element_refs should read lightweight implementation data for element preflight.");
        AssertTrue(referencesIndex >= 0, "element_refs should still read outgoing references for existing elements.");
        AssertTrue(
            implementationIndex < referencesIndex,
            "element_refs should preflight implementation element existence before reading references.");
        AssertTrue(
            source.IndexOf("RunSiblingCliExecOrExe(\"read_implementation\"", StringComparison.Ordinal) < 0,
            "element_refs should not spawn read_implementation for element preflight.");
        AssertTrue(
            source.IndexOf("RunSiblingCliExecOrExe(\"read_references\"", StringComparison.Ordinal) < 0,
            "element_refs should not spawn read_references for existing elements.");
        AssertTrue(
            source.IndexOf("\"read_component_snapshot\"", StringComparison.Ordinal) < 0,
            "element_refs should not load full component snapshots for element preflight.");
        AssertTrue(
            source.IndexOf("element == null", StringComparison.Ordinal) >= 0,
            "element_refs should branch before reference reads when the element is missing.");
        AssertTrue(
            source.IndexOf("new Dictionary<string, object>()", StringComparison.Ordinal) >= 0,
            "element_refs missing-element path should use an empty reference payload.");
        AssertTrue(
            source.IndexOf("counts[\"outgoingRefs\"] = outgoingRefs.Count", StringComparison.Ordinal) >= 0,
            "element_refs missing-element payload should keep outgoing ref counts derived from the empty payload.");
    }

    private static void TestReadComponentUsedByPreflightsTargetComponent()
    {
        string sourcePath = FindPathUpwards("src", "ascetcli", "src", "AscetCli", "AscetReadComponentUsedBy.cs");
        string source = File.ReadAllText(sourcePath);

        AssertTrue(
            source.IndexOf("ValidateTargetComponentExists", StringComparison.Ordinal) >= 0,
            "used_by should validate the target component exists before scanning reverse references.");
        AssertTrue(
            source.IndexOf("\"component_not_found\"", StringComparison.Ordinal) >= 0,
            "used_by missing target validation should emit component_not_found.");
    }

    private static void TestReadComponentUsedByRejectsBlankScopeArgument()
    {
        string sourcePath = FindPathUpwards("src", "ascetcli", "src", "AscetCli", "AscetReadComponentUsedBy.cs");
        string source = File.ReadAllText(sourcePath);

        AssertTrue(
            source.IndexOf("ReadRequiredOptionValue(args, ref i, \"--scope\")", StringComparison.Ordinal) >= 0,
            "used_by should reject --scope without a non-empty value instead of treating the next flag as a positional scope.");
        AssertTrue(
            source.IndexOf("NormalizeRequiredOptionPath(", StringComparison.Ordinal) >= 0,
            "used_by should reject an explicitly blank --scope value instead of entering a long reverse-reference scan.");
        AssertTrue(
            source.IndexOf("operation + \" must not be empty.\"", StringComparison.Ordinal) >= 0,
            "used_by blank scope validation should emit a clear validation message.");
    }

    private static void TestShowOccurrencesIgnoresRecoverableComponentSearchFailures()
    {
        AscetReadException recoverable = new AscetReadException(
            "target_kind_unresolved",
            "serialize_item",
            "ASCET item kind could not be resolved.");
        AscetReadException fatal = new AscetReadException(
            "database_not_open",
            "show_occurrences",
            "Open a database in ASCET first.");

        MethodInfo isRecoverable = typeof(AscetShowOccurrences).GetMethod(
            "IsRecoverableComponentSearchFailure",
            BindingFlags.NonPublic | BindingFlags.Static);
        AssertTrue(isRecoverable != null, "show_occurrences should expose a recoverable component-search classifier.");
        AssertTrue((bool)isRecoverable.Invoke(null, new object[] { recoverable }), "target_kind_unresolved should be recoverable for component search.");
        AssertFalse((bool)isRecoverable.Invoke(null, new object[] { fatal }), "database_not_open should stay fatal for component search.");

        MethodInfo buildFailure = typeof(AscetShowOccurrences).GetMethod(
            "BuildComponentSearchFailure",
            BindingFlags.NonPublic | BindingFlags.Static);
        AssertTrue(buildFailure != null, "show_occurrences should build component search diagnostics.");
        Dictionary<string, object> failure =
            buildFailure.Invoke(null, new object[] { recoverable }) as Dictionary<string, object>;
        AssertTrue(failure != null, "component search failure should be a JSON object.");
        AssertEqual("False", Convert.ToString(failure["ok"]), "component search diagnostics should mark ok=false.");
        AssertEqual("target_kind_unresolved", GetString(failure, "code"), "component search diagnostics should preserve error code.");

        MethodInfo buildResolveArgs = typeof(AscetShowOccurrences).GetMethod(
            "BuildResolveArgs",
            BindingFlags.NonPublic | BindingFlags.Static);
        MethodInfo buildFindArgs = typeof(AscetShowOccurrences).GetMethod(
            "BuildFindArgs",
            BindingFlags.NonPublic | BindingFlags.Static);
        AscetShowOccurrencesArguments arguments = new AscetShowOccurrencesArguments
        {
            Query = "Timer",
            ScopePath = "ETAS_SystemLib",
            Limit = 5,
            Cursor = 12,
            EmitJson = true
        };
        IList<string> resolveArgs = buildResolveArgs.Invoke(null, new object[] { arguments }) as IList<string>;
        IList<string> findArgs = buildFindArgs.Invoke(null, new object[] { arguments }) as IList<string>;
        AssertFalse(ListContains(resolveArgs, "--cursor"), "resolve_component args should remain cursor-free.");
        AssertTrue(ListContains(findArgs, "--cursor"), "find_elements args should receive cursor.");

        MethodInfo buildPayload = typeof(AscetShowOccurrences).GetMethod(
            "BuildPayload",
            BindingFlags.NonPublic | BindingFlags.Static);
        AssertTrue(buildPayload != null, "show_occurrences should build a combined payload.");
        Dictionary<string, object> componentMatches = new Dictionary<string, object>();
        Dictionary<string, object> elementMatches = new Dictionary<string, object>();
        elementMatches["matches"] = new object[]
        {
            new Dictionary<string, object>
            {
                { "path", "ETAS_SystemLib\\TimerClass::Timer" },
                { "componentPath", "ETAS_SystemLib\\TimerClass" },
                { "componentKind", "class" },
                { "elementName", "Timer" },
                { "elementKind", "Variable" },
                { "group", "variables" }
            }
        };
        elementMatches["searchComplete"] = true;
        elementMatches["nextCursor"] = 13;
        elementMatches["truncated"] = false;
        elementMatches["truncationReason"] = String.Empty;

        Dictionary<string, object> payload = buildPayload.Invoke(
            null,
            new object[] { arguments, componentMatches, failure, elementMatches }) as Dictionary<string, object>;
        AssertTrue(payload != null, "show_occurrences should return payload when component search is recoverable.");
        Dictionary<string, object> counts = payload["counts"] as Dictionary<string, object>;
        AssertEqual("0", Convert.ToString(counts["componentMatches"]), "recoverable component search failure should return zero component matches.");
        AssertEqual("1", Convert.ToString(counts["elementMatches"]), "recoverable component search failure should not suppress element matches.");
        Dictionary<string, object> diagnostics = payload["diagnostics"] as Dictionary<string, object>;
        AssertTrue(diagnostics != null, "recoverable component search failure should surface diagnostics.");
        Dictionary<string, object> componentSearch = diagnostics["componentSearch"] as Dictionary<string, object>;
        AssertEqual("target_kind_unresolved", GetString(componentSearch, "code"), "diagnostics should preserve component search failure code.");
    }

    private static void TestSearchOccurrencesTargetParsingAndPayload()
    {
        AscetSearchOccurrencesArguments componentOnly = AscetSearchOccurrences.ParseArguments(
            new string[] { "Timer*", "--target", "component", "--match", "glob", "--limit", "3", "--json" });
        AscetSearchOccurrencesArguments elementOnly = AscetSearchOccurrences.ParseArguments(
            new string[] { "Timer", "--target", "element", "--match", "exact", "--cursor", "2", "--json" });
        AscetSearchOccurrencesArguments scopedElement = AscetSearchOccurrences.ParseArguments(
            new string[] { "pid_kp", "--target", "element", "--component", "DEMO/PID", "--match", "exact", "--json" });
        AscetSearchOccurrencesArguments defaultTarget = AscetSearchOccurrences.ParseArguments(
            new string[] { "Timer", "--json" });

        AssertEqual("component", componentOnly.Target, "search_occurrences --target component should parse component target");
        AssertEqual("element", elementOnly.Target, "search_occurrences --target element should parse element target");
        AssertEqual("DEMO\\PID", scopedElement.ComponentPath, "search_occurrences should parse and normalize --component");
        AssertEqual(String.Empty, scopedElement.ScopePath, "search_occurrences --component should not synthesize folder scope during parsing");
        AssertEqual("mixed", defaultTarget.Target, "search_occurrences should default to mixed target");
        AssertEqual("glob", componentOnly.MatchMode, "search_occurrences should parse --match glob");
        AssertEqual("exact", elementOnly.MatchMode, "search_occurrences should parse --match exact");
        AssertContainsString(AscetSearchOccurrences.BuildElementArgs(scopedElement), "--component", "search_occurrences element leg should pass component scope to search_elements.");
        AssertFalse(AscetSearchOccurrences.BuildElementArgs(scopedElement).Contains("--scope"), "search_occurrences element leg should not pass folder scope when --component is present.");

        Dictionary<string, object> componentMatches = new Dictionary<string, object>();
        componentMatches["matches"] = new object[]
        {
            new Dictionary<string, object>
            {
                { "path", "DEMO\\TimerClass" },
                { "name", "TimerClass" },
                { "kind", "class" },
                { "languageKind", "BDE" }
            }
        };
        componentMatches["nextCursor"] = "1";
        componentMatches["searchComplete"] = true;
        componentMatches["truncated"] = false;
        componentMatches["truncationReason"] = String.Empty;
        componentMatches["counts"] = new Dictionary<string, object>
        {
            { "matches", 1 },
            { "totalCandidates", 11 },
            { "candidatesVisited", 4 }
        };

        Dictionary<string, object> payload = AscetSearchOccurrences.BuildPayload(componentOnly, componentMatches, null);
        AssertEqual("component", GetString(payload, "target"), "search_occurrences payload should expose selected target");
        AssertEqual("1", GetString(GetDictionary(payload, "counts"), "componentMatches"), "component target should count component matches");
        AssertEqual("0", GetString(GetDictionary(payload, "counts"), "elementMatches"), "component target should not count element matches");
        AssertEqual("4", GetString(GetDictionary(payload, "counts"), "candidatesVisited"), "component target should expose visited candidate count");
        AssertEqual("11", GetString(GetDictionary(payload, "counts"), "totalCandidates"), "component target should expose total candidate count");
        AssertEqual("1", GetString(payload, "nextCursor"), "component target should preserve component leg nextCursor");
        AssertTrue(GetBool(payload, "searchComplete"), "component target should preserve component leg searchComplete");
        Dictionary<string, object> scopedPayload = AscetSearchOccurrences.BuildPayload(scopedElement, null, null);
        AssertEqual("DEMO\\PID", GetString(scopedPayload, "componentPath"), "search_occurrences payload should expose componentPath when component-scoped.");

        bool unsupportedRejected = false;
        try
        {
            AscetSearchOccurrences.ParseArguments(new string[] { "Timer", "--target", "method", "--json" });
        }
        catch (AscetReadException ex)
        {
            unsupportedRejected = String.Equals("invalid_argument", ex.Code, StringComparison.Ordinal);
        }

        AssertTrue(unsupportedRejected, "search_occurrences should reject unknown target values.");
    }

    private static void TestSearchOccurrencesElementTargetPreservesElementPagingAndCounts()
    {
        AscetSearchOccurrencesArguments elementOnly = AscetSearchOccurrences.ParseArguments(
            new string[] { "*", "--target", "element", "--match", "glob", "--cursor", "2", "--limit", "5", "--json" });
        Dictionary<string, object> elementMatches = new Dictionary<string, object>();
        elementMatches["matches"] = new object[]
        {
            new Dictionary<string, object>
            {
                { "path", "DEMO\\TimerClass::Timer" },
                { "componentPath", "DEMO\\TimerClass" },
                { "componentKind", "class" },
                { "elementName", "Timer" },
                { "elementKind", "Variable" },
                { "group", "primitive" }
            }
        };
        elementMatches["nextCursor"] = "3";
        elementMatches["searchComplete"] = false;
        elementMatches["truncated"] = true;
        elementMatches["truncationReason"] = "result_limit";
        elementMatches["counts"] = new Dictionary<string, object>
        {
            { "matches", 1 },
            { "totalCandidates", 1 },
            { "candidatesVisited", 1 }
        };

        Dictionary<string, object> payload = AscetSearchOccurrences.BuildPayload(elementOnly, null, elementMatches);
        Dictionary<string, object> counts = GetDictionary(payload, "counts");

        AssertEqual("element", GetString(payload, "target"), "search_occurrences element target should expose selected target");
        AssertEqual("1", GetString(counts, "elementMatches"), "element target should count element matches");
        AssertEqual("0", GetString(counts, "componentMatches"), "element target should not count component matches");
        AssertEqual("1", GetString(counts, "totalCandidates"), "element target should preserve search_elements totalCandidates");
        AssertEqual("1", GetString(counts, "candidatesVisited"), "element target should preserve search_elements candidatesVisited");
        AssertEqual("3", GetString(payload, "nextCursor"), "element target should preserve search_elements nextCursor");
        AssertFalse(GetBool(payload, "searchComplete"), "element target should preserve search_elements incomplete paging state");
        AssertEqual("result_limit", GetString(payload, "truncationReason"), "element target should preserve search_elements truncation reason");
    }

    private static void TestDiffComponentSnapshotRoutesStateMachineToLightweightDiff()
    {
        string sourcePath = FindPathUpwards("src", "ascetcli", "src", "AscetCli", "AscetDiffComponentSnapshot.cs");
        string source = File.ReadAllText(sourcePath);

        AssertTrue(
            source.IndexOf("return \"AscetDiffClass.exe\";", StringComparison.Ordinal) >= 0,
            "diff_component_snapshot should preserve class child diff routing.");
        AssertTrue(
            source.IndexOf("return \"AscetDiffModule.exe\";", StringComparison.Ordinal) >= 0,
            "diff_component_snapshot should preserve module child diff routing.");
        AssertTrue(
            source.IndexOf("return \"AscetDiffStateMachine.exe\";", StringComparison.Ordinal) >= 0,
            "state-machine snapshot diff should route to lightweight diff_state_machine.");
        AssertFalse(
            source.IndexOf("return \"AscetDiffStateMachineDomain.exe\";", StringComparison.Ordinal) >= 0,
            "state-machine snapshot diff should not route to domain-heavy diff_state_machine_domain.");
    }

    private static void TestReadComponentSnapshotJsonCarriesTopLevelMetadata()
    {
        AscetComponentSnapshot snapshot = new AscetComponentSnapshot
        {
            Component = new AscetItemRef
            {
                Name = "PID",
                Path = "DEMO\\PID",
                Kind = AscetComponentKind.Class,
                LanguageKind = AscetLanguageKind.ESDL
            },
            Diagrams = new List<AscetDiagramRef>
            {
                new AscetDiagramRef { Name = "Main" }
            },
            Methods = new List<AscetMethodCode>
            {
                new AscetMethodCode { MethodName = "calc" },
                new AscetMethodCode { MethodName = "init" }
            },
            Implementation = new AscetImplementationSnapshot
            {
                Elements = new List<AscetElementImplementationRef>
                {
                    new AscetElementImplementationRef { ElementName = "in_a" },
                    new AscetElementImplementationRef { ElementName = "out_y" },
                    new AscetElementImplementationRef { ElementName = "pid_kp" }
                }
            }
        };

        Dictionary<string, object> payload = Serializer.Deserialize<Dictionary<string, object>>(AscetReadComponentSnapshot.FormatJsonOutput(snapshot));
        AssertEqual("DEMO\\PID", GetString(payload, "componentPath"), "snapshot JSON should expose top-level componentPath.");
        AssertEqual("Class", GetString(payload, "kind"), "snapshot JSON should expose top-level kind.");
        AssertEqual("Class", GetString(payload, "componentKind"), "snapshot JSON should expose top-level componentKind.");
        AssertEqual("ESDL", GetString(payload, "languageKind"), "snapshot JSON should expose top-level languageKind.");
        Dictionary<string, object> counts = GetDictionary(payload, "counts");
        AssertTrue(counts != null, "snapshot JSON should expose top-level counts.");
        AssertEqual("3", Convert.ToString(counts["elements"]), "snapshot JSON should count implementation elements.");
        AssertEqual("2", Convert.ToString(counts["methods"]), "snapshot JSON should count methods.");
        AssertEqual("1", Convert.ToString(counts["diagrams"]), "snapshot JSON should count diagrams.");
    }

    private static void TestDiffComponentSnapshotRejectsKindMismatchBeforeChildDiff()
    {
        string sourcePath = FindPathUpwards("src", "ascetcli", "src", "AscetCli", "AscetDiffComponentSnapshot.cs");
        string source = File.ReadAllText(sourcePath);

        AssertTrue(
            source.IndexOf("ValidateKindMatch(left.Kind, right.Kind);", StringComparison.Ordinal) >= 0,
            "diff_component_snapshot should validate kind match before resolving child diff.");
        AssertTrue(
            source.IndexOf("private static void ValidateKindMatch", StringComparison.Ordinal) >= 0,
            "diff_component_snapshot should centralize kind mismatch preflight.");
        AssertTrue(
            source.IndexOf("new AscetReadException(\"invalid_argument\", \"diff_component_snapshot\"", StringComparison.Ordinal) >= 0,
            "diff_component_snapshot kind mismatch should return invalid_argument before child diff execution.");
    }

    private static void TestDiffMethodCodeRecognizesNestedMethodNotFound()
    {
        AssertTrue(
            AscetDiffMethodCode.ContainsAscetError(
                "component_not_found:read_method_code:read_method_code failed: method_not_found:read_method_code:Method 'NoSuchMethod' was not found.",
                "method_not_found"),
            "diff_method_code should recognize nested method_not_found child errors.");
    }

    private static void TestReadTextCodeThrowsMethodNotFoundInSource()
    {
        string sourcePath = FindPathUpwards("src", "ascetcli", "src", "AscetCli", "AscetReadTextCode.cs");
        string source = File.ReadAllText(sourcePath);

        AssertTrue(
            source.IndexOf("new AscetReadException", StringComparison.Ordinal) >= 0 &&
            source.IndexOf("\"method_not_found\"", StringComparison.Ordinal) >= 0,
            "read_text_code should throw method_not_found when a named method is missing.");
    }

    private static void TestDiffMethodCodeRecognizesStructuredMethodNotFound()
    {
        string structured = "{\"ok\":false,\"error\":{\"code\":\"method_not_found\",\"message\":\"Method 'NoSuchMethod' was not found.\"}}";
        AssertTrue(
            AscetDiffMethodCode.ContainsAscetError(structured, "method_not_found"),
            "diff_method_code should recognize structured child method_not_found errors.");
    }

    private static void TestReadStateMachineFlowParsesDetailLevel()
    {
        AscetReadStateMachineFlowArguments parsed = AscetReadStateMachineFlow.ParseArguments(
            new string[] { "DEMO\\SM", "--trace-depth", "2", "--detail-level", "summary", "--json" });

        AssertEqual("DEMO\\SM", parsed.ComponentPath, "read_state_machine_flow should preserve component path.");
        AssertEqual("2", parsed.TraceDepth.ToString(), "read_state_machine_flow should parse trace depth.");
        AssertEqual("summary", parsed.DetailLevel, "read_state_machine_flow should parse summary detail level.");
        AssertEqual("True", parsed.EmitJson.ToString(), "read_state_machine_flow should parse --json.");

        AscetReadStateMachineFlowArguments defaultLevel = AscetReadStateMachineFlow.ParseArguments(
            new string[] { "DEMO\\SM", "--json" });
        AssertEqual("full", defaultLevel.DetailLevel, "read_state_machine_flow should default to full detail level.");

        AssertInvalidArgument(
            delegate() { AscetReadStateMachineFlow.ParseArguments(new string[] { "DEMO\\SM", "--detail-level", "verbose" }); },
            "read_state_machine_flow should reject unsupported detail levels.");
    }

    private static void TestReadStateMachineFlowSummaryJsonIsCompact()
    {
        AscetStateMachineFlowSummary summary = new AscetStateMachineFlowSummary
        {
            ComponentPath = "DEMO\\SM",
            LanguageKind = AscetLanguageKind.ESDL,
            DiagramName = "Main",
            StateFlows = new List<AscetStateFlowRef>
            {
                new AscetStateFlowRef { StateName = "Idle", IsStartState = true },
                new AscetStateFlowRef { StateName = "Run", IsStartState = false }
            },
            TransitionFlows = new List<AscetTransitionFlowRef>
            {
                new AscetTransitionFlowRef { TransitionName = "Idle_to_Run", SourceState = "Idle", TargetState = "Run", Priority = 1 }
            },
            DependencyChains = new List<AscetDependencyChainRef>
            {
                new AscetDependencyChainRef { Scope = "transition", OwnerName = "Idle_to_Run" }
            },
            ReferenceTrace = new List<AscetReferenceTraceNodeRef>
            {
                new AscetReferenceTraceNodeRef { ComponentPath = "DEMO\\Dep" }
            },
            Summary = "Flow summary."
        };

        Dictionary<string, object> compact = DeserializeObject(AscetReadStateMachineFlow.FormatJsonOutput(summary, "summary"));
        AssertEqual("summary", GetString(compact, "DetailLevel"), "summary detail output should expose its detail level.");
        AssertTrue(!compact.ContainsKey("StateFlows"), "summary detail output should omit full StateFlows.");
        AssertTrue(!compact.ContainsKey("TransitionFlows"), "summary detail output should omit full TransitionFlows.");
        AssertEqual("2", GetString(GetDictionary(compact, "Counts"), "StateFlows"), "summary detail output should count states.");
        AssertEqual("1", GetString(GetDictionary(compact, "Counts"), "TransitionFlows"), "summary detail output should count transitions.");
        AssertEqual("1", GetString(GetDictionary(compact, "Counts"), "DependencyChains"), "summary detail output should count dependency chains.");
        AssertEqual("Idle", ToList(compact["StateNames"])[0].ToString(), "summary detail output should include state names.");
        AssertEqual("Idle_to_Run", ToList(compact["TransitionNames"])[0].ToString(), "summary detail output should include transition names.");

        Dictionary<string, object> full = DeserializeObject(AscetReadStateMachineFlow.FormatJsonOutput(summary, "full"));
        AssertTrue(full.ContainsKey("StateFlows"), "full detail output should preserve StateFlows.");
        AssertTrue(full.ContainsKey("TransitionFlows"), "full detail output should preserve TransitionFlows.");
        AssertTrue(!full.ContainsKey("DetailLevel"), "full detail output should preserve the previous payload shape.");
    }

    private static void TestReadBlockDiagramJsonDefaultsToSemanticGraph()
    {
        AscetBlockDiagramGraph graph = new AscetBlockDiagramGraph
        {
            ComponentPath = "ETAS_SystemLib\\Memory\\AccumulatorEnabled",
            ComponentKind = AscetComponentKind.Class,
            DiagramName = "Main",
            Elements = new List<AscetBlockElementRef>
            {
                new AscetBlockElementRef { Id = "12", Name = "memory", ElementKind = AscetBlockElementKind.FunctionalElement },
                new AscetBlockElementRef { Id = "15", Name = "max", ElementKind = AscetBlockElementKind.Operator },
                new AscetBlockElementRef { Id = "19", Name = "min", ElementKind = AscetBlockElementKind.Operator }
            },
            Pins = new List<AscetBlockPinRef>
            {
                new AscetBlockPinRef { ElementId = "15", ElementName = "max", PinName = "out#1", Direction = AscetBlockPinDirection.Output },
                new AscetBlockPinRef { ElementId = "12", ElementName = "memory", PinName = "set/aValue", Direction = AscetBlockPinDirection.Input, HasSequenceCall = true, SequenceCallId = "seq:12:set/aValue:1" }
            },
            SequenceCalls = new List<AscetSequenceCallRef>
            {
                new AscetSequenceCallRef { Id = "seq:12:set/aValue:1", SequenceNumber = 1, OwnerElementId = "12", OwnerElementName = "memory", OwnerPinName = "set/aValue", SequenceActivatorName = "compute", Position = new AscetBlockPointRef { X = 410, Y = 250 } }
            },
            HierarchyInternalPins = new List<AscetBlockHierarchyPinRef>(),
            Connections = new List<AscetBlockConnectionRef>
            {
                new AscetBlockConnectionRef
                {
                    Id = "Main:7",
                    DiagramName = "Main",
                    ConnectionTypeRaw = 6,
                    ConnectionType = AscetBlockConnectionSemantic.Unknown,
                    Source = new AscetBlockPinRef { ElementId = "15", ElementName = "max", PinName = "out#1", Direction = AscetBlockPinDirection.Output },
                    Target = new AscetBlockPinRef { ElementId = "12", ElementName = "memory", PinName = "set/aValue", Direction = AscetBlockPinDirection.Input, HasSequenceCall = true, SequenceCallId = "seq:12:set/aValue:1" },
                    SegmentPoints = new List<AscetBlockPointRef> { new AscetBlockPointRef { X = 350, Y = 250 }, new AscetBlockPointRef { X = 410, Y = 250 } }
                }
            }
        };

        Dictionary<string, object> payload = DeserializeObject(AscetReadBlockDiagram.FormatJsonOutput(graph));

        AssertEqual("ETAS_SystemLib\\Memory\\AccumulatorEnabled", GetString(payload, "componentPath"), "read_block_diagram should expose semantic componentPath.");
        AssertEqual("class", GetString(payload, "componentKind"), "read_block_diagram should expose semantic componentKind.");
        AssertEqual("Main", GetString(payload, "diagramName"), "read_block_diagram should expose semantic diagramName.");
        AssertTrue(payload.ContainsKey("nodes"), "semantic block diagram output should expose nodes.");
        AssertTrue(payload.ContainsKey("dataEdges"), "semantic block diagram output should expose dataEdges.");
        AssertTrue(payload.ContainsKey("controlEdges"), "semantic block diagram output should expose controlEdges.");
        AssertTrue(payload.ContainsKey("state"), "semantic block diagram output should expose state.");
        AssertTrue(payload.ContainsKey("operations"), "semantic block diagram output should expose operations.");
        AssertTrue(payload.ContainsKey("diagnostics"), "semantic block diagram output should expose diagnostics.");
        AssertTrue(payload.ContainsKey("evidence"), "semantic block diagram output should expose evidence.");
        AssertTrue(!payload.ContainsKey("Elements"), "semantic block diagram output should not expose raw Elements.");
        AssertTrue(!payload.ContainsKey("Pins"), "semantic block diagram output should not expose raw Pins.");
        AssertTrue(!payload.ContainsKey("Connections"), "semantic block diagram output should not expose raw Connections.");
        AssertTrue(!payload.ContainsKey("SequenceCalls"), "semantic block diagram output should not expose raw SequenceCalls.");

        IList dataEdges = ToList(payload["dataEdges"]);
        AssertEqual("1", Convert.ToString(dataEdges.Count), "raw=6 should be retained as a semantic data edge.");
        Dictionary<string, object> edge = dataEdges[0] as Dictionary<string, object>;
        AssertEqual("data", GetString(edge, "semanticKind"), "raw=6 should be semantic data.");
        AssertEqual("numeric", GetString(edge, "valueKind"), "raw=6 should be numeric data.");
        AssertEqual("numeric_data_path", GetString(edge, "role"), "raw=6 without a full clamp chain should remain a generic numeric data path.");
        Dictionary<string, object> evidence = GetDictionary(edge, "evidence");
        AssertEqual("6", GetString(evidence, "rawType"), "raw=6 evidence should keep the original raw type.");
        AssertEqual("NumericDataWithInternalFlag", GetString(evidence, "rawTypeName"), "raw=6 evidence should expose the mapped raw type name.");
    }

    private static void TestReadBlockDiagramSemanticOperationsTraceControlAndDataFlow()
    {
        AscetBlockDiagramGraph graph = new AscetBlockDiagramGraph
        {
            ComponentPath = "ETAS_SystemLib\\Memory\\AccumulatorEnabled",
            ComponentKind = AscetComponentKind.Class,
            DiagramName = "Main",
            Elements = new List<AscetBlockElementRef>
            {
                new AscetBlockElementRef { Id = "12", Name = "memory", ElementKind = AscetBlockElementKind.FunctionalElement },
                new AscetBlockElementRef { Id = "15", Name = "max", ElementKind = AscetBlockElementKind.Operator },
                new AscetBlockElementRef { Id = "19", Name = "min", ElementKind = AscetBlockElementKind.Operator },
                new AscetBlockElementRef { Id = "23", Name = "compute/mn", ElementKind = AscetBlockElementKind.FunctionalElement },
                new AscetBlockElementRef { Id = "26", Name = "compute/mx", ElementKind = AscetBlockElementKind.FunctionalElement },
                new AscetBlockElementRef { Id = "29", Name = "compute/enable", ElementKind = AscetBlockElementKind.FunctionalElement },
                new AscetBlockElementRef { Id = "32", Name = "+", ElementKind = AscetBlockElementKind.Operator },
                new AscetBlockElementRef { Id = "36", Name = "compute/value", ElementKind = AscetBlockElementKind.FunctionalElement },
                new AscetBlockElementRef { Id = "42", Name = "IfThen", ElementKind = AscetBlockElementKind.ControlElement }
            },
            Pins = new List<AscetBlockPinRef>(),
            SequenceCalls = new List<AscetSequenceCallRef>
            {
                new AscetSequenceCallRef { Id = "seq:12:set/aValue:1", SequenceNumber = 1, OwnerElementId = "12", OwnerElementName = "memory", OwnerPinName = "set/aValue", SequenceActivatorName = String.Empty },
                new AscetSequenceCallRef { Id = "seq:42:Cond/Cond:1", SequenceNumber = 1, OwnerElementId = "42", OwnerElementName = "IfThen", OwnerPinName = "Cond/Cond", SequenceActivatorName = "compute" }
            },
            HierarchyInternalPins = new List<AscetBlockHierarchyPinRef>(),
            Connections = new List<AscetBlockConnectionRef>
            {
                new AscetBlockConnectionRef
                {
                    Id = "Main:4",
                    DiagramName = "Main",
                    ConnectionTypeRaw = 2,
                    Source = new AscetBlockPinRef { ElementId = "12", ElementName = "memory", PinName = "get/get", Direction = AscetBlockPinDirection.Output },
                    Target = new AscetBlockPinRef { ElementId = "32", ElementName = "+", PinName = "in#2", Direction = AscetBlockPinDirection.Input }
                },
                new AscetBlockConnectionRef
                {
                    Id = "Main:5",
                    DiagramName = "Main",
                    ConnectionTypeRaw = 6,
                    Source = new AscetBlockPinRef { ElementId = "19", ElementName = "min", PinName = "out#1", Direction = AscetBlockPinDirection.Output },
                    Target = new AscetBlockPinRef { ElementId = "15", ElementName = "max", PinName = "in#1", Direction = AscetBlockPinDirection.Input }
                },
                new AscetBlockConnectionRef
                {
                    Id = "Main:6",
                    DiagramName = "Main",
                    ConnectionTypeRaw = 2,
                    Source = new AscetBlockPinRef { ElementId = "32", ElementName = "+", PinName = "out#1", Direction = AscetBlockPinDirection.Output },
                    Target = new AscetBlockPinRef { ElementId = "19", ElementName = "min", PinName = "in#1", Direction = AscetBlockPinDirection.Input }
                },
                new AscetBlockConnectionRef
                {
                    Id = "Main:7",
                    DiagramName = "Main",
                    ConnectionTypeRaw = 6,
                    Source = new AscetBlockPinRef { ElementId = "15", ElementName = "max", PinName = "out#1", Direction = AscetBlockPinDirection.Output },
                    Target = new AscetBlockPinRef { ElementId = "12", ElementName = "memory", PinName = "set/aValue", Direction = AscetBlockPinDirection.Input, HasSequenceCall = true, SequenceCallId = "seq:12:set/aValue:1" }
                },
                new AscetBlockConnectionRef
                {
                    Id = "Main:8",
                    DiagramName = "Main",
                    ConnectionTypeRaw = 2,
                    Source = new AscetBlockPinRef { ElementId = "26", ElementName = "compute/mx", PinName = "get/get", Direction = AscetBlockPinDirection.Output },
                    Target = new AscetBlockPinRef { ElementId = "19", ElementName = "min", PinName = "in#2", Direction = AscetBlockPinDirection.Input }
                },
                new AscetBlockConnectionRef
                {
                    Id = "Main:9",
                    DiagramName = "Main",
                    ConnectionTypeRaw = 2,
                    Source = new AscetBlockPinRef { ElementId = "23", ElementName = "compute/mn", PinName = "get/get", Direction = AscetBlockPinDirection.Output },
                    Target = new AscetBlockPinRef { ElementId = "15", ElementName = "max", PinName = "in#2", Direction = AscetBlockPinDirection.Input }
                },
                new AscetBlockConnectionRef
                {
                    Id = "Main:10",
                    DiagramName = "Main",
                    ConnectionTypeRaw = 256,
                    ConnectionType = AscetBlockConnectionSemantic.Sequence,
                    Source = new AscetBlockPinRef { ElementId = "42", ElementName = "IfThen", PinName = "Then/1", Direction = AscetBlockPinDirection.Output },
                    Target = new AscetBlockPinRef { ElementId = "12", ElementName = "memory", PinName = "in#0", Direction = AscetBlockPinDirection.Input }
                },
                new AscetBlockConnectionRef
                {
                    Id = "Main:11",
                    DiagramName = "Main",
                    ConnectionTypeRaw = 1,
                    Source = new AscetBlockPinRef { ElementId = "29", ElementName = "compute/enable", PinName = "get/get", Direction = AscetBlockPinDirection.Output },
                    Target = new AscetBlockPinRef { ElementId = "42", ElementName = "IfThen", PinName = "Cond/Cond", Direction = AscetBlockPinDirection.Input, HasSequenceCall = true, SequenceCallId = "seq:42:Cond/Cond:1" }
                },
                new AscetBlockConnectionRef
                {
                    Id = "Main:12",
                    DiagramName = "Main",
                    ConnectionTypeRaw = 2,
                    Source = new AscetBlockPinRef { ElementId = "36", ElementName = "compute/value", PinName = "get/get", Direction = AscetBlockPinDirection.Output },
                    Target = new AscetBlockPinRef { ElementId = "32", ElementName = "+", PinName = "in#1", Direction = AscetBlockPinDirection.Input }
                }
            }
        };

        Dictionary<string, object> payload = DeserializeObject(AscetReadBlockDiagram.FormatJsonOutput(graph));
        Dictionary<string, object> compute = GetDictionaryFromListByString(payload, "operations", "method", "compute");
        AssertContainsString(GetStringList(compute, "reads"), "memory", "compute should trace state feedback through max/min/+.");
        AssertContainsString(GetStringList(compute, "reads"), "value", "compute should trace value through +.");
        AssertContainsString(GetStringList(compute, "reads"), "mx", "compute should trace max bound input.");
        AssertContainsString(GetStringList(compute, "reads"), "mn", "compute should trace min bound input.");
        AssertContainsString(GetStringList(compute, "reads"), "enable", "compute should include its guard input in reads.");
        AssertContainsString(GetStringList(compute, "guards"), "enable", "compute should expose enable as a guard.");
        AssertContainsString(GetStringList(compute, "writes"), "memory", "compute should infer memory write from the controlled assignment.");
        AssertEqual("memory = max(min(memory + value, mx), mn)", GetString(compute, "effect"), "compute should summarize the accumulator clamp effect.");

        IList dataEdges = ToList(payload["dataEdges"]);
        int limitRaw6Edges = 0;
        for (int i = 0; i < dataEdges.Count; i++)
        {
            Dictionary<string, object> edge = dataEdges[i] as Dictionary<string, object>;
            Dictionary<string, object> evidence = GetDictionary(edge, "evidence");
            if (String.Equals(GetString(evidence, "rawType"), "6", StringComparison.Ordinal)
                && String.Equals(GetString(edge, "role"), "limit_data_path", StringComparison.Ordinal))
            {
                limitRaw6Edges++;
            }
        }

        AssertEqual("2", Convert.ToString(limitRaw6Edges), "min/max raw=6 edges should be classified as limit data paths.");
    }

    private static Dictionary<string, object> GetDictionary(Dictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null)
        {
            return null;
        }

        return payload[key] as Dictionary<string, object>;
    }

    private static Dictionary<string, object> DeserializeObject(string json)
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return serializer.DeserializeObject(json) as Dictionary<string, object>;
    }

    private static Dictionary<string, object> GetFirstDictionaryFromList(Dictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key))
        {
            throw new Exception("Expected payload key '" + key + "'.");
        }

        IList values = ToList(payload[key]);
        if (values == null || values.Count == 0)
        {
            throw new Exception("Expected non-empty list for '" + key + "'.");
        }

        Dictionary<string, object> item = values[0] as Dictionary<string, object>;
        if (item == null)
        {
            throw new Exception("Expected first '" + key + "' entry to be an object.");
        }

        return item;
    }

    private static Dictionary<string, object> GetDictionaryFromListByString(Dictionary<string, object> payload, string listKey, string key, string value)
    {
        if (payload == null || !payload.ContainsKey(listKey))
        {
            throw new Exception("Expected payload key '" + listKey + "'.");
        }

        IList values = ToList(payload[listKey]);
        if (values == null)
        {
            throw new Exception("Expected list for '" + listKey + "'.");
        }

        for (int i = 0; i < values.Count; i++)
        {
            Dictionary<string, object> item = values[i] as Dictionary<string, object>;
            if (item != null && String.Equals(GetString(item, key), value, StringComparison.Ordinal))
            {
                return item;
            }
        }

        throw new Exception("Expected '" + listKey + "' to contain an object where '" + key + "' is '" + value + "'.");
    }

    private static bool GetBool(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return false;
        }

        object value = payload[key];
        if (value is bool)
        {
            return (bool)value;
        }

        bool parsed;
        return Boolean.TryParse(value.ToString(), out parsed) && parsed;
    }

    private static List<string> GetStringList(Dictionary<string, object> payload, string key)
    {
        List<string> result = new List<string>();
        if (payload == null || !payload.ContainsKey(key))
        {
            return result;
        }

        IList values = ToList(payload[key]);
        if (values == null)
        {
            return result;
        }

        for (int i = 0; i < values.Count; i++)
        {
            result.Add(values[i] == null ? String.Empty : values[i].ToString());
        }

        return result;
    }

    private static IList ToList(object value)
    {
        if (value == null)
        {
            return null;
        }

        ArrayList arrayList = value as ArrayList;
        if (arrayList != null)
        {
            return arrayList;
        }

        object[] objectArray = value as object[];
        if (objectArray != null)
        {
            return objectArray;
        }

        return value as IList;
    }

    private static string GetString(Dictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return payload[key].ToString();
    }

    private static void AssertContainsString(IList<string> values, string expected, string message)
    {
        if (values == null)
        {
            throw new Exception(message + ": expected list to contain '" + expected + "'.");
        }

        for (int i = 0; i < values.Count; i++)
        {
            if (String.Equals(values[i], expected, StringComparison.Ordinal))
            {
                return;
            }
        }

        throw new Exception(message + ": expected list to contain '" + expected + "'.");
    }

    private static void AssertInvalidArgument(Action action, string message)
    {
        try
        {
            action();
        }
        catch (AscetReadException ex)
        {
            AssertEqual("invalid_argument", ex.Code, message);
            return;
        }

        throw new Exception(message);
    }

    private static void AssertEqual(string expected, string actual, string message)
    {
        if (!String.Equals(expected, actual, StringComparison.Ordinal))
        {
            throw new Exception(message + ". Expected '" + expected + "', got '" + actual + "'.");
        }
    }

    private static void AssertTrue(bool condition, string message)
    {
        if (!condition)
        {
            throw new Exception(message);
        }
    }

    private static void AssertFalse(bool condition, string message)
    {
        if (condition)
        {
            throw new Exception(message);
        }
    }
    private static void TestWarmSearchIndexComponentsPartitionKeepsProjectsAsObjects()
    {
        Dictionary<string, object> payload = AscetWarmSearchIndex.BuildPayload(
            new List<AscetItemRef>
            {
                new AscetItemRef
                {
                    Name = "AEB_Project",
                    Path = "PlatformLibrary\\Package\\AEB\\AEB_Project",
                    Kind = AscetComponentKind.Project,
                    LanguageKind = AscetLanguageKind.Unknown
                },
                new AscetItemRef
                {
                    Name = "AEB_Controller",
                    Path = "PlatformLibrary\\Package\\AEB\\AEB_Controller",
                    Kind = AscetComponentKind.Class,
                    LanguageKind = AscetLanguageKind.ESDL
                }
            },
            new AscetDatabaseRef { Name = "DemoDb", Path = "C:\\ASCET\\DemoDb" },
            0,
            0,
            0,
            "components",
            false,
            String.Empty);

        IList components = ToList(payload["components"]);
        AssertEqual("2", Convert.ToString(components.Count), "components partition should keep Project objects in the object index");
        Dictionary<string, object> project = (Dictionary<string, object>)components[0];
        AssertEqual("project", GetString(project, "kind"), "warm_search_index should serialize Project entries with kind=project");
        AssertEqual("project", GetString(project, "objectKind"), "warm_search_index should serialize Project entries with objectKind=project");
        AssertEqual("container", GetString(project, "targetKind"), "warm_search_index should preserve Project entries as container targets");
        AssertEqual("1", Convert.ToString(payload["scannedComponents"]), "warm_search_index should not deep-scan Project objects");
        AssertEqual("2", Convert.ToString(GetDictionary(payload, "counts")["components"]), "warm_search_index counts should include Project objects");
    }

    private static bool ListContains(IList<string> values, string expected)
    {
        if (values == null)
        {
            return false;
        }

        for (int i = 0; i < values.Count; i++)
        {
            if (String.Equals(values[i], expected, StringComparison.Ordinal))
            {
                return true;
            }
        }

        return false;
    }

    private static string FindPathUpwards(params string[] relativeParts)
    {
        string cursor = AppDomain.CurrentDomain.BaseDirectory;
        while (!String.IsNullOrWhiteSpace(cursor))
        {
            string candidate = cursor;
            for (int i = 0; i < relativeParts.Length; i++)
            {
                candidate = Path.Combine(candidate, relativeParts[i]);
            }

            string fullPath = Path.GetFullPath(candidate);
            if (File.Exists(fullPath))
            {
                return fullPath;
            }

            DirectoryInfo parent = Directory.GetParent(cursor);
            if (parent == null)
            {
                break;
            }

            cursor = parent.FullName;
        }

        throw new Exception("Failed to resolve required path from base directory '" + AppDomain.CurrentDomain.BaseDirectory + "'.");
    }
}
