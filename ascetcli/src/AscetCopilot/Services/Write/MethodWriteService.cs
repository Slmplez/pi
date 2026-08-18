using System;
using System.Collections.Generic;

public sealed class SetMethodCodeWriteRequest
{
    public SetMethodCodeWriteRequest()
    {
        ComponentPath = String.Empty;
        MethodName = String.Empty;
        Code = String.Empty;
        VerifyReadback = false;
    }

    public string ComponentPath { get; set; }
    public string MethodName { get; set; }
    public string Code { get; set; }
    public bool VerifyReadback { get; set; }
}

public interface IExecMethodCodeWriteService
{
    SetMethodCodeWriteRequest ParseExecArguments(string[] args);
    AscetWriteExecutionResult Execute(SetMethodCodeWriteRequest request);
}

public sealed class ExecMethodWriteService : IExecMethodCodeWriteService
{
    private readonly IComponentLocatorService locator;
    private readonly IMethodWriteService writer;
    private readonly AscetWriteExecutor executor;
    private readonly IMethodConsistencyService consistency;
    private readonly bool consistencyEnabled;

    public ExecMethodWriteService()
        : this(new ComponentLocatorService(), new MethodWriteService(), null, null)
    {
    }

    public ExecMethodWriteService(IComponentLocatorService locator, IMethodWriteService writer, AscetWriteExecutor executor)
        : this(locator, writer, executor, null)
    {
    }

    public ExecMethodWriteService(
        IComponentLocatorService locator,
        IMethodWriteService writer,
        AscetWriteExecutor executor,
        IMethodConsistencyService consistency)
    {
        this.locator = locator ?? new ComponentLocatorService();
        this.writer = writer ?? new MethodWriteService();
        this.executor = executor ?? new AscetWriteExecutor(
            new WriteVerificationService(
                new SetMethodCodeVerificationHook()));
        this.consistency = consistency;
        consistencyEnabled = consistency != null;
    }

    public SetMethodCodeWriteRequest ParseExecArguments(string[] args)
    {
        AscetSetMethodCodeArguments parsed = AscetSetMethodCode.ParseArguments(RemoveJsonFlag(args));
        return new SetMethodCodeWriteRequest
        {
            ComponentPath = parsed.ComponentPath ?? String.Empty,
            MethodName = parsed.MethodName ?? String.Empty,
            Code = AscetSetMethodCode.ReadCodeFile(parsed.CodeFilePath),
            VerifyReadback = parsed.VerifyReadback
        };
    }

    public AscetWriteExecutionResult Execute(SetMethodCodeWriteRequest request)
    {
        if (request == null)
        {
            throw new ArgumentNullException("request");
        }

        Dictionary<string, object> metadata = new Dictionary<string, object>(StringComparer.Ordinal);
        metadata["componentPath"] = request.ComponentPath ?? String.Empty;
        metadata["methodName"] = request.MethodName ?? String.Empty;
        metadata["code"] = request.Code ?? String.Empty;

        return executor.Execute(new AscetWriteRequest
        {
            OperationName = "set_method_code",
            VerifyAfterWrite = request.VerifyReadback,
            Metadata = metadata,
            ExecuteWrite = delegate(AscetWriteContext context)
            {
                AscetItemPath parsed = AscetItemPath.Parse(request.ComponentPath);
                AscetItemRef component = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
                MethodConsistencySnapshot snapshot = consistencyEnabled ? consistency.Capture(component, request.MethodName) : null;
                AscetMethodWriteResult result = null;
                bool writeCompleted = false;
                try
                {
                    result = writer.SetMethodCode(component, request.MethodName, request.Code, request.VerifyReadback);
                    writeCompleted = true;
                    if (consistencyEnabled) { consistency.Validate(component, request.MethodName, request.Code); }
                }
                catch (Exception validationError)
                {
                    if (!consistencyEnabled || !writeCompleted)
                    {
                        throw;
                    }

                    try
                    {
                        writer.SetMethodCode(component, request.MethodName, snapshot == null ? String.Empty : (snapshot.PreviousCode ?? String.Empty), false);
                        if (!consistency.VerifyRollback(component, request.MethodName, snapshot == null ? String.Empty : (snapshot.PreviousCode ?? String.Empty)))
                        {
                            throw new AscetReadException(
                                "method_consistency_rollback_failed",
                                "set_method_code",
                                "Method consistency validation failed and previous code could not be verified after rollback.",
                                validationError);
                        }
                    }
                    catch (AscetReadException rollbackError)
                    {
                        if (String.Equals(rollbackError.Code, "method_consistency_rollback_failed", StringComparison.Ordinal))
                        {
                            throw;
                        }
                        throw new AscetReadException(
                            "method_consistency_rollback_failed",
                            "set_method_code",
                            "Method consistency validation failed and rollback failed: " + rollbackError.Message,
                            validationError);
                    }
                    catch (Exception rollbackError)
                    {
                        throw new AscetReadException(
                            "method_consistency_rollback_failed",
                            "set_method_code",
                            "Method consistency validation failed and rollback failed: " + rollbackError.Message,
                            validationError);
                    }

                    throw new AscetReadException(
                        "method_consistency_rolled_back",
                        "set_method_code",
                        "Method consistency validation failed and previous code was restored: " + validationError.Message,
                        validationError);
                }

                AscetWriteActionResult actionResult = new AscetWriteActionResult();
                actionResult.Summary = BuildSummary(result);
                actionResult.Payload = BuildPayload(result);
                actionResult.Verification = BuildVerification(result);
                return actionResult;
            }
        });
    }

    private static WriteVerificationResult BuildVerification(AscetMethodWriteResult result)
    {
        if (result == null)
        {
            return WriteVerificationResult.CreateFailure("write_failed", "set_method_code", "Method write returned no result.");
        }

        WriteVerificationResult verification = new WriteVerificationResult
        {
            Requested = result.VerifyReadbackRequested,
            Attempted = result.VerifyReadbackRequested,
            Succeeded = !result.VerifyReadbackRequested || result.ReadbackVerified,
            Summary = result.VerifyReadbackRequested && result.ReadbackVerified ? "method_code_matches" : (result.VerifyReadbackRequested ? String.Empty : "verification_not_requested")
        };
        verification.Details["changed"] = result.Changed;
        verification.Details["mutationStatus"] = result.MutationStatus ?? String.Empty;
        verification.Details["saveAttempted"] = result.SaveAttempted;
        verification.Details["saveSucceeded"] = result.SaveSucceeded;
        verification.Details["saveState"] = result.SaveState ?? String.Empty;
        verification.Details["verified"] = result.Verified;
        verification.Details["verificationMode"] = result.VerificationMode ?? String.Empty;
        verification.Details["sessionCount"] = result.SessionCount;
        verification.Details["saveCount"] = result.SaveCount;
        verification.Details["editableRetryCount"] = result.EditableRetryCount;
        verification.Details["nativeMutationAttemptCount"] = result.NativeMutationAttemptCount;
        if (!verification.Succeeded)
        {
            verification.Error = new AscetWriteError
            {
                Code = "readback_mismatch",
                Operation = "set_method_code",
                Stage = "verify",
                Message = "Same-session method-code readback did not match the requested value.",
                ExceptionType = String.Empty
            };
        }
        return verification;
    }
    private static string[] RemoveJsonFlag(string[] args)
    {
        if (args == null || args.Length == 0)
        {
            return new string[0];
        }

        List<string> filtered = new List<string>();
        for (int i = 0; i < args.Length; i++)
        {
            if (String.Equals(args[i], "--json", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            filtered.Add(args[i]);
        }

        return filtered.ToArray();
    }

    private static string BuildSummary(AscetMethodWriteResult result)
    {
        if (result == null)
        {
            return String.Empty;
        }

        return "Updated method '" + (result.MethodName ?? String.Empty) + "' in '" + (result.ComponentPath ?? String.Empty) + "'.";
    }

    private static Dictionary<string, object> BuildPayload(AscetMethodWriteResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>(StringComparer.Ordinal);
        payload["ComponentPath"] = result == null ? String.Empty : (result.ComponentPath ?? String.Empty);
        payload["ComponentKind"] = result == null ? AscetComponentKind.Unknown.ToString() : result.ComponentKind.ToString();
        payload["LanguageKind"] = result == null ? AscetLanguageKind.Unknown.ToString() : result.LanguageKind.ToString();
        payload["MethodName"] = result == null ? String.Empty : (result.MethodName ?? String.Empty);
        payload["MethodKind"] = result == null ? AscetMethodKind.Unknown.ToString() : result.MethodKind.ToString();
        payload["PreviousCodeLength"] = result == null ? 0 : result.PreviousCodeLength;
        payload["NewCodeLength"] = result == null ? 0 : result.NewCodeLength;
        payload["WriteSucceeded"] = result != null && result.WriteSucceeded;
        payload["VerifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        payload["ReadbackVerified"] = result != null && result.ReadbackVerified;

        payload["changed"] = result != null && result.Changed;
        payload["mutationStatus"] = result == null ? String.Empty : (result.MutationStatus ?? String.Empty);
        payload["saveAttempted"] = result != null && result.SaveAttempted;
        payload["saveSucceeded"] = result != null && result.SaveSucceeded;
        payload["saveState"] = result == null ? String.Empty : (result.SaveState ?? String.Empty);
        payload["verified"] = result != null && result.Verified;
        payload["verificationStatus"] = result == null ? String.Empty : (result.VerificationStatus ?? String.Empty);
        payload["verificationMode"] = result == null ? String.Empty : (result.VerificationMode ?? String.Empty);
        payload["sessionCount"] = result == null ? 0 : result.SessionCount;
        payload["saveCount"] = result == null ? 0 : result.SaveCount;
        payload["editableRetryCount"] = result == null ? 0 : result.EditableRetryCount;
        payload["nativeMutationAttemptCount"] = result == null ? 0 : result.NativeMutationAttemptCount;
        return payload;
    }

    private sealed class SetMethodCodeVerificationHook : IWriteVerificationHook
    {
        private readonly IComponentLocatorService locator;
        private readonly IMethodCodeService methods;

        public SetMethodCodeVerificationHook()
            : this(new ComponentLocatorService(), new MethodCatalogService())
        {
        }

        public SetMethodCodeVerificationHook(IComponentLocatorService locator, IMethodCodeService methods)
        {
            this.locator = locator ?? new ComponentLocatorService();
            this.methods = methods ?? new MethodCatalogService();
        }

        public WriteVerificationResult Verify(WriteVerificationRequest request)
        {
            string componentPath = GetString(request, "componentPath");
            string methodName = GetString(request, "methodName");
            string expectedCode = GetString(request, "code");
            if (String.IsNullOrWhiteSpace(componentPath) || String.IsNullOrWhiteSpace(methodName))
            {
                return WriteVerificationResult.CreateFailure(
                    "verification_failed",
                    "set_method_code",
                    "Component path and method name are required for set_method_code verification.");
            }

            try
            {
                AscetItemPath parsed = AscetItemPath.Parse(componentPath);
                AscetItemRef component = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
                AscetMethodCode methodCode = methods.GetMethodCode(component, methodName);
                string actualCode = methodCode == null ? String.Empty : (methodCode.Code ?? String.Empty);
                if (!String.Equals(actualCode, expectedCode, StringComparison.Ordinal))
                {
                    return WriteVerificationResult.CreateFailure(
                        "readback_mismatch",
                        "set_method_code",
                        "Readback verification failed for method '" + methodName + "' in component '" + componentPath + "'.");
                }

                return WriteVerificationResult.CreateSuccess("method_code_matches");
            }
            catch (Exception ex)
            {
                return new WriteVerificationResult
                {
                    Requested = true,
                    Attempted = true,
                    Succeeded = false,
                    Summary = String.Empty,
                    Error = WriteVerificationService.CreateStructuredError("verification_failed", "set_method_code", "verify", ex)
                };
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
    }
}
