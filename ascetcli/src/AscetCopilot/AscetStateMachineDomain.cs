using System;
using System.Collections.Generic;

public enum AscetStateMachinePrimaryAnalysisKind
{
    Unknown = 0,
    StateMachineFlow = 1
}

public sealed class AscetStateMachineRef
{
    public string Name { get; set; }
    public string Path { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
}

public sealed class AscetStateMachineCapabilities
{
    public AscetStateMachinePrimaryAnalysisKind PrimaryAnalysis { get; set; }
    public bool SupportsMethodCode { get; set; }
    public bool SupportsSemanticSummary { get; set; }
    public bool SupportsFlowSummary { get; set; }
    public bool SupportsImplementation { get; set; }
    public bool SupportsReferenceGraph { get; set; }
    public bool SupportsMethodWrite { get; set; }
    public bool SupportsBehaviorWrite { get; set; }
    public bool SupportsStartStateWrite { get; set; }
}

public sealed class AscetStateMachineSummary
{
    public AscetStateMachineRef StateMachineRef { get; set; }
    public AscetStateMachineCapabilities Capabilities { get; set; }
    public int StateCount { get; set; }
    public int TransitionCount { get; set; }
    public int MethodCount { get; set; }
    public int DiagramCount { get; set; }
    public string SummaryText { get; set; }
}

public sealed class AscetStateMachineSnapshot
{
    public AscetStateMachineRef StateMachineRef { get; set; }
    public AscetStateMachineSummary Summary { get; set; }
    public AscetStateMachineCapabilities Capabilities { get; set; }
    public IList<AscetStateRef> States { get; set; }
    public IList<AscetTransitionRef> Transitions { get; set; }
    public IList<AscetMethodCode> Methods { get; set; }
    public IList<AscetDiagramRef> Diagrams { get; set; }
    public AscetStateMachineSemanticSummary SemanticSummary { get; set; }
    public AscetStateMachineFlowSummary FlowSummary { get; set; }
    public AscetImplementationSnapshot Implementation { get; set; }
    public AscetReferenceGraphSummary References { get; set; }
    public string SummaryText { get; set; }
}

public sealed class AscetStateMachineDomainDiffSummary
{
    public string LeftStateMachinePath { get; set; }
    public string RightStateMachinePath { get; set; }
    public IList<AscetNamedDiffRef> StateDiffs { get; set; }
    public IList<AscetTransitionDiffRef> TransitionDiffs { get; set; }
    public IList<AscetMethodCodeDiffRef> MethodDiffs { get; set; }
    public IList<AscetImplementationElementDiffRef> ImplementationDiffs { get; set; }
    public IList<AscetNamedDiffRef> ReferenceDiffs { get; set; }
    public IList<AscetBehaviorImplementationLinkDiffRef> LinkedDiffs { get; set; }
    public string Summary { get; set; }
}

public interface IStateMachineLocatorService
{
    AscetStateMachineRef GetStateMachine(string stateMachinePath);
}

public interface IStateMachineAnalysisRouter
{
    AscetStateMachineCapabilities GetCapabilities(AscetStateMachineRef stateMachine);
    int ResolveDefaultTraceDepth(AscetStateMachineRef stateMachine);
}

public interface IStateMachineStructureService
{
    IList<AscetStateRef> ListStates(AscetStateMachineRef stateMachine);
    IList<AscetTransitionRef> ListTransitions(AscetStateMachineRef stateMachine);
    IList<AscetMethodCode> ListMethods(AscetStateMachineRef stateMachine);
}

public interface IStateMachineDiagramService
{
    IList<AscetDiagramRef> ListDiagrams(AscetStateMachineRef stateMachine);
}

public interface IStateMachineSemanticSummaryService
{
    AscetStateMachineSemanticSummary GetSemanticSummary(AscetStateMachineRef stateMachine);
}

public interface IStateMachineFlowSummaryService
{
    AscetStateMachineFlowSummary GetFlowSummary(AscetStateMachineRef stateMachine, int traceDepth);
}

public interface IStateMachineImplementationDomainService
{
    AscetImplementationSnapshot ReadImplementation(AscetStateMachineRef stateMachine, AscetImplementationReadMode mode, string implementationName);
}

public interface IStateMachineReferenceDomainService
{
    AscetReferenceGraphSummary GetReferenceGraph(AscetStateMachineRef stateMachine);
}

public interface IStateMachineSummaryService
{
    AscetStateMachineSummary GetSummary(AscetStateMachineRef stateMachine);
}

public interface IStateMachineSnapshotService
{
    AscetStateMachineSnapshot GetSnapshot(AscetStateMachineRef stateMachine);
}

public interface IStateMachineDomainDiffService
{
    AscetStateMachineDomainDiffSummary GetDiff(AscetStateMachineRef left, AscetStateMachineRef right);
}

public static class AscetStateMachineDomainUtilities
{
    public static AscetStateMachineRef ToStateMachineRef(AscetItemRef item)
    {
        if (item == null)
        {
            return null;
        }

        return new AscetStateMachineRef
        {
            Name = item.Name,
            Path = item.Path,
            LanguageKind = item.LanguageKind
        };
    }

    public static AscetItemRef ToItemRef(AscetStateMachineRef stateMachine)
    {
        if (stateMachine == null)
        {
            return null;
        }

        return new AscetItemRef
        {
            Name = stateMachine.Name,
            Path = stateMachine.Path,
            Kind = AscetComponentKind.StateMachine,
            LanguageKind = stateMachine.LanguageKind
        };
    }

    public static string GetDisplayName(AscetStateMachineRef stateMachine)
    {
        if (stateMachine == null)
        {
            return String.Empty;
        }

        if (!String.IsNullOrWhiteSpace(stateMachine.Name))
        {
            return stateMachine.Name;
        }

        return AscetAdvancedAnalysisUtilities.ExtractLeafName(stateMachine.Path);
    }

    public static AscetStateMachineSummary BuildSummary(AscetStateMachineRef stateMachine, AscetStateMachineCapabilities capabilities, int stateCount, int transitionCount, int methodCount, int diagramCount)
    {
        return new AscetStateMachineSummary
        {
            StateMachineRef = stateMachine,
            Capabilities = capabilities,
            StateCount = stateCount,
            TransitionCount = transitionCount,
            MethodCount = methodCount,
            DiagramCount = diagramCount,
            SummaryText = BuildSummaryText(stateMachine, stateCount, transitionCount, methodCount, diagramCount)
        };
    }

    public static string BuildSummaryText(AscetStateMachineRef stateMachine, int stateCount, int transitionCount, int methodCount, int diagramCount)
    {
        return "StateMachine " + GetDisplayName(stateMachine) + " [" + (stateMachine == null ? AscetLanguageKind.Unknown.ToString() : stateMachine.LanguageKind.ToString()) + "] has "
            + stateCount.ToString() + " " + Pluralize("state", stateCount)
            + ", " + transitionCount.ToString() + " " + Pluralize("transition", transitionCount)
            + ", " + methodCount.ToString() + " " + Pluralize("method", methodCount)
            + ", and " + diagramCount.ToString() + " " + Pluralize("diagram", diagramCount);
    }

    public static string BuildSnapshotSummaryText(AscetStateMachineRef stateMachine)
    {
        return "StateMachine snapshot for " + GetDisplayName(stateMachine);
    }

    private static string Pluralize(string noun, int count)
    {
        return count == 1 ? noun : noun + "s";
    }
}

public sealed class StateMachineAnalysisRouter : IStateMachineAnalysisRouter
{
    public AscetStateMachineCapabilities GetCapabilities(AscetStateMachineRef stateMachine)
    {
        if (stateMachine == null)
        {
            return new AscetStateMachineCapabilities
            {
                PrimaryAnalysis = AscetStateMachinePrimaryAnalysisKind.Unknown,
                SupportsMethodCode = false,
                SupportsSemanticSummary = false,
                SupportsFlowSummary = false,
                SupportsImplementation = false,
                SupportsReferenceGraph = false,
                SupportsMethodWrite = false,
                SupportsBehaviorWrite = false,
                SupportsStartStateWrite = false
            };
        }

        AscetComponentWriteCapabilities writeCapabilities = AscetComponentWriteUtilities.GetCapabilities(AscetStateMachineDomainUtilities.ToItemRef(stateMachine));
        return new AscetStateMachineCapabilities
        {
            PrimaryAnalysis = AscetStateMachinePrimaryAnalysisKind.StateMachineFlow,
            SupportsMethodCode = true,
            SupportsSemanticSummary = true,
            SupportsFlowSummary = true,
            SupportsImplementation = true,
            SupportsReferenceGraph = true,
            SupportsMethodWrite = writeCapabilities.SupportsMethodCode,
            SupportsBehaviorWrite = stateMachine.LanguageKind == AscetLanguageKind.ESDL,
            SupportsStartStateWrite = writeCapabilities.SupportsSetStartState
        };
    }

    public int ResolveDefaultTraceDepth(AscetStateMachineRef stateMachine)
    {
        return 1;
    }
}

public sealed class StateMachineLocatorService : IStateMachineLocatorService
{
    private readonly IComponentLocatorService locatorService;

    public StateMachineLocatorService()
        : this(new ComponentLocatorService())
    {
    }

    public StateMachineLocatorService(IComponentLocatorService locatorService)
    {
        this.locatorService = locatorService;
    }

    public AscetStateMachineRef GetStateMachine(string stateMachinePath)
    {
        if (String.IsNullOrWhiteSpace(stateMachinePath))
        {
            throw new AscetReadException("invalid_argument", "get_state_machine", "StateMachine path must not be empty.");
        }

        AscetItemPath parsed = AscetItemPath.Parse(stateMachinePath);
        AscetItemRef item = locatorService.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
        if (item == null || item.Kind != AscetComponentKind.StateMachine)
        {
            throw new AscetReadException("unsupported_component_kind", "get_state_machine", "Item '" + stateMachinePath + "' is not a state machine.");
        }

        return AscetStateMachineDomainUtilities.ToStateMachineRef(item);
    }
}

public sealed class StateMachineStructureService : IStateMachineStructureService
{
    private readonly IStateMachineReadService readService;
    private readonly IStateMachineAnalysisService analysisService;

    public StateMachineStructureService()
        : this(new StateMachineReadService(), new StateMachineAnalysisService())
    {
    }

    public StateMachineStructureService(IStateMachineReadService readService, IStateMachineAnalysisService analysisService)
    {
        this.readService = readService;
        this.analysisService = analysisService;
    }

    public IList<AscetStateRef> ListStates(AscetStateMachineRef stateMachine)
    {
        return readService.ListStates(AscetStateMachineDomainUtilities.ToItemRef(stateMachine));
    }

    public IList<AscetTransitionRef> ListTransitions(AscetStateMachineRef stateMachine)
    {
        return readService.ListTransitions(AscetStateMachineDomainUtilities.ToItemRef(stateMachine));
    }

    public IList<AscetMethodCode> ListMethods(AscetStateMachineRef stateMachine)
    {
        AscetStateMachineSemanticSummary summary = analysisService.GetSemanticSummary(AscetStateMachineDomainUtilities.ToItemRef(stateMachine));
        return summary == null ? new List<AscetMethodCode>() : (summary.Methods ?? new List<AscetMethodCode>());
    }
}

public sealed class StateMachineDiagramService : IStateMachineDiagramService
{
    private readonly IDiagramCatalogService diagramCatalogService;

    public StateMachineDiagramService()
        : this(new DiagramCatalogService())
    {
    }

    public StateMachineDiagramService(IDiagramCatalogService diagramCatalogService)
    {
        this.diagramCatalogService = diagramCatalogService;
    }

    public IList<AscetDiagramRef> ListDiagrams(AscetStateMachineRef stateMachine)
    {
        return diagramCatalogService.ListDiagrams(AscetStateMachineDomainUtilities.ToItemRef(stateMachine));
    }
}

public sealed class StateMachineSemanticSummaryService : IStateMachineSemanticSummaryService
{
    private readonly IStateMachineAnalysisService analysisService;

    public StateMachineSemanticSummaryService()
        : this(new StateMachineAnalysisService())
    {
    }

    public StateMachineSemanticSummaryService(IStateMachineAnalysisService analysisService)
    {
        this.analysisService = analysisService;
    }

    public AscetStateMachineSemanticSummary GetSemanticSummary(AscetStateMachineRef stateMachine)
    {
        return analysisService.GetSemanticSummary(AscetStateMachineDomainUtilities.ToItemRef(stateMachine));
    }
}

public sealed class StateMachineFlowSummaryService : IStateMachineFlowSummaryService
{
    private readonly IStateMachineFlowAnalysisService flowAnalysisService;

    public StateMachineFlowSummaryService()
        : this(new StateMachineFlowAnalysisService())
    {
    }

    public StateMachineFlowSummaryService(IStateMachineFlowAnalysisService flowAnalysisService)
    {
        this.flowAnalysisService = flowAnalysisService;
    }

    public AscetStateMachineFlowSummary GetFlowSummary(AscetStateMachineRef stateMachine, int traceDepth)
    {
        return flowAnalysisService.GetFlowSummary(AscetStateMachineDomainUtilities.ToItemRef(stateMachine), traceDepth);
    }
}

public sealed class StateMachineImplementationDomainService : IStateMachineImplementationDomainService
{
    private readonly IImplementationReadService implementationReadService;

    public StateMachineImplementationDomainService()
        : this(new ImplementationReadService())
    {
    }

    public StateMachineImplementationDomainService(IImplementationReadService implementationReadService)
    {
        this.implementationReadService = implementationReadService;
    }

    public AscetImplementationSnapshot ReadImplementation(AscetStateMachineRef stateMachine, AscetImplementationReadMode mode, string implementationName)
    {
        return implementationReadService.ReadImplementation(AscetStateMachineDomainUtilities.ToItemRef(stateMachine), mode, implementationName);
    }
}

public sealed class StateMachineReferenceDomainService : IStateMachineReferenceDomainService
{
    private readonly IReferenceReadService referenceReadService;

    public StateMachineReferenceDomainService()
        : this(new ReferenceReadService())
    {
    }

    public StateMachineReferenceDomainService(IReferenceReadService referenceReadService)
    {
        this.referenceReadService = referenceReadService;
    }

    public AscetReferenceGraphSummary GetReferenceGraph(AscetStateMachineRef stateMachine)
    {
        return referenceReadService.GetReferenceGraph(AscetStateMachineDomainUtilities.ToItemRef(stateMachine));
    }
}
public sealed class StateMachineSummaryService : IStateMachineSummaryService
{
    private readonly IStateMachineStructureService structureService;
    private readonly IStateMachineDiagramService diagramService;
    private readonly IStateMachineAnalysisRouter router;

    public StateMachineSummaryService()
        : this(new StateMachineStructureService(), new StateMachineDiagramService(), new StateMachineAnalysisRouter())
    {
    }

    public StateMachineSummaryService(IStateMachineStructureService structureService, IStateMachineDiagramService diagramService, IStateMachineAnalysisRouter router)
    {
        this.structureService = structureService;
        this.diagramService = diagramService;
        this.router = router;
    }

    public AscetStateMachineSummary GetSummary(AscetStateMachineRef stateMachine)
    {
        AscetStateMachineCapabilities capabilities = router.GetCapabilities(stateMachine);
        IList<AscetStateRef> states = structureService.ListStates(stateMachine) ?? new List<AscetStateRef>();
        IList<AscetTransitionRef> transitions = structureService.ListTransitions(stateMachine) ?? new List<AscetTransitionRef>();
        IList<AscetMethodCode> methods = structureService.ListMethods(stateMachine) ?? new List<AscetMethodCode>();
        IList<AscetDiagramRef> diagrams = diagramService.ListDiagrams(stateMachine) ?? new List<AscetDiagramRef>();
        return AscetStateMachineDomainUtilities.BuildSummary(stateMachine, capabilities, states.Count, transitions.Count, methods.Count, diagrams.Count);
    }
}

public sealed class StateMachineSnapshotService : IStateMachineSnapshotService
{
    private readonly IStateMachineStructureService structureService;
    private readonly IStateMachineDiagramService diagramService;
    private readonly IStateMachineSemanticSummaryService semanticSummaryService;
    private readonly IStateMachineFlowSummaryService flowSummaryService;
    private readonly IStateMachineImplementationDomainService implementationService;
    private readonly IStateMachineReferenceDomainService referenceService;
    private readonly IStateMachineAnalysisRouter router;

    public StateMachineSnapshotService()
        : this(new StateMachineStructureService(), new StateMachineDiagramService(), new StateMachineSemanticSummaryService(), new StateMachineFlowSummaryService(), new StateMachineImplementationDomainService(), new StateMachineReferenceDomainService(), new StateMachineAnalysisRouter())
    {
    }

    public StateMachineSnapshotService(
        IStateMachineStructureService structureService,
        IStateMachineDiagramService diagramService,
        IStateMachineSemanticSummaryService semanticSummaryService,
        IStateMachineFlowSummaryService flowSummaryService,
        IStateMachineImplementationDomainService implementationService,
        IStateMachineReferenceDomainService referenceService,
        IStateMachineAnalysisRouter router)
    {
        this.structureService = structureService;
        this.diagramService = diagramService;
        this.semanticSummaryService = semanticSummaryService;
        this.flowSummaryService = flowSummaryService;
        this.implementationService = implementationService;
        this.referenceService = referenceService;
        this.router = router;
    }

    public AscetStateMachineSnapshot GetSnapshot(AscetStateMachineRef stateMachine)
    {
        AscetStateMachineCapabilities capabilities = router.GetCapabilities(stateMachine);
        IList<AscetStateRef> states = structureService.ListStates(stateMachine) ?? new List<AscetStateRef>();
        IList<AscetTransitionRef> transitions = structureService.ListTransitions(stateMachine) ?? new List<AscetTransitionRef>();
        IList<AscetMethodCode> methods = structureService.ListMethods(stateMachine) ?? new List<AscetMethodCode>();
        IList<AscetDiagramRef> diagrams = diagramService.ListDiagrams(stateMachine) ?? new List<AscetDiagramRef>();
        AscetStateMachineSemanticSummary semanticSummary = semanticSummaryService.GetSemanticSummary(stateMachine);
        AscetStateMachineFlowSummary flowSummary = flowSummaryService.GetFlowSummary(stateMachine, router.ResolveDefaultTraceDepth(stateMachine));
        AscetImplementationSnapshot implementation = TryReadImplementation(stateMachine);
        AscetReferenceGraphSummary references = TryReadReferences(stateMachine);
        AscetStateMachineSummary summary = AscetStateMachineDomainUtilities.BuildSummary(stateMachine, capabilities, states.Count, transitions.Count, methods.Count, diagrams.Count);

        return new AscetStateMachineSnapshot
        {
            StateMachineRef = stateMachine,
            Summary = summary,
            Capabilities = capabilities,
            States = states,
            Transitions = transitions,
            Methods = methods,
            Diagrams = diagrams,
            SemanticSummary = semanticSummary,
            FlowSummary = flowSummary,
            Implementation = implementation,
            References = references,
            SummaryText = AscetStateMachineDomainUtilities.BuildSnapshotSummaryText(stateMachine)
        };
    }

    private AscetImplementationSnapshot TryReadImplementation(AscetStateMachineRef stateMachine)
    {
        try
        {
            return implementationService.ReadImplementation(stateMachine, AscetImplementationReadMode.Default, String.Empty);
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

    private AscetReferenceGraphSummary TryReadReferences(AscetStateMachineRef stateMachine)
    {
        try
        {
            return referenceService.GetReferenceGraph(stateMachine);
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
}

public sealed class StateMachineDomainDiffService : IStateMachineDomainDiffService
{
    private readonly IStateMachineDiffService diffService;

    public StateMachineDomainDiffService()
        : this(new StateMachineDiffService())
    {
    }

    public StateMachineDomainDiffService(IStateMachineDiffService diffService)
    {
        this.diffService = diffService;
    }

    public AscetStateMachineDomainDiffSummary GetDiff(AscetStateMachineRef left, AscetStateMachineRef right)
    {
        AscetStateMachineDiffSummary diff = diffService.GetDiff(AscetStateMachineDomainUtilities.ToItemRef(left), AscetStateMachineDomainUtilities.ToItemRef(right));
        return new AscetStateMachineDomainDiffSummary
        {
            LeftStateMachinePath = left == null ? (diff == null ? String.Empty : (diff.LeftComponentPath ?? String.Empty)) : (left.Path ?? String.Empty),
            RightStateMachinePath = right == null ? (diff == null ? String.Empty : (diff.RightComponentPath ?? String.Empty)) : (right.Path ?? String.Empty),
            StateDiffs = diff == null ? new List<AscetNamedDiffRef>() : (diff.StateDiffs ?? new List<AscetNamedDiffRef>()),
            TransitionDiffs = diff == null ? new List<AscetTransitionDiffRef>() : (diff.TransitionDiffs ?? new List<AscetTransitionDiffRef>()),
            MethodDiffs = diff == null ? new List<AscetMethodCodeDiffRef>() : (diff.MethodDiffs ?? new List<AscetMethodCodeDiffRef>()),
            ImplementationDiffs = diff == null ? new List<AscetImplementationElementDiffRef>() : (diff.ImplementationDiffs ?? new List<AscetImplementationElementDiffRef>()),
            ReferenceDiffs = diff == null ? new List<AscetNamedDiffRef>() : (diff.ReferenceDiffs ?? new List<AscetNamedDiffRef>()),
            LinkedDiffs = diff == null ? new List<AscetBehaviorImplementationLinkDiffRef>() : (diff.LinkedDiffs ?? new List<AscetBehaviorImplementationLinkDiffRef>()),
            Summary = diff == null ? String.Empty : (diff.Summary ?? String.Empty)
        };
    }
}
