using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

public static class AscetBatchWriteSmoke
{
    private static readonly JavaScriptSerializer Serializer = new JavaScriptSerializer();

    public static int Main()
    {
        try
        {
            TestBatchWriteUsesStructuredEnvelopeAndPreservesRequestMapping();
            TestBatchWriteExecutorSerializesAndAssignsSequenceNumbers();
            TestBatchWriteExecutorSupportsUnifiedWriteOnlyOperations();
            TestBatchWriteExecutorDefaultsCreateComponentAndMethodRequests();
            TestBatchWriteExecutorSupportsDeleteOperations();
            TestBatchWriteRejectsConflictingDeleteMissingPolicies();
            TestBatchWriteRespectsVerifyReadbackFalse();
            TestBatchWritePromotesDeleteMissingToRestoreMode();
            TestElementSpecParserAllowsExportedVariablePhysicalRange();
            TestBuiltCliBatchWriteEntryPoint();
            Console.WriteLine("AscetBatchWriteSmoke passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
        finally
        {
            BatchCommand.ResetBatchWriteExecutorForTesting();
        }
    }

    private static void TestBatchWriteUsesStructuredEnvelopeAndPreservesRequestMapping()
    {
        FakeBatchWriteExecutor fake = new FakeBatchWriteExecutor();
        BatchCommand.SetBatchWriteExecutorForTesting(fake);

        Dictionary<string, object> input = new Dictionary<string, object>();
        input["requests"] = new object[]
        {
            new Dictionary<string, object>
            {
                { "id", "req-create" },
                { "operation", "create_component" },
                { "args", new Dictionary<string, object> { { "componentPath", "Demo\\Controller" }, { "kind", "class" } } }
            },
            new Dictionary<string, object>
            {
                { "id", "req-method" },
                { "operation", "set_method_code" },
                { "args", new Dictionary<string, object> { { "componentPath", "Demo\\Controller" }, { "methodName", "Main" } } }
            },
            new Dictionary<string, object>
            {
                { "id", "req-spec" },
                { "operation", "apply_element_spec" },
                { "args", new Dictionary<string, object> { { "componentPath", "Demo\\Controller" } } }
            }
        };

        string stdout;
        int exitCode = RunBatchCommand(Serializer.Serialize(input), out stdout);

        AssertEqual(2, exitCode, "batch write should return structured-error exit code 2 when any item fails.");
        AssertEqual(3, fake.Requests.Count, "batch write should forward every parsed request to the executor.");
        AssertEqual("req-create", fake.Requests[0].id, "first request id should be preserved.");
        AssertEqual("create_component", fake.Requests[0].operation, "first request operation should be preserved.");
        AssertEqual("req-method", fake.Requests[1].id, "second request id should be preserved.");
        AssertEqual("set_method_code", fake.Requests[1].operation, "second request operation should be preserved.");
        AssertEqual("req-spec", fake.Requests[2].id, "third request id should be preserved.");
        AssertEqual("apply_element_spec", fake.Requests[2].operation, "third request operation should be preserved.");

        Dictionary<string, object> envelope = Serializer.Deserialize<Dictionary<string, object>>(stdout);
        AssertTrue(GetBool(envelope, "ok"), "valid batch write should return an ok envelope.");

        Dictionary<string, object> result = GetDictionary(envelope, "result");
        AssertTrue(result != null, "batch write should return a result payload.");
        AssertEqual("write", GetString(result, "lane"), "batch result should preserve the lane.");

        IList results = GetList(result, "results");
        AssertEqual(3, results.Count, "batch result should contain one entry per request.");

        Dictionary<string, object> first = results[0] as Dictionary<string, object>;
        Dictionary<string, object> second = results[1] as Dictionary<string, object>;
        Dictionary<string, object> third = results[2] as Dictionary<string, object>;
        AssertTrue(first != null, "first batch result should be an object.");
        AssertTrue(second != null, "second batch result should be an object.");
        AssertTrue(third != null, "third batch result should be an object.");

        AssertEqual("req-create", GetString(first, "id"), "first batch result should preserve request id.");
        AssertTrue(GetBool(first, "ok"), "first batch result should succeed.");
        AssertEqual("req-method", GetString(second, "id"), "second batch result should preserve request id.");
        AssertTrue(!GetBool(second, "ok"), "second batch result should surface executor item failure.");
        AssertEqual("req-spec", GetString(third, "id"), "third batch result should preserve request id.");
        AssertTrue(GetBool(third, "ok"), "third batch result should succeed.");

        Dictionary<string, object> firstPayload = GetDictionary(first, "result");
        AssertCanonicalMutationResult(firstPayload, true, "successful batch write item");
        AssertEqual("create_component", GetString(firstPayload, "operationName"), "successful batch write item should preserve operation name.");
        AssertEqual(41, GetInt(firstPayload, "sequenceNumber", -1), "successful batch write item should preserve sequence number.");
        AssertTrue(GetBool(firstPayload, "writeSucceeded"), "successful batch write item should preserve writeSucceeded.");
        Dictionary<string, object> firstVerification = GetDictionary(firstPayload, "verification");
        AssertTrue(firstVerification != null, "successful batch write item should include verification.");
        AssertTrue(GetBool(firstVerification, "requested"), "successful batch write verification should preserve requested.");
        AssertTrue(GetBool(firstVerification, "attempted"), "successful batch write verification should preserve attempted.");
        AssertTrue(GetBool(firstVerification, "succeeded"), "successful batch write verification should preserve succeeded.");

        Dictionary<string, object> secondError = GetDictionary(second, "error");
        AssertTrue(secondError != null, "failed batch write item should include an error object.");
        AssertEqual("readback_mismatch", GetString(secondError, "code"), "failed batch write item should preserve the structured error code.");
        AssertEqual("set_method_code", GetString(secondError, "operation"), "failed batch write item should preserve the structured failing operation.");
        Dictionary<string, object> secondErrorDetails = GetDictionary(secondError, "details");
        AssertTrue(secondErrorDetails != null, "failed batch write item should include structured details.");
        AssertEqual("verify", GetString(secondErrorDetails, "stage"), "failed batch write item should preserve the structured failing stage.");
        Dictionary<string, object> secondPayload = GetDictionary(second, "result");
        AssertCanonicalMutationResult(secondPayload, false, "failed batch write item");
        AssertEqual("unknown", GetString(secondPayload, "mutationStatus"), "mutation-started batch failure should preserve unknown mutation status.");
        Dictionary<string, object> secondRecovery = GetDictionary(secondPayload, "recovery");
        AssertTrue(secondRecovery != null && GetBool(secondRecovery, "required"), "mutation-started batch failure should require recovery reconciliation.");

        Dictionary<string, object> thirdPayload = GetDictionary(third, "result");
        AssertCanonicalMutationResult(thirdPayload, true, "third batch write item");
        AssertTrue(GetBool(thirdPayload, "ReadbackVerified"), "apply_element_spec result should preserve readback verification at the canonical result level.");
        AssertTrue(!thirdPayload.ContainsKey("payload"), "batch write items must not wrap action evidence in result.payload.");

        Dictionary<string, object> meta = GetDictionary(envelope, "meta");
        AssertTrue(meta != null, "batch write should return meta.");
        AssertEqual(1, GetInt(envelope, "protocolVersion", -1), "batch write envelope should preserve protocol version.");
        AssertEqual("batch", GetString(meta, "mode"), "batch write meta.mode should be batch.");
        AssertTrue(GetBool(meta, "mutationStarted"), "batch write envelope should report that the mutating batch started.");
    }

    private static void TestBatchWriteExecutorSerializesAndAssignsSequenceNumbers()
    {
        List<string> callOrder = new List<string>();
        AscetBatchWriteExecutor executor = new AscetBatchWriteExecutor(
            new FakeComponentWriteService(callOrder, "create_component"),
            new FakeMethodWriteService(callOrder, "set_method_code"),
            new FakeElementSpecWriteService(callOrder, "apply_element_spec"));

        IList<AscetBatchResultItemDto> results = executor.Execute(new List<AscetBatchRequestItemDto>
        {
            new AscetBatchRequestItemDto
            {
                id = "req-create",
                operation = "create_component",
                args = new Dictionary<string, object>
                {
                    { "componentPath", "Demo\\Controller" },
                    { "kind", "class" },
                    { "language", "ESDL" }
                }
            },
            new AscetBatchRequestItemDto
            {
                id = "req-method",
                operation = "set_method_code",
                args = new Dictionary<string, object>
                {
                    { "componentPath", "Demo\\Controller" },
                    { "methodName", "Main" },
                    { "code", "code-body" },
                    { "verifyReadback", true }
                }
            },
            new AscetBatchRequestItemDto
            {
                id = "req-spec",
                operation = "apply_element_spec",
                args = new Dictionary<string, object>
                {
                    { "componentPath", "Demo\\Controller" },
                    { "spec", new Dictionary<string, object> { { "elements", new object[0] } } },
                    { "verifyReadback", true }
                }
            }
        });

        AssertEqual(3, results.Count, "batch write executor should emit one result per request.");
        AssertEqual(3, callOrder.Count, "batch write executor should execute requests serially in order.");
        AssertEqual("create_component", callOrder[0], "first write should execute first.");
        AssertEqual("set_method_code", callOrder[1], "second write should execute second.");
        AssertEqual("apply_element_spec", callOrder[2], "third write should execute third.");

        Dictionary<string, object> first = results[0].result as Dictionary<string, object>;
        Dictionary<string, object> second = results[1].result as Dictionary<string, object>;
        Dictionary<string, object> third = results[2].result as Dictionary<string, object>;
        AssertTrue(first != null, "first executor result should be an object.");
        AssertTrue(second != null, "second executor result should be an object.");
        AssertTrue(third != null, "third executor result should be an object.");
        AssertCanonicalMutationResult(first, true, "first executor result");
        AssertCanonicalMutationResult(second, true, "second executor result");
        AssertCanonicalMutationResult(third, true, "third executor result");
        AssertCanonicalMutationResult(first, true, "first executor result");
        AssertCanonicalMutationResult(second, true, "second executor result");
        AssertCanonicalMutationResult(third, true, "third executor result");
        AssertEqual(1, GetInt(first, "sequenceNumber", -1), "first executor result should receive sequence 1.");
        AssertEqual(2, GetInt(second, "sequenceNumber", -1), "second executor result should receive sequence 2.");
        AssertEqual(3, GetInt(third, "sequenceNumber", -1), "third executor result should receive sequence 3.");
    }

    private static void TestBatchWriteExecutorSupportsUnifiedWriteOnlyOperations()
    {
        List<string> callOrder = new List<string>();
        AscetBatchWriteExecutor executor = new AscetBatchWriteExecutor(
            new FakeComponentWriteService(callOrder, "create_component"),
            new FakeMethodWriteService(callOrder, "set_method_code"),
            new FakeElementSpecWriteService(callOrder, "apply_element_spec"),
            new FakeMethodCreateService(callOrder),
            new FakeProjectFormulaApplyService(callOrder),
            new FakeComponentDeleteService(callOrder),
            new FakeMethodDeleteService(callOrder));

        IList<AscetBatchResultItemDto> results = executor.Execute(new List<AscetBatchRequestItemDto>
        {
            new AscetBatchRequestItemDto
            {
                id = "req-create-method",
                operation = "create_method",
                args = new Dictionary<string, object>
                {
                    { "componentPath", "Demo\\Controller" },
                    { "methodName", "Init" },
                    { "methodKind", "process" },
                    { "verifyReadback", true }
                }
            },
            new AscetBatchRequestItemDto
            {
                id = "req-project-formula",
                operation = "apply_project_formula",
                args = new Dictionary<string, object>
                {
                    { "projectPath", "DemoProject" },
                    { "spec", new Dictionary<string, object>
                        {
                            { "mode", "apply" },
                            { "formulas", new object[]
                                {
                                    new Dictionary<string, object>
                                    {
                                        { "name", "Gain" },
                                        { "type", "linear" },
                                        { "parameters", new object[] { 1.0, 2.0 } }
                                    }
                                }
                            }
                        }
                    },
                    { "verifyReadback", true }
                }
            }
        });

        AssertEqual(2, results.Count, "write-only batch operations should produce one result per request.");
        AssertEqual(2, callOrder.Count, "write-only batch operations should dispatch serially.");
        AssertEqual("create_method", callOrder[0], "create_method should dispatch through the unified batch executor.");
        AssertEqual("apply_project_formula", callOrder[1], "apply_project_formula should dispatch through the unified batch executor.");

        Dictionary<string, object> createMethod = results[0].result as Dictionary<string, object>;
        Dictionary<string, object> projectFormula = results[1].result as Dictionary<string, object>;
        AssertTrue(createMethod != null, "create_method result should use the normalized write payload envelope.");
        AssertTrue(projectFormula != null, "apply_project_formula result should use the normalized write payload envelope.");
        AssertEqual("create_method", GetString(createMethod, "operationName"), "create_method batch result should preserve operationName.");
        AssertEqual("apply_project_formula", GetString(projectFormula, "operationName"), "apply_project_formula batch result should preserve operationName.");
        AssertEqual(1, GetInt(createMethod, "sequenceNumber", -1), "create_method batch result should receive sequence 1.");
        AssertEqual(2, GetInt(projectFormula, "sequenceNumber", -1), "apply_project_formula batch result should receive sequence 2.");
    }

    private static void TestBatchWriteExecutorDefaultsCreateComponentAndMethodRequests()
    {
        List<string> callOrder = new List<string>();
        FakeComponentWriteService componentWriter = new FakeComponentWriteService(callOrder, "create_component");
        FakeMethodCreateService methodCreator = new FakeMethodCreateService(callOrder);
        AscetBatchWriteExecutor executor = new AscetBatchWriteExecutor(
            componentWriter,
            new FakeMethodWriteService(callOrder, "set_method_code"),
            new FakeElementSpecWriteService(callOrder, "apply_element_spec"),
            methodCreator,
            new FakeProjectFormulaApplyService(callOrder),
            new FakeComponentDeleteService(callOrder),
            new FakeMethodDeleteService(callOrder));

        IList<AscetBatchResultItemDto> results = executor.Execute(new List<AscetBatchRequestItemDto>
        {
            new AscetBatchRequestItemDto
            {
                id = "req-default-component",
                operation = "create_component",
                args = new Dictionary<string, object>
                {
                    { "componentPath", "Demo\\DefaultClass" },
                    { "kind", "class" },
                    { "verifyReadback", true }
                }
            },
            new AscetBatchRequestItemDto
            {
                id = "req-default-method",
                operation = "create_method",
                args = new Dictionary<string, object>
                {
                    { "componentPath", "Demo\\DefaultClass" },
                    { "componentKind", "class" },
                    { "methodName", "Init" },
                    { "verifyReadback", true }
                }
            },
            new AscetBatchRequestItemDto
            {
                id = "req-ambiguous-method",
                operation = "create_method",
                args = new Dictionary<string, object>
                {
                    { "componentPath", "Demo\\StateMachine" },
                    { "componentKind", "statemachine" },
                    { "methodName", "OnTransition" },
                    { "verifyReadback", true }
                }
            }
        });

        AssertEqual(3, results.Count, "defaulted batch requests should produce one result per request.");
        AssertTrue(GetBool(results[0].result as Dictionary<string, object>, "writeSucceeded"), "class create_component without language should default and succeed.");
        AssertTrue(GetBool(results[1].result as Dictionary<string, object>, "writeSucceeded"), "class create_method without methodKind should default and succeed.");
        AssertTrue(!results[2].ok, "statemachine create_method without methodKind should fail before execution.");
        AssertTrue(componentWriter.LastRequest != null, "defaulted create_component should reach component writer.");
        AssertEqual("ESDL", componentWriter.LastRequest.LanguageKind.ToString(), "class create_component should default missing language to ESDL.");
        AssertEqual("AbstractMethod", methodCreator.LastMethodKind.ToString(), "class create_method should default missing methodKind to abstract.");
        AssertTrue(results[2].error != null, "ambiguous create_method should include a structured error.");
        AssertEqual("invalid_argument", results[2].error.code, "ambiguous create_method should use invalid_argument.");
        AssertTrue((results[2].error.message ?? String.Empty).IndexOf("requires methodKind for statemachine targets", StringComparison.OrdinalIgnoreCase) >= 0, "ambiguous create_method error should explain the statemachine methodKind requirement.");
    }

    private static void TestBatchWriteExecutorSupportsDeleteOperations()
    {
        OperationParser.ParseBatchOperation(new string[] { "delete_component" });
        OperationParser.ParseBatchOperation(new string[] { "delete_method" });

        List<string> callOrder = new List<string>();
        AscetBatchWriteExecutor executor = new AscetBatchWriteExecutor(
            new FakeComponentWriteService(callOrder, "create_component"),
            new FakeMethodWriteService(callOrder, "set_method_code"),
            new FakeElementSpecWriteService(callOrder, "apply_element_spec"),
            new FakeMethodCreateService(callOrder),
            new FakeProjectFormulaApplyService(callOrder),
            new FakeComponentDeleteService(callOrder),
            new FakeMethodDeleteService(callOrder));

        IList<AscetBatchResultItemDto> results = executor.Execute(new List<AscetBatchRequestItemDto>
        {
            new AscetBatchRequestItemDto
            {
                id = "req-delete-component",
                operation = "delete_component",
                args = new Dictionary<string, object>
                {
                    { "componentPath", "Demo\\Controller" },
                    { "ifMissing", "ignore" }
                }
            },
            new AscetBatchRequestItemDto
            {
                id = "req-delete-method",
                operation = "delete_method",
                args = new Dictionary<string, object>
                {
                    { "componentPath", "Demo\\Controller" },
                    { "methodName", "Main" },
                    { "verifyReadback", true },
                    { "ignoreMissing", false }
                }
            }
        });

        AssertEqual(2, results.Count, "delete batch operations should produce one result per request.");
        AssertEqual(2, callOrder.Count, "delete batch operations should dispatch serially.");
        AssertEqual("delete_component", callOrder[0], "delete_component should dispatch through the unified batch executor.");
        AssertEqual("delete_method", callOrder[1], "delete_method should dispatch through the unified batch executor.");

        Dictionary<string, object> deleteComponent = results[0].result as Dictionary<string, object>;
        Dictionary<string, object> deleteMethod = results[1].result as Dictionary<string, object>;
        AssertTrue(deleteComponent != null, "delete_component result should use the normalized write payload envelope.");
        AssertTrue(deleteMethod != null, "delete_method result should use the normalized write payload envelope.");
        AssertEqual("delete_component", GetString(deleteComponent, "operationName"), "delete_component batch result should preserve operationName.");
        AssertEqual("delete_method", GetString(deleteMethod, "operationName"), "delete_method batch result should preserve operationName.");
        AssertEqual(1, GetInt(deleteComponent, "sequenceNumber", -1), "delete_component batch result should receive sequence 1.");
        AssertEqual(2, GetInt(deleteMethod, "sequenceNumber", -1), "delete_method batch result should receive sequence 2.");
        AssertTrue(GetBool(deleteComponent, "writeSucceeded"), "delete_component batch result should count AlreadyMissing as success.");
        AssertTrue(GetBool(deleteMethod, "writeSucceeded"), "delete_method batch result should count Deleted as success.");

        AssertTrue(GetDictionary(deleteComponent, "payload") == null, "delete_component result must not nest canonical evidence under payload.");
        AssertTrue(GetDictionary(deleteMethod, "payload") == null, "delete_method result must not nest canonical evidence under payload.");
        AssertTrue(GetBool(deleteComponent, "AlreadyMissing"), "delete_component result should preserve AlreadyMissing.");
        AssertTrue(GetBool(deleteComponent, "VerifyReadbackRequested"), "delete_component result should normalize verifyReadback requested.");
        AssertTrue(GetBool(deleteComponent, "ReadbackVerified"), "delete_component result should normalize readback verification.");
        AssertEqual("succeeded", GetString(deleteComponent, "outcome"), "delete_component result should expose canonical outcome.");
        AssertEqual("no_op", GetString(deleteComponent, "mutationStatus"), "delete_component AlreadyMissing should be a canonical no-op.");
        AssertTrue(GetBool(deleteMethod, "Deleted"), "delete_method result should preserve Deleted.");
        AssertTrue(GetBool(deleteMethod, "VerifyReadbackRequested"), "delete_method result should normalize verifyReadback requested.");
        AssertTrue(GetBool(deleteMethod, "ReadbackVerified"), "delete_method result should normalize readback verification.");
        AssertEqual("succeeded", GetString(deleteMethod, "outcome"), "delete_method result should expose canonical outcome.");
        AssertEqual("applied", GetString(deleteMethod, "mutationStatus"), "delete_method deletion should be canonical applied.");
    }

    private static void TestBatchWriteRespectsVerifyReadbackFalse()
    {
        List<string> callOrder = new List<string>();
        FakeComponentWriteService componentWriteService = new FakeComponentWriteService(callOrder, "create_component");
        FakeMethodWriteService methodWriteService = new FakeMethodWriteService(callOrder, "set_method_code");
        FakeElementSpecWriteService elementSpecWriteService = new FakeElementSpecWriteService(callOrder, "apply_element_spec");
        AscetBatchWriteExecutor executor = new AscetBatchWriteExecutor(
            componentWriteService,
            methodWriteService,
            elementSpecWriteService,
            new FakeMethodCreateService(callOrder),
            new FakeProjectFormulaApplyService(callOrder),
            new FakeComponentDeleteService(callOrder),
            new FakeMethodDeleteService(callOrder));

        IList<AscetBatchResultItemDto> results = executor.Execute(new List<AscetBatchRequestItemDto>
        {
            new AscetBatchRequestItemDto
            {
                id = "req-create-component",
                operation = "create_component",
                args = new Dictionary<string, object>
                {
                    { "componentPath", "Demo\\Controller" },
                    { "kind", "class" },
                    { "language", "ESDL" },
                    { "verifyReadback", false }
                }
            },
            new AscetBatchRequestItemDto
            {
                id = "req-create-method",
                operation = "create_method",
                args = new Dictionary<string, object>
                {
                    { "componentPath", "Demo\\Controller" },
                    { "methodName", "Main" },
                    { "methodKind", "abstract" },
                    { "verifyReadback", false }
                }
            },
            new AscetBatchRequestItemDto
            {
                id = "req-method-code",
                operation = "set_method_code",
                args = new Dictionary<string, object>
                {
                    { "componentPath", "Demo\\Controller" },
                    { "methodName", "Main" },
                    { "code", "code-body" },
                    { "verifyReadback", false }
                }
            },
            new AscetBatchRequestItemDto
            {
                id = "req-element-spec",
                operation = "apply_element_spec",
                args = new Dictionary<string, object>
                {
                    { "componentPath", "Demo\\Controller" },
                    { "spec", new Dictionary<string, object> { { "elements", new object[0] } } },
                    { "verifyReadback", false }
                }
            }
        });

        AssertEqual(4, results.Count, "verifyReadback=false regression should still return one batch result per request.");
        AssertEqual(4, callOrder.Count, "verifyReadback=false should still dispatch every operation.");
        AssertTrue(results[0].ok, "create_component verifyReadback=false should be accepted.");
        AssertTrue(results[1].ok, "create_method verifyReadback=false should be accepted.");
        AssertTrue(results[2].ok, "set_method_code verifyReadback=false should be accepted.");
        AssertTrue(results[3].ok, "apply_element_spec verifyReadback=false should be accepted.");

        Dictionary<string, object> createComponent = results[0].result as Dictionary<string, object>;
        Dictionary<string, object> createMethod = results[1].result as Dictionary<string, object>;
        Dictionary<string, object> setMethodCode = results[2].result as Dictionary<string, object>;
        Dictionary<string, object> applyElementSpec = results[3].result as Dictionary<string, object>;
        AssertTrue(createComponent != null, "create_component verifyReadback=false should still return a payload.");
        AssertTrue(createMethod != null, "create_method verifyReadback=false should still return a payload.");
        AssertTrue(setMethodCode != null, "set_method_code verifyReadback=false should still return a payload.");
        AssertTrue(applyElementSpec != null, "apply_element_spec verifyReadback=false should still return a payload.");

        Dictionary<string, object> createComponentVerification = GetDictionary(createComponent, "verification");
        Dictionary<string, object> createVerification = GetDictionary(createMethod, "verification");
        Dictionary<string, object> writeVerification = GetDictionary(setMethodCode, "verification");
        Dictionary<string, object> elementSpecVerification = GetDictionary(applyElementSpec, "verification");
        AssertTrue(createComponentVerification != null, "create_component verifyReadback=false should expose verification metadata.");
        AssertTrue(createVerification != null, "create_method verifyReadback=false should expose verification metadata.");
        AssertTrue(writeVerification != null, "set_method_code verifyReadback=false should expose verification metadata.");
        AssertTrue(elementSpecVerification != null, "apply_element_spec verifyReadback=false should expose verification metadata.");
        AssertTrue(!GetBool(createComponentVerification, "requested"), "create_component verifyReadback=false should mark verification as not requested.");
        AssertTrue(!GetBool(createVerification, "requested"), "create_method verifyReadback=false should mark verification as not requested.");
        AssertTrue(!GetBool(writeVerification, "requested"), "set_method_code verifyReadback=false should mark verification as not requested.");
        AssertTrue(!GetBool(elementSpecVerification, "requested"), "apply_element_spec verifyReadback=false should mark verification as not requested.");
        AssertTrue(GetBool(createComponentVerification, "succeeded"), "create_component verifyReadback=false should still report verification success.");
        AssertTrue(GetBool(createVerification, "succeeded"), "create_method verifyReadback=false should still report verification success.");
        AssertTrue(GetBool(writeVerification, "succeeded"), "set_method_code verifyReadback=false should still report verification success.");
        AssertTrue(GetBool(elementSpecVerification, "succeeded"), "apply_element_spec verifyReadback=false should still report verification success.");

        AssertTrue(!createComponent.ContainsKey("payload"), "create_component must not include a nested payload.");
        AssertTrue(!createMethod.ContainsKey("payload"), "create_method must not include a nested payload.");
        AssertTrue(!setMethodCode.ContainsKey("payload"), "set_method_code must not include a nested payload.");
        AssertTrue(!applyElementSpec.ContainsKey("payload"), "apply_element_spec must not include a nested payload.");
        AssertTrue(!GetBool(createComponent, "verifyReadbackRequested"), "create_component result should preserve verifyReadback=false.");
        AssertTrue(!GetBool(createMethod, "verifyReadbackRequested"), "create_method result should preserve verifyReadback=false.");
        AssertTrue(!GetBool(setMethodCode, "VerifyReadbackRequested"), "set_method_code result should preserve verifyReadback=false.");
        AssertTrue(!GetBool(applyElementSpec, "VerifyReadbackRequested"), "apply_element_spec result should preserve verifyReadback=false.");
        AssertTrue(!GetBool(createComponent, "readbackVerified"), "create_component result should not mark readback verified when verification is disabled.");
        AssertTrue(!GetBool(createMethod, "readbackVerified"), "create_method result should not mark readback verified when verification is disabled.");
        AssertTrue(!GetBool(setMethodCode, "ReadbackVerified"), "set_method_code result should not mark readback verified when verification is disabled.");
        AssertTrue(!GetBool(applyElementSpec, "ReadbackVerified"), "apply_element_spec result should not mark readback verified when verification is disabled.");        AssertTrue(componentWriteService.LastRequest != null && !componentWriteService.LastRequest.VerifyReadback, "create_component request should receive verifyReadback=false.");
        AssertTrue(methodWriteService.LastRequest != null && !methodWriteService.LastRequest.VerifyReadback, "set_method_code request should receive verifyReadback=false.");
        AssertTrue(elementSpecWriteService.LastRequest != null && !elementSpecWriteService.LastRequest.VerifyReadback, "apply_element_spec request should receive verifyReadback=false.");
    }

    private static void TestBatchWritePromotesDeleteMissingToRestoreMode()
    {
        List<string> callOrder = new List<string>();
        FakeElementSpecWriteService elementSpecWriteService = new FakeElementSpecWriteService(callOrder, "apply_element_spec");
        AscetBatchWriteExecutor executor = new AscetBatchWriteExecutor(
            new FakeComponentWriteService(callOrder, "create_component"),
            new FakeMethodWriteService(callOrder, "set_method_code"),
            elementSpecWriteService,
            new FakeMethodCreateService(callOrder),
            new FakeProjectFormulaApplyService(callOrder),
            new FakeComponentDeleteService(callOrder),
            new FakeMethodDeleteService(callOrder));

        IList<AscetBatchResultItemDto> results = executor.Execute(new List<AscetBatchRequestItemDto>
        {
            new AscetBatchRequestItemDto
            {
                id = "req-element-spec",
                operation = "apply_element_spec",
                args = new Dictionary<string, object>
                {
                    { "componentPath", "Demo\\Controller" },
                    { "spec", new Dictionary<string, object> { { "elements", new object[0] } } },
                    { "mode", "apply" },
                    { "deleteMissing", true },
                    { "verifyReadback", true }
                }
            }
        });

        AssertEqual(1, results.Count, "deleteMissing promotion should still return one batch result.");
        AssertTrue(elementSpecWriteService.LastRequest != null, "deleteMissing promotion should forward a request to the element spec service.");
        AssertTrue(elementSpecWriteService.LastRequest.Mode == AscetElementApplyMode.Restore, "deleteMissing=true should promote batch element spec mode to restore.");
        AssertTrue(elementSpecWriteService.LastRequest.DeleteMissing, "deleteMissing=true should be preserved on the forwarded request.");
    }

    private static void TestBatchWriteRejectsConflictingDeleteMissingPolicies()
    {
        AscetBatchWriteExecutor executor = new AscetBatchWriteExecutor(
            new FakeComponentWriteService(new List<string>(), "create_component"),
            new FakeMethodWriteService(new List<string>(), "set_method_code"),
            new FakeElementSpecWriteService(new List<string>(), "apply_element_spec"),
            new FakeMethodCreateService(new List<string>()),
            new FakeProjectFormulaApplyService(new List<string>()),
            new FakeComponentDeleteService(new List<string>()),
            new FakeMethodDeleteService(new List<string>()));

        IList<AscetBatchResultItemDto> results = executor.Execute(new List<AscetBatchRequestItemDto>
        {
            new AscetBatchRequestItemDto
            {
                id = "req-delete-component",
                operation = "delete_component",
                args = new Dictionary<string, object>
                {
                    { "componentPath", "Demo\\Controller" },
                    { "ifMissing", "ignore" },
                    { "ignoreMissing", false }
                }
            }
        });

        AssertEqual(1, results.Count, "conflicting delete missing policies should still return one batch result.");
        AssertTrue(!results[0].ok, "conflicting delete missing policies should fail deterministically.");
        AssertTrue(results[0].error != null, "conflicting delete missing policies should produce a structured error.");
        AssertEqual("invalid_argument", results[0].error.code, "conflicting delete missing policies should report invalid_argument.");
    }

    private static int RunBatchCommand(string stdinJson, out string stdout)
    {
        TextReader originalIn = Console.In;
        TextWriter originalOut = Console.Out;
        StringWriter capture = new StringWriter(new StringBuilder());

        try
        {
            Console.SetIn(new StringReader(stdinJson ?? String.Empty));
            Console.SetOut(capture);
            AscetCliEnvelope.SetProtocolWriterForTesting(capture);
            AscetCliEnvelope.SetProtocolWriterForTesting(capture);
            return BatchCommand.Run(new string[] { "--lane", "write", "--json" });
        }
        finally
        {
            AscetCliEnvelope.ResetProtocolWriterForTesting();
            Console.SetIn(originalIn);
            Console.SetOut(originalOut);
            stdout = capture.ToString();
        }
    }

    private static void TestBuiltCliBatchWriteEntryPoint()
    {
        string exePath = FindPathUpwards("output", "ascet-csharp", "bin", "AscetBridge.exe");
        AssertTrue(File.Exists(exePath), "AscetBridge.exe should exist for batch write integration smoke.");

        ProcessStartInfo startInfo = new ProcessStartInfo
        {
            FileName = exePath,
            Arguments = "batch set_method_code --json",
            UseShellExecute = false,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
            WorkingDirectory = Path.GetDirectoryName(exePath)
        };

        using (Process process = new Process())
        {
            process.StartInfo = startInfo;
            AssertTrue(process.Start(), "Failed to start AscetCli.exe for batch write integration smoke.");
            process.StandardInput.Write("{\"requests\":[]}");
            process.StandardInput.Close();

            string stdout = process.StandardOutput.ReadToEnd();
            string stderr = process.StandardError.ReadToEnd();
            AssertTrue(process.WaitForExit(10000), "AscetCli.exe batch write integration smoke should exit promptly.");
            AssertTrue(!String.IsNullOrWhiteSpace(stdout), "AscetCli.exe batch write integration smoke should emit JSON.");

            Dictionary<string, object> envelope = Serializer.Deserialize<Dictionary<string, object>>(stdout);
            AssertTrue(!GetBool(envelope, "ok"), "empty batch write input should fail with a structured error.");
            Dictionary<string, object> error = GetDictionary(envelope, "error");
            AssertTrue(error != null, "empty batch write input should include an error object.");
            AssertEqual("invalid_input", GetString(error, "code"), "built AscetBridge.exe batch write path should no longer return not_implemented.");
            AssertEqual(2, process.ExitCode, "empty batch write input should still return structured-error exit code 2." + Environment.NewLine + stderr);
        }
    }

    private static void TestElementSpecParserAllowsExportedVariablePhysicalRange()
    {
        string json = "{"
            + "\"elements\":[{"
            + "\"name\":\"ExportedSpeed\","
            + "\"kind\":\"variable\","
            + "\"modelType\":\"cont\","
            + "\"scope\":\"exported\","
            + "\"physicalRange\":{\"min\":0,\"max\":8000},"
            + "\"unit\":\"rpm\""
            + "}]}";

        AscetElementSpecDocument document = AscetElementSpecDocumentParser.ParseJson(json);
        AssertTrue(document != null && document.Elements != null && document.Elements.Count == 1, "exported variable range spec should parse as one element.");

        AscetElementSpec element = document.Elements[0];
        AssertEqual("ExportedSpeed", element.Name, "exported variable range spec should preserve the element name.");
        AssertEqual("exported", element.Scope, "exported variable range spec should preserve exported scope.");
        AssertEqual("cont", element.ModelType, "exported variable range spec should preserve continuous model type.");
        AssertEqual("0", Convert.ToString(element.PhysicalRange.Min, System.Globalization.CultureInfo.InvariantCulture), "exported variable range spec should preserve physical min.");
        AssertEqual("8000", Convert.ToString(element.PhysicalRange.Max, System.Globalization.CultureInfo.InvariantCulture), "exported variable range spec should preserve physical max.");
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

    private static void AssertCanonicalMutationResult(Dictionary<string, object> payload, bool succeeded, string message)
    {
        AssertTrue(payload != null, message + " should include a canonical result object.");
        AssertEqual(succeeded ? "succeeded" : "failed", GetString(payload, "outcome"), message + " should preserve outcome.");
        AssertTrue(payload.ContainsKey("changed"), message + " should include changed.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(payload, "mutationStatus")), message + " should include mutationStatus.");
        AssertTrue(payload.ContainsKey("saveAttempted"), message + " should include saveAttempted.");
        AssertTrue(payload.ContainsKey("saveSucceeded"), message + " should include saveSucceeded.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(payload, "saveState")), message + " should include saveState.");
        AssertTrue(payload.ContainsKey("verified"), message + " should include verified.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(payload, "verificationStatus")), message + " should include verificationStatus.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(payload, "verificationMode")), message + " should include verificationMode.");
        AssertTrue(payload.ContainsKey("sessionCount"), message + " should include sessionCount.");
        AssertTrue(payload.ContainsKey("saveCount"), message + " should include saveCount.");
        AssertTrue(payload.ContainsKey("editableRetryCount"), message + " should include editableRetryCount.");
        AssertTrue(payload.ContainsKey("nativeMutationAttemptCount"), message + " should include nativeMutationAttemptCount.");
        AssertTrue(!payload.ContainsKey("payload"), message + " must not nest canonical evidence under payload.");
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

        string repositoryRoot = Environment.GetEnvironmentVariable("ASCET_REPOSITORY_ROOT");
        if (!String.IsNullOrWhiteSpace(repositoryRoot))
        {
            string candidate = repositoryRoot;
            for (int i = 0; i < relativeParts.Length; i++)
            {
                candidate = Path.Combine(candidate, relativeParts[i]);
            }
            string fullPath = Path.GetFullPath(candidate);
            if (File.Exists(fullPath))
            {
                return fullPath;
            }
        }

        throw new Exception("Failed to resolve required path from base directory '" + AppDomain.CurrentDomain.BaseDirectory + "'.");
    }

    private sealed class FakeBatchWriteExecutor : IAscetBatchWriteExecutor
    {
        public List<AscetBatchRequestItemDto> Requests { get; private set; }

        public FakeBatchWriteExecutor()
        {
            Requests = new List<AscetBatchRequestItemDto>();
        }

        public IList<AscetBatchResultItemDto> Execute(IList<AscetBatchRequestItemDto> requests)
        {
            Requests.Clear();
            if (requests != null)
            {
                for (int i = 0; i < requests.Count; i++)
                {
                    Requests.Add(requests[i]);
                }
            }

            List<AscetBatchResultItemDto> results = new List<AscetBatchResultItemDto>();
            results.Add(BuildSuccess("req-create", "create_component", 41, "Created Demo\\Controller.", new Dictionary<string, object>
            {
                { "componentPath", "Demo\\Controller" },
                { "kind", "class" }
            }));
            results.Add(BuildFailure("req-method", "set_method_code", "readback_mismatch", "verify", "Method code did not round-trip.", new Dictionary<string, object>
            {
                { "componentPath", "Demo\\Controller" },
                { "methodName", "Main" }
            }));
            results.Add(BuildSuccess("req-spec", "apply_element_spec", 43, "1 created, 0 updated, 0 incompatible.", new Dictionary<string, object>
            {
                { "WriteSucceeded", true },
                { "ReadbackVerified", true }
            }));
            return results;
        }

        private static AscetBatchResultItemDto BuildSuccess(string id, string operationName, int sequenceNumber, string summary, Dictionary<string, object> payload)
        {
            AscetBatchResultItemDto result = new AscetBatchResultItemDto();
            result.id = id;
            result.ok = true;
            Dictionary<string, object> canonical = AscetCanonicalWriteResult.NormalizeSuccess(payload, true, true, true);
            canonical["operationName"] = operationName;
            canonical["sequenceNumber"] = sequenceNumber;
            canonical["writeSucceeded"] = true;
            canonical["summary"] = summary;
            canonical["verification"] = new Dictionary<string, object>
            {
                { "requested", true },
                { "attempted", true },
                { "succeeded", true },
                { "summary", "verified" },
                { "details", new Dictionary<string, object>() }
            };
            result.result = canonical;
            result.error = null;
            return result;
        }

        private static AscetBatchResultItemDto BuildFailure(string id, string operationName, string code, string stage, string message, Dictionary<string, object> details)
        {
            AscetBatchResultItemDto result = new AscetBatchResultItemDto();
            result.id = id;
            result.ok = false;
            result.result = AscetCanonicalWriteResult.NormalizeFailure(details, true, code, message);
            result.error = new AscetStructuredErrorDto
            {
                code = code,
                message = message,
                operation = operationName,
                details = new Dictionary<string, object>
                {
                    { "stage", stage },
                    { "exceptionType", "AscetReadException" },
                    { "componentPath", GetValue(details, "componentPath") },
                    { "methodName", GetValue(details, "methodName") }
                }
            };
            return result;
        }

        private static object GetValue(Dictionary<string, object> details, string key)
        {
            if (details == null || String.IsNullOrWhiteSpace(key) || !details.ContainsKey(key))
            {
                return String.Empty;
            }

            return details[key] ?? String.Empty;
        }
    }

    private sealed class FakeComponentWriteService : IExecComponentWriteService
    {
        private readonly IList<string> callOrder;
        private readonly string marker;
        public CreateComponentWriteRequest LastRequest { get; private set; }

        public FakeComponentWriteService(IList<string> callOrder, string marker)
        {
            this.callOrder = callOrder;
            this.marker = marker;
        }

        public CreateComponentWriteRequest ParseExecArguments(string[] args)
        {
            throw new NotSupportedException();
        }

        public AscetWriteExecutionResult Execute(CreateComponentWriteRequest request)
        {
            LastRequest = request;
            callOrder.Add(marker);
            return BuildWriteExecutionResult(marker, request != null && request.VerifyReadback);
        }
    }

    private sealed class FakeMethodWriteService : IExecMethodCodeWriteService
    {
        private readonly IList<string> callOrder;
        private readonly string marker;
        public SetMethodCodeWriteRequest LastRequest { get; private set; }

        public FakeMethodWriteService(IList<string> callOrder, string marker)
        {
            this.callOrder = callOrder;
            this.marker = marker;
        }

        public SetMethodCodeWriteRequest ParseExecArguments(string[] args)
        {
            throw new NotSupportedException();
        }

        public AscetWriteExecutionResult Execute(SetMethodCodeWriteRequest request)
        {
            LastRequest = request;
            callOrder.Add(marker);
            return BuildWriteExecutionResult(marker, request != null && request.VerifyReadback);
        }
    }

    private sealed class FakeElementSpecWriteService : IExecElementSpecWriteService
    {
        private readonly IList<string> callOrder;
        private readonly string marker;
        public ApplyElementSpecWriteRequest LastRequest { get; private set; }

        public FakeElementSpecWriteService(IList<string> callOrder, string marker)
        {
            this.callOrder = callOrder;
            this.marker = marker;
        }

        public ApplyElementSpecWriteRequest ParseExecArguments(string[] args)
        {
            throw new NotSupportedException();
        }

        public AscetWriteExecutionResult Execute(ApplyElementSpecWriteRequest request)
        {
            LastRequest = request;
            callOrder.Add(marker);
            return BuildWriteExecutionResult(marker, request != null && request.VerifyReadback);
        }
    }

    private sealed class FakeMethodCreateService : IMethodCreateService
    {
        private readonly IList<string> callOrder;
        public string LastComponentPath { get; private set; }
        public string LastMethodName { get; private set; }
        public AscetMethodKind LastMethodKind { get; private set; }
        public bool LastVerifyReadback { get; private set; }

        public FakeMethodCreateService(IList<string> callOrder)
        {
            this.callOrder = callOrder;
        }

        public AscetMethodCreateResult CreateMethod(string componentPath, string methodName, AscetMethodKind methodKind, string diagramName, bool verifyReadback, bool rollbackOnFailure, bool returnExisting)
        {
            LastComponentPath = componentPath;
            LastMethodName = methodName;
            LastMethodKind = methodKind;
            LastVerifyReadback = verifyReadback;
            callOrder.Add("create_method");
            return new AscetMethodCreateResult
            {
                ComponentPath = componentPath,
                MethodName = methodName,
                MethodKind = methodKind,
                DiagramName = diagramName,
                Created = true,
                AlreadyExisted = false,
                TargetKey = componentPath + "::" + methodName,
                VerifyReadbackRequested = verifyReadback,
                RollbackOnFailureRequested = rollbackOnFailure,
                ReadbackVerified = verifyReadback,
                Summary = "create_method-summary"
            };
        }
    }

    private sealed class FakeProjectFormulaApplyService : IProjectFormulaApplyService
    {
        private readonly IList<string> callOrder;

        public FakeProjectFormulaApplyService(IList<string> callOrder)
        {
            this.callOrder = callOrder;
        }

        public AscetProjectFormulaApplyResult Apply(string projectPath, AscetProjectFormulaSpecDocument spec, bool verifyReadback)
        {
            callOrder.Add("apply_project_formula");
            return new AscetProjectFormulaApplyResult
            {
                ProjectPath = projectPath,
                Mode = spec == null ? String.Empty : (spec.Mode ?? String.Empty),
                DeleteMissing = spec != null && spec.DeleteMissing,
                CreatedFormulas = new List<string> { "Gain" },
                UpdatedFormulas = new List<string>(),
                DeletedFormulas = new List<string>(),
                Issues = new List<string>(),
                WriteSucceeded = true,
                VerifyReadbackRequested = verifyReadback,
                ReadbackVerified = verifyReadback
            };
        }
    }

    private sealed class FakeComponentDeleteService : IComponentDeleteService
    {
        private readonly IList<string> callOrder;

        public FakeComponentDeleteService(IList<string> callOrder)
        {
            this.callOrder = callOrder;
        }

        public AscetComponentDeleteResult DeleteComponent(string componentPath, bool verifyReadback, bool ignoreMissing)
        {
            callOrder.Add("delete_component");
            return new AscetComponentDeleteResult
            {
                ComponentPath = componentPath,
                FolderPath = "Demo",
                ComponentName = "Controller",
                Deleted = false,
                AlreadyMissing = ignoreMissing,
                VerifyReadbackRequested = verifyReadback,
                ReadbackVerified = verifyReadback,
                Summary = "delete_component-summary"
            };
        }
    }

    private sealed class FakeMethodDeleteService : IMethodDeleteService
    {
        private readonly IList<string> callOrder;

        public FakeMethodDeleteService(IList<string> callOrder)
        {
            this.callOrder = callOrder;
        }

        public AscetMethodDeleteResult DeleteMethod(string componentPath, string methodName, bool verifyReadback, bool ignoreMissing)
        {
            callOrder.Add("delete_method");
            return new AscetMethodDeleteResult
            {
                ComponentPath = componentPath,
                MethodName = methodName,
                MethodKind = AscetMethodKind.Process,
                DiagramName = "Main",
                Deleted = true,
                AlreadyMissing = false,
                TargetKey = componentPath + "::" + methodName,
                VerifyReadbackRequested = verifyReadback,
                ReadbackVerified = verifyReadback,
                Summary = "delete_method-summary"
            };
        }
    }

    private static AscetWriteExecutionResult BuildWriteExecutionResult(string operationName)
    {
        return BuildWriteExecutionResult(operationName, true);
    }

    private static AscetWriteExecutionResult BuildWriteExecutionResult(string operationName, bool verifyRequested)
    {
        AscetWriteExecutionResult result = new AscetWriteExecutionResult();
        result.OperationName = operationName;
        result.SequenceNumber = 0;
        result.Succeeded = true;
        result.WriteSucceeded = true;
        result.Summary = operationName + "-summary";
        result.Payload = new Dictionary<string, object>();
        result.Verification = new WriteVerificationResult
        {
            Requested = verifyRequested,
            Attempted = verifyRequested,
            Succeeded = true,
            Summary = verifyRequested ? "verified" : String.Empty
        };
        return result;
    }
}
