using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

internal sealed class AscetWriteHostDispatcher
{
    private readonly AscetWriteHostCapabilityService _capabilityService;
    private readonly ComponentCreateService _componentCreateService;
    private readonly MethodCreateService _methodCreateService;
    private readonly MethodSignatureService _methodSignatureService;
    private readonly MethodWriteService _methodWriteService;
    private readonly ComponentClassifier _classifier;

    public AscetWriteHostDispatcher()
        : this(
            new AscetWriteHostCapabilityService(),
            new ComponentCreateService(),
            new MethodCreateService(),
            new MethodSignatureService(),
            new MethodWriteService())
    {
    }

    internal AscetWriteHostDispatcher(
        AscetWriteHostCapabilityService capabilityService,
        ComponentCreateService componentCreateService,
        MethodCreateService methodCreateService,
        MethodSignatureService methodSignatureService,
        MethodWriteService methodWriteService)
    {
        _capabilityService = capabilityService ?? new AscetWriteHostCapabilityService();
        _componentCreateService = componentCreateService ?? new ComponentCreateService();
        _methodCreateService = methodCreateService ?? new MethodCreateService();
        _methodSignatureService = methodSignatureService ?? new MethodSignatureService();
        _methodWriteService = methodWriteService ?? new MethodWriteService();
        _classifier = new ComponentClassifier();
    }

    public Dictionary<string, object> Dispatch(string commandId, Dictionary<string, object> payload, AscetWriteHostDispatchContext context)
    {
        if (context == null)
        {
            throw new AscetReadException("invalid_argument", "dispatch_request", "Write-host dispatch context is required.");
        }

        string operationId;
        if (!_capabilityService.TryResolveOperationId(commandId, out operationId))
        {
            throw new AscetReadException(
                "unsupported_command",
                "dispatch_request",
                "AscetWriteHost does not support command '" + (commandId ?? String.Empty) + "' yet.");
        }

        if (String.Equals(operationId, "capabilities", StringComparison.Ordinal))
        {
            return DispatchCapabilities(context);
        }

        if (String.Equals(operationId, "create_component", StringComparison.Ordinal))
        {
            return DispatchCreateComponent(payload, context);
        }

        if (String.Equals(operationId, "create_method", StringComparison.Ordinal))
        {
            return DispatchCreateMethod(payload, context);
        }

        if (String.Equals(operationId, "set_method_code", StringComparison.Ordinal) ||
            String.Equals(operationId, "set_class_method_code", StringComparison.Ordinal))
        {
            return DispatchSetMethodCode(operationId, payload, context);
        }

        if (String.Equals(operationId, "set_method_signature", StringComparison.Ordinal))
        {
            return DispatchSetMethodSignature(payload, context);
        }

        throw new AscetReadException(
            "not_implemented",
            "dispatch_request",
            "AscetWriteHost recognizes command '" + (commandId ?? String.Empty) + "', but write execution is not implemented yet.");
    }

    private Dictionary<string, object> DispatchCapabilities(AscetWriteHostDispatchContext context)
    {
        Dictionary<string, object> result = _capabilityService.BuildPayload();
        result["database"] = BuildDatabasePayload(context == null ? null : context.DatabaseRef);
        result["host"] = BuildHostPayload(context, AscetWriteHostCapabilityService.CapabilityCommandId);
        return result;
    }

    private Dictionary<string, object> DispatchCreateComponent(Dictionary<string, object> payload, AscetWriteHostDispatchContext context)
    {
        AscetWriteHostContext writeContext = RequireWriteContext(context);
        AscetSession session = writeContext.GetSession("write_host_create_component");
        AscetComponentCreateResult result = _componentCreateService.CreateComponentInSession(
            session,
            NormalizeRequiredString(payload, "componentPath", "create_component"),
            ParseComponentKind(payload),
            ParseLanguageKind(payload),
            GetOptionalBool(payload, "verifyReadback"),
            GetOptionalBool(payload, "rollbackOnFailure"),
            GetOptionalBool(payload, "returnExisting") || String.Equals(GetOptionalString(payload, "ifExists"), "return-existing", StringComparison.OrdinalIgnoreCase));

        if (result != null && result.Created && result.VerifyReadbackRequested)
        {
            VerifyCreatedComponentInFreshSession(
                context,
                result,
                NormalizeRequiredString(payload, "componentPath", "create_component"));
        }

        return BuildWriteResultPayload(
            "create_component",
            BuildCreateComponentPayload(result),
            context);
    }

    private Dictionary<string, object> DispatchCreateMethod(Dictionary<string, object> payload, AscetWriteHostDispatchContext context)
    {
        AscetSession session = RequireWriteContext(context).GetSession("write_host_create_method");
        AscetMethodCreateResult result = _methodCreateService.CreateMethodInSession(
            session,
            NormalizeRequiredString(payload, "componentPath", "create_method"),
            NormalizeRequiredString(payload, "methodName", "create_method"),
            ParseMethodKind(payload),
            NormalizeOptionalString(payload, "diagram"),
            GetOptionalBool(payload, "verifyReadback"),
            GetOptionalBool(payload, "rollbackOnFailure"),
            GetOptionalBool(payload, "returnExisting") || String.Equals(GetOptionalString(payload, "ifExists"), "return-existing", StringComparison.OrdinalIgnoreCase));

        return BuildWriteResultPayload(
            "create_method",
            BuildCreateMethodPayload(result),
            context);
    }

    private Dictionary<string, object> DispatchSetMethodCode(string operationId, Dictionary<string, object> payload, AscetWriteHostDispatchContext context)
    {
        AscetSession session = RequireWriteContext(context).GetSession("write_host_set_method_code");
        string componentPath = NormalizeRequiredString(payload, "componentPath", operationId);
        string methodName = NormalizeRequiredString(payload, "methodName", operationId);
        string code = ResolveMethodCode(payload, operationId);
        AscetItemRef component = ResolveComponentInSession(session, componentPath);
        AscetMethodWriteResult result = _methodWriteService.SetMethodCodeInSession(
            session,
            component,
            methodName,
            code,
            GetOptionalBool(payload, "verifyReadback"));

        return BuildWriteResultPayload(
            operationId,
            BuildMethodWritePayload(result),
            context);
    }

    private Dictionary<string, object> DispatchSetMethodSignature(Dictionary<string, object> payload, AscetWriteHostDispatchContext context)
    {
        AscetSession session = RequireWriteContext(context).GetSession("write_host_set_method_signature");
        AscetMethodSignatureResult result = _methodSignatureService.ApplySignatureInSession(
            session,
            NormalizeRequiredString(payload, "componentPath", "set_method_signature"),
            NormalizeRequiredString(payload, "methodName", "set_method_signature"),
            MethodSignatureService.ParseSignatureSpec(payload ?? new Dictionary<string, object>()),
            GetOptionalBool(payload, "verifyReadback"));

        return BuildWriteResultPayload(
            "set_method_signature",
            MethodSignatureService.BuildPayload(result),
            context);
    }

    private static AscetWriteHostContext RequireWriteContext(AscetWriteHostDispatchContext context)
    {
        if (context == null)
        {
            throw new AscetReadException("tool_connect_failed", "dispatch_request", "Write host context is not available.");
        }

        if (context.WriteContext != null)
        {
            return context.WriteContext;
        }

        AscetLiveContext liveContext = new AscetLiveContextFactory().Create();
        context.WriteContext = new AscetWriteHostContext(liveContext);
        if (context.SessionGeneration <= 0)
        {
            AscetLiveContextSnapshot snapshot = context.WriteContext.GetSnapshot();
            context.SessionGeneration = snapshot == null ? 0 : snapshot.SessionGeneration;
            context.DatabaseBindingGeneration = snapshot == null ? 0 : snapshot.DatabaseBindingGeneration;
            context.DatabaseRef = snapshot == null ? null : snapshot.DatabaseRef;
        }

        return context.WriteContext;
    }

    private static string NormalizeRequiredString(IDictionary<string, object> payload, string key, string operation)
    {
        string value = GetOptionalString(payload, key);
        if (String.IsNullOrWhiteSpace(value))
        {
            throw new AscetReadException("invalid_argument", operation, "Field '" + key + "' is required.");
        }

        return value.Trim();
    }

    private static string NormalizeOptionalString(IDictionary<string, object> payload, string key)
    {
        string value = GetOptionalString(payload, key);
        return String.IsNullOrWhiteSpace(value) ? String.Empty : value.Trim();
    }

    private static string GetOptionalString(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return Convert.ToString(payload[key]) ?? String.Empty;
    }

    private static bool GetOptionalBool(IDictionary<string, object> payload, string key)
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
        return Boolean.TryParse(Convert.ToString(value) ?? String.Empty, out parsed) && parsed;
    }

    private static AscetComponentKind ParseComponentKind(IDictionary<string, object> payload)
    {
        AscetComponentKind kind = AscetDatabaseExplorerCommon.ParseKind(GetOptionalString(payload, "kind"));
        if (kind == AscetComponentKind.Unknown)
        {
            throw new AscetReadException("invalid_argument", "create_component", "Field 'kind' is required.");
        }

        return kind;
    }

    private static AscetLanguageKind ParseLanguageKind(IDictionary<string, object> payload)
    {
        string language = GetOptionalString(payload, "language");
        if (String.IsNullOrWhiteSpace(language))
        {
            return AscetLanguageKind.Unknown;
        }

        switch (language.Trim().ToUpperInvariant())
        {
            case "ESDL":
                return AscetLanguageKind.ESDL;
            case "BDE":
                return AscetLanguageKind.BDE;
            case "C":
                return AscetLanguageKind.C;
            default:
                throw new AscetReadException("invalid_argument", "create_component", "Unsupported language '" + language + "'.");
        }
    }

    private static AscetMethodKind ParseMethodKind(IDictionary<string, object> payload)
    {
        string methodKind = GetOptionalString(payload, "methodKind");
        switch ((methodKind ?? String.Empty).Trim().ToLowerInvariant())
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
                throw new AscetReadException("invalid_argument", "create_method", "Unsupported method kind '" + methodKind + "'.");
        }
    }

    private AscetItemRef ResolveComponentInSession(AscetSession session, string componentPath)
    {
        AscetItemPath parsed = AscetItemPath.Parse(componentPath);
        AscetDataBase database = session.GetCurrentDatabaseHandle();
        DataBaseItem item = database.GetItemInFolder(parsed.ItemName, parsed.FolderPath ?? String.Empty);
        if (item == null)
        {
            throw new AscetReadException(
                "component_not_found",
                "resolve_component",
                "Component '" + componentPath + "' was not found.");
        }

        return _classifier.ToItemRef(item);
    }

    private static string ResolveMethodCode(IDictionary<string, object> payload, string operation)
    {
        string code = GetOptionalString(payload, "code");
        if (!String.IsNullOrWhiteSpace(code))
        {
            return code;
        }

        string codeFile = NormalizeRequiredString(payload, "codeFile", operation);
        return AscetSetMethodCode.ReadCodeFile(codeFile);
    }

    private Dictionary<string, object> BuildWriteResultPayload(string operation, Dictionary<string, object> payload, AscetWriteHostDispatchContext context)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["operation"] = operation ?? String.Empty;
        result["payload"] = payload ?? new Dictionary<string, object>();
        result["database"] = BuildDatabasePayload(context == null ? null : context.DatabaseRef);
        result["host"] = BuildHostPayload(context, _capabilityService.ToHostCommandId(operation));
        return result;
    }

    private static Dictionary<string, object> BuildCreateComponentPayload(AscetComponentCreateResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>(StringComparer.Ordinal);
        payload["componentPath"] = result == null ? String.Empty : (result.ComponentPath ?? String.Empty);
        payload["folderPath"] = result == null ? String.Empty : (result.FolderPath ?? String.Empty);
        payload["componentName"] = result == null ? String.Empty : (result.ComponentName ?? String.Empty);
        payload["kind"] = result == null ? "unknown" : AscetDatabaseExplorerCommon.KindToSchema(result.ComponentKind);
        payload["languageKind"] = result == null ? AscetLanguageKind.Unknown.ToString() : result.LanguageKind.ToString();
        payload["created"] = result != null && result.Created;
        payload["alreadyExisted"] = result != null && result.AlreadyExisted;
        payload["verifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        payload["rollbackOnFailureRequested"] = result != null && result.RollbackOnFailureRequested;
        payload["readbackVerified"] = result != null && result.ReadbackVerified;
        payload["summary"] = result == null ? String.Empty : (result.Summary ?? String.Empty);
        payload["expectedDefaultScaffold"] = AscetComponentScaffoldMetadata.BuildExpectedDefaultScaffold(result);
        return payload;
    }

    private static Dictionary<string, object> BuildCreateMethodPayload(AscetMethodCreateResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>(StringComparer.Ordinal);
        payload["componentPath"] = result == null ? String.Empty : (result.ComponentPath ?? String.Empty);
        payload["methodName"] = result == null ? String.Empty : (result.MethodName ?? String.Empty);
        payload["methodKind"] = result == null ? AscetMethodKind.Unknown.ToString() : result.MethodKind.ToString();
        payload["diagramName"] = result == null ? String.Empty : (result.DiagramName ?? String.Empty);
        payload["created"] = result != null && result.Created;
        payload["alreadyExisted"] = result != null && result.AlreadyExisted;
        payload["targetKey"] = result == null ? String.Empty : (result.TargetKey ?? String.Empty);
        payload["verifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        payload["rollbackOnFailureRequested"] = result != null && result.RollbackOnFailureRequested;
        payload["readbackVerified"] = result != null && result.ReadbackVerified;
        payload["summary"] = result == null ? String.Empty : (result.Summary ?? String.Empty);
        return payload;
    }

    private void VerifyCreatedComponentInFreshSession(
        AscetWriteHostDispatchContext context,
        AscetComponentCreateResult result,
        string requestedComponentPath)
    {
        int[] retryDelaysMs = new int[] { 0, 200, 500 };
        AscetReadException lastAscetError = null;

        for (int attempt = 0; attempt < retryDelaysMs.Length; attempt++)
        {
            if (retryDelaysMs[attempt] > 0)
            {
                Thread.Sleep(retryDelaysMs[attempt]);
            }

            try
            {
                AscetItemRef resolved;
                using (AscetSession verifySession = OpenVerificationSession(
                    context == null ? null : context.DatabaseRef,
                    "verify_create_component_after_refresh"))
                {
                    resolved = _componentCreateService.ReadComponentInSession(
                        verifySession,
                        result.ComponentPath ?? requestedComponentPath);
                }

                bool readbackVerified = resolved != null &&
                    String.Equals(resolved.Path ?? String.Empty, result.ComponentPath ?? String.Empty, StringComparison.Ordinal) &&
                    resolved.Kind == result.ComponentKind &&
                    (result.ComponentKind == AscetComponentKind.StateMachine || resolved.LanguageKind == result.LanguageKind);

                if (!readbackVerified)
                {
                    throw new AscetReadException(
                        "readback_mismatch",
                        "create_component",
                        "Readback verification failed for component '" + (result.ComponentPath ?? String.Empty) + "'.");
                }

                result.ComponentPath = resolved.Path ?? result.ComponentPath;
                if (result.ComponentKind == AscetComponentKind.StateMachine)
                {
                    result.LanguageKind = resolved.LanguageKind;
                }

                result.ReadbackVerified = true;
                return;
            }
            catch (AscetReadException ex)
            {
                lastAscetError = ex;
                if (!String.Equals(ex.Code, "database_not_open", StringComparison.Ordinal) &&
                    !String.Equals(ex.Code, "component_not_found", StringComparison.Ordinal))
                {
                    throw;
                }
            }
        }

        if (lastAscetError != null)
        {
            throw lastAscetError;
        }
    }

    private static AscetSession OpenVerificationSession(AscetDatabaseRef databaseRef, string operation)
    {
        AscetSession session = new AscetSession();
        if (session == null)
        {
            throw new AscetReadException("tool_connect_failed", operation, "Failed to create ASCET ToolAPI session.");
        }

        Ascet tool = session.GetToolHandle();
        if (tool == null)
        {
            session.Dispose();
            throw new AscetReadException("tool_connect_failed", operation, "ASCET ToolAPI session handle is not available.");
        }

        AscetDataBase database = null;
        try
        {
            database = tool.GetCurrentDataBase();
        }
        catch (Exception ex)
        {
            session.Dispose();
            throw new AscetReadException("database_binding_invalid", operation, "Failed to resolve the current ASCET database handle.", ex);
        }

        if (database == null)
        {
            string databasePath = databaseRef == null ? String.Empty : (databaseRef.Path ?? String.Empty);
            if (!String.IsNullOrWhiteSpace(databasePath) && Directory.Exists(databasePath))
            {
                try
                {
                    database = tool.OpenDataBase(databasePath);
                }
                catch (Exception ex)
                {
                    session.Dispose();
                    throw new AscetReadException("database_binding_invalid", operation, "Failed to reopen ASCET database '" + databasePath + "'.", ex);
                }
            }
        }

        if (database == null)
        {
            session.Dispose();
            throw new AscetReadException("database_not_open", operation, "GetCurrentDataBase returned null. Open a database in ASCET first.");
        }

        return session;
    }

    private static Dictionary<string, object> BuildMethodWritePayload(AscetMethodWriteResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>(StringComparer.Ordinal);
        payload["componentPath"] = result == null ? String.Empty : (result.ComponentPath ?? String.Empty);
        payload["componentKind"] = result == null ? AscetComponentKind.Unknown.ToString() : result.ComponentKind.ToString();
        payload["languageKind"] = result == null ? AscetLanguageKind.Unknown.ToString() : result.LanguageKind.ToString();
        payload["methodName"] = result == null ? String.Empty : (result.MethodName ?? String.Empty);
        payload["methodKind"] = result == null ? AscetMethodKind.Unknown.ToString() : result.MethodKind.ToString();
        payload["previousCodeLength"] = result == null ? 0 : result.PreviousCodeLength;
        payload["newCodeLength"] = result == null ? 0 : result.NewCodeLength;
        payload["writeSucceeded"] = result != null && result.WriteSucceeded;
        payload["verifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        payload["readbackVerified"] = result != null && result.ReadbackVerified;
        return payload;
    }

    private static Dictionary<string, object> BuildDatabasePayload(AscetDatabaseRef databaseRef)
    {
        Dictionary<string, object> database = new Dictionary<string, object>();
        database["name"] = databaseRef == null ? String.Empty : (databaseRef.Name ?? String.Empty);
        database["path"] = databaseRef == null ? String.Empty : (databaseRef.Path ?? String.Empty);
        return database;
    }

    private Dictionary<string, object> BuildHostPayload(AscetWriteHostDispatchContext context, string commandId)
    {
        Dictionary<string, object> host = _capabilityService.BuildPayload();
        host["commandId"] = commandId ?? String.Empty;
        host["requestCount"] = context.RequestCount;
        host["startedUtc"] = context.StartedUtc.ToString("o");
        host["sessionGeneration"] = context.SessionGeneration;
        host["databaseBindingGeneration"] = context.DatabaseBindingGeneration;
        return host;
    }
}

internal sealed class AscetWriteHostDispatchContext
{
    public AscetWriteHostDispatchContext()
    {
        StartedUtc = DateTime.UtcNow;
        RequestCount = 0;
        SessionGeneration = 1;
        DatabaseBindingGeneration = 1;
        DatabaseRef = null;
        WriteContext = null;
    }

    public DateTime StartedUtc { get; set; }
    public int RequestCount { get; set; }
    public int SessionGeneration { get; set; }
    public int DatabaseBindingGeneration { get; set; }
    public AscetDatabaseRef DatabaseRef { get; set; }
    public AscetWriteHostContext WriteContext { get; set; }
}
