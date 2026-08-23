using System;
using System.Collections.Generic;
using System.IO;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public sealed class AscetNativeScmOperationResult
{
    public string Name { get; set; }
    public bool Attempted { get; set; }
    public bool Returned { get; set; }
    public bool Threw { get; set; }
    public string ErrorType { get; set; }
    public string ErrorMessage { get; set; }
    public string ReResolutionStatus { get; set; }
}

public sealed class AscetComponentEditableResult
{
    public string Outcome { get; set; }
    public string TargetPath { get; set; }
    public bool Editable { get; set; }
    public bool BeforeIsVersion { get; set; }
    public bool BeforeIsEdition { get; set; }
    public bool BeforeEditable { get; set; }
    public bool? AfterIsVersion { get; set; }
    public bool? AfterIsEdition { get; set; }
    public bool? AfterEditable { get; set; }
    public bool Changed { get; set; }
    public string MutationStatus { get; set; }
    public bool SaveAttempted { get; set; }
    public bool SaveSucceeded { get; set; }
    public string SaveState { get; set; }
    public bool Verified { get; set; }
    public string VerificationStatus { get; set; }
    public string VerificationMode { get; set; }
    public int SessionCount { get; set; }
    public int SaveCount { get; set; }
    public int NativeMutationAttemptCount { get; set; }
    public int NativeScmOperationCount { get; set; }
    public string ScmBindingType { get; set; }
    public IList<AscetNativeScmOperationResult> NativeOperations { get; set; }
    public bool RecoveryRequired { get; set; }
    public IList<string> RecoveryActions { get; set; }
    public Dictionary<string, object> OriginalError { get; set; }
}

public sealed class AscetComponentEditableMutationException : Exception
{
    public AscetComponentEditableMutationException(string code, string operation, string message, AscetComponentEditableResult result, Exception innerException)
        : base(message, innerException)
    {
        Code = code ?? String.Empty;
        Operation = operation ?? String.Empty;
        Result = result;
    }

    public string Code { get; private set; }
    public string Operation { get; private set; }
    public AscetComponentEditableResult Result { get; private set; }
}

public sealed class AscetEditableService : AscetReadDomainServiceBase
{
    public AscetComponentEditableResult CheckEditable(string itemPath)
    {
        return GetEditableState(itemPath, false);
    }

    public AscetComponentEditableResult SetEditable(string itemPath)
    {
        return GetEditableState(itemPath, true);
    }

    internal AscetComponentEditableResult CheckEditableInSession(AscetSession session, string itemPath)
    {
        return GetEditableStateInSession(session, itemPath, false);
    }

    internal AscetComponentEditableResult SetEditableInSession(AscetSession session, string itemPath)
    {
        return GetEditableStateInSession(session, itemPath, true);
    }

    private AscetComponentEditableResult GetEditableState(string itemPath, bool setEditable)
    {
        string operation = setEditable ? "component_editable_set" : "component_editable_check";
        return ExecuteWithSession(operation, delegate(AscetSession session)
        {
            return GetEditableStateInSession(session, itemPath, setEditable);
        });
    }

    private AscetComponentEditableResult GetEditableStateInSession(AscetSession session, string itemPath, bool setEditable)
    {
        if (session == null) throw new ArgumentNullException("session");
        string normalizedPath = AscetComponentEditable.NormalizeItemPath(itemPath);
        string operation = setEditable ? "component_editable_set" : "component_editable_check";
        return ExecuteWithBoundSession(operation, session, delegate(AscetSession currentSession)
        {
            DataBaseItem item = ResolveItemByPath(currentSession, normalizedPath);
            Component component = item as Component;
            if (component == null)
            {
                throw new AscetReadException(
                    "unsupported_item_kind",
                    operation,
                    "Item '" + normalizedPath + "' is not an ASCET component and cannot be checked or set editable.");
            }

            bool wasVersion = component.IsVersion();
            bool wasEdition = component.IsEdition();
            bool beforeEditable = IsEditable(wasVersion, wasEdition);
            AscetComponentEditableResult result = CreateInitialResult(normalizedPath, wasVersion, wasEdition, beforeEditable, setEditable);
            if (!setEditable || beforeEditable)
            {
                return CompleteResult(result, component, setEditable);
            }

            AscetSCMInterface scm = currentSession.GetToolHandle().GetSCMInterface();
            if (scm == null)
            {
                throw CreateFailure(
                    result,
                    "scm_interface_unavailable",
                    operation,
                    "ASCET returned no SCM interface. Ensure ASCET-SCM is installed and the database/workspace is source-control enabled.",
                    null,
                    false);
            }

            bool tcm = IsTcmDriver(scm);
            result.ScmBindingType = tcm ? "tcm" : "generic";
            result.NativeMutationAttemptCount = 1;
            try
            {
                DataBaseItem[] items = new DataBaseItem[] { component };
                if (tcm)
                {
                    ExecuteScriptingOperation(result, scm, "ReserveItem", items);
                    component = ReResolveComponent(currentSession, normalizedPath, operation, result.NativeOperations[result.NativeOperations.Count - 1]);
                    if (component.IsVersion() && !component.IsEdition())
                    {
                        ExecuteScriptingOperation(result, scm, "CreateEdition", new DataBaseItem[] { component });
                        component = ReResolveComponent(currentSession, normalizedPath, operation, result.NativeOperations[result.NativeOperations.Count - 1]);
                    }
                }
                else
                {
                    string scmData = scm.GetItemSCMData(items);
                    ExecuteCommandOperation(result, scm, "Lock", scmData);
                    component = ReResolveComponent(currentSession, normalizedPath, operation, result.NativeOperations[result.NativeOperations.Count - 1]);
                }
            }
            catch (Exception ex)
            {
                TryCaptureAfterState(currentSession, normalizedPath, result);
                bool previousOperationReturned = HasReturnedOperation(result.NativeOperations);
                bool currentOperationThrew = HasThrownOperation(result.NativeOperations);
                string status = previousOperationReturned ? "partial_failure" : currentOperationThrew ? "outcome_unknown" : "not_started";
                throw CreateFailure(
                    result,
                    status,
                    operation,
                    "SCM editability operation failed for component '" + normalizedPath + "': " + ex.Message,
                    ex,
                    result.NativeScmOperationCount > 0);
            }

            return CompleteResult(result, component, true);
        });
    }

    private static AscetComponentEditableResult CreateInitialResult(string path, bool wasVersion, bool wasEdition, bool beforeEditable, bool setEditable)
    {
        return new AscetComponentEditableResult
        {
            Outcome = "succeeded",
            TargetPath = path,
            Editable = beforeEditable,
            BeforeIsVersion = wasVersion,
            BeforeIsEdition = wasEdition,
            BeforeEditable = beforeEditable,
            AfterIsVersion = wasVersion,
            AfterIsEdition = wasEdition,
            AfterEditable = beforeEditable,
            Changed = false,
            MutationStatus = setEditable ? "no_op" : "read_only",
            SaveAttempted = false,
            SaveSucceeded = false,
            SaveState = "not_applicable",
            Verified = true,
            VerificationStatus = "passed",
            VerificationMode = "same_session_scm_state",
            SessionCount = 1,
            SaveCount = 0,
            NativeMutationAttemptCount = 0,
            NativeScmOperationCount = 0,
            ScmBindingType = "none",
            NativeOperations = new List<AscetNativeScmOperationResult>(),
            RecoveryRequired = false,
            RecoveryActions = new List<string>(),
            OriginalError = null
        };
    }

    private static AscetComponentEditableResult CompleteResult(AscetComponentEditableResult result, Component component, bool setEditable)
    {
        bool isVersion = component.IsVersion();
        bool isEdition = component.IsEdition();
        bool afterEditable = IsEditable(isVersion, isEdition);
        result.Editable = afterEditable;
        result.AfterIsVersion = isVersion;
        result.AfterIsEdition = isEdition;
        result.AfterEditable = afterEditable;
        result.Changed = result.BeforeEditable != afterEditable;
        result.MutationStatus = setEditable ? (result.Changed ? "applied" : "no_op") : "read_only";
        result.Verified = !setEditable || afterEditable;
        result.VerificationStatus = result.Verified ? "passed" : "failed";
        if (setEditable && !afterEditable)
        {
            result.Outcome = "failed";
            result.MutationStatus = "verification_failed";
            result.RecoveryRequired = result.NativeScmOperationCount > 0;
            if (result.RecoveryRequired)
            {
                result.RecoveryActions.Add("Inspect and release the SCM reservation or lock for '" + result.TargetPath + "' before retrying.");
            }
            result.OriginalError = Error("component_not_editable", "Component remained read-only after the SCM editability command.");
        }
        return result;
    }

    private Component ReResolveComponent(
        AscetSession session,
        string normalizedPath,
        string operation,
        AscetNativeScmOperationResult nativeOperation)
    {
        try
        {
            DataBaseItem item = ResolveItemByPath(session, normalizedPath);
            Component component = item as Component;
            if (component == null)
            {
                nativeOperation.ReResolutionStatus = "not_component";
                throw new AscetReadException(
                    "unsupported_item_kind",
                    operation,
                    "Item '" + normalizedPath + "' was no longer an ASCET component after SCM operation '" + nativeOperation.Name + "'.");
            }
            nativeOperation.ReResolutionStatus = "resolved";
            return component;
        }
        catch
        {
            if (String.IsNullOrWhiteSpace(nativeOperation.ReResolutionStatus))
            {
                nativeOperation.ReResolutionStatus = "failed";
            }
            throw;
        }
    }

    private static void ExecuteScriptingOperation(
        AscetComponentEditableResult result,
        AscetSCMInterface scm,
        string name,
        DataBaseItem[] items)
    {
        AscetNativeScmOperationResult operation = BeginOperation(result, name);
        try
        {
            scm.ExecuteSCMScriptingCommandForItems(name, items);
            operation.Returned = true;
        }
        catch (Exception ex)
        {
            RecordOperationFailure(operation, ex);
            throw;
        }
    }

    private static void ExecuteCommandOperation(
        AscetComponentEditableResult result,
        AscetSCMInterface scm,
        string name,
        string scmData)
    {
        AscetNativeScmOperationResult operation = BeginOperation(result, name);
        try
        {
            scm.ExecuteSCMCommand(name, scmData, String.Empty);
            operation.Returned = true;
        }
        catch (Exception ex)
        {
            RecordOperationFailure(operation, ex);
            throw;
        }
    }

    private static AscetNativeScmOperationResult BeginOperation(AscetComponentEditableResult result, string name)
    {
        AscetNativeScmOperationResult operation = new AscetNativeScmOperationResult
        {
            Name = name ?? String.Empty,
            Attempted = true,
            Returned = false,
            Threw = false,
            ErrorType = String.Empty,
            ErrorMessage = String.Empty,
            ReResolutionStatus = "not_attempted"
        };
        result.NativeScmOperationCount += 1;
        result.NativeOperations.Add(operation);
        return operation;
    }

    private static void RecordOperationFailure(AscetNativeScmOperationResult operation, Exception ex)
    {
        operation.Threw = true;
        operation.ErrorType = ex == null ? String.Empty : ex.GetType().FullName;
        operation.ErrorMessage = ex == null ? String.Empty : (ex.Message ?? String.Empty);
    }

    private void TryCaptureAfterState(AscetSession session, string normalizedPath, AscetComponentEditableResult result)
    {
        try
        {
            DataBaseItem item = ResolveItemByPath(session, normalizedPath);
            Component component = item as Component;
            if (component == null)
            {
                return;
            }
            bool isVersion = component.IsVersion();
            bool isEdition = component.IsEdition();
            result.AfterIsVersion = isVersion;
            result.AfterIsEdition = isEdition;
            result.AfterEditable = IsEditable(isVersion, isEdition);
            result.Editable = result.AfterEditable.Value;
            result.Changed = result.BeforeEditable != result.AfterEditable.Value;
        }
        catch
        {
            result.AfterIsVersion = null;
            result.AfterIsEdition = null;
            result.AfterEditable = null;
        }
    }

    private static AscetComponentEditableMutationException CreateFailure(
        AscetComponentEditableResult result,
        string code,
        string operation,
        string message,
        Exception innerException,
        bool recoveryRequired)
    {
        result.Outcome = "failed";
        result.MutationStatus = code == "scm_interface_unavailable" ? "not_started" : code;
        result.Verified = false;
        result.VerificationStatus = code == "not_started" || code == "scm_interface_unavailable" ? "not_applicable" : "unknown";
        result.RecoveryRequired = recoveryRequired;
        if (recoveryRequired)
        {
            result.RecoveryActions.Add("Inspect and release the SCM reservation or lock for '" + result.TargetPath + "' before retrying.");
        }
        result.OriginalError = Error(code, message);
        return new AscetComponentEditableMutationException(code, operation, message, result, innerException);
    }

    private static Dictionary<string, object> Error(string code, string message)
    {
        Dictionary<string, object> error = new Dictionary<string, object>();
        error["code"] = code ?? String.Empty;
        error["message"] = message ?? String.Empty;
        return error;
    }

    private static bool HasReturnedOperation(IList<AscetNativeScmOperationResult> operations)
    {
        for (int i = 0; i < operations.Count; i++)
        {
            if (operations[i] != null && operations[i].Returned) return true;
        }
        return false;
    }

    private static bool HasThrownOperation(IList<AscetNativeScmOperationResult> operations)
    {
        for (int i = 0; i < operations.Count; i++)
        {
            if (operations[i] != null && operations[i].Threw) return true;
        }
        return false;
    }

    private static bool IsEditable(bool isVersion, bool isEdition)
    {
        return isEdition || !(isVersion || isEdition);
    }

    private bool IsTcmDriver(AscetSCMInterface scm)
    {
        string binding = scm.GetSourceControlBindingInformation();
        if (String.IsNullOrWhiteSpace(binding))
        {
            return false;
        }

        return binding.IndexOf("<scmDriverId>RB_CC.TCM</scmDriverId>", StringComparison.OrdinalIgnoreCase) >= 0 ||
               binding.IndexOf("<scmDriverName>TCM</scmDriverName>", StringComparison.OrdinalIgnoreCase) >= 0;
    }
}

public static class AscetComponentEditable
{
    public static int CheckMain(string[] args)
    {
        return Run(args, false);
    }

    public static int SetMain(string[] args)
    {
        return Run(args, true);
    }

    public static string NormalizeItemPath(string itemPath)
    {
        string normalized = (itemPath ?? String.Empty).Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }
        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException("invalid_argument", "normalize_item_path", "Component path must not be empty.");
        }
        return normalized;
    }

    private static int Run(string[] args, bool setEditable)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;
        try
        {
            string itemPath = ParseItemPath(args);
            suppressedOut = new StringWriter();
            Console.SetOut(suppressedOut);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            AscetEditableService service = new AscetEditableService();
            AscetComponentEditableResult result = setEditable
                ? service.SetEditable(itemPath)
                : service.CheckEditable(itemPath);
            Console.SetOut(originalOut);
            Dictionary<string, object> payload = BuildPayload(result, setEditable);
            if (setEditable && (result == null || !result.Editable || !result.Verified))
            {
                if (!payload.ContainsKey("error"))
                {
                    payload["error"] = Error("component_not_editable", "Component '" + itemPath + "' remained read-only after the SCM editability command.");
                }
                Console.Write(AscetJsonContract.Serialize(payload));
                return 2;
            }
            Console.Write(AscetJsonContract.Serialize(payload));
            return 0;
        }
        catch (AscetComponentEditableMutationException ex)
        {
            Console.SetOut(originalOut);
            Dictionary<string, object> payload = BuildPayload(ex.Result, true);
            payload["error"] = Error(ex.Code, ex.Message);
            Console.Write(AscetJsonContract.Serialize(payload));
            return 2;
        }
        catch (Exception ex)
        {
            Console.SetOut(originalOut);
            Console.Error.WriteLine(FormatException(ex));
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

    private static Dictionary<string, object> BuildPayload(AscetComponentEditableResult result, bool setEditable)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["outcome"] = result == null ? "failed" : (result.Outcome ?? "failed");
        payload["editable"] = result != null && result.Editable;
        payload["mutationStatus"] = result == null ? "not_started" : (result.MutationStatus ?? "not_started");
        payload["changed"] = result != null && result.Changed;
        payload["verified"] = result != null && result.Verified;
        payload["verificationStatus"] = result == null ? "not_applicable" : (result.VerificationStatus ?? "not_applicable");
        payload["verificationMode"] = "same_session_scm_state";
        payload["sessionCount"] = 1;
        payload["nativeMutationAttemptCount"] = result == null ? 0 : result.NativeMutationAttemptCount;
        if (!setEditable)
        {
            return payload;
        }

        payload["targetPath"] = result == null ? String.Empty : (result.TargetPath ?? String.Empty);
        payload["beforeIsVersion"] = result != null && result.BeforeIsVersion;
        payload["beforeIsEdition"] = result != null && result.BeforeIsEdition;
        payload["beforeEditable"] = result == null ? null : (object)result.BeforeEditable;
        payload["afterIsVersion"] = result == null ? null : (object)result.AfterIsVersion;
        payload["afterIsEdition"] = result == null ? null : (object)result.AfterIsEdition;
        payload["afterEditable"] = result == null ? null : (object)result.AfterEditable;
        payload["saveAttempted"] = false;
        payload["saveSucceeded"] = false;
        payload["saveState"] = "not_applicable";
        payload["saveCount"] = 0;
        payload["nativeScmOperationCount"] = result == null ? 0 : result.NativeScmOperationCount;
        payload["scmBindingType"] = result == null ? String.Empty : (result.ScmBindingType ?? String.Empty);
        payload["nativeOperations"] = BuildNativeOperations(result == null ? null : result.NativeOperations);
        payload["originalError"] = result == null ? null : result.OriginalError;
        Dictionary<string, object> recovery = new Dictionary<string, object>();
        recovery["required"] = result != null && result.RecoveryRequired;
        recovery["actions"] = result == null || result.RecoveryActions == null ? new List<string>() : result.RecoveryActions;
        payload["recovery"] = recovery;
        return payload;
    }

    private static IList<object> BuildNativeOperations(IList<AscetNativeScmOperationResult> operations)
    {
        List<object> values = new List<object>();
        if (operations == null) return values;
        for (int i = 0; i < operations.Count; i++)
        {
            AscetNativeScmOperationResult operation = operations[i];
            if (operation == null) continue;
            Dictionary<string, object> value = new Dictionary<string, object>();
            value["name"] = operation.Name ?? String.Empty;
            value["attempted"] = operation.Attempted;
            value["returned"] = operation.Returned;
            value["threw"] = operation.Threw;
            value["errorType"] = operation.ErrorType ?? String.Empty;
            value["errorMessage"] = operation.ErrorMessage ?? String.Empty;
            value["reResolutionStatus"] = operation.ReResolutionStatus ?? String.Empty;
            values.Add(value);
        }
        return values;
    }

    private static Dictionary<string, object> Error(string code, string message)
    {
        Dictionary<string, object> error = new Dictionary<string, object>();
        error["code"] = code ?? String.Empty;
        error["message"] = message ?? String.Empty;
        return error;
    }

    private static string ParseItemPath(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException(
                "invalid_argument",
                "parse_arguments",
                "usage: AscetBridge.exe exec component_editable_(check|set) <component-path> [--json]");
        }
        for (int i = 1; i < args.Length; i++)
        {
            if (!String.Equals(args[i], "--json", StringComparison.OrdinalIgnoreCase))
            {
                throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + args[i] + "'.");
            }
        }
        return NormalizeItemPath(args[0]);
    }

    private static string FormatException(Exception ex)
    {
        AscetReadException ascet = ex as AscetReadException;
        if (ascet != null)
        {
            return ascet.Code + ":" + ascet.Operation + ":" + ascet.Message;
        }
        return ex.GetType().FullName + ":" + ex.Message;
    }
}
