using System;
using System.Collections.Generic;

public enum AscetClassPrimaryAnalysisKind
{
    Unknown = 0,
    MethodCode = 1,
    BlockDiagram = 2,
    TextCode = 3
}

public sealed class AscetClassRef
{
    public string Name { get; set; }
    public string Path { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
}

public sealed class AscetClassCapabilities
{
    public AscetClassPrimaryAnalysisKind PrimaryAnalysis { get; set; }
    public bool SupportsMethodCode { get; set; }
    public bool SupportsBlockDiagram { get; set; }
    public bool SupportsTextCode { get; set; }
    public bool SupportsImplementation { get; set; }
    public bool SupportsReferenceGraph { get; set; }
    public bool SupportsMethodWrite { get; set; }
}

public sealed class AscetClassSummary
{
    public AscetClassRef ClassRef { get; set; }
    public AscetClassCapabilities Capabilities { get; set; }
    public int ElementCount { get; set; }
    public int MethodCount { get; set; }
    public int DiagramCount { get; set; }
    public string SummaryText { get; set; }
}

public sealed class AscetClassElementRef
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

public sealed class AscetClassMethodAnalysisRef
{
    public AscetMethodCode Method { get; set; }
    public AscetCodeAnalysisRef CodeAnalysis { get; set; }
}

public sealed class AscetClassSnapshot
{
    public AscetClassRef ClassRef { get; set; }
    public AscetClassSummary Summary { get; set; }
    public AscetClassCapabilities Capabilities { get; set; }
    public IList<AscetClassElementRef> Elements { get; set; }
    public IList<AscetMethodCode> Methods { get; set; }
    public IList<AscetClassMethodAnalysisRef> MethodAnalyses { get; set; }
    public AscetTextCode TextCode { get; set; }
    public IList<AscetDiagramRef> Diagrams { get; set; }
    public AscetBlockDiagramGraph PrimaryBlockGraph { get; set; }
    public AscetImplementationSnapshot Implementation { get; set; }
    public AscetReferenceGraphSummary References { get; set; }
    public string SummaryText { get; set; }
}

public sealed class AscetClassDiffSummary
{
    public string LeftClassPath { get; set; }
    public string RightClassPath { get; set; }
    public IList<AscetMethodCodeDiffRef> MethodDiffs { get; set; }
    public IList<AscetImplementationElementDiffRef> ImplementationDiffs { get; set; }
    public IList<AscetNamedDiffRef> ReferenceDiffs { get; set; }
    public IList<AscetNamedDiffRef> BlockDiffs { get; set; }
    public string Summary { get; set; }
}

public interface IClassLocatorService
{
    AscetClassRef GetClass(string classPath);
}

public interface IClassSummaryService
{
    AscetClassSummary GetSummary(AscetClassRef cls);
}

public interface IClassElementService
{
    IList<AscetClassElementRef> ListElements(AscetClassRef cls);
}

public interface IClassMethodService
{
    IList<AscetMethodRef> ListMethods(AscetClassRef cls);
    IList<AscetMethodCode> GetAllMethodCodes(AscetClassRef cls);
}

public interface IClassDiagramService
{
    IList<AscetDiagramRef> ListDiagrams(AscetClassRef cls);
}

public interface IClassImplementationService
{
    AscetImplementationCatalog ListImplementations(AscetClassRef cls);
    AscetImplementationSnapshot ReadImplementation(AscetClassRef cls, AscetImplementationReadMode mode, string implementationName);
}

public interface IClassReferenceService
{
    AscetReferenceGraphSummary GetReferenceGraph(AscetClassRef cls);
}

public interface IClassSnapshotService
{
    AscetClassSnapshot GetSnapshot(AscetClassRef cls);
}

public interface IClassDiffService
{
    AscetClassDiffSummary GetDiff(AscetClassRef left, AscetClassRef right);
}

public interface IClassWriteService
{
    AscetMethodWriteResult SetMethodCode(AscetClassRef cls, string methodName, string code, bool verifyReadback);
}

public interface IClassAnalysisRouter
{
    AscetClassCapabilities GetCapabilities(AscetClassRef cls);
    string ResolvePrimaryBlockDiagramName(AscetClassRef cls, IList<AscetDiagramRef> diagrams);
}

public interface IEsdlClassAnalysisService
{
    IList<AscetClassMethodAnalysisRef> AnalyzeAllMethods(AscetClassRef cls, IList<AscetMethodCode> methods, AscetReferenceGraphSummary references);
}

public interface IBdeClassAnalysisService
{
    AscetBlockDiagramGraph GetPrimaryBlockGraph(AscetClassRef cls, IList<AscetDiagramRef> diagrams);
}

public interface ICClassAnalysisService
{
    AscetTextCode GetTextCode(AscetClassRef cls);
}

public static class AscetClassDomainUtilities
{
    public static AscetClassRef ToClassRef(AscetItemRef item)
    {
        if (item == null)
        {
            return null;
        }

        return new AscetClassRef
        {
            Name = item.Name,
            Path = item.Path,
            LanguageKind = item.LanguageKind
        };
    }

    public static AscetItemRef ToItemRef(AscetClassRef cls)
    {
        if (cls == null)
        {
            return null;
        }

        return new AscetItemRef
        {
            Name = cls.Name,
            Path = cls.Path,
            Kind = AscetComponentKind.Class,
            LanguageKind = cls.LanguageKind
        };
    }

    public static string GetDisplayName(AscetClassRef cls)
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

    public static AscetClassSummary BuildSummary(AscetClassRef cls, AscetClassCapabilities capabilities, int elementCount, int methodCount, int diagramCount)
    {
        return new AscetClassSummary
        {
            ClassRef = cls,
            Capabilities = capabilities,
            ElementCount = elementCount,
            MethodCount = methodCount,
            DiagramCount = diagramCount,
            SummaryText = BuildSummaryText(cls, elementCount, methodCount, diagramCount)
        };
    }

    public static string BuildSummaryText(AscetClassRef cls, int elementCount, int methodCount, int diagramCount)
    {
        return "Class " + GetDisplayName(cls) + " [" + (cls == null ? AscetLanguageKind.Unknown.ToString() : cls.LanguageKind.ToString()) + "] has " + elementCount.ToString() + " " + Pluralize("element", elementCount) + ", " + methodCount.ToString() + " " + Pluralize("method", methodCount) + ", and " + diagramCount.ToString() + " " + Pluralize("diagram", diagramCount);
    }

    public static string BuildSnapshotSummaryText(AscetClassRef cls)
    {
        return "Class snapshot for " + GetDisplayName(cls);
    }

    private static string Pluralize(string noun, int count)
    {
        return count == 1 ? noun : noun + "s";
    }
}

public sealed class ClassAnalysisRouter : IClassAnalysisRouter
{
    public AscetClassCapabilities GetCapabilities(AscetClassRef cls)
    {
        AscetLanguageKind language = cls == null ? AscetLanguageKind.Unknown : cls.LanguageKind;
        switch (language)
        {
            case AscetLanguageKind.ESDL:
                return new AscetClassCapabilities
                {
                    PrimaryAnalysis = AscetClassPrimaryAnalysisKind.MethodCode,
                    SupportsMethodCode = true,
                    SupportsBlockDiagram = false,
                    SupportsTextCode = false,
                    SupportsImplementation = true,
                    SupportsReferenceGraph = true,
                    SupportsMethodWrite = true
                };

            case AscetLanguageKind.BDE:
                return new AscetClassCapabilities
                {
                    PrimaryAnalysis = AscetClassPrimaryAnalysisKind.BlockDiagram,
                    SupportsMethodCode = true,
                    SupportsBlockDiagram = true,
                    SupportsTextCode = false,
                    SupportsImplementation = true,
                    SupportsReferenceGraph = true,
                    SupportsMethodWrite = true
                };

            case AscetLanguageKind.C:
                return new AscetClassCapabilities
                {
                    PrimaryAnalysis = AscetClassPrimaryAnalysisKind.TextCode,
                    SupportsMethodCode = true,
                    SupportsBlockDiagram = false,
                    SupportsTextCode = true,
                    SupportsImplementation = true,
                    SupportsReferenceGraph = true,
                    SupportsMethodWrite = true
                };

            default:
                return new AscetClassCapabilities
                {
                    PrimaryAnalysis = AscetClassPrimaryAnalysisKind.Unknown,
                    SupportsMethodCode = false,
                    SupportsBlockDiagram = false,
                    SupportsTextCode = false,
                    SupportsImplementation = false,
                    SupportsReferenceGraph = false,
                    SupportsMethodWrite = false
                };
        }
    }

    public string ResolvePrimaryBlockDiagramName(AscetClassRef cls, IList<AscetDiagramRef> diagrams)
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

public sealed class ClassLocatorService : IClassLocatorService
{
    private readonly IComponentLocatorService locatorService;

    public ClassLocatorService()
        : this(new ComponentLocatorService())
    {
    }

    public ClassLocatorService(IComponentLocatorService locatorService)
    {
        this.locatorService = locatorService;
    }

    public AscetClassRef GetClass(string classPath)
    {
        if (String.IsNullOrWhiteSpace(classPath))
        {
            throw new AscetReadException("invalid_argument", "get_class", "Class path must not be empty.");
        }

        AscetItemPath parsed = AscetItemPath.Parse(classPath);
        AscetItemRef item = locatorService.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
        if (item == null || item.Kind != AscetComponentKind.Class)
        {
            throw new AscetReadException("unsupported_component_kind", "get_class", "Item '" + classPath + "' is not a class.");
        }

        return AscetClassDomainUtilities.ToClassRef(item);
    }
}

public sealed class ClassMethodService : IClassMethodService
{
    private readonly IMethodCatalogService methodCatalogService;
    private readonly IMethodCodeService methodCodeService;

    public ClassMethodService()
        : this(new MethodCatalogService(), new MethodCatalogService())
    {
    }

    public ClassMethodService(IMethodCatalogService methodCatalogService, IMethodCodeService methodCodeService)
    {
        this.methodCatalogService = methodCatalogService;
        this.methodCodeService = methodCodeService;
    }

    public IList<AscetMethodRef> ListMethods(AscetClassRef cls)
    {
        return methodCatalogService.ListMethods(AscetClassDomainUtilities.ToItemRef(cls));
    }

    public IList<AscetMethodCode> GetAllMethodCodes(AscetClassRef cls)
    {
        return methodCodeService.GetAllMethodCodes(AscetClassDomainUtilities.ToItemRef(cls));
    }
}
public sealed class ClassDiagramService : IClassDiagramService
{
    private readonly IDiagramCatalogService diagramCatalogService;

    public ClassDiagramService()
        : this(new DiagramCatalogService())
    {
    }

    public ClassDiagramService(IDiagramCatalogService diagramCatalogService)
    {
        this.diagramCatalogService = diagramCatalogService;
    }

    public IList<AscetDiagramRef> ListDiagrams(AscetClassRef cls)
    {
        return diagramCatalogService.ListDiagrams(AscetClassDomainUtilities.ToItemRef(cls));
    }
}

public sealed class ClassImplementationService : IClassImplementationService
{
    private readonly IImplementationReadService implementationReadService;

    public ClassImplementationService()
        : this(new ImplementationReadService())
    {
    }

    public ClassImplementationService(IImplementationReadService implementationReadService)
    {
        this.implementationReadService = implementationReadService;
    }

    public AscetImplementationCatalog ListImplementations(AscetClassRef cls)
    {
        return implementationReadService.ListImplementations(AscetClassDomainUtilities.ToItemRef(cls));
    }

    public AscetImplementationSnapshot ReadImplementation(AscetClassRef cls, AscetImplementationReadMode mode, string implementationName)
    {
        return implementationReadService.ReadImplementation(AscetClassDomainUtilities.ToItemRef(cls), mode, implementationName);
    }
}

public sealed class ClassReferenceService : IClassReferenceService
{
    private readonly IReferenceReadService referenceReadService;

    public ClassReferenceService()
        : this(new ReferenceReadService())
    {
    }

    public ClassReferenceService(IReferenceReadService referenceReadService)
    {
        this.referenceReadService = referenceReadService;
    }

    public AscetReferenceGraphSummary GetReferenceGraph(AscetClassRef cls)
    {
        return referenceReadService.GetReferenceGraph(AscetClassDomainUtilities.ToItemRef(cls));
    }
}

public sealed class ClassWriteService : IClassWriteService
{
    private readonly IMethodWriteService methodWriteService;

    public ClassWriteService()
        : this(new MethodWriteService())
    {
    }

    public ClassWriteService(IMethodWriteService methodWriteService)
    {
        this.methodWriteService = methodWriteService;
    }

    public AscetMethodWriteResult SetMethodCode(AscetClassRef cls, string methodName, string code, bool verifyReadback)
    {
        if (cls == null)
        {
            throw new AscetReadException("invalid_argument", "set_class_method_code", "Class reference must not be null.");
        }

        return methodWriteService.SetMethodCode(AscetClassDomainUtilities.ToItemRef(cls), methodName, code, verifyReadback);
    }
}

public sealed class EsdlClassAnalysisService : IEsdlClassAnalysisService
{
    private readonly IEsdlAnalysisService esdlAnalysisService;

    public EsdlClassAnalysisService()
        : this(new EsdlAnalysisService())
    {
    }

    public EsdlClassAnalysisService(IEsdlAnalysisService esdlAnalysisService)
    {
        this.esdlAnalysisService = esdlAnalysisService;
    }

    public IList<AscetClassMethodAnalysisRef> AnalyzeAllMethods(AscetClassRef cls, IList<AscetMethodCode> methods, AscetReferenceGraphSummary references)
    {
        List<AscetClassMethodAnalysisRef> analyses = new List<AscetClassMethodAnalysisRef>();
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
            analyses.Add(new AscetClassMethodAnalysisRef
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

public sealed class BdeClassAnalysisService : IBdeClassAnalysisService
{
    private readonly IBlockDiagramReadService blockDiagramReadService;
    private readonly IClassAnalysisRouter router;

    public BdeClassAnalysisService()
        : this(new BlockDiagramReadService(), new ClassAnalysisRouter())
    {
    }

    public BdeClassAnalysisService(IBlockDiagramReadService blockDiagramReadService, IClassAnalysisRouter router)
    {
        this.blockDiagramReadService = blockDiagramReadService;
        this.router = router;
    }

    public AscetBlockDiagramGraph GetPrimaryBlockGraph(AscetClassRef cls, IList<AscetDiagramRef> diagrams)
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

        return blockDiagramReadService.GetBlockDiagramGraph(AscetClassDomainUtilities.ToItemRef(cls), diagramName);
    }
}

public sealed class CClassAnalysisService : ICClassAnalysisService
{
    private readonly ITextCodeService textCodeService;

    public CClassAnalysisService()
        : this(new TextCodeService())
    {
    }

    public CClassAnalysisService(ITextCodeService textCodeService)
    {
        this.textCodeService = textCodeService;
    }

    public AscetTextCode GetTextCode(AscetClassRef cls)
    {
        if (cls == null || cls.LanguageKind != AscetLanguageKind.C)
        {
            return null;
        }

        return textCodeService.GetTextCode(AscetClassDomainUtilities.ToItemRef(cls));
    }
}

public sealed class ClassElementService : IClassElementService
{
    private readonly IClassImplementationService implementationService;
    private readonly IClassReferenceService referenceService;

    public ClassElementService()
        : this(new ClassImplementationService(), new ClassReferenceService())
    {
    }

    public ClassElementService(IClassImplementationService implementationService, IClassReferenceService referenceService)
    {
        this.implementationService = implementationService;
        this.referenceService = referenceService;
    }

    public IList<AscetClassElementRef> ListElements(AscetClassRef cls)
    {
        Dictionary<string, AscetClassElementRef> elementsByName = new Dictionary<string, AscetClassElementRef>(StringComparer.Ordinal);
        List<AscetClassElementRef> ordered = new List<AscetClassElementRef>();

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

                AscetClassElementRef mapped = new AscetClassElementRef
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

                AscetClassElementRef existing;
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

                AscetClassElementRef mapped = new AscetClassElementRef
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

    private AscetImplementationSnapshot TryReadImplementation(AscetClassRef cls)
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

    private AscetReferenceGraphSummary TryReadReferences(AscetClassRef cls)
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

public sealed class ClassSummaryService : IClassSummaryService
{
    private readonly IClassElementService elementService;
    private readonly IClassMethodService methodService;
    private readonly IClassDiagramService diagramService;
    private readonly IClassAnalysisRouter router;

    public ClassSummaryService()
        : this(new ClassElementService(), new ClassMethodService(), new ClassDiagramService(), new ClassAnalysisRouter())
    {
    }

    public ClassSummaryService(IClassElementService elementService, IClassMethodService methodService, IClassDiagramService diagramService, IClassAnalysisRouter router)
    {
        this.elementService = elementService;
        this.methodService = methodService;
        this.diagramService = diagramService;
        this.router = router;
    }

    public AscetClassSummary GetSummary(AscetClassRef cls)
    {
        IList<AscetClassElementRef> elements = elementService.ListElements(cls);
        IList<AscetMethodCode> methods = methodService.GetAllMethodCodes(cls);
        IList<AscetDiagramRef> diagrams = diagramService.ListDiagrams(cls);
        AscetClassCapabilities capabilities = router.GetCapabilities(cls);
        return AscetClassDomainUtilities.BuildSummary(cls, capabilities, elements == null ? 0 : elements.Count, methods == null ? 0 : methods.Count, diagrams == null ? 0 : diagrams.Count);
    }
}
public sealed class ClassSnapshotService : IClassSnapshotService
{
    private readonly IClassElementService elementService;
    private readonly IClassMethodService methodService;
    private readonly IClassDiagramService diagramService;
    private readonly IClassImplementationService implementationService;
    private readonly IClassReferenceService referenceService;
    private readonly IEsdlClassAnalysisService esdlAnalysisService;
    private readonly IBdeClassAnalysisService bdeAnalysisService;
    private readonly ICClassAnalysisService cClassAnalysisService;
    private readonly IClassAnalysisRouter router;

    public ClassSnapshotService()
        : this(new ClassElementService(), new ClassMethodService(), new ClassDiagramService(), new ClassImplementationService(), new ClassReferenceService(), new EsdlClassAnalysisService(), new BdeClassAnalysisService(), new CClassAnalysisService(), new ClassAnalysisRouter())
    {
    }

    public ClassSnapshotService(
        IClassElementService elementService,
        IClassMethodService methodService,
        IClassDiagramService diagramService,
        IClassImplementationService implementationService,
        IClassReferenceService referenceService,
        IEsdlClassAnalysisService esdlAnalysisService,
        IBdeClassAnalysisService bdeAnalysisService,
        ICClassAnalysisService cClassAnalysisService,
        IClassAnalysisRouter router)
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

    public AscetClassSnapshot GetSnapshot(AscetClassRef cls)
    {
        AscetClassCapabilities capabilities = router.GetCapabilities(cls);
        IList<AscetClassElementRef> elements = elementService.ListElements(cls) ?? new List<AscetClassElementRef>();
        IList<AscetMethodCode> methods = methodService.GetAllMethodCodes(cls) ?? new List<AscetMethodCode>();
        IList<AscetDiagramRef> diagrams = diagramService.ListDiagrams(cls) ?? new List<AscetDiagramRef>();
        AscetImplementationSnapshot implementation = TryReadImplementation(cls);
        AscetReferenceGraphSummary references = TryReadReferences(cls);
        IList<AscetClassMethodAnalysisRef> methodAnalyses = esdlAnalysisService.AnalyzeAllMethods(cls, methods, references) ?? new List<AscetClassMethodAnalysisRef>();
        AscetTextCode textCode = capabilities.SupportsTextCode ? TryReadTextCode(cls) : null;
        AscetBlockDiagramGraph primaryBlockGraph = capabilities.SupportsBlockDiagram ? bdeAnalysisService.GetPrimaryBlockGraph(cls, diagrams) : null;
        AscetClassSummary summary = AscetClassDomainUtilities.BuildSummary(cls, capabilities, elements.Count, methods.Count, diagrams.Count);

        return new AscetClassSnapshot
        {
            ClassRef = cls,
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
            SummaryText = AscetClassDomainUtilities.BuildSnapshotSummaryText(cls)
        };
    }

    private AscetImplementationSnapshot TryReadImplementation(AscetClassRef cls)
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

    private AscetReferenceGraphSummary TryReadReferences(AscetClassRef cls)
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

    private AscetTextCode TryReadTextCode(AscetClassRef cls)
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

public sealed class ClassDiffService : IClassDiffService
{
    private readonly IClassMethodService methodService;
    private readonly IClassImplementationService implementationService;
    private readonly IClassReferenceService referenceService;
    private readonly IClassDiagramService diagramService;
    private readonly IBdeClassAnalysisService bdeAnalysisService;
    private readonly IClassAnalysisRouter router;

    public ClassDiffService()
        : this(new ClassMethodService(), new ClassImplementationService(), new ClassReferenceService(), new ClassDiagramService(), new BdeClassAnalysisService(), new ClassAnalysisRouter())
    {
    }

    public ClassDiffService(
        IClassMethodService methodService,
        IClassImplementationService implementationService,
        IClassReferenceService referenceService,
        IClassDiagramService diagramService,
        IBdeClassAnalysisService bdeAnalysisService,
        IClassAnalysisRouter router)
    {
        this.methodService = methodService;
        this.implementationService = implementationService;
        this.referenceService = referenceService;
        this.diagramService = diagramService;
        this.bdeAnalysisService = bdeAnalysisService;
        this.router = router;
    }

    public AscetClassDiffSummary GetDiff(AscetClassRef left, AscetClassRef right)
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

        return new AscetClassDiffSummary
        {
            LeftClassPath = left == null ? String.Empty : (left.Path ?? String.Empty),
            RightClassPath = right == null ? String.Empty : (right.Path ?? String.Empty),
            MethodDiffs = methodDiffs,
            ImplementationDiffs = implementationDiffs,
            ReferenceDiffs = referenceDiffs,
            BlockDiffs = blockDiffs,
            Summary = BuildSummary(methodDiffs, implementationDiffs, referenceDiffs, blockDiffs)
        };
    }

    private AscetImplementationSnapshot TryReadImplementation(AscetClassRef cls)
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

    private AscetReferenceGraphSummary TryReadReferences(AscetClassRef cls)
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

    private AscetBlockDiagramGraph TryReadPrimaryBlockGraph(AscetClassRef cls)
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
