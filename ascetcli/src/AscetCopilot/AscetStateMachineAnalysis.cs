using System;
using System.Collections.Generic;
using System.Reflection;
using System.Text;
using de.etas.cebra.toolAPI.Ascet;

public sealed class AscetStateMachineMethodBindingRef
{
    public string Role { get; set; }
    public string SourceType { get; set; }
    public string MethodName { get; set; }
    public AscetMethodKind MethodKind { get; set; }
    public string Code { get; set; }
}

public sealed class AscetStateSemanticRef
{
    public string Name { get; set; }
    public AscetStateKind Kind { get; set; }
    public bool IsStartState { get; set; }
    public IList<AscetStateMachineMethodBindingRef> Bindings { get; set; }
}

public sealed class AscetTransitionSemanticRef
{
    public string Name { get; set; }
    public string SourceName { get; set; }
    public string TargetName { get; set; }
    public int Priority { get; set; }
    public IList<AscetStateMachineMethodBindingRef> Bindings { get; set; }
}

public sealed class AscetStateMachineSemanticSummary
{
    public string ComponentPath { get; set; }
    public string DiagramName { get; set; }
    public IList<AscetStateSemanticRef> States { get; set; }
    public IList<AscetTransitionSemanticRef> Transitions { get; set; }
    public IList<AscetMethodCode> Methods { get; set; }
    public string SemanticSummary { get; set; }
}

public interface IStateMachineAnalysisService
{
    AscetStateMachineSemanticSummary GetSemanticSummary(AscetItemRef stateMachine);
}

public sealed class StateMachineAnalysisService : MethodCatalogService, IStateMachineAnalysisService
{
    public AscetStateMachineSemanticSummary GetSemanticSummary(AscetItemRef stateMachine)
    {
        return ExecuteWithSession("get_state_machine_semantic_summary", delegate(AscetSession session)
        {
            if (stateMachine == null)
            {
                throw new AscetReadException("invalid_argument", "get_state_machine_semantic_summary", "State machine reference must not be null.");
            }

            StateMachineDiagram diagram = ResolveStateMachineDiagram(session, stateMachine);
            Dictionary<string, AscetMethodCode> methodCatalog = new Dictionary<string, AscetMethodCode>(StringComparer.Ordinal);
            AddDiagramTriggers(stateMachine, diagram, methodCatalog);

            List<AscetStateSemanticRef> states = BuildStateSemanticRefs(stateMachine, diagram, methodCatalog);
            List<AscetTransitionSemanticRef> transitions = BuildTransitionSemanticRefs(stateMachine, diagram, methodCatalog);
            List<AscetMethodCode> methods = new List<AscetMethodCode>(methodCatalog.Values);

            return new AscetStateMachineSemanticSummary
            {
                ComponentPath = stateMachine.Path,
                DiagramName = diagram.GetName(),
                States = states,
                Transitions = transitions,
                Methods = methods,
                SemanticSummary = BuildSemanticSummary(states, transitions)
            };
        });
    }

    private void AddDiagramTriggers(AscetItemRef component, StateMachineDiagram diagram, IDictionary<string, AscetMethodCode> methodCatalog)
    {
        if (diagram == null || methodCatalog == null)
        {
            return;
        }

        Trigger[] triggers = diagram.GetAllTriggers();
        if (triggers == null)
        {
            return;
        }

        for (int i = 0; i < triggers.Length; i++)
        {
            AddMethodCode(component, triggers[i], methodCatalog);
        }
    }

    private List<AscetStateSemanticRef> BuildStateSemanticRefs(AscetItemRef component, StateMachineDiagram diagram, IDictionary<string, AscetMethodCode> methodCatalog)
    {
        List<AscetStateSemanticRef> result = new List<AscetStateSemanticRef>();
        State[] states = diagram == null ? null : diagram.GetAllStates();
        if (states == null)
        {
            return result;
        }

        for (int i = 0; i < states.Length; i++)
        {
            State state = states[i];
            if (state == null)
            {
                continue;
            }

            List<AscetStateMachineMethodBindingRef> bindings = new List<AscetStateMachineMethodBindingRef>();
            AddStateBinding(component, state, "EntryAction", state.IsEntryActionDefined(), state.IsEntryActionESDL(), delegate { return ToAbstractMethod(state.GetEntryAction()); }, delegate { return state.GetEntryActionESDL(); }, bindings, methodCatalog, AscetMethodKind.Action);
            AddStateBinding(component, state, "ExitAction", state.IsExitActionDefined(), state.IsExitActionESDL(), delegate { return ToAbstractMethod(state.GetExitAction()); }, delegate { return state.GetExitActionESDL(); }, bindings, methodCatalog, AscetMethodKind.Action);
            AddStateBinding(component, state, "StaticAction", state.IsStaticActionDefined(), state.IsStaticActionESDL(), delegate { return ToAbstractMethod(state.GetStaticAction()); }, delegate { return state.GetStaticActionESDL(); }, bindings, methodCatalog, AscetMethodKind.Action);

            result.Add(new AscetStateSemanticRef
            {
                Name = state.GetName(),
                Kind = GetStateKind(state),
                IsStartState = state.IsStartState(),
                Bindings = bindings
            });
        }

        return result;
    }

    private List<AscetTransitionSemanticRef> BuildTransitionSemanticRefs(AscetItemRef component, StateMachineDiagram diagram, IDictionary<string, AscetMethodCode> methodCatalog)
    {
        List<AscetTransitionSemanticRef> result = new List<AscetTransitionSemanticRef>();
        Transition[] transitions = diagram == null ? null : diagram.GetAllTransitions();
        if (transitions == null)
        {
            return result;
        }

        for (int i = 0; i < transitions.Length; i++)
        {
            Transition transition = transitions[i];
            if (transition == null)
            {
                continue;
            }

            List<AscetStateMachineMethodBindingRef> bindings = new List<AscetStateMachineMethodBindingRef>();
            AddTransitionTriggerBinding(component, transition, bindings, methodCatalog);
            AddTransitionBinding(component, transition, "Guard", transition.IsConditionDefined(), transition.IsConditionESDL(), delegate { return ToAbstractMethod(transition.GetCondition()); }, delegate { return transition.GetConditionESDL(); }, bindings, methodCatalog, AscetMethodKind.Condition);
            AddTransitionBinding(component, transition, "Action", transition.IsActionDefined(), transition.IsActionESDL(), delegate { return ToAbstractMethod(transition.GetAction()); }, delegate { return transition.GetActionESDL(); }, bindings, methodCatalog, AscetMethodKind.Action);

            AscetTransitionRef transitionRef = BuildTransitionRef(transition);
            result.Add(new AscetTransitionSemanticRef
            {
                Name = transitionRef == null ? String.Empty : transitionRef.Name,
                SourceName = transitionRef == null ? String.Empty : transitionRef.SourceName,
                TargetName = transitionRef == null ? String.Empty : transitionRef.TargetName,
                Priority = transition.GetPriority(),
                Bindings = bindings
            });
        }

        return result;
    }

    private void AddStateBinding(
        AscetItemRef component,
        State state,
        string role,
        bool isDefined,
        bool isInlineEsdl,
        Func<AbstractMethod> methodFactory,
        Func<string> inlineCodeFactory,
        IList<AscetStateMachineMethodBindingRef> bindings,
        IDictionary<string, AscetMethodCode> methodCatalog,
        AscetMethodKind inlineKind)
    {
        if (!isDefined || bindings == null)
        {
            return;
        }

        if (isInlineEsdl)
        {
            bindings.Add(BuildInlineBinding(role, inlineKind, inlineCodeFactory == null ? String.Empty : (inlineCodeFactory() ?? String.Empty)));
            return;
        }

        AbstractMethod method = methodFactory == null ? null : methodFactory();
        AscetStateMachineMethodBindingRef binding = BuildMethodBinding(component, role, method, methodCatalog);
        if (binding != null)
        {
            bindings.Add(binding);
        }
    }

    private void AddTransitionBinding(
        AscetItemRef component,
        Transition transition,
        string role,
        bool isDefined,
        bool isInlineEsdl,
        Func<AbstractMethod> methodFactory,
        Func<string> inlineCodeFactory,
        IList<AscetStateMachineMethodBindingRef> bindings,
        IDictionary<string, AscetMethodCode> methodCatalog,
        AscetMethodKind inlineKind)
    {
        if (!isDefined || bindings == null)
        {
            return;
        }

        if (isInlineEsdl)
        {
            bindings.Add(BuildInlineBinding(role, inlineKind, inlineCodeFactory == null ? String.Empty : (inlineCodeFactory() ?? String.Empty)));
            return;
        }

        AbstractMethod method = methodFactory == null ? null : methodFactory();
        AscetStateMachineMethodBindingRef binding = BuildMethodBinding(component, role, method, methodCatalog);
        if (binding != null)
        {
            bindings.Add(binding);
        }
    }

    private void AddTransitionTriggerBinding(
        AscetItemRef component,
        Transition transition,
        IList<AscetStateMachineMethodBindingRef> bindings,
        IDictionary<string, AscetMethodCode> methodCatalog)
    {
        if (transition == null || bindings == null)
        {
            return;
        }

        AbstractMethod trigger = TryGetTransitionTrigger(transition);

        AscetStateMachineMethodBindingRef binding = BuildMethodBinding(component, "Trigger", trigger, methodCatalog);
        if (binding != null)
        {
            bindings.Add(binding);
        }
    }

    private AbstractMethod TryGetTransitionTrigger(Transition transition)
    {
        object value = InvokeOptional(transition, "GetTrigger");
        return ToAbstractMethod(value);
    }

    private object InvokeOptional(object target, string methodName)
    {
        if (target == null || String.IsNullOrWhiteSpace(methodName))
        {
            return null;
        }

        try
        {
            MethodInfo method = target.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            if (method == null)
            {
                return null;
            }

            return method.Invoke(target, null);
        }
        catch
        {
            return null;
        }
    }

    private AscetStateMachineMethodBindingRef BuildMethodBinding(
        AscetItemRef component,
        string role,
        AbstractMethod method,
        IDictionary<string, AscetMethodCode> methodCatalog)
    {
        if (component == null || method == null)
        {
            return null;
        }

        AscetMethodRef methodRef = new AscetMethodRef
        {
            Name = method.GetName(),
            MethodKind = GetMethodKind(method),
            OwningComponentPath = component.Path
        };

        MethodHandle handle = new MethodHandle
        {
            Reference = methodRef,
            Method = method
        };

        AscetMethodCode code = BuildMethodCode(component, handle);
        string key = AscetReadDomainUtilities.BuildMethodKey(methodRef.Name, methodRef.MethodKind, component.Path);
        if (methodCatalog != null && !methodCatalog.ContainsKey(key))
        {
            methodCatalog[key] = code;
        }

        return new AscetStateMachineMethodBindingRef
        {
            Role = role,
            SourceType = "Method",
            MethodName = methodRef.Name,
            MethodKind = methodRef.MethodKind,
            Code = code.Code ?? String.Empty
        };
    }

    private void AddMethodCode(AscetItemRef component, AbstractMethod method, IDictionary<string, AscetMethodCode> methodCatalog)
    {
        if (component == null || method == null || methodCatalog == null)
        {
            return;
        }

        AscetMethodRef methodRef = new AscetMethodRef
        {
            Name = method.GetName(),
            MethodKind = GetMethodKind(method),
            OwningComponentPath = component.Path
        };

        string key = AscetReadDomainUtilities.BuildMethodKey(methodRef.Name, methodRef.MethodKind, component.Path);
        if (methodCatalog.ContainsKey(key))
        {
            return;
        }

        MethodHandle handle = new MethodHandle
        {
            Reference = methodRef,
            Method = method
        };

        methodCatalog[key] = BuildMethodCode(component, handle);
    }

    private AscetStateMachineMethodBindingRef BuildInlineBinding(string role, AscetMethodKind kind, string code)
    {
        return new AscetStateMachineMethodBindingRef
        {
            Role = role,
            SourceType = "InlineESDL",
            MethodName = String.Empty,
            MethodKind = kind,
            Code = code ?? String.Empty
        };
    }

    private AbstractMethod ToAbstractMethod(object value)
    {
        return value as AbstractMethod;
    }

    private string BuildSemanticSummary(IList<AscetStateSemanticRef> states, IList<AscetTransitionSemanticRef> transitions)
    {
        StringBuilder builder = new StringBuilder();
        List<string> startStates = new List<string>();

        if (states != null)
        {
            for (int i = 0; i < states.Count; i++)
            {
                AscetStateSemanticRef state = states[i];
                if (state != null && state.IsStartState && !String.IsNullOrWhiteSpace(state.Name))
                {
                    startStates.Add(state.Name);
                }
            }
        }

        builder.Append("Start state: ");
        builder.Append(startStates.Count == 0 ? "<none>" : String.Join(", ", startStates.ToArray()));

        if (transitions != null)
        {
            for (int i = 0; i < transitions.Count; i++)
            {
                AscetTransitionSemanticRef transition = transitions[i];
                if (transition == null)
                {
                    continue;
                }

                builder.AppendLine();
                builder.Append(transition.Name ?? String.Empty)
                    .Append(" trigger=")
                    .Append(DescribeBinding(FindBinding(transition.Bindings, "Trigger")))
                    .Append(" guard=")
                    .Append(DescribeBinding(FindBinding(transition.Bindings, "Guard")))
                    .Append(" action=")
                    .Append(DescribeBinding(FindBinding(transition.Bindings, "Action")));
            }
        }

        return builder.ToString();
    }

    private AscetStateMachineMethodBindingRef FindBinding(IList<AscetStateMachineMethodBindingRef> bindings, string role)
    {
        if (bindings == null || String.IsNullOrWhiteSpace(role))
        {
            return null;
        }

        for (int i = 0; i < bindings.Count; i++)
        {
            AscetStateMachineMethodBindingRef binding = bindings[i];
            if (binding != null && String.Equals(binding.Role, role, StringComparison.Ordinal))
            {
                return binding;
            }
        }

        return null;
    }

    private string DescribeBinding(AscetStateMachineMethodBindingRef binding)
    {
        if (binding == null)
        {
            return "<none>";
        }

        if (String.Equals(binding.SourceType, "InlineESDL", StringComparison.Ordinal))
        {
            return "inline-esdl";
        }

        if (!String.IsNullOrWhiteSpace(binding.MethodName))
        {
            return binding.MethodName;
        }

        return "<unnamed>";
    }
}
