using System;
using System.Collections.Generic;

public sealed class ApplyElementSpecWriteRequest
{
    public ApplyElementSpecWriteRequest()
    {
        ComponentPath = String.Empty;
        ProjectPath = String.Empty;
        Spec = null;
        Mode = AscetElementApplyMode.Apply;
        DeleteMissing = false;
        RecreateIncompatible = false;
        VerifyReadback = false;
    }

    public string ComponentPath { get; set; }
    public string ProjectPath { get; set; }
    public AscetElementSpecDocument Spec { get; set; }
    public AscetElementApplyMode Mode { get; set; }
    public bool DeleteMissing { get; set; }
    public bool RecreateIncompatible { get; set; }
    public bool VerifyReadback { get; set; }
}

public interface IExecElementSpecWriteService
{
    ApplyElementSpecWriteRequest ParseExecArguments(string[] args);
    AscetWriteExecutionResult Execute(ApplyElementSpecWriteRequest request);
}

public sealed class ElementSpecWriteService : IExecElementSpecWriteService
{
    private readonly IComponentElementSyncService syncService;
    private readonly AscetWriteExecutor executor;

    public ElementSpecWriteService()
        : this(new ComponentElementSyncService(), null)
    {
    }

    public ElementSpecWriteService(IComponentElementSyncService syncService, AscetWriteExecutor executor)
    {
        this.syncService = syncService ?? new ComponentElementSyncService();
        this.executor = executor ?? new AscetWriteExecutor(
            new WriteVerificationService(
                new ApplyElementSpecVerificationHook(this.syncService)));
    }

    public ApplyElementSpecWriteRequest ParseExecArguments(string[] args)
    {
        AscetApplyElementSpecArguments parsed = AscetApplyElementSpec.ParseArguments(args);
        string json = AscetApplyElementSpec.ReadSpecFile(parsed.SpecFilePath);
        return new ApplyElementSpecWriteRequest
        {
            ComponentPath = parsed.ComponentPath ?? String.Empty,
            ProjectPath = parsed.ProjectPath ?? String.Empty,
            Spec = AscetElementSpecDocumentParser.ParseJson(json),
            Mode = parsed.Mode,
            DeleteMissing = parsed.DeleteMissing,
            RecreateIncompatible = parsed.RecreateIncompatible,
            VerifyReadback = parsed.VerifyReadback
        };
    }

    public AscetWriteExecutionResult Execute(ApplyElementSpecWriteRequest request)
    {
        if (request == null)
        {
            throw new ArgumentNullException("request");
        }

        Dictionary<string, object> metadata = new Dictionary<string, object>(StringComparer.Ordinal);
        metadata["componentPath"] = request.ComponentPath ?? String.Empty;
        metadata["projectPath"] = request.ProjectPath ?? String.Empty;
        metadata["spec"] = request.Spec;
        metadata["mode"] = request.Mode.ToString();
        metadata["deleteMissing"] = request.DeleteMissing;

        return executor.Execute(new AscetWriteRequest
        {
            OperationName = "apply_element_spec",
            VerifyAfterWrite = request.VerifyReadback,
            Metadata = metadata,
            ExecuteWrite = delegate(AscetWriteContext context)
            {
                AscetElementSyncResult result = syncService.Apply(
                    new AscetItemRef { Path = request.ComponentPath },
                    request.Spec,
                    new AscetElementApplyOptions
                    {
                        Mode = request.Mode,
                        DeleteMissing = request.DeleteMissing,
                        RecreateIncompatible = request.RecreateIncompatible,
                        ProjectPath = request.ProjectPath
                    },
                    request.VerifyReadback);

                AscetWriteActionResult actionResult = new AscetWriteActionResult();
                actionResult.Summary = BuildSummary(result);
                actionResult.Payload = BuildPayload(result);
                return actionResult;
            }
        });
    }

    private static string BuildSummary(AscetElementSyncResult result)
    {
        if (result == null)
        {
            return String.Empty;
        }

        return (result.CreatedElements == null ? 0 : result.CreatedElements.Count).ToString()
            + " created, "
            + (result.UpdatedElements == null ? 0 : result.UpdatedElements.Count).ToString()
            + " updated, "
            + (result.IncompatibleElements == null ? 0 : result.IncompatibleElements.Count).ToString()
            + " incompatible.";
    }

    private static Dictionary<string, object> BuildPayload(AscetElementSyncResult result)
    {
        return AscetJsonContract.DeserializeObject(AscetApplyElementSpec.FormatJsonOutput(result));
    }

    private sealed class ApplyElementSpecVerificationHook : IWriteVerificationHook
    {
        private readonly IComponentElementSyncService syncService;

        public ApplyElementSpecVerificationHook()
            : this(new ComponentElementSyncService())
        {
        }

        public ApplyElementSpecVerificationHook(IComponentElementSyncService syncService)
        {
            this.syncService = syncService ?? new ComponentElementSyncService();
        }

        public WriteVerificationResult Verify(WriteVerificationRequest request)
        {
            string componentPath = GetString(request, "componentPath");
            AscetElementSpecDocument spec = GetSpec(request);
            if (String.IsNullOrWhiteSpace(componentPath) || spec == null)
            {
                return WriteVerificationResult.CreateFailure(
                    "verification_failed",
                    "apply_element_spec",
                    "Component path and spec are required for apply_element_spec verification.");
            }

            try
            {
                AscetElementSpecDiffResult diff = syncService.Diff(new AscetItemRef { Path = componentPath }, spec);
                bool exactRemovalRequested = GetDeleteMissing(request);
                if (HasPendingChanges(diff, exactRemovalRequested))
                {
                    diff = syncService.Diff(new AscetItemRef { Path = componentPath }, spec);
                }

                int addedCount = diff == null || diff.AddedElements == null ? 0 : diff.AddedElements.Count;
                int modifiedCount = diff == null || diff.ModifiedElements == null ? 0 : diff.ModifiedElements.Count;
                int incompatibleCount = diff == null || diff.IncompatibleElements == null ? 0 : diff.IncompatibleElements.Count;
                int removedCount = diff == null || diff.RemovedElements == null ? 0 : diff.RemovedElements.Count;
                if (addedCount > 0 || modifiedCount > 0 || incompatibleCount > 0 || (exactRemovalRequested && removedCount > 0))
                {
                    return WriteVerificationResult.CreateFailure(
                        "readback_mismatch",
                        "apply_element_spec",
                        "Readback diff for component '" + componentPath + "' still reports requested changes after apply.");
                }

                return WriteVerificationResult.CreateSuccess("element_spec_matches");
            }
            catch (Exception ex)
            {
                return new WriteVerificationResult
                {
                    Requested = true,
                    Attempted = true,
                    Succeeded = false,
                    Summary = String.Empty,
                    Error = WriteVerificationService.CreateStructuredError("verification_failed", "apply_element_spec", "verify", ex)
                };
            }
        }

        private static bool HasPendingChanges(AscetElementSpecDiffResult diff, bool exactRemovalRequested)
        {
            int addedCount = diff == null || diff.AddedElements == null ? 0 : diff.AddedElements.Count;
            int modifiedCount = diff == null || diff.ModifiedElements == null ? 0 : diff.ModifiedElements.Count;
            int incompatibleCount = diff == null || diff.IncompatibleElements == null ? 0 : diff.IncompatibleElements.Count;
            int removedCount = diff == null || diff.RemovedElements == null ? 0 : diff.RemovedElements.Count;
            return addedCount > 0 || modifiedCount > 0 || incompatibleCount > 0 || (exactRemovalRequested && removedCount > 0);
        }

        private static string GetString(WriteVerificationRequest request, string key)
        {
            if (request == null || request.Metadata == null || String.IsNullOrWhiteSpace(key) || !request.Metadata.ContainsKey(key))
            {
                return String.Empty;
            }

            return Convert.ToString(request.Metadata[key]) ?? String.Empty;
        }

        private static AscetElementSpecDocument GetSpec(WriteVerificationRequest request)
        {
            if (request == null || request.Metadata == null || !request.Metadata.ContainsKey("spec"))
            {
                return null;
            }

            return request.Metadata["spec"] as AscetElementSpecDocument;
        }

        private static string GetMode(WriteVerificationRequest request)
        {
            return GetString(request, "mode");
        }

        private static bool GetDeleteMissing(WriteVerificationRequest request)
        {
            if (request == null || request.Metadata == null || !request.Metadata.ContainsKey("deleteMissing"))
            {
                return false;
            }

            object value = request.Metadata["deleteMissing"];
            if (value is bool)
            {
                return (bool)value;
            }

            bool parsed;
            return Boolean.TryParse(Convert.ToString(value), out parsed) && parsed;
        }
    }
}
