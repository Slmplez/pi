using System;
using System.Collections.Generic;
using System.IO;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public sealed class AscetGuardedCreateMethodResult
{
    public bool Success { get; set; }
    public bool InitiallyEditable { get; set; }
    public bool EditabilityMutationStarted { get; set; }
    public bool EditabilityAcquired { get; set; }
    public bool PrimaryMutationStarted { get; set; }
    public bool FinalEditable { get; set; }
    public bool DiagramInitiallyExisted { get; set; }
    public bool DiagramCreated { get; set; }
    public bool DiagramCompensationAttempted { get; set; }
    public bool DiagramCompensated { get; set; }
    public bool MethodPresentAfterFailure { get; set; }
    public string MutationStatus { get; set; }
    public string VerificationStatus { get; set; }
    public Dictionary<string, object> Error { get; set; }
    public AscetMethodCreateResult Method { get; set; }
}

public sealed class AscetGuardedCreateMethodService : MethodCatalogService
{
    public AscetGuardedCreateMethodResult Execute(
        string componentPath,
        string methodName,
        AscetMethodKind methodKind,
        string diagramName,
        bool returnExisting,
        bool acquireEditability)
    {
        AscetGuardedCreateMethodResult result = new AscetGuardedCreateMethodResult();
        result.MutationStatus = "not_started";
        result.VerificationStatus = "not_applicable";
        result.Error = null;
        return ExecuteWithSession("guarded_create_method", delegate(AscetSession session)
        {
            AscetEditableService editableService = new AscetEditableService();
            CodeComponent initialCodeComponent = ResolveCodeComponent(session, componentPath);
            result.DiagramInitiallyExisted = initialCodeComponent.GetDiagramWithName(diagramName) != null;
            AscetComponentEditableResult initial = editableService.CheckEditableInSession(session, componentPath);
            result.InitiallyEditable = initial != null && initial.Editable;
            result.FinalEditable = result.InitiallyEditable;
            if (!result.InitiallyEditable)
            {
                if (!acquireEditability)
                {
                    result.Success = false;
                    result.Error = Error("editable_write_gate_blocked", "Component '" + componentPath + "' is read-only and editability acquisition was not authorized.");
                    return result;
                }
                result.EditabilityMutationStarted = true;
                AscetComponentEditableResult acquired = editableService.SetEditableInSession(session, componentPath);
                result.EditabilityAcquired = acquired != null && acquired.Editable;
                result.FinalEditable = result.EditabilityAcquired;
                if (!result.EditabilityAcquired)
                {
                    result.Success = false;
                    result.Error = Error("component_not_editable", "Component '" + componentPath + "' remained read-only after the authorized SCM operation.");
                    return result;
                }
            }

            try
            {
                MethodCreateService creator = new MethodCreateService();
                result.Method = creator.CreateMethodInSession(
                    session,
                    componentPath,
                    methodName,
                    methodKind,
                    diagramName,
                    true,
                    true,
                    returnExisting);
                result.PrimaryMutationStarted = result.Method != null && result.Method.Created;
                CodeComponent finalCodeComponent = ResolveCodeComponent(session, componentPath);
                result.DiagramCreated = !result.DiagramInitiallyExisted && finalCodeComponent.GetDiagramWithName(diagramName) != null;
                result.Success = true;
                result.MutationStatus = result.Method != null && result.Method.AlreadyExisted ? "no_op" : "applied";
                result.VerificationStatus = result.Method != null && result.Method.ReadbackVerified ? "passed" : "failed";
                AscetComponentEditableResult finalState = editableService.CheckEditableInSession(session, componentPath);
                result.FinalEditable = finalState != null && finalState.Editable;
                return result;
            }
            catch (Exception ex)
            {
                result.Success = false;
                try
                {
                    CodeComponent currentCodeComponent = ResolveCodeComponent(session, componentPath);
                    AscetDiagram currentDiagram = currentCodeComponent.GetDiagramWithName(diagramName);
                    result.DiagramCreated = !result.DiagramInitiallyExisted && currentDiagram != null;
                    result.MethodPresentAfterFailure = MethodExistsInSession(session, componentPath, methodName);
                    string errorCode = ex is AscetReadException ? ((AscetReadException)ex).Code : String.Empty;
                    result.PrimaryMutationStarted =
                        result.MethodPresentAfterFailure ||
                        result.DiagramCreated ||
                        String.Equals(errorCode, "forced_failure", StringComparison.Ordinal) ||
                        String.Equals(errorCode, "readback_mismatch", StringComparison.Ordinal);
                    if (result.DiagramCreated && !result.MethodPresentAfterFailure && currentDiagram != null)
                    {
                        result.DiagramCompensationAttempted = true;
                        bool removed = currentCodeComponent.RemoveDiagram(currentDiagram);
                        result.DiagramCompensated = removed && currentCodeComponent.GetDiagramWithName(diagramName) == null;
                    }
                }
                catch
                {
                }
                result.MutationStatus = AscetGuardedCreateMethodOutcome.ClassifyFailure(
                    result.EditabilityAcquired,
                    result.PrimaryMutationStarted,
                    result.MethodPresentAfterFailure,
                    result.DiagramCreated,
                    result.DiagramCompensated);
                result.VerificationStatus = String.Equals(result.MutationStatus, "rolled_back", StringComparison.Ordinal)
                    ? "passed"
                    : String.Equals(result.MutationStatus, "not_started", StringComparison.Ordinal)
                        ? "not_applicable"
                        : "unknown";
                result.Error = Error(
                    ex is AscetReadException ? ((AscetReadException)ex).Code : "guarded_create_method_failed",
                    ex.Message);
                try
                {
                    AscetComponentEditableResult finalState = editableService.CheckEditableInSession(session, componentPath);
                    result.FinalEditable = finalState != null && finalState.Editable;
                }
                catch
                {
                }
                return result;
            }
        });
    }

    private bool MethodExistsInSession(AscetSession session, string componentPath, string methodName)
    {
        DataBaseItem item = ResolveItemByPath(session, componentPath);
        AscetItemRef component = Classifier.ToItemRef(item);
        try
        {
            return FindMethodHandle(CollectMethodHandles(session, component), component.Path, methodName) != null;
        }
        catch (AscetReadException ex)
        {
            if (String.Equals(ex.Code, "method_not_found", StringComparison.Ordinal))
            {
                return false;
            }
            throw;
        }
    }

    private static Dictionary<string, object> Error(string code, string message)
    {
        Dictionary<string, object> error = new Dictionary<string, object>();
        error["code"] = code ?? String.Empty;
        error["message"] = message ?? String.Empty;
        return error;
    }
}

public static class AscetGuardedCreateMethodOutcome
{
    public static string ClassifyFailure(
        bool editabilityAcquired,
        bool primaryMutationStarted,
        bool methodPresentAfterFailure,
        bool diagramCreated,
        bool diagramCompensated)
    {
        if (!editabilityAcquired && !primaryMutationStarted)
        {
            return "not_started";
        }
        bool primaryEffectsRestored = !methodPresentAfterFailure && (!diagramCreated || diagramCompensated);
        if (!editabilityAcquired && primaryMutationStarted && primaryEffectsRestored)
        {
            return "rolled_back";
        }
        return "partially_applied";
    }
}

public static class AscetGuardedCreateMethod
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;
        try
        {
            if (args == null || args.Length < 2)
            {
                throw new AscetReadException("invalid_argument", "guarded_create_method", "usage: AscetBridge.exe exec guarded_create_method <component-path> <method-name> --method-kind <kind> [--diagram <name>] [--if-exists <fail|return-existing>] [--acquire-editability] [--json]");
            }
            string componentPath = args[0];
            string methodName = args[1];
            string diagramName = "Main";
            AscetMethodKind methodKind = AscetMethodKind.Unknown;
            bool returnExisting = false;
            bool acquireEditability = false;
            for (int i = 2; i < args.Length; i++)
            {
                string argument = args[i];
                if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase)) continue;
                if (String.Equals(argument, "--acquire-editability", StringComparison.OrdinalIgnoreCase)) { acquireEditability = true; continue; }
                if (String.Equals(argument, "--method-kind", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) { methodKind = ParseMethodKind(args[++i]); continue; }
                if (String.Equals(argument, "--diagram", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) { diagramName = args[++i]; continue; }
                if (String.Equals(argument, "--if-exists", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) { returnExisting = String.Equals(args[++i], "return-existing", StringComparison.OrdinalIgnoreCase); continue; }
                throw new AscetReadException("invalid_argument", "guarded_create_method", "Unknown argument '" + argument + "'.");
            }
            if (methodKind == AscetMethodKind.Unknown) throw new AscetReadException("invalid_argument", "guarded_create_method", "--method-kind is required.");
            suppressedOut = new StringWriter();
            Console.SetOut(suppressedOut);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            AscetGuardedCreateMethodResult result = new AscetGuardedCreateMethodService().Execute(componentPath, methodName, methodKind, diagramName, returnExisting, acquireEditability);
            Dictionary<string, object> payload = new Dictionary<string, object>();
            payload["success"] = result.Success;
            payload["initiallyEditable"] = result.InitiallyEditable;
            payload["editabilityMutationStarted"] = result.EditabilityMutationStarted;
            payload["editabilityAcquired"] = result.EditabilityAcquired;
            payload["primaryMutationStarted"] = result.PrimaryMutationStarted;
            payload["finalEditable"] = result.FinalEditable;
            payload["diagramInitiallyExisted"] = result.DiagramInitiallyExisted;
            payload["diagramCreated"] = result.DiagramCreated;
            payload["diagramCompensationAttempted"] = result.DiagramCompensationAttempted;
            payload["diagramCompensated"] = result.DiagramCompensated;
            payload["methodPresentAfterFailure"] = result.MethodPresentAfterFailure;
            payload["mutationStatus"] = result.MutationStatus;
            payload["verificationStatus"] = result.VerificationStatus;
            payload["error"] = result.Error;
            payload["method"] = result.Method == null ? null : SerializeMethod(result.Method);
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
            if (suppressedOut != null) suppressedOut.Dispose();
        }
    }

    private static Dictionary<string, object> SerializeMethod(AscetMethodCreateResult method)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = method.ComponentPath ?? String.Empty;
        payload["methodName"] = method.MethodName ?? String.Empty;
        payload["methodKind"] = method.MethodKind.ToString();
        payload["diagramName"] = method.DiagramName ?? String.Empty;
        payload["created"] = method.Created;
        payload["alreadyExisted"] = method.AlreadyExisted;
        payload["readbackVerified"] = method.ReadbackVerified;
        return payload;
    }

    private static AscetMethodKind ParseMethodKind(string value)
    {
        switch ((value ?? String.Empty).Trim().ToLowerInvariant())
        {
            case "abstract": return AscetMethodKind.AbstractMethod;
            case "process": return AscetMethodKind.Process;
            case "action": return AscetMethodKind.Action;
            case "condition": return AscetMethodKind.Condition;
            case "trigger": return AscetMethodKind.Trigger;
            default: throw new AscetReadException("invalid_argument", "guarded_create_method", "Unsupported method kind '" + value + "'.");
        }
    }
}
