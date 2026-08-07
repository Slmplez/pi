using System;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using System.Text;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public sealed class AscetReferenceEdgeRef
{
    public string SourceElementName { get; set; }
    public string SourceElementKind { get; set; }
    public string SourceDisplayScope { get; set; }
    public string SourceDisplayKind { get; set; }
    public bool IsResolved { get; set; }
    public string TargetComponentName { get; set; }
    public string TargetComponentPath { get; set; }
    public AscetComponentKind TargetComponentKind { get; set; }
    public AscetLanguageKind TargetLanguageKind { get; set; }
}

public sealed class AscetReferenceGraphSummary
{
    public string ComponentPath { get; set; }
    public AscetComponentKind ComponentKind { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
    public IList<AscetReferenceEdgeRef> References { get; set; }
    public IList<AscetItemRef> TargetComponents { get; set; }
    public string Summary { get; set; }
}

public interface IReferenceReadService
{
    AscetReferenceGraphSummary GetReferenceGraph(AscetItemRef component);
}

public sealed class ReferenceReadService : AscetReadDomainServiceBase, IReferenceReadService
{
    public AscetReferenceGraphSummary GetReferenceGraph(AscetItemRef component)
    {
        return ExecuteWithSession("get_reference_graph", delegate(AscetSession session)
        {
            if (component == null)
            {
                throw new AscetReadException("invalid_argument", "get_reference_graph", "Component reference must not be null.");
            }

            DataBaseItem item = ResolveItemByPath(session, component.Path);
            CodeComponent codeComponent = item as CodeComponent;
            if (codeComponent == null)
            {
                throw new AscetReadException(
                    "unsupported_component_kind",
                    "get_reference_graph",
                    "Item '" + component.Path + "' is not a code component.");
            }

            AscetItemRef resolvedComponent = Classifier.ToItemRef(item);
            Array referencedElements = codeComponent.GetAllReferencedModelElements() as Array;
            List<AscetReferenceEdgeRef> references = BuildReferenceEdges(referencedElements);
            List<AscetItemRef> targetComponents = BuildTargetComponents(references);

            return new AscetReferenceGraphSummary
            {
                ComponentPath = resolvedComponent.Path,
                ComponentKind = resolvedComponent.Kind,
                LanguageKind = resolvedComponent.LanguageKind,
                References = references,
                TargetComponents = targetComponents,
                Summary = BuildSummary(references)
            };
        });
    }

    private List<AscetReferenceEdgeRef> BuildReferenceEdges(Array referencedElements)
    {
        List<AscetReferenceEdgeRef> references = new List<AscetReferenceEdgeRef>();
        if (referencedElements == null)
        {
            return references;
        }

        for (int i = 0; i < referencedElements.Length; i++)
        {
            object referencedElement = referencedElements.GetValue(i);
            if (referencedElement == null)
            {
                continue;
            }

            references.Add(BuildReferenceEdge(referencedElement));
        }

        return references;
    }

    private AscetReferenceEdgeRef BuildReferenceEdge(object referencedElement)
    {
        AscetReferenceEdgeRef edge = new AscetReferenceEdgeRef
        {
            SourceElementName = SafeGetString(referencedElement, "GetName"),
            SourceElementKind = GetCleanTypeName(referencedElement),
            SourceDisplayScope = BuildDisplayScope(referencedElement),
            SourceDisplayKind = BuildDisplayKind(referencedElement),
            IsResolved = false,
            TargetComponentName = String.Empty,
            TargetComponentPath = String.Empty,
            TargetComponentKind = AscetComponentKind.Unknown,
            TargetLanguageKind = AscetLanguageKind.Unknown
        };

        object representedComponent = InvokeOptional(referencedElement, "GetRepresentedClass");
        DataBaseItem representedItem = representedComponent as DataBaseItem;
        if (representedItem == null)
        {
            edge.TargetComponentName = SafeGetString(representedComponent, "GetName");
            edge.TargetComponentPath = SafeGetString(representedComponent, "GetNameWithPath");
            return edge;
        }

        AscetItemRef target = Classifier.ToItemRef(representedItem);
        edge.IsResolved = true;
        edge.TargetComponentName = target == null ? String.Empty : (target.Name ?? String.Empty);
        edge.TargetComponentPath = target == null ? String.Empty : (target.Path ?? String.Empty);
        edge.TargetComponentKind = target == null ? AscetComponentKind.Unknown : target.Kind;
        edge.TargetLanguageKind = target == null ? AscetLanguageKind.Unknown : target.LanguageKind;
        return edge;
    }

    private List<AscetItemRef> BuildTargetComponents(IList<AscetReferenceEdgeRef> references)
    {
        List<AscetItemRef> targets = new List<AscetItemRef>();
        Dictionary<string, bool> seen = new Dictionary<string, bool>(StringComparer.Ordinal);
        if (references == null)
        {
            return targets;
        }

        for (int i = 0; i < references.Count; i++)
        {
            AscetReferenceEdgeRef edge = references[i];
            if (edge == null || !edge.IsResolved || String.IsNullOrWhiteSpace(edge.TargetComponentPath) || seen.ContainsKey(edge.TargetComponentPath))
            {
                continue;
            }

            targets.Add(new AscetItemRef
            {
                Name = edge.TargetComponentName ?? String.Empty,
                Path = edge.TargetComponentPath ?? String.Empty,
                Kind = edge.TargetComponentKind,
                LanguageKind = edge.TargetLanguageKind
            });
            seen[edge.TargetComponentPath] = true;
        }

        return targets;
    }

    private string BuildSummary(IList<AscetReferenceEdgeRef> references)
    {
        if (references == null || references.Count == 0)
        {
            return "No referenced model elements.";
        }

        List<string> lines = new List<string>();
        for (int i = 0; i < references.Count; i++)
        {
            AscetReferenceEdgeRef edge = references[i];
            if (edge == null)
            {
                continue;
            }

            if (edge.IsResolved)
            {
                lines.Add((edge.SourceElementName ?? String.Empty) + " -> " + (edge.TargetComponentPath ?? String.Empty));
                continue;
            }

            lines.Add((edge.SourceElementName ?? String.Empty) + " -> <unresolved>");
        }

        return String.Join(Environment.NewLine, lines.ToArray());
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

    private string[] SplitElementName(string elementName)
    {
        if (String.IsNullOrWhiteSpace(elementName))
        {
            return new string[0];
        }

        return elementName.Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
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
