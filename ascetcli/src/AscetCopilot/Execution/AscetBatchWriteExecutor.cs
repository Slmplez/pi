using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public interface IAscetBatchWriteExecutor
{
    IList<AscetBatchResultItemDto> Execute(IList<AscetBatchRequestItemDto> requests);
}

internal interface IAscetBatchEditableWriteGate
{
    void RequireEditable(IList<AscetBatchRequestItemDto> requests);
}

internal sealed class NoOpAscetBatchEditableWriteGate : IAscetBatchEditableWriteGate
{
    public void RequireEditable(IList<AscetBatchRequestItemDto> requests)
    {
    }
}

internal sealed class AscetBatchEditableWriteGate : AscetReadDomainServiceBase, IAscetBatchEditableWriteGate
{
    public void RequireEditable(IList<AscetBatchRequestItemDto> requests)
    {
        if (requests == null)
        {
            throw new ArgumentNullException("requests");
        }

        List<string> componentPaths = new List<string>();
        List<string> folderPaths = new List<string>();
        for (int i = 0; i < requests.Count; i++)
        {
            AscetBatchRequestItemDto request = requests[i];
            string operation = request == null || String.IsNullOrWhiteSpace(request.operation)
                ? String.Empty
                : request.operation.Trim().ToLowerInvariant();
            IDictionary<string, object> args = request == null ? null : request.args;
            switch (operation)
            {
                case "create_method":
                case "set_method_code":
                case "apply_element_spec":
                case "delete_component":
                case "delete_method":
                    AddPath(componentPaths, ReadString(args, "componentPath"));
                    break;
                case "apply_project_formula":
                    AddPath(componentPaths, ReadString(args, "projectPath"));
                    break;
                case "delete_folder":
                    AddPath(folderPaths, ReadString(args, "folderPath"));
                    break;
            }
        }

        if (componentPaths.Count == 0 && folderPaths.Count == 0)
        {
            return;
        }

        ExecuteWithSession("ascet_batch_write", delegate(AscetSession session)
        {
            for (int i = 0; i < folderPaths.Count; i++)
            {
                AscetFolder folder = ResolveFolder(session.GetCurrentDatabaseHandle(), folderPaths[i]);
                CollectComponentPaths(folder, componentPaths, new HashSet<string>(StringComparer.OrdinalIgnoreCase));
            }
            RequireComponentsEditableInSession(session, componentPaths, "ascet_batch_write");
            return true;
        });
    }

    private static void AddPath(IList<string> paths, string path)
    {
        if (!String.IsNullOrWhiteSpace(path))
        {
            paths.Add(path.Trim().Replace('/', '\\'));
        }
    }

    private static string ReadString(IDictionary<string, object> args, string key)
    {
        object value;
        return args != null && args.TryGetValue(key, out value) && value is string
            ? ((string)value).Trim()
            : String.Empty;
    }

    private AscetFolder ResolveFolder(AscetDataBase database, string folderPath)
    {
        string[] segments = (folderPath ?? String.Empty).Trim().Trim('\\').Split(new char[] { '\\' }, StringSplitOptions.RemoveEmptyEntries);
        AscetFolder[] currentLevel = database == null ? null : database.GetAllAscetFolders();
        AscetFolder current = null;
        for (int i = 0; i < segments.Length; i++)
        {
            current = FindFolder(currentLevel, segments[i]);
            if (current == null)
            {
                throw new AscetReadException("folder_not_found", "ascet_batch_write", "Folder '" + folderPath + "' was not found.");
            }
            currentLevel = GetChildFolders(current);
        }
        return current;
    }

    private static AscetFolder FindFolder(AscetFolder[] folders, string name)
    {
        if (folders == null)
        {
            return null;
        }
        for (int i = 0; i < folders.Length; i++)
        {
            if (folders[i] != null && String.Equals(folders[i].GetName(), name, StringComparison.Ordinal))
            {
                return folders[i];
            }
        }
        return null;
    }

    private static AscetFolder[] GetChildFolders(AscetFolder folder)
    {
        Array values = InvokeArray(folder, new string[] { "GetAllAscetFolders", "GetAllFolders", "GetAllSubFolders", "GetSubFolders" });
        if (values == null)
        {
            return new AscetFolder[0];
        }
        AscetFolder[] result = new AscetFolder[values.Length];
        for (int i = 0; i < values.Length; i++)
        {
            result[i] = values.GetValue(i) as AscetFolder;
        }
        return result;
    }

    private static void CollectComponentPaths(AscetFolder folder, IList<string> paths, ISet<string> seen)
    {
        if (folder == null)
        {
            return;
        }
        Array items = InvokeArray(folder, new string[] { "GetAllDataBaseItems", "GetAllItems", "GetAllComponents" });
        if (items != null)
        {
            for (int i = 0; i < items.Length; i++)
            {
                Component component = items.GetValue(i) as Component;
                string path = component == null ? String.Empty : (component.GetNameWithPath() ?? String.Empty);
                if (!String.IsNullOrWhiteSpace(path) && seen.Add(path))
                {
                    paths.Add(path);
                }
            }
        }
        AscetFolder[] children = GetChildFolders(folder);
        for (int i = 0; i < children.Length; i++)
        {
            CollectComponentPaths(children[i], paths, seen);
        }
    }

    private static Array InvokeArray(object target, string[] methodNames)
    {
        if (target == null)
        {
            return null;
        }
        for (int i = 0; i < methodNames.Length; i++)
        {
            MethodInfo method = target.GetType().GetMethod(methodNames[i], BindingFlags.Instance | BindingFlags.Public);
            if (method == null)
            {
                continue;
            }
            Array result = method.Invoke(target, null) as Array;
            if (result != null)
            {
                return result;
            }
        }
        return null;
    }
}
public sealed class AscetBatchWriteExecutor : IAscetBatchWriteExecutor
{
    private static readonly object ConsoleSuppressionGate = new object();
    private static readonly TextWriter SuppressedConsoleOut = TextWriter.Synchronized(TextWriter.Null);
    private static readonly AscetJsonProtocol Protocol = new AscetJsonProtocol();

    private readonly IExecComponentWriteService componentWriter;
    private readonly IExecMethodCodeWriteService methodWriter;
    private readonly IExecElementSpecWriteService elementSpecWriter;
    private readonly IMethodCreateService methodCreator;
    private readonly IProjectFormulaApplyService projectFormulaWriter;
    private readonly IComponentDeleteService componentDeleter;
    private readonly IMethodDeleteService methodDeleter;
    private readonly IFolderCreateService folderCreator;
    private readonly IFolderDeleteService folderDeleter;
    private readonly IAscetBatchEditableWriteGate editableWriteGate;

    public AscetBatchWriteExecutor()
        : this(
            new ComponentWriteService(),
            new ExecMethodWriteService(),
            new ElementSpecWriteService(),
            new MethodCreateService(),
            new ProjectFormulaApplyService(),
            new ComponentDeleteService(),
            new MethodDeleteService(),
            new FolderCreateService(),
            new FolderDeleteService(),
            new AscetBatchEditableWriteGate())
    {
    }

    internal AscetBatchWriteExecutor(
        IExecComponentWriteService componentWriter,
        IExecMethodCodeWriteService methodWriter,
        IExecElementSpecWriteService elementSpecWriter)
        : this(
            componentWriter,
            methodWriter,
            elementSpecWriter,
            new MethodCreateService(),
            new ProjectFormulaApplyService(),
            new ComponentDeleteService(),
            new MethodDeleteService(),
            new FolderCreateService(),
            new FolderDeleteService())
    {
    }

    internal AscetBatchWriteExecutor(
        IExecComponentWriteService componentWriter,
        IExecMethodCodeWriteService methodWriter,
        IExecElementSpecWriteService elementSpecWriter,
        IMethodCreateService methodCreator,
        IProjectFormulaApplyService projectFormulaWriter)
        : this(
            componentWriter,
            methodWriter,
            elementSpecWriter,
            methodCreator,
            projectFormulaWriter,
            new ComponentDeleteService(),
            new MethodDeleteService(),
            new FolderCreateService(),
            new FolderDeleteService())
    {
    }

    internal AscetBatchWriteExecutor(
        IExecComponentWriteService componentWriter,
        IExecMethodCodeWriteService methodWriter,
        IExecElementSpecWriteService elementSpecWriter,
        IMethodCreateService methodCreator,
        IProjectFormulaApplyService projectFormulaWriter,
        IComponentDeleteService componentDeleter,
        IMethodDeleteService methodDeleter)
        : this(
            componentWriter,
            methodWriter,
            elementSpecWriter,
            methodCreator,
            projectFormulaWriter,
            componentDeleter,
            methodDeleter,
            new FolderCreateService(),
            new FolderDeleteService())
    {
    }

    internal AscetBatchWriteExecutor(
        IExecComponentWriteService componentWriter,
        IExecMethodCodeWriteService methodWriter,
        IExecElementSpecWriteService elementSpecWriter,
        IMethodCreateService methodCreator,
        IProjectFormulaApplyService projectFormulaWriter,
        IComponentDeleteService componentDeleter,
        IMethodDeleteService methodDeleter,
        IFolderCreateService folderCreator,
        IFolderDeleteService folderDeleter,
        IAscetBatchEditableWriteGate editableWriteGate = null)
    {
        this.componentWriter = componentWriter ?? new ComponentWriteService();
        this.methodWriter = methodWriter ?? new ExecMethodWriteService();
        this.elementSpecWriter = elementSpecWriter ?? new ElementSpecWriteService();
        this.methodCreator = methodCreator ?? new MethodCreateService();
        this.projectFormulaWriter = projectFormulaWriter ?? new ProjectFormulaApplyService();
        this.componentDeleter = componentDeleter ?? new ComponentDeleteService();
        this.methodDeleter = methodDeleter ?? new MethodDeleteService();
        this.folderCreator = folderCreator ?? new FolderCreateService();
        this.folderDeleter = folderDeleter ?? new FolderDeleteService();
        this.editableWriteGate = editableWriteGate ?? new NoOpAscetBatchEditableWriteGate();
    }

    public IList<AscetBatchResultItemDto> Execute(IList<AscetBatchRequestItemDto> requests)
    {
        if (requests == null)
        {
            throw new AscetReadException("invalid_input", "parse_batch_input", "Input must contain a non-empty 'requests' array.");
        }

        AscetToolApiBootstrap.ConfigureAssemblyResolution();

        List<AscetBatchResultItemDto> results = new List<AscetBatchResultItemDto>();
        for (int i = 0; i < requests.Count; i++)
        {
            results.Add(ExecuteItem(requests[i], i + 1L));
        }

        return results;
    }

    private AscetBatchResultItemDto ExecuteItem(AscetBatchRequestItemDto request, long batchSequenceNumber)
    {
        AscetBatchRequestItemDto normalizedRequest = request ?? new AscetBatchRequestItemDto();
        string operationId = NormalizeOperationId(normalizedRequest.operation);
        AscetBatchResultItemDto result = new AscetBatchResultItemDto();
        result.id = normalizedRequest.id ?? String.Empty;

        try
        {
            if (String.IsNullOrWhiteSpace(operationId))
            {
                throw new AscetReadException("invalid_arguments", "parse_batch_operation", "Batch write operation is required.");
            }

            OperationParser.ParseBatchOperation(new string[] { operationId });

            IDictionary<string, object> payload = normalizedRequest.args ?? new Dictionary<string, object>(StringComparer.Ordinal);
            AscetWriteExecutionResult writeResult = ExecuteOperation(operationId, payload);
            if (writeResult == null)
            {
                throw new AscetReadException("write_failed", operationId, "Batch write operation returned no result.");
            }

            writeResult.SequenceNumber = batchSequenceNumber;

            if (!writeResult.Succeeded)
            {
                AscetStructuredErrorDto error = CreateWriteError(writeResult.Error, operationId);
                bool mutationStarted = writeResult.WriteSucceeded;
                result.ok = false;
                result.result = AscetCanonicalWriteResult.NormalizeFailure(
                    writeResult.Payload,
                    mutationStarted,
                    error.code,
                    error.message);
                result.error = error;
                return result;
            }

            result.ok = true;
            result.result = BuildWriteResultPayload(writeResult);
            result.error = null;
            return result;
        }
        catch (Exception ex)
        {
            result.ok = false;
            result.result = null;
            result.error = AscetErrorMapper.FromException(ex, operationId);
            return result;
        }
    }

    private AscetWriteExecutionResult ExecuteOperation(string operationId, IDictionary<string, object> args)
    {
        IDictionary<string, object> payload = args ?? new Dictionary<string, object>(StringComparer.Ordinal);

        switch (operationId)
        {
            case "create_component":
                return ExecuteSuppressingConsoleOut(delegate()
                {
                    return componentWriter.Execute(ParseCreateComponentRequest(payload));
                });
            case "create_method":
                return ExecuteSuppressingConsoleOut(delegate()
                {
                    return ExecuteCreateMethod(payload);
                });
            case "set_method_code":
                return ExecuteSuppressingConsoleOut(delegate()
                {
                    return methodWriter.Execute(ParseSetMethodCodeRequest(payload));
                });
            case "apply_element_spec":
                return ExecuteSuppressingConsoleOut(delegate()
                {
                    return elementSpecWriter.Execute(ParseApplyElementSpecRequest(payload));
                });
            case "apply_project_formula":
                return ExecuteSuppressingConsoleOut(delegate()
                {
                    return ExecuteApplyProjectFormula(payload);
                });
            case "delete_component":
                return ExecuteSuppressingConsoleOut(delegate()
                {
                    return ExecuteDeleteComponent(payload);
                });
            case "delete_method":
                return ExecuteSuppressingConsoleOut(delegate()
                {
                    return ExecuteDeleteMethod(payload);
                });
            case "create_folder":
                return ExecuteSuppressingConsoleOut(delegate()
                {
                    return ExecuteCreateFolder(payload);
                });
            case "delete_folder":
                return ExecuteSuppressingConsoleOut(delegate()
                {
                    return ExecuteDeleteFolder(payload);
                });
            default:
                throw new AscetReadException(
                    "unsupported_operation",
                    "parse_batch_operation",
                    "Operation '" + operationId + "' is not supported by the batch write executor.");
        }
    }

    private static CreateComponentWriteRequest ParseCreateComponentRequest(IDictionary<string, object> args)
    {
        string componentPath = AscetCreateComponent.NormalizeComponentPath(GetRequiredString(args, "componentPath", "create_component"));
        AscetComponentKind componentKind = AscetDatabaseExplorerCommon.ParseKind(
            FirstNonEmpty(
                GetOptionalString(args, "kind"),
                GetOptionalString(args, "componentKind")));

        if (componentKind == AscetComponentKind.Unknown)
        {
            throw new AscetReadException("invalid_argument", "create_component", "Batch write create_component requires 'kind'.");
        }

        AscetLanguageKind languageKind = ParseLanguage(
            FirstNonEmpty(
                GetOptionalString(args, "language"),
                GetOptionalString(args, "languageKind")));

        if ((componentKind == AscetComponentKind.Class || componentKind == AscetComponentKind.Module)
            && languageKind == AscetLanguageKind.Unknown)
        {
            languageKind = AscetLanguageKind.ESDL;
        }

        return new CreateComponentWriteRequest
        {
            ComponentPath = componentPath,
            ComponentKind = componentKind,
            LanguageKind = languageKind,
            ReturnExisting = ParseReturnExisting(args, "create_component"),
            VerifyReadback = ParseVerification(args, "create_component", false),
            RollbackOnFailure = GetOptionalBool(args, "rollbackOnFailure")
        };
    }

    private static CreateMethodBatchRequest ParseCreateMethodRequest(IDictionary<string, object> args)
    {
        string methodKindValue = GetOptionalString(args, "methodKind");
        AscetComponentKind componentKind = ParseOptionalComponentKind(GetOptionalString(args, "componentKind"));
        AscetMethodKind methodKind = ResolveCreateMethodKind(methodKindValue, componentKind);

        return new CreateMethodBatchRequest
        {
            ComponentPath = AscetSetMethodCode.NormalizeComponentPath(GetRequiredString(args, "componentPath", "create_method")),
            MethodName = NormalizeMethodName(GetRequiredString(args, "methodName", "create_method")),
            MethodKind = methodKind,
            DiagramName = NormalizeDiagramName(GetOptionalString(args, "diagram")),
            ReturnExisting = ParseReturnExisting(args, "create_method"),
            VerifyReadback = ParseVerification(args, "create_method", false)
        };
    }

    private static SetMethodCodeWriteRequest ParseSetMethodCodeRequest(IDictionary<string, object> args)
    {
        string componentPath = AscetSetMethodCode.NormalizeComponentPath(GetRequiredString(args, "componentPath", "set_method_code"));
        string methodName = GetRequiredString(args, "methodName", "set_method_code").Trim();
        string code = GetRequiredString(args, "code", "set_method_code");

        if (String.IsNullOrWhiteSpace(code))
        {
            throw new AscetReadException("invalid_code_payload", "set_method_code", "Batch write set_method_code requires non-empty 'code'.");
        }

        return new SetMethodCodeWriteRequest
        {
            ComponentPath = componentPath,
            MethodName = methodName,
            Code = code,
            VerifyReadback = ParseVerification(args, "set_method_code", true)
        };
    }

    private static ApplyElementSpecWriteRequest ParseApplyElementSpecRequest(IDictionary<string, object> args)
    {
        string componentPath = AscetDatabaseExplorerCommon.NormalizePath(GetRequiredString(args, "componentPath", "apply_element_spec"), "componentPath");
        object rawSpec = GetRequiredValue(args, "spec", "apply_element_spec");
        string specJson = Protocol.Serialize(rawSpec);
        AscetElementSpecDocument spec = AscetElementSpecDocumentParser.ParseJson(specJson);

        AscetElementApplyMode mode = ParseApplyMode(GetOptionalString(args, "mode"));
        if (GetOptionalBool(args, "deleteMissing") && mode != AscetElementApplyMode.Restore)
        {
            mode = AscetElementApplyMode.Restore;
        }

        return new ApplyElementSpecWriteRequest
        {
            ComponentPath = componentPath,
            ProjectPath = AscetElementFormulaRules.NormalizeProjectPath(GetOptionalString(args, "projectPath")),
            Spec = spec,
            Mode = mode,
            DeleteMissing = GetOptionalBool(args, "deleteMissing"),
            RecreateIncompatible = GetOptionalBool(args, "recreateIncompatible"),
            VerifyReadback = ParseVerification(args, "apply_element_spec", true)
        };
    }

    private static ApplyProjectFormulaBatchRequest ParseApplyProjectFormulaRequest(IDictionary<string, object> args)
    {
        string projectPath = NormalizeProjectPath(GetRequiredString(args, "projectPath", "apply_project_formula"));
        object rawSpec = GetRequiredValue(args, "spec", "apply_project_formula");
        string specJson = Protocol.Serialize(rawSpec);
        AscetProjectFormulaSpecDocument spec = AscetProjectFormulaSpecDocumentParser.ParseJson(specJson);

        if (args != null && args.ContainsKey("mode"))
        {
            spec.Mode = NormalizeProjectFormulaMode(GetOptionalString(args, "mode"));
        }

        if (args != null && args.ContainsKey("deleteMissing"))
        {
            spec.DeleteMissing = GetOptionalBool(args, "deleteMissing");
            spec.HasDeleteMissing = true;
        }

        return new ApplyProjectFormulaBatchRequest
        {
            ProjectPath = projectPath,
            Spec = spec,
            VerifyReadback = ParseVerification(args, "apply_project_formula", true)
        };
    }

    private static DeleteComponentBatchRequest ParseDeleteComponentRequest(IDictionary<string, object> args)
    {
        return new DeleteComponentBatchRequest
        {
            ComponentPath = AscetCreateComponent.NormalizeComponentPath(GetRequiredString(args, "componentPath", "delete_component")),
            IgnoreMissing = ParseIfMissing(args, "delete_component"),
            VerifyReadback = ParseVerification(args, "delete_component", true)
        };
    }

    private static DeleteMethodBatchRequest ParseDeleteMethodRequest(IDictionary<string, object> args)
    {
        return new DeleteMethodBatchRequest
        {
            ComponentPath = AscetReadMethodCode.NormalizeComponentPath(GetRequiredString(args, "componentPath", "delete_method")),
            MethodName = AscetReadMethodCode.NormalizeMethodName(GetRequiredString(args, "methodName", "delete_method")),
            IgnoreMissing = ParseIfMissing(args, "delete_method"),
            VerifyReadback = ParseVerification(args, "delete_method", true)
        };
    }

    private static CreateFolderBatchRequest ParseCreateFolderRequest(IDictionary<string, object> args)
    {
        return new CreateFolderBatchRequest
        {
            FolderPath = NormalizeFolderPath(GetRequiredString(args, "folderPath", "create_folder")),
            VerifyReadback = ParseVerification(args, "create_folder", false)
        };
    }

    private static DeleteFolderBatchRequest ParseDeleteFolderRequest(IDictionary<string, object> args)
    {
        return new DeleteFolderBatchRequest
        {
            FolderPath = NormalizeFolderPath(GetRequiredString(args, "folderPath", "delete_folder")),
            IgnoreMissing = ParseIfMissing(args, "delete_folder"),
            VerifyReadback = ParseVerification(args, "delete_folder", true)
        };
    }

    private AscetWriteExecutionResult ExecuteCreateMethod(IDictionary<string, object> args)
    {
        CreateMethodBatchRequest request = ParseCreateMethodRequest(args);
        AscetMethodCreateResult result = methodCreator.CreateMethod(
            request.ComponentPath,
            request.MethodName,
            request.MethodKind,
            request.DiagramName,
            request.VerifyReadback,
            false,
            request.ReturnExisting);

        return new AscetWriteExecutionResult
        {
            OperationName = "create_method",
            Succeeded = true,
            WriteSucceeded = result != null && (result.Created || result.AlreadyExisted),
            Summary = result == null ? String.Empty : (result.Summary ?? String.Empty),
            Payload = BuildCreateMethodPayload(result),
            Verification = BuildVerificationResult(
                request.VerifyReadback,
                result != null && result.ReadbackVerified,
                result == null ? String.Empty : (result.Summary ?? String.Empty))
        };
    }

    private AscetWriteExecutionResult ExecuteApplyProjectFormula(IDictionary<string, object> args)
    {
        ApplyProjectFormulaBatchRequest request = ParseApplyProjectFormulaRequest(args);
        AscetProjectFormulaApplyResult result = projectFormulaWriter.Apply(
            request.ProjectPath,
            request.Spec,
            request.VerifyReadback);

        return new AscetWriteExecutionResult
        {
            OperationName = "apply_project_formula",
            Succeeded = true,
            WriteSucceeded = result != null && result.WriteSucceeded,
            Summary = BuildProjectFormulaSummary(result),
            Payload = BuildProjectFormulaPayload(result),
            Verification = BuildVerificationResult(
                request.VerifyReadback,
                result != null && result.ReadbackVerified,
                result != null && result.ReadbackVerified ? "verified" : String.Empty)
        };
    }

    private AscetWriteExecutionResult ExecuteDeleteComponent(IDictionary<string, object> args)
    {
        DeleteComponentBatchRequest request = ParseDeleteComponentRequest(args);
        AscetComponentDeleteResult result = componentDeleter.DeleteComponent(
            request.ComponentPath,
            request.VerifyReadback,
            request.IgnoreMissing);

        return new AscetWriteExecutionResult
        {
            OperationName = "delete_component",
            Succeeded = true,
            WriteSucceeded = result != null && (result.Deleted || result.AlreadyMissing),
            Summary = result == null ? String.Empty : (result.Summary ?? String.Empty),
            Payload = BuildDeleteComponentPayload(result),
            Verification = BuildVerificationResult(
                request.VerifyReadback,
                result != null && result.ReadbackVerified,
                result == null ? String.Empty : (result.Summary ?? String.Empty))
        };
    }

    private AscetWriteExecutionResult ExecuteDeleteMethod(IDictionary<string, object> args)
    {
        DeleteMethodBatchRequest request = ParseDeleteMethodRequest(args);
        AscetMethodDeleteResult result = methodDeleter.DeleteMethod(
            request.ComponentPath,
            request.MethodName,
            request.VerifyReadback,
            request.IgnoreMissing);

        return new AscetWriteExecutionResult
        {
            OperationName = "delete_method",
            Succeeded = true,
            WriteSucceeded = result != null && (result.Deleted || result.AlreadyMissing),
            Summary = result == null ? String.Empty : (result.Summary ?? String.Empty),
            Payload = BuildDeleteMethodPayload(result),
            Verification = BuildVerificationResult(
                request.VerifyReadback,
                result != null && result.ReadbackVerified,
                result == null ? String.Empty : (result.Summary ?? String.Empty))
        };
    }

    private AscetWriteExecutionResult ExecuteCreateFolder(IDictionary<string, object> args)
    {
        CreateFolderBatchRequest request = ParseCreateFolderRequest(args);
        AscetCreateFolderResult result = folderCreator.CreateFolder(
            request.FolderPath,
            request.VerifyReadback);

        return new AscetWriteExecutionResult
        {
            OperationName = "create_folder",
            Succeeded = true,
            WriteSucceeded = result != null && result.Created,
            Summary = result == null ? String.Empty : (result.Summary ?? String.Empty),
            Payload = BuildCreateFolderPayload(result),
            Verification = BuildVerificationResult(
                request.VerifyReadback,
                result != null && result.ReadbackVerified,
                result == null ? String.Empty : (result.Summary ?? String.Empty))
        };
    }

    private AscetWriteExecutionResult ExecuteDeleteFolder(IDictionary<string, object> args)
    {
        DeleteFolderBatchRequest request = ParseDeleteFolderRequest(args);
        AscetFolderDeleteResult result = folderDeleter.DeleteFolder(
            request.FolderPath,
            request.VerifyReadback,
            request.IgnoreMissing);

        return new AscetWriteExecutionResult
        {
            OperationName = "delete_folder",
            Succeeded = true,
            WriteSucceeded = result != null && (result.Deleted || result.AlreadyMissing),
            Summary = result == null ? String.Empty : (result.Summary ?? String.Empty),
            Payload = BuildDeleteFolderPayload(result),
            Verification = BuildVerificationResult(
                request.VerifyReadback,
                result != null && result.ReadbackVerified,
                result == null ? String.Empty : (result.Summary ?? String.Empty))
        };
    }

    private static Dictionary<string, object> BuildWriteResultPayload(AscetWriteExecutionResult result)
    {
        WriteVerificationResult verification = result == null ? null : result.Verification;
        Dictionary<string, object> actionPayload = result == null
            ? new Dictionary<string, object>(StringComparer.Ordinal)
            : CloneDictionary(result.Payload);

        NormalizeWritePayload(result == null ? String.Empty : result.OperationName, actionPayload, result != null && result.WriteSucceeded, verification);
        Dictionary<string, object> payload = AscetCanonicalWriteResult.NormalizeSuccess(
            actionPayload,
            result != null && result.WriteSucceeded,
            verification != null && verification.Requested,
            verification != null && verification.Attempted && verification.Succeeded);
        payload["operationName"] = result == null ? String.Empty : (result.OperationName ?? String.Empty);
        payload["sequenceNumber"] = result == null ? 0L : result.SequenceNumber;
        payload["writeSucceeded"] = result != null && result.WriteSucceeded;
        payload["summary"] = result == null ? String.Empty : (result.Summary ?? String.Empty);
        payload["verification"] = BuildVerificationPayload(verification);
        return payload;
    }

    private static Dictionary<string, object> BuildVerificationPayload(WriteVerificationResult verification)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>(StringComparer.Ordinal);
        payload["requested"] = verification != null && verification.Requested;
        payload["attempted"] = verification != null && verification.Attempted;
        payload["succeeded"] = verification == null || verification.Succeeded;
        payload["summary"] = verification == null ? String.Empty : (verification.Summary ?? String.Empty);
        payload["details"] = verification == null
            ? new Dictionary<string, object>(StringComparer.Ordinal)
            : CloneDictionary(verification.Details);
        return payload;
    }

    private static void NormalizeWritePayload(string operationName, Dictionary<string, object> payload, bool writeSucceeded, WriteVerificationResult verification)
    {
        if (payload == null)
        {
            return;
        }

        bool verifyRequested = verification != null && verification.Requested;
        bool readbackVerified = verification != null && verification.Attempted && verification.Succeeded;

        if (String.Equals(operationName, "create_component", StringComparison.Ordinal)
            || String.Equals(operationName, "create_method", StringComparison.Ordinal))
        {
            payload["verifyReadbackRequested"] = verifyRequested;
            payload["readbackVerified"] = readbackVerified;
            return;
        }

        if (String.Equals(operationName, "delete_component", StringComparison.Ordinal)
            || String.Equals(operationName, "delete_method", StringComparison.Ordinal))
        {
            payload["WriteSucceeded"] = writeSucceeded;
            payload["VerifyReadbackRequested"] = verifyRequested;
            payload["ReadbackVerified"] = readbackVerified;
            payload["writeSucceeded"] = writeSucceeded;
            payload["verifyReadbackRequested"] = verifyRequested;
            payload["readbackVerified"] = readbackVerified;
            return;
        }

        if (String.Equals(operationName, "set_method_code", StringComparison.Ordinal)
            || String.Equals(operationName, "apply_element_spec", StringComparison.Ordinal)
            || String.Equals(operationName, "apply_project_formula", StringComparison.Ordinal))
        {
            payload["WriteSucceeded"] = writeSucceeded;
            payload["VerifyReadbackRequested"] = verifyRequested;
            payload["ReadbackVerified"] = readbackVerified;
        }
    }

    private static AscetStructuredErrorDto CreateWriteError(AscetWriteError error, string fallbackOperation)
    {
        Dictionary<string, object> details = CloneDictionary(error == null ? null : error.Details);
        if (error != null && !String.IsNullOrWhiteSpace(error.Stage))
        {
            details["stage"] = error.Stage;
        }

        if (error != null && !String.IsNullOrWhiteSpace(error.ExceptionType))
        {
            details["exceptionType"] = error.ExceptionType;
        }

        return AscetErrorMapper.Create(
            error == null || String.IsNullOrWhiteSpace(error.Code) ? "write_failed" : error.Code,
            error == null ? String.Empty : (error.Message ?? String.Empty),
            error == null || String.IsNullOrWhiteSpace(error.Operation) ? (fallbackOperation ?? String.Empty) : error.Operation,
            details);
    }

    private static Dictionary<string, object> CloneDictionary(Dictionary<string, object> source)
    {
        Dictionary<string, object> clone = new Dictionary<string, object>(StringComparer.Ordinal);
        if (source == null)
        {
            return clone;
        }

        foreach (KeyValuePair<string, object> entry in source)
        {
            if (String.IsNullOrWhiteSpace(entry.Key))
            {
                continue;
            }

            clone[entry.Key] = entry.Value;
        }

        return clone;
    }

    private static string GetRequiredString(IDictionary<string, object> args, string key, string operation)
    {
        string value = GetOptionalString(args, key);
        if (String.IsNullOrWhiteSpace(value))
        {
            throw new AscetReadException("invalid_argument", operation, "Batch write operation '" + operation + "' requires '" + key + "'.");
        }

        return value;
    }

    private static object GetRequiredValue(IDictionary<string, object> args, string key, string operation)
    {
        if (args == null || String.IsNullOrWhiteSpace(key) || !args.ContainsKey(key) || args[key] == null)
        {
            throw new AscetReadException("invalid_argument", operation, "Batch write operation '" + operation + "' requires '" + key + "'.");
        }

        return args[key];
    }

    private static string GetOptionalString(IDictionary<string, object> args, string key)
    {
        if (args == null || String.IsNullOrWhiteSpace(key) || !args.ContainsKey(key) || args[key] == null)
        {
            return String.Empty;
        }

        return Convert.ToString(args[key]) ?? String.Empty;
    }

    private static bool GetOptionalBool(IDictionary<string, object> args, string key)
    {
        if (args == null || String.IsNullOrWhiteSpace(key) || !args.ContainsKey(key) || args[key] == null)
        {
            return false;
        }

        object value = args[key];
        if (value is bool)
        {
            return (bool)value;
        }

        if (value is int)
        {
            return (int)value != 0;
        }

        string text = Convert.ToString(value) ?? String.Empty;
        bool parsedBool;
        if (Boolean.TryParse(text, out parsedBool))
        {
            return parsedBool;
        }

        int parsedInt;
        if (Int32.TryParse(text, out parsedInt))
        {
            return parsedInt != 0;
        }

        throw new AscetReadException("invalid_argument", "parse_batch_input", "Field '" + key + "' must be a boolean.");
    }

    private static bool ParseIfMissing(IDictionary<string, object> args, string operation)
    {
        bool hasIfMissing = args != null && args.ContainsKey("ifMissing");
        bool hasIgnoreMissing = args != null && args.ContainsKey("ignoreMissing");

        bool? ifMissingValue = hasIfMissing ? new bool?(ParseIfMissingValue(GetOptionalString(args, "ifMissing"), operation)) : null;
        bool? ignoreMissingValue = hasIgnoreMissing ? new bool?(GetOptionalBool(args, "ignoreMissing")) : null;

        if (ifMissingValue.HasValue && ignoreMissingValue.HasValue && ifMissingValue.Value != ignoreMissingValue.Value)
        {
            throw new AscetReadException(
                "invalid_argument",
                operation,
                "Batch write operation '" + operation + "' received conflicting ifMissing and ignoreMissing values.");
        }

        return ifMissingValue ?? ignoreMissingValue ?? false;
    }

    private static bool ParseIfMissingValue(string value, string operation)
    {
        string normalized = (value ?? String.Empty).Trim().ToLowerInvariant();
        switch (normalized)
        {
            case "fail":
                return false;
            case "ignore":
                return true;
            default:
                throw new AscetReadException(
                    "invalid_argument",
                    operation,
                    "Unsupported ifMissing value '" + (value ?? String.Empty) + "'. Expected fail or ignore.");
        }
    }

    private static bool ParseVerification(IDictionary<string, object> args, string operation, bool defaultValue)
    {
        if (args != null && args.ContainsKey("verifyReadback"))
        {
            return GetOptionalBool(args, "verifyReadback");
        }

        return defaultValue;
    }

    private static bool ParseReturnExisting(IDictionary<string, object> args, string operation)
    {
        if (args == null)
        {
            return false;
        }

        if (args.ContainsKey("returnExisting"))
        {
            return GetOptionalBool(args, "returnExisting");
        }

        string ifExists = GetOptionalString(args, "ifExists");
        if (String.IsNullOrWhiteSpace(ifExists))
        {
            return false;
        }

        string normalized = ifExists.Trim().ToLowerInvariant();
        if (String.Equals(normalized, "return-existing", StringComparison.Ordinal)
            || String.Equals(normalized, "return_existing", StringComparison.Ordinal)
            || String.Equals(normalized, "returnexisting", StringComparison.Ordinal))
        {
            return true;
        }

        if (String.Equals(normalized, "fail", StringComparison.Ordinal))
        {
            return false;
        }

        throw new AscetReadException("invalid_argument", operation, "Unsupported ifExists value '" + ifExists + "'.");
    }

    private static AscetLanguageKind ParseLanguage(string value)
    {
        string normalized = String.IsNullOrWhiteSpace(value) ? String.Empty : value.Trim().ToUpperInvariant();
        switch (normalized)
        {
            case "":
                return AscetLanguageKind.Unknown;
            case "ESDL":
                return AscetLanguageKind.ESDL;
            case "BDE":
                return AscetLanguageKind.BDE;
            case "C":
                return AscetLanguageKind.C;
            default:
                throw new AscetReadException("invalid_argument", "create_component", "Unsupported language '" + value + "'.");
        }
    }

    private static AscetMethodKind ParseMethodKind(string value)
    {
        string normalized = (value ?? String.Empty).Trim().ToLowerInvariant();
        switch (normalized)
        {
            case "abstract":
                return AscetMethodKind.AbstractMethod;
            case "process":
                return AscetMethodKind.Process;
            case "action":
                return AscetMethodKind.Action;
            case "condition":
                return AscetMethodKind.Condition;
            case "trigger":
                return AscetMethodKind.Trigger;
            default:
                throw new AscetReadException("invalid_argument", "create_method", "Unsupported method kind '" + value + "'.");
        }
    }

    private static AscetComponentKind ParseOptionalComponentKind(string value)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            return AscetComponentKind.Unknown;
        }

        return AscetDatabaseExplorerCommon.ParseKind(value);
    }

    private static AscetMethodKind ResolveCreateMethodKind(string methodKindValue, AscetComponentKind componentKind)
    {
        AscetMethodKind methodKind = String.IsNullOrWhiteSpace(methodKindValue)
            ? AscetMethodKind.Unknown
            : ParseMethodKind(methodKindValue);

        if (methodKind == AscetMethodKind.Unknown)
        {
            switch (componentKind)
            {
                case AscetComponentKind.Class:
                    return AscetMethodKind.AbstractMethod;
                case AscetComponentKind.Module:
                    return AscetMethodKind.Process;
                case AscetComponentKind.StateMachine:
                    throw new AscetReadException(
                        "invalid_argument",
                        "create_method",
                        "Batch write create_method requires methodKind for statemachine targets.");
                default:
                    throw new AscetReadException(
                        "invalid_argument",
                        "create_method",
                        "Batch write create_method requires methodKind or componentKind.");
            }
        }

        ValidateCreateMethodKindCompatibility(componentKind, methodKind);
        return methodKind;
    }

    private static void ValidateCreateMethodKindCompatibility(AscetComponentKind componentKind, AscetMethodKind methodKind)
    {
        if (componentKind == AscetComponentKind.Unknown)
        {
            return;
        }

        bool compatible;
        switch (componentKind)
        {
            case AscetComponentKind.Class:
                compatible = methodKind == AscetMethodKind.AbstractMethod;
                break;
            case AscetComponentKind.Module:
                compatible = methodKind == AscetMethodKind.Process;
                break;
            case AscetComponentKind.StateMachine:
                compatible = methodKind == AscetMethodKind.Action
                    || methodKind == AscetMethodKind.Condition
                    || methodKind == AscetMethodKind.Trigger;
                break;
            default:
                compatible = false;
                break;
        }

        if (!compatible)
        {
            throw new AscetReadException(
                "invalid_argument",
                "create_method",
                "Batch write create_method methodKind '" + methodKind.ToString() + "' is not compatible with componentKind '" + componentKind.ToString() + "'.");
        }
    }

    private static AscetElementApplyMode ParseApplyMode(string mode)
    {
        string normalized = String.IsNullOrWhiteSpace(mode)
            ? String.Empty
            : mode.Trim().Replace("_", String.Empty).Replace("-", String.Empty).Replace(" ", String.Empty).ToLowerInvariant();

        switch (normalized)
        {
            case "":
            case "apply":
            case "update":
                return AscetElementApplyMode.Apply;
            case "restore":
                return AscetElementApplyMode.Restore;
            default:
                throw new AscetReadException("invalid_argument", "apply_element_spec", "Unsupported mode '" + (mode ?? String.Empty) + "'.");
        }
    }

    private static string NormalizeOperationId(string operationId)
    {
        return String.IsNullOrWhiteSpace(operationId)
            ? String.Empty
            : operationId.Trim().ToLowerInvariant();
    }

    private static string FirstNonEmpty(string first, string second)
    {
        if (!String.IsNullOrWhiteSpace(first))
        {
            return first;
        }

        return second ?? String.Empty;
    }

    private static string NormalizeMethodName(string methodName)
    {
        if (String.IsNullOrWhiteSpace(methodName))
        {
            throw new AscetReadException("invalid_argument", "create_method", "Method name must not be empty.");
        }

        return methodName.Trim();
    }

    private static string NormalizeDiagramName(string diagram)
    {
        return String.IsNullOrWhiteSpace(diagram) ? "Main" : diagram.Trim();
    }

    private static string NormalizeProjectPath(string projectPath)
    {
        if (String.IsNullOrWhiteSpace(projectPath))
        {
            throw new AscetReadException("invalid_argument", "apply_project_formula", "Project path must not be empty.");
        }

        string normalized = projectPath.Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }

        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException("invalid_argument", "apply_project_formula", "Project path must contain a project name.");
        }

        return normalized;
    }

    private static string NormalizeProjectFormulaMode(string mode)
    {
        string normalized = AscetProjectFormulaSpecDocumentParser.NormalizeMode(mode);
        if (!String.Equals(normalized, "apply", StringComparison.Ordinal) &&
            !String.Equals(normalized, "restore", StringComparison.Ordinal))
        {
            throw new AscetReadException("invalid_argument", "apply_project_formula", "Unsupported mode '" + (mode ?? String.Empty) + "'.");
        }

        return normalized;
    }

    private static WriteVerificationResult BuildVerificationResult(bool requested, bool succeeded, string summary)
    {
        return new WriteVerificationResult
        {
            Requested = requested,
            Attempted = requested,
            Succeeded = !requested || succeeded,
            Summary = summary ?? String.Empty,
            Details = new Dictionary<string, object>(StringComparer.Ordinal)
        };
    }

    private static Dictionary<string, object> BuildCreateMethodPayload(AscetMethodCreateResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>(StringComparer.Ordinal);
        payload["ComponentPath"] = result == null ? String.Empty : (result.ComponentPath ?? String.Empty);
        payload["MethodName"] = result == null ? String.Empty : (result.MethodName ?? String.Empty);
        payload["MethodKind"] = result == null ? AscetMethodKind.Unknown.ToString() : result.MethodKind.ToString();
        payload["Diagram"] = result == null ? String.Empty : (result.DiagramName ?? String.Empty);
        payload["Created"] = result != null && result.Created;
        payload["AlreadyExisted"] = result != null && result.AlreadyExisted;
        payload["TargetKey"] = result == null ? String.Empty : (result.TargetKey ?? String.Empty);
        payload["VerifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        payload["RollbackOnFailureRequested"] = result != null && result.RollbackOnFailureRequested;
        payload["ReadbackVerified"] = result != null && result.ReadbackVerified;
        payload["saveSucceeded"] = result != null && result.SaveSucceeded;
        payload["verificationMode"] = result == null ? String.Empty : (result.VerificationMode ?? String.Empty);
        payload["SaveSucceeded"] = result != null && result.SaveSucceeded;
        payload["VerificationMode"] = result == null ? String.Empty : (result.VerificationMode ?? String.Empty);
        return payload;
    }

    private static Dictionary<string, object> BuildProjectFormulaPayload(AscetProjectFormulaApplyResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>(StringComparer.Ordinal);
        payload["ProjectPath"] = result == null ? String.Empty : (result.ProjectPath ?? String.Empty);
        payload["Mode"] = result == null ? String.Empty : (result.Mode ?? String.Empty);
        payload["DeleteMissing"] = result != null && result.DeleteMissing;
        payload["CreatedFormulas"] = ToStringList(result == null ? null : result.CreatedFormulas);
        payload["UpdatedFormulas"] = ToStringList(result == null ? null : result.UpdatedFormulas);
        payload["DeletedFormulas"] = ToStringList(result == null ? null : result.DeletedFormulas);
        payload["Issues"] = ToStringList(result == null ? null : result.Issues);
        payload["WriteSucceeded"] = result != null && result.WriteSucceeded;
        payload["VerifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        payload["ReadbackVerified"] = result != null && result.ReadbackVerified;
        payload["saveSucceeded"] = result != null && result.SaveSucceeded;
        payload["verificationMode"] = result == null ? String.Empty : (result.VerificationMode ?? String.Empty);
        return payload;
    }

    private static Dictionary<string, object> BuildDeleteComponentPayload(AscetComponentDeleteResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>(StringComparer.Ordinal);
        payload["ComponentPath"] = result == null ? String.Empty : (result.ComponentPath ?? String.Empty);
        payload["FolderPath"] = result == null ? String.Empty : (result.FolderPath ?? String.Empty);
        payload["ComponentName"] = result == null ? String.Empty : (result.ComponentName ?? String.Empty);
        payload["Deleted"] = result != null && result.Deleted;
        payload["AlreadyMissing"] = result != null && result.AlreadyMissing;
        payload["VerifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        payload["ReadbackVerified"] = result != null && result.ReadbackVerified;
        payload["saveSucceeded"] = result != null && result.SaveSucceeded;
        payload["verificationMode"] = result == null ? String.Empty : (result.VerificationMode ?? String.Empty);
        return payload;
    }

    private static Dictionary<string, object> BuildDeleteMethodPayload(AscetMethodDeleteResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>(StringComparer.Ordinal);
        payload["ComponentPath"] = result == null ? String.Empty : (result.ComponentPath ?? String.Empty);
        payload["MethodName"] = result == null ? String.Empty : (result.MethodName ?? String.Empty);
        payload["MethodKind"] = result == null ? AscetMethodKind.Unknown.ToString() : result.MethodKind.ToString();
        payload["Diagram"] = result == null ? String.Empty : (result.DiagramName ?? String.Empty);
        payload["Deleted"] = result != null && result.Deleted;
        payload["AlreadyMissing"] = result != null && result.AlreadyMissing;
        payload["TargetKey"] = result == null ? String.Empty : (result.TargetKey ?? String.Empty);
        payload["VerifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        payload["ReadbackVerified"] = result != null && result.ReadbackVerified;
        payload["saveSucceeded"] = result != null && result.SaveSucceeded;
        payload["verificationMode"] = result == null ? String.Empty : (result.VerificationMode ?? String.Empty);
        return payload;
    }

    private static Dictionary<string, object> BuildDeleteFolderPayload(AscetFolderDeleteResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>(StringComparer.Ordinal);
        payload["FolderPath"] = result == null ? String.Empty : (result.FolderPath ?? String.Empty);
        payload["Deleted"] = result != null && result.Deleted;
        payload["AlreadyMissing"] = result != null && result.AlreadyMissing;
        payload["VerifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        payload["ReadbackVerified"] = result != null && result.ReadbackVerified;
        payload["saveSucceeded"] = result != null && result.SaveSucceeded;
        payload["verificationMode"] = result == null ? String.Empty : (result.VerificationMode ?? String.Empty);
        return payload;
    }

    private static Dictionary<string, object> BuildCreateFolderPayload(AscetCreateFolderResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>(StringComparer.Ordinal);
        payload["FolderPath"] = result == null ? String.Empty : (result.FolderPath ?? String.Empty);
        payload["Created"] = result != null && result.Created;
        payload["CreatedCount"] = result == null ? 0 : result.CreatedCount;
        payload["ExistingCount"] = result == null ? 0 : result.ExistingCount;
        payload["VerifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        payload["ReadbackVerified"] = result != null && result.ReadbackVerified;
        payload["saveSucceeded"] = result != null && result.SaveSucceeded;
        payload["verificationMode"] = result == null ? String.Empty : (result.VerificationMode ?? String.Empty);
        return payload;
    }

    private static string BuildProjectFormulaSummary(AscetProjectFormulaApplyResult result)
    {
        if (result == null)
        {
            return String.Empty;
        }

        int created = result.CreatedFormulas == null ? 0 : result.CreatedFormulas.Count;
        int updated = result.UpdatedFormulas == null ? 0 : result.UpdatedFormulas.Count;
        int deleted = result.DeletedFormulas == null ? 0 : result.DeletedFormulas.Count;
        return created.ToString() + " created, " + updated.ToString() + " updated, " + deleted.ToString() + " deleted.";
    }

    private static List<string> ToStringList(IList<string> values)
    {
        List<string> result = new List<string>();
        if (values == null)
        {
            return result;
        }

        for (int i = 0; i < values.Count; i++)
        {
            result.Add(values[i] ?? String.Empty);
        }

        return result;
    }

    private static T ExecuteSuppressingConsoleOut<T>(Func<T> action)
    {
        if (action == null)
        {
            throw new ArgumentNullException("action");
        }

        lock (ConsoleSuppressionGate)
        {
            TextWriter originalOut = Console.Out;
            try
            {
                Console.SetOut(SuppressedConsoleOut);
                return action();
            }
            finally
            {
                Console.SetOut(originalOut);
            }
        }
    }

    private sealed class CreateMethodBatchRequest
    {
        public string ComponentPath { get; set; }
        public string MethodName { get; set; }
        public AscetMethodKind MethodKind { get; set; }
        public string DiagramName { get; set; }
        public bool ReturnExisting { get; set; }
        public bool VerifyReadback { get; set; }
    }

    private sealed class ApplyProjectFormulaBatchRequest
    {
        public string ProjectPath { get; set; }
        public AscetProjectFormulaSpecDocument Spec { get; set; }
        public bool VerifyReadback { get; set; }
    }

    private sealed class DeleteComponentBatchRequest
    {
        public string ComponentPath { get; set; }
        public bool IgnoreMissing { get; set; }
        public bool VerifyReadback { get; set; }
    }

    private sealed class DeleteMethodBatchRequest
    {
        public string ComponentPath { get; set; }
        public string MethodName { get; set; }
        public bool IgnoreMissing { get; set; }
        public bool VerifyReadback { get; set; }
    }

    private sealed class CreateFolderBatchRequest
    {
        public string FolderPath { get; set; }
        public bool VerifyReadback { get; set; }
    }

    private sealed class DeleteFolderBatchRequest
    {
        public string FolderPath { get; set; }
        public bool IgnoreMissing { get; set; }
        public bool VerifyReadback { get; set; }
    }

    private static string NormalizeFolderPath(string folderPath)
    {
        string normalized = (folderPath ?? String.Empty).Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }

        while (normalized.EndsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(0, normalized.Length - 1);
        }

        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException("invalid_argument", "normalize_folder_path", "Folder path must not be empty.");
        }

        return normalized;
    }
}
