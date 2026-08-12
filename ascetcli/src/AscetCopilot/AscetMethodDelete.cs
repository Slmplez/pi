using System;
using System.Collections.Generic;
using System.Reflection;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;
using AscetAction = de.etas.cebra.toolAPI.Ascet.Action;

public sealed class AscetMethodDeleteResult
{
    public string ComponentPath { get; set; }
    public string MethodName { get; set; }
    public AscetMethodKind MethodKind { get; set; }
    public string DiagramName { get; set; }
    public bool Deleted { get; set; }
    public bool AlreadyMissing { get; set; }
    public string TargetKey { get; set; }
    public bool VerifyReadbackRequested { get; set; }
    public bool ReadbackVerified { get; set; }
    public string Summary { get; set; }
}

public interface IMethodDeleteService
{
    AscetMethodDeleteResult DeleteMethod(string componentPath, string methodName, bool verifyReadback, bool ignoreMissing);
}

public sealed class MethodDeleteService : MethodCatalogService, IMethodDeleteService
{
    public AscetMethodDeleteResult DeleteMethod(string componentPath, string methodName, bool verifyReadback, bool ignoreMissing)
    {
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            throw new AscetReadException("invalid_argument", "delete_method", "Component path must not be empty.");
        }

        if (String.IsNullOrWhiteSpace(methodName))
        {
            throw new AscetReadException("invalid_argument", "delete_method", "Method name must not be empty.");
        }

        bool deleted = false;
        bool alreadyMissing = false;
        AscetMethodKind methodKind = AscetMethodKind.Unknown;
        string diagramName = String.Empty;

        ExecuteWithSession("delete_method", delegate(AscetSession session)
        {
            DataBaseItem item = ResolveItemByPath(session, componentPath);
            AscetItemRef component = Classifier.ToItemRef(item);
            MethodHandleWithDiagram found = FindMethod(session, component, methodName);
            if (found == null)
            {
                alreadyMissing = true;
                if (!ignoreMissing)
                {
                    throw new AscetReadException("method_not_found", "delete_method", "Method '" + methodName + "' was not found in component '" + componentPath + "'.");
                }

                return true;
            }

            methodKind = found.Reference == null ? AscetMethodKind.Unknown : found.Reference.MethodKind;
            diagramName = found.DiagramName ?? String.Empty;
            RequireComponentEditableInSession(session, componentPath, "delete_method");
            RemoveMethodFromDiagram(found, componentPath, methodName);
            deleted = true;
            return true;
        });

        bool readbackVerified = !verifyReadback;
        if (verifyReadback)
        {
            try
            {
                GetMethod(componentPath, methodName);
                readbackVerified = false;
            }
            catch (AscetReadException ex)
            {
                if (String.Equals(ex.Code, "method_not_found", StringComparison.Ordinal))
                {
                    readbackVerified = true;
                }
                else
                {
                    throw;
                }
            }

            if (!readbackVerified)
            {
                throw new AscetReadException("readback_mismatch", "delete_method", "Readback verification failed for deleted method '" + methodName + "' in component '" + componentPath + "'.");
            }
        }

        return new AscetMethodDeleteResult
        {
            ComponentPath = componentPath,
            MethodName = methodName,
            MethodKind = methodKind,
            DiagramName = diagramName,
            Deleted = deleted,
            AlreadyMissing = alreadyMissing,
            TargetKey = componentPath + "::" + methodName,
            VerifyReadbackRequested = verifyReadback,
            ReadbackVerified = readbackVerified,
            Summary = BuildSummary(componentPath, methodName, deleted, alreadyMissing)
        };
    }

    private MethodHandleWithDiagram FindMethod(AscetSession session, AscetItemRef component, string methodName)
    {
        if (component == null)
        {
            return null;
        }

        CodeComponent codeComponent = ResolveCodeComponent(session, component);
        AscetDiagram[] diagrams = codeComponent.GetAllDiagrams();
        if (diagrams == null)
        {
            return null;
        }

        for (int i = 0; i < diagrams.Length; i++)
        {
            MethodHandleWithDiagram found = FindMethodInDiagram(component.Path, diagrams[i], methodName);
            if (found != null)
            {
                return found;
            }
        }

        return null;
    }

    private MethodHandleWithDiagram FindMethodInDiagram(string componentPath, AscetDiagram diagram, string methodName)
    {
        if (diagram == null)
        {
            return null;
        }

        if (diagram.IsDiscreteMethodDiagram())
        {
            DiscreteMethodDiagram typed = diagram as DiscreteMethodDiagram;
            return typed == null ? null : MatchDiscrete(componentPath, diagram.GetName(), typed, typed.GetAllMethods(), methodName);
        }

        if (diagram.IsContinuousMethodDiagram())
        {
            ContinuousMethodDiagram typed = diagram as ContinuousMethodDiagram;
            return typed == null ? null : MatchContinuous(componentPath, diagram.GetName(), typed, typed.GetAllMethods(), methodName);
        }

        if (diagram.IsProcessDiagram())
        {
            ProcessDiagram typed = diagram as ProcessDiagram;
            if (typed == null)
            {
                return null;
            }

            MethodHandleWithDiagram methodMatch = MatchDiscrete(componentPath, diagram.GetName(), typed, typed.GetAllMethods(), methodName);
            return methodMatch ?? MatchProcess(componentPath, diagram.GetName(), typed, typed.GetAllProcesses(), methodName);
        }

        if (diagram.IsActionConditionDiagram())
        {
            ActionConditionDiagram typed = diagram as ActionConditionDiagram;
            if (typed == null)
            {
                return null;
            }

            MethodHandleWithDiagram actionMatch = MatchAction(componentPath, diagram.GetName(), typed, typed.GetAllActions(), methodName);
            return actionMatch ?? MatchCondition(componentPath, diagram.GetName(), typed, typed.GetAllConditions(), methodName);
        }

        if (diagram.IsStateMachineDiagram())
        {
            StateMachineDiagram typed = diagram as StateMachineDiagram;
            return typed == null ? null : MatchTrigger(componentPath, diagram.GetName(), typed, typed.GetAllTriggers(), methodName);
        }

        return null;
    }

    private MethodHandleWithDiagram MatchDiscrete(string componentPath, string diagramName, object diagramObject, DiscreteMethod[] methods, string methodName)
    {
        if (methods == null)
        {
            return null;
        }

        for (int i = 0; i < methods.Length; i++)
        {
            DiscreteMethod method = methods[i];
            if (method != null && String.Equals(method.GetName(), methodName, StringComparison.Ordinal))
            {
                return new MethodHandleWithDiagram { DiagramName = diagramName, DiagramObject = diagramObject, MethodObject = method, RemoveMethodName = "RemoveMethod", Reference = new AscetMethodRef { Name = method.GetName(), MethodKind = GetMethodKind(method), OwningComponentPath = componentPath } };
            }
        }

        return null;
    }

    private MethodHandleWithDiagram MatchContinuous(string componentPath, string diagramName, object diagramObject, ContinuousMethod[] methods, string methodName)
    {
        if (methods == null)
        {
            return null;
        }

        for (int i = 0; i < methods.Length; i++)
        {
            ContinuousMethod method = methods[i];
            if (method != null && String.Equals(method.GetName(), methodName, StringComparison.Ordinal))
            {
                return new MethodHandleWithDiagram { DiagramName = diagramName, DiagramObject = diagramObject, MethodObject = method, RemoveMethodName = "RemoveMethod", Reference = new AscetMethodRef { Name = method.GetName(), MethodKind = GetMethodKind(method), OwningComponentPath = componentPath } };
            }
        }

        return null;
    }

    private MethodHandleWithDiagram MatchProcess(string componentPath, string diagramName, object diagramObject, Process[] methods, string methodName)
    {
        if (methods == null)
        {
            return null;
        }

        for (int i = 0; i < methods.Length; i++)
        {
            Process method = methods[i];
            if (method != null && String.Equals(method.GetName(), methodName, StringComparison.Ordinal))
            {
                return new MethodHandleWithDiagram { DiagramName = diagramName, DiagramObject = diagramObject, MethodObject = method, RemoveMethodName = "RemoveProcess", Reference = new AscetMethodRef { Name = method.GetName(), MethodKind = GetMethodKind(method), OwningComponentPath = componentPath } };
            }
        }

        return null;
    }

    private MethodHandleWithDiagram MatchAction(string componentPath, string diagramName, object diagramObject, AscetAction[] methods, string methodName)
    {
        if (methods == null)
        {
            return null;
        }

        for (int i = 0; i < methods.Length; i++)
        {
            AscetAction method = methods[i];
            if (method != null && String.Equals(method.GetName(), methodName, StringComparison.Ordinal))
            {
                return new MethodHandleWithDiagram { DiagramName = diagramName, DiagramObject = diagramObject, MethodObject = method, RemoveMethodName = "RemoveAction", Reference = new AscetMethodRef { Name = method.GetName(), MethodKind = GetMethodKind(method), OwningComponentPath = componentPath } };
            }
        }

        return null;
    }

    private MethodHandleWithDiagram MatchCondition(string componentPath, string diagramName, object diagramObject, Condition[] methods, string methodName)
    {
        if (methods == null)
        {
            return null;
        }

        for (int i = 0; i < methods.Length; i++)
        {
            Condition method = methods[i];
            if (method != null && String.Equals(method.GetName(), methodName, StringComparison.Ordinal))
            {
                return new MethodHandleWithDiagram { DiagramName = diagramName, DiagramObject = diagramObject, MethodObject = method, RemoveMethodName = "RemoveCondition", Reference = new AscetMethodRef { Name = method.GetName(), MethodKind = GetMethodKind(method), OwningComponentPath = componentPath } };
            }
        }

        return null;
    }

    private MethodHandleWithDiagram MatchTrigger(string componentPath, string diagramName, object diagramObject, Trigger[] methods, string methodName)
    {
        if (methods == null)
        {
            return null;
        }

        for (int i = 0; i < methods.Length; i++)
        {
            Trigger method = methods[i];
            if (method != null && String.Equals(method.GetName(), methodName, StringComparison.Ordinal))
            {
                return new MethodHandleWithDiagram { DiagramName = diagramName, DiagramObject = diagramObject, MethodObject = method, RemoveMethodName = "RemoveTrigger", Reference = new AscetMethodRef { Name = method.GetName(), MethodKind = GetMethodKind(method), OwningComponentPath = componentPath } };
            }
        }

        return null;
    }

    private void RemoveMethodFromDiagram(MethodHandleWithDiagram found, string componentPath, string methodName)
    {
        object diagram = found == null ? null : found.DiagramObject;
        if (diagram == null)
        {
            throw new AscetReadException("delete_method_failed", "delete_method", "Failed to resolve owning diagram for method '" + methodName + "'.");
        }

        MethodInfo removeMethod = diagram.GetType().GetMethod(found.RemoveMethodName, new[] { found.MethodObject.GetType() });
        if (removeMethod == null)
        {
            throw new AscetReadException("delete_method_failed", "delete_method", "Diagram does not expose " + found.RemoveMethodName + " for method '" + methodName + "'.");
        }

        object removed = removeMethod.Invoke(diagram, new[] { found.MethodObject });
        if (!(removed is bool) || !((bool)removed))
        {
            throw new AscetReadException("delete_method_failed", "delete_method", "ASCET returned false while deleting method '" + methodName + "' in component '" + componentPath + "'.");
        }
    }

    private string BuildSummary(string componentPath, string methodName, bool deleted, bool alreadyMissing)
    {
        if (alreadyMissing)
        {
            return "Method '" + methodName + "' is already missing in " + componentPath + ".";
        }

        return (deleted ? "Deleted " : "Resolved ") + "method " + methodName + " in " + componentPath + ".";
    }

    private sealed class MethodHandleWithDiagram
    {
        public string DiagramName { get; set; }
        public object DiagramObject { get; set; }
        public object MethodObject { get; set; }
        public string RemoveMethodName { get; set; }
        public AscetMethodRef Reference { get; set; }
    }
}
