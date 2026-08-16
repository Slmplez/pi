using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;

public sealed class AscetGuardedMutationTargetResult
{
    public string Path { get; set; }
    public bool InitiallyEditable { get; set; }
    public bool EditabilityMutationStarted { get; set; }
    public bool EditabilityAcquired { get; set; }
    public bool FinalEditable { get; set; }
}

public sealed class AscetGuardedMutationResult
{
    public bool Success { get; set; }
    public string Operation { get; set; }
    public bool EditabilityMutationStarted { get; set; }
    public bool EditabilityAcquired { get; set; }
    public bool? PrimaryMutationStarted { get; set; }
    public string MutationStatus { get; set; }
    public string VerificationStatus { get; set; }
    public IList<AscetGuardedMutationTargetResult> Targets { get; set; }
    public Dictionary<string, object> Error { get; set; }
    public Dictionary<string, object> PrimaryResult { get; set; }
}

public sealed class AscetGuardedMutationService : AscetReadDomainServiceBase
{
    private static readonly HashSet<string> SupportedOperations = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "apply_element_spec",
        "apply_project_formula",
        "create_method",
        "delete_component",
        "delete_method",
        "set_element_dependency",
        "set_enumerators",
        "set_method_code",
        "set_method_signature",
        "set_module_code",
        "set_state_machine_code"
    };

    public AscetGuardedMutationResult Execute(
        string operation,
        IList<string> operationArguments,
        IList<string> editableTargets,
        bool acquireEditability)
    {
        string normalizedOperation = (operation ?? String.Empty).Trim();
        if (!SupportedOperations.Contains(normalizedOperation))
        {
            throw new AscetReadException(
                "unsupported_guarded_operation",
                "guarded_mutation",
                "Guarded mutation does not support operation '" + normalizedOperation + "'.");
        }
        if (operationArguments == null)
        {
            throw new AscetReadException("invalid_argument", "guarded_mutation", "operationArgs is required.");
        }
        if (editableTargets == null || editableTargets.Count == 0)
        {
            throw new AscetReadException("invalid_argument", "guarded_mutation", "editableTargets must contain at least one component path.");
        }

        List<string> normalizedArguments = new List<string>();
        for (int i = 0; i < operationArguments.Count; i++)
        {
            normalizedArguments.Add(operationArguments[i] ?? String.Empty);
        }
        if (!ContainsArgument(normalizedArguments, "--verify-readback"))
        {
            throw new AscetReadException(
                "mandatory_readback_missing",
                "guarded_mutation",
                "Guarded operation '" + normalizedOperation + "' requires --verify-readback.");
        }
        if (!ContainsArgument(normalizedArguments, "--json"))
        {
            normalizedArguments.Add("--json");
        }

        LegacyOperationEntryPoint entryPoint;
        if (!AscetLegacyOperationRegistry.TryResolve(normalizedOperation, out entryPoint) || entryPoint == null)
        {
            throw new AscetReadException(
                "guarded_operation_unavailable",
                "guarded_mutation",
                "Operation '" + normalizedOperation + "' is not available through the in-process Bridge registry.");
        }

        AscetGuardedMutationResult result = new AscetGuardedMutationResult
        {
            Success = false,
            Operation = normalizedOperation,
            PrimaryMutationStarted = false,
            MutationStatus = "not_started",
            VerificationStatus = "not_applicable",
            Targets = new List<AscetGuardedMutationTargetResult>(),
            Error = null,
            PrimaryResult = null
        };

        return ExecuteWithSession("guarded_mutation", delegate(AscetSession session)
        {
            AscetEditableService editableService = new AscetEditableService();
            for (int i = 0; i < editableTargets.Count; i++)
            {
                string targetPath = AscetDatabaseExplorerCommon.NormalizePath(editableTargets[i], "editable_target");
                AscetComponentEditableResult initial = editableService.CheckEditableInSession(session, targetPath);
                AscetGuardedMutationTargetResult target = new AscetGuardedMutationTargetResult
                {
                    Path = targetPath,
                    InitiallyEditable = initial != null && initial.Editable,
                    FinalEditable = initial != null && initial.Editable
                };
                result.Targets.Add(target);
            }

            for (int i = 0; i < result.Targets.Count; i++)
            {
                AscetGuardedMutationTargetResult target = result.Targets[i];
                if (target.InitiallyEditable)
                {
                    continue;
                }
                if (!acquireEditability)
                {
                    result.Error = Error(
                        "editable_write_gate_blocked",
                        "Component '" + target.Path + "' is read-only and editability acquisition was not authorized.");
                    return result;
                }
                result.EditabilityMutationStarted = true;
                target.EditabilityMutationStarted = true;
                AscetComponentEditableResult acquired = editableService.SetEditableInSession(session, target.Path);
                target.EditabilityAcquired = acquired != null && acquired.Editable;
                target.FinalEditable = target.EditabilityAcquired;
                result.EditabilityAcquired = result.EditabilityAcquired || target.EditabilityAcquired;
                if (!target.EditabilityAcquired)
                {
                    result.Error = Error(
                        "component_not_editable",
                        "Component '" + target.Path + "' remained read-only after the authorized SCM operation.");
                    return result;
                }
            }

            try
            {
                using (AscetBoundSessionContext.Bind(session))
                {
                    result.PrimaryMutationStarted = null;
                    result.PrimaryResult = InProcessLegacyOperationAdapter.InvokeJsonObject(
                        normalizedOperation,
                        entryPoint,
                        normalizedArguments.ToArray());
                }
                result.PrimaryMutationStarted = true;
                result.Success = true;
                result.MutationStatus = IsNoOp(result.PrimaryResult) ? "no_op" : "applied";
                result.VerificationStatus = ReadVerificationStatus(result.PrimaryResult);
                if (!String.Equals(result.VerificationStatus, "passed", StringComparison.Ordinal) &&
                    !String.Equals(result.VerificationStatus, "not_applicable", StringComparison.Ordinal))
                {
                    result.Success = false;
                    result.Error = Error(
                        "mandatory_readback_unverified",
                        "Guarded operation '" + normalizedOperation + "' completed without verified readback evidence.");
                }
            }
            catch (Exception ex)
            {
                InProcessLegacyOperationException inProcess = ex as InProcessLegacyOperationException;
                result.PrimaryMutationStarted = inProcess == null ? (bool?)null : inProcess.MutationStarted;
                result.Success = false;
                if (result.PrimaryMutationStarted == false)
                {
                    result.MutationStatus = result.EditabilityAcquired ? "partially_applied" : "not_started";
                    result.VerificationStatus = "not_applicable";
                }
                else
                {
                    result.MutationStatus = result.EditabilityAcquired ? "partially_applied" : "unknown";
                    result.VerificationStatus = "unknown";
                }
                AscetReadException ascet = ex as AscetReadException;
                string code = inProcess != null ? inProcess.Code : (ascet == null ? String.Empty : ascet.Code);
                result.Error = Error(
                    String.IsNullOrWhiteSpace(code) ? "guarded_mutation_failed" : code,
                    ex.Message);
            }
            finally
            {
                for (int i = 0; i < result.Targets.Count; i++)
                {
                    AscetGuardedMutationTargetResult target = result.Targets[i];
                    try
                    {
                        AscetComponentEditableResult finalState = editableService.CheckEditableInSession(session, target.Path);
                        target.FinalEditable = finalState != null && finalState.Editable;
                    }
                    catch
                    {
                    }
                }
            }
            return result;
        });
    }

    private static bool ContainsArgument(IList<string> values, string expected)
    {
        for (int i = 0; i < values.Count; i++)
        {
            if (String.Equals(values[i], expected, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }
        return false;
    }

    private static bool IsNoOp(IDictionary<string, object> payload)
    {
        return GetBoolean(payload, "noOp") ||
            GetBoolean(payload, "NoOp") ||
            GetBoolean(payload, "alreadyExisted") ||
            GetBoolean(payload, "AlreadyExisted") ||
            (HasBoolean(payload, "created") && !GetBoolean(payload, "created")) ||
            (HasBoolean(payload, "Created") && !GetBoolean(payload, "Created")) ||
            (HasBoolean(payload, "deleted") && !GetBoolean(payload, "deleted")) ||
            (HasBoolean(payload, "Deleted") && !GetBoolean(payload, "Deleted"));
    }

    private static string ReadVerificationStatus(IDictionary<string, object> payload)
    {
        if (GetBoolean(payload, "readbackVerified") || GetBoolean(payload, "ReadbackVerified"))
        {
            return "passed";
        }
        Dictionary<string, object> verification = GetDictionary(payload, "verification") ?? GetDictionary(payload, "Verification");
        if (verification != null)
        {
            if (GetBoolean(verification, "succeeded") || GetBoolean(verification, "Succeeded") ||
                String.Equals(GetString(verification, "status"), "passed", StringComparison.OrdinalIgnoreCase))
            {
                return "passed";
            }
            if (GetBoolean(verification, "attempted") || GetBoolean(verification, "Attempted"))
            {
                return "failed";
            }
        }
        return "missing";
    }

    private static bool HasBoolean(IDictionary<string, object> payload, string key)
    {
        return payload != null && payload.ContainsKey(key) && payload[key] is bool;
    }

    private static bool GetBoolean(IDictionary<string, object> payload, string key)
    {
        return HasBoolean(payload, key) && (bool)payload[key];
    }

    private static string GetString(IDictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }
        return Convert.ToString(payload[key], CultureInfo.InvariantCulture) ?? String.Empty;
    }

    private static Dictionary<string, object> GetDictionary(IDictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key))
        {
            return null;
        }
        return payload[key] as Dictionary<string, object>;
    }

    private static Dictionary<string, object> Error(string code, string message)
    {
        Dictionary<string, object> error = new Dictionary<string, object>();
        error["code"] = code ?? String.Empty;
        error["message"] = message ?? String.Empty;
        return error;
    }
}

public static class AscetGuardedMutation
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;
        try
        {
            string requestFile = ParseRequestFile(args);
            Dictionary<string, object> request = AscetJsonContract.DeserializeObject(File.ReadAllText(requestFile));
            string operation = GetRequiredString(request, "operation");
            IList<string> operationArgs = GetStringList(request, "operationArgs");
            IList<string> editableTargets = GetStringList(request, "editableTargets");
            bool acquireEditability = GetBoolean(request, "acquireEditability");

            suppressedOut = new StringWriter();
            Console.SetOut(suppressedOut);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            AscetGuardedMutationResult result = new AscetGuardedMutationService().Execute(
                operation,
                operationArgs,
                editableTargets,
                acquireEditability);
            Dictionary<string, object> payload = BuildPayload(result);
            Console.SetOut(originalOut);
            Console.Write(AscetJsonContract.Serialize(payload));
            return 0;
        }
        catch (Exception ex)
        {
            Console.SetOut(originalOut);
            AscetReadException ascet = ex as AscetReadException;
            Console.Error.WriteLine(ascet == null ? ex.GetType().FullName + ":" + ex.Message : ascet.Code + ":" + ascet.Operation + ":" + ascet.Message);
            return 1;
        }
        finally
        {
            Console.SetOut(originalOut);
            if (suppressedOut != null)
            {
                suppressedOut.Dispose();
            }
        }
    }

    private static string ParseRequestFile(string[] args)
    {
        if (args == null)
        {
            throw new AscetReadException("invalid_argument", "guarded_mutation", "--request-file is required.");
        }
        for (int i = 0; i < args.Length; i++)
        {
            if (String.Equals(args[i], "--json", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }
            if (String.Equals(args[i], "--request-file", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            {
                string path = Path.GetFullPath(args[++i]);
                if (!File.Exists(path))
                {
                    throw new AscetReadException("request_file_not_found", "guarded_mutation", "Request file was not found: " + path);
                }
                return path;
            }
            throw new AscetReadException("invalid_argument", "guarded_mutation", "Unknown argument '" + args[i] + "'.");
        }
        throw new AscetReadException("invalid_argument", "guarded_mutation", "--request-file is required.");
    }

    private static Dictionary<string, object> BuildPayload(AscetGuardedMutationResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["success"] = result != null && result.Success;
        payload["operation"] = result == null ? String.Empty : (result.Operation ?? String.Empty);
        payload["editabilityMutationStarted"] = result != null && result.EditabilityMutationStarted;
        payload["editabilityAcquired"] = result != null && result.EditabilityAcquired;
        payload["primaryMutationStarted"] = result == null ? null : (object)result.PrimaryMutationStarted;
        payload["mutationStatus"] = result == null ? "unknown" : (result.MutationStatus ?? "unknown");
        payload["verificationStatus"] = result == null ? "unknown" : (result.VerificationStatus ?? "unknown");
        payload["targets"] = BuildTargets(result == null ? null : result.Targets);
        payload["error"] = result == null ? null : result.Error;
        payload["primaryResult"] = result == null ? null : result.PrimaryResult;
        return payload;
    }

    private static IList<object> BuildTargets(IList<AscetGuardedMutationTargetResult> targets)
    {
        List<object> values = new List<object>();
        if (targets == null)
        {
            return values;
        }
        for (int i = 0; i < targets.Count; i++)
        {
            AscetGuardedMutationTargetResult target = targets[i];
            Dictionary<string, object> value = new Dictionary<string, object>();
            value["path"] = target == null ? String.Empty : (target.Path ?? String.Empty);
            value["initiallyEditable"] = target != null && target.InitiallyEditable;
            value["editabilityMutationStarted"] = target != null && target.EditabilityMutationStarted;
            value["editabilityAcquired"] = target != null && target.EditabilityAcquired;
            value["finalEditable"] = target != null && target.FinalEditable;
            values.Add(value);
        }
        return values;
    }

    private static string GetRequiredString(IDictionary<string, object> payload, string key)
    {
        string value = GetString(payload, key).Trim();
        if (String.IsNullOrWhiteSpace(value))
        {
            throw new AscetReadException("invalid_argument", "guarded_mutation", key + " is required.");
        }
        return value;
    }

    private static string GetString(IDictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }
        return Convert.ToString(payload[key], CultureInfo.InvariantCulture) ?? String.Empty;
    }

    private static bool GetBoolean(IDictionary<string, object> payload, string key)
    {
        return payload != null && payload.ContainsKey(key) && payload[key] is bool && (bool)payload[key];
    }

    private static IList<string> GetStringList(IDictionary<string, object> payload, string key)
    {
        List<string> values = new List<string>();
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null)
        {
            return values;
        }
        IEnumerable sequence = payload[key] as IEnumerable;
        if (sequence == null || payload[key] is string)
        {
            throw new AscetReadException("invalid_argument", "guarded_mutation", key + " must be an array.");
        }
        foreach (object item in sequence)
        {
            values.Add(Convert.ToString(item, CultureInfo.InvariantCulture) ?? String.Empty);
        }
        return values;
    }
}
