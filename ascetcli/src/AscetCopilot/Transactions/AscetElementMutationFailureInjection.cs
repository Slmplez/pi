using System;

public sealed class AscetElementMutationFailureInjection
{
    private readonly int failAfterStage;
    private readonly bool failDuringRollback;
    private int appliedStageCount;

    private AscetElementMutationFailureInjection(int failAfterStage, bool failDuringRollback)
    {
        this.failAfterStage = failAfterStage;
        this.failDuringRollback = failDuringRollback;
        this.appliedStageCount = 0;
    }

    public static AscetElementMutationFailureInjection Create(string targetPath)
    {
        string enabled = Environment.GetEnvironmentVariable("PI_ASCET_ENABLE_LIVE_FAILURE_INJECTION") ?? String.Empty;
        if (!String.Equals(enabled, "1", StringComparison.Ordinal))
            return new AscetElementMutationFailureInjection(0, false);

        string runId = Require("PI_ASCET_RUN_ID");
        string fixtureRoot = NormalizePath(Require("PI_ASCET_FIXTURE_ROOT"));
        string writeClass = Require("PI_ASCET_WRITE_CLASS");
        string target = NormalizePath(targetPath);
        if (!String.Equals(writeClass, "isolated_fixture", StringComparison.Ordinal) ||
            String.IsNullOrWhiteSpace(runId) ||
            String.IsNullOrWhiteSpace(target) ||
            !(String.Equals(target, fixtureRoot, StringComparison.OrdinalIgnoreCase) ||
              target.StartsWith(fixtureRoot + "\\", StringComparison.OrdinalIgnoreCase)))
        {
            throw new AscetReadException(
                "failure_injection_scope_invalid",
                "apply_element_spec",
                "Live failure injection is restricted to the configured isolated fixture root.");
        }

        int stage = 0;
        string stageText = Environment.GetEnvironmentVariable("ASCET_ELEMENT_TX_FAIL_AFTER_STAGE") ?? String.Empty;
        if (!String.IsNullOrWhiteSpace(stageText) && (!Int32.TryParse(stageText, out stage) || stage < 1))
            throw new AscetReadException("failure_injection_configuration_invalid", "apply_element_spec", "ASCET_ELEMENT_TX_FAIL_AFTER_STAGE must be a positive integer.");
        bool rollback = String.Equals(
            Environment.GetEnvironmentVariable("ASCET_ELEMENT_TX_FAIL_DURING_ROLLBACK") ?? String.Empty,
            "1",
            StringComparison.Ordinal);
        if (stage == 0 && !rollback)
            throw new AscetReadException("failure_injection_configuration_invalid", "apply_element_spec", "Failure injection is enabled but no failure point is configured.");
        return new AscetElementMutationFailureInjection(stage, rollback);
    }

    public void StageApplied()
    {
        appliedStageCount++;
        if (failAfterStage > 0 && appliedStageCount >= failAfterStage)
            throw new AscetReadException("element_transaction_injected_failure", "apply_element_spec", "Injected isolated-fixture failure after mutation stage " + appliedStageCount + ".");
    }

    public void BeforeRollback()
    {
        if (failDuringRollback)
            throw new AscetReadException("element_transaction_injected_rollback_failure", "apply_element_spec", "Injected isolated-fixture rollback failure.");
    }

    private static string Require(string name)
    {
        string value = Environment.GetEnvironmentVariable(name) ?? String.Empty;
        if (String.IsNullOrWhiteSpace(value))
            throw new AscetReadException("failure_injection_configuration_invalid", "apply_element_spec", name + " is required when Live failure injection is enabled.");
        return value.Trim();
    }

    private static string NormalizePath(string value)
    {
        string normalized = (value ?? String.Empty).Trim().Replace('/', '\\');
        while (normalized.EndsWith("\\", StringComparison.Ordinal)) normalized = normalized.Substring(0, normalized.Length - 1);
        return normalized;
    }
}