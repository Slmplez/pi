using System;
using System.Collections.Generic;

public interface IStateMachineFlowAnalysisService
{
    AscetStateMachineFlowSummary GetFlowSummary(AscetItemRef stateMachine, int traceDepth);
}

public sealed class StateMachineFlowAnalysisService : IStateMachineFlowAnalysisService
{
    private readonly IStateMachineAnalysisService stateMachineAnalysisService;
    private readonly IReferenceReadService referenceReadService;
    private readonly IReferenceTraceService referenceTraceService;
    private readonly IEsdlAnalysisService esdlAnalysisService;

    public StateMachineFlowAnalysisService()
        : this(new StateMachineAnalysisService(), new ReferenceReadService(), new ReferenceTraceService(), new EsdlAnalysisService())
    {
    }

    public StateMachineFlowAnalysisService(IStateMachineAnalysisService stateMachineAnalysisService, IReferenceReadService referenceReadService, IReferenceTraceService referenceTraceService, IEsdlAnalysisService esdlAnalysisService)
    {
        if (stateMachineAnalysisService == null)
        {
            throw new ArgumentNullException("stateMachineAnalysisService");
        }

        if (referenceReadService == null)
        {
            throw new ArgumentNullException("referenceReadService");
        }

        if (referenceTraceService == null)
        {
            throw new ArgumentNullException("referenceTraceService");
        }

        if (esdlAnalysisService == null)
        {
            throw new ArgumentNullException("esdlAnalysisService");
        }

        this.stateMachineAnalysisService = stateMachineAnalysisService;
        this.referenceReadService = referenceReadService;
        this.referenceTraceService = referenceTraceService;
        this.esdlAnalysisService = esdlAnalysisService;
    }

    public AscetStateMachineFlowSummary GetFlowSummary(AscetItemRef stateMachine, int traceDepth)
    {
        if (stateMachine == null)
        {
            throw new AscetReadException("invalid_argument", "get_flow_summary", "State-machine reference must not be null.");
        }

        AscetStateMachineSemanticSummary semanticSummary = stateMachineAnalysisService.GetSemanticSummary(stateMachine);
        AscetReferenceGraphSummary referenceGraph = referenceReadService.GetReferenceGraph(stateMachine);
        IList<AscetStateFlowRef> stateFlows = BuildStateFlows(semanticSummary == null ? null : semanticSummary.States, referenceGraph == null ? null : referenceGraph.References);
        IList<AscetTransitionFlowRef> transitionFlows = BuildTransitionFlows(semanticSummary == null ? null : semanticSummary.Transitions, referenceGraph == null ? null : referenceGraph.References);
        List<AscetDependencyChainRef> dependencyChains = new List<AscetDependencyChainRef>();

        AddDependencies(dependencyChains, transitionFlows);
        AddDependencies(dependencyChains, stateFlows);

        return new AscetStateMachineFlowSummary
        {
            ComponentPath = semanticSummary == null ? String.Empty : (semanticSummary.ComponentPath ?? String.Empty),
            LanguageKind = ResolveLanguageKind(stateMachine, referenceGraph),
            DiagramName = semanticSummary == null ? String.Empty : (semanticSummary.DiagramName ?? String.Empty),
            StateFlows = stateFlows,
            TransitionFlows = transitionFlows,
            DependencyChains = dependencyChains,
            ReferenceTrace = referenceTraceService.TraceReferences(stateMachine, traceDepth),
            Summary = BuildFlowSummary(transitionFlows, stateFlows, dependencyChains)
        };
    }

    private AscetLanguageKind ResolveLanguageKind(AscetItemRef stateMachine, AscetReferenceGraphSummary referenceGraph)
    {
        if (stateMachine != null && stateMachine.LanguageKind != AscetLanguageKind.Unknown)
        {
            return stateMachine.LanguageKind;
        }

        return referenceGraph == null ? AscetLanguageKind.Unknown : referenceGraph.LanguageKind;
    }

    private IList<AscetStateFlowRef> BuildStateFlows(IList<AscetStateSemanticRef> states, IList<AscetReferenceEdgeRef> references)
    {
        List<AscetStateFlowRef> result = new List<AscetStateFlowRef>();
        if (states == null)
        {
            return result;
        }

        for (int i = 0; i < states.Count; i++)
        {
            AscetStateSemanticRef state = states[i];
            if (state == null)
            {
                continue;
            }

            IList<AscetFlowBindingRef> bindings = BuildBindings(state.Bindings, references);
            result.Add(new AscetStateFlowRef
            {
                StateName = state.Name ?? String.Empty,
                IsStartState = state.IsStartState,
                Bindings = bindings,
                Dependencies = BuildDependencies("State", state.Name, bindings)
            });
        }

        return result;
    }

    private IList<AscetTransitionFlowRef> BuildTransitionFlows(IList<AscetTransitionSemanticRef> transitions, IList<AscetReferenceEdgeRef> references)
    {
        List<AscetTransitionFlowRef> result = new List<AscetTransitionFlowRef>();
        if (transitions == null)
        {
            return result;
        }

        for (int i = 0; i < transitions.Count; i++)
        {
            AscetTransitionSemanticRef transition = transitions[i];
            if (transition == null)
            {
                continue;
            }

            IList<AscetFlowBindingRef> bindings = BuildBindings(transition.Bindings, references);
            List<AscetFlowBindingRef> flowBindings = new List<AscetFlowBindingRef>();
            AddBindingIfPresent(flowBindings, FindBinding(bindings, "Trigger"));
            AddBindingIfPresent(flowBindings, FindBinding(bindings, "Guard"));
            AddBindingIfPresent(flowBindings, FindBinding(bindings, "Action"));

            result.Add(new AscetTransitionFlowRef
            {
                TransitionName = transition.Name ?? String.Empty,
                SourceState = transition.SourceName ?? String.Empty,
                TargetState = transition.TargetName ?? String.Empty,
                Priority = transition.Priority,
                Trigger = FindBinding(bindings, "Trigger"),
                Guard = FindBinding(bindings, "Guard"),
                Action = FindBinding(bindings, "Action"),
                Dependencies = BuildDependencies("Transition", transition.Name, flowBindings)
            });
        }

        return result;
    }

    private void AddBindingIfPresent(IList<AscetFlowBindingRef> bindings, AscetFlowBindingRef binding)
    {
        if (bindings == null || binding == null)
        {
            return;
        }

        bindings.Add(binding);
    }

    private IList<AscetFlowBindingRef> BuildBindings(IList<AscetStateMachineMethodBindingRef> bindings, IList<AscetReferenceEdgeRef> references)
    {
        List<AscetFlowBindingRef> result = new List<AscetFlowBindingRef>();
        if (bindings == null)
        {
            return result;
        }

        IList<string> referenceNames = ExtractReferenceNames(references);
        for (int i = 0; i < bindings.Count; i++)
        {
            AscetStateMachineMethodBindingRef binding = bindings[i];
            if (binding == null)
            {
                continue;
            }

            AscetCodeAnalysisRef codeAnalysis = AnalyzeCode(binding.Code, referenceNames);
            result.Add(new AscetFlowBindingRef
            {
                Role = binding.Role ?? String.Empty,
                SourceType = binding.SourceType ?? String.Empty,
                MethodName = binding.MethodName ?? String.Empty,
                MethodKind = binding.MethodKind,
                Code = binding.Code ?? String.Empty,
                CodeAnalysis = codeAnalysis,
                RelatedReferences = MatchReferences(codeAnalysis, references)
            });
        }

        return result;
    }

    private IList<string> ExtractReferenceNames(IList<AscetReferenceEdgeRef> references)
    {
        List<string> result = new List<string>();
        if (references == null)
        {
            return result;
        }

        for (int i = 0; i < references.Count; i++)
        {
            AscetReferenceEdgeRef edge = references[i];
            if (edge == null || String.IsNullOrWhiteSpace(edge.SourceElementName))
            {
                continue;
            }

            result.Add(edge.SourceElementName);
        }

        return AscetAdvancedAnalysisUtilities.DistinctStrings(result);
    }

    private AscetCodeAnalysisRef AnalyzeCode(string code, IList<string> referenceNames)
    {
        AscetEsdlAnalysisResult analysis = esdlAnalysisService.Analyze(code ?? String.Empty, referenceNames);
        return new AscetCodeAnalysisRef
        {
            ParseSucceeded = analysis != null && analysis.ParseSucceeded,
            Reads = AscetAdvancedAnalysisUtilities.DistinctStrings(analysis == null ? null : analysis.Reads),
            Writes = AscetAdvancedAnalysisUtilities.DistinctStrings(analysis == null ? null : analysis.Writes),
            Calls = AscetAdvancedAnalysisUtilities.DistinctStrings(analysis == null ? null : analysis.Calls),
            ReferencedComponents = AscetAdvancedAnalysisUtilities.DistinctStrings(analysis == null ? null : analysis.ReferencedComponents),
            Diagnostics = AscetAdvancedAnalysisUtilities.DistinctStrings(analysis == null ? null : analysis.Diagnostics)
        };
    }

    private IList<AscetReferenceEdgeRef> MatchReferences(AscetCodeAnalysisRef codeAnalysis, IList<AscetReferenceEdgeRef> references)
    {
        List<AscetReferenceEdgeRef> result = new List<AscetReferenceEdgeRef>();
        if (codeAnalysis == null || codeAnalysis.ReferencedComponents == null || references == null)
        {
            return result;
        }

        Dictionary<string, bool> referencedNames = new Dictionary<string, bool>(StringComparer.Ordinal);
        for (int i = 0; i < codeAnalysis.ReferencedComponents.Count; i++)
        {
            string name = codeAnalysis.ReferencedComponents[i];
            if (!String.IsNullOrWhiteSpace(name))
            {
                referencedNames[name] = true;
            }
        }

        Dictionary<string, bool> added = new Dictionary<string, bool>(StringComparer.Ordinal);
        for (int i = 0; i < references.Count; i++)
        {
            AscetReferenceEdgeRef edge = references[i];
            if (edge == null || String.IsNullOrWhiteSpace(edge.SourceElementName))
            {
                continue;
            }

            if (!referencedNames.ContainsKey(edge.SourceElementName) || added.ContainsKey(edge.SourceElementName))
            {
                continue;
            }

            added[edge.SourceElementName] = true;
            result.Add(edge);
        }

        return result;
    }

    private IList<AscetDependencyChainRef> BuildDependencies(string scope, string ownerName, IList<AscetFlowBindingRef> bindings)
    {
        List<AscetDependencyChainRef> result = new List<AscetDependencyChainRef>();
        if (bindings == null)
        {
            return result;
        }

        for (int i = 0; i < bindings.Count; i++)
        {
            AscetFlowBindingRef binding = bindings[i];
            if (binding == null || binding.RelatedReferences == null)
            {
                continue;
            }

            for (int referenceIndex = 0; referenceIndex < binding.RelatedReferences.Count; referenceIndex++)
            {
                AscetReferenceEdgeRef edge = binding.RelatedReferences[referenceIndex];
                if (edge == null)
                {
                    continue;
                }

                result.Add(new AscetDependencyChainRef
                {
                    Scope = scope ?? String.Empty,
                    OwnerName = ownerName ?? String.Empty,
                    Role = binding.Role ?? String.Empty,
                    BindingName = AscetAdvancedAnalysisUtilities.DescribeBindingName(binding),
                    ReferenceElementName = edge.SourceElementName ?? String.Empty,
                    TargetComponentPath = edge.TargetComponentPath ?? String.Empty
                });
            }
        }

        return result;
    }

    private void AddDependencies(IList<AscetDependencyChainRef> destination, IList<AscetTransitionFlowRef> flows)
    {
        if (destination == null || flows == null)
        {
            return;
        }

        for (int i = 0; i < flows.Count; i++)
        {
            AscetTransitionFlowRef flow = flows[i];
            if (flow == null || flow.Dependencies == null)
            {
                continue;
            }

            for (int dependencyIndex = 0; dependencyIndex < flow.Dependencies.Count; dependencyIndex++)
            {
                destination.Add(flow.Dependencies[dependencyIndex]);
            }
        }
    }

    private void AddDependencies(IList<AscetDependencyChainRef> destination, IList<AscetStateFlowRef> flows)
    {
        if (destination == null || flows == null)
        {
            return;
        }

        for (int i = 0; i < flows.Count; i++)
        {
            AscetStateFlowRef flow = flows[i];
            if (flow == null || flow.Dependencies == null)
            {
                continue;
            }

            for (int dependencyIndex = 0; dependencyIndex < flow.Dependencies.Count; dependencyIndex++)
            {
                destination.Add(flow.Dependencies[dependencyIndex]);
            }
        }
    }

    private AscetFlowBindingRef FindBinding(IList<AscetFlowBindingRef> bindings, string role)
    {
        if (bindings == null || String.IsNullOrWhiteSpace(role))
        {
            return null;
        }

        for (int i = 0; i < bindings.Count; i++)
        {
            AscetFlowBindingRef binding = bindings[i];
            if (binding != null && String.Equals(binding.Role, role, StringComparison.Ordinal))
            {
                return binding;
            }
        }

        return null;
    }

    private string BuildFlowSummary(IList<AscetTransitionFlowRef> transitionFlows, IList<AscetStateFlowRef> stateFlows, IList<AscetDependencyChainRef> dependencyChains)
    {
        AscetDependencyChainRef firstTransitionDependency = FindFirstDependency(transitionFlows);
        if (firstTransitionDependency != null)
        {
            return (firstTransitionDependency.OwnerName ?? String.Empty) + " " + (firstTransitionDependency.Role ?? String.Empty).ToLowerInvariant() + " depends on " + (firstTransitionDependency.ReferenceElementName ?? String.Empty);
        }

        AscetDependencyChainRef firstStateDependency = FindFirstDependency(stateFlows);
        if (firstStateDependency != null)
        {
            return (firstStateDependency.OwnerName ?? String.Empty) + " " + (firstStateDependency.Role ?? String.Empty).ToLowerInvariant() + " depends on " + (firstStateDependency.ReferenceElementName ?? String.Empty);
        }

        return dependencyChains == null || dependencyChains.Count == 0 ? "No dependency chains found." : "Dependency chains present.";
    }

    private AscetDependencyChainRef FindFirstDependency(IList<AscetTransitionFlowRef> flows)
    {
        if (flows == null)
        {
            return null;
        }

        for (int i = 0; i < flows.Count; i++)
        {
            AscetTransitionFlowRef flow = flows[i];
            if (flow != null && flow.Dependencies != null && flow.Dependencies.Count > 0)
            {
                return flow.Dependencies[0];
            }
        }

        return null;
    }

    private AscetDependencyChainRef FindFirstDependency(IList<AscetStateFlowRef> flows)
    {
        if (flows == null)
        {
            return null;
        }

        for (int i = 0; i < flows.Count; i++)
        {
            AscetStateFlowRef flow = flows[i];
            if (flow != null && flow.Dependencies != null && flow.Dependencies.Count > 0)
            {
                return flow.Dependencies[0];
            }
        }

        return null;
    }
}
