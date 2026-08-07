using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Web.Script.Serialization;

public static class AscetCliExecWriteSmoke
{
    private static readonly JavaScriptSerializer Serializer = new JavaScriptSerializer();

    public static int Main()
    {
        try
        {
            TestCapabilitiesAdvertiseRepresentativeWriteOperations();
            TestCreateComponentSuccessEnvelope();
            TestSetMethodCodeFailureEnvelope();
            TestSetMethodCodeEmptyFileFailureEnvelope();
            TestApplyElementSpecParseFailureEnvelope();
            TestApplyElementSpecRejectsAmbiguousDiscModelType();
            TestApplyElementSpecCalibrationContract();
            TestApplyElementSpecAllowsParameterLimitAssignmentsForWritableParameterScopesAndBareImported();
            TestApplyElementSpecRejectsParameterRangeWithExplicitLimitAssignmentsFalse();
            TestApplyElementSpecStrictRangeContract();
            TestApplyElementSpecParameterRangeIgnoresToolApiLimitAssignmentReadback();
            TestApplyElementSpecDiffUsesStrictRangeFieldNames();
            TestApplyElementSpecDiffDoesNotMarkImplicitParameterLimitAssignments();
            TestDiffElementSpecIncompatibleFieldDiffsJson();
            TestApplyElementSpecOutputIncludesElementResults();
            TestApplyElementSpecPassesExplicitProjectPath();
            TestApplyElementSpecDeleteMissingPromotesRestoreMode();
            TestApplyElementSpecRestoreDeleteMissingVerification();
            TestApplyElementSpecRetriesVerificationAfterStaleDiff();
            TestApplyElementSpecRangeReadbackUnavailablePolicy();
            TestApplyElementSpecRejectsUnavailablePhysicalRangeReadback();
            TestApplyElementSpecRejectsUnavailableImplementationRangeReadback();
            TestArtifactPathResolverTranslatesUnixTempPaths();
            TestCodeFileReadersTranslateUnixTempPaths();
            TestStateMachineSetMethodRejectsFullStateMachineDefinitions();
            TestProxyErrorNormalizationPreservesStateMachineSelectors();

            Console.WriteLine("AscetCliExecWriteSmoke passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
        finally
        {
            ExecCommand.ResetServicesForTesting();
        }
    }

    private static void TestCapabilitiesAdvertiseRepresentativeWriteOperations()
    {
        CommandResult command = RunCapturing(delegate()
        {
            return CapabilitiesCommand.Run(new string[] { "--json" });
        });

        AssertEqual(0, command.ExitCode, "capabilities should succeed.");
        Dictionary<string, object> envelope = DeserializeEnvelope(command.Stdout);
        AssertTrue(GetBool(envelope, "ok"), "capabilities should report ok=true.");

        Dictionary<string, object> result = GetDictionary(envelope, "result");
        AssertTrue(result != null, "capabilities should include a result object.");
        AssertContains(GetList(result, "operations"), "create_component", "capabilities should advertise create_component once exec wiring exists.");
        AssertContains(GetList(result, "operations"), "set_method_code", "capabilities should advertise set_method_code once exec wiring exists.");
        AssertContains(GetList(result, "operations"), "apply_element_spec", "capabilities should advertise apply_element_spec once exec wiring exists.");
        AssertContains(GetList(result, "operations"), "set_element_dependency", "capabilities should advertise set_element_dependency once exec wiring exists.");
        AssertNotContains(GetList(result, "hostOperations"), "create_component", "host capabilities should not advertise write operations.");
        AssertNotContains(GetList(result, "hostOperations"), "set_method_code", "host capabilities should not advertise write operations.");
        AssertNotContains(GetList(result, "hostOperations"), "apply_element_spec", "host capabilities should not advertise write operations.");
        AssertNotContains(GetList(result, "hostOperations"), "set_element_dependency", "host capabilities should not advertise dependency writes.");
    }

    private static void TestCreateComponentSuccessEnvelope()
    {
        ExecCommand.SetServicesForTesting(
            new FakeComponentWriteService(
                BuildSuccessResult(
                    "create_component",
                    7L,
                    "Created Demo\\Controller.",
                    new Dictionary<string, object>
                    {
                        { "componentPath", "Demo\\Controller" },
                        { "folderPath", "Demo" },
                        { "componentName", "Controller" },
                        { "kind", "class" },
                        { "languageKind", "ESDL" },
                        { "created", true }
                    })),
            null,
            null);

        CommandResult command = RunCapturing(delegate()
        {
            return ExecCommand.Run(new string[] { "create_component", "Demo\\Controller", "--kind", "class", "--language", "ESDL" });
        });

        AssertEqual(0, command.ExitCode, "create_component should succeed.");
        Dictionary<string, object> envelope = DeserializeEnvelope(command.Stdout);
        AssertTrue(GetBool(envelope, "ok"), "create_component should report ok=true.");

        Dictionary<string, object> result = GetDictionary(envelope, "result");
        AssertTrue(result != null, "create_component should include a result object.");
        AssertEqual("create_component", GetString(result, "operationName"), "create_component should preserve operationName.");
        AssertEqual(7, GetInt(result, "sequenceNumber", -1), "create_component should preserve sequenceNumber.");
        AssertTrue(GetBool(result, "writeSucceeded"), "create_component should preserve writeSucceeded.");
        AssertEqual("Created Demo\\Controller.", GetString(result, "summary"), "create_component should preserve the summary.");

        Dictionary<string, object> verification = GetDictionary(result, "verification");
        AssertTrue(verification != null, "create_component should include verification.");
        AssertTrue(GetBool(verification, "requested"), "create_component verification should preserve requested.");
        AssertTrue(GetBool(verification, "attempted"), "create_component verification should preserve attempted.");
        AssertTrue(GetBool(verification, "succeeded"), "create_component verification should preserve succeeded.");

        Dictionary<string, object> payload = GetDictionary(result, "payload");
        AssertTrue(payload != null, "create_component should include payload.");
        AssertEqual("Demo\\Controller", GetString(payload, "componentPath"), "create_component payload should preserve componentPath.");
        AssertEqual("class", GetString(payload, "kind"), "create_component payload should preserve kind.");
        AssertTrue(GetBool(payload, "verifyReadbackRequested"), "create_component payload should reflect executor verification request.");
        AssertTrue(GetBool(payload, "readbackVerified"), "create_component payload should reflect executor verification success.");
    }

    private static void TestSetMethodCodeFailureEnvelope()
    {
        ExecCommand.SetServicesForTesting(
            null,
            new FakeMethodCodeWriteService(
                BuildFailureResult(
                    "set_method_code",
                    9L,
                    "Method code did not round-trip.",
                    "readback_mismatch",
                    "verify",
                    new Dictionary<string, object>
                    {
                        { "componentPath", "Demo\\Controller" },
                        { "methodName", "Main" }
                    })),
            null);

        CommandResult command = RunCapturing(delegate()
        {
            return ExecCommand.Run(new string[] { "set_method_code", "Demo\\Controller", "Main", "demo.esdl" });
        });

        AssertEqual(2, command.ExitCode, "set_method_code should surface structured failures with exit code 2.");
        Dictionary<string, object> envelope = DeserializeEnvelope(command.Stdout);
        AssertTrue(!GetBool(envelope, "ok"), "set_method_code should report ok=false.");

        Dictionary<string, object> error = GetDictionary(envelope, "error");
        AssertTrue(error != null, "set_method_code should include an error object.");
        AssertEqual("readback_mismatch", GetString(error, "code"), "set_method_code should preserve the structured error code.");
        AssertEqual("Method code did not round-trip.", GetString(error, "message"), "set_method_code should preserve the structured error message.");
        AssertEqual("set_method_code", GetString(error, "operation"), "set_method_code should preserve the failing operation.");
        AssertEqual("verify", GetString(error, "stage"), "set_method_code should preserve the failing stage.");

        Dictionary<string, object> details = GetDictionary(error, "details");
        AssertTrue(details != null, "set_method_code should include structured error details.");
        AssertEqual("Demo\\Controller", GetString(details, "componentPath"), "set_method_code details should preserve the componentPath.");
        AssertEqual("Main", GetString(details, "methodName"), "set_method_code details should preserve the methodName.");
    }

    private static void TestApplyElementSpecParseFailureEnvelope()
    {
        ExecCommand.SetServicesForTesting(
            null,
            null,
            new FakeElementSpecWriteService(new AscetReadException(
                "spec_file_not_found",
                "read_spec_file",
                "Spec file 'missing-spec.json' was not found.")));

        CommandResult command = RunCapturing(delegate()
        {
            return ExecCommand.Run(new string[] { "apply_element_spec", "Demo\\Controller", "missing-spec.json" });
        });

        AssertEqual(2, command.ExitCode, "apply_element_spec should surface structured failures with exit code 2.");
        Dictionary<string, object> envelope = DeserializeEnvelope(command.Stdout);
        AssertTrue(!GetBool(envelope, "ok"), "apply_element_spec should report ok=false.");

        Dictionary<string, object> error = GetDictionary(envelope, "error");
        AssertTrue(error != null, "apply_element_spec should include an error object.");
        AssertEqual("spec_file_not_found", GetString(error, "code"), "apply_element_spec should preserve parse failures.");
        AssertEqual("Spec file 'missing-spec.json' was not found.", GetString(error, "message"), "apply_element_spec should preserve the parse failure message.");
        AssertEqual("read_spec_file", GetString(error, "operation"), "apply_element_spec should preserve the failing input operation.");
        AssertEqual("input", GetString(error, "stage"), "apply_element_spec parse failures should use the structured input stage.");
        AssertEqual("AscetReadException", GetString(error, "exceptionType"), "apply_element_spec should preserve the exception type.");
        AssertTrue(GetDictionary(error, "details") != null, "apply_element_spec should include structured error details.");
    }

    private static void TestApplyElementSpecRejectsAmbiguousDiscModelType()
    {
        string json = "{\"elements\":[{\"name\":\"sample\",\"kind\":\"variable\",\"modelType\":\"disc\",\"scope\":\"local\"}]}";
        try
        {
            AscetElementSpecDocumentParser.ParseJson(json);
            throw new Exception("apply_element_spec should reject ambiguous modelType disc before ToolAPI writes.");
        }
        catch (AscetReadException ex)
        {
            AssertEqual("invalid_element_spec", ex.Code, "ambiguous modelType disc should be an invalid element spec.");
            AssertEqual("parse_element_spec", ex.Operation, "ambiguous modelType disc should fail during spec parsing.");
            AssertTrue(ex.Message.IndexOf("modelType 'disc'", StringComparison.Ordinal) >= 0, "ambiguous modelType disc should produce a clear message.");
        }
    }

    private static void TestApplyElementSpecCalibrationContract()
    {
        AscetElementSpecDocument document = AscetElementSpecDocumentParser.ParseJson(
            "{\"elements\":[{\"name\":\"gain\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"exported\",\"calibration\":true}]}");
        AssertTrue(document.Elements != null && document.Elements.Count == 1, "calibration spec should parse one element.");
        AssertTrue(document.Elements[0].Calibration == true, "calibration spec should preserve true.");

        try
        {
            AscetElementSpecDocumentParser.ParseJson(
                "{\"elements\":[{\"name\":\"gain\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"exported\",\"calibration\":\"true\"}]}");
            throw new Exception("apply_element_spec should reject non-boolean calibration.");
        }
        catch (AscetReadException ex)
        {
            AssertEqual("invalid_element_spec", ex.Code, "non-boolean calibration should be invalid element spec.");
            AssertEqual("parse_element_spec", ex.Operation, "non-boolean calibration should fail during parse.");
        }

        try
        {
            AscetElementSpecDocumentParser.ParseJson(
                "{\"elements\":[{\"name\":\"controller\",\"kind\":\"component\",\"referencedComponentPath\":\"ETAS_SystemLib\\\\Bitoperations\\\\shiftRight\",\"calibration\":true}]}");
            throw new Exception("apply_element_spec should reject component calibration.");
        }
        catch (AscetReadException ex)
        {
            AssertEqual("invalid_element_spec", ex.Code, "component calibration should be invalid element spec.");
            AssertEqual("parse_element_spec", ex.Operation, "component calibration should fail during parse.");
        }

        ComponentElementSyncPlanner planner = new ComponentElementSyncPlanner();
        AscetElementSyncPlan plan = planner.Plan(
            document,
            new List<AscetExistingElementState>
            {
                new AscetExistingElementState
                {
                    Name = "gain",
                    Kind = AscetElementSpecKind.Parameter,
                    ModelType = "cont",
                    Scope = "exported",
                    Calibration = false
                }
            },
            true,
            true);
        AssertTrue(plan.ElementsToUpdate != null && plan.ElementsToUpdate.Count == 1, "calibration-only change should plan an update.");

        bool rejected = false;
        try
        {
            planner.EnsureReadbackCompatible(
                document.Elements[0],
                new AscetExistingElementState
                {
                    Name = "gain",
                    Kind = AscetElementSpecKind.Parameter,
                    ModelType = "cont",
                    Scope = "exported",
                    Calibration = false
                });
        }
        catch (AscetReadException ex)
        {
            rejected = String.Equals(ex.Code, "readback_mismatch", StringComparison.Ordinal);
        }

        AssertTrue(rejected, "calibration readback mismatch should be rejected.");
    }

    private static void TestApplyElementSpecAllowsParameterLimitAssignmentsForWritableParameterScopesAndBareImported()
    {
        string[] scopes = new[] { "exported", "local" };
        for (int i = 0; i < scopes.Length; i++)
        {
            string scope = scopes[i];
            AscetElementSpecDocument document = AscetElementSpecDocumentParser.ParseJson(
                "{\"elements\":[{\"name\":\"gain_" + scope + "\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"" + scope + "\",\"physicalRange\":{\"min\":0,\"max\":100},\"impl\":{\"valueType\":\"uint16\",\"limitAssignments\":true}}]}");
            AscetElementSpec element = document.Elements[0];
            AssertEqual(scope, element.Scope, "parameter scope should round-trip for " + scope + ".");
            AssertTrue(element.PhysicalRange != null, "parameter physicalRange should parse for " + scope + ".");
            AssertTrue(element.Impl != null, "parameter impl should parse for " + scope + ".");
            AssertTrue(element.Impl.ImplementationRange == null, "parameter impl.implementationRange should not be required for " + scope + ".");
            AssertTrue(element.Impl.LimitAssignments.HasValue && element.Impl.LimitAssignments.Value, "parameter limitAssignments should be preserved for " + scope + ".");
        }

        AscetElementSpecDocument imported = AscetElementSpecDocumentParser.ParseJson(
            "{\"elements\":[{\"name\":\"gain_imported\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"imported\"}]}");
        AssertEqual("imported", imported.Elements[0].Scope, "bare imported parameter scope should parse.");
        AssertTrue(imported.Elements[0].Impl == null, "imported parameter should not require local implementation settings.");
    }

    private static void TestApplyElementSpecRejectsParameterRangeWithExplicitLimitAssignmentsFalse()
    {
        AssertRejectsElementSpec(
            "{\"elements\":[{\"name\":\"gain\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"local\",\"physicalRange\":{\"min\":0,\"max\":100},\"impl\":{\"valueType\":\"uint16\",\"limitAssignments\":false}}]}",
            "invalid_element_spec",
            "parameter range writes should reject explicit limitAssignments=false.");
    }

    private static void TestApplyElementSpecStrictRangeContract()
    {
        AscetElementSpecDocument document = AscetElementSpecDocumentParser.ParseJson(
            "{\"elements\":[{\"name\":\"gain\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"exported\",\"physicalRange\":{\"min\":0,\"max\":100},\"impl\":{\"valueType\":\"uint16\",\"formula\":\"ident\"}}]}");
        AscetElementSpec element = document.Elements[0];
        AssertEqual("0", Convert.ToString(element.PhysicalRange.Min, System.Globalization.CultureInfo.InvariantCulture), "physicalRange.min should parse.");
        AssertEqual("100", Convert.ToString(element.PhysicalRange.Max, System.Globalization.CultureInfo.InvariantCulture), "physicalRange.max should parse.");

        AscetElementSpecDocument implDocument = AscetElementSpecDocumentParser.ParseJson(
            "{\"elements\":[{\"name\":\"gainImpl\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"exported\",\"impl\":{\"valueType\":\"uint16\",\"implementationRange\":{\"min\":0,\"max\":1000},\"formula\":\"ident\"}}]}");
        AscetElementSpec implElement = implDocument.Elements[0];
        AssertEqual("0", Convert.ToString(implElement.Impl.ImplementationRange.Min, System.Globalization.CultureInfo.InvariantCulture), "impl.implementationRange.min should parse.");
        AssertEqual("1000", Convert.ToString(implElement.Impl.ImplementationRange.Max, System.Globalization.CultureInfo.InvariantCulture), "impl.implementationRange.max should parse.");

        AssertRejectsElementSpec(
            "{\"elements\":[{\"name\":\"gainBoth\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"exported\",\"physicalRange\":{\"min\":0,\"max\":100},\"impl\":{\"valueType\":\"uint16\",\"implementationRange\":{\"min\":0,\"max\":1000}}}]}",
            "invalid_element_spec",
            "physicalRange and impl.implementationRange should be mutually exclusive.");
        AssertRejectsElementSpec(
            "{\"elements\":[{\"name\":\"gainImported\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"imported\",\"physicalRange\":{\"min\":0,\"max\":100}}]}",
            "invalid_element_spec",
            "imported parameter should reject local range settings.");

        AssertRejectsElementSpec(
            "{\"elements\":[{\"name\":\"gain\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"exported\",\"min\":0,\"max\":100}]}",
            "invalid_element_spec_legacy_field",
            "legacy top-level min/max should be rejected.");
        AssertRejectsElementSpec(
            "{\"elements\":[{\"name\":\"gain\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"exported\",\"impl\":{\"min\":0,\"max\":100}}]}",
            "invalid_element_spec_legacy_field",
            "legacy impl.min/max should be rejected.");
        AssertRejectsElementSpec(
            "{\"elements\":[{\"name\":\"gain\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"exported\",\"dependency\":\"dependent\"}]}",
            "dependency_not_element_spec",
            "dependency should not be accepted in element spec.");
        AssertRejectsElementSpec(
            "{\"elements\":[{\"name\":\"calc/p_CmpF_MC1\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"local\"}]}",
            "method_signature_not_element_spec",
            "method argument paths should be rejected from element spec.");
        AssertRejectsElementSpec(
            "{\"elements\":[{\"name\":\"gain\",\"kind\":\"argument\",\"modelType\":\"cont\",\"scope\":\"local\"}]}",
            "method_signature_not_element_spec",
            "method argument kind should direct callers to set_method_signature.");
    }

    private static void TestApplyElementSpecParameterRangeIgnoresToolApiLimitAssignmentReadback()
    {
        AscetElementSpecDocument document = AscetElementSpecDocumentParser.ParseJson(
            "{\"elements\":[{\"name\":\"gain\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"local\",\"physicalRange\":{\"min\":0,\"max\":100}}]}");

        ComponentElementSyncPlanner planner = new ComponentElementSyncPlanner();
        planner.EnsureReadbackCompatible(
            document.Elements[0],
            new AscetExistingElementState
            {
                Name = "gain",
                Kind = AscetElementSpecKind.Parameter,
                ModelType = "cont",
                Scope = "local",
                PhysicalRange = "[0, 100]",
                LimitAssignments = false
            });
    }

    private static void TestApplyElementSpecOutputIncludesElementResults()
    {
        AscetElementSyncResult result = new AscetElementSyncResult
        {
            ComponentPath = "Demo\\Controller",
            ComponentKind = AscetComponentKind.Class,
            LanguageKind = AscetLanguageKind.ESDL,
            CreatedElements = new List<string> { "gain" },
            UpdatedElements = new List<string>(),
            SkippedElements = new List<string>(),
            RemovedElements = new List<string>(),
            IncompatibleElements = new List<string>(),
            Issues = new List<string>(),
            ElementResults = new List<AscetElementSyncItemResult>
            {
                new AscetElementSyncItemResult
                {
                    Name = "gain",
                    Kind = "parameter",
                    Status = "created",
                    ChangedFields = new List<string> { "physicalRange", "impl.implementationRange" },
                    ReadbackVerified = true
                }
            },
            Summary = new AscetElementSyncSummary
            {
                Created = 1,
                Updated = 0,
                Skipped = 0,
                Failed = 0,
                Removed = 0,
                Incompatible = 0
            },
            WriteSucceeded = true,
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            Mode = AscetElementApplyMode.Apply
        };

        Dictionary<string, object> payload = Serializer.Deserialize<Dictionary<string, object>>(AscetApplyElementSpec.FormatJsonOutput(result));
        AssertTrue(GetList(payload, "ElementResults").Count == 1, "apply_element_spec JSON should include per-element results.");
        Dictionary<string, object> first = GetList(payload, "ElementResults")[0] as Dictionary<string, object>;
        AssertTrue(first != null, "ElementResults entries should be objects.");
        AssertEqual("gain", GetString(first, "name"), "ElementResults should preserve element name.");
        AssertEqual("created", GetString(first, "status"), "ElementResults should preserve element status.");
        AssertContains(GetList(first, "changedFields"), "physicalRange", "ElementResults should use new physicalRange field name.");
        AssertContains(GetList(first, "changedFields"), "impl.implementationRange", "ElementResults should use new implementation range field name.");

        Dictionary<string, object> summary = GetDictionary(payload, "Summary");
        AssertTrue(summary != null, "apply_element_spec JSON should include a structured Summary object.");
        AssertEqual(1, GetInt(summary, "created", -1), "Summary should include created count.");
    }

    private static void TestApplyElementSpecDiffUsesStrictRangeFieldNames()
    {
        AscetElementSpecDocument document = AscetElementSpecDocumentParser.ParseJson(
            "{\"elements\":[{\"name\":\"gainPhys\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"exported\",\"physicalRange\":{\"min\":0,\"max\":100},\"impl\":{\"valueType\":\"uint16\"}},{\"name\":\"gainImpl\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"exported\",\"impl\":{\"valueType\":\"uint16\",\"implementationRange\":{\"min\":0,\"max\":1000}}}]}");

        ComponentElementSyncPlanner planner = new ComponentElementSyncPlanner();
        AscetElementSpecDiffResult diff = planner.BuildDiff(
            "Demo\\Controller",
            document,
            new List<AscetExistingElementState>
            {
                new AscetExistingElementState
                {
                    Name = "gainPhys",
                    Kind = AscetElementSpecKind.Parameter,
                    ModelType = "cont",
                    Scope = "exported",
                    PhysicalRange = "[0, 10]",
                    ValueType = "uint16",
                    ImplRange = "[0, 10]"
                },
                new AscetExistingElementState
                {
                    Name = "gainImpl",
                    Kind = AscetElementSpecKind.Parameter,
                    ModelType = "cont",
                    Scope = "exported",
                    PhysicalRange = "[0, 10]",
                    ValueType = "uint16",
                    ImplRange = "[0, 10]"
                }
            });

        AssertTrue(diff.ModifiedElements != null && diff.ModifiedElements.Count == 2, "range changes should produce two modified elements.");
        IList physicalChanges = ToNonGenericList(diff.ModifiedElements[0].FieldChanges);
        IList implChanges = ToNonGenericList(diff.ModifiedElements[1].FieldChanges);
        AssertContains(physicalChanges, "physicalRange", "diff should report physicalRange instead of legacy min/max.");
        AssertContains(implChanges, "impl.implementationRange", "diff should report impl.implementationRange instead of legacy impl.min/max.");
        AssertNotContains(physicalChanges, "min/max", "diff should not report legacy top-level range field names.");
        AssertNotContains(implChanges, "impl.min/max", "diff should not report legacy implementation range field names.");
    }

    private static void TestApplyElementSpecDiffDoesNotMarkImplicitParameterLimitAssignments()
    {
        AscetElementSpecDocument document = AscetElementSpecDocumentParser.ParseJson(
            "{\"elements\":[{\"name\":\"gain\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"local\",\"physicalRange\":{\"min\":0,\"max\":100}}]}");

        ComponentElementSyncPlanner planner = new ComponentElementSyncPlanner();
        AscetElementSpecDiffResult diff = planner.BuildDiff(
            "Demo\\Controller",
            document,
            new List<AscetExistingElementState>
            {
                new AscetExistingElementState
                {
                    Name = "gain",
                    Kind = AscetElementSpecKind.Parameter,
                    ModelType = "cont",
                    Scope = "local",
                    PhysicalRange = "[0, 100]",
                    LimitAssignments = false
                }
            });

        AssertTrue(diff.ModifiedElements == null || diff.ModifiedElements.Count == 0, "matching parameter range diff should not mark immutable ToolAPI limitAssignments changes.");
    }

    private static void TestDiffElementSpecIncompatibleFieldDiffsJson()
    {
        AscetElementSpecDiffResult diff = new AscetElementSpecDiffResult
        {
            ComponentPath = "DEMO\\PID",
            IncompatibleElements = new List<AscetElementIncompatibleDiff>
            {
                new AscetElementIncompatibleDiff
                {
                    Name = "gain",
                    Kind = "Parameter",
                    ChangeKind = "Incompatible",
                    FieldChanges = new List<string> { "kind" },
                    FieldDiffs = new List<AscetElementFieldDiff>
                    {
                        new AscetElementFieldDiff
                        {
                            Field = "kind",
                            Left = "Variable",
                            Right = "Parameter",
                            Reason = "requires_recreate"
                        }
                    },
                    Reason = "kind mismatch",
                    RequiresRecreate = true,
                    LeftSignature = "Variable gain",
                    RightSignature = "Parameter gain"
                }
            }
        };

        Dictionary<string, object> payload = Serializer.Deserialize<Dictionary<string, object>>(AscetDiffElementSpec.FormatJsonOutput(diff, false));
        IList incompatible = GetList(payload, "IncompatibleElements");
        AssertTrue(incompatible != null && incompatible.Count == 1, "diff_element_spec should expose incompatible elements.");

        Dictionary<string, object> entry = incompatible[0] as Dictionary<string, object>;
        AssertTrue(entry != null, "diff_element_spec incompatible entries should be objects.");

        IList fieldDiffs = GetList(entry, "FieldDiffs");
        AssertTrue(fieldDiffs != null && fieldDiffs.Count == 1, "diff_element_spec should expose structured FieldDiffs.");

        Dictionary<string, object> fieldDiff = fieldDiffs[0] as Dictionary<string, object>;
        AssertTrue(fieldDiff != null, "diff_element_spec FieldDiffs entries should be objects.");
        AssertEqual("kind", GetString(fieldDiff, "field"), "FieldDiffs should expose field.");
        AssertEqual("Variable", GetString(fieldDiff, "left"), "FieldDiffs should expose left value.");
        AssertEqual("Parameter", GetString(fieldDiff, "right"), "FieldDiffs should expose right value.");
        AssertEqual("requires_recreate", GetString(fieldDiff, "reason"), "FieldDiffs should expose reason.");
    }

    private static void AssertRejectsElementSpec(string json, string expectedCode, string message)
    {
        try
        {
            AscetElementSpecDocumentParser.ParseJson(json);
            throw new Exception(message);
        }
        catch (AscetReadException ex)
        {
            AssertEqual(expectedCode, ex.Code, message);
            AssertEqual("parse_element_spec", ex.Operation, message);
        }
    }

    private static IList ToNonGenericList(IList<string> values)
    {
        ArrayList result = new ArrayList();
        if (values == null)
        {
            return result;
        }

        for (int i = 0; i < values.Count; i++)
        {
            result.Add(values[i]);
        }
        return result;
    }

    private static void TestApplyElementSpecPassesExplicitProjectPath()
    {
        FakeComponentElementSyncService syncService = new FakeComponentElementSyncService(
            new AscetElementSyncResult
            {
                ComponentPath = "Demo\\_TestSuite\\Controller",
                ComponentKind = AscetComponentKind.Class,
                LanguageKind = AscetLanguageKind.ESDL,
                CreatedElements = new List<string>(),
                UpdatedElements = new List<string>(),
                SkippedElements = new List<string>(),
                RemovedElements = new List<string>(),
                IncompatibleElements = new List<string>(),
                Issues = new List<string>(),
                WriteSucceeded = true,
                VerifyReadbackRequested = false,
                ReadbackVerified = true,
                Mode = AscetElementApplyMode.Apply,
                DeleteMissingRequested = false,
                RecreateIncompatibleRequested = false
            },
            new AscetElementSpecDiffResult());
        ElementSpecWriteService service = new ElementSpecWriteService(syncService, null);

        service.Execute(new ApplyElementSpecWriteRequest
        {
            ComponentPath = "Demo\\_TestSuite\\Controller",
            ProjectPath = "Demo\\Project",
            Spec = new AscetElementSpecDocument { Elements = new List<AscetElementSpec>() },
            Mode = AscetElementApplyMode.Apply,
            DeleteMissing = false,
            RecreateIncompatible = false,
            VerifyReadback = false
        });

        AssertTrue(syncService.LastOptions != null, "apply_element_spec should pass apply options into the sync service.");
        AssertEqual("Demo\\Project", syncService.LastOptions.ProjectPath, "apply_element_spec should preserve explicit projectPath.");
    }

    private static void TestApplyElementSpecRangeReadbackUnavailablePolicy()
    {
        AssertTrue(AscetElementSyncSpecRules.IsRangeReadbackUnavailable(String.Empty), "empty range readback should be treated as unavailable.");
        AssertTrue(AscetElementSyncSpecRules.IsRangeReadbackUnavailable("   "), "blank range readback should be treated as unavailable.");
        AssertTrue(AscetElementSyncSpecRules.IsRangeReadbackUnavailable("<unreadable>"), "explicit unreadable range readback should be treated as unavailable.");
        AssertTrue(!AscetElementSyncSpecRules.IsRangeReadbackUnavailable("[-oo, oo]"), "readable infinity range should not be treated as unavailable.");
        AssertTrue(!AscetElementSyncSpecRules.IsRangeReadbackUnavailable("[0, 100]"), "readable finite range should not be treated as unavailable.");
    }

    private static void TestApplyElementSpecRejectsUnavailablePhysicalRangeReadback()
    {
        AscetElementSpecDocument document = AscetElementSpecDocumentParser.ParseJson(
            "{\"elements\":[{\"name\":\"gain\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"exported\",\"physicalRange\":{\"min\":0,\"max\":100}}]}");

        ComponentElementSyncPlanner planner = new ComponentElementSyncPlanner();
        try
        {
            planner.EnsureReadbackCompatible(
                document.Elements[0],
                new AscetExistingElementState
                {
                    Name = "gain",
                    Kind = AscetElementSpecKind.Parameter,
                    ModelType = "cont",
                    Scope = "exported",
                    PhysicalRange = String.Empty
                });
            throw new Exception("apply_element_spec should reject unavailable physicalRange readback after a finite range was requested.");
        }
        catch (AscetReadException ex)
        {
            AssertEqual("readback_mismatch", ex.Code, "unavailable requested physicalRange readback should be a mismatch.");
            AssertTrue(ex.Message.IndexOf("unreadable physicalRange", StringComparison.Ordinal) >= 0, "unavailable requested physicalRange readback should name physicalRange.");
        }
    }

    private static void TestApplyElementSpecRejectsUnavailableImplementationRangeReadback()
    {
        AscetElementSpecDocument document = AscetElementSpecDocumentParser.ParseJson(
            "{\"elements\":[{\"name\":\"gain\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"exported\",\"impl\":{\"valueType\":\"uint16\",\"implementationRange\":{\"min\":0,\"max\":1000}}}]}");

        ComponentElementSyncPlanner planner = new ComponentElementSyncPlanner();
        try
        {
            planner.EnsureReadbackCompatible(
                document.Elements[0],
                new AscetExistingElementState
                {
                    Name = "gain",
                    Kind = AscetElementSpecKind.Parameter,
                    ModelType = "cont",
                    Scope = "exported",
                    ValueType = "uint16",
                    ImplRange = String.Empty
                });
            throw new Exception("apply_element_spec should reject unavailable impl.implementationRange readback after a finite range was requested.");
        }
        catch (AscetReadException ex)
        {
            AssertEqual("readback_mismatch", ex.Code, "unavailable requested impl.implementationRange readback should be a mismatch.");
            AssertTrue(ex.Message.IndexOf("unreadable impl.implementationRange", StringComparison.Ordinal) >= 0, "unavailable requested impl.implementationRange readback should name impl.implementationRange.");
        }
    }

    private static void TestApplyElementSpecDeleteMissingPromotesRestoreMode()
    {
        AscetApplyElementSpecArguments parsed = AscetApplyElementSpec.ParseArguments(new string[]
        {
            "Demo\\Controller",
            "spec.json",
            "--delete-missing"
        });

        AssertTrue(parsed.Mode == AscetElementApplyMode.Restore, "apply_element_spec delete-missing should promote mode to restore.");
        AssertTrue(parsed.DeleteMissing, "apply_element_spec delete-missing should preserve the deleteMissing flag.");
    }

    private static void TestApplyElementSpecRestoreDeleteMissingVerification()
    {
        ElementSpecWriteService service = new ElementSpecWriteService(
            new FakeComponentElementSyncService(
                new AscetElementSyncResult
                {
                    ComponentPath = "Demo\\Controller",
                    ComponentKind = AscetComponentKind.Class,
                    LanguageKind = AscetLanguageKind.ESDL,
                    CreatedElements = new List<string>(),
                    UpdatedElements = new List<string>(),
                    SkippedElements = new List<string>(),
                    RemovedElements = new List<string>(),
                    IncompatibleElements = new List<string>(),
                    Issues = new List<string>(),
                    WriteSucceeded = true,
                    VerifyReadbackRequested = false,
                    ReadbackVerified = false,
                    Mode = AscetElementApplyMode.Restore,
                    DeleteMissingRequested = true,
                    RecreateIncompatibleRequested = false
                },
                new AscetElementSpecDiffResult
                {
                    ComponentPath = "Demo\\Controller",
                    AddedElements = new List<AscetElementCatalogEntry>(),
                    RemovedElements = new List<AscetElementCatalogEntry> { new AscetElementCatalogEntry { Name = "stale" } },
                    ModifiedElements = new List<AscetElementModifiedDiff>(),
                    IncompatibleElements = new List<AscetElementIncompatibleDiff>(),
                    SkippedElements = new List<AscetElementCatalogEntry>()
                }),
            null);

        AscetWriteExecutionResult result = service.Execute(new ApplyElementSpecWriteRequest
        {
            ComponentPath = "Demo\\Controller",
            Spec = new AscetElementSpecDocument { Elements = new List<AscetElementSpec>() },
            Mode = AscetElementApplyMode.Restore,
            DeleteMissing = true,
            RecreateIncompatible = false,
            VerifyReadback = true
        });

        AssertTrue(!result.Succeeded, "apply_element_spec should fail verification when restore/delete-missing leaves removable drift.");
        AssertTrue(result.Error != null, "apply_element_spec restore/delete-missing mismatch should surface a structured error.");
        AssertEqual("readback_mismatch", result.Error.Code, "apply_element_spec restore/delete-missing mismatch should preserve readback_mismatch.");
        AssertEqual("apply_element_spec", result.Error.Operation, "apply_element_spec restore/delete-missing mismatch should preserve operation.");
        AssertEqual("verify", result.Error.Stage, "apply_element_spec restore/delete-missing mismatch should preserve verify stage.");
    }

    private static void TestApplyElementSpecRetriesVerificationAfterStaleDiff()
    {
        FakeComponentElementSyncService syncService = new FakeComponentElementSyncService(
            new AscetElementSyncResult
            {
                ComponentPath = "Demo\\Controller",
                ComponentKind = AscetComponentKind.Class,
                LanguageKind = AscetLanguageKind.ESDL,
                CreatedElements = new List<string> { "batch_input" },
                UpdatedElements = new List<string>(),
                SkippedElements = new List<string>(),
                RemovedElements = new List<string>(),
                IncompatibleElements = new List<string>(),
                Issues = new List<string>(),
                WriteSucceeded = true,
                VerifyReadbackRequested = false,
                ReadbackVerified = false,
                Mode = AscetElementApplyMode.Apply,
                DeleteMissingRequested = false,
                RecreateIncompatibleRequested = false
            },
            new AscetElementSpecDiffResult
            {
                ComponentPath = "Demo\\Controller",
                AddedElements = new List<AscetElementCatalogEntry> { new AscetElementCatalogEntry { Name = "batch_input" } },
                RemovedElements = new List<AscetElementCatalogEntry>(),
                ModifiedElements = new List<AscetElementModifiedDiff>(),
                IncompatibleElements = new List<AscetElementIncompatibleDiff>(),
                SkippedElements = new List<AscetElementCatalogEntry>()
            },
            new AscetElementSpecDiffResult
            {
                ComponentPath = "Demo\\Controller",
                AddedElements = new List<AscetElementCatalogEntry>(),
                RemovedElements = new List<AscetElementCatalogEntry>(),
                ModifiedElements = new List<AscetElementModifiedDiff>(),
                IncompatibleElements = new List<AscetElementIncompatibleDiff>(),
                SkippedElements = new List<AscetElementCatalogEntry>()
            });
        ElementSpecWriteService service = new ElementSpecWriteService(syncService, null);

        AscetWriteExecutionResult result = service.Execute(new ApplyElementSpecWriteRequest
        {
            ComponentPath = "Demo\\Controller",
            Spec = new AscetElementSpecDocument { Elements = new List<AscetElementSpec>() },
            Mode = AscetElementApplyMode.Apply,
            DeleteMissing = false,
            RecreateIncompatible = false,
            VerifyReadback = true
        });

        AssertTrue(result.Succeeded, "apply_element_spec should tolerate one stale post-write diff when refreshed verification matches.");
        AssertEqual("2", syncService.DiffCallCount.ToString(), "apply_element_spec should retry verification once after a stale diff.");
    }

    private static void TestArtifactPathResolverTranslatesUnixTempPaths()
    {
        string tempRoot = Path.Combine(Path.GetTempPath(), "ascet-artifact-path-resolver-smoke");
        Directory.CreateDirectory(tempRoot);
        string file = Path.Combine(tempRoot, "formula.json");
        File.WriteAllText(file, "{\"formulas\":[]}");

        try
        {
            string resolved = AscetArtifactPathResolver.ResolveReadableFilePath("/tmp/ascet-artifact-path-resolver-smoke/formula.json");
            AssertEqual(file, resolved, "artifact path resolver should map /tmp paths to the Windows temp directory before File.Exists.");
        }
        finally
        {
            try
            {
                if (File.Exists(file))
                {
                    File.Delete(file);
                }
            }
            catch
            {
            }
        }
    }

    private static void TestCodeFileReadersTranslateUnixTempPaths()
    {
        string tempRoot = Path.Combine(Path.GetTempPath(), "ascet-code-file-reader-smoke");
        Directory.CreateDirectory(tempRoot);
        string classMethodFile = Path.Combine(tempRoot, "class-method.esdl");
        string moduleFile = Path.Combine(tempRoot, "module.esdl");
        File.WriteAllText(classMethodFile, "return;");
        File.WriteAllText(moduleFile, "process {}");

        try
        {
            AssertEqual("return;", AscetSetClassMethodCode.ReadCodeFile("/tmp/ascet-code-file-reader-smoke/class-method.esdl"), "set_class_method_code should resolve /tmp codeFile paths on Windows.");
            AssertEqual("process {}", AscetSetModuleCode.ReadCodeFile("/tmp/ascet-code-file-reader-smoke/module.esdl"), "set_module_code should resolve /tmp codeFile paths on Windows.");
        }
        finally
        {
            try
            {
                if (File.Exists(classMethodFile))
                {
                    File.Delete(classMethodFile);
                }
                if (File.Exists(moduleFile))
                {
                    File.Delete(moduleFile);
                }
            }
            catch
            {
            }
        }
    }

    private static void TestStateMachineSetMethodRejectsFullStateMachineDefinitions()
    {
        string tempFile = Path.GetTempFileName();
        try
        {
            File.WriteAllText(tempFile, "statemachine DemoSm { state Init; }");
            AscetSetStateMachineCode.ReadCodeFile(tempFile, AscetSetStateMachineCodeOperation.SetMethod);
            throw new Exception("set_state_machine_code set-method should reject full state-machine definitions before ToolAPI writes.");
        }
        catch (AscetReadException ex)
        {
            AssertEqual("invalid_code_file", ex.Code, "set_state_machine_code set-method full definitions should be invalid_code_file.");
            AssertEqual("read_code_file", ex.Operation, "set_state_machine_code set-method full definitions should fail during code-file reading.");
            AssertTrue(ex.Message.IndexOf("method body", StringComparison.OrdinalIgnoreCase) >= 0, "set_state_machine_code set-method full definitions should explain that a method body is required.");
        }
        finally
        {
            try
            {
                if (File.Exists(tempFile))
                {
                    File.Delete(tempFile);
                }
            }
            catch
            {
            }
        }
    }

    private static void TestProxyErrorNormalizationPreservesStateMachineSelectors()
    {
        AssertEqual(
            "state_not_found",
            ExecCommand.NormalizeProxyErrorCodeForTesting(
                "legacy_proxy_failed",
                "State 'Idle' was not found in component 'Demo\\Controller'."),
            "proxy error normalization should preserve missing state errors.");
        AssertEqual(
            "transition_not_found",
            ExecCommand.NormalizeProxyErrorCodeForTesting(
                "legacy_proxy_failed",
                "Transition selector 'Idle->Run#1' was not found in component 'Demo\\Controller'."),
            "proxy error normalization should preserve missing transition errors.");
    }

    private static void TestSetMethodCodeEmptyFileFailureEnvelope()
    {
        ExecCommand.ResetServicesForTesting();

        string tempFile = Path.GetTempFileName();
        try
        {
            File.WriteAllText(tempFile, String.Empty);

            CommandResult command = RunCapturing(delegate()
            {
                return ExecCommand.Run(new string[] { "set_method_code", "Demo\\Controller", "Main", tempFile });
            });

            AssertEqual(2, command.ExitCode, "set_method_code should surface empty code files as structured failures.");
            Dictionary<string, object> envelope = DeserializeEnvelope(command.Stdout);
            AssertTrue(!GetBool(envelope, "ok"), "set_method_code should report ok=false for empty code files.");

            Dictionary<string, object> error = GetDictionary(envelope, "error");
            AssertTrue(error != null, "set_method_code should include an error object for empty code files.");
            AssertEqual("invalid_code_file", GetString(error, "code"), "set_method_code should preserve invalid_code_file.");
            AssertEqual("read_code_file", GetString(error, "operation"), "set_method_code should preserve the failing input operation.");
            AssertEqual("input", GetString(error, "stage"), "set_method_code empty code file failures should use the structured input stage.");
            AssertEqual("AscetReadException", GetString(error, "exceptionType"), "set_method_code should preserve the exception type.");
            AssertTrue(GetDictionary(error, "details") != null, "set_method_code should include structured error details.");
        }
        finally
        {
            try
            {
                if (File.Exists(tempFile))
                {
                    File.Delete(tempFile);
                }
            }
            catch
            {
            }
        }
    }

    private static AscetWriteExecutionResult BuildSuccessResult(string operationName, long sequenceNumber, string summary, Dictionary<string, object> payload)
    {
        AscetWriteExecutionResult result = new AscetWriteExecutionResult();
        result.OperationName = operationName;
        result.SequenceNumber = sequenceNumber;
        result.Succeeded = true;
        result.WriteSucceeded = true;
        result.Summary = summary;
        result.Payload = payload ?? new Dictionary<string, object>(StringComparer.Ordinal);
        result.Verification = new WriteVerificationResult
        {
            Requested = true,
            Attempted = true,
            Succeeded = true,
            Summary = "verified"
        };
        return result;
    }

    private static AscetWriteExecutionResult BuildFailureResult(string operationName, long sequenceNumber, string message, string code, string stage, Dictionary<string, object> details)
    {
        AscetWriteExecutionResult result = new AscetWriteExecutionResult();
        result.OperationName = operationName;
        result.SequenceNumber = sequenceNumber;
        result.Succeeded = false;
        result.WriteSucceeded = true;
        result.Summary = String.Empty;
        result.Payload = new Dictionary<string, object>(StringComparer.Ordinal);
        result.Verification = new WriteVerificationResult
        {
            Requested = true,
            Attempted = true,
            Succeeded = false,
            Summary = String.Empty
        };
        result.Error = new AscetWriteError
        {
            Code = code,
            Operation = operationName,
            Stage = stage,
            Message = message,
            ExceptionType = "AscetReadException",
            Details = details ?? new Dictionary<string, object>(StringComparer.Ordinal)
        };
        return result;
    }

    private static CommandResult RunCapturing(Func<int> command)
    {
        TextWriter originalOut = Console.Out;
        TextWriter originalError = Console.Error;
        StringWriter stdout = new StringWriter();
        StringWriter stderr = new StringWriter();

        try
        {
            Console.SetOut(stdout);
            Console.SetError(stderr);

            CommandResult result = new CommandResult();
            result.ExitCode = command == null ? 0 : command();
            result.Stdout = stdout.ToString();
            result.Stderr = stderr.ToString();
            return result;
        }
        finally
        {
            Console.SetOut(originalOut);
            Console.SetError(originalError);
        }
    }

    private static Dictionary<string, object> DeserializeEnvelope(string json)
    {
        if (String.IsNullOrWhiteSpace(json))
        {
            throw new Exception("Expected JSON output but stdout was empty.");
        }

        return Serializer.Deserialize<Dictionary<string, object>>(json);
    }

    private static Dictionary<string, object> GetDictionary(Dictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key))
        {
            return null;
        }

        return payload[key] as Dictionary<string, object>;
    }

    private static IList GetList(Dictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return new object[0];
        }

        IList list = payload[key] as IList;
        return list ?? new object[0];
    }

    private static bool GetBool(Dictionary<string, object> payload, string key)
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
        return Boolean.TryParse(Convert.ToString(value), out parsed) && parsed;
    }

    private static string GetString(Dictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return Convert.ToString(payload[key]) ?? String.Empty;
    }

    private static int GetInt(Dictionary<string, object> payload, string key, int defaultValue)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return defaultValue;
        }

        try
        {
            return Convert.ToInt32(payload[key]);
        }
        catch
        {
            return defaultValue;
        }
    }

    private static void AssertContains(IList list, string expected, string message)
    {
        if (list == null)
        {
            throw new Exception(message);
        }

        for (int i = 0; i < list.Count; i++)
        {
            if (String.Equals(Convert.ToString(list[i]) ?? String.Empty, expected ?? String.Empty, StringComparison.Ordinal))
            {
                return;
            }
        }

        throw new Exception(message);
    }

    private static void AssertNotContains(IList list, string unexpected, string message)
    {
        if (list == null)
        {
            return;
        }

        for (int i = 0; i < list.Count; i++)
        {
            if (String.Equals(Convert.ToString(list[i]) ?? String.Empty, unexpected ?? String.Empty, StringComparison.Ordinal))
            {
                throw new Exception(message);
            }
        }
    }

    private static void AssertTrue(bool condition, string message)
    {
        if (!condition)
        {
            throw new Exception(message);
        }
    }

    private static void AssertEqual(string expected, string actual, string message)
    {
        if (!String.Equals(expected ?? String.Empty, actual ?? String.Empty, StringComparison.Ordinal))
        {
            throw new Exception(message + " Expected '" + expected + "' but got '" + actual + "'.");
        }
    }

    private static void AssertEqual(int expected, int actual, string message)
    {
        if (expected != actual)
        {
            throw new Exception(message + " Expected '" + expected + "' but got '" + actual + "'.");
        }
    }

    private sealed class CommandResult
    {
        public int ExitCode { get; set; }
        public string Stdout { get; set; }
        public string Stderr { get; set; }
    }

    private sealed class FakeComponentWriteService : IExecComponentWriteService
    {
        private readonly AscetWriteExecutionResult result;

        public FakeComponentWriteService(AscetWriteExecutionResult result)
        {
            this.result = result;
        }

        public CreateComponentWriteRequest ParseExecArguments(string[] args)
        {
            return new CreateComponentWriteRequest();
        }

        public AscetWriteExecutionResult Execute(CreateComponentWriteRequest request)
        {
            return result;
        }
    }

    private sealed class FakeMethodCodeWriteService : IExecMethodCodeWriteService
    {
        private readonly AscetWriteExecutionResult result;

        public FakeMethodCodeWriteService(AscetWriteExecutionResult result)
        {
            this.result = result;
        }

        public SetMethodCodeWriteRequest ParseExecArguments(string[] args)
        {
            return new SetMethodCodeWriteRequest();
        }

        public AscetWriteExecutionResult Execute(SetMethodCodeWriteRequest request)
        {
            return result;
        }
    }

    private sealed class FakeElementSpecWriteService : IExecElementSpecWriteService
    {
        private readonly Exception parseFailure;

        public FakeElementSpecWriteService(Exception parseFailure)
        {
            this.parseFailure = parseFailure;
        }

        public ApplyElementSpecWriteRequest ParseExecArguments(string[] args)
        {
            throw parseFailure;
        }

        public AscetWriteExecutionResult Execute(ApplyElementSpecWriteRequest request)
        {
            throw new Exception("Execute should not be called when parsing fails.");
        }
    }

    private sealed class FakeComponentElementSyncService : IComponentElementSyncService
    {
        private readonly AscetElementSyncResult applyResult;
        private readonly Queue<AscetElementSpecDiffResult> diffResults;

        public FakeComponentElementSyncService(AscetElementSyncResult applyResult, AscetElementSpecDiffResult diffResult)
            : this(applyResult, new AscetElementSpecDiffResult[] { diffResult })
        {
        }

        public FakeComponentElementSyncService(AscetElementSyncResult applyResult, params AscetElementSpecDiffResult[] diffResults)
        {
            this.applyResult = applyResult;
            this.diffResults = new Queue<AscetElementSpecDiffResult>(diffResults ?? new AscetElementSpecDiffResult[0]);
        }

        public AscetElementCatalogReadResult ReadCatalog(AscetItemRef component)
        {
            throw new NotSupportedException("ReadCatalog is not used in this smoke.");
        }

        public AscetElementSpecDiffResult Diff(AscetItemRef component, AscetElementSpecDocument spec)
        {
            DiffCallCount++;
            if (diffResults.Count == 0)
            {
                return new AscetElementSpecDiffResult();
            }

            AscetElementSpecDiffResult result = diffResults.Dequeue();
            if (diffResults.Count == 0)
            {
                diffResults.Enqueue(result);
            }

            return result;
        }

        public AscetElementSyncResult Apply(AscetItemRef component, AscetElementSpecDocument spec, bool verifyReadback)
        {
            return applyResult;
        }

        public AscetElementApplyOptions LastOptions { get; private set; }
        public int DiffCallCount { get; private set; }

        public AscetElementSyncResult Apply(AscetItemRef component, AscetElementSpecDocument spec, AscetElementApplyOptions options, bool verifyReadback)
        {
            LastOptions = options;
            return applyResult;
        }
    }
}
