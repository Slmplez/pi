using System;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public enum AscetImplementationReadMode
{
    Default = 0,
    Class = 1,
    Named = 2
}

public sealed class AscetImplementationSnapshot
{
    public string ComponentPath { get; set; }
    public AscetComponentKind ComponentKind { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
    public string ImplementationSourceKind { get; set; }
    public AscetImplementationReadMode Mode { get; set; }
    public string RequestedImplementationName { get; set; }
    public string ResolvedImplementationName { get; set; }
    public string MemoryLocation { get; set; }
    public bool OptionGenerateMethodBody { get; set; }
    public bool OptionOptimizeMethodCalls { get; set; }
    public IList<AscetElementImplementationRef> Elements { get; set; }
    public AscetTypeDefinitionRef TypeDefinition { get; set; }
}

public sealed class AscetImplementationCatalog
{
    public string ComponentPath { get; set; }
    public AscetComponentKind ComponentKind { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
    public string ImplementationSourceKind { get; set; }
    public string DefaultImplementationName { get; set; }
    public string ClassImplementationName { get; set; }
    public IList<AscetImplementationListEntry> Implementations { get; set; }
}

public sealed class AscetImplementationListEntry
{
    public string Name { get; set; }
    public bool IsDefault { get; set; }
    public bool IsClassImplementation { get; set; }
}

public sealed class AscetElementImplementationRef
{
    public string ElementName { get; set; }
    public string ElementKind { get; set; }
    public bool IsPrimitive { get; set; }
    public string DisplayType { get; set; }
    public string DisplayScope { get; set; }
    public string DisplayKind { get; set; }
    public string CanonicalScope { get; set; }
    public string CanonicalKind { get; set; }
    public string MessageKind { get; set; }
    public bool IsVolatile { get; set; }
    public string DisplayMemory { get; set; }
    public bool IsCalibration { get; set; }
    public string DisplayCalibration { get; set; }
    public string Unit { get; set; }
    public string Comment { get; set; }
    public string ImplementationItemKind { get; set; }
    public string MemoryLocation { get; set; }
    public string RecordLayout { get; set; }
    public string ImplType { get; set; }
    public string ModelType { get; set; }
    public string AdditionalInfo { get; set; }
    public string ChildImplementationName { get; set; }
    public string ReferencedComponentPath { get; set; }
    public IList<AscetElementImplementationRef> ChildElements { get; set; }
    public IList<AscetImplInfoBinding> ImplInfos { get; set; }
}

public sealed class AscetImplInfoBinding
{
    public string Role { get; set; }
    public AscetImplInfoRef Info { get; set; }
}

public sealed class AscetImplInfoRef
{
    public string ImplType { get; set; }
    public string FormulaName { get; set; }
    public string Quantization { get; set; }
    public string AdditionalInfo { get; set; }
    public bool LimitAssignment { get; set; }
    public bool LimitOverflow { get; set; }
    public string OverflowStrategy { get; set; }
    public bool IsMasterModel { get; set; }
    public string IntegerImplRange { get; set; }
    public string IntegerPhysicalRange { get; set; }
    public string LongImplRange { get; set; }
    public string LongPhysicalRange { get; set; }
    public string FloatImplRange { get; set; }
    public string FloatPhysicalRange { get; set; }
    public string DoubleImplRange { get; set; }
    public string DoublePhysicalRange { get; set; }
}

public sealed class AscetTypeDefinitionRef
{
    public string Name { get; set; }
    public IList<string> Enumerators { get; set; }
}

public interface IImplementationReadService
{
    AscetImplementationSnapshot ReadImplementation(AscetItemRef component, AscetImplementationReadMode mode, string implementationName);
    AscetImplementationCatalog ListImplementations(AscetItemRef component);
}

public sealed class ImplementationReadService : AscetReadDomainServiceBase, IImplementationReadService
{
    public AscetImplementationSnapshot ReadImplementation(AscetItemRef component, AscetImplementationReadMode mode, string implementationName)
    {
        return ExecuteWithSession("read_implementation", delegate(AscetSession session)
        {
            if (component == null)
            {
                throw new AscetReadException("invalid_argument", "read_implementation", "Component reference must not be null.");
            }

            DataBaseItem item = ResolveItemByPath(session, component.Path);
            AscetItemRef resolvedComponent = Classifier.ToItemRef(item);

            if (resolvedComponent != null && resolvedComponent.Kind == AscetComponentKind.Enumeration)
            {
                return BuildTypeDefinitionSnapshot(resolvedComponent, item, mode, implementationName);
            }

            object implementationHost = ResolveImplementationHost(item);
            if (implementationHost == null)
            {
                return BuildElementImplementationSnapshot(resolvedComponent, item, mode, implementationName, component.Path);
            }

            ImplConfiguration implementation = ResolveImplementationConfiguration(implementationHost, mode, implementationName, component.Path);

            Array modelElements = ResolveModelElements(implementationHost, component.Path, "read_implementation");
            IList<AscetElementImplementationRef> elementRefs = BuildElementImplementationRefs(
                implementation,
                modelElements,
                new HashSet<string>(StringComparer.Ordinal));

            return new AscetImplementationSnapshot
            {
                ComponentPath = resolvedComponent.Path,
                ComponentKind = resolvedComponent.Kind,
                LanguageKind = resolvedComponent.LanguageKind,
                ImplementationSourceKind = "ImplementationConfiguration",
                Mode = mode,
                RequestedImplementationName = implementationName,
                ResolvedImplementationName = SafeGetString(implementation, "GetName"),
                MemoryLocation = SafeGetString(implementation, "GetMemoryLocation"),
                OptionGenerateMethodBody = SafeGetBool(implementation, "GetOptionGenerateMethodBody"),
                OptionOptimizeMethodCalls = SafeGetBool(implementation, "GetOptionOptimizeMethodCalls"),
                Elements = elementRefs
            };
        });
    }

    public AscetImplementationCatalog ListImplementations(AscetItemRef component)
    {
        return ExecuteWithSession("list_implementations", delegate(AscetSession session)
        {
            if (component == null)
            {
                throw new AscetReadException("invalid_argument", "list_implementations", "Component reference must not be null.");
            }

            DataBaseItem item = ResolveItemByPath(session, component.Path);
            AscetItemRef resolvedComponent = Classifier.ToItemRef(item);
            if (resolvedComponent != null && resolvedComponent.Kind == AscetComponentKind.Enumeration)
            {
                return BuildFallbackCatalog(resolvedComponent, "TypeDefinition");
            }

            object implementationHost = ResolveImplementationHost(item);
            if (implementationHost == null)
            {
                return BuildFallbackCatalog(resolvedComponent, "ElementImplementation");
            }

            ImplConfiguration defaultImplementation = TryGetImplementation(implementationHost, "GetDefaultImplementation");
            ImplConfiguration classImplementation = TryGetImplementation(implementationHost, "GetClassImplementation");
            ImplConfiguration[] implementations = TryGetImplementations(implementationHost);

            string defaultName = SafeGetString(defaultImplementation, "GetName");
            string className = SafeGetString(classImplementation, "GetName");
            List<AscetImplementationListEntry> entries = new List<AscetImplementationListEntry>();
            Dictionary<string, bool> seen = new Dictionary<string, bool>(StringComparer.Ordinal);

            AddImplementationEntries(entries, seen, implementations, defaultName, className);
            if (!String.IsNullOrWhiteSpace(defaultName) && !seen.ContainsKey(defaultName))
            {
                entries.Add(new AscetImplementationListEntry
                {
                    Name = defaultName,
                    IsDefault = true,
                    IsClassImplementation = String.Equals(defaultName, className, StringComparison.Ordinal)
                });
                seen[defaultName] = true;
            }

            return new AscetImplementationCatalog
            {
                ComponentPath = resolvedComponent.Path,
                ComponentKind = resolvedComponent.Kind,
                LanguageKind = resolvedComponent.LanguageKind,
                ImplementationSourceKind = "ImplementationConfiguration",
                DefaultImplementationName = defaultName,
                ClassImplementationName = className,
                Implementations = entries
            };
        });
    }

    private void AddImplementationEntries(
        IList<AscetImplementationListEntry> entries,
        IDictionary<string, bool> seen,
        ImplConfiguration[] implementations,
        string defaultName,
        string className)
    {
        if (entries == null || seen == null || implementations == null)
        {
            return;
        }

        for (int i = 0; i < implementations.Length; i++)
        {
            ImplConfiguration implementation = implementations[i];
            string name = SafeGetString(implementation, "GetName");
            if (String.IsNullOrWhiteSpace(name) || seen.ContainsKey(name))
            {
                continue;
            }

            entries.Add(new AscetImplementationListEntry
            {
                Name = name,
                IsDefault = String.Equals(name, defaultName, StringComparison.Ordinal),
                IsClassImplementation = String.Equals(name, className, StringComparison.Ordinal)
            });
            seen[name] = true;
        }
    }

    private ImplConfiguration ResolveImplementationConfiguration(
        object implementationHost,
        AscetImplementationReadMode mode,
        string implementationName,
        string componentPath)
    {
        ImplConfiguration implementation = null;
        switch (mode)
        {
            case AscetImplementationReadMode.Default:
                implementation = TryGetImplementation(implementationHost, "GetDefaultImplementation");
                if (implementation == null)
                {
                    throw new AscetReadException(
                        "implementation_not_found",
                        "resolve_implementation_configuration",
                        "Default implementation was not found for component '" + componentPath + "'.");
                }
                return implementation;

            case AscetImplementationReadMode.Class:
                implementation = TryGetImplementation(implementationHost, "GetClassImplementation");
                if (implementation == null)
                {
                    throw new AscetReadException(
                        "implementation_not_found",
                        "resolve_implementation_configuration",
                        "Class implementation was not found for component '" + componentPath + "'.");
                }
                return implementation;

            case AscetImplementationReadMode.Named:
                if (String.IsNullOrWhiteSpace(implementationName))
                {
                    throw new AscetReadException(
                        "invalid_argument",
                        "resolve_implementation_configuration",
                        "Implementation name must not be empty in named mode.");
                }

                implementation = TryGetImplementationByName(implementationHost, implementationName.Trim());
                if (implementation == null)
                {
                    throw new AscetReadException(
                        "implementation_not_found",
                        "resolve_implementation_configuration",
                        "Implementation '" + implementationName + "' was not found in component '" + componentPath + "'.");
                }
                return implementation;

            default:
                throw new AscetReadException(
                    "invalid_argument",
                    "resolve_implementation_configuration",
                    "Unsupported implementation read mode '" + mode.ToString() + "'.");
        }
    }

    private IList<AscetElementImplementationRef> BuildElementImplementationRefs(
        ImplConfiguration implementation,
        Array modelElements,
        ISet<string> recursionGuard)
    {
        List<AscetElementImplementationRef> elementRefs = new List<AscetElementImplementationRef>();
        if (modelElements == null)
        {
            return elementRefs;
        }

        for (int i = 0; i < modelElements.Length; i++)
        {
            object modelElement = modelElements.GetValue(i);
            if (modelElement == null)
            {
                continue;
            }

            elementRefs.Add(BuildElementImplementationRef(implementation, modelElement, recursionGuard));
        }

        return elementRefs;
    }

    private AscetImplementationCatalog BuildFallbackCatalog(AscetItemRef component, string sourceKind)
    {
        return new AscetImplementationCatalog
        {
            ComponentPath = component == null ? String.Empty : (component.Path ?? String.Empty),
            ComponentKind = component == null ? AscetComponentKind.Unknown : component.Kind,
            LanguageKind = component == null ? AscetLanguageKind.Unknown : component.LanguageKind,
            ImplementationSourceKind = sourceKind ?? String.Empty,
            DefaultImplementationName = String.Empty,
            ClassImplementationName = String.Empty,
            Implementations = new List<AscetImplementationListEntry>()
        };
    }

    private AscetImplementationSnapshot BuildElementImplementationSnapshot(
        AscetItemRef component,
        DataBaseItem item,
        AscetImplementationReadMode mode,
        string implementationName,
        string componentPath)
    {
        Array modelElements = ResolveModelElementsIfAvailable(item);
        if (modelElements == null)
        {
            throw new AscetReadException(
                "unsupported_component_kind",
                "read_implementation",
                "Item '" + componentPath + "' has no implementation configuration and exposes no model elements.");
        }

        return new AscetImplementationSnapshot
        {
            ComponentPath = component == null ? componentPath : (component.Path ?? componentPath),
            ComponentKind = component == null ? AscetComponentKind.Unknown : component.Kind,
            LanguageKind = component == null ? AscetLanguageKind.Unknown : component.LanguageKind,
            ImplementationSourceKind = "ElementImplementation",
            Mode = mode,
            RequestedImplementationName = implementationName,
            ResolvedImplementationName = String.Empty,
            MemoryLocation = String.Empty,
            OptionGenerateMethodBody = false,
            OptionOptimizeMethodCalls = false,
            Elements = BuildElementImplementationRefs(
                null,
                modelElements,
                new HashSet<string>(StringComparer.Ordinal))
        };
    }

    private AscetImplementationSnapshot BuildTypeDefinitionSnapshot(
        AscetItemRef component,
        DataBaseItem item,
        AscetImplementationReadMode mode,
        string implementationName)
    {
        AscetTypeDefinitionRef typeDefinition = BuildTypeDefinition(item, component);
        return new AscetImplementationSnapshot
        {
            ComponentPath = component == null ? String.Empty : (component.Path ?? String.Empty),
            ComponentKind = component == null ? AscetComponentKind.Unknown : component.Kind,
            LanguageKind = component == null ? AscetLanguageKind.Unknown : component.LanguageKind,
            ImplementationSourceKind = "TypeDefinition",
            Mode = mode,
            RequestedImplementationName = implementationName,
            ResolvedImplementationName = String.Empty,
            MemoryLocation = String.Empty,
            OptionGenerateMethodBody = false,
            OptionOptimizeMethodCalls = false,
            Elements = new List<AscetElementImplementationRef>(),
            TypeDefinition = typeDefinition
        };
    }

    private AscetTypeDefinitionRef BuildTypeDefinition(DataBaseItem item, AscetItemRef component)
    {
        return new AscetTypeDefinitionRef
        {
            Name = SafeGetString(item, "GetName"),
            Enumerators = ReadEnumeratorNames(item)
        };
    }

    private IList<string> ReadEnumeratorNames(object enumeration)
    {
        List<string> result = new List<string>();
        Array entries =
            InvokeOptional(enumeration, "GetAllEnumerators") as Array ??
            InvokeOptional(enumeration, "GetEnumerators") as Array ??
            InvokeOptional(enumeration, "GetAllValues") as Array ??
            InvokeOptional(enumeration, "GetValues") as Array ??
            InvokeOptional(enumeration, "GetAllItems") as Array;

        if (entries == null)
        {
            return result;
        }

        for (int i = 0; i < entries.Length; i++)
        {
            object entry = entries.GetValue(i);
            string name = SafeGetString(entry, "GetName");
            if (String.IsNullOrWhiteSpace(name) && entry != null)
            {
                name = entry.ToString();
            }

            if (!String.IsNullOrWhiteSpace(name) && !result.Contains(name))
            {
                result.Add(name);
            }
        }

        return result;
    }

    private object ResolveImplementationHost(DataBaseItem item)
    {
        if (item == null)
        {
            return null;
        }

        if (HasImplementationCapability(item))
        {
            return item;
        }

        CodeComponent codeComponent = item as CodeComponent;
        if (codeComponent != null && HasImplementationCapability(codeComponent))
        {
            return codeComponent;
        }

        return null;
    }

    private bool HasImplementationCapability(object target)
    {
        if (target == null)
        {
            return false;
        }

        if (TryGetImplementation(target, "GetDefaultImplementation") != null)
        {
            return true;
        }

        if (TryGetImplementation(target, "GetClassImplementation") != null)
        {
            return true;
        }

        ImplConfiguration[] implementations = TryGetImplementations(target);
        return implementations != null && implementations.Length > 0;
    }

    private Array ResolveModelElements(object implementationHost, string componentPath, string operation)
    {
        Array modelElements = ResolveModelElementsIfAvailable(implementationHost);
        if (modelElements != null)
        {
            return modelElements;
        }

        throw new AscetReadException(
            "unsupported_component_kind",
            operation,
            "Item '" + componentPath + "' exposes implementation configuration but no model elements.");
    }

    private Array ResolveModelElementsIfAvailable(object target)
    {
        return InvokeOptional(target, "GetAllModelElements") as Array;
    }

    private ImplConfiguration TryGetImplementation(object target, string methodName)
    {
        object value = InvokeOptional(target, methodName);
        return value as ImplConfiguration;
    }

    private ImplConfiguration TryGetImplementationByName(object target, string implementationName)
    {
        if (target == null || String.IsNullOrWhiteSpace(implementationName))
        {
            return null;
        }

        try
        {
            MethodInfo method = target.GetType().GetMethod(
                "GetImplementation",
                BindingFlags.Instance | BindingFlags.Public,
                null,
                new[] { typeof(string) },
                null);
            if (method == null)
            {
                return null;
            }

            object value = method.Invoke(target, new object[] { implementationName });
            return value as ImplConfiguration;
        }
        catch
        {
            return null;
        }
    }

    private ImplConfiguration[] TryGetImplementations(object target)
    {
        object value = InvokeOptional(target, "GetAllImplementations");
        if (value == null)
        {
            return null;
        }

        ImplConfiguration[] typed = value as ImplConfiguration[];
        if (typed != null)
        {
            return typed;
        }

        Array array = value as Array;
        if (array == null)
        {
            return null;
        }

        List<ImplConfiguration> result = new List<ImplConfiguration>();
        for (int i = 0; i < array.Length; i++)
        {
            ImplConfiguration entry = array.GetValue(i) as ImplConfiguration;
            if (entry != null)
            {
                result.Add(entry);
            }
        }

        return result.ToArray();
    }

    private AscetElementImplementationRef BuildElementImplementationRef(
        ImplConfiguration implementation,
        object modelElement,
        ISet<string> recursionGuard)
    {
        PrimitiveModelElement primitiveElement = modelElement as PrimitiveModelElement;
        if (primitiveElement != null)
        {
            return BuildPrimitiveElementImplementationRef(implementation, primitiveElement);
        }

        ComplexModelElement complexElement = modelElement as ComplexModelElement;
        if (complexElement != null)
        {
            return BuildComplexElementImplementationRef(implementation, complexElement, recursionGuard);
        }

        AscetElementImplementationRef elementRef = new AscetElementImplementationRef
        {
            ElementName = SafeGetString(modelElement, "GetName"),
            ElementKind = GetCleanTypeName(modelElement),
            IsPrimitive = false,
            ChildElements = new List<AscetElementImplementationRef>(),
            ImplInfos = new List<AscetImplInfoBinding>()
        };

        PopulateElementViewFields(elementRef, modelElement);
        return elementRef;
    }

    private AscetElementImplementationRef BuildPrimitiveElementImplementationRef(ImplConfiguration implementation, PrimitiveModelElement primitiveElement)
    {
        AscetElementImplementationRef elementRef = new AscetElementImplementationRef
        {
            ElementName = primitiveElement.GetName(),
            ElementKind = GetCleanTypeName(primitiveElement),
            IsPrimitive = true,
            ChildElements = new List<AscetElementImplementationRef>(),
            ImplInfos = new List<AscetImplInfoBinding>()
        };

        PopulateElementViewFields(elementRef, primitiveElement);

        ImplItem item = implementation == null ? null : implementation.GetItem(primitiveElement);
        if (item == null)
        {
            item = primitiveElement.GetImplementation();
        }

        if (item == null)
        {
            return elementRef;
        }

        elementRef.ImplementationItemKind = GetCleanTypeName(item);
        elementRef.MemoryLocation = SafeGetString(item, "GetMemoryLocation");

        BoolImpl boolImpl = item as BoolImpl;
        if (boolImpl != null)
        {
            elementRef.ImplType = SafeGetString(boolImpl, "GetImplType");
            elementRef.ModelType = SafeGetString(boolImpl, "GetModelType");
            elementRef.AdditionalInfo = SafeGetString(boolImpl, "GetAdditionalInfo");
            return elementRef;
        }

        ScalarImpl scalarImpl = item as ScalarImpl;
        if (scalarImpl != null)
        {
            elementRef.RecordLayout = SafeGetString(scalarImpl, "GetRecordLayout");
            AddBinding(elementRef.ImplInfos, "Value", scalarImpl.GetImplInfoForValue());
            return elementRef;
        }

        OneDTableImpl oneDTableImpl = item as OneDTableImpl;
        if (oneDTableImpl != null)
        {
            elementRef.RecordLayout = SafeGetString(oneDTableImpl, "GetRecordLayout");
            AddBinding(elementRef.ImplInfos, "Value", oneDTableImpl.GetImplInfoForValue());
            AddBinding(elementRef.ImplInfos, "Distribution", oneDTableImpl.GetImplInfoForDistribution());
            return elementRef;
        }

        TwoDTableImpl twoDTableImpl = item as TwoDTableImpl;
        if (twoDTableImpl != null)
        {
            elementRef.RecordLayout = SafeGetString(twoDTableImpl, "GetRecordLayout");
            AddBinding(elementRef.ImplInfos, "Value", twoDTableImpl.GetImplInfoForValue());
            AddBinding(elementRef.ImplInfos, "XDistribution", twoDTableImpl.GetImplInfoForXDistribution());
            AddBinding(elementRef.ImplInfos, "YDistribution", twoDTableImpl.GetImplInfoForYDistribution());
            return elementRef;
        }

        return elementRef;
    }

    private AscetElementImplementationRef BuildComplexElementImplementationRef(
        ImplConfiguration implementation,
        ComplexModelElement complexElement,
        ISet<string> recursionGuard)
    {
        ImplConfiguration childImplementation = implementation == null ? null : implementation.Get(complexElement);
        object representedComponent = InvokeOptional(complexElement, "GetRepresentedClass");

        AscetElementImplementationRef elementRef = new AscetElementImplementationRef
        {
            ElementName = complexElement.GetName(),
            ElementKind = GetCleanTypeName(complexElement),
            IsPrimitive = false,
            ChildImplementationName = SafeGetString(childImplementation, "GetName"),
            ReferencedComponentPath = GetRepresentedComponentPath(representedComponent),
            ChildElements = new List<AscetElementImplementationRef>(),
            ImplInfos = new List<AscetImplInfoBinding>()
        };

        PopulateElementViewFields(elementRef, complexElement);

        if (childImplementation == null || representedComponent == null)
        {
            return elementRef;
        }

        Array childModelElements = InvokeOptional(representedComponent, "GetAllModelElements") as Array;
        if (childModelElements == null)
        {
            return elementRef;
        }

        string recursionKey = BuildRecursionKey(
            elementRef.ReferencedComponentPath,
            elementRef.ChildImplementationName,
            elementRef.ElementName);
        if (String.IsNullOrWhiteSpace(recursionKey))
        {
            return elementRef;
        }

        if (recursionGuard != null && recursionGuard.Contains(recursionKey))
        {
            return elementRef;
        }

        bool removeAfterVisit = false;
        if (recursionGuard != null)
        {
            recursionGuard.Add(recursionKey);
            removeAfterVisit = true;
        }

        try
        {
            elementRef.ChildElements = BuildElementImplementationRefs(childImplementation, childModelElements, recursionGuard);
        }
        finally
        {
            if (removeAfterVisit)
            {
                recursionGuard.Remove(recursionKey);
            }
        }

        return elementRef;
    }

    private string GetRepresentedComponentPath(object representedComponent)
    {
        if (representedComponent == null)
        {
            return String.Empty;
        }

        string path = SafeGetString(representedComponent, "GetNameWithPath");
        if (!String.IsNullOrWhiteSpace(path))
        {
            return path;
        }

        return SafeGetString(representedComponent, "GetName");
    }

    private string BuildRecursionKey(string representedComponentPath, string childImplementationName, string fallbackName)
    {
        string componentKey = String.IsNullOrWhiteSpace(representedComponentPath) ? fallbackName : representedComponentPath;
        string implementationKey = childImplementationName ?? String.Empty;
        if (String.IsNullOrWhiteSpace(componentKey) && String.IsNullOrWhiteSpace(implementationKey))
        {
            return String.Empty;
        }

        return componentKey + "::" + implementationKey;
    }

    private void PopulateElementViewFields(AscetElementImplementationRef elementRef, object modelElement)
    {
        if (elementRef == null || modelElement == null)
        {
            return;
        }

        elementRef.DisplayScope = BuildDisplayScope(modelElement);
        elementRef.DisplayKind = BuildDisplayKind(modelElement);
        elementRef.CanonicalScope = BuildCanonicalScope(modelElement, elementRef.DisplayScope);
        elementRef.CanonicalKind = BuildCanonicalKind(modelElement, elementRef.DisplayKind);
        elementRef.MessageKind = BuildMessageKind(modelElement, elementRef.DisplayKind);
        elementRef.IsVolatile = SafeGetBool(modelElement, "IsVolatile");
        elementRef.DisplayMemory = BuildDisplayMemory(modelElement, elementRef.IsVolatile);
        elementRef.IsCalibration = SafeGetBool(modelElement, "IsCalibration");
        elementRef.DisplayCalibration = BuildDisplayCalibration(modelElement, elementRef.IsCalibration);
        elementRef.Comment = SafeGetString(modelElement, "GetComment");

        PrimitiveModelElement primitiveElement = modelElement as PrimitiveModelElement;
        if (primitiveElement != null)
        {
            elementRef.DisplayType = BuildDisplayType(primitiveElement);
            elementRef.Unit = SafeGetString(primitiveElement, "GetUnit");
        }
    }

    private string BuildDisplayType(PrimitiveModelElement primitiveElement)
    {
        if (primitiveElement == null)
        {
            return String.Empty;
        }

        if (SafeGetBool(primitiveElement, "IsDeltaTElement"))
        {
            return "dT";
        }

        string modelType = SafeGetString(primitiveElement, "GetModelType");
        if (!String.IsNullOrWhiteSpace(modelType))
        {
            return modelType;
        }

        return String.Empty;
    }

    private string BuildDisplayScope(object modelElement)
    {
        if (modelElement == null)
        {
            return String.Empty;
        }

        if (SafeGetBool(modelElement, "IsMethodArgument") ||
            SafeGetBool(modelElement, "IsMethodLocal") ||
            SafeGetBool(modelElement, "IsMethodReturn"))
        {
            string[] tokens = SplitElementName(SafeGetString(modelElement, "GetName"));
            if (tokens.Length > 1)
            {
                return tokens[0];
            }
        }

        return SafeGetString(modelElement, "GetScope");
    }

    private string BuildDisplayKind(object modelElement)
    {
        if (modelElement == null)
        {
            return String.Empty;
        }

        if (SafeGetBool(modelElement, "IsMethodArgument"))
        {
            return "Method Argument";
        }

        if (SafeGetBool(modelElement, "IsMethodReturn"))
        {
            return "Return Value";
        }

        if (SafeGetBool(modelElement, "IsMethodLocal"))
        {
            return "Method Local";
        }

        if (SafeGetBool(modelElement, "IsParameter"))
        {
            return "Parameter";
        }

        if (SafeGetBool(modelElement, "IsSystemConstant"))
        {
            return "System Constant";
        }

        if (SafeGetBool(modelElement, "IsConstant"))
        {
            return "Constant";
        }

        if (SafeGetBool(modelElement, "IsVariable"))
        {
            return "Variable";
        }

        if (SafeGetBool(modelElement, "IsSendReceiveMessage"))
        {
            return "Send Receive Message";
        }

        if (SafeGetBool(modelElement, "IsReceiveMessage"))
        {
            return "Receive Message";
        }

        if (SafeGetBool(modelElement, "IsSendMessage"))
        {
            return "Send Message";
        }

        if (SafeGetBool(modelElement, "IsInput"))
        {
            return "Input";
        }

        if (SafeGetBool(modelElement, "IsOutput"))
        {
            return "Output";
        }

        return String.Empty;
    }

    private string BuildCanonicalScope(object modelElement, string displayScope)
    {
        string normalized = (displayScope ?? String.Empty).Trim().ToLowerInvariant();
        if (String.Equals(normalized, "exported", StringComparison.Ordinal))
        {
            return "exported";
        }

        if (String.Equals(normalized, "imported", StringComparison.Ordinal))
        {
            return "imported";
        }

        if (String.Equals(normalized, "local", StringComparison.Ordinal) ||
            String.Equals(normalized, "method local", StringComparison.Ordinal) ||
            String.Equals(normalized, "step local", StringComparison.Ordinal))
        {
            return "local";
        }

        return normalized;
    }

    private string BuildCanonicalKind(object modelElement, string displayKind)
    {
        string normalized = (displayKind ?? String.Empty).Trim().ToLowerInvariant();
        if (String.IsNullOrWhiteSpace(normalized))
        {
            return String.Empty;
        }

        if (String.Equals(normalized, "send receive message", StringComparison.Ordinal))
        {
            return "send_receive_message";
        }

        if (String.Equals(normalized, "receive message", StringComparison.Ordinal))
        {
            return "receive_message";
        }

        if (String.Equals(normalized, "send message", StringComparison.Ordinal))
        {
            return "send_message";
        }

        if (String.Equals(normalized, "variable", StringComparison.Ordinal))
        {
            return "variable";
        }

        if (String.Equals(normalized, "parameter", StringComparison.Ordinal))
        {
            return "parameter";
        }

        if (String.Equals(normalized, "input", StringComparison.Ordinal))
        {
            return "input";
        }

        if (String.Equals(normalized, "output", StringComparison.Ordinal))
        {
            return "output";
        }

        return normalized.Replace(' ', '_');
    }

    private string BuildMessageKind(object modelElement, string displayKind)
    {
        string canonicalKind = BuildCanonicalKind(modelElement, displayKind);
        if (String.Equals(canonicalKind, "send_receive_message", StringComparison.Ordinal) ||
            String.Equals(canonicalKind, "receive_message", StringComparison.Ordinal) ||
            String.Equals(canonicalKind, "send_message", StringComparison.Ordinal))
        {
            return canonicalKind;
        }

        return String.Empty;
    }

    private string BuildDisplayMemory(object modelElement, bool isVolatile)
    {
        if (modelElement == null)
        {
            return String.Empty;
        }

        if (SafeGetBool(modelElement, "IsDeltaTElement"))
        {
            return "n/a";
        }

        if (isVolatile)
        {
            return "volatile";
        }

        return String.Empty;
    }

    private string BuildDisplayCalibration(object modelElement, bool isCalibration)
    {
        if (modelElement == null)
        {
            return String.Empty;
        }

        if (SafeGetBool(modelElement, "IsDeltaTElement"))
        {
            return "n/a";
        }

        if (isCalibration)
        {
            return "read only";
        }

        return String.Empty;
    }

    private string[] SplitElementName(string elementName)
    {
        if (String.IsNullOrWhiteSpace(elementName))
        {
            return new string[0];
        }

        return elementName.Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
    }

    private void AddBinding(IList<AscetImplInfoBinding> bindings, string role, ImplInfo info)
    {
        if (bindings == null || info == null)
        {
            return;
        }

        bindings.Add(new AscetImplInfoBinding
        {
            Role = role,
            Info = BuildImplInfoRef(info)
        });
    }

    private AscetImplInfoRef BuildImplInfoRef(ImplInfo info)
    {
        if (info == null)
        {
            return null;
        }

        return new AscetImplInfoRef
        {
            ImplType = SafeGetString(info, "GetImplType"),
            FormulaName = SafeGetString(info, "GetFormulaName"),
            Quantization = SafeGetString(info, "GetQuantization"),
            AdditionalInfo = SafeGetString(info, "GetAdditionalInfo"),
            LimitAssignment = SafeGetBool(info, "GetOptionLimitAssignment"),
            LimitOverflow = SafeGetBool(info, "GetOptionLimitOverflow"),
            OverflowStrategy = GetOverflowStrategy(info),
            IsMasterModel = SafeGetBool(info, "IsMasterModel"),
            IntegerImplRange = SafeGetRange(info, "GetIntegerImplRange"),
            IntegerPhysicalRange = SafeGetRange(info, "GetIntegerPhysicalRange"),
            LongImplRange = SafeGetRange(info, "GetLongImplRange"),
            LongPhysicalRange = SafeGetRange(info, "GetLongPhysicalRange"),
            FloatImplRange = SafeGetRange(info, "GetFloatImplRange"),
            FloatPhysicalRange = SafeGetRange(info, "GetFloatPhysicalRange"),
            DoubleImplRange = SafeGetRange(info, "GetDoubleImplRange"),
            DoublePhysicalRange = SafeGetRange(info, "GetDoublePhysicalRange")
        };
    }

    private string GetOverflowStrategy(ImplInfo info)
    {
        if (SafeGetBool(info, "IsChoiceAutomaticResolution"))
        {
            return "Automatic";
        }

        if (SafeGetBool(info, "IsChoiceKeepResolution"))
        {
            return "KeepResolution";
        }

        if (SafeGetBool(info, "IsChoiceReduceResolution"))
        {
            return "ReduceResolution";
        }

        return String.Empty;
    }

    private string SafeGetRange(object target, string methodName)
    {
        try
        {
            object value = InvokeOptional(target, methodName);
            return FormatRangeValue(value);
        }
        catch
        {
            return String.Empty;
        }
    }

    private string FormatRangeValue(object value)
    {
        Array array = value as Array;
        if (array == null)
        {
            return String.Empty;
        }

        if (array.Length == 0)
        {
            return "[]";
        }

        List<string> values = new List<string>();
        for (int i = 0; i < array.Length; i++)
        {
            object entry = array.GetValue(i);
            values.Add(entry == null ? String.Empty : entry.ToString());
        }

        return "[" + String.Join(", ", values.ToArray()) + "]";
    }

    private object InvokeOptional(object target, string methodName)
    {
        if (target == null || String.IsNullOrWhiteSpace(methodName))
        {
            return null;
        }

        MethodInfo method = target.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
        if (method == null)
        {
            return null;
        }

        return method.Invoke(target, null);
    }

    private string SafeGetString(object target, string methodName)
    {
        try
        {
            object value = InvokeOptional(target, methodName);
            return value == null ? String.Empty : value.ToString();
        }
        catch
        {
            return String.Empty;
        }
    }

    private bool SafeGetBool(object target, string methodName)
    {
        try
        {
            object value = InvokeOptional(target, methodName);
            if (value == null)
            {
                return false;
            }

            return Convert.ToBoolean(value);
        }
        catch
        {
            return false;
        }
    }

    private string GetCleanTypeName(object value)
    {
        if (value == null)
        {
            return String.Empty;
        }

        string typeName = value.GetType().Name;
        if (typeName.EndsWith("ModelElement", StringComparison.Ordinal))
        {
            typeName = typeName.Substring(0, typeName.Length - "ModelElement".Length);
        }

        return typeName;
    }
}
