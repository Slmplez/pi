using System;
using System.Collections.Generic;

public enum AscetModulePrimaryAnalysisKind
{
    Unknown = 0,
    MethodCode = 1,
    BlockDiagram = 2,
    TextCode = 3
}

public sealed class AscetModuleRef
{
    public string Name { get; set; }
    public string Path { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
}

public sealed class AscetModuleCapabilities
{
    public AscetModulePrimaryAnalysisKind PrimaryAnalysis { get; set; }
    public bool SupportsMethodCode { get; set; }
    public bool SupportsBlockDiagram { get; set; }
    public bool SupportsTextCode { get; set; }
    public bool SupportsImplementation { get; set; }
    public bool SupportsReferenceGraph { get; set; }
    public bool SupportsMethodWrite { get; set; }
}

public sealed class AscetModuleSummary
{
    public AscetModuleRef ModuleRef { get; set; }
    public AscetModuleCapabilities Capabilities { get; set; }
    public int ElementCount { get; set; }
    public int MethodCount { get; set; }
    public int DiagramCount { get; set; }
    public string SummaryText { get; set; }
}

public sealed class AscetModuleElementRef
{
    public string ElementName { get; set; }
    public string ElementKind { get; set; }
    public string DisplayType { get; set; }
    public string DisplayScope { get; set; }
    public string DisplayKind { get; set; }
    public bool IsPrimitive { get; set; }
    public string ReferencedComponentPath { get; set; }
    public bool HasImplementationView { get; set; }
    public bool IsReferencedModelElement { get; set; }
}

public sealed class AscetModuleMethodAnalysisRef
{
    public AscetMethodCode Method { get; set; }
    public AscetCodeAnalysisRef CodeAnalysis { get; set; }
}

public sealed class AscetModuleSnapshot
{
    public AscetModuleRef ModuleRef { get; set; }
    public AscetModuleSummary Summary { get; set; }
    public AscetModuleCapabilities Capabilities { get; set; }
    public IList<AscetModuleElementRef> Elements { get; set; }
    public IList<AscetMethodCode> Methods { get; set; }
    public IList<AscetModuleMethodAnalysisRef> MethodAnalyses { get; set; }
    public AscetTextCode TextCode { get; set; }
    public IList<AscetDiagramRef> Diagrams { get; set; }
    public AscetBlockDiagramGraph PrimaryBlockGraph { get; set; }
    public AscetImplementationSnapshot Implementation { get; set; }
    public AscetReferenceGraphSummary References { get; set; }
    public string SummaryText { get; set; }
}

public sealed class AscetModuleDiffSummary
{
    public string LeftModulePath { get; set; }
    public string RightModulePath { get; set; }
    public IList<AscetMethodCodeDiffRef> MethodDiffs { get; set; }
    public IList<AscetImplementationElementDiffRef> ImplementationDiffs { get; set; }
    public IList<AscetNamedDiffRef> ReferenceDiffs { get; set; }
    public IList<AscetNamedDiffRef> BlockDiffs { get; set; }
    public string Summary { get; set; }
}

public interface IModuleLocatorService
{
    AscetModuleRef GetModule(string classPath);
}

public interface IModuleSummaryService
{
    AscetModuleSummary GetSummary(AscetModuleRef cls);
}

public interface IModuleElementService
{
    IList<AscetModuleElementRef> ListElements(AscetModuleRef cls);
}

public interface IModuleMethodService
{
    IList<AscetMethodRef> ListMethods(AscetModuleRef cls);
    IList<AscetMethodCode> GetAllMethodCodes(AscetModuleRef cls);
}

public interface IModuleDiagramService
{
    IList<AscetDiagramRef> ListDiagrams(AscetModuleRef cls);
}

public interface IModuleImplementationService
{
    AscetImplementationCatalog ListImplementations(AscetModuleRef cls);
    AscetImplementationSnapshot ReadImplementation(AscetModuleRef cls, AscetImplementationReadMode mode, string implementationName);
}

public interface IModuleReferenceService
{
    AscetReferenceGraphSummary GetReferenceGraph(AscetModuleRef cls);
}

public interface IModuleSnapshotService
{
    AscetModuleSnapshot GetSnapshot(AscetModuleRef cls);
}

public interface IModuleDiffService
{
    AscetModuleDiffSummary GetDiff(AscetModuleRef left, AscetModuleRef right);
}

public interface IModuleAnalysisRouter
{
    AscetModuleCapabilities GetCapabilities(AscetModuleRef cls);
    string ResolvePrimaryBlockDiagramName(AscetModuleRef cls, IList<AscetDiagramRef> diagrams);
}

public interface IEsdlModuleAnalysisService
{
    IList<AscetModuleMethodAnalysisRef> AnalyzeAllMethods(AscetModuleRef cls, IList<AscetMethodCode> methods, AscetReferenceGraphSummary references);
}

public interface IBdeModuleAnalysisService
{
    AscetBlockDiagramGraph GetPrimaryBlockGraph(AscetModuleRef cls, IList<AscetDiagramRef> diagrams);
}

public interface ICModuleAnalysisService
{
    AscetTextCode GetTextCode(AscetModuleRef cls);
}

public static class AscetModuleDomainUtilities
{
    public static AscetModuleRef ToModuleRef(AscetItemRef item)
    {
        if (item == null)
        {
            return null;
        }

        return new AscetModuleRef
        {
            Name = item.Name,
            Path = item.Path,
            LanguageKind = item.LanguageKind
        };
    }

    public static AscetItemRef ToItemRef(AscetModuleRef cls)
    {
        if (cls == null)
        {
            return null;
        }

        return new AscetItemRef
        {
            Name = cls.Name,
            Path = cls.Path,
            Kind = AscetComponentKind.Module,
            LanguageKind = cls.LanguageKind
        };
    }

    public static string GetDisplayName(AscetModuleRef cls)
    {
        if (cls == null)
        {
            return String.Empty;
        }

        if (!String.IsNullOrWhiteSpace(cls.Name))
        {
            return cls.Name;
        }

        return AscetAdvancedAnalysisUtilities.ExtractLeafName(cls.Path);
    }

    public static AscetModuleSummary BuildSummary(AscetModuleRef cls, AscetModuleCapabilities capabilities, int elementCount, int methodCount, int diagramCount)
    {
        return new AscetModuleSummary
        {
            ModuleRef = cls,
            Capabilities = capabilities,
            ElementCount = elementCount,
            MethodCount = methodCount,
            DiagramCount = diagramCount,
            SummaryText = BuildSummaryText(cls, elementCount, methodCount, diagramCount)
        };
    }

    public static string BuildSummaryText(AscetModuleRef cls, int elementCount, int methodCount, int diagramCount)
    {
        return "Module " + GetDisplayName(cls) + " [" + (cls == null ? AscetLanguageKind.Unknown.ToString() : cls.LanguageKind.ToString()) + "] has " + elementCount.ToString() + " " + Pluralize("element", elementCount) + ", " + methodCount.ToString() + " " + Pluralize("method", methodCount) + ", and " + diagramCount.ToString() + " " + Pluralize("diagram", diagramCount);
    }

    public static string BuildSnapshotSummaryText(AscetModuleRef cls)
    {
        return "Module snapshot for " + GetDisplayName(cls);
    }

    private static string Pluralize(string noun, int count)
    {
        return count == 1 ? noun : noun + "s";
    }
}

public sealed class ModuleAnalysisRouter : IModuleAnalysisRouter
{
    public AscetModuleCapabilities GetCapabilities(AscetModuleRef cls)
    {
        AscetLanguageKind language = cls == null ? AscetLanguageKind.Unknown : cls.LanguageKind;
        switch (language)
        {
            case AscetLanguageKind.ESDL:
                return new AscetModuleCapabilities
                {
                    PrimaryAnalysis = AscetModulePrimaryAnalysisKind.MethodCode,
                    SupportsMethodCode = true,
                    SupportsBlockDiagram = false,
                    SupportsTextCode = false,
                    SupportsImplementation = true,
                    SupportsReferenceGraph = true,
                    SupportsMethodWrite = true
                };

            case AscetLanguageKind.BDE:
                return new AscetModuleCapabilities
                {
                    PrimaryAnalysis = AscetModulePrimaryAnalysisKind.BlockDiagram,
                    SupportsMethodCode = true,
                    SupportsBlockDiagram = true,
                    SupportsTextCode = false,
                    SupportsImplementation = true,
                    SupportsReferenceGraph = true,
                    SupportsMethodWrite = false
                };

            case AscetLanguageKind.C:
                return new AscetModuleCapabilities
                {
                    PrimaryAnalysis = AscetModulePrimaryAnalysisKind.TextCode,
                    SupportsMethodCode = true,
                    SupportsBlockDiagram = false,
                    SupportsTextCode = true,
                    SupportsImplementation = true,
                    SupportsReferenceGraph = true,
                    SupportsMethodWrite = true
                };

            default:
                return new AscetModuleCapabilities
                {
                    PrimaryAnalysis = AscetModulePrimaryAnalysisKind.Unknown,
                    SupportsMethodCode = false,
                    SupportsBlockDiagram = false,
                    SupportsTextCode = false,
                    SupportsImplementation = false,
                    SupportsReferenceGraph = false,
                    SupportsMethodWrite = false
                };
        }
    }

    public string ResolvePrimaryBlockDiagramName(AscetModuleRef cls, IList<AscetDiagramRef> diagrams)
    {
        if (cls == null || cls.LanguageKind != AscetLanguageKind.BDE || diagrams == null)
        {
            return String.Empty;
        }

        string firstBlockDiagram = String.Empty;
        for (int i = 0; i < diagrams.Count; i++)
        {
            AscetDiagramRef diagram = diagrams[i];
            if (diagram == null || diagram.DiagramKind != AscetDiagramKind.BlockDiagram)
            {
                continue;
            }

            if (String.Equals(diagram.Name, "Main", StringComparison.Ordinal))
            {
                return diagram.Name ?? String.Empty;
            }

            if (String.IsNullOrWhiteSpace(firstBlockDiagram))
            {
                firstBlockDiagram = diagram.Name ?? String.Empty;
            }
        }

        return firstBlockDiagram;
    }
}

public sealed class ModuleLocatorService : IModuleLocatorService
{
    private readonly IComponentLocatorService locatorService;

    public ModuleLocatorService()
        : this(new ComponentLocatorService())
    {
    }

    public ModuleLocatorService(IComponentLocatorService locatorService)
    {
        this.locatorService = locatorService;
    }

    public AscetModuleRef GetModule(string classPath)
    {
        if (String.IsNullOrWhiteSpace(classPath))
        {
            throw new AscetReadException("invalid_argument", "get_module", "Module path must not be empty.");
        }

        AscetItemPath parsed = AscetItemPath.Parse(classPath);
        AscetItemRef item = locatorService.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
        if (item == null || item.Kind != AscetComponentKind.Module)
        {
            throw new AscetReadException("unsupported_component_kind", "get_module", "Item '" + classPath + "' is not a module.");
        }

        return AscetModuleDomainUtilities.ToModuleRef(item);
    }
}

public sealed class ModuleMethodService : IModuleMethodService
{
    private readonly IMethodCatalogService methodCatalogService;
    private readonly IMethodCodeService methodCodeService;

    public ModuleMethodService()
        : this(new MethodCatalogService(), new MethodCatalogService())
    {
    }

    public ModuleMethodService(IMethodCatalogService methodCatalogService, IMethodCodeService methodCodeService)
    {
        this.methodCatalogService = methodCatalogService;
        this.methodCodeService = methodCodeService;
    }

    public IList<AscetMethodRef> ListMethods(AscetModuleRef cls)
    {
        return methodCatalogService.ListMethods(AscetModuleDomainUtilities.ToItemRef(cls));
    }

    public IList<AscetMethodCode> GetAllMethodCodes(AscetModuleRef cls)
    {
        return methodCodeService.GetAllMethodCodes(AscetModuleDomainUtilities.ToItemRef(cls));
    }
}
public sealed class ModuleDiagramService : IModuleDiagramService
{
    private readonly IDiagramCatalogService diagramCatalogService;

    public ModuleDiagramService()
        : this(new DiagramCatalogService())
    {
    }

    public ModuleDiagramService(IDiagramCatalogService diagramCatalogService)
    {
        this.diagramCatalogService = diagramCatalogService;
    }

    public IList<AscetDiagramRef> ListDiagrams(AscetModuleRef cls)
    {
        return diagramCatalogService.ListDiagrams(AscetModuleDomainUtilities.ToItemRef(cls));
    }
}

public sealed class ModuleImplementationService : IModuleImplementationService
{
    private readonly IImplementationReadService implementationReadService;

    public ModuleImplementationService()
        : this(new ImplementationReadService())
    {
    }

    public ModuleImplementationService(IImplementationReadService implementationReadService)
    {
        this.implementationReadService = implementationReadService;
    }

    public AscetImplementationCatalog ListImplementations(AscetModuleRef cls)
    {
        return implementationReadService.ListImplementations(AscetModuleDomainUtilities.ToItemRef(cls));
    }

    public AscetImplementationSnapshot ReadImplementation(AscetModuleRef cls, AscetImplementationReadMode mode, string implementationName)
    {
        return implementationReadService.ReadImplementation(AscetModuleDomainUtilities.ToItemRef(cls), mode, implementationName);
    }
}

public sealed class ModuleReferenceService : IModuleReferenceService
{
    private readonly IReferenceReadService referenceReadService;

    public ModuleReferenceService()
        : this(new ReferenceReadService())
    {
    }

    public ModuleReferenceService(IReferenceReadService referenceReadService)
    {
        this.referenceReadService = referenceReadService;
    }

    public AscetReferenceGraphSummary GetReferenceGraph(AscetModuleRef cls)
    {
        return referenceReadService.GetReferenceGraph(AscetModuleDomainUtilities.ToItemRef(cls));
    }
}

public sealed class EsdlModuleAnalysisService : IEsdlModuleAnalysisService
{
    private readonly IEsdlAnalysisService esdlAnalysisService;

    public EsdlModuleAnalysisService()
        : this(new EsdlAnalysisService())
    {
    }

    public EsdlModuleAnalysisService(IEsdlAnalysisService esdlAnalysisService)
    {
        this.esdlAnalysisService = esdlAnalysisService;
    }

    public IList<AscetModuleMethodAnalysisRef> AnalyzeAllMethods(AscetModuleRef cls, IList<AscetMethodCode> methods, AscetReferenceGraphSummary references)
    {
        List<AscetModuleMethodAnalysisRef> analyses = new List<AscetModuleMethodAnalysisRef>();
        if (cls == null || cls.LanguageKind != AscetLanguageKind.ESDL || methods == null)
        {
            return analyses;
        }

        IList<string> referenceNames = ExtractReferenceNames(references);
        for (int i = 0; i < methods.Count; i++)
        {
            AscetMethodCode method = methods[i];
            if (method == null)
            {
                continue;
            }

            AscetEsdlAnalysisResult analysis = esdlAnalysisService.Analyze(method.Code, referenceNames);
            analyses.Add(new AscetModuleMethodAnalysisRef
            {
                Method = method,
                CodeAnalysis = ToCodeAnalysisRef(analysis)
            });
        }

        return analyses;
    }

    private IList<string> ExtractReferenceNames(AscetReferenceGraphSummary references)
    {
        List<string> names = new List<string>();
        if (references == null || references.References == null)
        {
            return names;
        }

        for (int i = 0; i < references.References.Count; i++)
        {
            AscetReferenceEdgeRef edge = references.References[i];
            if (edge == null || String.IsNullOrWhiteSpace(edge.SourceElementName))
            {
                continue;
            }

            names.Add(edge.SourceElementName);
        }

        return AscetAdvancedAnalysisUtilities.DistinctStrings(names);
    }

    private AscetCodeAnalysisRef ToCodeAnalysisRef(AscetEsdlAnalysisResult analysis)
    {
        if (analysis == null)
        {
            return new AscetCodeAnalysisRef
            {
                ParseSucceeded = false,
                Reads = new List<string>(),
                Writes = new List<string>(),
                Calls = new List<string>(),
                ReferencedComponents = new List<string>(),
                Diagnostics = new List<string>()
            };
        }

        return new AscetCodeAnalysisRef
        {
            ParseSucceeded = analysis.ParseSucceeded,
            Reads = analysis.Reads ?? new List<string>(),
            Writes = analysis.Writes ?? new List<string>(),
            Calls = analysis.Calls ?? new List<string>(),
            ReferencedComponents = analysis.ReferencedComponents ?? new List<string>(),
            Diagnostics = analysis.Diagnostics ?? new List<string>()
        };
    }
}

public sealed class BdeModuleAnalysisService : IBdeModuleAnalysisService
{
    private readonly IBlockDiagramReadService blockDiagramReadService;
    private readonly IModuleAnalysisRouter router;

    public BdeModuleAnalysisService()
        : this(new BlockDiagramReadService(), new ModuleAnalysisRouter())
    {
    }

    public BdeModuleAnalysisService(IBlockDiagramReadService blockDiagramReadService, IModuleAnalysisRouter router)
    {
        this.blockDiagramReadService = blockDiagramReadService;
        this.router = router;
    }

    public AscetBlockDiagramGraph GetPrimaryBlockGraph(AscetModuleRef cls, IList<AscetDiagramRef> diagrams)
    {
        if (cls == null || cls.LanguageKind != AscetLanguageKind.BDE)
        {
            return null;
        }

        string diagramName = router.ResolvePrimaryBlockDiagramName(cls, diagrams);
        if (String.IsNullOrWhiteSpace(diagramName))
        {
            return null;
        }

        return blockDiagramReadService.GetBlockDiagramGraph(AscetModuleDomainUtilities.ToItemRef(cls), diagramName);
    }
}

public sealed class CModuleAnalysisService : ICModuleAnalysisService
{
    private readonly ITextCodeService textCodeService;

    public CModuleAnalysisService()
        : this(new TextCodeService())
    {
    }

    public CModuleAnalysisService(ITextCodeService textCodeService)
    {
        this.textCodeService = textCodeService;
    }

    public AscetTextCode GetTextCode(AscetModuleRef cls)
    {
        if (cls == null || cls.LanguageKind != AscetLanguageKind.C)
        {
            return null;
        }

        return textCodeService.GetTextCode(AscetModuleDomainUtilities.ToItemRef(cls));
    }
}

public sealed class ModuleElementService : IModuleElementService
{
    private readonly IModuleImplementationService implementationService;
    private readonly IModuleReferenceService referenceService;

    public ModuleElementService()
        : this(new ModuleImplementationService(), new ModuleReferenceService())
    {
    }

    public ModuleElementService(IModuleImplementationService implementationService, IModuleReferenceService referenceService)
    {
        this.implementationService = implementationService;
        this.referenceService = referenceService;
    }

    public IList<AscetModuleElementRef> ListElements(AscetModuleRef cls)
    {
        Dictionary<string, AscetModuleElementRef> elementsByName = new Dictionary<string, AscetModuleElementRef>(StringComparer.Ordinal);
        List<AscetModuleElementRef> ordered = new List<AscetModuleElementRef>();

        AscetImplementationSnapshot implementation = TryReadImplementation(cls);
        if (implementation != null && implementation.Elements != null)
        {
            for (int i = 0; i < implementation.Elements.Count; i++)
            {
                AscetElementImplementationRef element = implementation.Elements[i];
                if (element == null || String.IsNullOrWhiteSpace(element.ElementName))
                {
                    continue;
                }

                AscetModuleElementRef mapped = new AscetModuleElementRef
                {
                    ElementName = element.ElementName,
                    ElementKind = element.ElementKind,
                    DisplayType = element.DisplayType,
                    DisplayScope = element.DisplayScope,
                    DisplayKind = element.DisplayKind,
                    IsPrimitive = element.IsPrimitive,
                    ReferencedComponentPath = element.ReferencedComponentPath ?? String.Empty,
                    HasImplementationView = true,
                    IsReferencedModelElement = false
                };
                elementsByName[mapped.ElementName] = mapped;
                ordered.Add(mapped);
            }
        }

        AscetReferenceGraphSummary references = TryReadReferences(cls);
        if (references != null && references.References != null)
        {
            for (int i = 0; i < references.References.Count; i++)
            {
                AscetReferenceEdgeRef edge = references.References[i];
                if (edge == null || String.IsNullOrWhiteSpace(edge.SourceElementName))
                {
                    continue;
                }

                AscetModuleElementRef existing;
                if (elementsByName.TryGetValue(edge.SourceElementName, out existing))
                {
                    existing.IsReferencedModelElement = true;
                    if (String.IsNullOrWhiteSpace(existing.ReferencedComponentPath))
                    {
                        existing.ReferencedComponentPath = edge.TargetComponentPath ?? String.Empty;
                    }

                    if (String.IsNullOrWhiteSpace(existing.DisplayScope))
                    {
                        existing.DisplayScope = edge.SourceDisplayScope ?? String.Empty;
                    }

                    if (String.IsNullOrWhiteSpace(existing.DisplayKind))
                    {
                        existing.DisplayKind = edge.SourceDisplayKind ?? String.Empty;
                    }

                    continue;
                }

                AscetModuleElementRef mapped = new AscetModuleElementRef
                {
                    ElementName = edge.SourceElementName,
                    ElementKind = edge.SourceElementKind,
                    DisplayType = edge.IsResolved ? (edge.TargetComponentName ?? String.Empty) : "reference",
                    DisplayScope = edge.SourceDisplayScope ?? String.Empty,
                    DisplayKind = edge.SourceDisplayKind ?? String.Empty,
                    IsPrimitive = false,
                    ReferencedComponentPath = edge.TargetComponentPath ?? String.Empty,
                    HasImplementationView = false,
                    IsReferencedModelElement = true
                };
                elementsByName[mapped.ElementName] = mapped;
                ordered.Add(mapped);
            }
        }

        return ordered;
    }

    private AscetImplementationSnapshot TryReadImplementation(AscetModuleRef cls)
    {
        try
        {
            return implementationService.ReadImplementation(cls, AscetImplementationReadMode.Default, String.Empty);
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

    private AscetReferenceGraphSummary TryReadReferences(AscetModuleRef cls)
    {
        try
        {
            return referenceService.GetReferenceGraph(cls);
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

public sealed class ModuleSummaryService : IModuleSummaryService
{
    private readonly IModuleElementService elementService;
    private readonly IModuleMethodService methodService;
    private readonly IModuleDiagramService diagramService;
    private readonly IModuleAnalysisRouter router;

    public ModuleSummaryService()
        : this(new ModuleElementService(), new ModuleMethodService(), new ModuleDiagramService(), new ModuleAnalysisRouter())
    {
    }

    public ModuleSummaryService(IModuleElementService elementService, IModuleMethodService methodService, IModuleDiagramService diagramService, IModuleAnalysisRouter router)
    {
        this.elementService = elementService;
        this.methodService = methodService;
        this.diagramService = diagramService;
        this.router = router;
    }

    public AscetModuleSummary GetSummary(AscetModuleRef cls)
    {
        IList<AscetModuleElementRef> elements = elementService.ListElements(cls);
        IList<AscetMethodCode> methods = methodService.GetAllMethodCodes(cls);
        IList<AscetDiagramRef> diagrams = diagramService.ListDiagrams(cls);
        AscetModuleCapabilities capabilities = router.GetCapabilities(cls);
        return AscetModuleDomainUtilities.BuildSummary(cls, capabilities, elements == null ? 0 : elements.Count, methods == null ? 0 : methods.Count, diagrams == null ? 0 : diagrams.Count);
    }
}
public sealed class ModuleSnapshotService : IModuleSnapshotService
{
    private readonly IModuleElementService elementService;
    private readonly IModuleMethodService methodService;
    private readonly IModuleDiagramService diagramService;
    private readonly IModuleImplementationService implementationService;
    private readonly IModuleReferenceService referenceService;
    private readonly IEsdlModuleAnalysisService esdlAnalysisService;
    private readonly IBdeModuleAnalysisService bdeAnalysisService;
    private readonly ICModuleAnalysisService cClassAnalysisService;
    private readonly IModuleAnalysisRouter router;

    public ModuleSnapshotService()
        : this(new ModuleElementService(), new ModuleMethodService(), new ModuleDiagramService(), new ModuleImplementationService(), new ModuleReferenceService(), new EsdlModuleAnalysisService(), new BdeModuleAnalysisService(), new CModuleAnalysisService(), new ModuleAnalysisRouter())
    {
    }

    public ModuleSnapshotService(
        IModuleElementService elementService,
        IModuleMethodService methodService,
        IModuleDiagramService diagramService,
        IModuleImplementationService implementationService,
        IModuleReferenceService referenceService,
        IEsdlModuleAnalysisService esdlAnalysisService,
        IBdeModuleAnalysisService bdeAnalysisService,
        ICModuleAnalysisService cClassAnalysisService,
        IModuleAnalysisRouter router)
    {
        this.elementService = elementService;
        this.methodService = methodService;
        this.diagramService = diagramService;
        this.implementationService = implementationService;
        this.referenceService = referenceService;
        this.esdlAnalysisService = esdlAnalysisService;
        this.bdeAnalysisService = bdeAnalysisService;
        this.cClassAnalysisService = cClassAnalysisService;
        this.router = router;
    }

    public AscetModuleSnapshot GetSnapshot(AscetModuleRef cls)
    {
        AscetModuleCapabilities capabilities = router.GetCapabilities(cls);
        IList<AscetModuleElementRef> elements = elementService.ListElements(cls) ?? new List<AscetModuleElementRef>();
        IList<AscetMethodCode> methods = methodService.GetAllMethodCodes(cls) ?? new List<AscetMethodCode>();
        IList<AscetDiagramRef> diagrams = diagramService.ListDiagrams(cls) ?? new List<AscetDiagramRef>();
        AscetImplementationSnapshot implementation = TryReadImplementation(cls);
        AscetReferenceGraphSummary references = TryReadReferences(cls);
        IList<AscetModuleMethodAnalysisRef> methodAnalyses = esdlAnalysisService.AnalyzeAllMethods(cls, methods, references) ?? new List<AscetModuleMethodAnalysisRef>();
        AscetTextCode textCode = capabilities.SupportsTextCode ? TryReadTextCode(cls) : null;
        AscetBlockDiagramGraph primaryBlockGraph = capabilities.SupportsBlockDiagram ? bdeAnalysisService.GetPrimaryBlockGraph(cls, diagrams) : null;
        AscetModuleSummary summary = AscetModuleDomainUtilities.BuildSummary(cls, capabilities, elements.Count, methods.Count, diagrams.Count);

        return new AscetModuleSnapshot
        {
            ModuleRef = cls,
            Summary = summary,
            Capabilities = capabilities,
            Elements = elements,
            Methods = methods,
            MethodAnalyses = methodAnalyses,
            TextCode = textCode,
            Diagrams = diagrams,
            PrimaryBlockGraph = primaryBlockGraph,
            Implementation = implementation,
            References = references,
            SummaryText = AscetModuleDomainUtilities.BuildSnapshotSummaryText(cls)
        };
    }

    private AscetImplementationSnapshot TryReadImplementation(AscetModuleRef cls)
    {
        try
        {
            return implementationService.ReadImplementation(cls, AscetImplementationReadMode.Default, String.Empty);
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

    private AscetReferenceGraphSummary TryReadReferences(AscetModuleRef cls)
    {
        try
        {
            return referenceService.GetReferenceGraph(cls);
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

    private AscetTextCode TryReadTextCode(AscetModuleRef cls)
    {
        try
        {
            return cClassAnalysisService.GetTextCode(cls);
        }
        catch (AscetReadException ex)
        {
            if (String.Equals(ex.Code, "text_code_not_supported", StringComparison.Ordinal))
            {
                return null;
            }

            throw;
        }
    }
}

public sealed class ModuleDiffService : IModuleDiffService
{
    private readonly IModuleMethodService methodService;
    private readonly IModuleImplementationService implementationService;
    private readonly IModuleReferenceService referenceService;
    private readonly IModuleDiagramService diagramService;
    private readonly IBdeModuleAnalysisService bdeAnalysisService;
    private readonly IModuleAnalysisRouter router;

    public ModuleDiffService()
        : this(new ModuleMethodService(), new ModuleImplementationService(), new ModuleReferenceService(), new ModuleDiagramService(), new BdeModuleAnalysisService(), new ModuleAnalysisRouter())
    {
    }

    public ModuleDiffService(
        IModuleMethodService methodService,
        IModuleImplementationService implementationService,
        IModuleReferenceService referenceService,
        IModuleDiagramService diagramService,
        IBdeModuleAnalysisService bdeAnalysisService,
        IModuleAnalysisRouter router)
    {
        this.methodService = methodService;
        this.implementationService = implementationService;
        this.referenceService = referenceService;
        this.diagramService = diagramService;
        this.bdeAnalysisService = bdeAnalysisService;
        this.router = router;
    }

    public AscetModuleDiffSummary GetDiff(AscetModuleRef left, AscetModuleRef right)
    {
        IList<AscetMethodCode> leftMethods = methodService.GetAllMethodCodes(left);
        IList<AscetMethodCode> rightMethods = methodService.GetAllMethodCodes(right);
        AscetImplementationSnapshot leftImplementation = TryReadImplementation(left);
        AscetImplementationSnapshot rightImplementation = TryReadImplementation(right);
        AscetReferenceGraphSummary leftReferences = TryReadReferences(left);
        AscetReferenceGraphSummary rightReferences = TryReadReferences(right);
        AscetBlockDiagramGraph leftBlockGraph = TryReadPrimaryBlockGraph(left);
        AscetBlockDiagramGraph rightBlockGraph = TryReadPrimaryBlockGraph(right);

        IList<AscetMethodCodeDiffRef> methodDiffs = BuildMethodDiffs(leftMethods, rightMethods);
        IList<AscetImplementationElementDiffRef> implementationDiffs = BuildImplementationDiffs(leftImplementation, rightImplementation);
        IList<AscetNamedDiffRef> referenceDiffs = BuildReferenceDiffs(leftReferences, rightReferences);
        IList<AscetNamedDiffRef> blockDiffs = BuildBlockDiffs(leftBlockGraph, rightBlockGraph);

        return new AscetModuleDiffSummary
        {
            LeftModulePath = left == null ? String.Empty : (left.Path ?? String.Empty),
            RightModulePath = right == null ? String.Empty : (right.Path ?? String.Empty),
            MethodDiffs = methodDiffs,
            ImplementationDiffs = implementationDiffs,
            ReferenceDiffs = referenceDiffs,
            BlockDiffs = blockDiffs,
            Summary = BuildSummary(methodDiffs, implementationDiffs, referenceDiffs, blockDiffs)
        };
    }

    private AscetImplementationSnapshot TryReadImplementation(AscetModuleRef cls)
    {
        try
        {
            return implementationService.ReadImplementation(cls, AscetImplementationReadMode.Default, String.Empty);
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

    private AscetReferenceGraphSummary TryReadReferences(AscetModuleRef cls)
    {
        try
        {
            return referenceService.GetReferenceGraph(cls);
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

    private AscetBlockDiagramGraph TryReadPrimaryBlockGraph(AscetModuleRef cls)
    {
        IList<AscetDiagramRef> diagrams = diagramService.ListDiagrams(cls);
        string diagramName = router.ResolvePrimaryBlockDiagramName(cls, diagrams);
        if (String.IsNullOrWhiteSpace(diagramName))
        {
            return null;
        }

        return bdeAnalysisService.GetPrimaryBlockGraph(cls, diagrams);
    }

    private IList<AscetMethodCodeDiffRef> BuildMethodDiffs(IList<AscetMethodCode> leftMethods, IList<AscetMethodCode> rightMethods)
    {
        Dictionary<string, AscetMethodCode> leftMap = BuildMethodMap(leftMethods);
        Dictionary<string, AscetMethodCode> rightMap = BuildMethodMap(rightMethods);
        List<string> keys = AscetAdvancedAnalysisUtilities.MergeKeys(leftMap, rightMap);
        List<AscetMethodCodeDiffRef> diffs = new List<AscetMethodCodeDiffRef>();

        for (int i = 0; i < keys.Count; i++)
        {
            string key = keys[i];
            AscetMethodCode leftMethod = leftMap.ContainsKey(key) ? leftMap[key] : null;
            AscetMethodCode rightMethod = rightMap.ContainsKey(key) ? rightMap[key] : null;
            bool hasLeft = leftMethod != null;
            bool hasRight = rightMethod != null;
            string leftCode = hasLeft ? (leftMethod.Code ?? String.Empty) : String.Empty;
            string rightCode = hasRight ? (rightMethod.Code ?? String.Empty) : String.Empty;

            diffs.Add(new AscetMethodCodeDiffRef
            {
                Name = hasLeft ? (leftMethod.MethodName ?? String.Empty) : (rightMethod == null ? String.Empty : (rightMethod.MethodName ?? String.Empty)),
                MethodKind = hasLeft ? leftMethod.MethodKind : (rightMethod == null ? AscetMethodKind.Unknown : rightMethod.MethodKind),
                ChangeKind = AscetAdvancedAnalysisUtilities.GetChangeKind(hasLeft, hasRight, leftCode, rightCode),
                LeftCode = leftCode,
                RightCode = rightCode
            });
        }

        return diffs;
    }

    private Dictionary<string, AscetMethodCode> BuildMethodMap(IList<AscetMethodCode> methods)
    {
        Dictionary<string, AscetMethodCode> map = new Dictionary<string, AscetMethodCode>(StringComparer.Ordinal);
        if (methods == null)
        {
            return map;
        }

        for (int i = 0; i < methods.Count; i++)
        {
            AscetMethodCode method = methods[i];
            if (method == null)
            {
                continue;
            }

            string key = (method.MethodName ?? String.Empty) + "|" + method.MethodKind.ToString();
            map[key] = method;
        }

        return map;
    }
    private IList<AscetImplementationElementDiffRef> BuildImplementationDiffs(AscetImplementationSnapshot leftImplementation, AscetImplementationSnapshot rightImplementation)
    {
        Dictionary<string, string> leftMap = new Dictionary<string, string>(StringComparer.Ordinal);
        Dictionary<string, string> rightMap = new Dictionary<string, string>(StringComparer.Ordinal);
        FlattenImplementation(leftMap, String.Empty, leftImplementation == null ? null : leftImplementation.Elements);
        FlattenImplementation(rightMap, String.Empty, rightImplementation == null ? null : rightImplementation.Elements);

        List<string> keys = AscetAdvancedAnalysisUtilities.MergeKeys(leftMap, rightMap);
        List<AscetImplementationElementDiffRef> diffs = new List<AscetImplementationElementDiffRef>();
        for (int i = 0; i < keys.Count; i++)
        {
            string key = keys[i];
            bool hasLeft = leftMap.ContainsKey(key);
            bool hasRight = rightMap.ContainsKey(key);
            diffs.Add(new AscetImplementationElementDiffRef
            {
                ElementPath = key,
                ChangeKind = AscetAdvancedAnalysisUtilities.GetChangeKind(hasLeft, hasRight, hasLeft ? leftMap[key] : String.Empty, hasRight ? rightMap[key] : String.Empty),
                LeftSignature = hasLeft ? leftMap[key] : String.Empty,
                RightSignature = hasRight ? rightMap[key] : String.Empty
            });
        }

        return diffs;
    }

    private void FlattenImplementation(IDictionary<string, string> map, string prefix, IList<AscetElementImplementationRef> elements)
    {
        if (map == null || elements == null)
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
            map[path] = AscetAdvancedAnalysisUtilities.BuildImplementationSignature(element);
            FlattenImplementation(map, path, element.ChildElements);
        }
    }

    private IList<AscetNamedDiffRef> BuildReferenceDiffs(AscetReferenceGraphSummary leftReferences, AscetReferenceGraphSummary rightReferences)
    {
        Dictionary<string, string> leftMap = BuildReferenceMap(leftReferences == null ? null : leftReferences.References);
        Dictionary<string, string> rightMap = BuildReferenceMap(rightReferences == null ? null : rightReferences.References);
        List<string> keys = AscetAdvancedAnalysisUtilities.MergeKeys(leftMap, rightMap);
        List<AscetNamedDiffRef> diffs = new List<AscetNamedDiffRef>();

        for (int i = 0; i < keys.Count; i++)
        {
            string key = keys[i];
            bool hasLeft = leftMap.ContainsKey(key);
            bool hasRight = rightMap.ContainsKey(key);
            diffs.Add(new AscetNamedDiffRef
            {
                Name = key,
                ChangeKind = AscetAdvancedAnalysisUtilities.GetChangeKind(hasLeft, hasRight, hasLeft ? leftMap[key] : String.Empty, hasRight ? rightMap[key] : String.Empty),
                LeftValue = hasLeft ? leftMap[key] : String.Empty,
                RightValue = hasRight ? rightMap[key] : String.Empty
            });
        }

        return diffs;
    }

    private Dictionary<string, string> BuildReferenceMap(IList<AscetReferenceEdgeRef> references)
    {
        Dictionary<string, string> map = new Dictionary<string, string>(StringComparer.Ordinal);
        if (references == null)
        {
            return map;
        }

        for (int i = 0; i < references.Count; i++)
        {
            AscetReferenceEdgeRef edge = references[i];
            if (edge == null || String.IsNullOrWhiteSpace(edge.SourceElementName))
            {
                continue;
            }

            map[edge.SourceElementName] = edge.TargetComponentPath ?? String.Empty;
        }

        return map;
    }

    private IList<AscetNamedDiffRef> BuildBlockDiffs(AscetBlockDiagramGraph leftGraph, AscetBlockDiagramGraph rightGraph)
    {
        Dictionary<string, string> leftMap = BuildBlockConnectionMap(leftGraph);
        Dictionary<string, string> rightMap = BuildBlockConnectionMap(rightGraph);
        List<string> keys = AscetAdvancedAnalysisUtilities.MergeKeys(leftMap, rightMap);
        List<AscetNamedDiffRef> diffs = new List<AscetNamedDiffRef>();

        for (int i = 0; i < keys.Count; i++)
        {
            string key = keys[i];
            bool hasLeft = leftMap.ContainsKey(key);
            bool hasRight = rightMap.ContainsKey(key);
            diffs.Add(new AscetNamedDiffRef
            {
                Name = key,
                ChangeKind = AscetAdvancedAnalysisUtilities.GetChangeKind(hasLeft, hasRight, hasLeft ? leftMap[key] : String.Empty, hasRight ? rightMap[key] : String.Empty),
                LeftValue = hasLeft ? leftMap[key] : String.Empty,
                RightValue = hasRight ? rightMap[key] : String.Empty
            });
        }

        return diffs;
    }

    private Dictionary<string, string> BuildBlockConnectionMap(AscetBlockDiagramGraph graph)
    {
        Dictionary<string, string> map = new Dictionary<string, string>(StringComparer.Ordinal);
        if (graph == null || graph.Connections == null)
        {
            return map;
        }

        for (int i = 0; i < graph.Connections.Count; i++)
        {
            AscetBlockConnectionRef connection = graph.Connections[i];
            if (connection == null)
            {
                continue;
            }

            string key = BuildBlockConnectionLabel(connection);
            map[key] = key;
        }

        return map;
    }

    private string BuildBlockConnectionLabel(AscetBlockConnectionRef connection)
    {
        return "Connection::" + DescribeEndpoint(connection == null ? null : connection.Source) + " -> " + DescribeEndpoint(connection == null ? null : connection.Target);
    }

    private string DescribeEndpoint(AscetBlockPinRef pin)
    {
        if (pin == null)
        {
            return String.Empty;
        }

        return (pin.ElementName ?? String.Empty) + "/" + (pin.PinName ?? String.Empty);
    }

    private string BuildSummary(IList<AscetMethodCodeDiffRef> methodDiffs, IList<AscetImplementationElementDiffRef> implementationDiffs, IList<AscetNamedDiffRef> referenceDiffs, IList<AscetNamedDiffRef> blockDiffs)
    {
        List<string> parts = new List<string>();
        string methodSummary = AscetAdvancedAnalysisUtilities.BuildDiffCategorySummary(methodDiffs, "method");
        string implementationSummary = AscetAdvancedAnalysisUtilities.BuildDiffCategorySummary(implementationDiffs, "implementation element");
        string referenceSummary = AscetAdvancedAnalysisUtilities.BuildDiffCategorySummary(referenceDiffs, "reference");
        string blockSummary = AscetAdvancedAnalysisUtilities.BuildDiffCategorySummary(blockDiffs, "block");

        if (!String.Equals(methodSummary, "0 method changes", StringComparison.Ordinal))
        {
            parts.Add(methodSummary);
        }

        if (!String.Equals(implementationSummary, "0 implementation element changes", StringComparison.Ordinal))
        {
            parts.Add(implementationSummary);
        }

        if (!String.Equals(referenceSummary, "0 reference changes", StringComparison.Ordinal))
        {
            parts.Add(referenceSummary);
        }

        if (!String.Equals(blockSummary, "0 block changes", StringComparison.Ordinal))
        {
            parts.Add(blockSummary);
        }

        if (parts.Count == 0)
        {
            parts.Add(methodSummary);
            parts.Add(implementationSummary);
            parts.Add(referenceSummary);
            parts.Add(blockSummary);
        }

        return String.Join(", ", parts.ToArray());
    }
}
