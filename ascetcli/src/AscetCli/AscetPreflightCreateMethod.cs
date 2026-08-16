using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public sealed class AscetPreflightCreateMethodResult
{
    public string DatabasePath { get; set; }
    public string ComponentPath { get; set; }
    public string ComponentOid { get; set; }
    public string ComponentKind { get; set; }
    public string LanguageKind { get; set; }
    public string DiagramName { get; set; }
    public bool DiagramExists { get; set; }
    public string DiagramRuntimeType { get; set; }
    public string RequiredMethod { get; set; }
    public string RequiredSignature { get; set; }
    public bool RequiredMethodAvailable { get; set; }
    public bool AddDiagramAvailable { get; set; }
    public bool FutureMethodCapabilityProven { get; set; }
    public bool Editable { get; set; }
    public bool ReadbackAvailable { get; set; }
    public bool NoOp { get; set; }
    public Dictionary<string, object> ExistingMethod { get; set; }
    public List<Dictionary<string, object>> PlannedEffects { get; set; }
    public string CapabilityStatus { get; set; }
    public string FailureCode { get; set; }
    public string FailureMessage { get; set; }
}

public sealed class AscetPreflightCreateMethodService : MethodCatalogService
{
    public AscetPreflightCreateMethodResult Preflight(
        string componentPath,
        string methodName,
        AscetMethodKind methodKind,
        string diagramName,
        bool returnExisting)
    {
        if (String.IsNullOrWhiteSpace(componentPath)) throw new AscetReadException("invalid_argument", "preflight_create_method", "Component path must not be empty.");
        if (String.IsNullOrWhiteSpace(methodName)) throw new AscetReadException("invalid_argument", "preflight_create_method", "Method name must not be empty.");
        string normalizedDiagramName = String.IsNullOrWhiteSpace(diagramName) ? "Main" : diagramName.Trim();

        return ExecuteWithSession("preflight_create_method", delegate(AscetSession session)
        {
            DataBaseItem item = ResolveItemByPath(session, componentPath);
            AscetItemRef component = Classifier.ToItemRef(item);
            AscetPreflightCreateMethodResult result = new AscetPreflightCreateMethodResult();
            result.ComponentPath = component.Path ?? componentPath;
            result.ComponentOid = ReadOid(item);
            result.ComponentKind = component.Kind.ToString();
            result.LanguageKind = component.LanguageKind.ToString();
            result.DiagramName = normalizedDiagramName;
            result.RequiredMethod = RequiredMethodName(methodKind);
            result.RequiredSignature = result.RequiredMethod + "(String)";
            result.ReadbackAvailable = true;
            result.Editable = IsComponentEditableInSession(session, componentPath, "preflight_create_method");
            result.PlannedEffects = new List<Dictionary<string, object>>();
            result.ExistingMethod = null;
            result.FailureCode = String.Empty;
            result.FailureMessage = String.Empty;

            AscetDataBase database = session.GetCurrentDatabaseHandle();
            AscetDatabaseRef databaseRef = AscetDatabaseIdentityResolver.Resolve(database, session.GetToolHandle());
            result.DatabasePath = databaseRef == null ? String.Empty : (databaseRef.CanonicalPath ?? databaseRef.Path ?? String.Empty);

            string compatibilityError = ValidateCompatibility(component.Kind, methodKind);
            if (!String.IsNullOrEmpty(compatibilityError))
            {
                result.CapabilityStatus = "unsupported";
                result.FailureCode = "create_method_kind_incompatible";
                result.FailureMessage = compatibilityError;
                return result;
            }

            IList<MethodHandle> existing = CollectMethodHandles(session, component);
            for (int i = 0; i < existing.Count; i++)
            {
                MethodHandle handle = existing[i];
                if (handle == null || handle.Reference == null || !String.Equals(handle.Reference.Name ?? String.Empty, methodName, StringComparison.Ordinal)) continue;
                result.ExistingMethod = new Dictionary<string, object>();
                result.ExistingMethod["name"] = handle.Reference.Name ?? String.Empty;
                result.ExistingMethod["kind"] = handle.Reference.MethodKind.ToString();
                result.ExistingMethod["ownerPath"] = component.Path ?? componentPath;
                bool compatible = handle.Reference.MethodKind == methodKind || methodKind == AscetMethodKind.Unknown;
                if (compatible && returnExisting)
                {
                    result.NoOp = true;
                    result.CapabilityStatus = "supported";
                    result.RequiredMethodAvailable = true;
                    result.FutureMethodCapabilityProven = true;
                    return result;
                }
                result.CapabilityStatus = "unsupported";
                result.FailureCode = compatible ? "method_already_exists" : "create_method_existing_conflict";
                result.FailureMessage = compatible
                    ? "Method '" + methodName + "' already exists in component '" + componentPath + "'."
                    : "Method '" + methodName + "' already exists with kind '" + handle.Reference.MethodKind.ToString() + "'.";
                return result;
            }

            CodeComponent codeComponent = ResolveCodeComponent(session, componentPath);
            AscetDiagram diagram = codeComponent.GetDiagramWithName(normalizedDiagramName);
            result.DiagramExists = diagram != null;
            result.DiagramRuntimeType = diagram == null ? String.Empty : (diagram.GetType().FullName ?? diagram.GetType().Name);
            if (diagram != null)
            {
                result.RequiredMethodAvailable = HasStringMethod(diagram.GetType(), result.RequiredMethod);
                result.FutureMethodCapabilityProven = true;
                if (!result.RequiredMethodAvailable)
                {
                    result.CapabilityStatus = "unsupported";
                    result.FailureCode = "create_method_capability_not_supported";
                    result.FailureMessage = "Diagram '" + normalizedDiagramName + "' does not support creating '" + MethodKindDisplayName(methodKind) + "'.";
                    return result;
                }
            }
            else
            {
                result.AddDiagramAvailable = HasStringMethod(codeComponent.GetType(), "AddDiagram");
                result.FutureMethodCapabilityProven = false;
                if (!result.AddDiagramAvailable)
                {
                    result.CapabilityStatus = "unsupported";
                    result.FailureCode = "create_diagram_capability_not_supported";
                    result.FailureMessage = "Component does not expose AddDiagram(string) for missing Diagram '" + normalizedDiagramName + "'.";
                    return result;
                }
                result.CapabilityStatus = "unsupported";
                result.FailureCode = "create_method_capability_not_supported";
                result.FailureMessage = "Cannot prove that a newly created Diagram '" + normalizedDiagramName + "' supports '" + result.RequiredSignature + "'.";
                return result;
            }

            Dictionary<string, object> methodEffect = new Dictionary<string, object>();
            methodEffect["kind"] = "create_method";
            methodEffect["target"] = componentPath + "::" + methodName;
            methodEffect["methodKind"] = methodKind.ToString();
            result.PlannedEffects.Add(methodEffect);
            result.CapabilityStatus = "supported";
            return result;
        });
    }

    private static bool HasStringMethod(Type type, string methodName)
    {
        MethodInfo method = type == null ? null : type.GetMethod(methodName, new Type[] { typeof(string) });
        return method != null;
    }

    private static string RequiredMethodName(AscetMethodKind kind)
    {
        switch (kind)
        {
            case AscetMethodKind.Process: return "AddProcess";
            case AscetMethodKind.Action: return "AddAction";
            case AscetMethodKind.Condition: return "AddCondition";
            case AscetMethodKind.Trigger: return "AddTrigger";
            default: return "AddMethod";
        }
    }

    private static string MethodKindDisplayName(AscetMethodKind kind)
    {
        switch (kind)
        {
            case AscetMethodKind.Process: return "Process";
            case AscetMethodKind.Action: return "Action";
            case AscetMethodKind.Condition: return "Condition";
            case AscetMethodKind.Trigger: return "Trigger";
            default: return "AbstractMethod";
        }
    }

    private static string ValidateCompatibility(AscetComponentKind componentKind, AscetMethodKind methodKind)
    {
        if (componentKind == AscetComponentKind.Class && methodKind == AscetMethodKind.AbstractMethod) return String.Empty;
        if (componentKind == AscetComponentKind.Module && methodKind == AscetMethodKind.Process) return String.Empty;
        if (componentKind == AscetComponentKind.StateMachine &&
            (methodKind == AscetMethodKind.Action || methodKind == AscetMethodKind.Condition || methodKind == AscetMethodKind.Trigger)) return String.Empty;
        return "Component kind '" + componentKind.ToString() + "' is incompatible with method kind '" + methodKind.ToString() + "'.";
    }

    private static string ReadOid(object value)
    {
        if (value == null) return String.Empty;
        string[] methods = new string[] { "GetOID", "GetOid", "GetObjectID", "GetObjectId" };
        for (int i = 0; i < methods.Length; i++)
        {
            MethodInfo method = value.GetType().GetMethod(methods[i], BindingFlags.Instance | BindingFlags.Public);
            if (method == null || method.GetParameters().Length != 0) continue;
            object result = method.Invoke(value, null);
            if (result != null) return Convert.ToString(result) ?? String.Empty;
        }
        return String.Empty;
    }
}

public static class AscetPreflightCreateMethod
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;
        try
        {
            if (args == null || args.Length < 2)
            {
                throw new AscetReadException("invalid_argument", "preflight_create_method", "usage: AscetBridge.exe exec preflight_create_method <component-path> <method-name> --method-kind <kind> [--diagram <name>] [--if-exists <fail|return-existing>] [--json]");
            }
            string componentPath = args[0];
            string methodName = args[1];
            string diagramName = "Main";
            AscetMethodKind methodKind = AscetMethodKind.Unknown;
            bool returnExisting = false;
            bool emitJson = false;
            for (int i = 2; i < args.Length; i++)
            {
                string argument = args[i];
                if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase)) { emitJson = true; continue; }
                if (String.Equals(argument, "--method-kind", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) { methodKind = ParseMethodKind(args[++i]); continue; }
                if (String.Equals(argument, "--diagram", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) { diagramName = args[++i]; continue; }
                if (String.Equals(argument, "--if-exists", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) { returnExisting = String.Equals(args[++i], "return-existing", StringComparison.OrdinalIgnoreCase); continue; }
                throw new AscetReadException("invalid_argument", "preflight_create_method", "Unknown argument '" + argument + "'.");
            }
            if (methodKind == AscetMethodKind.Unknown) throw new AscetReadException("invalid_argument", "preflight_create_method", "--method-kind is required.");
            if (emitJson) { suppressedOut = new StringWriter(); Console.SetOut(suppressedOut); }
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            AscetPreflightCreateMethodResult result = new AscetPreflightCreateMethodService().Preflight(componentPath, methodName, methodKind, diagramName, returnExisting);
            Dictionary<string, object> payload = new Dictionary<string, object>();
            payload["databasePath"] = result.DatabasePath;
            payload["componentPath"] = result.ComponentPath;
            payload["componentOid"] = result.ComponentOid;
            payload["componentKind"] = result.ComponentKind;
            payload["languageKind"] = result.LanguageKind;
            payload["diagramName"] = result.DiagramName;
            payload["diagramExists"] = result.DiagramExists;
            payload["diagramRuntimeType"] = result.DiagramRuntimeType;
            payload["requiredMethod"] = result.RequiredMethod;
            payload["requiredSignature"] = result.RequiredSignature;
            payload["requiredMethodAvailable"] = result.RequiredMethodAvailable;
            payload["addDiagramAvailable"] = result.AddDiagramAvailable;
            payload["futureMethodCapabilityProven"] = result.FutureMethodCapabilityProven;
            payload["editable"] = result.Editable;
            payload["readbackAvailable"] = result.ReadbackAvailable;
            payload["noOp"] = result.NoOp;
            payload["existingMethod"] = result.ExistingMethod;
            payload["plannedEffects"] = result.PlannedEffects;
            Dictionary<string, object> capability = new Dictionary<string, object>();
            capability["status"] = result.CapabilityStatus;
            capability["operation"] = result.RequiredMethod;
            capability["failureCode"] = result.FailureCode;
            capability["failureMessage"] = result.FailureMessage;
            payload["capability"] = capability;
            string output = emitJson ? AscetJsonContract.Serialize(payload) : "Component: " + result.ComponentPath + Environment.NewLine;
            Console.SetOut(originalOut);
            Console.Write(output);
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

    private static AscetMethodKind ParseMethodKind(string value)
    {
        switch ((value ?? String.Empty).Trim().ToLowerInvariant())
        {
            case "abstract": return AscetMethodKind.AbstractMethod;
            case "process": return AscetMethodKind.Process;
            case "action": return AscetMethodKind.Action;
            case "condition": return AscetMethodKind.Condition;
            case "trigger": return AscetMethodKind.Trigger;
            default: throw new AscetReadException("invalid_argument", "preflight_create_method", "Unsupported method kind '" + value + "'.");
        }
    }
}
