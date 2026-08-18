using System;
using System.Collections.Generic;
using System.IO;

public static class AscetCodeWriteBehaviorTest
{
    private const string RuntimeBlocker = "Focused runner does not execute real ASCET ToolAPI getters, setters, Save, or same-session readback for this operation.";

    private static readonly string[] ModuleOperations =
    {
        "set_module_code/set-method",
        "set_module_code/set-header",
        "set_module_code/set-external-c-code"
    };

    private static readonly string[] StateMachineOperations =
    {
        "set_state_machine_code/set-method",
        "set_state_machine_code/set-state-entry-esdl",
        "set_state_machine_code/set-state-exit-esdl",
        "set_state_machine_code/set-state-static-esdl",
        "set_state_machine_code/bind-state-entry-method",
        "set_state_machine_code/bind-state-exit-method",
        "set_state_machine_code/bind-state-static-method",
        "set_state_machine_code/set-transition-condition-esdl",
        "set_state_machine_code/set-transition-action-esdl",
        "set_state_machine_code/bind-transition-condition-method",
        "set_state_machine_code/bind-transition-action-method",
        "set_state_machine_code/set-start-state"
    };

    public static int Main()
    {
        int assertions = 0;
        AssertPublicOperationParsers(ref assertions);
        Dictionary<string, object> changedProtocol = AssertSharedTransaction(true, ref assertions);
        Dictionary<string, object> noOpProtocol = AssertSharedTransaction(false, ref assertions);
        AssertRepresentativeJsonContracts(changedProtocol, noOpProtocol, ref assertions);
        AssertHostDispatcherCanonicalPayload(ref assertions);
        AssertVerificationStatusIsNotDerived(ref assertions);

        List<Dictionary<string, object>> runtimeCoverage = new List<Dictionary<string, object>>();
        AddBlockedRuntimeCoverage(ModuleOperations, runtimeCoverage);
        AddBlockedRuntimeCoverage(StateMachineOperations, runtimeCoverage);

        Console.WriteLine(AscetJsonContract.Serialize(new Dictionary<string, object>
        {
            { "passed", true },
            { "runtimeProtocolAssertions", assertions },
            { "metrics", new Dictionary<string, object>
                {
                    { "moduleSections", ModuleOperations.Length },
                    { "stateMachineOperations", StateMachineOperations.Length },
                    { "runtimeScenarios", runtimeCoverage.Count },
                    { "runtimePass", 0 },
                    { "runtimeBlocked", runtimeCoverage.Count },
                    { "sharedTransactionScenarios", 2 },
                    { "representativeJsonContracts", 3 }
                }
            },
            { "sharedTransaction", new object[] { changedProtocol, noOpProtocol } },
            { "runtimeCoverage", runtimeCoverage }
        }));
        return 0;
    }

    private static void AssertPublicOperationParsers(ref int assertions)
    {
        AssertEqual(AscetSetModuleCodeOperation.SetMethod, AscetSetModuleCode.ParseOperation("set-method"), "module set-method parser", ref assertions);
        AssertEqual(AscetSetModuleCodeOperation.SetHeader, AscetSetModuleCode.ParseOperation("set-header"), "module set-header parser", ref assertions);
        AssertEqual(AscetSetModuleCodeOperation.SetExternalCCode, AscetSetModuleCode.ParseOperation("set-external-c-code"), "module external C parser", ref assertions);

        for (int i = 0; i < StateMachineOperations.Length; i++)
        {
            string operation = StateMachineOperations[i];
            string value = operation.Substring(operation.IndexOf('/') + 1);
            Assert((int)AscetSetStateMachineCode.ParseOperation(value) == i + 1, operation + " parser", ref assertions);
        }
    }

    private static Dictionary<string, object> AssertSharedTransaction(bool changed, ref int assertions)
    {
        string current = changed ? "before" : "requested";
        int mutationCount = 0;
        int saveCount = 0;
        List<string> events = new List<string>();

        AscetCodeWriteTransactionResult result = AscetCodeWriteTransaction.Execute(
            "shared_code_write_protocol",
            current,
            "requested",
            true,
            delegate
            {
                events.Add("mutation");
                mutationCount++;
                current = "requested";
                return true;
            },
            delegate
            {
                events.Add("save");
                saveCount++;
                return true;
            },
            delegate
            {
                events.Add("verify");
                return current;
            });

        AssertEqual(changed, result.Changed, "shared changed", ref assertions);
        AssertEqual(changed ? "applied" : "no_op", result.MutationStatus, "shared mutationStatus", ref assertions);
        AssertEqual(changed, result.SaveAttempted, "shared saveAttempted", ref assertions);
        AssertEqual(changed, result.SaveSucceeded, "shared saveSucceeded", ref assertions);
        AssertEqual(changed ? "saved" : "not_required", result.SaveState, "shared saveState", ref assertions);
        Assert(result.Verified, "shared verified", ref assertions);
        AssertEqual("same_session_exact_value", result.VerificationMode, "shared verificationMode", ref assertions);
        AssertEqual(1, result.SessionCount, "shared sessionCount", ref assertions);
        AssertEqual(changed ? 1 : 0, result.SaveCount, "shared saveCount", ref assertions);
        AssertEqual(changed ? 1 : 0, result.NativeMutationAttemptCount, "shared nativeMutationAttemptCount", ref assertions);
        AssertEqual(changed ? 1 : 0, mutationCount, "shared mutation invocation count", ref assertions);
        AssertEqual(changed ? 1 : 0, saveCount, "shared Save invocation count", ref assertions);
        AssertEqual(changed ? "mutation,save,verify" : "verify", String.Join(",", events.ToArray()), "shared event order", ref assertions);

        return ProtocolPayload(result, changed ? "changed" : "no_op");
    }

    private static void AssertRepresentativeJsonContracts(Dictionary<string, object> changed, Dictionary<string, object> noOp, ref int assertions)
    {
        AscetMethodWriteResult method = MethodResult(changed);
        AscetTextCodeWriteResult text = TextResult(noOp);
        AscetStateMachineWriteResult state = StateResult(changed);

        AssertCanonicalJson(AscetSetModuleCode.FormatMethodJsonOutput(AscetSetModuleCodeOperation.SetMethod, method), true, "module method JSON contract", ref assertions);
        AssertCanonicalJson(AscetSetModuleCode.FormatTextCodeJsonOutput(AscetSetModuleCodeOperation.SetHeader, text), false, "module text JSON contract", ref assertions);
        AssertCanonicalJson(AscetSetStateMachineCode.FormatStateMachineJsonOutput(AscetSetStateMachineCodeOperation.SetStateEntryActionEsdl, state), true, "state-machine JSON contract", ref assertions);
    }

    private static void AssertVerificationStatusIsNotDerived(ref int assertions)
    {
        string root = Environment.GetEnvironmentVariable("ASCET_REPO_ROOT");
        if (String.IsNullOrWhiteSpace(root)) root = Directory.GetCurrentDirectory();
        foreach (string relativePath in new[]
        {
            Path.Combine("ascetcli", "src", "AscetCli", "AscetSetModuleCode.cs"),
            Path.Combine("ascetcli", "src", "AscetCli", "AscetSetStateMachineCode.cs"),
            Path.Combine("ascetcli", "src", "AscetCli", "Host", "AscetWriteHostDispatcher.cs"),
            Path.Combine("ascetcli", "src", "AscetCopilot", "Services", "Write", "MethodWriteService.cs")
        })
        {
            string source = File.ReadAllText(Path.Combine(root, relativePath));
            Assert(source.IndexOf("result.Verified ? \"passed\" : \"failed\"", StringComparison.Ordinal) < 0, relativePath + " must not derive verificationStatus from Verified.", ref assertions);
            Assert(source.IndexOf("result.VerificationStatus", StringComparison.Ordinal) >= 0, relativePath + " must publish the C# result VerificationStatus.", ref assertions);
        }
    }
    private static void AssertHostDispatcherCanonicalPayload(ref int assertions)
    {
        string root = Environment.GetEnvironmentVariable("ASCET_REPO_ROOT");
        if (String.IsNullOrWhiteSpace(root)) root = Directory.GetCurrentDirectory();
        string source = File.ReadAllText(Path.Combine(root, "ascetcli", "src", "AscetCli", "Host", "AscetWriteHostDispatcher.cs"));
        int start = source.IndexOf("private static Dictionary<string, object> BuildMethodWritePayload", StringComparison.Ordinal);
        int end = source.IndexOf("BuildDatabasePayload", start, StringComparison.Ordinal);
        string methodPayload = start >= 0 && end > start ? source.Substring(start, end - start) : String.Empty;
        string serviceSource = File.ReadAllText(Path.Combine(root, "ascetcli", "src", "AscetCopilot", "Services", "Write", "MethodWriteService.cs"));
        int serviceStart = serviceSource.IndexOf("private static Dictionary<string, object> BuildPayload", StringComparison.Ordinal);
        int serviceEnd = serviceSource.IndexOf("private sealed class SetMethodCodeVerificationHook", serviceStart, StringComparison.Ordinal);
        string servicePayload = serviceStart >= 0 && serviceEnd > serviceStart ? serviceSource.Substring(serviceStart, serviceEnd - serviceStart) : String.Empty;
        foreach (string field in new[] { "changed", "mutationStatus", "saveAttempted", "saveSucceeded", "saveState", "verified", "verificationStatus", "verificationMode", "sessionCount", "saveCount", "editableRetryCount", "nativeMutationAttemptCount" })
        {
            Assert(methodPayload.IndexOf("payload[\"" + field + "\"]", StringComparison.Ordinal) >= 0, "host method payload must include " + field, ref assertions);
            Assert(servicePayload.IndexOf("payload[\"" + field + "\"]", StringComparison.Ordinal) >= 0, "method write service payload must include " + field, ref assertions);
        }
    }
    private static void AddBlockedRuntimeCoverage(string[] operations, IList<Dictionary<string, object>> coverage)
    {
        for (int i = 0; i < operations.Length; i++)
        {
            coverage.Add(Blocked(operations[i], "changed"));
            coverage.Add(Blocked(operations[i], "no_op"));
        }
    }

    private static Dictionary<string, object> Blocked(string operation, string scenario)
    {
        return new Dictionary<string, object>
        {
            { "operation", operation },
            { "scenario", scenario },
            { "runtimeStatus", "BLOCKED" },
            { "reason", RuntimeBlocker },
            { "canonicalCounters", null }
        };
    }

    private static Dictionary<string, object> ProtocolPayload(AscetCodeWriteTransactionResult result, string scenario)
    {
        return new Dictionary<string, object>
        {
            { "scope", "shared_transaction_protocol_only" },
            { "scenario", scenario },
            { "changed", result.Changed },
            { "mutationStatus", result.MutationStatus },
            { "saveAttempted", result.SaveAttempted },
            { "saveSucceeded", result.SaveSucceeded },
            { "saveState", result.SaveState },
            { "verified", result.Verified },
            { "verificationStatus", result.VerificationStatus },
            { "verificationMode", result.VerificationMode },
            { "sessionCount", result.SessionCount },
            { "saveCount", result.SaveCount },
            { "nativeMutationAttemptCount", result.NativeMutationAttemptCount }
        };
    }

    private static AscetMethodWriteResult MethodResult(Dictionary<string, object> protocol)
    {
        AscetMethodWriteResult result = new AscetMethodWriteResult();
        CopyProtocol(protocol, result);
        return result;
    }

    private static AscetTextCodeWriteResult TextResult(Dictionary<string, object> protocol)
    {
        AscetTextCodeWriteResult result = new AscetTextCodeWriteResult();
        CopyProtocol(protocol, result);
        return result;
    }

    private static AscetStateMachineWriteResult StateResult(Dictionary<string, object> protocol)
    {
        AscetStateMachineWriteResult result = new AscetStateMachineWriteResult();
        CopyProtocol(protocol, result);
        return result;
    }

    private static void CopyProtocol(Dictionary<string, object> protocol, AscetMethodWriteResult result)
    {
        result.Changed = GetBool(protocol, "changed");
        result.MutationStatus = GetString(protocol, "mutationStatus");
        result.SaveAttempted = GetBool(protocol, "saveAttempted");
        result.SaveSucceeded = GetBool(protocol, "saveSucceeded");
        result.SaveState = GetString(protocol, "saveState");
        result.Verified = GetBool(protocol, "verified");
        result.VerificationStatus = GetString(protocol, "verificationStatus");
        result.VerificationMode = GetString(protocol, "verificationMode");
        result.SessionCount = GetInt(protocol, "sessionCount");
        result.SaveCount = GetInt(protocol, "saveCount");
        result.NativeMutationAttemptCount = GetInt(protocol, "nativeMutationAttemptCount");
    }

    private static void CopyProtocol(Dictionary<string, object> protocol, AscetTextCodeWriteResult result)
    {
        result.Changed = GetBool(protocol, "changed");
        result.MutationStatus = GetString(protocol, "mutationStatus");
        result.SaveAttempted = GetBool(protocol, "saveAttempted");
        result.SaveSucceeded = GetBool(protocol, "saveSucceeded");
        result.SaveState = GetString(protocol, "saveState");
        result.Verified = GetBool(protocol, "verified");
        result.VerificationStatus = GetString(protocol, "verificationStatus");
        result.VerificationMode = GetString(protocol, "verificationMode");
        result.SessionCount = GetInt(protocol, "sessionCount");
        result.SaveCount = GetInt(protocol, "saveCount");
        result.NativeMutationAttemptCount = GetInt(protocol, "nativeMutationAttemptCount");
    }

    private static void CopyProtocol(Dictionary<string, object> protocol, AscetStateMachineWriteResult result)
    {
        result.Changed = GetBool(protocol, "changed");
        result.MutationStatus = GetString(protocol, "mutationStatus");
        result.SaveAttempted = GetBool(protocol, "saveAttempted");
        result.SaveSucceeded = GetBool(protocol, "saveSucceeded");
        result.SaveState = GetString(protocol, "saveState");
        result.Verified = GetBool(protocol, "verified");
        result.VerificationStatus = GetString(protocol, "verificationStatus");
        result.VerificationMode = GetString(protocol, "verificationMode");
        result.SessionCount = GetInt(protocol, "sessionCount");
        result.SaveCount = GetInt(protocol, "saveCount");
        result.NativeMutationAttemptCount = GetInt(protocol, "nativeMutationAttemptCount");
    }

    private static void AssertCanonicalJson(string json, bool changed, string message, ref int assertions)
    {
        Dictionary<string, object> payload = AscetJsonContract.DeserializeObject(json);
        AssertEqual(changed, GetBool(payload, "changed"), message + " changed", ref assertions);
        AssertEqual(changed ? "applied" : "no_op", GetString(payload, "mutationStatus"), message + " mutationStatus", ref assertions);
        AssertEqual(changed ? "saved" : "not_required", GetString(payload, "saveState"), message + " saveState", ref assertions);
        Assert(GetBool(payload, "verified"), message + " verified", ref assertions);
        AssertEqual("passed", GetString(payload, "verificationStatus"), message + " verificationStatus", ref assertions);
        AssertEqual(1, GetInt(payload, "sessionCount"), message + " sessionCount", ref assertions);
        AssertEqual(changed ? 1 : 0, GetInt(payload, "saveCount"), message + " saveCount", ref assertions);
    }

    private static bool GetBool(Dictionary<string, object> payload, string key)
    {
        object value;
        return payload != null && payload.TryGetValue(key, out value) && value is bool && (bool)value;
    }

    private static string GetString(Dictionary<string, object> payload, string key)
    {
        object value;
        return payload != null && payload.TryGetValue(key, out value) ? Convert.ToString(value) ?? String.Empty : String.Empty;
    }

    private static int GetInt(Dictionary<string, object> payload, string key)
    {
        object value;
        return payload != null && payload.TryGetValue(key, out value) ? Convert.ToInt32(value) : 0;
    }

    private static void Assert(bool condition, string message, ref int assertions)
    {
        assertions++;
        if (!condition) throw new InvalidOperationException(message);
    }

    private static void AssertEqual<T>(T expected, T actual, string message, ref int assertions)
    {
        assertions++;
        if (!Object.Equals(expected, actual)) throw new InvalidOperationException(message + ": expected=" + expected + ", actual=" + actual);
    }
}
