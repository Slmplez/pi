using System;
using System.Collections.Generic;

public enum AscetDiffChangeKind
{
    Unknown = 0,
    Added = 1,
    Removed = 2,
    Changed = 3,
    Unchanged = 4
}

public sealed class AscetCodeAnalysisRef
{
    public bool ParseSucceeded { get; set; }
    public IList<string> Reads { get; set; }
    public IList<string> Writes { get; set; }
    public IList<string> Calls { get; set; }
    public IList<string> ReferencedComponents { get; set; }
    public IList<string> Diagnostics { get; set; }
}

public sealed class AscetFlowBindingRef
{
    public string Role { get; set; }
    public string SourceType { get; set; }
    public string MethodName { get; set; }
    public AscetMethodKind MethodKind { get; set; }
    public string Code { get; set; }
    public AscetCodeAnalysisRef CodeAnalysis { get; set; }
    public IList<AscetReferenceEdgeRef> RelatedReferences { get; set; }
}

public sealed class AscetDependencyChainRef
{
    public string Scope { get; set; }
    public string OwnerName { get; set; }
    public string Role { get; set; }
    public string BindingName { get; set; }
    public string ReferenceElementName { get; set; }
    public string TargetComponentPath { get; set; }
}

public sealed class AscetStateFlowRef
{
    public string StateName { get; set; }
    public bool IsStartState { get; set; }
    public IList<AscetFlowBindingRef> Bindings { get; set; }
    public IList<AscetDependencyChainRef> Dependencies { get; set; }
}

public sealed class AscetTransitionFlowRef
{
    public string TransitionName { get; set; }
    public string SourceState { get; set; }
    public string TargetState { get; set; }
    public int Priority { get; set; }
    public AscetFlowBindingRef Trigger { get; set; }
    public AscetFlowBindingRef Guard { get; set; }
    public AscetFlowBindingRef Action { get; set; }
    public IList<AscetDependencyChainRef> Dependencies { get; set; }
}

public sealed class AscetReferenceTraceNodeRef
{
    public string ComponentPath { get; set; }
    public AscetComponentKind ComponentKind { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
    public string ViaElementName { get; set; }
    public IList<AscetReferenceTraceNodeRef> Children { get; set; }
}

public sealed class AscetStateMachineFlowSummary
{
    public string ComponentPath { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
    public string DiagramName { get; set; }
    public IList<AscetStateFlowRef> StateFlows { get; set; }
    public IList<AscetTransitionFlowRef> TransitionFlows { get; set; }
    public IList<AscetDependencyChainRef> DependencyChains { get; set; }
    public IList<AscetReferenceTraceNodeRef> ReferenceTrace { get; set; }
    public string Summary { get; set; }
}

public sealed class AscetComponentSnapshot
{
    public AscetItemRef Component { get; set; }
    public IList<AscetDiagramRef> Diagrams { get; set; }
    public IList<AscetMethodCode> Methods { get; set; }
    public AscetTextCode TextCode { get; set; }
    public AscetImplementationSnapshot Implementation { get; set; }
    public AscetReferenceGraphSummary References { get; set; }
    public IList<AscetReferenceTraceNodeRef> ReferenceTrace { get; set; }
    public AscetStateMachineSemanticSummary StateMachineSummary { get; set; }
    public AscetStateMachineFlowSummary StateMachineFlow { get; set; }
    public string Summary { get; set; }
}

public sealed class AscetNamedDiffRef
{
    public string Name { get; set; }
    public AscetDiffChangeKind ChangeKind { get; set; }
    public string LeftValue { get; set; }
    public string RightValue { get; set; }
}

public sealed class AscetMethodCodeDiffRef
{
    public string Name { get; set; }
    public AscetMethodKind MethodKind { get; set; }
    public AscetDiffChangeKind ChangeKind { get; set; }
    public string LeftCode { get; set; }
    public string RightCode { get; set; }
}

public sealed class AscetTransitionDiffRef
{
    public string Key { get; set; }
    public AscetDiffChangeKind ChangeKind { get; set; }
    public string LeftTrigger { get; set; }
    public string RightTrigger { get; set; }
    public string LeftGuard { get; set; }
    public string RightGuard { get; set; }
    public string LeftAction { get; set; }
    public string RightAction { get; set; }
}

public sealed class AscetImplementationElementDiffRef
{
    public string ElementPath { get; set; }
    public AscetDiffChangeKind ChangeKind { get; set; }
    public string LeftSignature { get; set; }
    public string RightSignature { get; set; }
}

public sealed class AscetBehaviorImplementationLinkDiffRef
{
    public string ElementPath { get; set; }
    public string RelatedBehavior { get; set; }
    public string Note { get; set; }
}

public sealed class AscetStateMachineDiffSummary
{
    public string LeftComponentPath { get; set; }
    public string RightComponentPath { get; set; }
    public IList<AscetNamedDiffRef> StateDiffs { get; set; }
    public IList<AscetTransitionDiffRef> TransitionDiffs { get; set; }
    public IList<AscetMethodCodeDiffRef> MethodDiffs { get; set; }
    public IList<AscetImplementationElementDiffRef> ImplementationDiffs { get; set; }
    public IList<AscetNamedDiffRef> ReferenceDiffs { get; set; }
    public IList<AscetBehaviorImplementationLinkDiffRef> LinkedDiffs { get; set; }
    public string Summary { get; set; }
}

public static class AscetAdvancedAnalysisUtilities
{
    public static string ExtractLeafName(string path)
    {
        if (String.IsNullOrWhiteSpace(path))
        {
            return String.Empty;
        }

        string normalized = path.Replace('/', '\\');
        int separatorIndex = normalized.LastIndexOf('\\');
        return separatorIndex < 0 ? normalized : normalized.Substring(separatorIndex + 1);
    }


    public static string DescribeBindingName(AscetFlowBindingRef binding)
    {
        if (binding == null)
        {
            return String.Empty;
        }

        if (!String.IsNullOrWhiteSpace(binding.MethodName))
        {
            return binding.MethodName;
        }

        if (String.Equals(binding.SourceType, "InlineESDL", StringComparison.Ordinal))
        {
            return "inline-esdl";
        }

        return binding.Role == null ? String.Empty : binding.Role.ToLowerInvariant();
    }

    public static List<string> MergeKeys<TLeft, TRight>(IDictionary<string, TLeft> left, IDictionary<string, TRight> right)
    {
        SortedDictionary<string, bool> merged = new SortedDictionary<string, bool>(StringComparer.Ordinal);

        if (left != null)
        {
            foreach (string key in left.Keys)
            {
                merged[key] = true;
            }
        }

        if (right != null)
        {
            foreach (string key in right.Keys)
            {
                merged[key] = true;
            }
        }

        return new List<string>(merged.Keys);
    }

    public static AscetDiffChangeKind GetChangeKind(bool hasLeft, bool hasRight, string leftValue, string rightValue)
    {
        if (!hasLeft && hasRight)
        {
            return AscetDiffChangeKind.Added;
        }

        if (hasLeft && !hasRight)
        {
            return AscetDiffChangeKind.Removed;
        }

        return String.Equals(leftValue ?? String.Empty, rightValue ?? String.Empty, StringComparison.Ordinal)
            ? AscetDiffChangeKind.Unchanged
            : AscetDiffChangeKind.Changed;
    }

    public static string BuildStateBindingSignature(IList<AscetStateMachineMethodBindingRef> bindings)
    {
        if (bindings == null)
        {
            return String.Empty;
        }

        List<string> result = new List<string>();
        for (int i = 0; i < bindings.Count; i++)
        {
            AscetStateMachineMethodBindingRef binding = bindings[i];
            if (binding == null)
            {
                continue;
            }

            result.Add((binding.Role ?? String.Empty)
                + ":"
                + (binding.SourceType ?? String.Empty)
                + ":"
                + (binding.MethodName ?? String.Empty)
                + ":"
                + binding.MethodKind.ToString()
                + ":"
                + (binding.Code ?? String.Empty));
        }

        result.Sort(StringComparer.Ordinal);
        return String.Join("|", result.ToArray());
    }

    public static string BuildImplementationSignature(AscetElementImplementationRef element)
    {
        if (element == null)
        {
            return String.Empty;
        }

        List<string> values = new List<string>();
        values.Add("DisplayType=" + (element.DisplayType ?? String.Empty));
        values.Add("DisplayScope=" + (element.DisplayScope ?? String.Empty));
        values.Add("DisplayKind=" + (element.DisplayKind ?? String.Empty));
        values.Add("DisplayMemory=" + (element.DisplayMemory ?? String.Empty));
        values.Add("DisplayCalibration=" + (element.DisplayCalibration ?? String.Empty));
        values.Add("ImplementationItemKind=" + (element.ImplementationItemKind ?? String.Empty));
        values.Add("MemoryLocation=" + (element.MemoryLocation ?? String.Empty));
        values.Add("RecordLayout=" + (element.RecordLayout ?? String.Empty));
        values.Add("ImplType=" + (element.ImplType ?? String.Empty));
        values.Add("ModelType=" + (element.ModelType ?? String.Empty));
        values.Add("AdditionalInfo=" + (element.AdditionalInfo ?? String.Empty));
        values.Add("ChildImplementationName=" + (element.ChildImplementationName ?? String.Empty));
        values.Add("ReferencedComponentPath=" + (element.ReferencedComponentPath ?? String.Empty));

        if (element.ImplInfos != null)
        {
            for (int i = 0; i < element.ImplInfos.Count; i++)
            {
                AscetImplInfoBinding binding = element.ImplInfos[i];
                if (binding == null || binding.Info == null)
                {
                    continue;
                }

                values.Add("ImplInfo[" + (binding.Role ?? String.Empty) + "]=" + (binding.Info.ImplType ?? String.Empty) + "|" + (binding.Info.FormulaName ?? String.Empty) + "|" + (binding.Info.Quantization ?? String.Empty));
            }
        }

        return String.Join(";", values.ToArray());
    }

    public static string[] SplitPathSegments(string path)
    {
        if (String.IsNullOrWhiteSpace(path))
        {
            return new string[0];
        }

        return path.Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
    }

    public static string FirstPathSegment(string path)
    {
        string[] segments = SplitPathSegments(path);
        return segments.Length == 0 ? String.Empty : segments[0];
    }

    public static List<string> DistinctStrings(IList<string> values)
    {
        List<string> result = new List<string>();
        Dictionary<string, bool> seen = new Dictionary<string, bool>(StringComparer.Ordinal);
        if (values == null)
        {
            return result;
        }

        for (int i = 0; i < values.Count; i++)
        {
            string value = values[i] ?? String.Empty;
            if (String.IsNullOrWhiteSpace(value) || seen.ContainsKey(value))
            {
                continue;
            }

            seen[value] = true;
            result.Add(value);
        }

        return result;
    }

    public static string BuildDiffCategorySummary<T>(IList<T> diffs, string noun)
    {
        int changedCount = 0;
        AscetDiffChangeKind singleKind = AscetDiffChangeKind.Unknown;

        if (diffs != null)
        {
            for (int i = 0; i < diffs.Count; i++)
            {
                AscetDiffChangeKind kind = GetDiffChangeKind(diffs[i]);
                if (kind == AscetDiffChangeKind.Unchanged || kind == AscetDiffChangeKind.Unknown)
                {
                    continue;
                }

                changedCount++;
                singleKind = kind;
            }
        }

        if (changedCount == 0)
        {
            return "0 " + noun + " changes";
        }

        if (changedCount == 1)
        {
            return "1 " + noun + " " + ToPastTense(singleKind);
        }

        return changedCount.ToString() + " " + noun + " changes";
    }

    public static int CountReferenceTraceNodes(IList<AscetReferenceTraceNodeRef> nodes)
    {
        if (nodes == null)
        {
            return 0;
        }

        int count = 0;
        for (int i = 0; i < nodes.Count; i++)
        {
            AscetReferenceTraceNodeRef node = nodes[i];
            if (node == null)
            {
                continue;
            }

            count++;
            count += CountReferenceTraceNodes(node.Children);
        }

        return count;
    }

    private static AscetDiffChangeKind GetDiffChangeKind<T>(T diff)
    {
        object value = diff;
        if (value is AscetNamedDiffRef)
        {
            return ((AscetNamedDiffRef)value).ChangeKind;
        }

        if (value is AscetTransitionDiffRef)
        {
            return ((AscetTransitionDiffRef)value).ChangeKind;
        }

        if (value is AscetMethodCodeDiffRef)
        {
            return ((AscetMethodCodeDiffRef)value).ChangeKind;
        }

        if (value is AscetImplementationElementDiffRef)
        {
            return ((AscetImplementationElementDiffRef)value).ChangeKind;
        }

        return AscetDiffChangeKind.Unknown;
    }

    private static string ToPastTense(AscetDiffChangeKind kind)
    {
        switch (kind)
        {
            case AscetDiffChangeKind.Added:
                return "added";
            case AscetDiffChangeKind.Removed:
                return "removed";
            case AscetDiffChangeKind.Changed:
                return "changed";
            default:
                return "changed";
        }
    }
}
