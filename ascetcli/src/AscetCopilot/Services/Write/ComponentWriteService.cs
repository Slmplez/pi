using System;
using System.Collections.Generic;

public sealed class CreateComponentWriteRequest
{
    public CreateComponentWriteRequest()
    {
        ComponentPath = String.Empty;
        ComponentKind = AscetComponentKind.Unknown;
        LanguageKind = AscetLanguageKind.Unknown;
        ReturnExisting = false;
        VerifyReadback = false;
        RollbackOnFailure = false;
    }

    public string ComponentPath { get; set; }
    public AscetComponentKind ComponentKind { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
    public bool ReturnExisting { get; set; }
    public bool VerifyReadback { get; set; }
    public bool RollbackOnFailure { get; set; }
}

public interface IExecComponentWriteService
{
    CreateComponentWriteRequest ParseExecArguments(string[] args);
    AscetWriteExecutionResult Execute(CreateComponentWriteRequest request);
}

public sealed class ComponentWriteService : IExecComponentWriteService
{
    private readonly IComponentCreateService creator;
    private readonly AscetWriteExecutor executor;

    public ComponentWriteService()
        : this(new ComponentCreateService(), null)
    {
    }

    public ComponentWriteService(IComponentCreateService creator, AscetWriteExecutor executor)
    {
        this.creator = creator ?? new ComponentCreateService();
        this.executor = executor ?? new AscetWriteExecutor(
            new WriteVerificationService(
                new CreateComponentVerificationHook()));
    }

    public CreateComponentWriteRequest ParseExecArguments(string[] args)
    {
        AscetCreateComponentArguments parsed = AscetCreateComponent.ParseArguments(args);
        return new CreateComponentWriteRequest
        {
            ComponentPath = parsed.ComponentPath ?? String.Empty,
            ComponentKind = parsed.ComponentKind,
            LanguageKind = parsed.LanguageKind,
            ReturnExisting = parsed.ReturnExisting,
            VerifyReadback = parsed.VerifyReadback,
            RollbackOnFailure = parsed.RollbackOnFailure
        };
    }

    public AscetWriteExecutionResult Execute(CreateComponentWriteRequest request)
    {
        if (request == null)
        {
            throw new ArgumentNullException("request");
        }

        Dictionary<string, object> metadata = new Dictionary<string, object>(StringComparer.Ordinal);
        metadata["componentPath"] = request.ComponentPath ?? String.Empty;
        metadata["componentKind"] = request.ComponentKind.ToString();
        metadata["languageKind"] = request.LanguageKind.ToString();
        metadata["returnExisting"] = request.ReturnExisting;
        metadata["rollbackOnFailure"] = request.RollbackOnFailure;

        return executor.Execute(new AscetWriteRequest
        {
            OperationName = "create_component",
            VerifyAfterWrite = request.VerifyReadback,
            Metadata = metadata,
            ExecuteWrite = delegate(AscetWriteContext context)
            {
                AscetComponentCreateResult result = creator.CreateComponent(
                    request.ComponentPath,
                    request.ComponentKind,
                    request.LanguageKind,
                    false,
                    request.RollbackOnFailure,
                    request.ReturnExisting);

                AscetWriteActionResult actionResult = new AscetWriteActionResult();
                actionResult.Summary = result == null ? String.Empty : (result.Summary ?? String.Empty);
                actionResult.Payload = BuildPayload(result);
                return actionResult;
            }
        });
    }

    private static Dictionary<string, object> BuildPayload(AscetComponentCreateResult result)
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

    private sealed class CreateComponentVerificationHook : IWriteVerificationHook
    {
        private readonly IComponentLocatorService locator;
        private readonly IComponentDeleteService deleter;

        public CreateComponentVerificationHook()
            : this(new ComponentLocatorService(), new ComponentDeleteService())
        {
        }

        public CreateComponentVerificationHook(IComponentLocatorService locator, IComponentDeleteService deleter)
        {
            this.locator = locator ?? new ComponentLocatorService();
            this.deleter = deleter ?? new ComponentDeleteService();
        }

        public WriteVerificationResult Verify(WriteVerificationRequest request)
        {
            string componentPath = GetString(request, "componentPath");
            if (String.IsNullOrWhiteSpace(componentPath))
            {
                return WriteVerificationResult.CreateFailure(
                    "verification_failed",
                    "create_component",
                    "Component path is required for create_component verification.");
            }

            string expectedKind = GetString(request, "componentKind");
            string expectedLanguageKind = GetString(request, "languageKind");
            bool rollbackOnFailure = GetBoolean(request, "rollbackOnFailure");
            bool created = GetBoolean(request == null ? null : request.WriteResult, "created");

            try
            {
                AscetItemPath parsed = AscetItemPath.Parse(componentPath);
                AscetItemRef resolved = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
                if (resolved == null)
                {
                    TryRollback(componentPath, rollbackOnFailure, created);
                    return WriteVerificationResult.CreateFailure(
                        "readback_mismatch",
                        "create_component",
                        "Created component '" + componentPath + "' was not found during readback verification.");
                }

                if (!String.Equals(resolved.Path ?? String.Empty, componentPath, StringComparison.Ordinal))
                {
                    TryRollback(componentPath, rollbackOnFailure, created);
                    return WriteVerificationResult.CreateFailure(
                        "readback_mismatch",
                        "create_component",
                        "Readback resolved component '" + (resolved.Path ?? String.Empty) + "' instead of '" + componentPath + "'.");
                }

                if (!String.Equals(resolved.Kind.ToString(), expectedKind, StringComparison.Ordinal))
                {
                    TryRollback(componentPath, rollbackOnFailure, created);
                    return WriteVerificationResult.CreateFailure(
                        "readback_mismatch",
                        "create_component",
                        "Readback resolved component kind '" + resolved.Kind.ToString() + "' instead of '" + expectedKind + "'.");
                }

                if (!String.Equals(expectedKind, AscetComponentKind.StateMachine.ToString(), StringComparison.Ordinal) &&
                    !String.Equals(resolved.LanguageKind.ToString(), expectedLanguageKind, StringComparison.Ordinal))
                {
                    TryRollback(componentPath, rollbackOnFailure, created);
                    return WriteVerificationResult.CreateFailure(
                        "readback_mismatch",
                        "create_component",
                        "Readback resolved language '" + resolved.LanguageKind.ToString() + "' instead of '" + expectedLanguageKind + "'.");
                }

                return WriteVerificationResult.CreateSuccess("component_exists");
            }
            catch (Exception ex)
            {
                TryRollback(componentPath, rollbackOnFailure, created);
                return new WriteVerificationResult
                {
                    Requested = true,
                    Attempted = true,
                    Succeeded = false,
                    Summary = String.Empty,
                    Error = WriteVerificationService.CreateStructuredError("verification_failed", "create_component", "verify", ex)
                };
            }
        }

        private void TryRollback(string componentPath, bool rollbackOnFailure, bool created)
        {
            if (!rollbackOnFailure || !created || String.IsNullOrWhiteSpace(componentPath))
            {
                return;
            }

            try
            {
                deleter.DeleteComponent(componentPath, false, true);
            }
            catch
            {
            }
        }

        private static string GetString(WriteVerificationRequest request, string key)
        {
            if (request == null || request.Metadata == null || String.IsNullOrWhiteSpace(key) || !request.Metadata.ContainsKey(key))
            {
                return String.Empty;
            }

            return Convert.ToString(request.Metadata[key]) ?? String.Empty;
        }

        private static bool GetBoolean(WriteVerificationRequest request, string key)
        {
            if (request == null || request.Metadata == null || String.IsNullOrWhiteSpace(key) || !request.Metadata.ContainsKey(key))
            {
                return false;
            }

            object value = request.Metadata[key];
            if (value is bool)
            {
                return (bool)value;
            }

            bool parsed;
            return Boolean.TryParse(Convert.ToString(value), out parsed) && parsed;
        }

        private static bool GetBoolean(AscetWriteActionResult result, string key)
        {
            if (result == null || result.Payload == null || String.IsNullOrWhiteSpace(key) || !result.Payload.ContainsKey(key))
            {
                return false;
            }

            object value = result.Payload[key];
            if (value is bool)
            {
                return (bool)value;
            }

            bool parsed;
            return Boolean.TryParse(Convert.ToString(value), out parsed) && parsed;
        }
    }
}
