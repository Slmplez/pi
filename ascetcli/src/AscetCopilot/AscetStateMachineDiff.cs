using System;
using System.Collections.Generic;

public interface IStateMachineDiffService
{
    AscetStateMachineDiffSummary GetDiff(AscetItemRef left, AscetItemRef right);
}

public sealed class StateMachineDiffService : IStateMachineDiffService
{
    private readonly IStateMachineAnalysisService stateMachineAnalysisService;
    private readonly IImplementationReadService implementationReadService;
    private readonly IReferenceReadService referenceReadService;
    private readonly IEsdlAnalysisService esdlAnalysisService;

    public StateMachineDiffService()
        : this(new StateMachineAnalysisService(), new ImplementationReadService(), new ReferenceReadService(), new EsdlAnalysisService())
    {
    }

    public StateMachineDiffService(IStateMachineAnalysisService stateMachineAnalysisService, IImplementationReadService implementationReadService, IReferenceReadService referenceReadService, IEsdlAnalysisService esdlAnalysisService)
    {
        this.stateMachineAnalysisService = stateMachineAnalysisService;
        this.implementationReadService = implementationReadService;
        this.referenceReadService = referenceReadService;
        this.esdlAnalysisService = esdlAnalysisService;
    }

    public AscetStateMachineDiffSummary GetDiff(AscetItemRef left, AscetItemRef right)
    {
        if (left == null || right == null)
        {
            throw new AscetReadException("invalid_argument", "get_state_machine_diff", "Both left and right component references are required.");
        }

        AscetStateMachineSemanticSummary leftSummary = stateMachineAnalysisService.GetSemanticSummary(left);
        AscetStateMachineSemanticSummary rightSummary = stateMachineAnalysisService.GetSemanticSummary(right);
        AscetImplementationSnapshot leftImplementation = TryReadImplementation(left);
        AscetImplementationSnapshot rightImplementation = TryReadImplementation(right);
        AscetReferenceGraphSummary leftReferences = TryReadReferences(left);
        AscetReferenceGraphSummary rightReferences = TryReadReferences(right);

        IList<AscetNamedDiffRef> stateDiffs = BuildStateDiffs(leftSummary == null ? null : leftSummary.States, rightSummary == null ? null : rightSummary.States);
        IList<AscetTransitionDiffRef> transitionDiffs = BuildTransitionDiffs(leftSummary == null ? null : leftSummary.Transitions, rightSummary == null ? null : rightSummary.Transitions);
        IList<AscetMethodCodeDiffRef> methodDiffs = BuildMethodDiffs(leftSummary == null ? null : leftSummary.Methods, rightSummary == null ? null : rightSummary.Methods);
        IList<AscetImplementationElementDiffRef> implementationDiffs = BuildImplementationDiffs(leftImplementation, rightImplementation);
        IList<AscetNamedDiffRef> referenceDiffs = BuildReferenceDiffs(leftReferences, rightReferences);
        IList<AscetBehaviorImplementationLinkDiffRef> linkedDiffs = BuildLinkedDiffs(transitionDiffs, methodDiffs, implementationDiffs, referenceDiffs);

        return new AscetStateMachineDiffSummary
        {
            LeftComponentPath = left.Path ?? String.Empty,
            RightComponentPath = right.Path ?? String.Empty,
            StateDiffs = stateDiffs,
            TransitionDiffs = transitionDiffs,
            MethodDiffs = methodDiffs,
            ImplementationDiffs = implementationDiffs,
            ReferenceDiffs = referenceDiffs,
            LinkedDiffs = linkedDiffs,
            Summary = BuildDiffSummary(stateDiffs, transitionDiffs, methodDiffs, implementationDiffs)
        };
    }

    private AscetImplementationSnapshot TryReadImplementation(AscetItemRef component)
    {
        try
        {
            return implementationReadService == null ? null : implementationReadService.ReadImplementation(component, AscetImplementationReadMode.Default, String.Empty);
        }
        catch (AscetReadException ex)
        {
            if (String.Equals(ex.Code, "unsupported_component_kind", StringComparison.Ordinal) || String.Equals(ex.Code, "implementation_not_found", StringComparison.Ordinal))
            {
                return null;
            }

            throw;
        }
    }

    private AscetReferenceGraphSummary TryReadReferences(AscetItemRef component)
    {
        try
        {
            return referenceReadService == null ? null : referenceReadService.GetReferenceGraph(component);
        }
        catch (AscetReadException ex)
        {
            if (String.Equals(ex.Code, "unsupported_component_kind", StringComparison.Ordinal))
            {
                return null;
            }

            throw;
        }
    }

    private IList<AscetNamedDiffRef> BuildStateDiffs(IList<AscetStateSemanticRef> leftStates, IList<AscetStateSemanticRef> rightStates)
    {
        Dictionary<string, AscetStateSemanticRef> leftMap = BuildStateMap(leftStates);
        Dictionary<string, AscetStateSemanticRef> rightMap = BuildStateMap(rightStates);
        List<string> keys = AscetAdvancedAnalysisUtilities.MergeKeys(leftMap, rightMap);
        List<AscetNamedDiffRef> result = new List<AscetNamedDiffRef>();

        for (int i = 0; i < keys.Count; i++)
        {
            string key = keys[i];
            bool hasLeft = leftMap.ContainsKey(key);
            bool hasRight = rightMap.ContainsKey(key);
            string leftValue = hasLeft ? BuildStateSignature(leftMap[key]) : String.Empty;
            string rightValue = hasRight ? BuildStateSignature(rightMap[key]) : String.Empty;

            result.Add(new AscetNamedDiffRef
            {
                Name = key,
                ChangeKind = AscetAdvancedAnalysisUtilities.GetChangeKind(hasLeft, hasRight, leftValue, rightValue),
                LeftValue = leftValue,
                RightValue = rightValue
            });
        }

        return result;
    }

    private IList<AscetTransitionDiffRef> BuildTransitionDiffs(IList<AscetTransitionSemanticRef> leftTransitions, IList<AscetTransitionSemanticRef> rightTransitions)
    {
        Dictionary<string, AscetTransitionSemanticRef> leftMap = BuildTransitionMap(leftTransitions);
        Dictionary<string, AscetTransitionSemanticRef> rightMap = BuildTransitionMap(rightTransitions);
        List<string> keys = AscetAdvancedAnalysisUtilities.MergeKeys(leftMap, rightMap);
        List<AscetTransitionDiffRef> result = new List<AscetTransitionDiffRef>();

        for (int i = 0; i < keys.Count; i++)
        {
            string key = keys[i];
            AscetTransitionSemanticRef leftTransition = leftMap.ContainsKey(key) ? leftMap[key] : null;
            AscetTransitionSemanticRef rightTransition = rightMap.ContainsKey(key) ? rightMap[key] : null;
            bool hasLeft = leftTransition != null;
            bool hasRight = rightTransition != null;
            string leftTrigger = DescribeTriggerBinding(leftTransition);
            string rightTrigger = DescribeTriggerBinding(rightTransition);
            string leftGuard = DescribeCodeBinding(leftTransition, "Guard");
            string rightGuard = DescribeCodeBinding(rightTransition, "Guard");
            string leftAction = DescribeCodeBinding(leftTransition, "Action");
            string rightAction = DescribeCodeBinding(rightTransition, "Action");
            string leftSignature = leftTrigger + "|" + leftGuard + "|" + leftAction;
            string rightSignature = rightTrigger + "|" + rightGuard + "|" + rightAction;

            result.Add(new AscetTransitionDiffRef
            {
                Key = hasLeft ? BuildTransitionLabel(leftTransition) : BuildTransitionLabel(rightTransition),
                ChangeKind = AscetAdvancedAnalysisUtilities.GetChangeKind(hasLeft, hasRight, leftSignature, rightSignature),
                LeftTrigger = leftTrigger,
                RightTrigger = rightTrigger,
                LeftGuard = leftGuard,
                RightGuard = rightGuard,
                LeftAction = leftAction,
                RightAction = rightAction
            });
        }

        return result;
    }

    private IList<AscetMethodCodeDiffRef> BuildMethodDiffs(IList<AscetMethodCode> leftMethods, IList<AscetMethodCode> rightMethods)
    {
        Dictionary<string, AscetMethodCode> leftMap = BuildMethodMap(leftMethods);
        Dictionary<string, AscetMethodCode> rightMap = BuildMethodMap(rightMethods);
        List<string> keys = AscetAdvancedAnalysisUtilities.MergeKeys(leftMap, rightMap);
        List<AscetMethodCodeDiffRef> result = new List<AscetMethodCodeDiffRef>();

        for (int i = 0; i < keys.Count; i++)
        {
            string key = keys[i];
            AscetMethodCode leftMethod = leftMap.ContainsKey(key) ? leftMap[key] : null;
            AscetMethodCode rightMethod = rightMap.ContainsKey(key) ? rightMap[key] : null;
            bool hasLeft = leftMethod != null;
            bool hasRight = rightMethod != null;
            string leftCode = hasLeft ? (leftMethod.Code ?? String.Empty) : String.Empty;
            string rightCode = hasRight ? (rightMethod.Code ?? String.Empty) : String.Empty;

            result.Add(new AscetMethodCodeDiffRef
            {
                Name = hasLeft ? (leftMethod.MethodName ?? String.Empty) : (rightMethod == null ? String.Empty : (rightMethod.MethodName ?? String.Empty)),
                MethodKind = hasLeft ? leftMethod.MethodKind : (rightMethod == null ? AscetMethodKind.Unknown : rightMethod.MethodKind),
                ChangeKind = AscetAdvancedAnalysisUtilities.GetChangeKind(hasLeft, hasRight, leftCode, rightCode),
                LeftCode = leftCode,
                RightCode = rightCode
            });
        }

        return result;
    }

    private IList<AscetImplementationElementDiffRef> BuildImplementationDiffs(AscetImplementationSnapshot leftImplementation, AscetImplementationSnapshot rightImplementation)
    {
        Dictionary<string, string> leftMap = new Dictionary<string, string>(StringComparer.Ordinal);
        Dictionary<string, string> rightMap = new Dictionary<string, string>(StringComparer.Ordinal);
        FlattenImplementation(leftMap, String.Empty, leftImplementation == null ? null : leftImplementation.Elements);
        FlattenImplementation(rightMap, String.Empty, rightImplementation == null ? null : rightImplementation.Elements);

        List<string> keys = AscetAdvancedAnalysisUtilities.MergeKeys(leftMap, rightMap);
        List<AscetImplementationElementDiffRef> result = new List<AscetImplementationElementDiffRef>();

        for (int i = 0; i < keys.Count; i++)
        {
            string key = keys[i];
            bool hasLeft = leftMap.ContainsKey(key);
            bool hasRight = rightMap.ContainsKey(key);
            result.Add(new AscetImplementationElementDiffRef
            {
                ElementPath = key,
                ChangeKind = AscetAdvancedAnalysisUtilities.GetChangeKind(hasLeft, hasRight, hasLeft ? leftMap[key] : String.Empty, hasRight ? rightMap[key] : String.Empty),
                LeftSignature = hasLeft ? leftMap[key] : String.Empty,
                RightSignature = hasRight ? rightMap[key] : String.Empty
            });
        }

        return result;
    }

    private IList<AscetNamedDiffRef> BuildReferenceDiffs(AscetReferenceGraphSummary leftReferences, AscetReferenceGraphSummary rightReferences)
    {
        Dictionary<string, string> leftMap = BuildReferenceMap(leftReferences == null ? null : leftReferences.References);
        Dictionary<string, string> rightMap = BuildReferenceMap(rightReferences == null ? null : rightReferences.References);
        List<string> keys = AscetAdvancedAnalysisUtilities.MergeKeys(leftMap, rightMap);
        List<AscetNamedDiffRef> result = new List<AscetNamedDiffRef>();

        for (int i = 0; i < keys.Count; i++)
        {
            string key = keys[i];
            bool hasLeft = leftMap.ContainsKey(key);
            bool hasRight = rightMap.ContainsKey(key);
            string leftValue = hasLeft ? leftMap[key] : String.Empty;
            string rightValue = hasRight ? rightMap[key] : String.Empty;
            result.Add(new AscetNamedDiffRef
            {
                Name = key,
                ChangeKind = AscetAdvancedAnalysisUtilities.GetChangeKind(hasLeft, hasRight, leftValue, rightValue),
                LeftValue = leftValue,
                RightValue = rightValue
            });
        }

        return result;
    }

    private IList<AscetBehaviorImplementationLinkDiffRef> BuildLinkedDiffs(IList<AscetTransitionDiffRef> transitionDiffs, IList<AscetMethodCodeDiffRef> methodDiffs, IList<AscetImplementationElementDiffRef> implementationDiffs, IList<AscetNamedDiffRef> referenceDiffs)
    {
        Dictionary<string, List<string>> behaviorLabelsByReference = new Dictionary<string, List<string>>(StringComparer.Ordinal);
        IList<string> referenceNames = ExtractReferenceNames(referenceDiffs);

        AddMethodBehaviorLabels(behaviorLabelsByReference, methodDiffs, referenceNames);
        AddTransitionBehaviorLabels(behaviorLabelsByReference, transitionDiffs, referenceNames);

        List<AscetBehaviorImplementationLinkDiffRef> result = new List<AscetBehaviorImplementationLinkDiffRef>();
        if (implementationDiffs == null)
        {
            return result;
        }

        for (int i = 0; i < implementationDiffs.Count; i++)
        {
            AscetImplementationElementDiffRef implementationDiff = implementationDiffs[i];
            if (implementationDiff == null || implementationDiff.ChangeKind == AscetDiffChangeKind.Unchanged)
            {
                continue;
            }

            string root = AscetAdvancedAnalysisUtilities.FirstPathSegment(implementationDiff.ElementPath);
            if (String.IsNullOrWhiteSpace(root) || !behaviorLabelsByReference.ContainsKey(root))
            {
                continue;
            }

            List<string> labels = AscetAdvancedAnalysisUtilities.DistinctStrings(behaviorLabelsByReference[root]);
            if (labels.Count == 0)
            {
                continue;
            }

            result.Add(new AscetBehaviorImplementationLinkDiffRef
            {
                ElementPath = implementationDiff.ElementPath ?? String.Empty,
                RelatedBehavior = String.Join(", ", labels.ToArray()),
                Note = "Changed behavior references " + root + " while " + (implementationDiff.ElementPath ?? String.Empty) + " implementation also changed."
            });
        }

        return result;
    }

    private IList<string> ExtractReferenceNames(IList<AscetNamedDiffRef> referenceDiffs)
    {
        List<string> result = new List<string>();
        if (referenceDiffs == null)
        {
            return result;
        }

        for (int i = 0; i < referenceDiffs.Count; i++)
        {
            AscetNamedDiffRef diff = referenceDiffs[i];
            if (diff == null || String.IsNullOrWhiteSpace(diff.Name))
            {
                continue;
            }

            if (String.IsNullOrWhiteSpace(diff.LeftValue) && String.IsNullOrWhiteSpace(diff.RightValue))
            {
                continue;
            }

            result.Add(diff.Name);
        }

        return AscetAdvancedAnalysisUtilities.DistinctStrings(result);
    }

    private void AddMethodBehaviorLabels(IDictionary<string, List<string>> behaviorLabelsByReference, IList<AscetMethodCodeDiffRef> methodDiffs, IList<string> referenceNames)
    {
        if (behaviorLabelsByReference == null || methodDiffs == null)
        {
            return;
        }

        for (int i = 0; i < methodDiffs.Count; i++)
        {
            AscetMethodCodeDiffRef diff = methodDiffs[i];
            if (diff == null || diff.ChangeKind == AscetDiffChangeKind.Unchanged)
            {
                continue;
            }

            IList<string> referencedComponents = AnalyzeReferencedComponents(diff.LeftCode, diff.RightCode, referenceNames);
            AddBehaviorLabels(behaviorLabelsByReference, referencedComponents, diff.Name);
        }
    }

    private void AddTransitionBehaviorLabels(IDictionary<string, List<string>> behaviorLabelsByReference, IList<AscetTransitionDiffRef> transitionDiffs, IList<string> referenceNames)
    {
        if (behaviorLabelsByReference == null || transitionDiffs == null)
        {
            return;
        }

        for (int i = 0; i < transitionDiffs.Count; i++)
        {
            AscetTransitionDiffRef diff = transitionDiffs[i];
            if (diff == null || diff.ChangeKind == AscetDiffChangeKind.Unchanged)
            {
                continue;
            }

            List<string> referencedComponents = new List<string>();
            AddReferencedComponents(referencedComponents, AnalyzeReferencedComponents(diff.LeftTrigger, diff.RightTrigger, referenceNames));
            AddReferencedComponents(referencedComponents, AnalyzeReferencedComponents(diff.LeftGuard, diff.RightGuard, referenceNames));
            AddReferencedComponents(referencedComponents, AnalyzeReferencedComponents(diff.LeftAction, diff.RightAction, referenceNames));
            AddBehaviorLabels(behaviorLabelsByReference, referencedComponents, diff.Key);
        }
    }

    private IList<string> AnalyzeReferencedComponents(string leftCode, string rightCode, IList<string> referenceNames)
    {
        List<string> result = new List<string>();
        AddReferencedComponents(result, AnalyzeCode(leftCode, referenceNames));
        AddReferencedComponents(result, AnalyzeCode(rightCode, referenceNames));
        return AscetAdvancedAnalysisUtilities.DistinctStrings(result);
    }

    private IList<string> AnalyzeCode(string code, IList<string> referenceNames)
    {
        if (String.IsNullOrWhiteSpace(code) || esdlAnalysisService == null)
        {
            return new List<string>();
        }

        AscetEsdlAnalysisResult analysis = esdlAnalysisService.Analyze(code, referenceNames);
        return AscetAdvancedAnalysisUtilities.DistinctStrings(analysis == null ? null : analysis.ReferencedComponents);
    }

    private void AddReferencedComponents(IList<string> destination, IList<string> values)
    {
        if (destination == null || values == null)
        {
            return;
        }

        for (int i = 0; i < values.Count; i++)
        {
            string value = values[i];
            if (String.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            destination.Add(value);
        }
    }

    private void AddBehaviorLabels(IDictionary<string, List<string>> behaviorLabelsByReference, IList<string> referencedComponents, string label)
    {
        if (behaviorLabelsByReference == null || referencedComponents == null || String.IsNullOrWhiteSpace(label))
        {
            return;
        }

        for (int i = 0; i < referencedComponents.Count; i++)
        {
            string reference = referencedComponents[i];
            if (String.IsNullOrWhiteSpace(reference))
            {
                continue;
            }

            if (!behaviorLabelsByReference.ContainsKey(reference))
            {
                behaviorLabelsByReference[reference] = new List<string>();
            }

            behaviorLabelsByReference[reference].Add(label);
        }
    }

    private Dictionary<string, AscetStateSemanticRef> BuildStateMap(IList<AscetStateSemanticRef> states)
    {
        Dictionary<string, AscetStateSemanticRef> result = new Dictionary<string, AscetStateSemanticRef>(StringComparer.Ordinal);
        if (states == null)
        {
            return result;
        }

        for (int i = 0; i < states.Count; i++)
        {
            AscetStateSemanticRef state = states[i];
            if (state == null || String.IsNullOrWhiteSpace(state.Name))
            {
                continue;
            }

            result[state.Name] = state;
        }

        return result;
    }

    private string BuildStateSignature(AscetStateSemanticRef state)
    {
        if (state == null)
        {
            return String.Empty;
        }

        return state.Kind.ToString() + "|" + state.IsStartState.ToString() + "|" + AscetAdvancedAnalysisUtilities.BuildStateBindingSignature(state.Bindings);
    }

    private Dictionary<string, AscetTransitionSemanticRef> BuildTransitionMap(IList<AscetTransitionSemanticRef> transitions)
    {
        Dictionary<string, AscetTransitionSemanticRef> result = new Dictionary<string, AscetTransitionSemanticRef>(StringComparer.Ordinal);
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

            result[BuildTransitionKey(transition)] = transition;
        }

        return result;
    }

    private string BuildTransitionKey(AscetTransitionSemanticRef transition)
    {
        if (transition == null)
        {
            return String.Empty;
        }

        return (transition.Name ?? String.Empty) + "|" + (transition.SourceName ?? String.Empty) + "|" + (transition.TargetName ?? String.Empty);
    }

    private string BuildTransitionLabel(AscetTransitionSemanticRef transition)
    {
        if (transition == null)
        {
            return String.Empty;
        }

        if (!String.IsNullOrWhiteSpace(transition.Name))
        {
            return transition.Name;
        }

        return (transition.SourceName ?? String.Empty) + "->" + (transition.TargetName ?? String.Empty);
    }

    private string DescribeTriggerBinding(AscetTransitionSemanticRef transition)
    {
        AscetStateMachineMethodBindingRef binding = FindBinding(transition == null ? null : transition.Bindings, "Trigger");
        if (binding == null)
        {
            return String.Empty;
        }

        if (!String.IsNullOrWhiteSpace(binding.MethodName))
        {
            return binding.MethodName;
        }

        return binding.Code ?? String.Empty;
    }

    private string DescribeCodeBinding(AscetTransitionSemanticRef transition, string role)
    {
        AscetStateMachineMethodBindingRef binding = FindBinding(transition == null ? null : transition.Bindings, role);
        return binding == null ? String.Empty : (binding.Code ?? String.Empty);
    }

    private AscetStateMachineMethodBindingRef FindBinding(IList<AscetStateMachineMethodBindingRef> bindings, string role)
    {
        if (bindings == null)
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

    private Dictionary<string, AscetMethodCode> BuildMethodMap(IList<AscetMethodCode> methods)
    {
        Dictionary<string, AscetMethodCode> result = new Dictionary<string, AscetMethodCode>(StringComparer.Ordinal);
        if (methods == null)
        {
            return result;
        }

        for (int i = 0; i < methods.Count; i++)
        {
            AscetMethodCode method = methods[i];
            if (method == null)
            {
                continue;
            }

            string key = AscetReadDomainUtilities.BuildMethodKey(method.MethodName ?? String.Empty, method.MethodKind, method.ComponentPath ?? String.Empty);
            result[key] = method;
        }

        return result;
    }

    private void FlattenImplementation(IDictionary<string, string> destination, string prefix, IList<AscetElementImplementationRef> elements)
    {
        if (destination == null || elements == null)
        {
            return;
        }

        for (int i = 0; i < elements.Count; i++)
        {
            AscetElementImplementationRef element = elements[i];
            if (element == null || String.IsNullOrWhiteSpace(element.ElementName))
            {
                continue;
            }

            string path = String.IsNullOrWhiteSpace(prefix) ? element.ElementName : prefix + "/" + element.ElementName;
            destination[path] = AscetAdvancedAnalysisUtilities.BuildImplementationSignature(element);
            FlattenImplementation(destination, path, element.ChildElements);
        }
    }

    private Dictionary<string, string> BuildReferenceMap(IList<AscetReferenceEdgeRef> references)
    {
        Dictionary<string, string> result = new Dictionary<string, string>(StringComparer.Ordinal);
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

            result[edge.SourceElementName] = edge.TargetComponentPath ?? String.Empty;
        }

        return result;
    }

    private string BuildDiffSummary(IList<AscetNamedDiffRef> stateDiffs, IList<AscetTransitionDiffRef> transitionDiffs, IList<AscetMethodCodeDiffRef> methodDiffs, IList<AscetImplementationElementDiffRef> implementationDiffs)
    {
        return AscetAdvancedAnalysisUtilities.BuildDiffCategorySummary(stateDiffs, "state")
            + ", "
            + AscetAdvancedAnalysisUtilities.BuildDiffCategorySummary(transitionDiffs, "transition")
            + ", "
            + AscetAdvancedAnalysisUtilities.BuildDiffCategorySummary(methodDiffs, "method")
            + ", "
            + AscetAdvancedAnalysisUtilities.BuildDiffCategorySummary(implementationDiffs, "implementation element");
    }
}
