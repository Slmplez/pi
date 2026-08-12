using System;
using System.Collections.Generic;

public sealed class AscetElementMutationStage
{
    public string ElementName { get; set; }
    public string Operation { get; set; }
    public System.Action Apply { get; set; }
    public System.Action Rollback { get; set; }
}

public sealed class AscetElementMutationTransactionRequest
{
    public bool SnapshotComplete { get; set; }
    public string TargetPath { get; set; }
    public IList<AscetElementMutationStage> Stages { get; set; }
    public Func<bool> VerifyApplied { get; set; }
    public Func<bool> VerifyRestored { get; set; }
}

public sealed class AscetElementMutationStageResult
{
    public string ElementName { get; set; }
    public string Operation { get; set; }
    public string Status { get; set; }
}

public sealed class AscetElementMutationTransactionResult
{
    public string Status { get; set; }
    public IList<AscetElementMutationStageResult> AppliedStages { get; set; }
    public IList<AscetElementMutationStageResult> RollbackStages { get; set; }
    public IList<string> RollbackErrors { get; set; }
    public Exception Failure { get; set; }
}

public sealed class AscetElementMutationBatchRequest<TResult>
{
    public bool SnapshotComplete { get; set; }
    public string TargetPath { get; set; }
    public Func<Action, Action, TResult> Apply { get; set; }
    public Action Rollback { get; set; }
    public Func<bool> VerifyRestored { get; set; }
}

public sealed class AscetElementMutationTransaction
{
    public TResult ExecuteBatch<TResult>(AscetElementMutationBatchRequest<TResult> request)
    {
        if (request == null) throw new ArgumentNullException("request");
        if (request.Apply == null || request.Rollback == null || request.VerifyRestored == null)
            throw new AscetReadException("invalid_transaction_request", "apply_element_spec", "Element batch transaction requires apply, rollback, and restore verification actions.");

        AscetElementMutationFailureInjection injection = AscetElementMutationFailureInjection.Create(request.TargetPath);
        bool mutationStarted = false;
        Action mutationStarting = delegate
        {
            if (!request.SnapshotComplete)
                throw new AscetReadException("mutation_snapshot_incomplete", "apply_element_spec", "Element mutation requires a complete rollback snapshot.");
            mutationStarted = true;
        };

        try
        {
            return request.Apply(mutationStarting, injection.StageApplied);
        }
        catch (Exception failure)
        {
            if (!mutationStarted)
                throw;

            string rollbackError = String.Empty;
            try
            {
                injection.BeforeRollback();
                request.Rollback();
            }
            catch (Exception error)
            {
                rollbackError = error.Message ?? error.GetType().Name;
            }

            bool restored = false;
            if (String.IsNullOrWhiteSpace(rollbackError))
            {
                try
                {
                    restored = request.VerifyRestored();
                }
                catch (Exception error)
                {
                    rollbackError = error.Message ?? error.GetType().Name;
                }
            }

            if (!restored)
            {
                if (String.IsNullOrWhiteSpace(rollbackError))
                    rollbackError = "rollback_verification_failed";
                throw new AscetReadException(
                    "element_transaction_rollback_failed",
                    "apply_element_spec",
                    "Element mutation failed and rollback could not be verified: " + rollbackError,
                    failure);
            }

            throw new AscetReadException(
                "element_transaction_rolled_back",
                "apply_element_spec",
                "Element mutation failed; the previous Element state was restored and verified: " + failure.Message,
                failure);
        }
    }

    public AscetElementMutationTransactionResult Execute(AscetElementMutationTransactionRequest request)
    {
        if (request == null) throw new ArgumentNullException("request");
        if (!request.SnapshotComplete)
            throw new AscetReadException("mutation_snapshot_incomplete", "apply_element_spec", "Element mutation requires a complete rollback snapshot.");

        AscetElementMutationFailureInjection injection = AscetElementMutationFailureInjection.Create(request.TargetPath);
        IList<AscetElementMutationStage> stages = request.Stages ?? new List<AscetElementMutationStage>();
        List<AscetElementMutationStage> applied = new List<AscetElementMutationStage>();
        List<AscetElementMutationStageResult> appliedResults = new List<AscetElementMutationStageResult>();
        try
        {
            for (int i = 0; i < stages.Count; i++)
            {
                AscetElementMutationStage stage = RequireStage(stages[i]);
                stage.Apply();
                applied.Add(stage);
                appliedResults.Add(Result(stage, "applied"));
                injection.StageApplied();
            }
            if (request.VerifyApplied != null && !request.VerifyApplied())
                throw new AscetReadException("element_transaction_verification_failed", "apply_element_spec", "Full-batch Element readback verification failed.");
            return new AscetElementMutationTransactionResult
            {
                Status = "applied",
                AppliedStages = appliedResults,
                RollbackStages = new List<AscetElementMutationStageResult>(),
                RollbackErrors = new List<string>()
            };
        }
        catch (Exception failure)
        {
            List<AscetElementMutationStageResult> rollbackResults = new List<AscetElementMutationStageResult>();
            List<string> rollbackErrors = new List<string>();
            try
            {
                injection.BeforeRollback();
            }
            catch (Exception rollbackInjectionError)
            {
                rollbackErrors.Add("injected:" + rollbackInjectionError.Message);
            }
            for (int i = rollbackErrors.Count == 0 ? applied.Count - 1 : -1; i >= 0; i--)
            {
                AscetElementMutationStage stage = applied[i];
                try
                {
                    stage.Rollback();
                    rollbackResults.Add(Result(stage, "rolled_back"));
                }
                catch (Exception rollbackError)
                {
                    rollbackResults.Add(Result(stage, "rollback_failed"));
                    rollbackErrors.Add(stage.Operation + ":" + stage.ElementName + ":" + rollbackError.Message);
                }
            }
            if (request.VerifyRestored != null && !request.VerifyRestored())
                rollbackErrors.Add("rollback_verification_failed");
            return new AscetElementMutationTransactionResult
            {
                Status = rollbackErrors.Count == 0 ? "rolled_back" : "rollback_failed",
                AppliedStages = appliedResults,
                RollbackStages = rollbackResults,
                RollbackErrors = rollbackErrors,
                Failure = failure
            };
        }
    }

    private static AscetElementMutationStage RequireStage(AscetElementMutationStage stage)
    {
        if (stage == null || stage.Apply == null || stage.Rollback == null)
            throw new AscetReadException("invalid_transaction_stage", "apply_element_spec", "Element mutation stage requires apply and rollback actions.");
        return stage;
    }

    private static AscetElementMutationStageResult Result(AscetElementMutationStage stage, string status)
    {
        return new AscetElementMutationStageResult
        {
            ElementName = stage.ElementName ?? String.Empty,
            Operation = stage.Operation ?? String.Empty,
            Status = status
        };
    }
}