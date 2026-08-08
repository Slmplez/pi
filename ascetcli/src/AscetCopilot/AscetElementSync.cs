using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public enum AscetElementSpecKind
{
    Unknown = 0,
    Variable = 1,
    Parameter = 2,
    Array = 3,
    Component = 4,
    Enumeration = 5,
    Table = 6
}

public enum RangeValueKind
{
    Integer = 0,
    Long = 1,
    Float = 2,
    Double = 3
}

internal static class AscetElementSyncSpecRules
{
    public static bool RequiresImplementation(AscetElementSpec spec)
    {
        return spec != null && (spec.Impl != null || spec.PhysicalRange != null);
    }

    public static bool RequiresParameterLimitAssignment(AscetElementSpec spec)
    {
        return spec != null &&
               spec.Kind == AscetElementSpecKind.Parameter &&
               (spec.PhysicalRange != null ||
                (spec.Impl != null && spec.Impl.ImplementationRange != null));
    }

    public static bool TryGetEffectiveLimitAssignments(AscetElementSpec spec, out bool expected)
    {
        if (spec != null && spec.Impl != null && spec.Impl.LimitAssignments.HasValue)
        {
            expected = spec.Impl.LimitAssignments.Value;
            return true;
        }

        expected = false;
        return false;
    }

    public static bool ShouldCreateNormalOneDTable(AscetElementSpec spec)
    {
        if (String.Equals(Environment.GetEnvironmentVariable("ASCET_TABLE_CREATE_NORMAL"), "1", StringComparison.Ordinal))
        {
            return true;
        }

        return RequiresCustomOneDTableAxisWrite(spec == null ? null : spec.XValues);
    }

    public static bool UsesDefaultFixedOneDTableAxis(IList<object> values)
    {
        if (values == null || values.Count == 0)
        {
            return false;
        }

        for (int i = 0; i < values.Count; i++)
        {
            if (!RangeValueMatches(i, Convert.ToDouble(values[i], System.Globalization.CultureInfo.InvariantCulture)))
            {
                return false;
            }
        }

        return true;
    }

    public static bool RequiresCustomOneDTableAxisWrite(IList<object> values)
    {
        return !UsesDefaultFixedOneDTableAxis(values);
    }

    public static bool RequiresCustomTwoDTableAxisWrite(IList<object> xValues, IList<object> yValues)
    {
        return RequiresCustomOneDTableAxisWrite(xValues) || RequiresCustomOneDTableAxisWrite(yValues);
    }

    public static bool UsesDefaultFixedTwoDTableAxes(IList<object> xValues, IList<object> yValues)
    {
        return UsesDefaultFixedOneDTableAxis(xValues) && UsesDefaultFixedOneDTableAxis(yValues);
    }

    public static bool ShouldCreateNormalTwoDTable(AscetElementSpec spec)
    {
        if (String.Equals(Environment.GetEnvironmentVariable("ASCET_TABLE_CREATE_NORMAL"), "1", StringComparison.Ordinal))
        {
            return true;
        }

        return RequiresCustomTwoDTableAxisWrite(spec == null ? null : spec.XValues, spec == null ? null : spec.YValues);
    }

    public static bool UsesFixedDefaultTwoDMatrixOnlyPath(AscetElementSpec spec)
    {
        return spec != null &&
               spec.Kind == AscetElementSpecKind.Table &&
               String.Equals(spec.TableDimension, "2d", StringComparison.Ordinal) &&
               UsesDefaultFixedTwoDTableAxes(spec.XValues, spec.YValues);
    }

    public static bool TryParseRangeString(string value, out double minValue, out double maxValue)
    {
        minValue = 0.0d;
        maxValue = 0.0d;
        if (String.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        string trimmed = value.Trim();
        if (!trimmed.StartsWith("[", StringComparison.Ordinal) || !trimmed.EndsWith("]", StringComparison.Ordinal))
        {
            return false;
        }

        string[] parts = trimmed.Substring(1, trimmed.Length - 2).Split(new[] { ',' }, StringSplitOptions.None);
        if (parts.Length != 2)
        {
            return false;
        }

        try
        {
            minValue = ParseDoubleValue(parts[0]);
            maxValue = ParseDoubleValue(parts[1]);
            return true;
        }
        catch
        {
            return false;
        }
    }

    public static bool IsRangeReadbackUnavailable(string value)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            return true;
        }

        string normalized = value.Trim();
        return String.Equals(normalized, "<unreadable>", StringComparison.OrdinalIgnoreCase);
    }

    public static bool RangeValueMatches(object expected, double actual)
    {
        double expectedValue = ParseDoubleValue(Convert.ToString(expected, System.Globalization.CultureInfo.InvariantCulture));
        if (Double.IsInfinity(expectedValue) || Double.IsInfinity(actual))
        {
            return expectedValue.Equals(actual);
        }

        return Math.Abs(expectedValue - actual) <= 0.000001d;
    }

    public static double ParseDoubleValue(string value)
    {
        string normalized = String.IsNullOrWhiteSpace(value) ? String.Empty : value.Trim();
        if (String.Equals(normalized, "-oo", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(normalized, "-inf", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(normalized, "-infinity", StringComparison.OrdinalIgnoreCase))
        {
            return Double.NegativeInfinity;
        }

        if (String.Equals(normalized, "+oo", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(normalized, "oo", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(normalized, "+inf", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(normalized, "inf", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(normalized, "+infinity", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(normalized, "infinity", StringComparison.OrdinalIgnoreCase))
        {
            return Double.PositiveInfinity;
        }

        return Convert.ToDouble(normalized, System.Globalization.CultureInfo.InvariantCulture);
    }
}

internal static class AscetElementFormulaRules
{
    public static string InferProjectPathForComponent(string componentPath)
    {
        AscetItemPath parsed = AscetItemPath.Parse(componentPath);
        return String.IsNullOrWhiteSpace(parsed.FolderPath)
            ? "Project"
            : parsed.FolderPath + "\\Project";
    }

    public static void ValidateForProjectContext(string componentPath, AscetElementSpecDocument spec, IList<string> availableFormulaNames, IList<AscetExistingElementState> existingElements)
    {
        ValidateForProjectContext(componentPath, spec, availableFormulaNames, existingElements, null);
    }

    public static void ValidateForProjectContext(string componentPath, AscetElementSpecDocument spec, IList<string> availableFormulaNames, IList<AscetExistingElementState> existingElements, string projectPath)
    {
        if (spec == null || spec.Elements == null)
        {
            return;
        }

        HashSet<string> formulas = BuildFormulaNameSet(availableFormulaNames);
        Dictionary<string, AscetExistingElementState> existing = BuildExistingElementIndex(existingElements);
        string effectiveProjectPath = NormalizeProjectPath(projectPath);
        if (String.IsNullOrWhiteSpace(effectiveProjectPath))
        {
            effectiveProjectPath = InferProjectPathForComponent(componentPath);
        }

        for (int i = 0; i < spec.Elements.Count; i++)
        {
            AscetElementSpec element = spec.Elements[i];
            if (element == null || element.Impl == null || String.IsNullOrWhiteSpace(element.Impl.Formula))
            {
                continue;
            }

            string formulaName = element.Impl.Formula.Trim();
            if (!formulas.Contains(formulaName))
            {
                throw new AscetReadException(
                    "invalid_formula_reference",
                    "validate_element_formula",
                    "Element '" + (element.Name ?? String.Empty) + "' references formula '" + formulaName + "' but it was not found in project '" + effectiveProjectPath + "'.");
            }

            AscetExistingElementState existingState;
            existing.TryGetValue(element.Name ?? String.Empty, out existingState);
            EnsureFormulaAllowed(effectiveProjectPath, element, existingState, formulaName);
        }
    }

    public static string NormalizeProjectPath(string projectPath)
    {
        string normalized = String.IsNullOrWhiteSpace(projectPath)
            ? String.Empty
            : projectPath.Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }

        while (normalized.EndsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(0, normalized.Length - 1);
        }

        return normalized;
    }

    private static HashSet<string> BuildFormulaNameSet(IList<string> availableFormulaNames)
    {
        HashSet<string> result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (availableFormulaNames == null)
        {
            return result;
        }

        for (int i = 0; i < availableFormulaNames.Count; i++)
        {
            string current = availableFormulaNames[i];
            if (!String.IsNullOrWhiteSpace(current))
            {
                result.Add(current.Trim());
            }
        }

        return result;
    }

    private static Dictionary<string, AscetExistingElementState> BuildExistingElementIndex(IList<AscetExistingElementState> existingElements)
    {
        Dictionary<string, AscetExistingElementState> result = new Dictionary<string, AscetExistingElementState>(StringComparer.Ordinal);
        if (existingElements == null)
        {
            return result;
        }

        for (int i = 0; i < existingElements.Count; i++)
        {
            AscetExistingElementState state = existingElements[i];
            if (state == null || String.IsNullOrWhiteSpace(state.Name))
            {
                continue;
            }

            result[state.Name] = state;
        }

        return result;
    }

    private static void EnsureFormulaAllowed(string projectPath, AscetElementSpec element, AscetExistingElementState existingState, string formulaName)
    {
        if (IsIdentityFormula(formulaName))
        {
            return;
        }

        string normalizedModelType = NormalizeToken(element == null ? null : element.ModelType);
        if (!String.Equals(normalizedModelType, "cont", StringComparison.Ordinal))
        {
            throw new AscetReadException(
                "invalid_formula_for_element",
                "validate_element_formula",
                "Element '" + (element == null ? String.Empty : (element.Name ?? String.Empty)) + "' can only use formula 'ident' for modelType '" + (element == null ? String.Empty : (element.ModelType ?? String.Empty)) + "' in project '" + projectPath + "'.");
        }

        string effectiveImplType = ResolveEffectiveImplementationType(element, existingState);
        if (IsRealImplementationType(effectiveImplType))
        {
            throw new AscetReadException(
                "invalid_formula_for_element",
                "validate_element_formula",
                "Element '" + (element == null ? String.Empty : (element.Name ?? String.Empty)) + "' can only use formula 'ident' for implementation type '" + effectiveImplType + "' in project '" + projectPath + "'.");
        }
    }

    private static string ResolveEffectiveImplementationType(AscetElementSpec element, AscetExistingElementState existingState)
    {
        if (element != null && element.Impl != null && !String.IsNullOrWhiteSpace(element.Impl.ValueType))
        {
            return element.Impl.ValueType.Trim();
        }

        if (existingState != null && !String.IsNullOrWhiteSpace(existingState.ValueType))
        {
            return existingState.ValueType.Trim();
        }

        return String.Empty;
    }

    private static bool IsIdentityFormula(string formulaName)
    {
        return String.Equals(NormalizeToken(formulaName), "ident", StringComparison.Ordinal);
    }

    private static bool IsRealImplementationType(string implementationType)
    {
        string normalized = NormalizeToken(implementationType);
        return normalized.IndexOf("real32", StringComparison.Ordinal) >= 0 ||
               normalized.IndexOf("float32", StringComparison.Ordinal) >= 0 ||
               normalized.IndexOf("real64", StringComparison.Ordinal) >= 0 ||
               normalized.IndexOf("double", StringComparison.Ordinal) >= 0;
    }

    private static string NormalizeToken(string value)
    {
        return String.IsNullOrWhiteSpace(value) ? String.Empty : value.Trim().ToLowerInvariant();
    }
}

public sealed class AscetElementDataSpec
{
    public object Value { get; set; }
}

public sealed class AscetConfigurationProvenance
{
    public string Source { get; set; }
    public string ConfigurationName { get; set; }
    public bool Selected { get; set; }
}

public sealed class AscetElementConfigurationProvenance
{
    public AscetConfigurationProvenance DataConfiguration { get; set; }
    public AscetConfigurationProvenance ImplementationConfiguration { get; set; }
}

public sealed class AscetElementImplSpec
{
    public string MemoryLocation { get; set; }
    public string ValueType { get; set; }
    public AscetElementRangeSpec ImplementationRange { get; set; }
    public string Formula { get; set; }
    public bool? LimitAssignments { get; set; }
}

public sealed class AscetElementRangeSpec
{
    public object Min { get; set; }
    public object Max { get; set; }
}

public sealed class AscetElementSpec
{
    public string Name { get; set; }
    public AscetElementSpecKind Kind { get; set; }
    public string ModelType { get; set; }
    public string Scope { get; set; }
    public AscetElementRangeSpec PhysicalRange { get; set; }
    public int? Length { get; set; }
    public string EnumerationPath { get; set; }
    public string TableDimension { get; set; }
    public IList<object> XValues { get; set; }
    public IList<object> YValues { get; set; }
    public IList<object> Values { get; set; }
    public string ReferencedComponentPath { get; set; }
    public string Unit { get; set; }
    public string Comment { get; set; }
    public bool? Calibration { get; set; }
    public AscetElementConfigurationProvenance ConfigurationProvenance { get; set; }
    public AscetElementDataSpec Data { get; set; }
    public AscetElementImplSpec Impl { get; set; }
}

public sealed class AscetElementSpecDocument
{
    public IList<AscetElementSpec> Elements { get; set; }
}

internal static class AscetDependentDataValuePolicy
{
    public static IList<string> GetExistingLocalParameterDataValueNames(AscetElementSpecDocument spec, IList<AscetExistingElementState> existingElements)
    {
        List<string> result = new List<string>();
        if (spec == null || spec.Elements == null || existingElements == null)
        {
            return result;
        }

        Dictionary<string, AscetExistingElementState> existing = new Dictionary<string, AscetExistingElementState>(StringComparer.Ordinal);
        for (int i = 0; i < existingElements.Count; i++)
        {
            AscetExistingElementState state = existingElements[i];
            if (state != null && !String.IsNullOrWhiteSpace(state.Name))
            {
                existing[state.Name] = state;
            }
        }

        for (int i = 0; i < spec.Elements.Count; i++)
        {
            AscetElementSpec element = spec.Elements[i];
            if (element == null || element.Data == null || String.IsNullOrWhiteSpace(element.Name))
            {
                continue;
            }

            AscetExistingElementState state;
            if (!existing.TryGetValue(element.Name, out state) || state == null)
            {
                continue;
            }

            if (state.Kind == AscetElementSpecKind.Parameter &&
                String.Equals(state.Scope, "local", StringComparison.OrdinalIgnoreCase))
            {
                result.Add(element.Name);
            }
        }

        return result;
    }

    public static void EnsureExistingLocalParameterDataValuesAreIndependent(IList<string> elementNames, IDictionary<string, bool?> dependencyByName)
    {
        if (elementNames == null)
        {
            return;
        }

        for (int i = 0; i < elementNames.Count; i++)
        {
            string name = elementNames[i] ?? String.Empty;
            bool? isDependent;
            if (String.IsNullOrWhiteSpace(name) || dependencyByName == null || !dependencyByName.TryGetValue(name, out isDependent) || !isDependent.HasValue)
            {
                throw new AscetReadException(
                    "dependency_state_unverified",
                    "apply_element_spec",
                    "Cannot verify dependency state for existing local Parameter '" + name + "' before applying data.value. Omit data.value or resolve the dependency state first.");
            }

            if (isDependent.Value)
            {
                throw new AscetReadException(
                    "dependent_data_value_not_allowed",
                    "apply_element_spec",
                    "Existing local dependent Parameter '" + name + "' stores a Dependency binding in DataVariant; data.value is not a writable scalar value. Omit data.value, or first make the Parameter independent with set_element_dependency.");
            }
        }
    }
}

public enum AscetElementApplyMode
{
    Apply = 0,
    Restore = 1
}

public sealed class AscetElementApplyOptions
{
    public AscetElementApplyMode Mode { get; set; }
    public bool DeleteMissing { get; set; }
    public bool RecreateIncompatible { get; set; }
    public string ProjectPath { get; set; }
}

public sealed class AscetElementCatalogReadResult
{
    public string ComponentPath { get; set; }
    public string ComponentOid { get; set; }
    public IDictionary<string, string> ElementOids { get; set; }
    public AscetElementSpecDocument Document { get; set; }
}

public sealed class AscetElementCatalogEntry
{
    public string Name { get; set; }
    public string Kind { get; set; }
    public string Signature { get; set; }
}

public sealed class AscetElementModifiedDiff
{
    public string Name { get; set; }
    public string Kind { get; set; }
    public string ChangeKind { get; set; }
    public IList<string> FieldChanges { get; set; }
    public string LeftSignature { get; set; }
    public string RightSignature { get; set; }
}

public sealed class AscetElementFieldDiff
{
    public string Field { get; set; }
    public string Left { get; set; }
    public string Right { get; set; }
    public string Reason { get; set; }
}

public sealed class AscetElementIncompatibleDiff
{
    public string Name { get; set; }
    public string Kind { get; set; }
    public string ChangeKind { get; set; }
    public IList<string> FieldChanges { get; set; }
    public IList<AscetElementFieldDiff> FieldDiffs { get; set; }
    public string Reason { get; set; }
    public bool RequiresRecreate { get; set; }
    public string LeftSignature { get; set; }
    public string RightSignature { get; set; }
}

public sealed class AscetElementSpecDiffResult
{
    public string ComponentPath { get; set; }
    public IList<AscetElementCatalogEntry> AddedElements { get; set; }
    public IList<AscetElementCatalogEntry> RemovedElements { get; set; }
    public IList<AscetElementModifiedDiff> ModifiedElements { get; set; }
    public IList<AscetElementIncompatibleDiff> IncompatibleElements { get; set; }
    public IList<AscetElementCatalogEntry> SkippedElements { get; set; }
    public string Summary { get; set; }
}

public sealed class AscetExistingElementState
{
    public string Name { get; set; }
    public string Oid { get; set; }
    public AscetElementSpecKind Kind { get; set; }
    public string ModelType { get; set; }
    public string Scope { get; set; }
    public string PhysicalRange { get; set; }
    public int? Length { get; set; }
    public string EnumerationPath { get; set; }
    public string TableDimension { get; set; }
    public IList<object> XValues { get; set; }
    public IList<object> YValues { get; set; }
    public IList<object> Values { get; set; }
    public string ReferencedComponentPath { get; set; }
    public string Unit { get; set; }
    public string Comment { get; set; }
    public bool? Calibration { get; set; }
    public AscetElementConfigurationProvenance ConfigurationProvenance { get; set; }
    public object DataValue { get; set; }
    public string MemoryLocation { get; set; }
    public string ValueType { get; set; }
    public string ImplRange { get; set; }
    public string Formula { get; set; }
    public bool? LimitAssignments { get; set; }
}

public sealed class AscetElementSyncPlan
{
    public IList<AscetElementSpec> ElementsToCreate { get; set; }
    public IList<AscetElementSpec> ElementsToUpdate { get; set; }
    public IList<string> SkippedElements { get; set; }
}

public sealed class AscetElementSyncResult
{
    public string ComponentPath { get; set; }
    public AscetComponentKind ComponentKind { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
    public IList<AscetElementSyncItemResult> ElementResults { get; set; }
    public AscetElementSyncSummary Summary { get; set; }
    public IList<string> CreatedElements { get; set; }
    public IList<string> UpdatedElements { get; set; }
    public IList<string> SkippedElements { get; set; }
    public IList<string> RemovedElements { get; set; }
    public IList<string> IncompatibleElements { get; set; }
    public IList<string> Issues { get; set; }
    public bool WriteSucceeded { get; set; }
    public bool VerifyReadbackRequested { get; set; }
    public bool ReadbackVerified { get; set; }
    public AscetElementApplyMode Mode { get; set; }
    public bool DeleteMissingRequested { get; set; }
    public bool RecreateIncompatibleRequested { get; set; }
}

public sealed class AscetElementSyncItemResult
{
    public string Name { get; set; }
    public string Kind { get; set; }
    public string Status { get; set; }
    public IList<string> ChangedFields { get; set; }
    public bool ReadbackVerified { get; set; }
    public string ErrorCode { get; set; }
    public string Message { get; set; }
}

public sealed class AscetElementSyncSummary
{
    public int Created { get; set; }
    public int Updated { get; set; }
    public int Skipped { get; set; }
    public int Failed { get; set; }
    public int Removed { get; set; }
    public int Incompatible { get; set; }
}

public interface IComponentElementSyncService
{
    AscetElementCatalogReadResult ReadCatalog(AscetItemRef component);
    AscetElementSpecDiffResult Diff(AscetItemRef component, AscetElementSpecDocument spec);
    AscetElementSyncResult Apply(AscetItemRef component, AscetElementSpecDocument spec, bool verifyReadback);
    AscetElementSyncResult Apply(AscetItemRef component, AscetElementSpecDocument spec, AscetElementApplyOptions options, bool verifyReadback);
}

public static class AscetElementSpecDocumentParser
{
    public static AscetElementSpecDocument ParseJson(string json)
    {
        if (String.IsNullOrWhiteSpace(json))
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Element spec JSON must not be empty.");
        }

        Dictionary<string, object> root;
        try
        {
            root = AscetJsonContract.DeserializeObject(json);
        }
        catch (Exception ex)
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Failed to parse element spec JSON.", ex);
        }

        if (root == null)
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Element spec JSON must deserialize into an object.");
        }

        RejectUnknownFields(root, "root", AscetElementWriteContract.RootFields);

        object rawElements;
        if (!TryGetValue(root, "elements", out rawElements))
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Element spec JSON must contain an 'elements' array.");
        }

        IList rawList = rawElements as IList;
        if (rawList == null)
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Property 'elements' must be an array.");
        }

        List<AscetElementSpec> elements = new List<AscetElementSpec>();
        for (int i = 0; i < rawList.Count; i++)
        {
            Dictionary<string, object> entry = AsObjectMap(rawList[i], "elements[" + i.ToString() + "]");
            elements.Add(ParseElement(entry, i));
        }

        AscetElementSpecDocument document = new AscetElementSpecDocument { Elements = elements };
        AscetElementSpecSemanticRules.NormalizeAndValidate(document);
        return document;
    }

    private static AscetElementSpec ParseElement(IDictionary<string, object> entry, int index)
    {
        string context = "elements[" + index.ToString() + "]";
        RejectForbiddenElementFields(entry, context);
        RejectUnknownFields(entry, context, AscetElementWriteContract.ElementFields);
        string elementName = RequireString(entry, "name", "Element name must not be empty.");
        ValidateElementSpecName(elementName);
        AscetElementSpec spec = new AscetElementSpec
        {
            Name = elementName,
            Kind = ParseKind(RequireString(entry, "kind", "Element kind must not be empty.")),
            ModelType = ReadOptionalString(entry, "modelType"),
            Scope = ReadOptionalString(entry, "scope"),
            PhysicalRange = ReadOptionalRange(entry, "physicalRange", context + ".physicalRange"),
            Length = ReadOptionalInt(entry, "length"),
            EnumerationPath = NormalizeComponentPath(ReadOptionalString(entry, "enumerationPath")),
            TableDimension = NormalizeTableDimension(ReadOptionalString(entry, "tableDimension")),
            XValues = ReadOptionalArrayValue(entry, "xValues", context + ".xValues"),
            YValues = ReadOptionalArrayValue(entry, "yValues", context + ".yValues"),
            Values = ReadOptionalArrayValue(entry, "values", context + ".values"),
            ReferencedComponentPath = NormalizeComponentPath(ReadOptionalString(entry, "referencedComponentPath")),
            Unit = ReadOptionalString(entry, "unit"),
            Comment = ReadOptionalString(entry, "comment"),
            Calibration = ReadOptionalStrictBoolean(entry, "calibration"),
            Data = ParseData(entry, context),
            Impl = ParseImpl(entry, context)
        };

        ValidateElement(spec);
        return spec;
    }

    private static void RejectForbiddenElementFields(IDictionary<string, object> entry, string context)
    {
        object ignored;
        if (TryGetValue(entry, "min", out ignored) || TryGetValue(entry, "max", out ignored))
        {
            throw new AscetReadException("invalid_element_spec_legacy_field", "parse_element_spec", "Property '" + context + ".min/max' is no longer accepted; use '" + context + ".physicalRange.min/max'.");
        }

        if (TryGetValue(entry, "dependency", out ignored))
        {
            throw new AscetReadException("dependency_not_element_spec", "parse_element_spec", "Property '" + context + ".dependency' is not part of apply_element_spec; create the target element first, then use set_element_dependency.");
        }

        if (TryGetValue(entry, "returnType", out ignored) || TryGetValue(entry, "arguments", out ignored) || TryGetValue(entry, "methodName", out ignored))
        {
            throw new AscetReadException("method_signature_not_element_spec", "parse_element_spec", "Method return values and arguments are not part of apply_element_spec; use set_method_signature with methodName and returnType/arguments.");
        }
    }

    private static void ValidateElementSpecName(string name)
    {
        if (String.IsNullOrWhiteSpace(name))
        {
            return;
        }

        if (name.IndexOf('/') >= 0 || name.IndexOf('\\') >= 0 || name.IndexOf('.') >= 0)
        {
            throw new AscetReadException("method_signature_not_element_spec", "parse_element_spec", "Element spec name '" + name + "' looks like a method return or argument path; use set_method_signature for method return values and arguments.");
        }
    }

    private static AscetElementDataSpec ParseData(IDictionary<string, object> entry, string context)
    {
        object rawData;
        if (!TryGetValue(entry, "data", out rawData) || rawData == null)
        {
            return null;
        }

        IDictionary<string, object> map = AsObjectMap(rawData, context + ".data");
        RejectUnknownFields(map, context + ".data", AscetElementWriteContract.DataFields);
        object value;
        if (!TryGetValue(map, "value", out value))
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Property '" + context + ".data.value' is required when 'data' is present.");
        }

        return new AscetElementDataSpec { Value = NormalizeJsonValue(value) };
    }

    private static AscetElementImplSpec ParseImpl(IDictionary<string, object> entry, string context)
    {
        object rawImpl;
        if (!TryGetValue(entry, "impl", out rawImpl) || rawImpl == null)
        {
            return null;
        }

        IDictionary<string, object> map = AsObjectMap(rawImpl, context + ".impl");
        RejectForbiddenImplFields(map, context + ".impl");
        RejectUnknownFields(map, context + ".impl", AscetElementWriteContract.ImplementationFields);
        AscetElementImplSpec spec = new AscetElementImplSpec
        {
            MemoryLocation = ReadOptionalString(map, "memoryLocation"),
            ValueType = ReadOptionalString(map, "valueType"),
            ImplementationRange = ReadOptionalRange(map, "implementationRange", context + ".impl.implementationRange"),
            Formula = ReadOptionalString(map, "formula"),
            LimitAssignments = ReadOptionalBoolean(map, "limitAssignments")
        };

        if (String.IsNullOrWhiteSpace(spec.MemoryLocation) &&
            String.IsNullOrWhiteSpace(spec.ValueType) &&
            spec.ImplementationRange == null &&
            String.IsNullOrWhiteSpace(spec.Formula) &&
            !spec.LimitAssignments.HasValue)
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Property '" + context + ".impl' must define at least one implementation field.");
        }

        return spec;
    }

    private static void RejectForbiddenImplFields(IDictionary<string, object> map, string context)
    {
        object ignored;
        if (TryGetValue(map, "min", out ignored) || TryGetValue(map, "max", out ignored))
        {
            throw new AscetReadException("invalid_element_spec_legacy_field", "parse_element_spec", "Property '" + context + ".min/max' is no longer accepted; use '" + context + ".implementationRange.min/max'.");
        }
    }

    private static void ValidateElement(AscetElementSpec spec)
    {
        switch (spec.Kind)
        {
            case AscetElementSpecKind.Variable:
            case AscetElementSpecKind.Parameter:
                RequirePrimitiveFields(spec);
                return;
            case AscetElementSpecKind.Array:
                RequirePrimitiveFields(spec);
                if (!spec.Length.HasValue || spec.Length.Value <= 0)
                {
                    throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Array element '" + spec.Name + "' must define a positive 'length'.");
                }
                return;
            case AscetElementSpecKind.Enumeration:
                RequirePrimitiveFields(spec);
                if (String.IsNullOrWhiteSpace(spec.EnumerationPath))
                {
                    throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Enumeration element '" + spec.Name + "' must define 'enumerationPath'.");
                }
                if (spec.PhysicalRange != null)
                {
                    throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Enumeration element '" + spec.Name + "' must not define 'physicalRange'.");
                }
                if (spec.Data != null && spec.Data.Value is IList && !(spec.Data.Value is string))
                {
                    throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Enumeration element '" + spec.Name + "' requires data.value to be a scalar literal name.");
                }
                return;
            case AscetElementSpecKind.Table:
                RequirePrimitiveFields(spec);
                if (String.IsNullOrWhiteSpace(spec.TableDimension))
                {
                    throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Table element '" + spec.Name + "' must define 'tableDimension'.");
                }
                if (!String.Equals(spec.TableDimension, "1d", StringComparison.Ordinal) &&
                    !String.Equals(spec.TableDimension, "2d", StringComparison.Ordinal))
                {
                    throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Table element '" + spec.Name + "' has unsupported tableDimension '" + spec.TableDimension + "'.");
                }
                if (spec.XValues == null)
                {
                    throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Table element '" + spec.Name + "' must define 'xValues'.");
                }
                if (String.Equals(spec.TableDimension, "1d", StringComparison.Ordinal))
                {
                    if (spec.Values == null)
                    {
                        throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Table element '" + spec.Name + "' must define 'values'.");
                    }
                    if (spec.XValues.Count != spec.Values.Count)
                    {
                        throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Table element '" + spec.Name + "' must define matching xValues and values lengths.");
                    }
                }
                else
                {
                    ValidateTwoDTableShapeInParser(spec);
                }
                if (spec.PhysicalRange != null)
                {
                    throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Table element '" + spec.Name + "' does not support 'physicalRange'.");
                }
                if (spec.Data != null)
                {
                    throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Table element '" + spec.Name + "' does not support 'data'.");
                }
                if (spec.Impl != null)
                {
                    throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Table element '" + spec.Name + "' does not support 'impl' in the current 1d table implementation.");
                }
                return;
            case AscetElementSpecKind.Component:
                if (spec.Calibration.HasValue)
                {
                    throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Component element '" + spec.Name + "' does not support 'calibration'.");
                }
                if (String.IsNullOrWhiteSpace(spec.ReferencedComponentPath))
                {
                    throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Component element '" + spec.Name + "' must define 'referencedComponentPath'.");
                }
                if (spec.Data != null)
                {
                    throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Component element '" + spec.Name + "' does not support 'data'.");
                }
                if (spec.Impl != null)
                {
                    throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Component element '" + spec.Name + "' does not support 'impl'.");
                }
                return;
            default:
                throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Unsupported element kind '" + spec.Kind.ToString() + "'.");
        }
    }

    private static void ValidateTwoDTableShapeInParser(AscetElementSpec spec)
    {
        if (spec.YValues == null)
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Table element '" + spec.Name + "' must define 'yValues'.");
        }

        if (spec.Values == null)
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Table element '" + spec.Name + "' must define 'values'.");
        }

        if (spec.Values.Count != spec.XValues.Count)
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Table element '" + spec.Name + "' must define matching xValues row count and values row count.");
        }

        for (int i = 0; i < spec.Values.Count; i++)
        {
            IList row = spec.Values[i] as IList;
            if (row == null || spec.Values[i] is string)
            {
                throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Table element '" + spec.Name + "' requires 'values' to be a 2d array.");
            }

            if (row.Count != spec.YValues.Count)
            {
                throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Table element '" + spec.Name + "' must define rows with length matching yValues.");
            }
        }
    }

    private static void RequirePrimitiveFields(AscetElementSpec spec)
    {
        if (String.IsNullOrWhiteSpace(spec.ModelType))
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Element '" + spec.Name + "' must define 'modelType'.");
        }

        if (String.Equals(spec.ModelType.Trim(), "disc", StringComparison.OrdinalIgnoreCase))
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Element '" + spec.Name + "' uses unsupported ambiguous modelType 'disc'; use a concrete ASCET modelType such as 'udisc', 'sdisc', 'log', or 'cont'.");
        }

        if (String.IsNullOrWhiteSpace(spec.Scope))
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Element '" + spec.Name + "' must define 'scope'.");
        }
    }

    private static AscetElementSpecKind ParseKind(string value)
    {
        switch (NormalizeToken(value))
        {
            case "variable": return AscetElementSpecKind.Variable;
            case "parameter": return AscetElementSpecKind.Parameter;
            case "array": return AscetElementSpecKind.Array;
            case "enumeration": return AscetElementSpecKind.Enumeration;
            case "table": return AscetElementSpecKind.Table;
            case "component": return AscetElementSpecKind.Component;
            case "argument":
            case "arguments":
            case "return":
            case "returnvalue":
            case "methodparameter":
                throw new AscetReadException("method_signature_not_element_spec", "parse_element_spec", "Method return values and arguments are not element specs; use set_method_signature.");
            default:
                throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Unsupported element kind '" + (value ?? String.Empty) + "'.");
        }
    }

    private static object NormalizeJsonValue(object value)
    {
        IList list = value as IList;
        if (list != null && !(value is string))
        {
            List<object> normalized = new List<object>();
            for (int i = 0; i < list.Count; i++)
            {
                normalized.Add(NormalizeJsonValue(list[i]));
            }
            return normalized;
        }

        IDictionary<string, object> map = value as IDictionary<string, object>;
        if (map != null)
        {
            Dictionary<string, object> normalized = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
            foreach (KeyValuePair<string, object> pair in map)
            {
                normalized[pair.Key] = NormalizeJsonValue(pair.Value);
            }
            return normalized;
        }

        return value;
    }

    private static Dictionary<string, object> AsObjectMap(object value, string context)
    {
        IDictionary<string, object> map = value as IDictionary<string, object>;
        if (map == null)
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Property '" + context + "' must be an object.");
        }

        Dictionary<string, object> result = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
        foreach (KeyValuePair<string, object> pair in map)
        {
            result[pair.Key] = pair.Value;
        }
        return result;
    }

    private static string RequireString(IDictionary<string, object> map, string key, string message)
    {
        string value = ReadOptionalString(map, key);
        if (String.IsNullOrWhiteSpace(value))
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", message);
        }
        return value;
    }

    private static string ReadOptionalString(IDictionary<string, object> map, string key)
    {
        object value;
        if (!TryGetValue(map, key, out value) || value == null)
        {
            return null;
        }

        string result = Convert.ToString(value);
        return String.IsNullOrWhiteSpace(result) ? null : result.Trim();
    }

    private static int? ReadOptionalInt(IDictionary<string, object> map, string key)
    {
        object value;
        if (!TryGetValue(map, key, out value) || value == null)
        {
            return null;
        }

        return ToInt32(value, "Property '" + key + "' must be an integer.");
    }

    private static object ReadOptionalValue(IDictionary<string, object> map, string key)
    {
        object value;
        if (!TryGetValue(map, key, out value) || value == null)
        {
            return null;
        }

        return NormalizeJsonValue(value);
    }

    private static AscetElementRangeSpec ReadOptionalRange(IDictionary<string, object> map, string key, string context)
    {
        object value;
        if (!TryGetValue(map, key, out value) || value == null)
        {
            return null;
        }

        IDictionary<string, object> range = AsObjectMap(value, context);
        RejectUnknownFields(range, context, AscetElementWriteContract.RangeFields);
        object minValue;
        object maxValue;
        if (!TryGetValue(range, "min", out minValue) || !TryGetValue(range, "max", out maxValue) || minValue == null || maxValue == null)
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Property '" + context + "' must define both 'min' and 'max'.");
        }

        return new AscetElementRangeSpec
        {
            Min = NormalizeJsonValue(minValue),
            Max = NormalizeJsonValue(maxValue)
        };
    }

    private static IList<object> ReadOptionalArrayValue(IDictionary<string, object> map, string key, string context)
    {
        object value;
        if (!TryGetValue(map, key, out value) || value == null)
        {
            return null;
        }

        IList list = NormalizeJsonValue(value) as IList;
        if (list == null || value is string)
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Property '" + context + "' must be an array.");
        }

        List<object> result = new List<object>();
        for (int i = 0; i < list.Count; i++)
        {
            result.Add(list[i]);
        }

        return result;
    }

    private static bool? ReadOptionalBoolean(IDictionary<string, object> map, string key)
    {
        object value;
        if (!TryGetValue(map, key, out value) || value == null)
        {
            return null;
        }

        try
        {
            return Convert.ToBoolean(value);
        }
        catch (Exception ex)
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Property '" + key + "' must be a boolean.", ex);
        }
    }

    private static bool? ReadOptionalStrictBoolean(IDictionary<string, object> map, string key)
    {
        object value;
        if (!TryGetValue(map, key, out value) || value == null)
        {
            return null;
        }

        if (value is bool)
        {
            return (bool)value;
        }

        throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Property '" + key + "' must be a boolean.");
    }

    private static void RejectUnknownFields(IDictionary<string, object> map, string context, IList<string> allowedFields)
    {
        if (map == null)
        {
            return;
        }

        foreach (KeyValuePair<string, object> pair in map)
        {
            bool allowed = false;
            if (allowedFields != null)
            {
                for (int i = 0; i < allowedFields.Count; i++)
                {
                    if (String.Equals(pair.Key, allowedFields[i], StringComparison.OrdinalIgnoreCase))
                    {
                        allowed = true;
                        break;
                    }
                }
            }

            if (!allowed)
            {
                throw new AscetReadException(
                    "unknown_element_spec_field",
                    "parse_element_spec",
                    "Unknown property '" + context + "." + pair.Key + "'.");
            }
        }
    }

    private static bool TryGetValue(IDictionary<string, object> map, string key, out object value)
    {
        value = null;
        if (map == null || String.IsNullOrWhiteSpace(key))
        {
            return false;
        }

        foreach (KeyValuePair<string, object> pair in map)
        {
            if (String.Equals(pair.Key, key, StringComparison.OrdinalIgnoreCase))
            {
                value = pair.Value;
                return true;
            }
        }

        return false;
    }

    private static int ToInt32(object value, string message)
    {
        try
        {
            double raw = Convert.ToDouble(value);
            if (Math.Abs(raw - Math.Round(raw)) > 0.0000001d)
            {
                throw new InvalidCastException();
            }
            return Convert.ToInt32(Math.Round(raw));
        }
        catch (Exception ex)
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", message, ex);
        }
    }

    private static string NormalizeComponentPath(string path)
    {
        if (String.IsNullOrWhiteSpace(path))
        {
            return null;
        }

        string normalized = path.Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }

        return String.IsNullOrWhiteSpace(normalized) ? null : normalized;
    }

    private static string NormalizeTableDimension(string value)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        string normalized = value.Trim().Replace("-", String.Empty).Replace("_", String.Empty).ToLowerInvariant();
        if (normalized == "1d")
        {
            return "1d";
        }

        if (normalized == "2d")
        {
            return "2d";
        }

        return value.Trim();
    }

    private static string NormalizeToken(string value)
    {
        return String.IsNullOrWhiteSpace(value) ? String.Empty : value.Trim().ToLowerInvariant();
    }
}

internal static class AscetElementSpecSemanticRules
{
    public static void NormalizeAndValidate(AscetElementSpecDocument document)
    {
        if (document == null || document.Elements == null)
        {
            return;
        }

        HashSet<string> names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        for (int i = 0; i < document.Elements.Count; i++)
        {
            AscetElementSpec element = document.Elements[i];
            if (element == null)
            {
                continue;
            }

            NormalizeElement(element);
            ValidateElement(element);

            string name = element.Name ?? String.Empty;
            if (!names.Add(name))
            {
                throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Duplicate element name '" + name + "'.");
            }
        }
    }

    private static void NormalizeElement(AscetElementSpec element)
    {
        if (element == null || element.Impl == null || String.IsNullOrWhiteSpace(element.Impl.ValueType))
        {
            return;
        }

        string normalized = NormalizeImplType(element.Impl.ValueType);
        element.Impl.ValueType = normalized;
    }

    private static void ValidateElement(AscetElementSpec element)
    {
        if (element == null)
        {
            return;
        }

        if (element.Kind == AscetElementSpecKind.Enumeration)
        {
            ValidateEnumerationElement(element);
            return;
        }

        if (element.Kind == AscetElementSpecKind.Table)
        {
            ValidateTableElement(element);
            return;
        }

        ValidateRangeOrder(element.Name, "physicalRange", element.PhysicalRange);
        if (element.Impl != null)
        {
            ValidateRangeOrder(element.Name, "impl.implementationRange", element.Impl.ImplementationRange);
        }
        ValidateSingleRangeSource(element);

        ValidateImportedParameter(element);

        string modelType = NormalizeToken(element.ModelType);
        if (modelType == "log")
        {
            ValidateLogicalElement(element);
            return;
        }

        ValidateParameterLimitAssignments(element);
        ValidateNonLogicalElement(element, modelType);
    }

    private static void ValidateSingleRangeSource(AscetElementSpec element)
    {
        if (element != null &&
            element.PhysicalRange != null &&
            element.Impl != null &&
            element.Impl.ImplementationRange != null)
        {
            throw new AscetReadException(
                "invalid_element_spec",
                "parse_element_spec",
                "Element '" + element.Name + "' must not define both physicalRange and impl.implementationRange; ASCET ToolAPI writes only one range source at a time.");
        }
    }

    private static void ValidateImportedParameter(AscetElementSpec element)
    {
        if (element == null ||
            element.Kind != AscetElementSpecKind.Parameter ||
            !String.Equals(NormalizeToken(element.Scope), "imported", StringComparison.Ordinal))
        {
            return;
        }

        if (element.Data != null || element.PhysicalRange != null || element.Impl != null)
        {
            throw new AscetReadException(
                "invalid_element_spec",
                "parse_element_spec",
                "Imported parameter '" + element.Name + "' must not define data, physicalRange, or impl settings; imported parameters are not written through local implementation data.");
        }
    }

    private static void ValidateParameterLimitAssignments(AscetElementSpec element)
    {
        if (!AscetElementSyncSpecRules.RequiresParameterLimitAssignment(element))
        {
            return;
        }

        if (element.Impl != null &&
            element.Impl.LimitAssignments.HasValue &&
            !element.Impl.LimitAssignments.Value)
        {
            throw new AscetReadException(
                "invalid_element_spec",
                "parse_element_spec",
                "Parameter element '" + element.Name + "' must use impl.limitAssignments=true when writing physicalRange or impl.implementationRange.");
        }
    }

    private static void ValidateEnumerationElement(AscetElementSpec element)
    {
        if (element.PhysicalRange != null)
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Enumeration element '" + element.Name + "' must not define physicalRange.");
        }

        if (element.Data != null && element.Data.Value is IList && !(element.Data.Value is string))
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Enumeration element '" + element.Name + "' requires data.value to be a scalar literal name.");
        }
    }

    private static void ValidateTableElement(AscetElementSpec element)
    {
        if (String.Equals(element.TableDimension ?? String.Empty, "1d", StringComparison.Ordinal))
        {
            if (element.XValues == null || element.Values == null)
            {
                throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Table element '" + element.Name + "' must define xValues and values.");
            }

            if (element.XValues.Count != element.Values.Count)
            {
                throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Table element '" + element.Name + "' must define matching xValues and values lengths.");
            }
            return;
        }

        if (String.Equals(element.TableDimension ?? String.Empty, "2d", StringComparison.Ordinal))
        {
            ValidateTwoDTableShape(element);
            return;
        }

        throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Table element '" + element.Name + "' has unsupported tableDimension '" + (element.TableDimension ?? String.Empty) + "'.");
    }

    private static void ValidateTwoDTableShape(AscetElementSpec element)
    {
        if (element.YValues == null)
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Table element '" + element.Name + "' must define 'yValues'.");
        }

        if (element.Values == null)
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Table element '" + element.Name + "' must define 'values'.");
        }

        if (element.Values.Count != element.XValues.Count)
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Table element '" + element.Name + "' must define matching xValues row count and values row count.");
        }

        for (int i = 0; i < element.Values.Count; i++)
        {
            IList row = element.Values[i] as IList;
            if (row == null || element.Values[i] is string)
            {
                throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Table element '" + element.Name + "' requires 'values' to be a 2d array.");
            }

            if (row.Count != element.YValues.Count)
            {
                throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Table element '" + element.Name + "' must define rows with length matching yValues.");
            }
        }
    }

    private static void ValidateLogicalElement(AscetElementSpec element)
    {
        if (element.PhysicalRange != null)
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Logical element '" + element.Name + "' must not define physicalRange.");
        }

        AscetElementImplSpec impl = element.Impl;
        if (impl == null)
        {
            return;
        }

        if (impl.ImplementationRange != null)
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Logical element '" + element.Name + "' must not define impl.implementationRange.");
        }

        if (!String.IsNullOrWhiteSpace(impl.Formula))
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Logical element '" + element.Name + "' must not define impl.formula.");
        }

        if (impl.LimitAssignments.HasValue)
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Logical element '" + element.Name + "' must not define impl.limitAssignments.");
        }

        if (!String.IsNullOrWhiteSpace(impl.ValueType) && !IsLogicalImplementationType(impl.ValueType))
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Logical element '" + element.Name + "' has unsupported impl.valueType '" + impl.ValueType + "'.");
        }
    }

    private static void ValidateNonLogicalElement(AscetElementSpec element, string normalizedModelType)
    {
        AscetElementImplSpec impl = element == null ? null : element.Impl;
        if (impl == null)
        {
            return;
        }

        if (String.IsNullOrWhiteSpace(impl.ValueType))
        {
            return;
        }

        string normalizedImpl = NormalizeToken(impl.ValueType);
        if (normalizedImpl == "bit" || normalizedImpl == "bool")
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Non-logical element '" + element.Name + "' must not use impl.valueType '" + impl.ValueType + "'.");
        }

        if (IsRealImplementationType(normalizedImpl) && normalizedModelType != "cont")
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Element '" + element.Name + "' with modelType '" + element.ModelType + "' must not use real impl.valueType '" + impl.ValueType + "'.");
        }
    }

    private static void ValidateRangeOrder(string elementName, string fieldName, AscetElementRangeSpec range)
    {
        if (range == null)
        {
            return;
        }

        double min = AscetElementSyncSpecRules.ParseDoubleValue(Convert.ToString(range.Min, System.Globalization.CultureInfo.InvariantCulture));
        double max = AscetElementSyncSpecRules.ParseDoubleValue(Convert.ToString(range.Max, System.Globalization.CultureInfo.InvariantCulture));
        if (min > max)
        {
            throw new AscetReadException("invalid_element_spec", "parse_element_spec", "Element '" + elementName + "' has invalid " + fieldName + " because min is greater than max.");
        }
    }

    private static bool IsLogicalImplementationType(string valueType)
    {
        string normalized = NormalizeToken(valueType);
        return normalized == "bit" ||
               normalized == "bool" ||
               normalized == "int8" ||
               normalized == "int16" ||
               normalized == "int32" ||
               normalized == "uint8" ||
               normalized == "uint16" ||
               normalized == "uint32";
    }

    private static bool IsRealImplementationType(string normalizedImplType)
    {
        return normalizedImplType == "real32" ||
               normalizedImplType == "real64" ||
               normalizedImplType == "float32" ||
               normalizedImplType == "double";
    }

    private static string NormalizeImplType(string valueType)
    {
        string normalized = NormalizeToken(valueType);
        switch (normalized)
        {
            case "sint8":
                return "int8";
            case "sint16":
                return "int16";
            case "sint32":
                return "int32";
            case "sint64":
                return "int64";
            default:
                return String.IsNullOrWhiteSpace(valueType) ? valueType : valueType.Trim();
        }
    }

    private static string NormalizeToken(string value)
    {
        return String.IsNullOrWhiteSpace(value) ? String.Empty : value.Trim().ToLowerInvariant();
    }
}

internal static class AscetElementCatalogReader
{
    public static List<AscetExistingElementState> ReadExistingElements(AscetDiscreteComponent component, CodeComponent owner)
    {
        List<AscetExistingElementState> result = new List<AscetExistingElementState>();
        TableReadTrace("ReadExistingElements:start");
        Array modelElements = component == null ? null : (component.GetAllModelElements() as Array);
        if (modelElements == null)
        {
            TableReadTrace("ReadExistingElements:modelElements-null");
            return result;
        }

        TableReadTrace("ReadExistingElements:modelElements-count:" + modelElements.Length.ToString());
        DataConfiguration defaultData = owner == null ? null : owner.GetDefaultData();
        ImplConfiguration defaultImplementation = component == null ? null : component.GetDefaultImplementation();
        ImplConfiguration classImplementation = component == null ? null : component.GetClassImplementation();
        for (int i = 0; i < modelElements.Length; i++)
        {
            object current = modelElements.GetValue(i);
            if (current == null)
            {
                TableReadTrace("ReadExistingElements:item-null:" + i.ToString());
                continue;
            }

            TableReadTrace("ReadExistingElements:item:" + i.ToString() + ":" + SafeGetString(current, "GetName") + ":" + current.GetType().FullName);
            PrimitiveModelElement primitive = current as PrimitiveModelElement;
            if (primitive != null)
            {
                TableReadTrace("ReadExistingElements:primitive-before:" + SafeGetString(primitive, "GetName"));
                result.Add(BuildPrimitiveState(primitive, defaultData, defaultImplementation, classImplementation));
                TableReadTrace("ReadExistingElements:primitive-after:" + SafeGetString(primitive, "GetName"));
                continue;
            }

            ComplexModelElement complex = current as ComplexModelElement;
            if (complex != null)
            {
                TableReadTrace("ReadExistingElements:complex-before:" + SafeGetString(complex, "GetName"));
                result.Add(BuildComplexState(complex));
                TableReadTrace("ReadExistingElements:complex-after:" + SafeGetString(complex, "GetName"));
            }
        }

        TableReadTrace("ReadExistingElements:done:" + result.Count.ToString());
        return result;
    }

    public static AscetElementSpecDocument BuildSpecDocument(IList<AscetExistingElementState> existingElements)
    {
        List<AscetElementSpec> elements = new List<AscetElementSpec>();
        if (existingElements != null)
        {
            for (int i = 0; i < existingElements.Count; i++)
            {
                AscetExistingElementState state = existingElements[i];
                if (state == null || String.IsNullOrWhiteSpace(state.Name))
                {
                    continue;
                }

                elements.Add(BuildSpec(state));
            }
        }

        return new AscetElementSpecDocument { Elements = elements };
    }

    private static AscetElementSpec BuildSpec(AscetExistingElementState state)
    {
        AscetElementSpec spec = new AscetElementSpec
        {
            Name = state.Name,
            Kind = state.Kind,
            ModelType = state.ModelType,
            Scope = state.Scope,
            Length = state.Length,
            EnumerationPath = state.EnumerationPath,
            TableDimension = state.TableDimension,
            XValues = state.XValues == null ? null : CloneList(state.XValues),
            YValues = state.YValues == null ? null : CloneList(state.YValues),
            Values = state.Values == null ? null : CloneList(state.Values),
            ReferencedComponentPath = state.ReferencedComponentPath,
            Unit = EmptyToNull(state.Unit),
            Comment = EmptyToNull(state.Comment),
            Calibration = state.Calibration,
            ConfigurationProvenance = state.ConfigurationProvenance
        };

        double minValue;
        double maxValue;
        if (AscetElementSyncSpecRules.TryParseRangeString(state.PhysicalRange, out minValue, out maxValue))
        {
            spec.PhysicalRange = new AscetElementRangeSpec
            {
                Min = ConvertRangeBound(minValue),
                Max = ConvertRangeBound(maxValue)
            };
        }

        if (state.DataValue != null)
        {
            spec.Data = new AscetElementDataSpec
            {
                Value = CloneValue(state.DataValue)
            };
        }

        AscetElementImplSpec impl = new AscetElementImplSpec
        {
            MemoryLocation = EmptyToNull(state.MemoryLocation),
            ValueType = EmptyToNull(state.ValueType),
            Formula = EmptyToNull(state.Formula),
            LimitAssignments = state.LimitAssignments
        };

        if (AscetElementSyncSpecRules.TryParseRangeString(state.ImplRange, out minValue, out maxValue))
        {
            impl.ImplementationRange = new AscetElementRangeSpec
            {
                Min = ConvertRangeBound(minValue),
                Max = ConvertRangeBound(maxValue)
            };
        }

        if (!String.IsNullOrWhiteSpace(impl.MemoryLocation) ||
            !String.IsNullOrWhiteSpace(impl.ValueType) ||
            impl.ImplementationRange != null ||
            !String.IsNullOrWhiteSpace(impl.Formula) ||
            impl.LimitAssignments.HasValue)
        {
            spec.Impl = impl;
        }

        return spec;
    }

    private static AscetExistingElementState BuildPrimitiveState(PrimitiveModelElement element, DataConfiguration defaultData, ImplConfiguration defaultImplementation, ImplConfiguration classImplementation)
    {
        TableReadTrace("BuildPrimitiveState:start:" + SafeGetString(element, "GetName") + ":" + (element == null ? "null" : element.GetType().FullName));
        TwoDTableElement twoDTable = element as TwoDTableElement;
        OneDTableElement oneDTable = twoDTable == null ? (element as OneDTableElement) : null;
        ArrayElement array = element as ArrayElement;
        AscetEnumeration enumerator = GetEnumeratorReference(element);
        bool isEnumeration = oneDTable == null && enumerator != null;
        AscetElementSpecKind kind = array != null
            ? AscetElementSpecKind.Array
            : (oneDTable != null || twoDTable != null)
                ? AscetElementSpecKind.Table
                : isEnumeration
                    ? AscetElementSpecKind.Enumeration
                    : (SafeGetBool(element, "IsParameter") ? AscetElementSpecKind.Parameter : AscetElementSpecKind.Variable);
        ImplItem implementation = ResolveImplementationItem(element, defaultImplementation, classImplementation);
        BoolImpl boolImpl = implementation as BoolImpl;
        ScalarImpl scalarImpl = implementation as ScalarImpl;
        ImplInfo info = scalarImpl == null ? null : scalarImpl.GetImplInfoForValue();
        IList<object> xValues = twoDTable != null ? ReadTwoDTableXValues(element, defaultData) : (oneDTable == null ? null : ReadOneDTableXValues(element, defaultData));
        IList<object> yValues = twoDTable == null ? null : ReadTwoDTableYValues(element, defaultData);
        IList<object> values = twoDTable != null ? ReadTwoDTableValues(element, defaultData) : (oneDTable == null ? null : ReadOneDTableValues(element, defaultData));
        TableReadTrace("BuildPrimitiveState:table-shape:" + SafeGetString(element, "GetName") + ":dim=" + (twoDTable != null ? "2d" : (oneDTable != null ? "1d" : "n/a")) + ":x=" + (xValues == null ? "null" : xValues.Count.ToString()) + ":y=" + (yValues == null ? "null" : yValues.Count.ToString()) + ":v=" + (values == null ? "null" : values.Count.ToString()));
        object dataValue = oneDTable != null
            ? null
            : ReadDataValue(element, defaultData, array != null);

        string valueType = boolImpl != null ? SafeGetString(boolImpl, "GetImplType") : SafeGetString(info, "GetImplType");
        string oid = SafeGetString(element, "GetOID");
        if (String.IsNullOrWhiteSpace(oid))
        {
            oid = SafeGetString(element, "GetOid");
        }

        AscetExistingElementState state = new AscetExistingElementState
        {
            Name = SafeGetString(element, "GetName"),
            Oid = oid,
            Kind = kind,
            ModelType = SafeGetString(element, "GetModelType"),
            Scope = SafeGetString(element, "GetScope"),
            PhysicalRange = ReadRange(info, true, SafeGetString(element, "GetModelType"), valueType),
            Length = twoDTable != null ? twoDTable.GetMaxXSize() : (oneDTable != null ? oneDTable.GetMaxSize() : (array == null ? (int?)null : array.GetMaxSize())),
            EnumerationPath = NormalizeComponentPath(SafeGetString(enumerator, "GetNameWithPath")),
            TableDimension = twoDTable != null ? "2d" : (oneDTable == null ? null : "1d"),
            XValues = xValues,
            YValues = yValues,
            Values = values,
            Unit = SafeGetString(element, "GetUnit"),
            Comment = SafeGetString(element, "GetComment"),
            Calibration = SafeGetBool(element, "IsCalibration"),
            ConfigurationProvenance = new AscetElementConfigurationProvenance
            {
                DataConfiguration = ResolveDataConfigurationProvenance(element, defaultData),
                ImplementationConfiguration = ResolveImplementationConfigurationProvenance(element, defaultImplementation, classImplementation)
            },
            DataValue = dataValue,
            MemoryLocation = SafeGetString(implementation, "GetMemoryLocation"),
            ValueType = valueType,
            ImplRange = ReadRange(info, false, SafeGetString(element, "GetModelType"), valueType),
            Formula = SafeGetString(info, "GetFormulaName"),
            LimitAssignments = SafeGetNullableBool(info, "GetOptionLimitAssignment")
        };
        TableReadTrace("BuildPrimitiveState:done:" + state.Name + ":" + state.Kind.ToString());
        return state;
    }

    private static AscetExistingElementState BuildComplexState(ComplexModelElement element)
    {
        object represented = InvokeOptional(element, "GetRepresentedClass");
        string oid = SafeGetString(element, "GetOID");
        if (String.IsNullOrWhiteSpace(oid))
        {
            oid = SafeGetString(element, "GetOid");
        }
        return new AscetExistingElementState
        {
            Name = SafeGetString(element, "GetName"),
            Oid = oid,
            Kind = AscetElementSpecKind.Component,
            ReferencedComponentPath = NormalizeComponentPath(SafeGetString(represented, "GetNameWithPath")),
            Unit = SafeGetString(element, "GetUnit"),
            Comment = SafeGetString(element, "GetComment")
        };
    }

    private static ImplItem ResolveImplementationItem(PrimitiveModelElement element, ImplConfiguration defaultImplementation, ImplConfiguration classImplementation)
    {
        ImplConfiguration preferredImplementation = SafeGetBool(element, "IsExported")
            ? classImplementation
            : defaultImplementation;
        ImplConfiguration fallbackImplementation = SafeGetBool(element, "IsExported")
            ? defaultImplementation
            : classImplementation;
        ImplItem item = preferredImplementation == null ? null : preferredImplementation.GetItem(element);
        if (item == null)
        {
            item = fallbackImplementation == null ? null : fallbackImplementation.GetItem(element);
        }
        return item ?? (element == null ? null : element.GetImplementation());
    }

    private static AscetEnumeration GetEnumeratorReference(object element)
    {
        try
        {
            if (element == null)
            {
                return null;
            }

            MethodInfo method = element.GetType().GetMethod("GetEnumerator", BindingFlags.Instance | BindingFlags.Public);
            if (method == null || method.GetParameters().Length != 0)
            {
                return null;
            }

            return method.Invoke(element, null) as AscetEnumeration;
        }
        catch
        {
            return null;
        }
    }

    private static IList<object> ReadOneDTableXValues(PrimitiveModelElement element, DataConfiguration defaultData)
    {
        TableReadTrace("ReadOneDTableXValues:start:" + SafeGetString(element, "GetName"));
        OneDTableData elementData = element == null ? null : element.GetValue() as OneDTableData;
        OneDTableData defaultItem = defaultData == null ? null : defaultData.GetItem(element) as OneDTableData;
        TableReadTrace("ReadOneDTableXValues:sources:element=" + FormatDebugArraySource(elementData == null ? null : elementData.GetDistribution()) + ":default=" + FormatDebugArraySource(defaultItem == null ? null : defaultItem.GetDistribution()));
        OneDTableData tableData = ResolveOneDTableData(element, defaultData);
        if (tableData == null)
        {
            TableReadTrace("ReadOneDTableXValues:tableData-null");
            return null;
        }

        DistributionData distribution = tableData.GetDistribution();
        TableReadTrace("ReadOneDTableXValues:distribution:" + (distribution == null ? "null" : distribution.GetType().FullName));
        return ReadFirstAvailableValue(
            distribution,
            new[] { "GetBooleanValue", "GetIntegerValue", "GetLongValue", "GetDoubleValue", "GetFloatValue" },
            true) as IList<object>;
    }

    private static IList<object> ReadOneDTableValues(PrimitiveModelElement element, DataConfiguration defaultData)
    {
        TableReadTrace("ReadOneDTableValues:start:" + SafeGetString(element, "GetName"));
        OneDTableData elementData = element == null ? null : element.GetValue() as OneDTableData;
        OneDTableData defaultItem = defaultData == null ? null : defaultData.GetItem(element) as OneDTableData;
        TableReadTrace("ReadOneDTableValues:sources:element=" + FormatDebugArraySource(elementData == null ? null : elementData.GetValue()) + ":default=" + FormatDebugArraySource(defaultItem == null ? null : defaultItem.GetValue()));
        OneDTableData tableData = ResolveOneDTableData(element, defaultData);
        if (tableData == null)
        {
            TableReadTrace("ReadOneDTableValues:tableData-null");
            return null;
        }

        ArrayData values = tableData.GetValue();
        TableReadTrace("ReadOneDTableValues:valueData:" + (values == null ? "null" : values.GetType().FullName));
        return ReadFirstAvailableValue(
            values,
            new[] { "GetBooleanValue", "GetIntegerValue", "GetLongValue", "GetDoubleValue", "GetFloatValue" },
            true) as IList<object>;
    }

    private static IList<object> ReadTwoDTableXValues(PrimitiveModelElement element, DataConfiguration defaultData)
    {
        TwoDTableData tableData = ResolveTwoDTableData(element, defaultData);
        if (tableData == null)
        {
            return null;
        }

        return ReadFirstAvailableValue(
            tableData.GetXDistribution(),
            new[] { "GetBooleanValue", "GetIntegerValue", "GetLongValue", "GetDoubleValue", "GetFloatValue" },
            true) as IList<object>;
    }

    private static IList<object> ReadTwoDTableYValues(PrimitiveModelElement element, DataConfiguration defaultData)
    {
        TwoDTableData tableData = ResolveTwoDTableData(element, defaultData);
        if (tableData == null)
        {
            return null;
        }

        return ReadFirstAvailableValue(
            tableData.GetYDistribution(),
            new[] { "GetBooleanValue", "GetIntegerValue", "GetLongValue", "GetDoubleValue", "GetFloatValue" },
            true) as IList<object>;
    }

    private static IList<object> ReadTwoDTableValues(PrimitiveModelElement element, DataConfiguration defaultData)
    {
        TwoDTableData tableData = ResolveTwoDTableData(element, defaultData);
        if (tableData == null)
        {
            return null;
        }

        return ReadFirstAvailableValue(
            tableData.GetValue(),
            new[] { "GetBooleanValue", "GetIntegerValue", "GetLongValue", "GetDoubleValue", "GetFloatValue" },
            true) as IList<object>;
    }

    private static OneDTableData ResolveOneDTableData(PrimitiveModelElement element, DataConfiguration defaultData)
    {
        return ResolveDataItemForRead(element, defaultData) as OneDTableData;
    }

    private static TwoDTableData ResolveTwoDTableData(PrimitiveModelElement element, DataConfiguration defaultData)
    {
        return ResolveDataItemForRead(element, defaultData) as TwoDTableData;
    }

    private static void TableReadTrace(string message)
    {
        string enabled = Environment.GetEnvironmentVariable("ASCET_TABLE_TRACE");
        if (!String.Equals(enabled, "1", StringComparison.Ordinal))
        {
            return;
        }

        string path = Environment.GetEnvironmentVariable("ASCET_TABLE_TRACE_PATH");
        if (String.IsNullOrWhiteSpace(path))
        {
            path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "AscetElementTableRead.trace.log");
        }

        try
        {
            File.AppendAllText(path, DateTime.Now.ToString("O") + " " + message + Environment.NewLine);
        }
        catch
        {
        }
    }

    private static string FormatDebugArraySource(object target)
    {
        if (target == null)
        {
            return "<null>";
        }

        IList<object> values = ReadFirstAvailableValue(
            target,
            new[] { "GetBooleanValue", "GetIntegerValue", "GetLongValue", "GetDoubleValue", "GetFloatValue" },
            true) as IList<object>;

        if (values == null)
        {
            return "<unreadable>";
        }

        List<string> parts = new List<string>();
        for (int i = 0; i < values.Count; i++)
        {
            parts.Add(Convert.ToString(values[i], System.Globalization.CultureInfo.InvariantCulture));
        }
        return "[" + String.Join(", ", parts.ToArray()) + "]";
    }

    private static void TableDebugStderr(string message)
    {
        string enabled = Environment.GetEnvironmentVariable("ASCET_TABLE_DEBUG_STDERR");
        if (!String.Equals(enabled, "1", StringComparison.Ordinal))
        {
            return;
        }

        try
        {
            Console.Error.WriteLine("TABLE_DEBUG " + message);
        }
        catch
        {
        }
    }

    private static DataConfiguration ResolveDataConfigurationForRead(PrimitiveModelElement element, DataConfiguration defaultData)
    {
        if (element == null || !String.Equals(SafeGetString(element, "GetScope"), "exported", StringComparison.OrdinalIgnoreCase))
        {
            return defaultData;
        }

        CodeComponent owner = InvokeOptional(element, "GetOwnerForElement") as CodeComponent;
        AscetDiscreteComponent discrete = owner as AscetDiscreteComponent;
        DataConfiguration classData = discrete == null ? null : discrete.GetClassData();
        return classData ?? defaultData;
    }

    private static DataItem ResolveDataItemForRead(PrimitiveModelElement element, DataConfiguration defaultData)
    {
        DataConfiguration effectiveData = ResolveDataConfigurationForRead(element, defaultData);
        DataItem item = effectiveData == null || element == null ? null : effectiveData.GetItem(element);
        return item ?? (element == null ? null : element.GetValue());
    }

    private static AscetConfigurationProvenance ResolveDataConfigurationProvenance(
        PrimitiveModelElement element,
        DataConfiguration defaultData)
    {
        DataConfiguration effective = ResolveDataConfigurationForRead(element, defaultData);
        DataItem configured = effective == null || element == null ? null : effective.GetItem(element);
        bool exported = String.Equals(SafeGetString(element, "GetScope"), "exported", StringComparison.OrdinalIgnoreCase);
        if (configured != null)
        {
            return new AscetConfigurationProvenance
            {
                Source = exported && !Object.ReferenceEquals(effective, defaultData) ? "classDataConfiguration" : "defaultDataConfiguration",
                ConfigurationName = SafeGetString(effective, "GetName"),
                Selected = true
            };
        }

        return new AscetConfigurationProvenance
        {
            Source = element != null && element.GetValue() != null ? "elementValue" : "unresolved",
            ConfigurationName = String.Empty,
            Selected = element != null && element.GetValue() != null
        };
    }

    private static AscetConfigurationProvenance ResolveImplementationConfigurationProvenance(
        PrimitiveModelElement element,
        ImplConfiguration defaultImplementation,
        ImplConfiguration classImplementation)
    {
        bool exported = String.Equals(SafeGetString(element, "GetScope"), "exported", StringComparison.OrdinalIgnoreCase);
        ImplConfiguration preferred = exported ? classImplementation : defaultImplementation;
        ImplConfiguration fallback = exported ? defaultImplementation : classImplementation;
        if (preferred != null && element != null && preferred.GetItem(element) != null)
        {
            return new AscetConfigurationProvenance
            {
                Source = exported ? "classImplementationConfiguration" : "defaultImplementationConfiguration",
                ConfigurationName = SafeGetString(preferred, "GetName"),
                Selected = true
            };
        }
        if (fallback != null && element != null && fallback.GetItem(element) != null)
        {
            return new AscetConfigurationProvenance
            {
                Source = exported ? "defaultImplementationConfiguration" : "classImplementationConfiguration",
                ConfigurationName = SafeGetString(fallback, "GetName"),
                Selected = true
            };
        }
        return new AscetConfigurationProvenance
        {
            Source = element != null && element.GetImplementation() != null ? "elementImplementation" : "unresolved",
            ConfigurationName = String.Empty,
            Selected = element != null && element.GetImplementation() != null
        };
    }

    private static object ReadDataValue(PrimitiveModelElement element, DataConfiguration defaultData, bool isArray)
    {
        DataItem item = ResolveDataItemForRead(element, defaultData);
        if (item == null)
        {
            return null;
        }

        if (isArray)
        {
            return ReadFirstAvailableValue(item, new[] { "GetBooleanValue", "GetIntegerValue", "GetLongValue", "GetDoubleValue", "GetFloatValue" }, true);
        }

        return ReadFirstAvailableValue(item, new[] { "GetBooleanValue", "GetStringValue", "GetIntegerValue", "GetLongValue", "GetDoubleValue", "GetFloatValue" }, false);
    }

    private static object ReadFirstAvailableValue(object target, string[] methodNames, bool expectArray)
    {
        if (target == null || methodNames == null)
        {
            return null;
        }

        for (int i = 0; i < methodNames.Length; i++)
        {
            try
            {
                MethodInfo method = target.GetType().GetMethod(methodNames[i], BindingFlags.Instance | BindingFlags.Public);
                if (method == null || method.GetParameters().Length != 0)
                {
                    continue;
                }

                object value = method.Invoke(target, null);
                if (value == null)
                {
                    continue;
                }

                if (expectArray)
                {
                    Array array = value as Array;
                    if (array == null)
                    {
                        continue;
                    }

                    List<object> result = new List<object>();
                    for (int index = 0; index < array.Length; index++)
                    {
                        result.Add(CloneValue(array.GetValue(index)));
                    }
                    return result;
                }

                if (value is Array)
                {
                    continue;
                }

                return CloneValue(value);
            }
            catch
            {
            }
        }

        return null;
    }

    private static object CloneValue(object value)
    {
        if (value == null)
        {
            return null;
        }

        IList list = value as IList;
        if (list != null && !(value is string))
        {
            List<object> result = new List<object>();
            for (int i = 0; i < list.Count; i++)
            {
                result.Add(CloneValue(list[i]));
            }
            return result;
        }

        if (value is bool || value is string || value is int || value is long || value is double)
        {
            return value;
        }

        if (value is float || value is decimal)
        {
            return Convert.ToDouble(value, System.Globalization.CultureInfo.InvariantCulture);
        }

        if (value is short || value is byte)
        {
            return Convert.ToInt32(value, System.Globalization.CultureInfo.InvariantCulture);
        }

        return Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture);
    }

    private static IList<object> CloneList(IList<object> values)
    {
        if (values == null)
        {
            return null;
        }

        List<object> result = new List<object>();
        for (int i = 0; i < values.Count; i++)
        {
            result.Add(CloneValue(values[i]));
        }
        return result;
    }

    private static object ConvertRangeBound(double value)
    {
        if (Double.IsNegativeInfinity(value))
        {
            return "-oo";
        }

        if (Double.IsPositiveInfinity(value))
        {
            return "oo";
        }

        if (Math.Abs(value - Math.Round(value)) <= 0.0000001d)
        {
            long integer = Convert.ToInt64(Math.Round(value), System.Globalization.CultureInfo.InvariantCulture);
            if (integer >= Int32.MinValue && integer <= Int32.MaxValue)
            {
                return Convert.ToInt32(integer, System.Globalization.CultureInfo.InvariantCulture);
            }

            return integer;
        }

        return value;
    }

    private static string EmptyToNull(string value)
    {
        return String.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static string NormalizeComponentPath(string path)
    {
        if (String.IsNullOrWhiteSpace(path))
        {
            return null;
        }

        string normalized = path.Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }

        return String.IsNullOrWhiteSpace(normalized) ? null : normalized;
    }

    private static string ReadRange(ImplInfo info, bool physicalRange, string modelType, string valueType)
    {
        if (info == null)
        {
            return String.Empty;
        }

        RangeValueKind preferredKind = ResolveReadRangeValueKind(physicalRange, modelType, valueType);
        string preferredValue = FormatRangeValue(InvokeOptional(info, GetRangeAccessorName(preferredKind, physicalRange, false)));
        if (!String.IsNullOrWhiteSpace(preferredValue) && !IsAllInfinityBounds(preferredValue))
        {
            return preferredValue;
        }

        return ReadFirstNonEmptyRange(info, physicalRange, preferredKind);
    }

    private static string ReadFirstNonEmptyRange(ImplInfo info, bool physicalRange, RangeValueKind preferredKind)
    {
        string[] getters = physicalRange
            ? new[] { "GetDoublePhysicalRange", "GetFloatPhysicalRange", "GetLongPhysicalRange", "GetIntegerPhysicalRange" }
            : new[] { "GetDoubleImplRange", "GetFloatImplRange", "GetLongImplRange", "GetIntegerImplRange" };

        for (int i = 0; i < getters.Length; i++)
        {
            if (String.Equals(getters[i], GetRangeAccessorName(preferredKind, physicalRange, false), StringComparison.Ordinal))
            {
                continue;
            }

            string value = FormatRangeValue(InvokeOptional(info, getters[i]));
            if (!String.IsNullOrWhiteSpace(value) && !IsAllInfinityBounds(value))
            {
                return value;
            }
        }

        return String.Empty;
    }

    private static RangeValueKind ResolveReadRangeValueKind(bool physicalRange, string modelType, string valueType)
    {
        string normalizedModel = modelType == null ? String.Empty : modelType.Trim().ToLowerInvariant();
        if (physicalRange && normalizedModel == "cont")
        {
            return RangeValueKind.Double;
        }

        string normalizedValueType = valueType == null ? String.Empty : valueType.Trim().ToLowerInvariant();
        if (normalizedValueType.IndexOf("real32", StringComparison.Ordinal) >= 0 ||
            normalizedValueType.IndexOf("float32", StringComparison.Ordinal) >= 0)
        {
            return RangeValueKind.Float;
        }

        if (normalizedValueType.IndexOf("real64", StringComparison.Ordinal) >= 0 ||
            normalizedValueType.IndexOf("double", StringComparison.Ordinal) >= 0)
        {
            return RangeValueKind.Double;
        }

        if (normalizedValueType.IndexOf("64", StringComparison.Ordinal) >= 0)
        {
            return RangeValueKind.Long;
        }

        return RangeValueKind.Integer;
    }

    private static string GetRangeAccessorName(RangeValueKind kind, bool physicalRange, bool setter)
    {
        string prefix = setter ? "Set" : "Get";
        string suffix = physicalRange ? "PhysicalRange" : "ImplRange";
        switch (kind)
        {
            case RangeValueKind.Double:
                return prefix + "Double" + suffix;
            case RangeValueKind.Float:
                return prefix + "Float" + suffix;
            case RangeValueKind.Long:
                return prefix + "Long" + suffix;
            default:
                return prefix + "Integer" + suffix;
        }
    }

    private static string FormatRangeValue(object value)
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
            values.Add(entry == null ? String.Empty : Convert.ToString(entry, System.Globalization.CultureInfo.InvariantCulture));
        }

        return "[" + String.Join(", ", values.ToArray()) + "]";
    }

    private static bool IsAllInfinityBounds(string rangeValue)
    {
        if (String.IsNullOrWhiteSpace(rangeValue))
        {
            return false;
        }

        string trimmed = rangeValue.Trim();
        if (!trimmed.StartsWith("[") || !trimmed.EndsWith("]"))
        {
            return false;
        }

        string inner = trimmed.Substring(1, trimmed.Length - 2);
        string[] parts = inner.Split(',');
        for (int i = 0; i < parts.Length; i++)
        {
            string part = parts[i].Trim();
            if (!String.Equals(part, "Infinity", StringComparison.OrdinalIgnoreCase) &&
                !String.Equals(part, "-Infinity", StringComparison.OrdinalIgnoreCase) &&
                !String.Equals(part, "+Infinity", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }
        }

        return true;
    }

    private static bool? SafeGetNullableBool(object target, string methodName)
    {
        try
        {
            if (target == null)
            {
                return null;
            }

            MethodInfo method = target.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
            if (method == null)
            {
                return null;
            }

            object value = method.Invoke(target, null);
            if (value == null)
            {
                return null;
            }

            return Convert.ToBoolean(value, System.Globalization.CultureInfo.InvariantCulture);
        }
        catch
        {
            return null;
        }
    }

    private static string SafeGetString(object target, string methodName)
    {
        try
        {
            if (target == null)
            {
                return null;
            }

            MethodInfo method = target.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
            if (method == null)
            {
                return null;
            }

            object value = method.Invoke(target, null);
            return value == null ? null : Convert.ToString(value);
        }
        catch
        {
            return null;
        }
    }

    private static bool SafeGetBool(object target, string methodName)
    {
        try
        {
            if (target == null)
            {
                return false;
            }

            MethodInfo method = target.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
            if (method == null)
            {
                return false;
            }

            object value = method.Invoke(target, null);
            return value != null && Convert.ToBoolean(value, System.Globalization.CultureInfo.InvariantCulture);
        }
        catch
        {
            return false;
        }
    }

    private static object InvokeOptional(object target, string methodName)
    {
        try
        {
            if (target == null)
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
        catch
        {
            return null;
        }
    }
}

public sealed class ComponentElementSyncPlanner
{
    public AscetElementSpecDiffResult BuildDiff(string componentPath, AscetElementSpecDocument spec, IList<AscetExistingElementState> existingElements)
    {
        if (spec == null)
        {
            throw new AscetReadException("invalid_argument", "diff_element_spec", "Element spec document must not be null.");
        }

        IList<AscetElementSpec> requested = spec.Elements ?? new List<AscetElementSpec>();
        Dictionary<string, AscetExistingElementState> existing = BuildExistingIndex(existingElements);
        HashSet<string> requestedNames = new HashSet<string>(StringComparer.Ordinal);
        List<AscetElementCatalogEntry> added = new List<AscetElementCatalogEntry>();
        List<AscetElementCatalogEntry> removed = new List<AscetElementCatalogEntry>();
        List<AscetElementModifiedDiff> modified = new List<AscetElementModifiedDiff>();
        List<AscetElementIncompatibleDiff> incompatible = new List<AscetElementIncompatibleDiff>();
        List<AscetElementCatalogEntry> skipped = new List<AscetElementCatalogEntry>();

        for (int i = 0; i < requested.Count; i++)
        {
            AscetElementSpec element = requested[i];
            if (element == null)
            {
                throw new AscetReadException("invalid_element_spec", "diff_element_spec", "Element spec at index " + i.ToString() + " must not be null.");
            }

            string name = element.Name ?? String.Empty;
            requestedNames.Add(name);

            AscetExistingElementState state;
            if (!existing.TryGetValue(name, out state))
            {
                added.Add(BuildCatalogEntry(element));
                continue;
            }

            AscetElementIncompatibleDiff incompatibleEntry = BuildIncompatibleDiff(element, state);
            if (incompatibleEntry != null)
            {
                incompatible.Add(incompatibleEntry);
                continue;
            }

            List<string> fieldChanges = BuildMutableFieldChanges(element, state);
            if (fieldChanges.Count > 0)
            {
                modified.Add(new AscetElementModifiedDiff
                {
                    Name = name,
                    Kind = element.Kind.ToString(),
                    ChangeKind = "Modified",
                    FieldChanges = fieldChanges,
                    LeftSignature = BuildSignature(state),
                    RightSignature = BuildSignature(element)
                });
                continue;
            }

            skipped.Add(BuildCatalogEntry(element));
        }

        foreach (KeyValuePair<string, AscetExistingElementState> pair in existing)
        {
            if (!requestedNames.Contains(pair.Key))
            {
                removed.Add(BuildCatalogEntry(pair.Value));
            }
        }

        return new AscetElementSpecDiffResult
        {
            ComponentPath = componentPath ?? String.Empty,
            AddedElements = added,
            RemovedElements = removed,
            ModifiedElements = modified,
            IncompatibleElements = incompatible,
            SkippedElements = skipped,
            Summary = added.Count.ToString() + " added, " + removed.Count.ToString() + " removed, " + modified.Count.ToString() + " modified, " + incompatible.Count.ToString() + " incompatible"
        };
    }

    public AscetElementSyncPlan Plan(AscetElementSpecDocument spec, IList<AscetExistingElementState> existingElements, bool hasDefaultData, bool hasDefaultImplementation)
    {
        if (spec == null)
        {
            throw new AscetReadException("invalid_argument", "plan_element_sync", "Element spec document must not be null.");
        }

        IList<AscetElementSpec> requested = spec.Elements ?? new List<AscetElementSpec>();
        Dictionary<string, AscetExistingElementState> existing = BuildExistingIndex(existingElements);
        List<AscetElementSpec> toCreate = new List<AscetElementSpec>();
        List<AscetElementSpec> toUpdate = new List<AscetElementSpec>();
        List<string> skipped = new List<string>();

        for (int i = 0; i < requested.Count; i++)
        {
            AscetElementSpec element = requested[i];
            if (element == null)
            {
                throw new AscetReadException("invalid_element_spec", "plan_element_sync", "Element spec at index " + i.ToString() + " must not be null.");
            }

            AscetExistingElementState state;
            if (existing.TryGetValue(element.Name ?? String.Empty, out state))
            {
                EnsureCompatible(element, state);
                if (HasMutableUpdates(element))
                {
                    toUpdate.Add(element);
                }
                else
                {
                    skipped.Add(element.Name ?? String.Empty);
                }
                continue;
            }

            EnsureDefaultsAvailable(element, hasDefaultData, hasDefaultImplementation);
            toCreate.Add(element);
        }

        return new AscetElementSyncPlan
        {
            ElementsToCreate = toCreate,
            ElementsToUpdate = toUpdate,
            SkippedElements = skipped
        };
    }

    private AscetElementCatalogEntry BuildCatalogEntry(AscetElementSpec spec)
    {
        return new AscetElementCatalogEntry
        {
            Name = spec == null ? String.Empty : (spec.Name ?? String.Empty),
            Kind = spec == null ? AscetElementSpecKind.Unknown.ToString() : spec.Kind.ToString(),
            Signature = BuildSignature(spec)
        };
    }

    private AscetElementCatalogEntry BuildCatalogEntry(AscetExistingElementState state)
    {
        return new AscetElementCatalogEntry
        {
            Name = state == null ? String.Empty : (state.Name ?? String.Empty),
            Kind = state == null ? AscetElementSpecKind.Unknown.ToString() : state.Kind.ToString(),
            Signature = BuildSignature(state)
        };
    }

    private AscetElementIncompatibleDiff BuildIncompatibleDiff(AscetElementSpec spec, AscetExistingElementState existing)
    {
        if (spec == null || existing == null)
        {
            return null;
        }

        List<string> fieldChanges = new List<string>();
        string reason = String.Empty;
        if (spec.Kind != existing.Kind)
        {
            fieldChanges.Add("kind");
            reason = "kind mismatch";
        }
        else
        {
            switch (spec.Kind)
            {
                case AscetElementSpecKind.Variable:
                case AscetElementSpecKind.Parameter:
                    if (HasCaseInsensitiveMismatch(spec.ModelType, existing.ModelType))
                    {
                        fieldChanges.Add("modelType");
                        reason = "modelType mismatch";
                    }
                    if (HasCaseInsensitiveMismatch(spec.Scope, existing.Scope))
                    {
                        fieldChanges.Add("scope");
                        if (String.IsNullOrEmpty(reason))
                        {
                            reason = "scope mismatch";
                        }
                    }
                    break;

                case AscetElementSpecKind.Array:
                    if (HasCaseInsensitiveMismatch(spec.ModelType, existing.ModelType))
                    {
                        fieldChanges.Add("modelType");
                        reason = "modelType mismatch";
                    }
                    if (HasCaseInsensitiveMismatch(spec.Scope, existing.Scope))
                    {
                        fieldChanges.Add("scope");
                        if (String.IsNullOrEmpty(reason))
                        {
                            reason = "scope mismatch";
                        }
                    }
                    if (spec.Length.HasValue && spec.Length.Value != (existing.Length ?? -1))
                    {
                        fieldChanges.Add("length");
                        if (String.IsNullOrEmpty(reason))
                        {
                            reason = "length mismatch";
                        }
                    }
                    break;

                case AscetElementSpecKind.Enumeration:
                    if (HasCaseInsensitiveMismatch(spec.ModelType, existing.ModelType))
                    {
                        fieldChanges.Add("modelType");
                        reason = "modelType mismatch";
                    }
                    if (HasCaseInsensitiveMismatch(spec.Scope, existing.Scope))
                    {
                        fieldChanges.Add("scope");
                        if (String.IsNullOrEmpty(reason))
                        {
                            reason = "scope mismatch";
                        }
                    }
                    if (HasCaseSensitiveMismatch(NormalizePath(spec.EnumerationPath), NormalizePath(existing.EnumerationPath)))
                    {
                        fieldChanges.Add("enumerationPath");
                        if (String.IsNullOrEmpty(reason))
                        {
                            reason = "enumeration type mismatch";
                        }
                    }
                    break;

                case AscetElementSpecKind.Table:
                    if (HasCaseInsensitiveMismatch(spec.ModelType, existing.ModelType))
                    {
                        fieldChanges.Add("modelType");
                        reason = "modelType mismatch";
                    }
                    if (HasCaseInsensitiveMismatch(spec.Scope, existing.Scope))
                    {
                        fieldChanges.Add("scope");
                        if (String.IsNullOrEmpty(reason))
                        {
                            reason = "scope mismatch";
                        }
                    }
                    if (HasCaseInsensitiveMismatch(spec.TableDimension, existing.TableDimension))
                    {
                        fieldChanges.Add("tableDimension");
                        if (String.IsNullOrEmpty(reason))
                        {
                            reason = "table dimension mismatch";
                        }
                    }
                    if (HasTwoDShapeMismatch(spec, existing))
                    {
                        if (spec.XValues != null && GetListCount(spec.XValues) != GetListCount(existing.XValues))
                        {
                            fieldChanges.Add("xValues");
                        }

                        if (spec.YValues != null && GetListCount(spec.YValues) != GetListCount(existing.YValues))
                        {
                            fieldChanges.Add("yValues");
                        }

                        if (String.IsNullOrEmpty(reason))
                        {
                            reason = "2d table shape mismatch";
                        }
                    }
                    if (String.Equals(spec.TableDimension, "2d", StringComparison.Ordinal) &&
                        String.Equals(existing.TableDimension, "2d", StringComparison.Ordinal) &&
                        AscetElementSyncSpecRules.UsesFixedDefaultTwoDMatrixOnlyPath(spec))
                    {
                        if (spec.XValues != null && !ValuesEqual(spec.XValues, existing.XValues))
                        {
                            fieldChanges.Add("xValues");
                            if (String.IsNullOrEmpty(reason))
                            {
                                reason = "fixed 2d axis/shape mismatch";
                            }
                        }

                        if (spec.YValues != null && !ValuesEqual(spec.YValues, existing.YValues))
                        {
                            fieldChanges.Add("yValues");
                            if (String.IsNullOrEmpty(reason))
                            {
                                reason = "fixed 2d axis/shape mismatch";
                            }
                        }
                    }
                    break;

                case AscetElementSpecKind.Component:
                    if (HasCaseSensitiveMismatch(NormalizePath(spec.ReferencedComponentPath), NormalizePath(existing.ReferencedComponentPath)))
                    {
                        fieldChanges.Add("referencedComponentPath");
                        reason = "referenced component mismatch";
                    }
                    break;
            }
        }

        if (fieldChanges.Count == 0)
        {
            return null;
        }

        return new AscetElementIncompatibleDiff
        {
            Name = spec.Name ?? String.Empty,
            Kind = spec.Kind.ToString(),
            ChangeKind = "Incompatible",
            FieldChanges = fieldChanges,
            FieldDiffs = BuildIncompatibleFieldDiffs(fieldChanges, spec, existing),
            Reason = reason,
            RequiresRecreate = true,
            LeftSignature = BuildSignature(existing),
            RightSignature = BuildSignature(spec)
        };
    }

    private List<AscetElementFieldDiff> BuildIncompatibleFieldDiffs(IList<string> fieldChanges, AscetElementSpec spec, AscetExistingElementState existing)
    {
        List<AscetElementFieldDiff> result = new List<AscetElementFieldDiff>();
        if (fieldChanges == null)
        {
            return result;
        }

        for (int i = 0; i < fieldChanges.Count; i++)
        {
            string field = fieldChanges[i] ?? String.Empty;
            if (String.IsNullOrWhiteSpace(field))
            {
                continue;
            }

            result.Add(new AscetElementFieldDiff
            {
                Field = field,
                Left = GetExistingIncompatibleFieldValue(existing, field),
                Right = GetSpecIncompatibleFieldValue(spec, field),
                Reason = "requires_recreate"
            });
        }

        return result;
    }

    private string GetSpecIncompatibleFieldValue(AscetElementSpec spec, string field)
    {
        if (spec == null)
        {
            return String.Empty;
        }

        switch (field)
        {
            case "kind":
                return spec.Kind.ToString();
            case "modelType":
                return spec.ModelType ?? String.Empty;
            case "scope":
                return spec.Scope ?? String.Empty;
            case "length":
                return spec.Length.HasValue ? spec.Length.Value.ToString(System.Globalization.CultureInfo.InvariantCulture) : String.Empty;
            case "enumerationPath":
                return NormalizePath(spec.EnumerationPath);
            case "tableDimension":
                return spec.TableDimension ?? String.Empty;
            case "xValues":
                return FormatValue(spec.XValues);
            case "yValues":
                return FormatValue(spec.YValues);
            case "referencedComponentPath":
                return NormalizePath(spec.ReferencedComponentPath);
            default:
                return String.Empty;
        }
    }

    private string GetExistingIncompatibleFieldValue(AscetExistingElementState existing, string field)
    {
        if (existing == null)
        {
            return String.Empty;
        }

        switch (field)
        {
            case "kind":
                return existing.Kind.ToString();
            case "modelType":
                return existing.ModelType ?? String.Empty;
            case "scope":
                return existing.Scope ?? String.Empty;
            case "length":
                return existing.Length.HasValue ? existing.Length.Value.ToString(System.Globalization.CultureInfo.InvariantCulture) : String.Empty;
            case "enumerationPath":
                return NormalizePath(existing.EnumerationPath);
            case "tableDimension":
                return existing.TableDimension ?? String.Empty;
            case "xValues":
                return FormatValue(existing.XValues);
            case "yValues":
                return FormatValue(existing.YValues);
            case "referencedComponentPath":
                return NormalizePath(existing.ReferencedComponentPath);
            default:
                return String.Empty;
        }
    }

    private string FormatValue(object value)
    {
        if (value == null)
        {
            return String.Empty;
        }

        IList list = value as IList;
        if (list == null)
        {
            return Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture) ?? String.Empty;
        }

        List<string> parts = new List<string>();
        for (int i = 0; i < list.Count; i++)
        {
            parts.Add(FormatValue(list[i]));
        }

        return "[" + String.Join(",", parts.ToArray()) + "]";
    }

    private List<string> BuildMutableFieldChanges(AscetElementSpec spec, AscetExistingElementState existing)
    {
        List<string> fieldChanges = new List<string>();
        if (spec == null || existing == null)
        {
            return fieldChanges;
        }

        if (!String.IsNullOrWhiteSpace(spec.Unit) && HasCaseSensitiveMismatch(spec.Unit, existing.Unit))
        {
            fieldChanges.Add("unit");
        }

        if (!String.IsNullOrWhiteSpace(spec.Comment) && HasCaseSensitiveMismatch(spec.Comment, existing.Comment))
        {
            fieldChanges.Add("comment");
        }

        if (spec.PhysicalRange != null && !RangeMatches(spec.PhysicalRange, existing.PhysicalRange))
        {
            fieldChanges.Add("physicalRange");
        }

        if (spec.Calibration.HasValue)
        {
            bool actual = existing.Calibration.HasValue && existing.Calibration.Value;
            if (actual != spec.Calibration.Value)
            {
                fieldChanges.Add("calibration");
            }
        }

        if (spec.Data != null && !ValuesEqual(spec.Data.Value, existing.DataValue))
        {
            fieldChanges.Add("data.value");
        }

        if (!String.IsNullOrWhiteSpace(spec.EnumerationPath) &&
            HasCaseSensitiveMismatch(NormalizePath(spec.EnumerationPath), NormalizePath(existing.EnumerationPath)))
        {
            fieldChanges.Add("enumerationPath");
        }

        if (!String.IsNullOrWhiteSpace(spec.TableDimension) &&
            HasCaseInsensitiveMismatch(spec.TableDimension, existing.TableDimension))
        {
            fieldChanges.Add("tableDimension");
        }

        bool fixedTwoDMatrixOnly = AscetElementSyncSpecRules.UsesFixedDefaultTwoDMatrixOnlyPath(spec) &&
                                   String.Equals(existing.TableDimension, "2d", StringComparison.Ordinal);

        if (spec.XValues != null && !ValuesEqual(spec.XValues, existing.XValues) && !fixedTwoDMatrixOnly)
        {
            fieldChanges.Add("xValues");
        }

        if (spec.YValues != null && !ValuesEqual(spec.YValues, existing.YValues) && !fixedTwoDMatrixOnly)
        {
            fieldChanges.Add("yValues");
        }

        if (spec.Values != null && !ValuesEqual(spec.Values, existing.Values))
        {
            fieldChanges.Add("values");
        }

        if (spec.Impl != null)
        {
            if (!String.IsNullOrWhiteSpace(spec.Impl.MemoryLocation) && HasCaseInsensitiveMismatch(spec.Impl.MemoryLocation, existing.MemoryLocation))
            {
                fieldChanges.Add("impl.memoryLocation");
            }

            if (!String.IsNullOrWhiteSpace(spec.Impl.ValueType) && HasImplValueTypeMismatch(spec.Impl.ValueType, existing.ValueType))
            {
                fieldChanges.Add("impl.valueType");
            }

            if (ShouldCompareImplRangeStrictly(spec) && !RangeMatches(spec.Impl.ImplementationRange, existing.ImplRange))
            {
                fieldChanges.Add("impl.implementationRange");
            }

            if (!String.IsNullOrWhiteSpace(spec.Impl.Formula) && HasCaseInsensitiveMismatch(spec.Impl.Formula, existing.Formula))
            {
                fieldChanges.Add("impl.formula");
            }
        }

        bool expectedLimitAssignments;
        if (TryGetExpectedLimitAssignments(spec, out expectedLimitAssignments))
        {
            bool actual = existing.LimitAssignments.HasValue && existing.LimitAssignments.Value;
            if (actual != expectedLimitAssignments)
            {
                fieldChanges.Add("impl.limitAssignments");
            }
        }

        return fieldChanges;
    }

    private bool RangeMatches(AscetElementRangeSpec expectedRange, string actualRange)
    {
        if (expectedRange == null)
        {
            return true;
        }

        double actualMin;
        double actualMax;
        if (!AscetElementSyncSpecRules.TryParseRangeString(actualRange, out actualMin, out actualMax))
        {
            return false;
        }

        if (!AscetElementSyncSpecRules.RangeValueMatches(expectedRange.Min, actualMin))
        {
            return false;
        }

        if (!AscetElementSyncSpecRules.RangeValueMatches(expectedRange.Max, actualMax))
        {
            return false;
        }

        return true;
    }

    private bool ValuesEqual(object left, object right)
    {
        if (left == null || right == null)
        {
            return left == right;
        }

        IList leftList = left as IList;
        IList rightList = right as IList;
        if (leftList != null || rightList != null)
        {
            if (leftList == null || rightList == null || leftList.Count != rightList.Count)
            {
                return false;
            }

            for (int i = 0; i < leftList.Count; i++)
            {
                if (!ValuesEqual(leftList[i], rightList[i]))
                {
                    return false;
                }
            }

            return true;
        }

        double leftNumber;
        double rightNumber;
        if (TryConvertDouble(left, out leftNumber) && TryConvertDouble(right, out rightNumber))
        {
            return Math.Abs(leftNumber - rightNumber) <= 0.000001d;
        }

        return String.Equals(
            Convert.ToString(left, System.Globalization.CultureInfo.InvariantCulture) ?? String.Empty,
            Convert.ToString(right, System.Globalization.CultureInfo.InvariantCulture) ?? String.Empty,
            StringComparison.Ordinal);
    }

    private bool TryConvertDouble(object value, out double result)
    {
        try
        {
            result = Convert.ToDouble(value, System.Globalization.CultureInfo.InvariantCulture);
            return true;
        }
        catch
        {
            result = 0d;
            return false;
        }
    }

    private string BuildSignature(AscetElementSpec spec)
    {
        if (spec == null)
        {
            return String.Empty;
        }

        switch (spec.Kind)
        {
            case AscetElementSpecKind.Enumeration:
                return "Enumeration ModelType=" + (spec.ModelType ?? String.Empty) + " Scope=" + (spec.Scope ?? String.Empty) + " EnumerationPath=" + NormalizePath(spec.EnumerationPath) + BuildCalibrationSignature(spec.Calibration);
            case AscetElementSpecKind.Table:
                return "Table Dimension=" + (spec.TableDimension ?? String.Empty) + " ModelType=" + (spec.ModelType ?? String.Empty) + " Scope=" + (spec.Scope ?? String.Empty) +
                    " XCount=" + (spec.XValues == null ? "0" : spec.XValues.Count.ToString()) +
                    " YCount=" + (spec.YValues == null ? "0" : spec.YValues.Count.ToString()) + BuildCalibrationSignature(spec.Calibration);
            case AscetElementSpecKind.Component:
                return "Component Ref=" + NormalizePath(spec.ReferencedComponentPath);
            case AscetElementSpecKind.Array:
                return "Array ModelType=" + (spec.ModelType ?? String.Empty) + " Scope=" + (spec.Scope ?? String.Empty) + " Length=" + (spec.Length.HasValue ? spec.Length.Value.ToString() : String.Empty) + BuildCalibrationSignature(spec.Calibration);
            default:
                return spec.Kind.ToString() + " ModelType=" + (spec.ModelType ?? String.Empty) + " Scope=" + (spec.Scope ?? String.Empty) + BuildCalibrationSignature(spec.Calibration);
        }
    }

    private string BuildSignature(AscetExistingElementState state)
    {
        if (state == null)
        {
            return String.Empty;
        }

        switch (state.Kind)
        {
            case AscetElementSpecKind.Enumeration:
                return "Enumeration ModelType=" + (state.ModelType ?? String.Empty) + " Scope=" + (state.Scope ?? String.Empty) + " EnumerationPath=" + NormalizePath(state.EnumerationPath) + BuildCalibrationSignature(state.Calibration);
            case AscetElementSpecKind.Table:
                return "Table Dimension=" + (state.TableDimension ?? String.Empty) + " ModelType=" + (state.ModelType ?? String.Empty) + " Scope=" + (state.Scope ?? String.Empty) +
                    " XCount=" + (state.XValues == null ? "0" : state.XValues.Count.ToString()) +
                    " YCount=" + (state.YValues == null ? "0" : state.YValues.Count.ToString()) + BuildCalibrationSignature(state.Calibration);
            case AscetElementSpecKind.Component:
                return "Component Ref=" + NormalizePath(state.ReferencedComponentPath);
            case AscetElementSpecKind.Array:
                return "Array ModelType=" + (state.ModelType ?? String.Empty) + " Scope=" + (state.Scope ?? String.Empty) + " Length=" + (state.Length.HasValue ? state.Length.Value.ToString() : String.Empty) + BuildCalibrationSignature(state.Calibration);
            default:
                return state.Kind.ToString() + " ModelType=" + (state.ModelType ?? String.Empty) + " Scope=" + (state.Scope ?? String.Empty) + BuildCalibrationSignature(state.Calibration);
        }
    }

    private string BuildCalibrationSignature(bool? calibration)
    {
        return calibration.HasValue ? " Calibration=" + calibration.Value.ToString() : String.Empty;
    }

    private bool HasCaseInsensitiveMismatch(string left, string right)
    {
        return !String.Equals(left ?? String.Empty, right ?? String.Empty, StringComparison.OrdinalIgnoreCase);
    }

    private bool HasCaseSensitiveMismatch(string left, string right)
    {
        return !String.Equals(left ?? String.Empty, right ?? String.Empty, StringComparison.Ordinal);
    }

    public void EnsureReadbackCompatible(AscetElementSpec spec, AscetExistingElementState existing)
    {
        EnsureCompatible(spec, existing);

        if (!String.IsNullOrWhiteSpace(spec.Unit))
        {
            RequireMatch(spec.Name, "unit", spec.Unit, existing.Unit, false);
        }

        if (!String.IsNullOrWhiteSpace(spec.Comment))
        {
            RequireMatch(spec.Name, "comment", spec.Comment, existing.Comment, false);
        }

        if (spec.PhysicalRange != null)
        {
            RequireRangeMatch(spec.Name, "physicalRange", spec.PhysicalRange, existing.PhysicalRange);
        }

        if (spec.Calibration.HasValue)
        {
            bool actual = existing.Calibration.HasValue && existing.Calibration.Value;
            if (actual != spec.Calibration.Value)
            {
                throw new AscetReadException("readback_mismatch", "verify_apply_element_spec", "Existing element '" + spec.Name + "' has calibration='" + actual.ToString() + "' but spec requires '" + spec.Calibration.Value.ToString() + "'.");
            }
        }

        if (spec.Data != null && !ValuesEqual(spec.Data.Value, existing.DataValue))
        {
            throw new AscetReadException("readback_mismatch", "verify_apply_element_spec", "Existing element '" + spec.Name + "' has data.value='" + FormatComparableValue(existing.DataValue) + "' but spec requires '" + FormatComparableValue(spec.Data.Value) + "'.");
        }

        if (spec.Kind == AscetElementSpecKind.Table)
        {
            if (String.Equals(spec.TableDimension, "2d", StringComparison.Ordinal) &&
                AscetElementSyncSpecRules.UsesFixedDefaultTwoDMatrixOnlyPath(spec) &&
                ValuesEqual(spec.XValues, existing.XValues) &&
                ValuesEqual(spec.YValues, existing.YValues) &&
                spec.Values != null &&
                existing.Values != null &&
                IsZeroMatrix(existing.Values) &&
                !ValuesEqual(spec.Values, existing.Values))
            {
                throw new AscetReadException("readback_structure_only", "verify_apply_element_spec", "Existing element '" + spec.Name + "' matches the fixed 2d default axes but values fell back to a zero matrix during readback.");
            }

            if (spec.XValues != null && !ValuesEqual(spec.XValues, existing.XValues))
            {
                throw new AscetReadException("readback_mismatch", "verify_apply_element_spec", "Existing element '" + spec.Name + "' has xValues='" + FormatComparableValue(existing.XValues) + "' but spec requires '" + FormatComparableValue(spec.XValues) + "'.");
            }

            if (spec.YValues != null && !ValuesEqual(spec.YValues, existing.YValues))
            {
                throw new AscetReadException("readback_mismatch", "verify_apply_element_spec", "Existing element '" + spec.Name + "' has yValues='" + FormatComparableValue(existing.YValues) + "' but spec requires '" + FormatComparableValue(spec.YValues) + "'.");
            }

            if (spec.Values != null && !ValuesEqual(spec.Values, existing.Values))
            {
                throw new AscetReadException("readback_mismatch", "verify_apply_element_spec", "Existing element '" + spec.Name + "' has values='" + FormatComparableValue(existing.Values) + "' but spec requires '" + FormatComparableValue(spec.Values) + "'.");
            }
        }

        if (spec.Impl != null)
        {
            if (!String.IsNullOrWhiteSpace(spec.Impl.MemoryLocation))
            {
                RequireMatch(spec.Name, "memoryLocation", spec.Impl.MemoryLocation, existing.MemoryLocation, true);
            }

            if (!String.IsNullOrWhiteSpace(spec.Impl.ValueType))
            {
                RequireImplValueTypeMatch(spec.Name, spec.Impl.ValueType, existing.ValueType);
            }

            if (ShouldCompareImplRangeStrictly(spec))
            {
                RequireRangeMatch(spec.Name, "impl.implementationRange", spec.Impl.ImplementationRange, existing.ImplRange);
            }

            if (!String.IsNullOrWhiteSpace(spec.Impl.Formula))
            {
                RequireMatch(spec.Name, "impl.formula", spec.Impl.Formula, existing.Formula, true);
            }
        }

        bool expectedLimitAssignments;
        if (TryGetExpectedLimitAssignments(spec, out expectedLimitAssignments))
        {
            bool actual = existing.LimitAssignments.HasValue && existing.LimitAssignments.Value;
            if (actual != expectedLimitAssignments)
            {
                throw new AscetReadException("readback_mismatch", "verify_apply_element_spec", "Existing element '" + spec.Name + "' has impl.limitAssignments='" + actual.ToString() + "' but spec requires '" + expectedLimitAssignments.ToString() + "'.");
            }
        }
    }

    private bool IsZeroMatrix(IList<object> values)
    {
        if (values == null || values.Count == 0)
        {
            return false;
        }

        for (int i = 0; i < values.Count; i++)
        {
            IList row = values[i] as IList;
            if (row == null || values[i] is string || row.Count == 0)
            {
                return false;
            }

            for (int j = 0; j < row.Count; j++)
            {
                object entry = row[j];
                if (entry is bool)
                {
                    if (Convert.ToBoolean(entry, System.Globalization.CultureInfo.InvariantCulture))
                    {
                        return false;
                    }

                    continue;
                }

                if (entry == null || entry is string)
                {
                    return false;
                }

                if (!AscetElementSyncSpecRules.RangeValueMatches(0, Convert.ToDouble(entry, System.Globalization.CultureInfo.InvariantCulture)))
                {
                    return false;
                }
            }
        }

        return true;
    }

    private string FormatComparableValue(object value)
    {
        if (value == null)
        {
            return String.Empty;
        }

        IList list = value as IList;
        if (list != null && !(value is string))
        {
            List<string> values = new List<string>();
            for (int i = 0; i < list.Count; i++)
            {
                values.Add(FormatComparableValue(list[i]));
            }
            return "[" + String.Join(", ", values.ToArray()) + "]";
        }

        return Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture) ?? String.Empty;
    }

    private Dictionary<string, AscetExistingElementState> BuildExistingIndex(IList<AscetExistingElementState> existingElements)
    {
        Dictionary<string, AscetExistingElementState> result = new Dictionary<string, AscetExistingElementState>(StringComparer.Ordinal);
        if (existingElements == null)
        {
            return result;
        }

        for (int i = 0; i < existingElements.Count; i++)
        {
            AscetExistingElementState state = existingElements[i];
            if (state == null || String.IsNullOrWhiteSpace(state.Name))
            {
                continue;
            }

            result[state.Name] = state;
        }

        return result;
    }

    private void EnsureDefaultsAvailable(AscetElementSpec spec, bool hasDefaultData, bool hasDefaultImplementation)
    {
        if (spec == null)
        {
            return;
        }

        if (!RequiresPrimitiveDefaults(spec))
        {
            return;
        }

        bool importedParameter = spec.Kind == AscetElementSpecKind.Parameter &&
            String.Equals(spec.Scope, "imported", StringComparison.OrdinalIgnoreCase);
        if (!importedParameter && !HasExplicitData(spec) && !hasDefaultData)
        {
            throw new AscetReadException("default_data_required", "plan_element_sync", "Element '" + spec.Name + "' requires a default data configuration or an explicit data value.");
        }

        // ComponentElementSyncService creates a default implementation before applying
        // explicit implementation writes. Planning must not reject that recoverable state.
    }

    private bool HasExplicitData(AscetElementSpec spec)
    {
        return spec != null &&
               (spec.Data != null ||
                spec.XValues != null ||
                spec.Values != null);
    }

    private bool RequiresPrimitiveDefaults(AscetElementSpec spec)
    {
        return spec.Kind == AscetElementSpecKind.Variable ||
               spec.Kind == AscetElementSpecKind.Parameter ||
               spec.Kind == AscetElementSpecKind.Array ||
               spec.Kind == AscetElementSpecKind.Enumeration ||
               spec.Kind == AscetElementSpecKind.Table;
    }

    private void EnsureCompatible(AscetElementSpec spec, AscetExistingElementState existing)
    {
        if (spec.Kind != existing.Kind)
        {
            throw new AscetReadException("element_conflict", "plan_element_sync", "Existing element '" + spec.Name + "' has kind '" + existing.Kind.ToString() + "' but spec requires '" + spec.Kind.ToString() + "'.");
        }

        switch (spec.Kind)
        {
            case AscetElementSpecKind.Variable:
            case AscetElementSpecKind.Parameter:
                RequireMatch(spec.Name, "modelType", spec.ModelType, existing.ModelType, true);
                RequireMatch(spec.Name, "scope", spec.Scope, existing.Scope, true);
                break;
            case AscetElementSpecKind.Array:
                RequireMatch(spec.Name, "modelType", spec.ModelType, existing.ModelType, true);
                RequireMatch(spec.Name, "scope", spec.Scope, existing.Scope, true);
                if (spec.Length.HasValue)
                {
                    int actualLength = existing.Length.HasValue ? existing.Length.Value : -1;
                    if (spec.Length.Value != actualLength)
                    {
                        throw new AscetReadException("element_conflict", "plan_element_sync", "Existing element '" + spec.Name + "' has length '" + actualLength.ToString() + "' but spec requires '" + spec.Length.Value.ToString() + "'.");
                    }
                }
                break;
            case AscetElementSpecKind.Enumeration:
                RequireMatch(spec.Name, "modelType", spec.ModelType, existing.ModelType, true);
                RequireMatch(spec.Name, "scope", spec.Scope, existing.Scope, true);
                RequireMatch(spec.Name, "enumerationPath", NormalizePath(spec.EnumerationPath), NormalizePath(existing.EnumerationPath), false);
                break;
            case AscetElementSpecKind.Table:
                RequireMatch(spec.Name, "modelType", spec.ModelType, existing.ModelType, true);
                RequireMatch(spec.Name, "scope", spec.Scope, existing.Scope, true);
                RequireMatch(spec.Name, "tableDimension", spec.TableDimension, existing.TableDimension, true);
                if (HasTwoDShapeMismatch(spec, existing))
                {
                    throw new AscetReadException("element_conflict", "plan_element_sync", "Existing 2d table '" + spec.Name + "' has shape '" + GetListCount(existing.XValues).ToString() + "x" + GetListCount(existing.YValues).ToString() + "' but spec requires '" + GetListCount(spec.XValues).ToString() + "x" + GetListCount(spec.YValues).ToString() + "'.");
                }
                if (AscetElementSyncSpecRules.UsesFixedDefaultTwoDMatrixOnlyPath(spec))
                {
                    if (spec.XValues != null && !ValuesEqual(spec.XValues, existing.XValues))
                    {
                        throw new AscetReadException("element_conflict", "plan_element_sync", "Existing element '" + spec.Name + "' has xValues='" + FormatComparableValue(existing.XValues) + "' but fixed 2d matrix-only updates require '" + FormatComparableValue(spec.XValues) + "'.");
                    }

                    if (spec.YValues != null && !ValuesEqual(spec.YValues, existing.YValues))
                    {
                        throw new AscetReadException("element_conflict", "plan_element_sync", "Existing element '" + spec.Name + "' has yValues='" + FormatComparableValue(existing.YValues) + "' but fixed 2d matrix-only updates require '" + FormatComparableValue(spec.YValues) + "'.");
                    }
                }
                break;
            case AscetElementSpecKind.Component:
                RequireMatch(spec.Name, "referencedComponentPath", NormalizePath(spec.ReferencedComponentPath), NormalizePath(existing.ReferencedComponentPath), false);
                break;
        }
    }

    private bool HasMutableUpdates(AscetElementSpec spec)
    {
        return spec != null &&
               (spec.Data != null ||
                !String.IsNullOrWhiteSpace(spec.EnumerationPath) ||
                !String.IsNullOrWhiteSpace(spec.TableDimension) ||
                spec.XValues != null ||
                spec.Values != null ||
                spec.PhysicalRange != null ||
                spec.Calibration.HasValue ||
                !String.IsNullOrWhiteSpace(spec.Unit) ||
                !String.IsNullOrWhiteSpace(spec.Comment) ||
                HasMutableImplementationUpdates(spec.Impl));
    }

    private int GetListCount(IList<object> values)
    {
        return values == null ? 0 : values.Count;
    }

    private bool HasTwoDShapeMismatch(AscetElementSpec spec, AscetExistingElementState existing)
    {
        return spec != null &&
               existing != null &&
               String.Equals(spec.TableDimension, "2d", StringComparison.Ordinal) &&
               String.Equals(existing.TableDimension, "2d", StringComparison.Ordinal) &&
               (GetListCount(spec.XValues) != GetListCount(existing.XValues) ||
                GetListCount(spec.YValues) != GetListCount(existing.YValues));
    }

    private bool HasMutableImplementationUpdates(AscetElementImplSpec spec)
    {
        return spec != null &&
               (!String.IsNullOrWhiteSpace(spec.MemoryLocation) ||
                !String.IsNullOrWhiteSpace(spec.ValueType) ||
                spec.ImplementationRange != null ||
                !String.IsNullOrWhiteSpace(spec.Formula) ||
                spec.LimitAssignments.HasValue);
    }

    private bool TryGetExpectedLimitAssignments(AscetElementSpec spec, out bool expected)
    {
        if (AscetElementSyncSpecRules.RequiresParameterLimitAssignment(spec))
        {
            expected = false;
            return false;
        }

        return AscetElementSyncSpecRules.TryGetEffectiveLimitAssignments(spec, out expected);
    }

    private bool ShouldCompareImplRangeStrictly(AscetElementSpec spec)
    {
        return spec != null &&
               spec.Impl != null &&
               spec.Impl.ImplementationRange != null;
    }

    private bool HasImplValueTypeMismatch(string expected, string actual)
    {
        return !String.Equals(
            NormalizeImplTypeForComparison(expected),
            NormalizeImplTypeForComparison(actual),
            StringComparison.OrdinalIgnoreCase);
    }

    private void RequireImplValueTypeMatch(string name, string expected, string actual)
    {
        string normalizedExpected = NormalizeImplTypeForComparison(expected);
        string normalizedActual = NormalizeImplTypeForComparison(actual);
        if (!String.Equals(normalizedExpected, normalizedActual, StringComparison.OrdinalIgnoreCase))
        {
            throw new AscetReadException("readback_mismatch", "verify_apply_element_spec", "Existing element '" + name + "' has impl.valueType='" + (actual ?? String.Empty) + "' but spec requires '" + (expected ?? String.Empty) + "'.");
        }
    }

    private string NormalizeImplTypeForComparison(string valueType)
    {
        string normalized = String.IsNullOrWhiteSpace(valueType)
            ? String.Empty
            : valueType.Trim().ToLowerInvariant();

        switch (normalized)
        {
            case "sint8":
                return "int8";
            case "sint16":
                return "int16";
            case "sint32":
                return "int32";
            case "sint64":
                return "int64";
            default:
                return String.IsNullOrWhiteSpace(valueType) ? String.Empty : valueType.Trim();
        }
    }

    private void RequireMatch(string name, string fieldName, string expected, string actual, bool ignoreCase)
    {
        StringComparison comparison = ignoreCase ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
        string left = expected ?? String.Empty;
        string right = actual ?? String.Empty;
        if (!String.Equals(left, right, comparison))
        {
            throw new AscetReadException("element_conflict", "plan_element_sync", "Existing element '" + name + "' has " + fieldName + "='" + right + "' but spec requires '" + left + "'.");
        }
    }

    private void RequireRangeMatch(string name, string fieldName, AscetElementRangeSpec expectedRange, string actualRange)
    {
        if (expectedRange == null)
        {
            return;
        }

        double actualMin;
        double actualMax;
        if (!AscetElementSyncSpecRules.TryParseRangeString(actualRange, out actualMin, out actualMax))
        {
            if (AscetElementSyncSpecRules.IsRangeReadbackUnavailable(actualRange))
            {
                throw new AscetReadException("readback_mismatch", "verify_apply_element_spec", "Existing element '" + name + "' has unreadable " + fieldName + "='" + (actualRange ?? String.Empty) + "'.");
            }

            throw new AscetReadException("readback_mismatch", "verify_apply_element_spec", "Existing element '" + name + "' has unreadable " + fieldName + "='" + (actualRange ?? String.Empty) + "'.");
        }

        if (!AscetElementSyncSpecRules.RangeValueMatches(expectedRange.Min, actualMin))
        {
            throw new AscetReadException("readback_mismatch", "verify_apply_element_spec", "Existing element '" + name + "' has " + fieldName + ".min='" + actualMin.ToString(System.Globalization.CultureInfo.InvariantCulture) + "' but spec requires '" + Convert.ToString(expectedRange.Min, System.Globalization.CultureInfo.InvariantCulture) + "'.");
        }

        if (!AscetElementSyncSpecRules.RangeValueMatches(expectedRange.Max, actualMax))
        {
            throw new AscetReadException("readback_mismatch", "verify_apply_element_spec", "Existing element '" + name + "' has " + fieldName + ".max='" + actualMax.ToString(System.Globalization.CultureInfo.InvariantCulture) + "' but spec requires '" + Convert.ToString(expectedRange.Max, System.Globalization.CultureInfo.InvariantCulture) + "'.");
        }
    }

    private string NormalizePath(string path)
    {
        if (String.IsNullOrWhiteSpace(path))
        {
            return String.Empty;
        }

        string normalized = path.Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }
        return normalized;
    }
}

public sealed class ComponentElementSyncService : AscetReadDomainServiceBase, IComponentElementSyncService
{
    private readonly ComponentElementSyncPlanner _planner;

    public ComponentElementSyncService()
        : this(new ComponentElementSyncPlanner())
    {
    }

    public ComponentElementSyncService(ComponentElementSyncPlanner planner)
    {
        if (planner == null)
        {
            throw new ArgumentNullException("planner");
        }

        _planner = planner;
    }

    public AscetElementCatalogReadResult ReadCatalog(AscetItemRef component)
    {
        if (component == null)
        {
            throw new AscetReadException("invalid_argument", "read_element_catalog", "Component reference must not be null.");
        }

        return ExecuteWithSession("read_element_catalog", delegate(AscetSession session)
        {
            AscetDiscreteComponent discrete;
            CodeComponent code;
            AscetItemRef resolved = ResolveComponent(session, component.Path, "read_element_catalog", out discrete, out code);
            List<AscetExistingElementState> existing = AscetElementCatalogReader.ReadExistingElements(discrete, code);
            Dictionary<string, string> elementOids = new Dictionary<string, string>(StringComparer.Ordinal);
            for (int i = 0; i < existing.Count; i++)
            {
                AscetExistingElementState state = existing[i];
                if (state != null && !String.IsNullOrWhiteSpace(state.Name) && !String.IsNullOrWhiteSpace(state.Oid))
                {
                    elementOids[state.Name] = state.Oid;
                }
            }
            string componentOid = SafeGetString(code, "GetOID");
            if (String.IsNullOrWhiteSpace(componentOid))
            {
                componentOid = SafeGetString(code, "GetOid");
            }
            return new AscetElementCatalogReadResult
            {
                ComponentPath = resolved.Path,
                ComponentOid = componentOid,
                ElementOids = elementOids,
                Document = AscetElementCatalogReader.BuildSpecDocument(existing)
            };
        });
    }

    public AscetElementSpecDiffResult Diff(AscetItemRef component, AscetElementSpecDocument spec)
    {
        if (component == null)
        {
            throw new AscetReadException("invalid_argument", "diff_element_spec", "Component reference must not be null.");
        }

        if (spec == null)
        {
            throw new AscetReadException("invalid_argument", "diff_element_spec", "Element spec document must not be null.");
        }

        return ExecuteWithSession("diff_element_spec", delegate(AscetSession session)
        {
            AscetDiscreteComponent discrete;
            CodeComponent code;
            AscetItemRef resolved = ResolveComponent(session, component.Path, "diff_element_spec", out discrete, out code);
            List<AscetExistingElementState> existing = AscetElementCatalogReader.ReadExistingElements(discrete, code);
            return _planner.BuildDiff(resolved.Path, spec, existing);
        });
    }

    public AscetElementSyncResult Apply(AscetItemRef component, AscetElementSpecDocument spec, bool verifyReadback)
    {
        return Apply(component, spec, null, verifyReadback);
    }

    public AscetElementSyncResult Apply(AscetItemRef component, AscetElementSpecDocument spec, AscetElementApplyOptions options, bool verifyReadback)
    {
        if (component == null)
        {
            throw new AscetReadException("invalid_argument", "apply_element_spec", "Component reference must not be null.");
        }

        if (spec == null)
        {
            throw new AscetReadException("invalid_argument", "apply_element_spec", "Element spec document must not be null.");
        }

        options = NormalizeOptions(options);
        AscetElementSyncResult result = ExecuteWithSession("apply_element_spec", delegate(AscetSession session)
        {
            TableDebugStderr("apply:session-open");
            AscetDiscreteComponent discrete;
            CodeComponent code;
            AscetItemRef resolved = ResolveComponent(session, component.Path, "apply_element_spec", out discrete, out code);
            TableDebugStderr("apply:after-resolve-component:" + resolved.Path);
            List<AscetExistingElementState> existing = AscetElementCatalogReader.ReadExistingElements(discrete, code);
            TableDebugStderr("apply:after-read-existing:" + existing.Count.ToString());
            ValidateProjectFormulas(session, resolved, spec, existing, options.ProjectPath);
            EnsureExistingLocalParameterDataWritesAreIndependent(code, spec, existing);
            TableDebugStderr("apply:after-validate-formulas");
            DataConfiguration defaultData = code.GetDefaultData();
            ImplConfiguration defaultImplementation = discrete.GetDefaultImplementation();
            ImplConfiguration classImplementation = discrete.GetClassImplementation();
            AscetElementSpecDiffResult diff = _planner.BuildDiff(resolved.Path, spec, existing);
            TableDebugStderr("apply:after-build-diff");
            List<string> issues = new List<string>();
            List<string> removed = new List<string>();
            List<string> incompatible = new List<string>();
            IList<AscetElementCatalogEntry> removedEntries = diff.RemovedElements ?? new List<AscetElementCatalogEntry>();
            IList<AscetElementIncompatibleDiff> incompatibleEntries = diff.IncompatibleElements ?? new List<AscetElementIncompatibleDiff>();
            IList<AscetExistingElementState> planningExisting = existing;

            for (int i = 0; i < incompatibleEntries.Count; i++)
            {
                AscetElementIncompatibleDiff entry = incompatibleEntries[i];
                if (entry != null && !String.IsNullOrWhiteSpace(entry.Name))
                {
                    incompatible.Add(entry.Name);
                }
            }

            if (options.Mode == AscetElementApplyMode.Restore)
            {
                if (incompatible.Count > 0)
                {
                    if (!options.RecreateIncompatible)
                    {
                        throw new AscetReadException("restore_requires_recreate", "apply_element_spec", "Restore requires --recreate-incompatible for elements: " + String.Join(", ", incompatible.ToArray()) + ".");
                    }
                    planningExisting = ExcludeExistingElements(existing, incompatible);
                }
            }
            else if (incompatible.Count > 0)
            {
                if (!options.RecreateIncompatible)
                {
                    throw new AscetReadException("apply_requires_recreate", "apply_element_spec", "Apply requires --recreate-incompatible for elements: " + String.Join(", ", incompatible.ToArray()) + ".");
                }

                planningExisting = ExcludeExistingElements(existing, incompatible);
            }

            AscetElementSyncPlan plan = _planner.Plan(spec, planningExisting, defaultData != null, defaultImplementation != null);
            TableDebugStderr("apply:after-plan:create=" + (plan.ElementsToCreate == null ? "0" : plan.ElementsToCreate.Count.ToString()) + ":update=" + (plan.ElementsToUpdate == null ? "0" : plan.ElementsToUpdate.Count.ToString()));

            if (NeedsDefaultDataCreation(plan.ElementsToCreate, plan.ElementsToUpdate) && defaultData == null)
            {
                defaultData = EnsureDefaultData(code, issues);
            }

            if (NeedsDefaultImplementationCreation(plan.ElementsToCreate, plan.ElementsToUpdate) && defaultImplementation == null)
            {
                defaultImplementation = EnsureDefaultImplementation(discrete, issues);
            }

            List<string> created = new List<string>();
            List<string> updated = new List<string>();
            HashSet<string> recreatedNames = new HashSet<string>(StringComparer.Ordinal);

            if (options.Mode == AscetElementApplyMode.Restore)
            {
                if (removedEntries.Count > 0)
                {
                    if (options.DeleteMissing)
                    {
                        for (int i = 0; i < removedEntries.Count; i++)
                        {
                            AscetElementCatalogEntry entry = removedEntries[i];
                            if (entry == null || String.IsNullOrWhiteSpace(entry.Name))
                            {
                                continue;
                            }

                            RemoveElement(discrete, entry.Name);
                            removed.Add(entry.Name);
                            issues.Add("Removed extra live element during restore: " + entry.Name + ".");
                        }
                    }
                    else
                    {
                        issues.Add("Preserved extra live elements during restore because deleteMissing=false: " + JoinCatalogNames(removedEntries) + ".");
                    }
                }

                if (incompatible.Count > 0)
                {
                    for (int i = 0; i < incompatible.Count; i++)
                    {
                        string name = incompatible[i];
                        AscetElementSpec recreateSpec = FindRequestedElement(spec, name);
                        if (recreateSpec == null)
                        {
                            throw new AscetReadException("invalid_element_spec", "apply_element_spec", "Restore could not resolve incompatible element '" + name + "' from requested spec.");
                        }

                        RecreateElement(session, code, discrete, recreateSpec, defaultData, defaultImplementation, classImplementation);
                        removed.Add(name);
                        created.Add(name);
                        recreatedNames.Add(name);
                        issues.Add("Recreated incompatible live element during restore: " + name + ".");
                    }

                    incompatible.Clear();
                }
            }
            else if (incompatible.Count > 0)
            {
                for (int i = 0; i < incompatible.Count; i++)
                {
                    string name = incompatible[i];
                    AscetElementSpec recreateSpec = FindRequestedElement(spec, name);
                    if (recreateSpec == null)
                    {
                        throw new AscetReadException("invalid_element_spec", "apply_element_spec", "Apply could not resolve incompatible element '" + name + "' from requested spec.");
                    }

                    RecreateElement(session, code, discrete, recreateSpec, defaultData, defaultImplementation, classImplementation);
                    removed.Add(name);
                    created.Add(name);
                    recreatedNames.Add(name);
                    issues.Add("Recreated incompatible live element during apply: " + name + ".");
                }

                incompatible.Clear();
            }

            IList<AscetElementSpec> elementsToCreate = plan.ElementsToCreate ?? new List<AscetElementSpec>();
            for (int i = 0; i < elementsToCreate.Count; i++)
            {
                string name = elementsToCreate[i].Name ?? String.Empty;
                if (recreatedNames.Contains(name))
                {
                    continue;
                }

                TableDebugStderr("apply:create-loop:before:" + name + ":" + elementsToCreate[i].Kind.ToString());
                CreateElement(session, code, discrete, elementsToCreate[i], defaultData, defaultImplementation, classImplementation);
                TableDebugStderr("apply:create-loop:after:" + name);
                created.Add(name);
            }

            IList<AscetElementSpec> elementsToUpdate = plan.ElementsToUpdate ?? new List<AscetElementSpec>();
            for (int i = 0; i < elementsToUpdate.Count; i++)
            {
                TableDebugStderr("apply:update-loop:before:" + (elementsToUpdate[i].Name ?? String.Empty) + ":" + elementsToUpdate[i].Kind.ToString());
                UpdateElement(session, code, discrete, elementsToUpdate[i], defaultData, defaultImplementation, classImplementation);
                TableDebugStderr("apply:update-loop:after:" + (elementsToUpdate[i].Name ?? String.Empty));
                updated.Add(elementsToUpdate[i].Name ?? String.Empty);
            }

            CommitTableVisibility(session, resolved.Path, spec, created, updated, options.ProjectPath);
            FlushTableEditsIfRequested(session, spec);
            SaveCurrentDatabaseAfterElementWrites(session, created, updated, removed);

            bool verifiedInSession = false;
            if (verifyReadback && ContainsTableNames(spec, created, updated))
            {
                TableDebugStderr("verify-in-session:start");
                VerifyReadbackInCurrentSession(spec, discrete, code);
                TableDebugStderr("verify-in-session:done");
                verifiedInSession = true;
            }

            return new AscetElementSyncResult
            {
                ComponentPath = resolved.Path,
                ComponentKind = resolved.Kind,
                LanguageKind = resolved.LanguageKind,
                ElementResults = BuildElementResults(spec, created, updated, plan.SkippedElements, removed, incompatible, verifiedInSession),
                Summary = BuildElementSummary(created, updated, plan.SkippedElements, removed, incompatible),
                CreatedElements = created,
                UpdatedElements = updated,
                SkippedElements = plan.SkippedElements ?? new List<string>(),
                RemovedElements = removed,
                IncompatibleElements = incompatible,
                Issues = issues,
                WriteSucceeded = true,
                VerifyReadbackRequested = verifyReadback,
                ReadbackVerified = verifiedInSession,
                Mode = options.Mode,
                DeleteMissingRequested = options.DeleteMissing,
                RecreateIncompatibleRequested = options.RecreateIncompatible
            };
        });

        if (verifyReadback && !result.ReadbackVerified)
        {
            VerifyReadback(component.Path, spec);
            result.ReadbackVerified = true;
            MarkElementResultsReadbackVerified(result.ElementResults);
        }

        return result;
    }

    private void MarkElementResultsReadbackVerified(IList<AscetElementSyncItemResult> results)
    {
        if (results == null)
        {
            return;
        }

        for (int i = 0; i < results.Count; i++)
        {
            if (results[i] != null)
            {
                results[i].ReadbackVerified = true;
            }
        }
    }

    private IList<AscetElementSyncItemResult> BuildElementResults(
        AscetElementSpecDocument spec,
        IList<string> created,
        IList<string> updated,
        IList<string> skipped,
        IList<string> removed,
        IList<string> incompatible,
        bool readbackVerified)
    {
        List<AscetElementSyncItemResult> results = new List<AscetElementSyncItemResult>();
        AddElementResults(results, spec, created, "created", readbackVerified);
        AddElementResults(results, spec, updated, "updated", readbackVerified);
        AddElementResults(results, spec, skipped, "skipped", readbackVerified);
        AddElementResults(results, spec, removed, "removed", readbackVerified);
        AddElementResults(results, spec, incompatible, "incompatible", readbackVerified);
        return results;
    }

    private AscetElementSyncSummary BuildElementSummary(
        IList<string> created,
        IList<string> updated,
        IList<string> skipped,
        IList<string> removed,
        IList<string> incompatible)
    {
        return new AscetElementSyncSummary
        {
            Created = CountStrings(created),
            Updated = CountStrings(updated),
            Skipped = CountStrings(skipped),
            Failed = 0,
            Removed = CountStrings(removed),
            Incompatible = CountStrings(incompatible)
        };
    }

    private int CountStrings(IList<string> values)
    {
        return values == null ? 0 : values.Count;
    }

    private void AddElementResults(
        IList<AscetElementSyncItemResult> results,
        AscetElementSpecDocument spec,
        IList<string> names,
        string status,
        bool readbackVerified)
    {
        if (results == null || names == null)
        {
            return;
        }

        for (int i = 0; i < names.Count; i++)
        {
            string name = names[i] ?? String.Empty;
            AscetElementSpec requested = FindRequestedElement(spec, name);
            results.Add(new AscetElementSyncItemResult
            {
                Name = name,
                Kind = requested == null ? String.Empty : requested.Kind.ToString().ToLowerInvariant(),
                Status = status,
                ChangedFields = BuildRequestedChangedFields(requested),
                ReadbackVerified = readbackVerified
            });
        }
    }

    private IList<string> BuildRequestedChangedFields(AscetElementSpec spec)
    {
        List<string> fields = new List<string>();
        if (spec == null)
        {
            return fields;
        }

        if (spec.PhysicalRange != null) fields.Add("physicalRange");
        if (!String.IsNullOrWhiteSpace(spec.Unit)) fields.Add("unit");
        if (!String.IsNullOrWhiteSpace(spec.Comment)) fields.Add("comment");
        if (spec.Calibration.HasValue) fields.Add("calibration");
        if (spec.Data != null) fields.Add("data.value");
        if (!String.IsNullOrWhiteSpace(spec.EnumerationPath)) fields.Add("enumerationPath");
        if (!String.IsNullOrWhiteSpace(spec.TableDimension)) fields.Add("tableDimension");
        if (spec.XValues != null) fields.Add("xValues");
        if (spec.YValues != null) fields.Add("yValues");
        if (spec.Values != null) fields.Add("values");
        if (spec.Impl != null)
        {
            if (!String.IsNullOrWhiteSpace(spec.Impl.MemoryLocation)) fields.Add("impl.memoryLocation");
            if (!String.IsNullOrWhiteSpace(spec.Impl.ValueType)) fields.Add("impl.valueType");
            if (spec.Impl.ImplementationRange != null) fields.Add("impl.implementationRange");
            if (!String.IsNullOrWhiteSpace(spec.Impl.Formula)) fields.Add("impl.formula");
            if (spec.Impl.LimitAssignments.HasValue) fields.Add("impl.limitAssignments");
        }

        bool expectedLimitAssignments;
        if (AscetElementSyncSpecRules.TryGetEffectiveLimitAssignments(spec, out expectedLimitAssignments) &&
            !fields.Contains("impl.limitAssignments"))
        {
            fields.Add("impl.limitAssignments");
        }

        return fields;
    }

    private void EnsureExistingLocalParameterDataWritesAreIndependent(CodeComponent code, AscetElementSpecDocument spec, IList<AscetExistingElementState> existing)
    {
        IList<string> names = AscetDependentDataValuePolicy.GetExistingLocalParameterDataValueNames(spec, existing);
        if (names == null || names.Count == 0)
        {
            return;
        }

        string directory = Path.Combine(Path.GetTempPath(), "ascet-apply-element-data-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        try
        {
            if (code == null || !code.ExportXMLToFile(directory, false))
            {
                throw new AscetReadException(
                    "dependency_state_unverified",
                    "apply_element_spec",
                    "ASCET ExportXMLToFile returned false while validating dependent Parameter data.value writes.");
            }

            string mainAmdPath = AscetElementDependencyXml.FindMainAmd(directory);
            if (String.IsNullOrWhiteSpace(mainAmdPath))
            {
                throw new AscetReadException(
                    "dependency_state_unverified",
                    "apply_element_spec",
                    "ASCET did not export a component main AMD while validating dependent Parameter data.value writes.");
            }

            IList<AscetElementDependencyCandidate> candidates = AscetElementDependencyXml.FindCandidates(mainAmdPath, String.Empty);
            Dictionary<string, bool?> dependencyByName = new Dictionary<string, bool?>(StringComparer.Ordinal);
            for (int i = 0; i < candidates.Count; i++)
            {
                AscetElementDependencyCandidate candidate = candidates[i];
                if (candidate != null && !String.IsNullOrWhiteSpace(candidate.ElementName))
                {
                    dependencyByName[candidate.ElementName] = candidate.IsDependent;
                }
            }

            AscetDependentDataValuePolicy.EnsureExistingLocalParameterDataValuesAreIndependent(names, dependencyByName);
        }
        finally
        {
            try
            {
                if (Directory.Exists(directory))
                {
                    Directory.Delete(directory, true);
                }
            }
            catch
            {
            }
        }
    }

    private void SaveCurrentDatabaseAfterElementWrites(AscetSession session, IList<string> createdNames, IList<string> updatedNames, IList<string> removedNames)
    {
        if (session == null ||
            ((createdNames == null || createdNames.Count == 0) &&
             (updatedNames == null || updatedNames.Count == 0) &&
             (removedNames == null || removedNames.Count == 0)))
        {
            return;
        }

        AscetDataBase database = session.GetCurrentDatabaseHandle();
        if (database == null)
        {
            throw new AscetReadException("database_not_open", "apply_element_spec", "Failed to resolve the current database before committing element changes.");
        }

        if (!database.Save())
        {
            throw new AscetReadException("save_database_failed", "apply_element_spec", "Failed to save the current database after applying element changes.");
        }
    }

    private void FlushTableEditsIfRequested(AscetSession session, AscetElementSpecDocument spec)
    {
        string enabled = Environment.GetEnvironmentVariable("ASCET_TABLE_FORCE_SAVE");
        if (!String.Equals(enabled, "1", StringComparison.Ordinal) || session == null || !ContainsTableElements(spec))
        {
            return;
        }

        MethodInfo method = session.GetToolHandle().GetType().GetMethod("SaveChangesInAllEditors", BindingFlags.Instance | BindingFlags.Public);
        if (method == null)
        {
            throw new AscetReadException("tool_api_error", "apply_element_spec", "ASCET ToolAPI does not expose SaveChangesInAllEditors.");
        }

        object result = method.Invoke(session.GetToolHandle(), null);
        if (result is bool && !(bool)result)
        {
            throw new AscetReadException("tool_api_error", "apply_element_spec", "SaveChangesInAllEditors returned false after table write.");
        }
    }

    private bool ContainsTableElements(AscetElementSpecDocument spec)
    {
        IList<AscetElementSpec> elements = spec == null ? null : spec.Elements;
        if (elements == null)
        {
            return false;
        }

        for (int i = 0; i < elements.Count; i++)
        {
            if (elements[i] != null && elements[i].Kind == AscetElementSpecKind.Table)
            {
                return true;
            }
        }

        return false;
    }

    private bool ContainsTableNames(AscetElementSpecDocument spec, IList<string> createdNames, IList<string> updatedNames)
    {
        IList<AscetElementSpec> elements = spec == null ? null : spec.Elements;
        if (elements == null)
        {
            return false;
        }

        for (int i = 0; i < elements.Count; i++)
        {
            AscetElementSpec element = elements[i];
            if (element == null || element.Kind != AscetElementSpecKind.Table)
            {
                continue;
            }

            if (ContainsName(createdNames, element.Name) || ContainsName(updatedNames, element.Name))
            {
                return true;
            }
        }

        return false;
    }

    private void CommitTableVisibility(AscetSession session, string componentPath, AscetElementSpecDocument spec, IList<string> createdNames, IList<string> updatedNames, string explicitProjectPath)
    {
        TableDebugStderr("table1d:commit:start");
        if (session == null || String.IsNullOrWhiteSpace(componentPath) || !ContainsTableNames(spec, createdNames, updatedNames))
        {
            TableDebugStderr("table1d:commit:skip");
            return;
        }

        List<string> tableNames = new List<string>();
        IList<AscetElementSpec> elements = spec == null ? null : spec.Elements;
        if (elements != null)
        {
            for (int i = 0; i < elements.Count; i++)
            {
                AscetElementSpec element = elements[i];
                if (element == null || element.Kind != AscetElementSpecKind.Table)
                {
                    continue;
                }

                if (ContainsName(createdNames, element.Name) || ContainsName(updatedNames, element.Name))
                {
                    tableNames.Add(element.Name);
                }
            }
        }

        if (tableNames.Count == 0)
        {
            TableDebugStderr("table1d:commit:no-table-names");
            return;
        }

        string mode = Environment.GetEnvironmentVariable("ASCET_TABLE_COMMIT_MODE");
        if (String.IsNullOrWhiteSpace(mode))
        {
            mode = "editor_only";
        }

        if (String.Equals(mode, "none", StringComparison.OrdinalIgnoreCase))
        {
            TableDebugStderr("table1d:commit:mode-none");
            return;
        }

        if (String.Equals(mode, "editor_only", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(mode, "editor_then_writeall", StringComparison.OrdinalIgnoreCase))
        {
            CallAutomationClassMethod(session, "AaaEditorInterface", "SelectComponent", componentPath);
            for (int i = 0; i < tableNames.Count; i++)
            {
                CallAutomationClassMethod(session, "AaaEditorInterface", "OpenDataEditorForElement", tableNames[i], componentPath);
                SaveAllEditors(session);
                CallAutomationClassMethod(session, "AaaEditorInterface", "CloseEditorForElement", tableNames[i], componentPath);
            }
        }

        if (String.Equals(mode, "writeall_only", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(mode, "editor_then_writeall", StringComparison.OrdinalIgnoreCase))
        {
            string projectPath = AscetElementFormulaRules.NormalizeProjectPath(explicitProjectPath);
            if (String.IsNullOrWhiteSpace(projectPath))
            {
                projectPath = AscetElementFormulaRules.InferProjectPathForComponent(componentPath);
            }
            CallAutomationClassMethod(session, "AaaEditorInterface", "WriteAllProjectFiles", projectPath);
        }
        TableDebugStderr("table1d:commit:done");
    }

    private void SaveAllEditors(AscetSession session)
    {
        MethodInfo saveAll = session.GetToolHandle().GetType().GetMethod("SaveChangesInAllEditors", BindingFlags.Instance | BindingFlags.Public);
        if (saveAll == null)
        {
            throw new AscetReadException("tool_api_error", "apply_element_spec", "ASCET ToolAPI does not expose SaveChangesInAllEditors.");
        }

        object saveResult = saveAll.Invoke(session.GetToolHandle(), null);
        if (saveResult is bool && !(bool)saveResult)
        {
            throw new AscetReadException("tool_api_error", "apply_element_spec", "SaveChangesInAllEditors returned false after table editor commit.");
        }
    }

    private void CallAutomationClassMethod(AscetSession session, string serviceName, string methodName, params string[] args)
    {
        if (session == null)
        {
            throw new AscetReadException("tool_api_error", "apply_element_spec", "ASCET session is required for automation API call.");
        }

        object tool = session.GetToolHandle();
        MethodInfo create = tool.GetType().GetMethod("createClassMethodCall", BindingFlags.Instance | BindingFlags.Public);
        if (create == null)
        {
            throw new AscetReadException("tool_api_error", "apply_element_spec", "ASCET ToolAPI does not expose createClassMethodCall.");
        }

        object call = create.Invoke(tool, new object[] { serviceName, methodName });
        if (call == null)
        {
            throw new AscetReadException("tool_api_error", "apply_element_spec", "Failed to create automation class method call for " + serviceName + "." + methodName + ".");
        }

        MethodInfo append = call.GetType().GetMethod("appendParameter", new[] { typeof(string) });
        if (append == null)
        {
            throw new AscetReadException("tool_api_error", "apply_element_spec", "Automation MethodCall does not expose appendParameter(string).");
        }

        if (args != null)
        {
            for (int i = 0; i < args.Length; i++)
            {
                append.Invoke(call, new object[] { args[i] ?? String.Empty });
            }
        }

        MethodInfo invoke = tool.GetType().GetMethod("call", new[] { call.GetType(), typeof(bool) });
        if (invoke == null)
        {
            throw new AscetReadException("tool_api_error", "apply_element_spec", "ASCET ToolAPI does not expose call(MethodCall,bool).");
        }

        invoke.Invoke(tool, new object[] { call, true });
    }

    private void CallAutomationInstanceMethod(AscetSession session, object target, string methodName, params object[] args)
    {
        if (session == null || target == null)
        {
            throw new AscetReadException("tool_api_error", "apply_element_spec", "ASCET session and target are required for automation instance call.");
        }

        object tool = session.GetToolHandle();
        Type instanceCallType = Type.GetType("de.etas.cebra.socket.InstanceMethodCall, Etas.AscetNET");
        if (instanceCallType == null)
        {
            throw new AscetReadException("tool_api_error", "apply_element_spec", "InstanceMethodCall type could not be resolved.");
        }

        ConstructorInfo ctor = instanceCallType.GetConstructors(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)[0];
        object call = ctor.Invoke(new object[] { target, methodName, tool });
        if (call == null)
        {
            throw new AscetReadException("tool_api_error", "apply_element_spec", "Failed to create automation instance method call for '" + methodName + "'.");
        }

        if (args != null)
        {
            for (int i = 0; i < args.Length; i++)
            {
                AppendInstanceMethodCallParameter(call, args[i]);
            }
        }

        MethodInfo invoke = tool.GetType().GetMethod("call", new[] { instanceCallType, typeof(bool) });
        if (invoke == null)
        {
            throw new AscetReadException("tool_api_error", "apply_element_spec", "ASCET ToolAPI does not expose call(InstanceMethodCall,bool).");
        }

        object result = invoke.Invoke(tool, new object[] { call, true });
        TraceInstanceCallResult(result ?? call, methodName);
    }

    private void AppendInstanceMethodCallParameter(object call, object value)
    {
        if (call == null)
        {
            throw new AscetReadException("tool_api_error", "apply_element_spec", "Automation instance call object is required.");
        }

        Type callType = call.GetType();
        MethodInfo method = null;

        if (value is bool)
        {
            method = callType.GetMethod("appendParameter", new[] { typeof(bool) });
        }
        else if (value is string)
        {
            method = callType.GetMethod("appendParameter", new[] { typeof(string) });
        }
        else if (IsWholeNumber(value))
        {
            long longValue = Convert.ToInt64(Math.Round(Convert.ToDouble(value)));
            if (longValue >= Int32.MinValue && longValue <= Int32.MaxValue)
            {
                method = callType.GetMethod("appendParameter", new[] { typeof(int) });
                value = Convert.ToInt32(longValue);
            }
            else
            {
                method = callType.GetMethod("appendParameter", new[] { typeof(long) });
                value = longValue;
            }
        }
        else
        {
            method = callType.GetMethod("appendParameter", new[] { typeof(double) });
            value = Convert.ToDouble(value, System.Globalization.CultureInfo.InvariantCulture);
        }

        if (method == null)
        {
            throw new AscetReadException("tool_api_error", "apply_element_spec", "Automation instance call does not expose an appendParameter overload for '" + (value == null ? "null" : value.GetType().FullName) + "'.");
        }

        method.Invoke(call, new object[] { value });
    }

    private void TraceInstanceCallResult(object call, string methodName)
    {
        string enabled = Environment.GetEnvironmentVariable("ASCET_INSTANCECALL_TRACE");
        if (!String.Equals(enabled, "1", StringComparison.Ordinal) || call == null)
        {
            return;
        }

        try
        {
            PropertyInfo resultInteger = call.GetType().GetProperty("ResultInteger", BindingFlags.Instance | BindingFlags.Public);
            PropertyInfo resultString = call.GetType().GetProperty("ResultString", BindingFlags.Instance | BindingFlags.Public);
            string text = "INSTANCECALL " + methodName;
            if (resultInteger != null)
            {
                text += " int=" + Convert.ToString(resultInteger.GetValue(call, null), System.Globalization.CultureInfo.InvariantCulture);
            }
            if (resultString != null)
            {
                text += " str=" + Convert.ToString(resultString.GetValue(call, null), System.Globalization.CultureInfo.InvariantCulture);
            }
            Console.Error.WriteLine(text);
        }
        catch
        {
        }
    }

    private void TableDebugStderr(string message)
    {
        string enabled = Environment.GetEnvironmentVariable("ASCET_TABLE_DEBUG_STDERR");
        if (!String.Equals(enabled, "1", StringComparison.Ordinal))
        {
            AppendTableDebugFile(message);
            return;
        }

        try
        {
            Console.Error.WriteLine("TABLE_DEBUG " + message);
        }
        catch
        {
        }

        AppendTableDebugFile(message);
    }

    private void AppendTableDebugFile(string message)
    {
        string path = Environment.GetEnvironmentVariable("ASCET_TABLE_DEBUG_PATH");
        if (String.IsNullOrWhiteSpace(path))
        {
            return;
        }

        try
        {
            File.AppendAllText(path, "TABLE_DEBUG " + message + Environment.NewLine);
        }
        catch
        {
        }
    }

    private AscetElementApplyOptions NormalizeOptions(AscetElementApplyOptions options)
    {
        return options ?? new AscetElementApplyOptions
        {
            Mode = AscetElementApplyMode.Apply,
            DeleteMissing = false,
            RecreateIncompatible = false,
            ProjectPath = String.Empty
        };
    }

    private AscetItemRef ResolveComponent(AscetSession session, string componentPath, string operation, out AscetDiscreteComponent discrete, out CodeComponent code)
    {
        DataBaseItem item = ResolveItemByPath(session, componentPath);
        AscetItemRef resolved = Classifier.ToItemRef(item);
        EnsureSupportedComponent(resolved);

        discrete = item as AscetDiscreteComponent;
        code = item as CodeComponent;
        if (discrete == null || code == null)
        {
            throw new AscetReadException("unsupported_component_kind", operation, "Item '" + componentPath + "' is not a discrete code component.");
        }

        return resolved;
    }

    private string JoinCatalogNames(IList<AscetElementCatalogEntry> entries)
    {
        if (entries == null || entries.Count == 0)
        {
            return String.Empty;
        }

        List<string> names = new List<string>();
        for (int i = 0; i < entries.Count; i++)
        {
            AscetElementCatalogEntry entry = entries[i];
            if (entry != null && !String.IsNullOrWhiteSpace(entry.Name))
            {
                names.Add(entry.Name);
            }
        }

        return String.Join(", ", names.ToArray());
    }

    private IList<AscetExistingElementState> ExcludeExistingElements(IList<AscetExistingElementState> existingElements, IList<string> excludedNames)
    {
        List<AscetExistingElementState> filtered = new List<AscetExistingElementState>();
        HashSet<string> excluded = new HashSet<string>(StringComparer.Ordinal);

        if (excludedNames != null)
        {
            for (int i = 0; i < excludedNames.Count; i++)
            {
                if (!String.IsNullOrWhiteSpace(excludedNames[i]))
                {
                    excluded.Add(excludedNames[i]);
                }
            }
        }

        if (existingElements == null)
        {
            return filtered;
        }

        for (int i = 0; i < existingElements.Count; i++)
        {
            AscetExistingElementState state = existingElements[i];
            if (state == null || excluded.Contains(state.Name ?? String.Empty))
            {
                continue;
            }

            filtered.Add(state);
        }

        return filtered;
    }

    private AscetElementSpec FindRequestedElement(AscetElementSpecDocument spec, string name)
    {
        IList<AscetElementSpec> requested = spec == null ? null : spec.Elements;
        if (requested == null || String.IsNullOrWhiteSpace(name))
        {
            return null;
        }

        for (int i = 0; i < requested.Count; i++)
        {
            AscetElementSpec current = requested[i];
            if (current != null && String.Equals(current.Name, name, StringComparison.Ordinal))
            {
                return current;
            }
        }

        return null;
    }

    private void ValidateProjectFormulas(AscetSession session, AscetItemRef component, AscetElementSpecDocument spec, IList<AscetExistingElementState> existingElements, string explicitProjectPath)
    {
        if (!ContainsFormulaReferences(spec))
        {
            return;
        }

        AscetProject project;
        string projectPath = ResolveProjectPathForFormulaValidation(session, component, explicitProjectPath, out project);

        if (project == null)
        {
            throw new AscetReadException(
                "invalid_formula_reference",
                "validate_element_formula",
                "Resolved item '" + projectPath + "' is not an ASCET project for formula validation.");
        }

        Formula[] formulas = project.GetAllFormulas();
        List<string> formulaNames = new List<string>();
        if (formulas != null)
        {
            for (int i = 0; i < formulas.Length; i++)
            {
                Formula formula = formulas[i];
                if (formula != null && !String.IsNullOrWhiteSpace(formula.GetName()))
                {
                    formulaNames.Add(formula.GetName());
                }
            }
        }

        AscetElementFormulaRules.ValidateForProjectContext(component.Path, spec, formulaNames, existingElements, projectPath);
    }

    private string ResolveProjectPathForFormulaValidation(AscetSession session, AscetItemRef component, string explicitProjectPath, out AscetProject project)
    {
        string normalizedExplicit = AscetElementFormulaRules.NormalizeProjectPath(explicitProjectPath);
        if (!String.IsNullOrWhiteSpace(normalizedExplicit))
        {
            DataBaseItem explicitItem = ResolveItemByPath(session, normalizedExplicit);
            project = explicitItem as AscetProject;
            return normalizedExplicit;
        }

        IList<string> candidates = BuildProjectPathCandidates(component == null ? null : component.Path);
        AscetReadException lastFailure = null;
        for (int i = 0; i < candidates.Count; i++)
        {
            string candidate = candidates[i];
            try
            {
                DataBaseItem item = ResolveItemByPath(session, candidate);
                project = item as AscetProject;
                if (project != null)
                {
                    return candidate;
                }
            }
            catch (AscetReadException ex)
            {
                lastFailure = ex;
            }
        }

        string inferred = candidates.Count == 0
            ? AscetElementFormulaRules.InferProjectPathForComponent(component == null ? null : component.Path)
            : candidates[0];
        throw new AscetReadException(
            "invalid_formula_reference",
            "validate_element_formula",
            "Failed to resolve project '" + inferred + "' for formula validation of component '" + (component == null ? String.Empty : (component.Path ?? String.Empty)) + "'.",
            lastFailure);
    }

    private IList<string> BuildProjectPathCandidates(string componentPath)
    {
        List<string> candidates = new List<string>();
        AddProjectPathCandidate(candidates, AscetElementFormulaRules.InferProjectPathForComponent(componentPath));

        AscetItemPath parsed = AscetItemPath.Parse(componentPath);
        string folderPath = parsed.FolderPath ?? String.Empty;
        while (!String.IsNullOrWhiteSpace(folderPath))
        {
            int separator = folderPath.LastIndexOf('\\');
            folderPath = separator < 0 ? String.Empty : folderPath.Substring(0, separator);
            AddProjectPathCandidate(candidates, String.IsNullOrWhiteSpace(folderPath) ? "Project" : folderPath + "\\Project");
        }

        AddProjectPathCandidate(candidates, "Project");
        return candidates;
    }

    private void AddProjectPathCandidate(IList<string> candidates, string candidate)
    {
        string normalized = AscetElementFormulaRules.NormalizeProjectPath(candidate);
        if (String.IsNullOrWhiteSpace(normalized))
        {
            return;
        }

        for (int i = 0; i < candidates.Count; i++)
        {
            if (String.Equals(candidates[i], normalized, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }
        }

        candidates.Add(normalized);
    }

    private bool ContainsFormulaReferences(AscetElementSpecDocument spec)
    {
        IList<AscetElementSpec> elements = spec == null ? null : spec.Elements;
        if (elements == null)
        {
            return false;
        }

        for (int i = 0; i < elements.Count; i++)
        {
            AscetElementSpec current = elements[i];
            if (current != null && current.Impl != null && !String.IsNullOrWhiteSpace(current.Impl.Formula))
            {
                return true;
            }
        }

        return false;
    }

    private void VerifyReadback(string componentPath, AscetElementSpecDocument spec)
    {
        ExecuteWithSession("verify_apply_element_spec", delegate(AscetSession session)
        {
            AscetDiscreteComponent discrete;
            CodeComponent code;
            ResolveComponent(session, componentPath, "verify_apply_element_spec", out discrete, out code);
            VerifyReadbackAgainstExisting(spec, AscetElementCatalogReader.ReadExistingElements(discrete, code));

            return 0;
        });
    }

    private void VerifyReadbackInCurrentSession(AscetElementSpecDocument spec, AscetDiscreteComponent discrete, CodeComponent code)
    {
        TableDebugStderr("verify-against-existing:collect");
        VerifyReadbackAgainstExisting(spec, AscetElementCatalogReader.ReadExistingElements(discrete, code));
        TableDebugStderr("verify-against-existing:collected");
    }

    private void VerifyReadbackAgainstExisting(AscetElementSpecDocument spec, IList<AscetExistingElementState> existingElements)
    {
        Dictionary<string, AscetExistingElementState> existing = IndexExisting(existingElements);
        IList<AscetElementSpec> requested = spec == null ? null : spec.Elements;
        if (requested == null)
        {
            return;
        }

        for (int i = 0; i < requested.Count; i++)
        {
            AscetElementSpec element = requested[i];
            if (element == null)
            {
                continue;
            }

            AscetExistingElementState state;
            if (!existing.TryGetValue(element.Name ?? String.Empty, out state))
            {
                throw new AscetReadException("readback_mismatch", "verify_apply_element_spec", "Requested element '" + element.Name + "' was not found during readback verification.");
            }

            _planner.EnsureReadbackCompatible(element, state);
        }
    }

    private Dictionary<string, AscetExistingElementState> IndexExisting(IList<AscetExistingElementState> existingElements)
    {
        Dictionary<string, AscetExistingElementState> result = new Dictionary<string, AscetExistingElementState>(StringComparer.Ordinal);
        if (existingElements == null)
        {
            return result;
        }

        for (int i = 0; i < existingElements.Count; i++)
        {
            AscetExistingElementState state = existingElements[i];
            if (state == null || String.IsNullOrWhiteSpace(state.Name))
            {
                continue;
            }

            result[state.Name] = state;
        }

        return result;
    }

    private bool ContainsName(IList<string> names, string candidate)
    {
        if (names == null)
        {
            return false;
        }

        for (int i = 0; i < names.Count; i++)
        {
            if (String.Equals(names[i], candidate, StringComparison.Ordinal))
            {
                return true;
            }
        }

        return false;
    }

    private void EnsureSupportedComponent(AscetItemRef component)
    {
        if (component == null)
        {
            throw new AscetReadException("invalid_argument", "apply_element_spec", "Resolved component must not be null.");
        }

        if (component.Kind != AscetComponentKind.Class && component.Kind != AscetComponentKind.Module && component.Kind != AscetComponentKind.StateMachine)
        {
            throw new AscetReadException("unsupported_component_kind", "apply_element_spec", "Item '" + component.Path + "' must be a Class, Module, or StateMachine.");
        }
    }

    private List<AscetExistingElementState> ReadExistingElements(AscetDiscreteComponent component)
    {
        return AscetElementCatalogReader.ReadExistingElements(component, component as CodeComponent);
    }

    private AscetExistingElementState BuildPrimitiveState(PrimitiveModelElement element)
    {
        ArrayElement array = element as ArrayElement;
        AscetElementSpecKind kind = array != null
            ? AscetElementSpecKind.Array
            : (SafeGetBool(element, "IsParameter") ? AscetElementSpecKind.Parameter : AscetElementSpecKind.Variable);
        ImplItem implementation = element == null ? null : element.GetImplementation();
        BoolImpl boolImpl = implementation as BoolImpl;
        ScalarImpl scalarImpl = implementation as ScalarImpl;
        ImplInfo info = scalarImpl == null ? null : scalarImpl.GetImplInfoForValue();

        string valueType = boolImpl != null ? SafeGetString(boolImpl, "GetImplType") : SafeGetString(info, "GetImplType");

        return new AscetExistingElementState
        {
            Name = SafeGetString(element, "GetName"),
            Kind = kind,
            ModelType = SafeGetString(element, "GetModelType"),
            Scope = SafeGetString(element, "GetScope"),
            PhysicalRange = ReadRange(info, true, SafeGetString(element, "GetModelType"), valueType),
            Length = array == null ? (int?)null : array.GetMaxSize(),
            Unit = SafeGetString(element, "GetUnit"),
            Comment = SafeGetString(element, "GetComment"),
            MemoryLocation = SafeGetString(implementation, "GetMemoryLocation"),
            ValueType = valueType,
            ImplRange = ReadRange(info, false, SafeGetString(element, "GetModelType"), valueType),
            Formula = SafeGetString(info, "GetFormulaName"),
            LimitAssignments = SafeGetNullableBool(info, "GetOptionLimitAssignment")
        };
    }

    private AscetExistingElementState BuildComplexState(ComplexModelElement element)
    {
        object represented = InvokeOptional(element, "GetRepresentedClass");
        return new AscetExistingElementState
        {
            Name = SafeGetString(element, "GetName"),
            Kind = AscetElementSpecKind.Component,
            ReferencedComponentPath = NormalizeComponentPath(SafeGetString(represented, "GetNameWithPath")),
            Unit = SafeGetString(element, "GetUnit"),
            Comment = SafeGetString(element, "GetComment")
        };
    }

    private bool NeedsDefaultDataCreation(IList<AscetElementSpec> createElements, IList<AscetElementSpec> updateElements)
    {
        return ContainsDataWrites(createElements) || ContainsDataWrites(updateElements);
    }

    private bool NeedsDefaultImplementationCreation(IList<AscetElementSpec> createElements, IList<AscetElementSpec> updateElements)
    {
        return ContainsImplementationWrites(createElements) || ContainsImplementationWrites(updateElements);
    }

    private bool ContainsDataWrites(IList<AscetElementSpec> elements)
    {
        if (elements == null)
        {
            return false;
        }

        for (int i = 0; i < elements.Count; i++)
        {
            if (elements[i] != null &&
                (elements[i].Data != null ||
                 elements[i].XValues != null ||
                 elements[i].Values != null))
            {
                return true;
            }
        }

        return false;
    }

    private bool ContainsImplementationWrites(IList<AscetElementSpec> elements)
    {
        if (elements == null)
        {
            return false;
        }

        for (int i = 0; i < elements.Count; i++)
        {
            if (elements[i] != null && AscetElementSyncSpecRules.RequiresImplementation(elements[i]))
            {
                return true;
            }
        }

        return false;
    }

    private DataConfiguration EnsureDefaultData(CodeComponent component, IList<string> issues)
    {
        DataConfiguration existing = component == null ? null : component.GetDefaultData();
        if (existing != null)
        {
            return existing;
        }

        string[] candidates = new[] { "DefaultData", "DefaultData_Auto", "ElementSyncData" };
        for (int i = 0; i < candidates.Length; i++)
        {
            DataConfiguration created = component.AddData(candidates[i]);
            if (created == null)
            {
                continue;
            }

            if (!component.SetDefaultData(created))
            {
                throw new AscetReadException("set_default_data_failed", "apply_element_spec", "Failed to set default data configuration '" + candidates[i] + "'.");
            }

            if (issues != null)
            {
                issues.Add("Created default data configuration '" + candidates[i] + "'.");
            }
            return created;
        }

        throw new AscetReadException("create_default_data_failed", "apply_element_spec", "Failed to create a default data configuration for explicit element values.");
    }

    private ImplConfiguration EnsureDefaultImplementation(AscetDiscreteComponent component, IList<string> issues)
    {
        ImplConfiguration existing = component == null ? null : component.GetDefaultImplementation();
        if (existing != null)
        {
            return existing;
        }

        string[] candidates = new[] { "DefaultImplementation", "DefaultImplementation_Auto", "ElementSyncImplementation" };
        for (int i = 0; i < candidates.Length; i++)
        {
            ImplConfiguration created = component.AddImplementation(candidates[i]);
            if (created == null)
            {
                continue;
            }

            if (!component.SetDefaultImplementation(created))
            {
                throw new AscetReadException("set_default_implementation_failed", "apply_element_spec", "Failed to set default implementation '" + candidates[i] + "'.");
            }

            if (issues != null)
            {
                issues.Add("Created default implementation '" + candidates[i] + "'.");
            }
            return created;
        }

        throw new AscetReadException("create_default_implementation_failed", "apply_element_spec", "Failed to create a default implementation for explicit element impl settings.");
    }

    private void CreateElement(AscetSession session, CodeComponent owner, AscetDiscreteComponent discrete, AscetElementSpec spec, DataConfiguration defaultData, ImplConfiguration defaultImplementation, ImplConfiguration classImplementation)
    {
        switch (spec.Kind)
        {
            case AscetElementSpecKind.Variable:
                CreateVariable(discrete, spec, defaultData, defaultImplementation, classImplementation);
                return;
            case AscetElementSpecKind.Parameter:
                CreateParameter(discrete, spec, defaultData, defaultImplementation, classImplementation);
                return;
            case AscetElementSpecKind.Array:
                CreateArray(discrete, spec, defaultData, defaultImplementation, classImplementation);
                return;
            case AscetElementSpecKind.Enumeration:
                CreateEnumeration(session, discrete, spec, defaultData, defaultImplementation, classImplementation);
                return;
            case AscetElementSpecKind.Table:
                if (String.Equals(spec.TableDimension, "2d", StringComparison.Ordinal))
                {
                    CreateTable2D(session, discrete, spec, defaultData);
                    return;
                }
                CreateTable1D(session, discrete, spec, defaultData);
                return;
            case AscetElementSpecKind.Component:
                CreateComponent(session, owner, spec);
                return;
            default:
                throw new AscetReadException("invalid_element_spec", "apply_element_spec", "Unsupported element kind '" + spec.Kind.ToString() + "'.");
        }
    }

    private void UpdateElement(AscetSession session, CodeComponent owner, AscetDiscreteComponent discrete, AscetElementSpec spec, DataConfiguration defaultData, ImplConfiguration defaultImplementation, ImplConfiguration classImplementation)
    {
        object existing = FindExistingElement(discrete, spec == null ? null : spec.Name);
        if (existing == null)
        {
            throw new AscetReadException("element_not_found", "apply_element_spec", "Failed to resolve existing element '" + (spec == null ? String.Empty : spec.Name) + "' for update.");
        }

        if (spec != null && spec.Kind == AscetElementSpecKind.Enumeration)
        {
            UpdateEnumeration(session, existing, spec, defaultData, defaultImplementation, classImplementation);
            return;
        }

        if (spec != null && spec.Kind == AscetElementSpecKind.Table)
        {
            if (String.Equals(spec.TableDimension, "2d", StringComparison.Ordinal))
            {
                UpdateTable2D(session, existing, spec, defaultData);
                return;
            }
            UpdateTable1D(session, existing, spec, defaultData);
            return;
        }

        PrimitiveModelElement primitive = existing as PrimitiveModelElement;
        if (primitive != null)
        {
            ApplyPrimitiveMetadata(primitive, spec);
            ApplyExplicitData(primitive, defaultData, spec);
            ApplyExplicitImplementation(primitive, defaultImplementation, classImplementation, spec);
            return;
        }

        ComplexModelElement complex = existing as ComplexModelElement;
        if (complex != null)
        {
            ApplySharedMetadata(complex, spec);
            return;
        }

        throw new AscetReadException("unsupported_component_kind", "apply_element_spec", "Existing element '" + spec.Name + "' is not a supported model element type.");
    }

    private void CreateVariable(AscetDiscreteComponent owner, AscetElementSpec spec, DataConfiguration defaultData, ImplConfiguration defaultImplementation, ImplConfiguration classImplementation)
    {
        ScalarElement element = owner.AddVariable(spec.Name);
        if (element == null)
        {
            throw new AscetReadException("create_element_failed", "apply_element_spec", "Failed to create variable '" + spec.Name + "'.");
        }

        ApplyPrimitiveMetadata(element, spec);
        ApplyExplicitData(element, defaultData, spec);
        ApplyExplicitImplementation(element, defaultImplementation, classImplementation, spec);
    }

    private void CreateParameter(AscetDiscreteComponent owner, AscetElementSpec spec, DataConfiguration defaultData, ImplConfiguration defaultImplementation, ImplConfiguration classImplementation)
    {
        ScalarElement element = owner.AddParameter(spec.Name);
        if (element == null)
        {
            throw new AscetReadException("create_element_failed", "apply_element_spec", "Failed to create parameter '" + spec.Name + "'.");
        }

        ApplyPrimitiveMetadata(element, spec);
        ApplyExplicitData(element, defaultData, spec);
        ApplyExplicitImplementation(element, defaultImplementation, classImplementation, spec);
    }

    private void CreateArray(AscetDiscreteComponent owner, AscetElementSpec spec, DataConfiguration defaultData, ImplConfiguration defaultImplementation, ImplConfiguration classImplementation)
    {
        ArrayElement element = owner.AddArray(spec.Name);
        if (element == null)
        {
            throw new AscetReadException("create_element_failed", "apply_element_spec", "Failed to create array '" + spec.Name + "'.");
        }

        ApplyPrimitiveMetadata(element, spec);
        if (spec.Length.HasValue && !element.SetMaxSize(spec.Length.Value))
        {
            throw new AscetReadException("create_element_failed", "apply_element_spec", "Failed to set length for array '" + spec.Name + "'.");
        }

        ApplyExplicitData(element, defaultData, spec);
        ApplyExplicitImplementation(element, defaultImplementation, classImplementation, spec);
    }

    private void CreateEnumeration(AscetSession session, AscetDiscreteComponent owner, AscetElementSpec spec, DataConfiguration defaultData, ImplConfiguration defaultImplementation, ImplConfiguration classImplementation)
    {
        ScalarElement element = owner.AddVariable(spec.Name);
        if (element == null)
        {
            throw new AscetReadException("create_element_failed", "apply_element_spec", "Failed to create enumeration '" + spec.Name + "'.");
        }

        ApplyPrimitiveMetadata(element, spec);
        SetElementEnumerator(element, ResolveEnumeration(session, spec.EnumerationPath), spec.Name);
        ApplyExplicitData(element, defaultData, spec);
        ApplyExplicitImplementation(element, defaultImplementation, classImplementation, spec);
    }

    private void UpdateEnumeration(AscetSession session, object existing, AscetElementSpec spec, DataConfiguration defaultData, ImplConfiguration defaultImplementation, ImplConfiguration classImplementation)
    {
        PrimitiveModelElement primitive = existing as PrimitiveModelElement;
        if (primitive == null)
        {
            throw new AscetReadException("unsupported_component_kind", "apply_element_spec", "Existing element '" + spec.Name + "' is not an enumeration-compatible primitive model element.");
        }

        ApplyPrimitiveMetadata(primitive, spec);
        SetElementEnumerator(existing, ResolveEnumeration(session, spec.EnumerationPath), spec.Name);
        ApplyExplicitData(primitive, defaultData, spec);
        ApplyExplicitImplementation(primitive, defaultImplementation, classImplementation, spec);
    }

    private void CreateTable1D(AscetSession session, AscetDiscreteComponent owner, AscetElementSpec spec, DataConfiguration defaultData)
    {
        bool createNormal = AscetElementSyncSpecRules.ShouldCreateNormalOneDTable(spec);
        TableDebugStderr("table1d:create:start:" + (spec == null ? String.Empty : spec.Name) + ":normal=" + createNormal.ToString());
        OneDTableElement element = createNormal
            ? ((owner as CodeComponent) == null ? null : ((CodeComponent)owner).AddOneDTable(spec.Name))
            : owner.AddOneDTableFixed(spec.Name);
        if (element == null)
        {
            throw new AscetReadException("create_element_failed", "apply_element_spec", "Failed to create 1d table '" + spec.Name + "'.");
        }

        element.SetToVariable();
        ApplyPrimitiveMetadata(element, spec);
        int size = spec.Values == null ? 0 : spec.Values.Count;
        if (size > 0 && !element.SetMaxSize(size))
        {
            throw new AscetReadException("create_element_failed", "apply_element_spec", "Failed to set size for 1d table '" + spec.Name + "'.");
        }
        TableDebugStderr("table1d:create:before-durable:" + spec.Name + ":size=" + size.ToString());
        ApplyOneDTableDurableData(session, element, spec, defaultData);
        TableDebugStderr("table1d:create:done:" + spec.Name);
    }

    private void UpdateTable1D(AscetSession session, object existing, AscetElementSpec spec, DataConfiguration defaultData)
    {
        OneDTableElement table = existing as OneDTableElement;
        if (table == null)
        {
            throw new AscetReadException("unsupported_component_kind", "apply_element_spec", "Existing element '" + spec.Name + "' is not a 1d table element.");
        }

        ApplyPrimitiveMetadata(table, spec);
        int size = spec.Values == null ? 0 : spec.Values.Count;
        if (size > 0 && !table.SetMaxSize(size))
        {
            throw new AscetReadException("set_data_failed", "apply_element_spec", "Failed to set size for 1d table '" + spec.Name + "'.");
        }
        TableDebugStderr("table1d:update:before-durable:" + spec.Name + ":size=" + size.ToString());
        ApplyOneDTableDurableData(session, table, spec, defaultData);
        TableDebugStderr("table1d:update:done:" + spec.Name);
    }

    private void CreateTable2D(AscetSession session, AscetDiscreteComponent owner, AscetElementSpec spec, DataConfiguration defaultData)
    {
        TableDebugStderr("table2d:create:start:" + (spec == null ? String.Empty : spec.Name));
        bool createNormal = AscetElementSyncSpecRules.ShouldCreateNormalTwoDTable(spec);
        TwoDTableElement element = createNormal
            ? ((owner as CodeComponent) == null ? null : ((CodeComponent)owner).AddTwoDTable(spec.Name))
            : owner.AddTwoDTableFixed(spec.Name);
        TableDebugStderr("table2d:create:after-add:" + (spec == null ? String.Empty : spec.Name));
        if (element == null)
        {
            throw new AscetReadException("create_element_failed", "apply_element_spec", "Failed to create 2d table '" + spec.Name + "'.");
        }

        element.SetToVariable();
        ApplyPrimitiveMetadata(element, spec);
        TableDebugStderr("table2d:create:after-metadata:" + spec.Name);
        int xSize = spec.Values == null ? 0 : spec.Values.Count;
        int ySize = spec.YValues == null ? 0 : spec.YValues.Count;
        if (xSize > 0 && !element.SetMaxXSize(xSize))
        {
            throw new AscetReadException("create_element_failed", "apply_element_spec", "Failed to set x size for 2d table '" + spec.Name + "'.");
        }
        TableDebugStderr("table2d:create:after-maxx:" + spec.Name + ":x=" + xSize.ToString());
        if (ySize > 0 && !element.SetMaxYSize(ySize))
        {
            throw new AscetReadException("create_element_failed", "apply_element_spec", "Failed to set y size for 2d table '" + spec.Name + "'.");
        }

        TableDebugStderr("table2d:create:after-setsize:" + spec.Name + ":x=" + xSize.ToString() + ":y=" + ySize.ToString());
        ApplyTwoDTableDurableData(session, element, spec, defaultData);
        TableDebugStderr("table2d:create:done:" + spec.Name);
    }

    private void UpdateTable2D(AscetSession session, object existing, AscetElementSpec spec, DataConfiguration defaultData)
    {
        TableDebugStderr("table2d:update:start:" + (spec == null ? String.Empty : spec.Name));
        TwoDTableElement table = existing as TwoDTableElement;
        if (table == null)
        {
            throw new AscetReadException("unsupported_component_kind", "apply_element_spec", "Existing element '" + spec.Name + "' is not a 2d table element.");
        }

        ApplyPrimitiveMetadata(table, spec);
        int xSize = spec.Values == null ? 0 : spec.Values.Count;
        int ySize = spec.YValues == null ? 0 : spec.YValues.Count;
        if (AscetElementSyncSpecRules.UsesFixedDefaultTwoDMatrixOnlyPath(spec))
        {
            int currentXSize = table.GetMaxXSize();
            int currentYSize = table.GetMaxYSize();
            if (xSize != currentXSize || ySize != currentYSize)
            {
                throw new AscetReadException("element_conflict", "apply_element_spec", "Existing fixed 2d table '" + spec.Name + "' has shape '" + currentXSize.ToString() + "x" + currentYSize.ToString() + "' but matrix-only updates require '" + xSize.ToString() + "x" + ySize.ToString() + "'.");
            }
        }
        else
        {
            if (xSize > 0 && !table.SetMaxXSize(xSize))
            {
                throw new AscetReadException("set_data_failed", "apply_element_spec", "Failed to set x size for 2d table '" + spec.Name + "'.");
            }
            if (ySize > 0 && !table.SetMaxYSize(ySize))
            {
                throw new AscetReadException("set_data_failed", "apply_element_spec", "Failed to set y size for 2d table '" + spec.Name + "'.");
            }
        }

        TableDebugStderr("table2d:update:after-setsize:" + spec.Name + ":x=" + xSize.ToString() + ":y=" + ySize.ToString());
        ApplyTwoDTableDurableData(session, table, spec, defaultData);
        TableDebugStderr("table2d:update:done:" + spec.Name);
    }

    private void ApplyOneDTablePostDataWrites(AscetSession session, OneDTableElement table, AscetElementSpec spec)
    {
        if (session == null || table == null || spec == null)
        {
            return;
        }

        if (String.Equals(Environment.GetEnvironmentVariable("ASCET_TABLE_PUBLIC_INTERFACE_WRITE"), "1", StringComparison.Ordinal))
        {
            ApplyOneDTablePublicInterfaceWrites(session, table, spec);
            return;
        }

        int size = spec.Values == null ? 0 : spec.Values.Count;
        SetTableCurrentSizeIfRequested(session, table, size);
        ApplyOneDTableValuesByInstanceCall(session, table, spec);
    }

    private void ApplyOneDTableDurableData(AscetSession session, OneDTableElement table, AscetElementSpec spec, DataConfiguration defaultData)
    {
        TableDebugStderr("table1d:durable:start:" + (spec == null ? String.Empty : spec.Name));
        OpenTableEditorBeforeWriteIfRequested(session, table, spec == null ? null : spec.Name);
        TableDebugStderr("table1d:durable:after-open:" + (spec == null ? String.Empty : spec.Name));
        ApplyExplicitData(table, defaultData, spec);
        TableDebugStderr("table1d:durable:after-explicit:" + (spec == null ? String.Empty : spec.Name));
        ApplyOneDTablePostDataWrites(session, table, spec);
        TableDebugStderr("table1d:durable:after-postwrites:" + (spec == null ? String.Empty : spec.Name));
        PersistTableEditorAfterWriteIfRequested(session, table, spec == null ? null : spec.Name);
        TableDebugStderr("table1d:durable:after-editor-persist:" + (spec == null ? String.Empty : spec.Name));
        SaveCurrentDatabaseAfterTableWriteIfRequested(session, spec == null ? null : spec.Name);
        TableDebugStderr("table1d:durable:after-db-save:" + (spec == null ? String.Empty : spec.Name));
    }

    private void ApplyTwoDTableDurableData(AscetSession session, TwoDTableElement table, AscetElementSpec spec, DataConfiguration defaultData)
    {
        TableDebugStderr("table2d:durable:start:" + (spec == null ? String.Empty : spec.Name));
        ApplyExplicitData(table, defaultData, spec);
        TableDebugStderr("table2d:durable:after-explicit:" + (spec == null ? String.Empty : spec.Name));
        SaveCurrentDatabaseAfterTableWriteIfRequested(session, spec == null ? null : spec.Name);
        TableDebugStderr("table2d:durable:after-db-save:" + (spec == null ? String.Empty : spec.Name));
    }

    private void ApplyOneDTablePublicInterfaceWrites(AscetSession session, OneDTableElement table, AscetElementSpec spec)
    {
        IList xValues = spec == null ? null : spec.XValues as IList;
        IList values = spec == null ? null : spec.Values as IList;
        int size = values == null ? 0 : values.Count;
        if (size <= 0)
        {
            return;
        }

        TableDebugStderr("table-public-write:start:" + SafeGetString(table, "GetName") + ":size=" + size.ToString());

        CallAutomationInstanceMethod(session, table, "setCurrentSize", size);
        if (String.Equals(Environment.GetEnvironmentVariable("ASCET_TABLE_CREATE_NORMAL"), "1", StringComparison.Ordinal))
        {
            for (int i = 0; i < xValues.Count; i++)
            {
                CallAutomationInstanceMethod(session, table, "setX", i, ConvertTablePublicInterfaceValue(spec, xValues[i]));
            }

            ApplyOneDTableValuesByInstanceCall(session, table, spec);
            TableDebugStderr("table-public-write:done:setX-on-table:" + SafeGetString(table, "GetName"));
            return;
        }

        ApplyOneDTableValuesByInstanceCall(session, table, spec);

        DistributionElement xDistribution = table.GetXDistribution();
        if (xDistribution == null || xValues == null)
        {
            TableDebugStderr("table-public-write:no-xdistribution");
            return;
        }

        if (!xDistribution.SetMaxSize(size))
        {
            throw new AscetReadException("set_data_failed", "apply_element_spec", "Failed to set x distribution max size for element '" + spec.Name + "'.");
        }

        CallAutomationInstanceMethod(session, xDistribution, "setCurrentSize", size);
        for (int i = 0; i < xValues.Count; i++)
        {
            CallAutomationInstanceMethod(session, xDistribution, "setX", i, ConvertTablePublicInterfaceValue(spec, xValues[i]));
        }

        TableDebugStderr("table-public-write:done:" + SafeGetString(table, "GetName"));
    }

    private void ApplyOneDTableValuesByInstanceCall(AscetSession session, OneDTableElement table, AscetElementSpec spec)
    {
        if (!String.Equals(Environment.GetEnvironmentVariable("ASCET_TABLE_ENABLE_INSTANCECALL"), "1", StringComparison.Ordinal))
        {
            return;
        }

        IList values = spec == null ? null : spec.Values as IList;
        if (session == null || table == null || values == null)
        {
            return;
        }

        if (String.Equals(Environment.GetEnvironmentVariable("ASCET_INSTANCECALL_TRACE"), "1", StringComparison.Ordinal))
        {
            try
            {
                Console.Error.WriteLine("INSTANCECALL ENTER " + SafeGetString(table, "GetName") + " count=" + values.Count.ToString());
            }
            catch
            {
            }
        }

        for (int i = 0; i < values.Count; i++)
        {
            CallAutomationInstanceMethod(session, table, "setValue", i, ConvertTablePublicInterfaceValue(spec, values[i]));
        }
    }

    private object ConvertTablePublicInterfaceValue(AscetElementSpec spec, object value)
    {
        if (value == null)
        {
            return null;
        }

        if (value is bool || value is string)
        {
            return value;
        }

        if (String.Equals(spec == null ? null : spec.ModelType, "cont", StringComparison.OrdinalIgnoreCase))
        {
            return Convert.ToDouble(value, System.Globalization.CultureInfo.InvariantCulture);
        }

        if (IsWholeNumber(value))
        {
            long longValue = Convert.ToInt64(Math.Round(Convert.ToDouble(value, System.Globalization.CultureInfo.InvariantCulture)));
            if (longValue >= Int32.MinValue && longValue <= Int32.MaxValue)
            {
                return Convert.ToInt32(longValue);
            }

            return longValue;
        }

        return Convert.ToDouble(value, System.Globalization.CultureInfo.InvariantCulture);
    }

    private void OpenTableEditorBeforeWriteIfRequested(AscetSession session, PrimitiveModelElement element, string elementName)
    {
        if (!String.Equals(Environment.GetEnvironmentVariable("ASCET_TABLE_OPEN_EDITOR_BEFORE_WRITE"), "1", StringComparison.Ordinal) || session == null || element == null || String.IsNullOrWhiteSpace(elementName))
        {
            return;
        }

        string componentPath = ResolveElementOwnerPath(element);
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            return;
        }

        TableDebugStderr("table-editor-before-write:open:" + elementName);
        CallAutomationClassMethod(session, "AaaEditorInterface", "SelectComponent", componentPath);
        CallAutomationClassMethod(session, "AaaEditorInterface", "OpenDataEditorForElement", elementName, componentPath);
    }

    private void PersistTableEditorAfterWriteIfRequested(AscetSession session, PrimitiveModelElement element, string elementName)
    {
        if (!String.Equals(Environment.GetEnvironmentVariable("ASCET_TABLE_OPEN_EDITOR_BEFORE_WRITE"), "1", StringComparison.Ordinal) || session == null || element == null || String.IsNullOrWhiteSpace(elementName))
        {
            return;
        }

        string componentPath = ResolveElementOwnerPath(element);
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            return;
        }

        TableDebugStderr("table-editor-before-write:save:" + elementName);
        SaveAllEditors(session);
        CallAutomationClassMethod(session, "AaaEditorInterface", "CloseEditorForElement", elementName, componentPath);
        CallAutomationClassMethod(session, "AaaEditorInterface", "WriteAllProjectFiles", AscetElementFormulaRules.InferProjectPathForComponent(componentPath));
    }

    private string ResolveElementOwnerPath(PrimitiveModelElement element)
    {
        object owner = element == null ? null : element.GetOwnerForElement();
        return NormalizeComponentPath(SafeGetString(owner, "GetNameWithPath"));
    }

    private void SetTableCurrentSizeIfRequested(AscetSession session, OneDTableElement table, int size)
    {
        string enabled = Environment.GetEnvironmentVariable("ASCET_TABLE_SET_CURRENT_SIZE");
        if (!String.Equals(enabled, "1", StringComparison.Ordinal) || session == null || table == null || size <= 0)
        {
            return;
        }

        CallAutomationInstanceMethod(session, table, "setCurrentSize", size);
    }

    private AscetEnumeration ResolveEnumeration(AscetSession session, string enumerationPath)
    {
        DataBaseItem item = ResolveItemByPath(session, enumerationPath);
        AscetEnumeration enumeration = item as AscetEnumeration;
        if (enumeration == null)
        {
            throw new AscetReadException("unsupported_component_kind", "apply_element_spec", "Item '" + enumerationPath + "' is not an enumeration.");
        }

        return enumeration;
    }

    private void SetElementEnumerator(object element, AscetEnumeration enumeration, string elementName)
    {
        if (element == null || enumeration == null)
        {
            throw new AscetReadException("set_enumerator_failed", "apply_element_spec", "Failed to resolve enumerator binding for element '" + (elementName ?? String.Empty) + "'.");
        }

        InvokeRequiredBooleanMethod(element, "SetEnumerator", new object[] { enumeration }, "set_enumerator_failed", "Failed to set enumerationPath for element '" + (elementName ?? String.Empty) + "'.");
    }

    private void RemoveElement(AscetDiscreteComponent component, string name)
    {
        object existing = FindExistingElement(component, name);
        if (existing == null)
        {
            throw new AscetReadException("element_not_found", "apply_element_spec", "Failed to resolve existing element '" + (name ?? String.Empty) + "' for removal.");
        }

        AscetModelElement modelElement = existing as AscetModelElement;
        if (modelElement == null)
        {
            throw new AscetReadException("unsupported_component_kind", "apply_element_spec", "Existing element '" + (name ?? String.Empty) + "' is not a removable model element.");
        }

        if (!component.RemoveModelElement(modelElement))
        {
            throw new AscetReadException("remove_element_failed", "apply_element_spec", "Failed to remove element '" + (name ?? String.Empty) + "'.");
        }
    }

    private void RecreateElement(AscetSession session, CodeComponent owner, AscetDiscreteComponent discrete, AscetElementSpec spec, DataConfiguration defaultData, ImplConfiguration defaultImplementation, ImplConfiguration classImplementation)
    {
        if (spec == null)
        {
            throw new AscetReadException("invalid_element_spec", "apply_element_spec", "Recreate element spec must not be null.");
        }

        RemoveElement(discrete, spec.Name);
        CreateElement(session, owner, discrete, spec, defaultData, defaultImplementation, classImplementation);
    }

    private void CreateComponent(AscetSession session, CodeComponent owner, AscetElementSpec spec)
    {
        CodeComponent referenced = ResolveCodeComponent(session, spec.ReferencedComponentPath);
        ComplexModelElement element = owner.AddComponent(referenced, spec.Name);
        if (element == null)
        {
            throw new AscetReadException("create_element_failed", "apply_element_spec", "Failed to create component element '" + spec.Name + "'.");
        }

        ApplySharedMetadata(element, spec);
    }

    private object FindExistingElement(AscetDiscreteComponent component, string name)
    {
        Array modelElements = component == null ? null : (component.GetAllModelElements() as Array);
        if (modelElements == null || String.IsNullOrWhiteSpace(name))
        {
            return null;
        }

        for (int i = 0; i < modelElements.Length; i++)
        {
            object current = modelElements.GetValue(i);
            if (String.Equals(SafeGetString(current, "GetName"), name, StringComparison.Ordinal))
            {
                return current;
            }
        }

        return null;
    }

    private void ApplyPrimitiveMetadata(PrimitiveModelElement element, AscetElementSpec spec)
    {
        InvokeOptionalSetter(element, "SetModelType", spec.ModelType, true, "set_model_type_failed", "Failed to set modelType for element '" + spec.Name + "'.");
        InvokeOptionalSetter(element, "SetScope", spec.Scope, true, "set_scope_failed", "Failed to set scope for element '" + spec.Name + "'.");
        ApplySharedMetadata(element, spec);
        ApplyCalibration(element, spec);
    }

    private void ApplySharedMetadata(object element, AscetElementSpec spec)
    {
        InvokeOptionalSetter(element, "SetUnit", spec.Unit, false, "set_unit_failed", "Failed to set unit for element '" + spec.Name + "'.");
        InvokeOptionalSetter(element, "SetComment", spec.Comment, false, "set_comment_failed", "Failed to set comment for element '" + spec.Name + "'.");
    }

    private void ApplyCalibration(PrimitiveModelElement element, AscetElementSpec spec)
    {
        if (element == null || spec == null || !spec.Calibration.HasValue)
        {
            return;
        }

        bool success = spec.Calibration.Value ? element.SetCalibration() : element.ClearCalibration();
        if (!success)
        {
            throw new AscetReadException("set_calibration_failed", "apply_element_spec", "Failed to set calibration for element '" + spec.Name + "'.");
        }
    }

    private void ApplyExplicitData(PrimitiveModelElement element, DataConfiguration defaultData, AscetElementSpec spec)
    {
        if (spec == null)
        {
            return;
        }

        DataConfiguration effectiveData = ResolveDataConfigurationForElement(element, defaultData, spec);

        TwoDTableElement twoDTable = element as TwoDTableElement;
        if (twoDTable != null)
        {
            TableDebugStderr("table2d:explicit:start:" + spec.Name);
            DataItem tableItem = ResolvePreferredTableDataItem(element, effectiveData);
            TableDebugStderr("table2d:explicit:after-resolve-item:" + spec.Name + ":" + (tableItem == null ? "null" : tableItem.GetType().FullName));
            if (tableItem == null)
            {
                throw new AscetReadException("data_item_not_found", "apply_element_spec", "Failed to resolve data item for element '" + spec.Name + "'.");
            }
            ApplyTwoDTableData(tableItem as TwoDTableData, spec);
            TableDebugStderr("table2d:explicit:after-apply-data:" + spec.Name);
            PersistDataItem(effectiveData, tableItem, element, spec.Name);
            TableDebugStderr("table2d:explicit:after-setitem:" + spec.Name);
            return;
        }

        OneDTableElement oneDTable = element as OneDTableElement;
        if (oneDTable != null)
        {
            TableDebugStderr("table1d:explicit:start:" + spec.Name);
            DataItem tableItem = ResolvePreferredTableDataItem(element, effectiveData);
            if (tableItem == null)
            {
                throw new AscetReadException("data_item_not_found", "apply_element_spec", "Failed to resolve data item for element '" + spec.Name + "'.");
            }
            ApplyOneDTableData(tableItem as OneDTableData, spec);
            TableDebugStderr("table1d:explicit:after-apply-data:" + spec.Name);
            PersistDataItem(effectiveData, tableItem, element, spec.Name);
            TableDebugStderr("table1d:explicit:after-setitem:" + spec.Name);
            VerifyOneDTableImmediateWrite(oneDTable, spec);
            TableDebugStderr("table1d:explicit:after-verify-immediate:" + spec.Name);
            return;
        }

        if (spec.Data == null)
        {
            return;
        }

        DataItem item = effectiveData == null ? null : effectiveData.GetItem(element);
        if (item == null)
        {
            item = element.GetValue();
        }

        if (item == null)
        {
            throw new AscetReadException("data_item_not_found", "apply_element_spec", "Failed to resolve data item for element '" + spec.Name + "'.");
        }

        ArrayElement array = element as ArrayElement;
        if (array != null)
        {
            ApplyArrayData(item as ArrayData, spec);
            PersistDataItem(effectiveData, item, element, spec.Name);
            return;
        }

        ApplyScalarData(item as ScalarData, spec);
        PersistDataItem(effectiveData, item, element, spec.Name);
    }

    private DataConfiguration ResolveDataConfigurationForElement(PrimitiveModelElement element, DataConfiguration defaultData, AscetElementSpec spec)
    {
        bool exported = String.Equals(spec == null ? null : spec.Scope, "exported", StringComparison.OrdinalIgnoreCase) ||
                        String.Equals(SafeGetString(element, "GetScope"), "exported", StringComparison.OrdinalIgnoreCase);
        if (!exported || element == null)
        {
            return defaultData;
        }

        CodeComponent owner = InvokeOptional(element, "GetOwnerForElement") as CodeComponent;
        AscetDiscreteComponent discrete = owner as AscetDiscreteComponent;
        DataConfiguration classData = discrete == null ? null : discrete.GetClassData();
        return classData ?? defaultData;
    }

    private DataItem ResolvePreferredTableDataItem(PrimitiveModelElement element, DataConfiguration defaultData)
    {
        DataItem fromDefault = defaultData == null || element == null ? null : defaultData.GetItem(element);
        if (fromDefault != null)
        {
            return fromDefault;
        }

        return element == null ? null : (element.GetValue() as DataItem);
    }

    private void SaveCurrentDatabaseAfterTableWriteIfRequested(AscetSession session, string elementName)
    {
        if (!String.Equals(Environment.GetEnvironmentVariable("ASCET_TABLE_FORCE_DATABASE_SAVE"), "1", StringComparison.Ordinal) || session == null)
        {
            return;
        }

        AscetDataBase database = session.GetCurrentDatabaseHandle();
        if (database == null)
        {
            throw new AscetReadException("database_not_open", "apply_element_spec", "Failed to resolve current database after writing table '" + (elementName ?? String.Empty) + "'.");
        }

        if (!database.Save())
        {
            throw new AscetReadException("set_data_failed", "apply_element_spec", "Failed to save current database after writing table '" + (elementName ?? String.Empty) + "'.");
        }
    }

    private void PersistDataItem(DataConfiguration defaultData, DataItem item, PrimitiveModelElement element, string elementName)
    {
        if (defaultData == null || item == null || element == null)
        {
            return;
        }

        if (!defaultData.SetItem(item, element))
        {
            throw new AscetReadException("set_data_failed", "apply_element_spec", "Failed to persist data item for element '" + (elementName ?? String.Empty) + "'.");
        }
    }

    private void VerifyOneDTableImmediateWrite(OneDTableElement element, AscetElementSpec spec)
    {
        string enabled = Environment.GetEnvironmentVariable("ASCET_TABLE_DEBUG_CHECK");
        if (!String.Equals(enabled, "1", StringComparison.Ordinal) || element == null || spec == null || spec.Values == null)
        {
            return;
        }

        OneDTableData data = element.GetValue() as OneDTableData;
        if (data == null)
        {
            throw new AscetReadException("set_data_failed", "apply_element_spec", "Immediate 1d table debug check could not resolve table data for element '" + spec.Name + "'.");
        }

        IList actual = ReadArrayValueForDebug(
            data.GetValue(),
            new[] { "GetBooleanValue", "GetIntegerValue", "GetLongValue", "GetDoubleValue", "GetFloatValue" },
            true);

        if (!ValuesEqualForDebug(spec.Values as IList, actual))
        {
            throw new AscetReadException(
                "set_data_failed",
                "apply_element_spec",
                "Immediate 1d table debug check mismatch for element '" + spec.Name + "': actual=" + FormatComparableValueForDebug(actual) + " expected=" + FormatComparableValueForDebug(spec.Values as IList) + ".");
        }
    }

    private IList ReadArrayValueForDebug(object target, string[] methodNames, bool expectArray)
    {
        if (target == null || methodNames == null)
        {
            return null;
        }

        for (int i = 0; i < methodNames.Length; i++)
        {
            try
            {
                MethodInfo method = target.GetType().GetMethod(methodNames[i], BindingFlags.Instance | BindingFlags.Public);
                if (method == null || method.GetParameters().Length != 0)
                {
                    continue;
                }

                object value = method.Invoke(target, null);
                if (value == null)
                {
                    continue;
                }

                if (expectArray)
                {
                    Array array = value as Array;
                    if (array == null)
                    {
                        continue;
                    }

                    ArrayList result = new ArrayList();
                    for (int index = 0; index < array.Length; index++)
                    {
                        result.Add(CloneValueForDebug(array.GetValue(index)));
                    }
                    return result;
                }
            }
            catch
            {
            }
        }

        return null;
    }

    private bool ValuesEqualForDebug(IList expected, IList actual)
    {
        if (expected == null || actual == null)
        {
            return expected == actual;
        }

        if (expected.Count != actual.Count)
        {
            return false;
        }

        for (int i = 0; i < expected.Count; i++)
        {
            double left;
            double right;
            if (TryConvertDoubleForDebug(expected[i], out left) && TryConvertDoubleForDebug(actual[i], out right))
            {
                if (Math.Abs(left - right) > 0.000001d)
                {
                    return false;
                }
                continue;
            }

            if (!String.Equals(Convert.ToString(expected[i], System.Globalization.CultureInfo.InvariantCulture), Convert.ToString(actual[i], System.Globalization.CultureInfo.InvariantCulture), StringComparison.Ordinal))
            {
                return false;
            }
        }

        return true;
    }

    private bool TryConvertDoubleForDebug(object value, out double result)
    {
        try
        {
            result = Convert.ToDouble(value, System.Globalization.CultureInfo.InvariantCulture);
            return true;
        }
        catch
        {
            result = 0d;
            return false;
        }
    }

    private string FormatComparableValueForDebug(IList value)
    {
        if (value == null)
        {
            return String.Empty;
        }

        List<string> parts = new List<string>();
        for (int i = 0; i < value.Count; i++)
        {
            parts.Add(Convert.ToString(value[i], System.Globalization.CultureInfo.InvariantCulture));
        }
        return "[" + String.Join(", ", parts.ToArray()) + "]";
    }

    private object CloneValueForDebug(object value)
    {
        if (value == null)
        {
            return null;
        }

        IList list = value as IList;
        if (list != null && !(value is string))
        {
            ArrayList result = new ArrayList();
            for (int i = 0; i < list.Count; i++)
            {
                result.Add(CloneValueForDebug(list[i]));
            }
            return result;
        }

        return value;
    }

    private void ApplyScalarData(ScalarData dataItem, AscetElementSpec spec)
    {
        if (dataItem == null)
        {
            throw new AscetReadException("data_item_not_found", "apply_element_spec", "Failed to resolve scalar data item for element '" + spec.Name + "'.");
        }

        object value = spec.Data == null ? null : spec.Data.Value;
        if (value == null)
        {
            throw new AscetReadException("invalid_element_spec", "apply_element_spec", "Explicit scalar data for element '" + spec.Name + "' must not be null.");
        }

        if (value is bool)
        {
            InvokeRequiredBooleanMethod(dataItem, "SetBooleanValue", new object[] { (bool)value }, "set_data_failed", "Failed to set boolean value for element '" + spec.Name + "'.");
            return;
        }

        if (value is string)
        {
            InvokeRequiredBooleanMethod(dataItem, "SetStringValue", new object[] { (string)value }, "set_data_failed", "Failed to set string value for element '" + spec.Name + "'.");
            return;
        }

        if (IsWholeNumber(value))
        {
            long longValue = Convert.ToInt64(Math.Round(Convert.ToDouble(value)));
            if (longValue >= Int32.MinValue && longValue <= Int32.MaxValue)
            {
                InvokeRequiredBooleanMethod(dataItem, "SetIntegerValue", new object[] { Convert.ToInt32(longValue) }, "set_data_failed", "Failed to set integer value for element '" + spec.Name + "'.");
                return;
            }

            InvokeRequiredBooleanMethod(dataItem, "SetLongValue", new object[] { longValue }, "set_data_failed", "Failed to set long value for element '" + spec.Name + "'.");
            return;
        }

        InvokeRequiredBooleanMethod(dataItem, "SetDoubleValue", new object[] { Convert.ToDouble(value) }, "set_data_failed", "Failed to set double value for element '" + spec.Name + "'.");
    }

    private void ApplyArrayData(ArrayData dataItem, AscetElementSpec spec)
    {
        if (dataItem == null)
        {
            throw new AscetReadException("data_item_not_found", "apply_element_spec", "Failed to resolve array data item for element '" + spec.Name + "'.");
        }

        IList values = spec.Data == null ? null : spec.Data.Value as IList;
        if (values == null)
        {
            throw new AscetReadException("invalid_element_spec", "apply_element_spec", "Array element '" + spec.Name + "' requires data.value to be an array.");
        }

        int expectedLength = spec.Length.HasValue ? spec.Length.Value : values.Count;
        ApplyArrayValues(dataItem, values, expectedLength, spec.Name, "Array element");
    }

    private void ApplyOneDTableData(OneDTableData dataItem, AscetElementSpec spec)
    {
        if (dataItem == null)
        {
            throw new AscetReadException("data_item_not_found", "apply_element_spec", "Failed to resolve 1d table data item for element '" + spec.Name + "'.");
        }

        IList xValues = spec == null ? null : spec.XValues as IList;
        IList values = spec == null ? null : spec.Values as IList;
        if (xValues == null || values == null)
        {
            throw new AscetReadException("invalid_element_spec", "apply_element_spec", "1d table element '" + spec.Name + "' requires xValues and values.");
        }

        int expectedLength = values.Count;
        if (!dataItem.SetSize(expectedLength))
        {
            throw new AscetReadException("set_data_failed", "apply_element_spec", "Failed to set 1d table size for element '" + spec.Name + "'.");
        }
        TableDebugStderr("table1d:data:after-setsize:" + spec.Name + ":size=" + expectedLength.ToString());

        DistributionData distribution = RequireOneDTableDistributionData(dataItem, spec.Name);
        ArrayData valueData = RequireOneDTableValueData(dataItem, spec.Name);

        if (AscetElementSyncSpecRules.RequiresCustomOneDTableAxisWrite(spec.XValues))
        {
            ApplyOneDTableDistributionData(distribution, xValues, expectedLength, spec.Name);
            TableDebugStderr("table1d:data:after-distribution:" + spec.Name);
        }
        ApplyOneDTableValueArray(valueData, values, expectedLength, spec.Name);
        TableDebugStderr("table1d:data:after-values:" + spec.Name);
        PersistOneDTableNestedData(dataItem, distribution, valueData, spec.Name);
        TableDebugStderr("table1d:data:after-persist-nested:" + spec.Name);
    }

    private DistributionData RequireOneDTableDistributionData(OneDTableData dataItem, string elementName)
    {
        DistributionData distribution = dataItem == null ? null : dataItem.GetDistribution();
        if (distribution == null)
        {
            throw new AscetReadException("data_item_not_found", "apply_element_spec", "Failed to resolve 1d table distribution data for element '" + elementName + "'.");
        }

        return distribution;
    }

    private ArrayData RequireOneDTableValueData(OneDTableData dataItem, string elementName)
    {
        ArrayData valueData = dataItem == null ? null : dataItem.GetValue();
        if (valueData == null)
        {
            throw new AscetReadException("data_item_not_found", "apply_element_spec", "Failed to resolve 1d table value data for element '" + elementName + "'.");
        }

        return valueData;
    }

    private void ApplyOneDTableDistributionData(DistributionData distribution, IList xValues, int expectedLength, string elementName)
    {
        ApplyArrayValues(distribution, xValues, expectedLength, elementName + ".xValues", "1d table");
    }

    private void ApplyOneDTableValueArray(ArrayData valueData, IList values, int expectedLength, string elementName)
    {
        ApplyArrayValues(valueData, values, expectedLength, elementName + ".values", "1d table");
    }

    private void PersistOneDTableNestedData(OneDTableData dataItem, DistributionData distribution, ArrayData valueData, string elementName)
    {
        if (!dataItem.SetDistribution(distribution))
        {
            throw new AscetReadException("set_data_failed", "apply_element_spec", "Failed to persist 1d table distribution data for element '" + elementName + "'.");
        }
        if (!dataItem.SetValue(valueData))
        {
            throw new AscetReadException("set_data_failed", "apply_element_spec", "Failed to persist 1d table values for element '" + elementName + "'.");
        }
    }

    private void ApplyTwoDTableData(TwoDTableData dataItem, AscetElementSpec spec)
    {
        if (dataItem == null)
        {
            throw new AscetReadException("data_item_not_found", "apply_element_spec", "Failed to resolve 2d table data item for element '" + spec.Name + "'.");
        }

        IList xValues = spec == null ? null : spec.XValues as IList;
        IList yValues = spec == null ? null : spec.YValues as IList;
        IList values = spec == null ? null : spec.Values as IList;
        if (xValues == null || yValues == null || values == null)
        {
            throw new AscetReadException("invalid_element_spec", "apply_element_spec", "2d table element '" + spec.Name + "' requires xValues, yValues, and values.");
        }

        int xSize = xValues.Count;
        int ySize = yValues.Count;

        // ä¸è°ƒç”¨ SetXSize/SetYSize - è¿™äº›è°ƒç”¨ä¼šå¯¼è‡´ COM å¯¹è±¡å¤±æ•ˆ
        // å¤§å°å·²ç»åœ¨åˆ›å»ºè¡¨æ—¶é€šè¿‡ SetMaxXSize/SetMaxYSize è®¾ç½®
        TableDebugStderr("table2d:data:before-set-xysize:" + spec.Name + ":x=" + xSize.ToString() + ":y=" + ySize.ToString());
        if (!dataItem.SetXSize(xSize))
        {
            throw new AscetReadException("set_data_failed", "apply_element_spec", "Failed to set x size for 2d table data '" + spec.Name + "'.");
        }

        if (!dataItem.SetYSize(ySize))
        {
            throw new AscetReadException("set_data_failed", "apply_element_spec", "Failed to set y size for 2d table data '" + spec.Name + "'.");
        }

        TableDebugStderr("table2d:data:after-set-xysize:" + spec.Name + ":x=" + xSize.ToString() + ":y=" + ySize.ToString());

        bool writeAxes = AscetElementSyncSpecRules.RequiresCustomTwoDTableAxisWrite(spec.XValues, spec.YValues);

        // ç«‹å³è®¾ç½®æ¨¡å¼: èŽ·å–-ä¿®æ”¹-ç«‹å³æŒä¹…åŒ–,é¿å… COM å¯¹è±¡ç”Ÿå‘½å‘¨æœŸé—®é¢˜
        if (writeAxes)
        {
            TableDebugStderr("table2d:data:before-get-xdist:" + spec.Name);
            DistributionData xDistribution = RequireTwoDTableXDistributionData(dataItem, spec.Name);
            TableDebugStderr("table2d:data:after-get-xdist:" + spec.Name + ":valid=" + (xDistribution != null).ToString());

            TableDebugStderr("table2d:data:before-apply-xdist:" + spec.Name);
            ApplyTwoDTableXDistributionData(xDistribution, xValues, xSize, spec.Name);
            TableDebugStderr("table2d:data:after-apply-xdist:" + spec.Name);

            TableDebugStderr("table2d:data:before-set-xdist:" + spec.Name);
            try
            {
                if (!dataItem.SetXDistribution(xDistribution))
                {
                    throw new AscetReadException("set_data_failed", "apply_element_spec", "Failed to persist 2d table x distribution for element '" + spec.Name + "'.");
                }
                TableDebugStderr("table2d:data:after-set-xdist:" + spec.Name + ":success=true");
            }
            catch (System.Runtime.InteropServices.COMException comEx)
            {
                throw new AscetReadException("com_interop_failed", "apply_element_spec", "COM error setting 2d table x distribution for element '" + spec.Name + "': HRESULT=" + comEx.ErrorCode.ToString("X8") + ", Message=" + comEx.Message, comEx);
            }

            TableDebugStderr("table2d:data:before-get-ydist:" + spec.Name);
            DistributionData yDistribution = RequireTwoDTableYDistributionData(dataItem, spec.Name);
            TableDebugStderr("table2d:data:after-get-ydist:" + spec.Name + ":valid=" + (yDistribution != null).ToString());

            TableDebugStderr("table2d:data:before-apply-ydist:" + spec.Name);
            ApplyTwoDTableYDistributionData(yDistribution, yValues, ySize, spec.Name);
            TableDebugStderr("table2d:data:after-apply-ydist:" + spec.Name);

            TableDebugStderr("table2d:data:before-set-ydist:" + spec.Name);
            try
            {
                if (!dataItem.SetYDistribution(yDistribution))
                {
                    throw new AscetReadException("set_data_failed", "apply_element_spec", "Failed to persist 2d table y distribution for element '" + spec.Name + "'.");
                }
                TableDebugStderr("table2d:data:after-set-ydist:" + spec.Name + ":success=true");
            }
            catch (System.Runtime.InteropServices.COMException comEx)
            {
                throw new AscetReadException("com_interop_failed", "apply_element_spec", "COM error setting 2d table y distribution for element '" + spec.Name + "': HRESULT=" + comEx.ErrorCode.ToString("X8") + ", Message=" + comEx.Message, comEx);
            }
        }

        TableDebugStderr("table2d:data:before-get-matrix:" + spec.Name);
        MatrixData matrix = RequireTwoDTableMatrixData(dataItem, spec.Name);
        TableDebugStderr("table2d:data:after-get-matrix:" + spec.Name + ":valid=" + (matrix != null).ToString());

        TableDebugStderr("table2d:data:before-apply-matrix:" + spec.Name);
        ApplyTwoDTableMatrixValueData(matrix, values, xSize, ySize, spec.Name);
        TableDebugStderr("table2d:data:after-apply-matrix:" + spec.Name);

        TableDebugStderr("table2d:data:before-set-matrix:" + spec.Name);
        try
        {
            if (!dataItem.SetValue(matrix))
            {
                throw new AscetReadException("set_data_failed", "apply_element_spec", "Failed to persist 2d table values for element '" + spec.Name + "'.");
            }
            TableDebugStderr("table2d:data:after-set-matrix:" + spec.Name + ":success=true");
        }
        catch (System.Runtime.InteropServices.COMException comEx)
        {
            throw new AscetReadException("com_interop_failed", "apply_element_spec", "COM error setting 2d table matrix for element '" + spec.Name + "': HRESULT=" + comEx.ErrorCode.ToString("X8") + ", Message=" + comEx.Message, comEx);
        }

        TableDebugStderr("table2d:data:persist-complete:" + spec.Name);
    }

    private DistributionData RequireTwoDTableXDistributionData(TwoDTableData dataItem, string elementName)
    {
        DistributionData xDistribution = dataItem == null ? null : dataItem.GetXDistribution();
        if (xDistribution == null)
        {
            throw new AscetReadException("data_item_not_found", "apply_element_spec", "Failed to resolve 2d table x distribution for element '" + elementName + "'.");
        }

        return xDistribution;
    }

    private DistributionData RequireTwoDTableYDistributionData(TwoDTableData dataItem, string elementName)
    {
        DistributionData yDistribution = dataItem == null ? null : dataItem.GetYDistribution();
        if (yDistribution == null)
        {
            throw new AscetReadException("data_item_not_found", "apply_element_spec", "Failed to resolve 2d table y distribution for element '" + elementName + "'.");
        }

        return yDistribution;
    }

    private MatrixData RequireTwoDTableMatrixData(TwoDTableData dataItem, string elementName)
    {
        MatrixData matrix = dataItem == null ? null : dataItem.GetValue();
        if (matrix == null)
        {
            throw new AscetReadException("data_item_not_found", "apply_element_spec", "Failed to resolve 2d table matrix data for element '" + elementName + "'.");
        }

        return matrix;
    }

    private void ApplyTwoDTableXDistributionData(DistributionData xDistribution, IList xValues, int xSize, string elementName)
    {
        ApplyArrayValuesWithoutResizing(xDistribution, xValues, xSize, elementName + ".xValues", "2d table");
    }

    private void ApplyTwoDTableYDistributionData(DistributionData yDistribution, IList yValues, int ySize, string elementName)
    {
        ApplyArrayValuesWithoutResizing(yDistribution, yValues, ySize, elementName + ".yValues", "2d table");
    }

    private void ApplyTwoDTableMatrixValueData(MatrixData matrix, IList values, int xSize, int ySize, string elementName)
    {
        ApplyMatrixValues(matrix, values, xSize, ySize, elementName + ".values");
    }

    private void PersistTwoDTableNestedData(TwoDTableData dataItem, DistributionData xDistribution, DistributionData yDistribution, MatrixData matrix, string elementName, bool persistAxes)
    {
        if (persistAxes)
        {
            if (!dataItem.SetXDistribution(xDistribution))
            {
                throw new AscetReadException("set_data_failed", "apply_element_spec", "Failed to persist 2d table x distribution for element '" + elementName + "'.");
            }
            if (!dataItem.SetYDistribution(yDistribution))
            {
                throw new AscetReadException("set_data_failed", "apply_element_spec", "Failed to persist 2d table y distribution for element '" + elementName + "'.");
            }
        }
        if (!dataItem.SetValue(matrix))
        {
            throw new AscetReadException("set_data_failed", "apply_element_spec", "Failed to persist 2d table values for element '" + elementName + "'.");
        }
    }

    private void ApplyArrayValues(ArrayData dataItem, IList values, int expectedLength, string elementName, string elementKind)
    {
        if (expectedLength != values.Count)
        {
            throw new AscetReadException("invalid_element_spec", "apply_element_spec", elementKind + " '" + elementName + "' data length '" + values.Count.ToString() + "' does not match declared length '" + expectedLength.ToString() + "'.");
        }

        if (String.Equals(Environment.GetEnvironmentVariable("ASCET_TABLE_FORCE_MAXSIZE"), "1", StringComparison.Ordinal))
        {
            InvokeOptionalBooleanMethod(dataItem, "SetMaxSize", new object[] { expectedLength });
        }

        InvokeRequiredBooleanMethod(dataItem, "SetSize", new object[] { expectedLength }, "set_data_failed", "Failed to set array size for element '" + elementName + "'.");
        if (ContainsBoolean(values))
        {
            InvokeRequiredBooleanMethod(dataItem, "SetBooleanValue", new object[] { ToBooleanArray(values) }, "set_data_failed", "Failed to set boolean array value for element '" + elementName + "'.");
            return;
        }

        if (ContainsString(values))
        {
            throw new AscetReadException("invalid_element_spec", "apply_element_spec", elementKind + " '" + elementName + "' does not support string array values.");
        }

        if (AllWholeNumbers(values))
        {
            long[] longValues = ToLongArray(values);
            if (FitsInt32(longValues))
            {
                InvokeRequiredBooleanMethod(dataItem, "SetIntegerValue", new object[] { ToIntArray(longValues) }, "set_data_failed", "Failed to set integer array value for element '" + elementName + "'.");
                return;
            }

            InvokeRequiredBooleanMethod(dataItem, "SetLongValue", new object[] { longValues }, "set_data_failed", "Failed to set long array value for element '" + elementName + "'.");
            return;
        }

        InvokeRequiredBooleanMethod(dataItem, "SetDoubleValue", new object[] { ToDoubleArray(values) }, "set_data_failed", "Failed to set double array value for element '" + elementName + "'.");
    }

    private void ApplyArrayValuesWithoutResizing(ArrayData dataItem, IList values, int expectedLength, string elementName, string elementKind)
    {
        if (expectedLength != values.Count)
        {
            throw new AscetReadException("invalid_element_spec", "apply_element_spec", elementKind + " '" + elementName + "' data length '" + values.Count.ToString() + "' does not match expected length '" + expectedLength.ToString() + "'.");
        }

        if (ContainsBoolean(values))
        {
            TableDebugStderr("table2d:axis:before-set-bool:" + elementName);
            InvokeRequiredBooleanMethod(dataItem, "SetBooleanValue", new object[] { ToBooleanArray(values) }, "set_data_failed", "Failed to set boolean array value for element '" + elementName + "'.");
            TableDebugStderr("table2d:axis:after-set-bool:" + elementName);
            return;
        }

        if (ContainsString(values))
        {
            throw new AscetReadException("invalid_element_spec", "apply_element_spec", elementKind + " '" + elementName + "' does not support string array values.");
        }

        if (AllWholeNumbers(values))
        {
            long[] longValues = ToLongArray(values);
            if (FitsInt32(longValues))
            {
                TableDebugStderr("table2d:axis:before-set-int:" + elementName);
                InvokeRequiredBooleanMethod(dataItem, "SetIntegerValue", new object[] { ToIntArray(longValues) }, "set_data_failed", "Failed to set integer array value for element '" + elementName + "'.");
                TableDebugStderr("table2d:axis:after-set-int:" + elementName);
                return;
            }

            TableDebugStderr("table2d:axis:before-set-long:" + elementName);
            InvokeRequiredBooleanMethod(dataItem, "SetLongValue", new object[] { longValues }, "set_data_failed", "Failed to set long array value for element '" + elementName + "'.");
            TableDebugStderr("table2d:axis:after-set-long:" + elementName);
            return;
        }

        TableDebugStderr("table2d:axis:before-set-double:" + elementName);
        InvokeRequiredBooleanMethod(dataItem, "SetDoubleValue", new object[] { ToDoubleArray(values) }, "set_data_failed", "Failed to set double array value for element '" + elementName + "'.");
        TableDebugStderr("table2d:axis:after-set-double:" + elementName);
    }

    private void ApplyMatrixValues(MatrixData dataItem, IList values, int expectedXSize, int expectedYSize, string elementName)
    {
        if (values.Count != expectedXSize)
        {
            throw new AscetReadException("invalid_element_spec", "apply_element_spec", "2d table '" + elementName + "' row count '" + values.Count.ToString() + "' does not match expected x size '" + expectedXSize.ToString() + "'.");
        }

        if (ContainsNestedBoolean(values))
        {
            InvokeRequiredBooleanMethod(dataItem, "SetBooleanValue", new object[] { ToBooleanMatrix(values, expectedYSize, elementName) }, "set_data_failed", "Failed to set boolean matrix value for element '" + elementName + "'.");
            return;
        }

        if (ContainsNestedWholeNumbers(values))
        {
            long[][] longValues = ToLongMatrix(values, expectedYSize, elementName);
            if (FitsInt32(longValues))
            {
                InvokeRequiredBooleanMethod(dataItem, "SetIntegerValue", new object[] { ToIntMatrix(longValues) }, "set_data_failed", "Failed to set integer matrix value for element '" + elementName + "'.");
                return;
            }

            InvokeRequiredBooleanMethod(dataItem, "SetLongValue", new object[] { longValues }, "set_data_failed", "Failed to set long matrix value for element '" + elementName + "'.");
            return;
        }

        InvokeRequiredBooleanMethod(dataItem, "SetDoubleValue", new object[] { ToDoubleMatrix(values, expectedYSize, elementName) }, "set_data_failed", "Failed to set double matrix value for element '" + elementName + "'.");
    }

    private void ApplyExplicitImplementation(PrimitiveModelElement element, ImplConfiguration defaultImplementation, ImplConfiguration classImplementation, AscetElementSpec spec)
    {
        if (spec == null || !AscetElementSyncSpecRules.RequiresImplementation(spec))
        {
            return;
        }

        ImplConfiguration targetImplementation = ResolveImplementationConfigurationForElement(element, spec, defaultImplementation, classImplementation);
        ImplItem item = element == null ? null : element.GetImplementation();
        if (item == null)
        {
            item = targetImplementation == null ? null : targetImplementation.GetItem(element);
        }

        if (item == null)
        {
            throw new AscetReadException("implementation_item_not_found", "apply_element_spec", "Failed to resolve implementation item for element '" + spec.Name + "'.");
        }

        AscetElementImplSpec implSpec = spec.Impl;
        if (implSpec != null && !String.IsNullOrWhiteSpace(implSpec.MemoryLocation) && !item.SetMemoryLocation(implSpec.MemoryLocation))
        {
            throw new AscetReadException("set_implementation_failed", "apply_element_spec", "Failed to set memoryLocation for element '" + spec.Name + "'.");
        }

        BoolImpl boolImpl = item as BoolImpl;
        if (boolImpl != null)
        {
            if (spec.PhysicalRange != null || (implSpec != null && (implSpec.ImplementationRange != null || !String.IsNullOrWhiteSpace(implSpec.Formula) || implSpec.LimitAssignments.HasValue)))
            {
                throw new AscetReadException("invalid_element_spec", "apply_element_spec", "Element '" + spec.Name + "' does not support physicalRange, impl.implementationRange, impl.formula, or impl.limitAssignments on bool implementation.");
            }

            if (implSpec != null && !String.IsNullOrWhiteSpace(implSpec.ValueType) && !boolImpl.SetImplType(implSpec.ValueType))
            {
                throw new AscetReadException("set_implementation_failed", "apply_element_spec", "Failed to set impl.valueType for element '" + spec.Name + "'.");
            }
            return;
        }

        ScalarImpl scalarImpl = item as ScalarImpl;
        if (scalarImpl != null)
        {
            ImplInfo info = scalarImpl.GetImplInfoForValue();
            if (info == null)
            {
                throw new AscetReadException("set_implementation_failed", "apply_element_spec", "Failed to resolve impl info for element '" + spec.Name + "'.");
            }

            if (ShouldStageImplTypeBeforeLimitAssignment(spec))
            {
                ApplyScalarImplType(info, spec);
                info = PersistAndReloadScalarImplementation(targetImplementation, ref item, ref scalarImpl, element, info, spec.Name);
            }

            ApplyScalarImplementationInfo(info, spec, ShouldStageImplTypeBeforeLimitAssignment(spec));
            PersistAndReloadScalarImplementation(targetImplementation, ref item, ref scalarImpl, element, info, spec.Name);
            return;
        }

        throw new AscetReadException("set_implementation_failed", "apply_element_spec", "Element '" + spec.Name + "' does not expose a scalar/bool implementation item for 'impl.valueType'.");
    }

    private ImplConfiguration ResolveImplementationConfigurationForElement(PrimitiveModelElement element, AscetElementSpec spec, ImplConfiguration defaultImplementation, ImplConfiguration classImplementation)
    {
        bool exported = String.Equals(spec == null ? null : spec.Scope, "exported", StringComparison.OrdinalIgnoreCase) ||
                        SafeGetBool(element, "IsExported");
        ImplConfiguration preferred = exported ? classImplementation : defaultImplementation;
        ImplConfiguration fallback = exported ? defaultImplementation : classImplementation;
        return preferred ?? fallback;
    }

    private void PersistImplementationItem(ImplConfiguration defaultImplementation, ImplItem item, PrimitiveModelElement element, string elementName)
    {
        if (defaultImplementation == null || item == null || element == null)
        {
            return;
        }

        if (!defaultImplementation.SetItem(item, element))
        {
            throw new AscetReadException("set_implementation_failed", "apply_element_spec", "Failed to persist implementation item for element '" + (elementName ?? String.Empty) + "'.");
        }
    }

    private ImplInfo PersistAndReloadScalarImplementation(ImplConfiguration defaultImplementation, ref ImplItem item, ref ScalarImpl scalarImpl, PrimitiveModelElement element, ImplInfo info, string elementName)
    {
        if (scalarImpl == null || info == null)
        {
            throw new AscetReadException("set_implementation_failed", "apply_element_spec", "Failed to resolve impl info for element '" + (elementName ?? String.Empty) + "'.");
        }

        if (!scalarImpl.SetImplInfoForValue(info))
        {
            throw new AscetReadException("set_implementation_failed", "apply_element_spec", "Failed to persist impl info for element '" + (elementName ?? String.Empty) + "'.");
        }

        PersistImplementationItem(defaultImplementation, item, element, elementName);

        if (defaultImplementation != null && element != null)
        {
            ImplItem refreshedItem = defaultImplementation.GetItem(element);
            ScalarImpl refreshedScalar = refreshedItem as ScalarImpl;
            if (refreshedScalar != null)
            {
                item = refreshedItem;
                scalarImpl = refreshedScalar;
            }
        }

        ImplInfo refreshedInfo = scalarImpl.GetImplInfoForValue();
        if (refreshedInfo == null)
        {
            throw new AscetReadException("set_implementation_failed", "apply_element_spec", "Failed to reload impl info for element '" + (elementName ?? String.Empty) + "'.");
        }

        return refreshedInfo;
    }

    private bool ShouldStageImplTypeBeforeLimitAssignment(AscetElementSpec spec)
    {
        return spec != null &&
               spec.Impl != null &&
               !String.IsNullOrWhiteSpace(spec.Impl.ValueType) &&
               (spec.Impl.LimitAssignments.HasValue ||
                AscetElementSyncSpecRules.RequiresParameterLimitAssignment(spec));
    }

    private void ApplyScalarImplType(ImplInfo info, AscetElementSpec spec)
    {
        AscetElementImplSpec implSpec = spec == null ? null : spec.Impl;
        if (info != null && implSpec != null && !String.IsNullOrWhiteSpace(implSpec.ValueType))
        {
            InvokeRequiredBooleanMethod(info, "SetImplType", new object[] { implSpec.ValueType }, "set_implementation_failed", "Failed to set impl.valueType for element '" + spec.Name + "'.");
        }
    }

    private void ApplyScalarImplementationInfo(ImplInfo info, AscetElementSpec spec, bool skipValueType)
    {
        if (info == null || spec == null)
        {
            return;
        }

        AscetElementImplSpec implSpec = spec.Impl;
        if (!skipValueType)
        {
            ApplyScalarImplType(info, spec);
        }

        if (implSpec != null && !String.IsNullOrWhiteSpace(implSpec.Formula))
        {
            InvokeRequiredMethodAnySignature(info, new[] { "SetFormulaName", "SetFormula" }, implSpec.Formula, "set_implementation_failed", "Failed to set impl.formula for element '" + spec.Name + "'.");
        }

        bool parameterNeedsLimitAssignment = AscetElementSyncSpecRules.RequiresParameterLimitAssignment(spec);
        if (parameterNeedsLimitAssignment)
        {
            if (implSpec != null && implSpec.LimitAssignments.HasValue && !implSpec.LimitAssignments.Value)
            {
                throw new AscetReadException("invalid_element_spec", "apply_element_spec", "Parameter element '" + spec.Name + "' must use impl.limitAssignments=true when writing physicalRange or impl.implementationRange.");
            }

            TryInvokeSingleArgumentBooleanMethod(info, new[] { "SetOptionLimitAssignment" }, true);
        }

        RangeValueKind physicalRangeKind = ResolvePhysicalRangeValueKind(spec, info);
        RangeValueKind implementationRangeKind = ResolveImplementationRangeValueKind(spec, info);
        ApplyRange(info, spec.Name, implementationRangeKind, false, implSpec == null ? null : implSpec.ImplementationRange);
        if (spec.PhysicalRange != null)
        {
            InvokeRequiredMethodAnySignature(info, new[] { "SetMasterModel" }, true, "set_implementation_failed", "Failed to set model master for physicalRange of element '" + spec.Name + "'.");
        }
        ApplyRange(info, spec.Name, physicalRangeKind, true, spec.PhysicalRange);

        if (implSpec != null && implSpec.LimitAssignments.HasValue && !(parameterNeedsLimitAssignment && implSpec.LimitAssignments.Value))
        {
            InvokeRequiredMethodAnySignature(info, new[] { "SetOptionLimitAssignment" }, implSpec.LimitAssignments.Value, "set_implementation_failed", "Failed to set impl.limitAssignments for element '" + spec.Name + "'.");
        }
    }

    private void ApplyRange(ImplInfo info, string elementName, RangeValueKind kind, bool physicalRange, AscetElementRangeSpec requestedRange)
    {
        if (info == null || requestedRange == null)
        {
            return;
        }

        string getterName = GetRangeAccessorName(kind, physicalRange, false);
        string setterName = GetRangeAccessorName(kind, physicalRange, true);
        Array current = InvokeOptional(info, getterName) as Array;
        object minValue = requestedRange.Min ?? GetRangeArrayValue(current, 0, kind);
        object maxValue = requestedRange.Max ?? GetRangeArrayValue(current, 1, kind);
        if (minValue == null || maxValue == null)
        {
            throw new AscetReadException("set_implementation_failed", "apply_element_spec", "Failed to resolve complete range values for element '" + elementName + "'.");
        }

        InvokeRequiredRangeSetter(info, setterName, kind, minValue, maxValue, "set_implementation_failed", "Failed to set " + (physicalRange ? "physicalRange" : "impl.implementationRange") + " for element '" + elementName + "'.");
        if (kind == RangeValueKind.Double && CanMirrorRangeAsInteger(minValue, maxValue))
        {
            InvokeRequiredRangeSetter(info, GetRangeAccessorName(RangeValueKind.Integer, physicalRange, true), RangeValueKind.Integer, minValue, maxValue, "set_implementation_failed", "Failed to set integer fallback " + (physicalRange ? "physicalRange" : "impl.implementationRange") + " for element '" + elementName + "'.");
        }
    }

    private RangeValueKind ResolvePhysicalRangeValueKind(AscetElementSpec spec, ImplInfo info)
    {
        string normalizedModel = spec == null || spec.ModelType == null ? String.Empty : spec.ModelType.Trim().ToLowerInvariant();
        if (normalizedModel == "cont")
        {
            return RangeValueKind.Double;
        }

        return ResolveImplementationRangeValueKind(spec, info);
    }

    private RangeValueKind ResolveImplementationRangeValueKind(AscetElementSpec spec, ImplInfo info)
    {
        string implType = spec != null && spec.Impl != null && !String.IsNullOrWhiteSpace(spec.Impl.ValueType)
            ? spec.Impl.ValueType
            : SafeGetString(info, "GetImplType");
        string normalizedImpl = implType == null ? String.Empty : implType.Trim().ToLowerInvariant();

        if (normalizedImpl.IndexOf("real32", StringComparison.Ordinal) >= 0 || normalizedImpl.IndexOf("float32", StringComparison.Ordinal) >= 0)
        {
            return RangeValueKind.Float;
        }

        if (normalizedImpl.IndexOf("real64", StringComparison.Ordinal) >= 0 || normalizedImpl.IndexOf("double", StringComparison.Ordinal) >= 0)
        {
            return RangeValueKind.Double;
        }

        if (normalizedImpl.IndexOf("64", StringComparison.Ordinal) >= 0)
        {
            return RangeValueKind.Long;
        }

        return RangeValueKind.Integer;
    }

    private string GetRangeAccessorName(RangeValueKind kind, bool physicalRange, bool setter)
    {
        string prefix = setter ? "Set" : "Get";
        string suffix = physicalRange ? "PhysicalRange" : "ImplRange";
        switch (kind)
        {
            case RangeValueKind.Double:
                return prefix + "Double" + suffix;
            case RangeValueKind.Float:
                return prefix + "Float" + suffix;
            case RangeValueKind.Long:
                return prefix + "Long" + suffix;
            default:
                return prefix + "Integer" + suffix;
        }
    }

    private object GetRangeArrayValue(Array current, int index, RangeValueKind kind)
    {
        if (current == null || current.Length <= index)
        {
            return null;
        }

        return ConvertRangeValue(current.GetValue(index), kind);
    }

    private object ConvertRangeValue(object value, RangeValueKind kind)
    {
        if (value == null)
        {
            return null;
        }

        string text = Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture);
        switch (kind)
        {
            case RangeValueKind.Double:
                return AscetElementSyncSpecRules.ParseDoubleValue(text);
            case RangeValueKind.Float:
                return Convert.ToSingle(AscetElementSyncSpecRules.ParseDoubleValue(text), System.Globalization.CultureInfo.InvariantCulture);
            case RangeValueKind.Long:
                return Convert.ToInt64(Math.Round(AscetElementSyncSpecRules.ParseDoubleValue(text)), System.Globalization.CultureInfo.InvariantCulture);
            default:
                return Convert.ToInt32(Math.Round(AscetElementSyncSpecRules.ParseDoubleValue(text)), System.Globalization.CultureInfo.InvariantCulture);
        }
    }

    private void InvokeRequiredMethodAnySignature(object target, string[] methodNames, object value, string code, string failureMessage)
    {
        if (target == null || methodNames == null)
        {
            throw new AscetReadException(code, "apply_element_spec", failureMessage);
        }

        for (int i = 0; i < methodNames.Length; i++)
        {
            MethodInfo method = target.GetType().GetMethod(methodNames[i], BindingFlags.Instance | BindingFlags.Public);
            if (method == null)
            {
                continue;
            }

            ParameterInfo[] parameters = method.GetParameters();
            if (parameters.Length != 1)
            {
                continue;
            }

            object argument = ConvertMethodArgument(value, parameters[0].ParameterType);
            object result = method.Invoke(target, new object[] { argument });
            if (method.ReturnType == typeof(bool) && result != null && !Convert.ToBoolean(result))
            {
                throw new AscetReadException(code, "apply_element_spec", failureMessage);
            }
            return;
        }

        throw new AscetReadException(code, "apply_element_spec", failureMessage);
    }

    private bool TryInvokeSingleArgumentBooleanMethod(object target, string[] methodNames, object value)
    {
        if (target == null || methodNames == null)
        {
            return false;
        }

        for (int i = 0; i < methodNames.Length; i++)
        {
            MethodInfo method = target.GetType().GetMethod(methodNames[i], BindingFlags.Instance | BindingFlags.Public);
            if (method == null || method.ReturnType != typeof(bool))
            {
                continue;
            }

            ParameterInfo[] parameters = method.GetParameters();
            if (parameters.Length != 1)
            {
                continue;
            }

            object argument = ConvertMethodArgument(value, parameters[0].ParameterType);
            object result = method.Invoke(target, new object[] { argument });
            return result != null && Convert.ToBoolean(result);
        }

        return false;
    }

    private object ConvertMethodArgument(object value, Type parameterType)
    {
        if (parameterType == typeof(string))
        {
            return Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture);
        }

        if (parameterType == typeof(bool))
        {
            return Convert.ToBoolean(value, System.Globalization.CultureInfo.InvariantCulture);
        }

        if (parameterType == typeof(double))
        {
            return ConvertNumericMethodArgument(value);
        }

        if (parameterType == typeof(float))
        {
            return Convert.ToSingle(ConvertNumericMethodArgument(value), System.Globalization.CultureInfo.InvariantCulture);
        }

        if (parameterType == typeof(long))
        {
            return Convert.ToInt64(Math.Round(ConvertNumericMethodArgument(value)), System.Globalization.CultureInfo.InvariantCulture);
        }

        if (parameterType == typeof(int))
        {
            return Convert.ToInt32(Math.Round(ConvertNumericMethodArgument(value)), System.Globalization.CultureInfo.InvariantCulture);
        }

        return value;
    }

    private double ConvertNumericMethodArgument(object value)
    {
        if (value is string)
        {
            return AscetElementSyncSpecRules.ParseDoubleValue((string)value);
        }

        return Convert.ToDouble(value, System.Globalization.CultureInfo.InvariantCulture);
    }

    private bool CanMirrorRangeAsInteger(object minValue, object maxValue)
    {
        return CanMirrorRangeValueAsInteger(minValue) && CanMirrorRangeValueAsInteger(maxValue);
    }

    private bool CanMirrorRangeValueAsInteger(object value)
    {
        if (value == null)
        {
            return false;
        }

        try
        {
            double numeric = Convert.ToDouble(value, System.Globalization.CultureInfo.InvariantCulture);
            return !Double.IsNaN(numeric) &&
                   !Double.IsInfinity(numeric) &&
                   numeric >= Int32.MinValue &&
                   numeric <= Int32.MaxValue &&
                   Math.Abs(numeric - Math.Round(numeric)) <= 0.000001d;
        }
        catch
        {
            return false;
        }
    }

    private void InvokeRequiredRangeSetter(object target, string methodName, RangeValueKind kind, object minValue, object maxValue, string code, string failureMessage)
    {
        if (target == null)
        {
            throw new AscetReadException(code, "apply_element_spec", failureMessage);
        }

        MethodInfo method = target.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
        if (method == null)
        {
            throw new AscetReadException(code, "apply_element_spec", failureMessage);
        }

        ParameterInfo[] parameters = method.GetParameters();
        object result;
        if (parameters.Length == 2)
        {
            result = method.Invoke(target, new object[] {
                ConvertMethodArgument(minValue, parameters[0].ParameterType),
                ConvertMethodArgument(maxValue, parameters[1].ParameterType)
            });
        }
        else if (parameters.Length == 1 && parameters[0].ParameterType.IsArray)
        {
            Type elementType = parameters[0].ParameterType.GetElementType();
            Array values = Array.CreateInstance(elementType, 2);
            values.SetValue(ConvertMethodArgument(minValue, elementType), 0);
            values.SetValue(ConvertMethodArgument(maxValue, elementType), 1);
            result = method.Invoke(target, new object[] { values });
        }
        else
        {
            throw new AscetReadException(code, "apply_element_spec", failureMessage);
        }

        if (method.ReturnType == typeof(bool) && result != null && !Convert.ToBoolean(result))
        {
            throw new AscetReadException(code, "apply_element_spec", failureMessage);
        }
    }

    private string ReadRange(ImplInfo info, bool physicalRange, string modelType, string valueType)
    {
        if (info == null)
        {
            return String.Empty;
        }

        RangeValueKind preferredKind = ResolveReadRangeValueKind(physicalRange, modelType, valueType);
        string preferredValue = FormatRangeValue(InvokeOptional(info, GetRangeAccessorName(preferredKind, physicalRange, false)));
        if (!String.IsNullOrWhiteSpace(preferredValue) && !IsAllInfinityBounds(preferredValue))
        {
            return preferredValue;
        }

        return ReadFirstNonEmptyRange(info, physicalRange, preferredKind);
    }

    private string ReadFirstNonEmptyRange(ImplInfo info, bool physicalRange, RangeValueKind preferredKind)
    {
        string[] getters = physicalRange
            ? new[] { "GetDoublePhysicalRange", "GetFloatPhysicalRange", "GetLongPhysicalRange", "GetIntegerPhysicalRange" }
            : new[] { "GetDoubleImplRange", "GetFloatImplRange", "GetLongImplRange", "GetIntegerImplRange" };

        for (int i = 0; i < getters.Length; i++)
        {
            if (String.Equals(getters[i], GetRangeAccessorName(preferredKind, physicalRange, false), StringComparison.Ordinal))
            {
                continue;
            }

            string value = FormatRangeValue(InvokeOptional(info, getters[i]));
            if (!String.IsNullOrWhiteSpace(value) && !IsAllInfinityBounds(value))
            {
                return value;
            }
        }

        return String.Empty;
    }

    private RangeValueKind ResolveReadRangeValueKind(bool physicalRange, string modelType, string valueType)
    {
        string normalizedModel = modelType == null ? String.Empty : modelType.Trim().ToLowerInvariant();
        if (physicalRange && normalizedModel == "cont")
        {
            return RangeValueKind.Double;
        }

        string normalizedValueType = valueType == null ? String.Empty : valueType.Trim().ToLowerInvariant();
        if (normalizedValueType.IndexOf("real32", StringComparison.Ordinal) >= 0 ||
            normalizedValueType.IndexOf("float32", StringComparison.Ordinal) >= 0)
        {
            return RangeValueKind.Float;
        }

        if (normalizedValueType.IndexOf("real64", StringComparison.Ordinal) >= 0 ||
            normalizedValueType.IndexOf("double", StringComparison.Ordinal) >= 0)
        {
            return RangeValueKind.Double;
        }

        if (normalizedValueType.IndexOf("64", StringComparison.Ordinal) >= 0)
        {
            return RangeValueKind.Long;
        }

        return RangeValueKind.Integer;
    }

    private bool ContainsBoolean(IList values)
    {
        for (int i = 0; i < values.Count; i++)
        {
            if (values[i] is bool)
            {
                return true;
            }
        }
        return false;
    }

    private bool ContainsNestedBoolean(IList values)
    {
        for (int i = 0; i < values.Count; i++)
        {
            IList row = values[i] as IList;
            if (row == null || values[i] is string)
            {
                return false;
            }

            if (ContainsBoolean(row))
            {
                return true;
            }
        }
        return false;
    }

    private bool ContainsString(IList values)
    {
        for (int i = 0; i < values.Count; i++)
        {
            if (values[i] is string)
            {
                return true;
            }
        }
        return false;
    }

    private bool ContainsNestedWholeNumbers(IList values)
    {
        for (int i = 0; i < values.Count; i++)
        {
            IList row = values[i] as IList;
            if (row == null || values[i] is string)
            {
                return false;
            }

            if (!AllWholeNumbers(row))
            {
                return false;
            }
        }
        return true;
    }

    private bool AllWholeNumbers(IList values)
    {
        for (int i = 0; i < values.Count; i++)
        {
            if (!IsWholeNumber(values[i]))
            {
                return false;
            }
        }
        return true;
    }

    private bool IsWholeNumber(object value)
    {
        if (value == null || value is bool || value is string)
        {
            return false;
        }

        try
        {
            double raw = Convert.ToDouble(value);
            return Math.Abs(raw - Math.Round(raw)) <= 0.0000001d;
        }
        catch
        {
            return false;
        }
    }

    private bool[] ToBooleanArray(IList values)
    {
        bool[] result = new bool[values.Count];
        for (int i = 0; i < values.Count; i++)
        {
            result[i] = Convert.ToBoolean(values[i]);
        }
        return result;
    }

    private bool[][] ToBooleanMatrix(IList values, int expectedYSize, string elementName)
    {
        bool[][] result = new bool[values.Count][];
        for (int i = 0; i < values.Count; i++)
        {
            IList row = RequireMatrixRow(values[i], expectedYSize, elementName);
            result[i] = ToBooleanArray(row);
        }
        return result;
    }

    private long[] ToLongArray(IList values)
    {
        long[] result = new long[values.Count];
        for (int i = 0; i < values.Count; i++)
        {
            result[i] = Convert.ToInt64(Math.Round(Convert.ToDouble(values[i])));
        }
        return result;
    }

    private long[][] ToLongMatrix(IList values, int expectedYSize, string elementName)
    {
        long[][] result = new long[values.Count][];
        for (int i = 0; i < values.Count; i++)
        {
            IList row = RequireMatrixRow(values[i], expectedYSize, elementName);
            result[i] = ToLongArray(row);
        }
        return result;
    }

    private int[] ToIntArray(long[] values)
    {
        int[] result = new int[values.Length];
        for (int i = 0; i < values.Length; i++)
        {
            result[i] = Convert.ToInt32(values[i]);
        }
        return result;
    }

    private int[][] ToIntMatrix(long[][] values)
    {
        int[][] result = new int[values.Length][];
        for (int i = 0; i < values.Length; i++)
        {
            result[i] = ToIntArray(values[i]);
        }
        return result;
    }

    private bool FitsInt32(long[] values)
    {
        for (int i = 0; i < values.Length; i++)
        {
            if (values[i] < Int32.MinValue || values[i] > Int32.MaxValue)
            {
                return false;
            }
        }
        return true;
    }

    private bool FitsInt32(long[][] values)
    {
        for (int i = 0; i < values.Length; i++)
        {
            if (!FitsInt32(values[i]))
            {
                return false;
            }
        }
        return true;
    }

    private double[] ToDoubleArray(IList values)
    {
        double[] result = new double[values.Count];
        for (int i = 0; i < values.Count; i++)
        {
            result[i] = Convert.ToDouble(values[i]);
        }
        return result;
    }

    private double[][] ToDoubleMatrix(IList values, int expectedYSize, string elementName)
    {
        double[][] result = new double[values.Count][];
        for (int i = 0; i < values.Count; i++)
        {
            IList row = RequireMatrixRow(values[i], expectedYSize, elementName);
            result[i] = ToDoubleArray(row);
        }
        return result;
    }

    private IList RequireMatrixRow(object value, int expectedYSize, string elementName)
    {
        IList row = value as IList;
        if (row == null || value is string)
        {
            throw new AscetReadException("invalid_element_spec", "apply_element_spec", "2d table '" + elementName + "' requires matrix rows.");
        }

        if (row.Count != expectedYSize)
        {
            throw new AscetReadException("invalid_element_spec", "apply_element_spec", "2d table '" + elementName + "' row length '" + row.Count.ToString() + "' does not match expected y size '" + expectedYSize.ToString() + "'.");
        }

        return row;
    }

    private void InvokeOptionalSetter(object target, string methodName, string value, bool requiredMethod, string code, string failureMessage)
    {
        if (target == null || String.IsNullOrWhiteSpace(value))
        {
            return;
        }

        MethodInfo method = target.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
        if (method == null)
        {
            if (requiredMethod)
            {
                throw new AscetReadException(code, "apply_element_spec", failureMessage);
            }
            return;
        }

        object result = method.Invoke(target, new object[] { value });
        if (method.ReturnType == typeof(bool) && result != null && !Convert.ToBoolean(result))
        {
            throw new AscetReadException(code, "apply_element_spec", failureMessage);
        }
    }

    private void InvokeRequiredBooleanMethod(object target, string methodName, object[] args, string code, string failureMessage)
    {
        if (target == null)
        {
            throw new AscetReadException(code, "apply_element_spec", failureMessage);
        }

        MethodInfo method = target.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
        if (method == null)
        {
            throw new AscetReadException(code, "apply_element_spec", failureMessage);
        }

        object result = method.Invoke(target, args);
        if (method.ReturnType == typeof(bool) && result != null && !Convert.ToBoolean(result))
        {
            throw new AscetReadException(code, "apply_element_spec", failureMessage);
        }
    }

    private void InvokeOptionalBooleanMethod(object target, string methodName, object[] args)
    {
        if (target == null)
        {
            return;
        }

        try
        {
            MethodInfo method = target.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
            if (method == null)
            {
                return;
            }

            object result = method.Invoke(target, args);
            if (method.ReturnType == typeof(bool) && result != null)
            {
                Convert.ToBoolean(result);
            }
        }
        catch
        {
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
            values.Add(entry == null ? String.Empty : Convert.ToString(entry, System.Globalization.CultureInfo.InvariantCulture));
        }

        return "[" + String.Join(", ", values.ToArray()) + "]";
    }

    private bool IsAllInfinityBounds(string rangeValue)
    {
        if (String.IsNullOrWhiteSpace(rangeValue))
        {
            return false;
        }

        string trimmed = rangeValue.Trim();
        if (!trimmed.StartsWith("[") || !trimmed.EndsWith("]"))
        {
            return false;
        }

        string inner = trimmed.Substring(1, trimmed.Length - 2);
        string[] parts = inner.Split(',');
        for (int i = 0; i < parts.Length; i++)
        {
            string part = parts[i].Trim();
            if (!String.Equals(part, "Infinity", StringComparison.OrdinalIgnoreCase) &&
                !String.Equals(part, "-Infinity", StringComparison.OrdinalIgnoreCase) &&
                !String.Equals(part, "+Infinity", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }
        }

        return true;
    }

    private bool? SafeGetNullableBool(object target, string methodName)
    {
        try
        {
            if (target == null)
            {
                return null;
            }

            MethodInfo method = target.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
            if (method == null)
            {
                return null;
            }

            object value = method.Invoke(target, null);
            if (value == null)
            {
                return null;
            }

            return Convert.ToBoolean(value, System.Globalization.CultureInfo.InvariantCulture);
        }
        catch
        {
            return null;
        }
    }

    private string SafeGetString(object target, string methodName)
    {
        try
        {
            if (target == null)
            {
                return null;
            }

            MethodInfo method = target.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
            if (method == null)
            {
                return null;
            }

            object value = method.Invoke(target, null);
            return value == null ? null : Convert.ToString(value);
        }
        catch
        {
            return null;
        }
    }

    private bool SafeGetBool(object target, string methodName)
    {
        try
        {
            if (target == null)
            {
                return false;
            }

            MethodInfo method = target.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
            if (method == null)
            {
                return false;
            }

            object value = method.Invoke(target, null);
            return value != null && Convert.ToBoolean(value);
        }
        catch
        {
            return false;
        }
    }

    private object InvokeOptional(object target, string methodName)
    {
        try
        {
            if (target == null)
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
        catch
        {
            return null;
        }
    }

    private bool TryParseRangeString(string value, out double minValue, out double maxValue)
    {
        minValue = 0.0d;
        maxValue = 0.0d;
        if (String.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        string trimmed = value.Trim();
        if (!trimmed.StartsWith("[", StringComparison.Ordinal) || !trimmed.EndsWith("]", StringComparison.Ordinal))
        {
            return false;
        }

        string[] parts = trimmed.Substring(1, trimmed.Length - 2).Split(new[] { ',' }, StringSplitOptions.None);
        if (parts.Length != 2)
        {
            return false;
        }

        try
        {
            minValue = ParseDoubleValue(parts[0]);
            maxValue = ParseDoubleValue(parts[1]);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private bool RangeValueMatches(object expected, double actual)
    {
        double expectedValue = ParseDoubleValue(Convert.ToString(expected, System.Globalization.CultureInfo.InvariantCulture));
        if (Double.IsInfinity(expectedValue) || Double.IsInfinity(actual))
        {
            return expectedValue.Equals(actual);
        }

        return Math.Abs(expectedValue - actual) <= 0.000001d;
    }

    private double ParseDoubleValue(string value)
    {
        string normalized = String.IsNullOrWhiteSpace(value) ? String.Empty : value.Trim();
        if (String.Equals(normalized, "-oo", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(normalized, "-inf", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(normalized, "-infinity", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(normalized, "-infinity", StringComparison.OrdinalIgnoreCase))
        {
            return Double.NegativeInfinity;
        }

        if (String.Equals(normalized, "+oo", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(normalized, "oo", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(normalized, "+inf", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(normalized, "inf", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(normalized, "+infinity", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(normalized, "infinity", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(normalized, "infinity", StringComparison.OrdinalIgnoreCase))
        {
            return Double.PositiveInfinity;
        }

        return Convert.ToDouble(normalized, System.Globalization.CultureInfo.InvariantCulture);
    }

    private string NormalizeComponentPath(string path)
    {
        if (String.IsNullOrWhiteSpace(path))
        {
            return null;
        }

        string normalized = path.Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }
        return String.IsNullOrWhiteSpace(normalized) ? null : normalized;
    }
}
