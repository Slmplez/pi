using System;
using System.Collections.Generic;

public interface IComponentSnapshotService
{
    AscetComponentSnapshot GetSnapshot(AscetItemRef component, int traceDepth);
}

public sealed class ComponentSnapshotService : IComponentSnapshotService
{
    private readonly IDiagramCatalogService diagramCatalogService;
    private readonly IMethodCodeService methodCodeService;
    private readonly ITextCodeService textCodeService;
    private readonly IImplementationReadService implementationReadService;
    private readonly IReferenceReadService referenceReadService;
    private readonly IReferenceTraceService referenceTraceService;
    private readonly IStateMachineAnalysisService stateMachineAnalysisService;
    private readonly IStateMachineFlowAnalysisService stateMachineFlowAnalysisService;

    public ComponentSnapshotService()
        : this(new DiagramCatalogService(), new MethodCatalogService(), new TextCodeService(), new ImplementationReadService(), new ReferenceReadService(), new ReferenceTraceService(), new StateMachineAnalysisService(), new StateMachineFlowAnalysisService())
    {
    }

    public ComponentSnapshotService(
        IDiagramCatalogService diagramCatalogService,
        IMethodCodeService methodCodeService,
        ITextCodeService textCodeService,
        IImplementationReadService implementationReadService,
        IReferenceReadService referenceReadService,
        IReferenceTraceService referenceTraceService,
        IStateMachineAnalysisService stateMachineAnalysisService,
        IStateMachineFlowAnalysisService stateMachineFlowAnalysisService)
    {
        this.diagramCatalogService = diagramCatalogService;
        this.methodCodeService = methodCodeService;
        this.textCodeService = textCodeService;
        this.implementationReadService = implementationReadService;
        this.referenceReadService = referenceReadService;
        this.referenceTraceService = referenceTraceService;
        this.stateMachineAnalysisService = stateMachineAnalysisService;
        this.stateMachineFlowAnalysisService = stateMachineFlowAnalysisService;
    }

    public AscetComponentSnapshot GetSnapshot(AscetItemRef component, int traceDepth)
    {
        if (component == null)
        {
            throw new AscetReadException("invalid_argument", "get_component_snapshot", "Component reference must not be null.");
        }

        IList<AscetDiagramRef> diagrams = diagramCatalogService == null ? new List<AscetDiagramRef>() : (diagramCatalogService.ListDiagrams(component) ?? new List<AscetDiagramRef>());
        IList<AscetMethodCode> methods = methodCodeService == null ? new List<AscetMethodCode>() : (methodCodeService.GetAllMethodCodes(component) ?? new List<AscetMethodCode>());
        AscetImplementationSnapshot implementation = TryReadImplementation(component);
        AscetReferenceGraphSummary references = TryReadReferences(component);
        IList<AscetReferenceTraceNodeRef> referenceTrace = referenceTraceService == null ? new List<AscetReferenceTraceNodeRef>() : referenceTraceService.TraceReferences(component, traceDepth);
        AscetTextCode textCode = TryReadTextCode(component);
        AscetStateMachineSemanticSummary stateMachineSummary = null;
        AscetStateMachineFlowSummary stateMachineFlow = null;

        if (component.Kind == AscetComponentKind.StateMachine)
        {
            stateMachineSummary = stateMachineAnalysisService == null ? null : stateMachineAnalysisService.GetSemanticSummary(component);
            stateMachineFlow = stateMachineFlowAnalysisService == null ? null : stateMachineFlowAnalysisService.GetFlowSummary(component, traceDepth);
        }

        return new AscetComponentSnapshot
        {
            Component = component,
            Diagrams = diagrams,
            Methods = methods,
            TextCode = textCode,
            Implementation = implementation,
            References = references,
            ReferenceTrace = referenceTrace,
            StateMachineSummary = stateMachineSummary,
            StateMachineFlow = stateMachineFlow,
            Summary = BuildSnapshotSummary(component, diagrams, references)
        };
    }

    private AscetImplementationSnapshot TryReadImplementation(AscetItemRef component)
    {
        if (implementationReadService == null)
        {
            return null;
        }

        try
        {
            return implementationReadService.ReadImplementation(component, AscetImplementationReadMode.Default, String.Empty);
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
        if (referenceReadService == null)
        {
            return null;
        }

        try
        {
            return referenceReadService.GetReferenceGraph(component);
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

    private AscetTextCode TryReadTextCode(AscetItemRef component)
    {
        if (textCodeService == null || component == null || component.LanguageKind != AscetLanguageKind.C)
        {
            return null;
        }

        return textCodeService.GetTextCode(component);
    }

    private string BuildSnapshotSummary(AscetItemRef component, IList<AscetDiagramRef> diagrams, AscetReferenceGraphSummary references)
    {
        string name = component == null ? String.Empty : (component.Name ?? AscetAdvancedAnalysisUtilities.ExtractLeafName(component.Path));
        int referenceCount = references == null || references.References == null ? 0 : references.References.Count;
        int diagramCount = diagrams == null ? 0 : diagrams.Count;

        return (component == null ? "Component" : component.Kind.ToString())
            + " "
            + name
            + " has "
            + referenceCount.ToString()
            + " reference"
            + (referenceCount == 1 ? String.Empty : "s")
            + " and "
            + diagramCount.ToString()
            + " diagram"
            + (diagramCount == 1 ? String.Empty : "s");
    }
}
