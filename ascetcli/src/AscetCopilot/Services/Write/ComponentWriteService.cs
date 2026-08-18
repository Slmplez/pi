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
        this.executor = executor ?? new AscetWriteExecutor();
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
            VerifyAfterWrite = false,
            Metadata = metadata,
            ExecuteWrite = delegate(AscetWriteContext context)
            {
                AscetComponentCreateResult result = creator.CreateComponent(
                    request.ComponentPath,
                    request.ComponentKind,
                    request.LanguageKind,
                    request.VerifyReadback,
                    request.RollbackOnFailure,
                    request.ReturnExisting);

                AscetWriteActionResult actionResult = new AscetWriteActionResult();
                actionResult.Summary = result == null ? String.Empty : (result.Summary ?? String.Empty);
                actionResult.Payload = BuildPayload(result);
                actionResult.Verification = BuildSameSessionVerification(result);
                return actionResult;
            }
        });
    }

    private static WriteVerificationResult BuildSameSessionVerification(AscetComponentCreateResult result)
    {
        if (result == null || !result.VerifyReadbackRequested)
        {
            return new WriteVerificationResult
            {
                Requested = false,
                Attempted = false,
                Succeeded = true,
                Summary = "verification_not_requested"
            };
        }

        if (result.ReadbackVerified)
        {
            return new WriteVerificationResult
            {
                Requested = true,
                Attempted = true,
                Succeeded = true,
                Summary = result.VerificationMode ?? "same_session_exact_path"
            };
        }

        return WriteVerificationResult.CreateFailure(
            "verification_failed",
            "create_component",
            "Same-session create_component verification did not succeed.");
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
        payload["saveSucceeded"] = result != null && result.SaveSucceeded;
        payload["changed"] = result != null && result.Changed;
        payload["mutationStatus"] = result == null ? String.Empty : (result.MutationStatus ?? String.Empty);
        payload["saveAttempted"] = result != null && result.SaveAttempted;
        payload["saveState"] = result == null ? String.Empty : (result.SaveState ?? String.Empty);
        payload["verified"] = result != null && result.Verified;
        payload["verificationStatus"] = result == null ? String.Empty : (result.VerificationStatus ?? String.Empty);
        payload["verificationMode"] = result == null ? String.Empty : (result.VerificationMode ?? String.Empty);
        payload["sessionCount"] = result == null ? 0 : result.SessionCount;
        payload["saveCount"] = result == null ? 0 : result.SaveCount;
        payload["editableRetryCount"] = result == null ? 0 : result.EditableRetryCount;
        payload["nativeMutationAttemptCount"] = result == null ? 0 : result.NativeMutationAttemptCount;
        payload["summary"] = result == null ? String.Empty : (result.Summary ?? String.Empty);
        payload["expectedDefaultScaffold"] = AscetComponentScaffoldMetadata.BuildExpectedDefaultScaffold(result);
        return payload;
    }


}
