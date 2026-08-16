using System;
using System.Collections.Generic;
using System.Reflection;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public sealed class AscetMethodCreateResult
{
    public string ComponentPath { get; set; }
    public string MethodName { get; set; }
    public AscetMethodKind MethodKind { get; set; }
    public string DiagramName { get; set; }
    public bool Created { get; set; }
    public bool AlreadyExisted { get; set; }
    public string TargetKey { get; set; }
    public bool VerifyReadbackRequested { get; set; }
    public bool RollbackOnFailureRequested { get; set; }
    public bool ReadbackVerified { get; set; }
    public string Summary { get; set; }
}

public interface IMethodCreateService
{
    AscetMethodCreateResult CreateMethod(string componentPath, string methodName, AscetMethodKind methodKind, string diagramName, bool verifyReadback, bool rollbackOnFailure, bool returnExisting);
}

public sealed class MethodCreateService : MethodCatalogService, IMethodCreateService
{
    public AscetMethodCreateResult CreateMethod(string componentPath, string methodName, AscetMethodKind methodKind, string diagramName, bool verifyReadback, bool rollbackOnFailure, bool returnExisting)
    {
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            throw new AscetReadException("invalid_argument", "create_method", "Component path must not be empty.");
        }

        if (String.IsNullOrWhiteSpace(methodName))
        {
            throw new AscetReadException("invalid_argument", "create_method", "Method name must not be empty.");
        }

        string normalizedDiagramName = String.IsNullOrWhiteSpace(diagramName) ? "Main" : diagramName.Trim();
        bool created = false;
        bool alreadyExisted = false;
        AscetItemRef component = null;

        try
        {
            ExecuteWithSession("create_method", delegate(AscetSession session)
            {
                DataBaseItem item = ResolveItemByPath(session, componentPath);
                component = Classifier.ToItemRef(item);
                ValidateMethodKind(component, methodKind);

                IList<MethodHandle> existingHandles = CollectMethodHandles(session, component);
                for (int i = 0; i < existingHandles.Count; i++)
                {
                    MethodHandle existing = existingHandles[i];
                    if (existing == null || existing.Reference == null)
                    {
                        continue;
                    }

                    if (!String.Equals(existing.Reference.Name ?? String.Empty, methodName, StringComparison.Ordinal))
                    {
                        continue;
                    }

                    alreadyExisted = true;
                    if (!returnExisting)
                    {
                        throw new AscetReadException("method_already_exists", "create_method", "Method '" + methodName + "' already exists in component '" + componentPath + "'.");
                    }

                    return true;
                }

                RequireComponentEditableInSession(session, componentPath, "create_method");
                CodeComponent codeComponent = ResolveCodeComponent(session, componentPath);
                object diagram = ResolveOrCreateDiagram(codeComponent, normalizedDiagramName);
                CreateMethodOnDiagram(diagram, methodName, methodKind, componentPath, normalizedDiagramName);
                created = true;

                if (String.Equals(Environment.GetEnvironmentVariable("ASCET_FAIL_AFTER_CREATE_METHOD"), "1", StringComparison.Ordinal))
                {
                    throw new AscetReadException("forced_failure", "create_method", "Forced failure after method creation for rollback verification.");
                }

                return true;
            });

            bool readbackVerified = false;
            if (verifyReadback)
            {
                AscetMethodRef method = GetMethod(componentPath, methodName);
                readbackVerified = method != null &&
                    String.Equals(method.Name ?? String.Empty, methodName, StringComparison.Ordinal) &&
                    (method.MethodKind == methodKind || methodKind == AscetMethodKind.Unknown);
                if (!readbackVerified)
                {
                    throw new AscetReadException("readback_mismatch", "create_method", "Readback verification failed for method '" + methodName + "' in component '" + componentPath + "'.");
                }
            }

            return new AscetMethodCreateResult
            {
                ComponentPath = componentPath,
                MethodName = methodName,
                MethodKind = methodKind,
                DiagramName = normalizedDiagramName,
                Created = created,
                AlreadyExisted = alreadyExisted,
                TargetKey = componentPath + "::" + methodName,
                VerifyReadbackRequested = verifyReadback,
                RollbackOnFailureRequested = rollbackOnFailure,
                ReadbackVerified = readbackVerified,
                Summary = BuildSummary(componentPath, methodName, methodKind, normalizedDiagramName, created, alreadyExisted)
            };
        }
        catch
        {
            if (rollbackOnFailure && created)
            {
                try
                {
                    MethodDeleteService deleteService = new MethodDeleteService();
                    deleteService.DeleteMethod(componentPath, methodName, false, true);
                }
                catch
                {
                }
            }

            throw;
        }
    }

    internal AscetMethodCreateResult CreateMethodInSession(AscetSession session, string componentPath, string methodName, AscetMethodKind methodKind, string diagramName, bool verifyReadback, bool rollbackOnFailure, bool returnExisting)
    {
        if (session == null)
        {
            throw new ArgumentNullException("session");
        }

        if (String.IsNullOrWhiteSpace(componentPath))
        {
            throw new AscetReadException("invalid_argument", "create_method", "Component path must not be empty.");
        }

        if (String.IsNullOrWhiteSpace(methodName))
        {
            throw new AscetReadException("invalid_argument", "create_method", "Method name must not be empty.");
        }

        string normalizedDiagramName = String.IsNullOrWhiteSpace(diagramName) ? "Main" : diagramName.Trim();
        bool created = false;
        bool alreadyExisted = false;
        AscetItemRef component = null;

        try
        {
            ExecuteWithBoundSession("create_method", session, delegate(AscetSession currentSession)
            {
                DataBaseItem item = ResolveItemByPath(currentSession, componentPath);
                component = Classifier.ToItemRef(item);
                ValidateMethodKind(component, methodKind);

                IList<MethodHandle> existingHandles = CollectMethodHandles(currentSession, component);
                for (int i = 0; i < existingHandles.Count; i++)
                {
                    MethodHandle existing = existingHandles[i];
                    if (existing == null || existing.Reference == null)
                    {
                        continue;
                    }

                    if (!String.Equals(existing.Reference.Name ?? String.Empty, methodName, StringComparison.Ordinal))
                    {
                        continue;
                    }

                    alreadyExisted = true;
                    if (!returnExisting)
                    {
                        throw new AscetReadException("method_already_exists", "create_method", "Method '" + methodName + "' already exists in component '" + componentPath + "'.");
                    }

                    return true;
                }

                RequireComponentEditableInSession(currentSession, componentPath, "create_method");
                CodeComponent codeComponent = ResolveCodeComponent(currentSession, componentPath);
                object diagram = ResolveOrCreateDiagram(codeComponent, normalizedDiagramName);
                CreateMethodOnDiagram(diagram, methodName, methodKind, componentPath, normalizedDiagramName);
                created = true;

                if (String.Equals(Environment.GetEnvironmentVariable("ASCET_FAIL_AFTER_CREATE_METHOD"), "1", StringComparison.Ordinal))
                {
                    throw new AscetReadException("forced_failure", "create_method", "Forced failure after method creation for rollback verification.");
                }

                return true;
            });

            bool readbackVerified = false;
            if (verifyReadback)
            {
                AscetMethodRef method = ExecuteWithBoundSession("verify_create_method", session, delegate(AscetSession currentSession)
                {
                    DataBaseItem item = ResolveItemByPath(currentSession, componentPath);
                    AscetItemRef currentComponent = Classifier.ToItemRef(item);
                    MethodHandle handle = FindMethodHandle(CollectMethodHandles(currentSession, currentComponent), currentComponent.Path, methodName);
                    return handle.Reference;
                });
                readbackVerified = method != null &&
                    String.Equals(method.Name ?? String.Empty, methodName, StringComparison.Ordinal) &&
                    (method.MethodKind == methodKind || methodKind == AscetMethodKind.Unknown);
                if (!readbackVerified)
                {
                    throw new AscetReadException("readback_mismatch", "create_method", "Readback verification failed for method '" + methodName + "' in component '" + componentPath + "'.");
                }
            }

            return new AscetMethodCreateResult
            {
                ComponentPath = componentPath,
                MethodName = methodName,
                MethodKind = methodKind,
                DiagramName = normalizedDiagramName,
                Created = created,
                AlreadyExisted = alreadyExisted,
                TargetKey = componentPath + "::" + methodName,
                VerifyReadbackRequested = verifyReadback,
                RollbackOnFailureRequested = rollbackOnFailure,
                ReadbackVerified = readbackVerified,
                Summary = BuildSummary(componentPath, methodName, methodKind, normalizedDiagramName, created, alreadyExisted)
            };
        }
        catch
        {
            if (rollbackOnFailure && created)
            {
                try
                {
                    MethodDeleteService deleteService = new MethodDeleteService();
                    deleteService.DeleteMethodInSession(session, componentPath, methodName, false, true);
                }
                catch
                {
                }
            }

            throw;
        }
    }

    private void ValidateMethodKind(AscetItemRef component, AscetMethodKind methodKind)
    {
        if (component == null)
        {
            throw new AscetReadException("invalid_argument", "create_method", "Component must not be null.");
        }

        switch (component.Kind)
        {
            case AscetComponentKind.Class:
                if (methodKind != AscetMethodKind.AbstractMethod)
                {
                    throw new AscetReadException("invalid_argument", "create_method", "Class method creation supports only abstract methods in v1.");
                }
                break;
            case AscetComponentKind.Module:
                if (methodKind != AscetMethodKind.Process)
                {
                    throw new AscetReadException("invalid_argument", "create_method", "Module method creation supports only process methods in v1.");
                }
                break;
            case AscetComponentKind.StateMachine:
                if (methodKind != AscetMethodKind.Action && methodKind != AscetMethodKind.Condition && methodKind != AscetMethodKind.Trigger)
                {
                    throw new AscetReadException("invalid_argument", "create_method", "State machine method creation supports only action, condition, or trigger in v1.");
                }
                break;
            default:
                throw new AscetReadException("unsupported_component_kind", "create_method", "Unsupported component kind for method creation.");
        }
    }

    private object ResolveOrCreateDiagram(CodeComponent codeComponent, string diagramName)
    {
        if (codeComponent == null)
        {
            throw new AscetReadException("invalid_argument", "create_method", "Code component must not be null.");
        }

        AscetDiagram diagram = codeComponent.GetDiagramWithName(diagramName);
        if (diagram != null)
        {
            return diagram;
        }

        MethodInfo addDiagram = codeComponent.GetType().GetMethod("AddDiagram", new[] { typeof(string) });
        if (addDiagram == null)
        {
            throw new AscetReadException("create_diagram_failed", "create_method", "Code component does not expose AddDiagram(string).");
        }

        object created = addDiagram.Invoke(codeComponent, new object[] { diagramName });
        if (created == null)
        {
            throw new AscetReadException("create_diagram_failed", "create_method", "Failed to create diagram '" + diagramName + "'.");
        }

        return created;
    }

    private void CreateMethodOnDiagram(object diagram, string methodName, AscetMethodKind methodKind, string componentPath, string diagramName)
    {
        if (diagram == null)
        {
            throw new AscetReadException("diagram_not_found", "create_method", "Target diagram '" + diagramName + "' was not found.");
        }

        string[] candidateMethods;
        switch (methodKind)
        {
            case AscetMethodKind.Process:
                candidateMethods = new[] { "AddProcess" };
                break;
            case AscetMethodKind.Action:
                candidateMethods = new[] { "AddAction" };
                break;
            case AscetMethodKind.Condition:
                candidateMethods = new[] { "AddCondition" };
                break;
            case AscetMethodKind.Trigger:
                candidateMethods = new[] { "AddTrigger" };
                break;
            default:
                candidateMethods = new[] { "AddMethod" };
                break;
        }

        for (int i = 0; i < candidateMethods.Length; i++)
        {
            MethodInfo method = diagram.GetType().GetMethod(candidateMethods[i], new[] { typeof(string) });
            if (method == null)
            {
                continue;
            }

            object created = method.Invoke(diagram, new object[] { methodName });
            if (created == null)
            {
                throw new AscetReadException("create_method_failed", "create_method", "ToolAPI returned null while creating method '" + methodName + "' in '" + componentPath + "'.");
            }

            return;
        }

        throw new AscetReadException("create_method_failed", "create_method", "Diagram '" + diagramName + "' in '" + componentPath + "' does not support creating '" + methodKind.ToString() + "'.");
    }

    private string BuildSummary(string componentPath, string methodName, AscetMethodKind methodKind, string diagramName, bool created, bool alreadyExisted)
    {
        if (alreadyExisted)
        {
            return "Method '" + methodName + "' already exists in " + componentPath + ".";
        }

        return (created ? "Created " : "Resolved ")
            + methodKind.ToString()
            + " "
            + methodName
            + " in "
            + componentPath
            + " diagram "
            + diagramName
            + ".";
    }
}
