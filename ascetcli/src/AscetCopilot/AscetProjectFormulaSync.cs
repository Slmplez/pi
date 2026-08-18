using System;
using System.Collections;
using System.Collections.Generic;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public sealed class AscetProjectFormulaRef
{
    public string Name { get; set; }
    public string Type { get; set; }
    public string Unit { get; set; }
    public string Comment { get; set; }
    public string Contents { get; set; }
    public IList<double> Parameters { get; set; }
}

public sealed class AscetProjectFormulaCatalog
{
    public string ProjectPath { get; set; }
    public IList<AscetProjectFormulaRef> Formulas { get; set; }
}

public sealed class AscetProjectFormulaSpec
{
    public string Name { get; set; }
    public string Type { get; set; }
    public string Unit { get; set; }
    public bool HasUnit { get; set; }
    public string Comment { get; set; }
    public bool HasComment { get; set; }
    public IList<double> Parameters { get; set; }
    public bool HasParameters { get; set; }
}

public sealed class AscetProjectFormulaSpecDocument
{
    public string Mode { get; set; }
    public bool DeleteMissing { get; set; }
    public bool HasDeleteMissing { get; set; }
    public IList<AscetProjectFormulaSpec> Formulas { get; set; }
}

public sealed class AscetProjectFormulaApplyResult
{
    public string ProjectPath { get; set; }
    public string Mode { get; set; }
    public bool DeleteMissing { get; set; }
    public IList<string> CreatedFormulas { get; set; }
    public IList<string> UpdatedFormulas { get; set; }
    public IList<string> DeletedFormulas { get; set; }
    public IList<string> Issues { get; set; }
    public bool WriteSucceeded { get; set; }
    public bool VerifyReadbackRequested { get; set; }
    public bool ReadbackVerified { get; set; }
    public bool SaveSucceeded { get; set; }
    public string VerificationMode { get; set; }
    public bool Changed { get; set; }
    public string MutationStatus { get; set; }
    public bool SaveAttempted { get; set; }
    public string SaveState { get; set; }
    public bool Verified { get; set; }
    public string VerificationStatus { get; set; }
    public int SessionCount { get; set; }
    public int SaveCount { get; set; }
    public int EditableRetryCount { get; set; }
    public int NativeMutationAttemptCount { get; set; }
}

public sealed class AscetProjectFormulaModifiedDiff
{
    public string Name { get; set; }
    public string ChangeKind { get; set; }
    public string LeftType { get; set; }
    public string RightType { get; set; }
    public string LeftUnit { get; set; }
    public string RightUnit { get; set; }
    public string LeftComment { get; set; }
    public string RightComment { get; set; }
    public IList<double> LeftParameters { get; set; }
    public IList<double> RightParameters { get; set; }
    public IList<string> FieldChanges { get; set; }
    public string LeftContents { get; set; }
    public string RightContents { get; set; }
}

public sealed class AscetProjectFormulaDiffResult
{
    public string LeftProjectPath { get; set; }
    public string RightProjectPath { get; set; }
    public IList<AscetProjectFormulaRef> AddedFormulas { get; set; }
    public IList<AscetProjectFormulaRef> RemovedFormulas { get; set; }
    public IList<AscetProjectFormulaModifiedDiff> ModifiedFormulas { get; set; }
    public string Summary { get; set; }
}

public interface IProjectFormulaReadService
{
    AscetProjectFormulaCatalog ReadCatalog(string projectPath);
}

public interface IProjectFormulaApplyService
{
    AscetProjectFormulaApplyResult Apply(string projectPath, AscetProjectFormulaSpecDocument spec, bool verifyReadback);
}

public interface IProjectFormulaDiffService
{
    AscetProjectFormulaDiffResult Diff(string leftProjectPath, string rightProjectPath);
}

public static class AscetProjectFormulaSpecDocumentParser
{
    public static AscetProjectFormulaSpecDocument ParseJson(string json)
    {
        if (String.IsNullOrWhiteSpace(json))
        {
            throw new AscetReadException("invalid_formula_spec", "parse_project_formula_spec", "Project formula spec JSON must not be empty.");
        }

        Dictionary<string, object> root;
        try
        {
            root = AscetJsonContract.DeserializeObject(json);
        }
        catch (Exception ex)
        {
            throw new AscetReadException("invalid_formula_spec", "parse_project_formula_spec", "Failed to parse project formula spec JSON.", ex);
        }

        if (root == null)
        {
            throw new AscetReadException("invalid_formula_spec", "parse_project_formula_spec", "Project formula spec JSON must deserialize into an object.");
        }

        object rawFormulas;
        if (!TryGetValue(root, "formulas", out rawFormulas))
        {
            throw new AscetReadException("invalid_formula_spec", "parse_project_formula_spec", "Project formula spec JSON must contain a 'formulas' array.");
        }

        IList rawList = rawFormulas as IList;
        if (rawList == null)
        {
            throw new AscetReadException("invalid_formula_spec", "parse_project_formula_spec", "Property 'formulas' must be an array.");
        }

        List<AscetProjectFormulaSpec> formulas = new List<AscetProjectFormulaSpec>();
        for (int i = 0; i < rawList.Count; i++)
        {
            Dictionary<string, object> entry = AsObjectMap(rawList[i], "formulas[" + i.ToString() + "]");
            formulas.Add(ParseFormula(entry, i));
        }

        bool hasDeleteMissing;
        bool deleteMissing = ReadOptionalBoolean(root, "deleteMissing", out hasDeleteMissing);
        bool hasMode;
        string mode = ReadOptionalString(root, "mode", out hasMode);

        return new AscetProjectFormulaSpecDocument
        {
            Mode = NormalizeMode(mode),
            DeleteMissing = hasDeleteMissing && deleteMissing,
            HasDeleteMissing = hasDeleteMissing,
            Formulas = formulas
        };
    }

    private static AscetProjectFormulaSpec ParseFormula(IDictionary<string, object> entry, int index)
    {
        string context = "formulas[" + index.ToString() + "]";
        bool hasUnit;
        string unit = ReadOptionalString(entry, "unit", out hasUnit);
        bool hasComment;
        string comment = ReadOptionalString(entry, "comment", out hasComment);
        bool hasParameters;
        IList<double> parameters = ReadOptionalDoubleList(entry, "parameters", context, out hasParameters);

        AscetProjectFormulaSpec spec = new AscetProjectFormulaSpec
        {
            Name = RequireString(entry, "name", "Formula name must not be empty."),
            Type = NormalizeFormulaType(RequireString(entry, "type", "Formula type must not be empty.")),
            Unit = unit,
            HasUnit = hasUnit,
            Comment = comment,
            HasComment = hasComment,
            Parameters = parameters,
            HasParameters = hasParameters
        };

        ValidateFormula(spec, context);
        return spec;
    }

    private static void ValidateFormula(AscetProjectFormulaSpec spec, string context)
    {
        int actualCount = spec.Parameters == null ? 0 : spec.Parameters.Count;
        switch (spec.Type)
        {
            case "identity":
                if (spec.HasParameters && actualCount != 0)
                {
                    throw new AscetReadException("invalid_formula_spec", "parse_project_formula_spec", "Property '" + context + ".parameters' must be empty for identity formulas.");
                }
                return;

            case "linear":
                RequireParameterCount(spec, context, 2);
                return;

            case "moebius":
                RequireParameterCount(spec, context, 4);
                return;

            case "fiveParameters":
                RequireParameterCount(spec, context, 5);
                return;

            default:
                throw new AscetReadException("invalid_formula_spec", "parse_project_formula_spec", "Unsupported formula type '" + spec.Type + "'.");
        }
    }

    private static void RequireParameterCount(AscetProjectFormulaSpec spec, string context, int expectedCount)
    {
        int actualCount = spec.Parameters == null ? 0 : spec.Parameters.Count;
        if (!spec.HasParameters || actualCount != expectedCount)
        {
            throw new AscetReadException("invalid_formula_spec", "parse_project_formula_spec", "Property '" + context + ".parameters' must contain exactly " + expectedCount.ToString() + " numeric values for type '" + spec.Type + "'.");
        }
    }

    internal static string NormalizeFormulaType(string type)
    {
        string normalized = String.IsNullOrWhiteSpace(type)
            ? String.Empty
            : type.Trim().Replace("_", String.Empty).Replace("-", String.Empty).Replace(" ", String.Empty).ToLowerInvariant();

        switch (normalized)
        {
            case "identity":
            case "ident":
                return "identity";
            case "linear":
                return "linear";
            case "moebius":
                return "moebius";
            case "fiveparameters":
            case "fiveparameter":
                return "fiveParameters";
            default:
                return String.IsNullOrWhiteSpace(type) ? String.Empty : type.Trim();
        }
    }

    internal static string NormalizeMode(string mode)
    {
        string normalized = String.IsNullOrWhiteSpace(mode)
            ? String.Empty
            : mode.Trim().Replace("_", String.Empty).Replace("-", String.Empty).Replace(" ", String.Empty).ToLowerInvariant();

        switch (normalized)
        {
            case "":
            case "apply":
            case "update":
                return "apply";
            case "restore":
                return "restore";
            default:
                return String.IsNullOrWhiteSpace(mode) ? "apply" : mode.Trim();
        }
    }

    private static bool TryGetValue(IDictionary<string, object> map, string key, out object value)
    {
        value = null;
        if (map == null)
        {
            return false;
        }

        if (map.ContainsKey(key))
        {
            value = map[key];
            return true;
        }

        foreach (KeyValuePair<string, object> entry in map)
        {
            if (String.Equals(entry.Key, key, StringComparison.OrdinalIgnoreCase))
            {
                value = entry.Value;
                return true;
            }
        }

        return false;
    }

    private static Dictionary<string, object> AsObjectMap(object value, string context)
    {
        Dictionary<string, object> map = value as Dictionary<string, object>;
        if (map != null)
        {
            return map;
        }

        IDictionary<string, object> dictionary = value as IDictionary<string, object>;
        if (dictionary == null)
        {
            throw new AscetReadException("invalid_formula_spec", "parse_project_formula_spec", "Property '" + context + "' must be an object.");
        }

        Dictionary<string, object> result = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
        foreach (KeyValuePair<string, object> entry in dictionary)
        {
            result[entry.Key] = entry.Value;
        }

        return result;
    }

    private static string RequireString(IDictionary<string, object> map, string key, string emptyMessage)
    {
        object raw;
        if (!TryGetValue(map, key, out raw))
        {
            throw new AscetReadException("invalid_formula_spec", "parse_project_formula_spec", "Missing required property '" + key + "'.");
        }

        string value = raw == null ? String.Empty : Convert.ToString(raw, System.Globalization.CultureInfo.InvariantCulture);
        if (String.IsNullOrWhiteSpace(value))
        {
            throw new AscetReadException("invalid_formula_spec", "parse_project_formula_spec", emptyMessage);
        }

        return value.Trim();
    }

    private static string ReadOptionalString(IDictionary<string, object> map, string key, out bool present)
    {
        present = false;
        object raw;
        if (!TryGetValue(map, key, out raw))
        {
            return null;
        }

        present = true;
        return raw == null ? String.Empty : Convert.ToString(raw, System.Globalization.CultureInfo.InvariantCulture);
    }

    private static IList<double> ReadOptionalDoubleList(IDictionary<string, object> map, string key, string context, out bool present)
    {
        present = false;
        object raw;
        if (!TryGetValue(map, key, out raw))
        {
            return new List<double>();
        }

        present = true;
        if (raw == null)
        {
            return new List<double>();
        }

        IList list = raw as IList;
        if (list == null)
        {
            throw new AscetReadException("invalid_formula_spec", "parse_project_formula_spec", "Property '" + context + "." + key + "' must be an array.");
        }

        List<double> values = new List<double>();
        for (int i = 0; i < list.Count; i++)
        {
            try
            {
                values.Add(Convert.ToDouble(list[i], System.Globalization.CultureInfo.InvariantCulture));
            }
            catch (Exception ex)
            {
                throw new AscetReadException("invalid_formula_spec", "parse_project_formula_spec", "Property '" + context + "." + key + "[" + i.ToString() + "]' must be numeric.", ex);
            }
        }

        return values;
    }

    private static bool ReadOptionalBoolean(IDictionary<string, object> map, string key, out bool present)
    {
        present = false;
        object raw;
        if (!TryGetValue(map, key, out raw))
        {
            return false;
        }

        present = true;
        if (raw == null)
        {
            return false;
        }

        try
        {
            return Convert.ToBoolean(raw, System.Globalization.CultureInfo.InvariantCulture);
        }
        catch (Exception ex)
        {
            throw new AscetReadException("invalid_formula_spec", "parse_project_formula_spec", "Property '" + key + "' must be a boolean.", ex);
        }
    }
}

public class ProjectFormulaReadService : AscetReadDomainServiceBase, IProjectFormulaReadService
{
    public AscetProjectFormulaCatalog ReadCatalog(string projectPath)
    {
        return ExecuteWithSession("formula_catalog_read", delegate(AscetSession session)
        {
            AscetProject project = ResolveProject(session, projectPath);
            Formula[] formulas = project.GetAllFormulas();
            List<AscetProjectFormulaRef> refs = new List<AscetProjectFormulaRef>();

            if (formulas != null)
            {
                for (int i = 0; i < formulas.Length; i++)
                {
                    Formula formula = formulas[i];
                    if (formula == null)
                    {
                        continue;
                    }

                    refs.Add(BuildFormulaRef(formula));
                }
            }

            refs.Sort(delegate(AscetProjectFormulaRef left, AscetProjectFormulaRef right)
            {
                return StringComparer.Ordinal.Compare(left == null ? String.Empty : (left.Name ?? String.Empty), right == null ? String.Empty : (right.Name ?? String.Empty));
            });

            return new AscetProjectFormulaCatalog
            {
                ProjectPath = projectPath,
                Formulas = refs
            };
        });
    }

    internal static AscetProjectFormulaRef BuildFormulaRef(Formula formula)
    {
        return new AscetProjectFormulaRef
        {
            Name = formula == null ? String.Empty : (formula.GetName() ?? String.Empty),
            Type = NormalizeFormulaType(formula),
            Unit = formula == null ? String.Empty : (formula.GetUnit() ?? String.Empty),
            Comment = formula == null ? String.Empty : (formula.GetComment() ?? String.Empty),
            Contents = formula == null ? String.Empty : (formula.GetContents() ?? String.Empty),
            Parameters = ReadParameters(formula)
        };
    }

    internal static string NormalizeFormulaType(Formula formula)
    {
        if (formula == null)
        {
            return String.Empty;
        }

        try
        {
            if (formula.IsIdentity())
            {
                return "identity";
            }

            if (formula.IsLinear())
            {
                return "linear";
            }

            if (formula.IsMoebius())
            {
                return "moebius";
            }

            if (formula.Is5Parameters())
            {
                return "fiveParameters";
            }
        }
        catch
        {
        }

        return AscetProjectFormulaSpecDocumentParser.NormalizeFormulaType(formula.GetFormulaType());
    }

    internal static List<double> ReadParameters(Formula formula)
    {
        List<double> result = new List<double>();
        if (formula == null)
        {
            return result;
        }

        double[] values = formula.GetFormulaParameters();
        if (values == null)
        {
            return result;
        }

        for (int i = 0; i < values.Length; i++)
        {
            result.Add(values[i]);
        }

        return result;
    }

    internal AscetProject ResolveProject(AscetSession session, string projectPath)
    {
        DataBaseItem item = ResolveItemByPath(session, projectPath);
        AscetProject project = item as AscetProject;
        if (project == null)
        {
            throw new AscetReadException("unsupported_project_kind", "resolve_project", "Item '" + projectPath + "' is not an ASCET project.");
        }

        return project;
    }
}

public sealed class ProjectFormulaApplyService : ProjectFormulaReadService, IProjectFormulaApplyService
{
    public AscetProjectFormulaApplyResult Apply(string projectPath, AscetProjectFormulaSpecDocument spec, bool verifyReadback)
    {
        if (String.IsNullOrWhiteSpace(projectPath))
        {
            throw new AscetReadException("invalid_argument", "apply_project_formula", "Project path must not be empty.");
        }

        if (spec == null)
        {
            throw new AscetReadException("invalid_argument", "apply_project_formula", "Project formula spec document must not be null.");
        }

        AscetProjectFormulaApplyResult result = ExecuteWithSession("apply_project_formula", delegate(AscetSession session)
        {
            AscetDataBase database = session.GetCurrentDatabaseHandle();
            AscetProject project = ResolveProject(session, projectPath);
            List<string> created = new List<string>();
            List<string> updated = new List<string>();
            List<string> deleted = new List<string>();
            List<string> issues = new List<string>();
            IList<AscetProjectFormulaSpec> requested = spec.Formulas ?? new List<AscetProjectFormulaSpec>();
            string mode = AscetProjectFormulaSpecDocumentParser.NormalizeMode(spec.Mode);
            bool deleteMissing = String.Equals(mode, "restore", StringComparison.Ordinal) && spec.HasDeleteMissing && spec.DeleteMissing;
            bool requestedChanges = HasRequestedChanges(project, requested);
            bool deleteMissingChanges = deleteMissing && HasMissingFormulas(project, requested);
            bool changed = requestedChanges || deleteMissingChanges;

            if (changed)
            {
                RequireComponentEditableInSession(session, projectPath, "apply_project_formula");
            }

            for (int i = 0; i < requested.Count; i++)
            {
                AscetProjectFormulaSpec entry = requested[i];
                if (entry == null)
                {
                    throw new AscetReadException("invalid_formula_spec", "apply_project_formula", "Formula spec at index " + i.ToString() + " must not be null.");
                }

                changed = ApplySingleFormula(project, entry, created, updated, issues) || changed;
            }

            if (String.Equals(mode, "restore", StringComparison.Ordinal))
            {
                changed = DeleteMissingFormulas(project, requested, deleteMissing, deleted, issues) || changed;
            }

            bool saveAttempted = changed;
            bool saveSucceeded = false;
            if (saveAttempted)
            {
                saveSucceeded = database.Save();
                if (!saveSucceeded)
                {
                    throw new AscetReadException(
                        "apply_project_formula_failed",
                        "apply_project_formula",
                        "Failed to save current database after applying project formulas for '" + projectPath + "'.");
                }
            }

            bool targetResolved = VerifyTargetsInSession(project, requested, deleted);
            bool readbackVerified = !verifyReadback || targetResolved;
            if (verifyReadback && !readbackVerified)
            {
                throw new AscetReadException(
                    "readback_mismatch",
                    "apply_project_formula",
                    "Project formula target verification failed after applying formulas for '" + projectPath + "'.");
            }

            return new AscetProjectFormulaApplyResult
            {
                ProjectPath = projectPath,
                Mode = mode,
                DeleteMissing = deleteMissing,
                CreatedFormulas = created,
                UpdatedFormulas = updated,
                DeletedFormulas = deleted,
                Issues = issues,
                WriteSucceeded = true,
                VerifyReadbackRequested = verifyReadback,
                ReadbackVerified = readbackVerified,
                SaveSucceeded = saveSucceeded,
                VerificationMode = "same_session_target_resolve",
                Changed = changed,
                MutationStatus = changed ? "applied" : "no_op",
                SaveAttempted = saveAttempted,
                SaveState = changed ? "saved" : "not_required",
                Verified = targetResolved,
                VerificationStatus = targetResolved ? "passed" : "failed",
                SessionCount = 1,
                SaveCount = saveAttempted ? 1 : 0,
                EditableRetryCount = 0,
                NativeMutationAttemptCount = changed ? 1 : 0
            };
        });

        return result;
    }

    private bool ApplySingleFormula(AscetProject project, AscetProjectFormulaSpec spec, IList<string> created, IList<string> updated, IList<string> issues)
    {
        Formula existing = project.GetFormula(spec.Name);
        Formula target;

        if (existing == null)
        {
            target = CreateFormula(project, spec.Type);
            if (!target.SetName(spec.Name))
            {
                throw new AscetReadException("set_formula_failed", "apply_project_formula", "Failed to set formula name '" + spec.Name + "'.");
            }

            created.Add(spec.Name);
        }
        else
        {
            string currentType = NormalizeFormulaType(existing);
            if (FormulaSpecMatchesReference(BuildFormulaRef(existing), spec))
            {
                return false;
            }

            if (!String.Equals(currentType, spec.Type, StringComparison.Ordinal))
            {
                if (String.Equals(existing.GetName(), "ident", StringComparison.OrdinalIgnoreCase) ||
                    String.Equals(spec.Name, "ident", StringComparison.OrdinalIgnoreCase))
                {
                    throw new AscetReadException("formula_conflict", "apply_project_formula", "Formula 'ident' can not be recreated with type '" + spec.Type + "'.");
                }

                if (!project.DeleteFormulaNamed(spec.Name))
                {
                    throw new AscetReadException("delete_formula_failed", "apply_project_formula", "Failed to replace existing formula '" + spec.Name + "'.");
                }

                target = CreateFormula(project, spec.Type);
                if (!target.SetName(spec.Name))
                {
                    throw new AscetReadException("set_formula_failed", "apply_project_formula", "Failed to set formula name '" + spec.Name + "' after replacing type.");
                }

                if (issues != null)
                {
                    issues.Add("Recreated formula '" + spec.Name + "' because type changed from '" + currentType + "' to '" + spec.Type + "'.");
                }
            }
            else
            {
                target = existing;
            }

            updated.Add(spec.Name);
        }

        ApplyFormulaFields(target, spec);
        return true;
    }

    private bool DeleteMissingFormulas(AscetProject project, IList<AscetProjectFormulaSpec> requested, bool deleteMissing, IList<string> deleted, IList<string> issues)
    {
        if (project == null || !deleteMissing)
        {
            return false;
        }

        HashSet<string> requestedNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (requested != null)
        {
            for (int i = 0; i < requested.Count; i++)
            {
                AscetProjectFormulaSpec entry = requested[i];
                if (entry != null && !String.IsNullOrWhiteSpace(entry.Name))
                {
                    requestedNames.Add(entry.Name);
                }
            }
        }

        Formula[] formulas = project.GetAllFormulas();
        if (formulas == null)
        {
            return false;
        }

        bool changed = false;
        for (int i = 0; i < formulas.Length; i++)
        {
            Formula formula = formulas[i];
            string name = formula == null ? String.Empty : (formula.GetName() ?? String.Empty);
            if (String.IsNullOrWhiteSpace(name) || requestedNames.Contains(name))
            {
                continue;
            }

            if (IsProtectedFormulaName(name))
            {
                if (issues != null)
                {
                    issues.Add("Preserved protected formula '" + name + "' during restore.");
                }
                continue;
            }

            if (!project.DeleteFormulaNamed(name))
            {
                throw new AscetReadException("delete_formula_failed", "apply_project_formula", "Failed to delete extra formula '" + name + "' during restore.");
            }

            if (deleted != null)
            {
                deleted.Add(name);
            }
            changed = true;
        }

        return changed;
    }

    private Formula CreateFormula(AscetProject project, string type)
    {
        if (project == null)
        {
            throw new AscetReadException("invalid_argument", "create_formula", "Project must not be null.");
        }

        switch (type)
        {
            case "identity":
                return project.CreateIdentityFormula();
            case "linear":
                return project.CreateLinearFormula();
            case "moebius":
                return project.CreateMoebiusFormula();
            case "fiveParameters":
                return project.Create5ParameterFormula();
            default:
                throw new AscetReadException("invalid_formula_spec", "create_formula", "Unsupported formula type '" + type + "'.");
        }
    }

    private bool ApplyFormulaFields(Formula formula, AscetProjectFormulaSpec spec)
    {
        if (formula == null || spec == null)
        {
            throw new AscetReadException("set_formula_failed", "apply_project_formula", "Formula target must not be null.");
        }

        bool changed = false;
        if (spec.HasUnit && !String.Equals(formula.GetUnit() ?? String.Empty, spec.Unit ?? String.Empty, StringComparison.Ordinal))
        {
            if (!formula.SetUnit(spec.Unit ?? String.Empty))
            {
                throw new AscetReadException("set_formula_failed", "apply_project_formula", "Failed to set unit for formula '" + spec.Name + "'.");
            }
            changed = true;
        }

        if (spec.HasComment && !String.Equals(formula.GetComment() ?? String.Empty, spec.Comment ?? String.Empty, StringComparison.Ordinal))
        {
            if (!formula.SetComment(spec.Comment ?? String.Empty))
            {
                throw new AscetReadException("set_formula_failed", "apply_project_formula", "Failed to set comment for formula '" + spec.Name + "'.");
            }
            changed = true;
        }

        if (!spec.HasParameters || String.Equals(spec.Type, "identity", StringComparison.Ordinal))
        {
            return changed;
        }

        IList<double> parameters = spec.Parameters ?? new List<double>();
        if (ParametersMatch(ReadParameters(formula), parameters))
        {
            return changed;
        }

        bool succeeded;
        switch (spec.Type)
        {
            case "linear":
                succeeded = formula.SetLinearParameters(parameters[0], parameters[1]);
                break;
            case "moebius":
                succeeded = formula.SetMoebiusParameters(parameters[0], parameters[1], parameters[2], parameters[3]);
                break;
            case "fiveParameters":
                succeeded = formula.Set5ParameterParameters(parameters[0], parameters[1], parameters[2], parameters[3], parameters[4]);
                break;
            default:
                throw new AscetReadException("invalid_formula_spec", "apply_project_formula", "Unsupported formula type '" + spec.Type + "'.");
        }

        if (!succeeded)
        {
            throw new AscetReadException("set_formula_failed", "apply_project_formula", "Failed to set parameters for formula '" + spec.Name + "'.");
        }

        return true;
    }

    internal static bool FormulaSpecMatchesReference(AscetProjectFormulaRef current, AscetProjectFormulaSpec spec)
    {
        if (current == null || spec == null || !String.Equals(current.Type ?? String.Empty, spec.Type ?? String.Empty, StringComparison.Ordinal))
        {
            return false;
        }

        if (spec.HasUnit && !String.Equals(current.Unit ?? String.Empty, spec.Unit ?? String.Empty, StringComparison.Ordinal))
        {
            return false;
        }

        if (spec.HasComment && !String.Equals(current.Comment ?? String.Empty, spec.Comment ?? String.Empty, StringComparison.Ordinal))
        {
            return false;
        }

        return !spec.HasParameters || ParametersMatch(current.Parameters, spec.Parameters);
    }

    private bool FormulaNeedsUpdate(Formula formula, AscetProjectFormulaSpec spec)
    {
        return formula == null || !FormulaSpecMatchesReference(BuildFormulaRef(formula), spec);
    }

    private bool HasRequestedChanges(AscetProject project, IList<AscetProjectFormulaSpec> requested)
    {
        if (project == null || requested == null)
        {
            return false;
        }

        for (int i = 0; i < requested.Count; i++)
        {
            AscetProjectFormulaSpec entry = requested[i];
            if (entry == null || FormulaNeedsUpdate(project.GetFormula(entry.Name), entry))
            {
                return true;
            }
        }

        return false;
    }

    private bool HasMissingFormulas(AscetProject project, IList<AscetProjectFormulaSpec> requested)
    {
        if (project == null)
        {
            return false;
        }

        HashSet<string> requestedNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (requested != null)
        {
            for (int i = 0; i < requested.Count; i++)
            {
                AscetProjectFormulaSpec entry = requested[i];
                if (entry != null && !String.IsNullOrWhiteSpace(entry.Name))
                {
                    requestedNames.Add(entry.Name);
                }
            }
        }

        Formula[] formulas = project.GetAllFormulas();
        if (formulas == null)
        {
            return false;
        }

        for (int i = 0; i < formulas.Length; i++)
        {
            Formula formula = formulas[i];
            string name = formula == null ? String.Empty : (formula.GetName() ?? String.Empty);
            if (!String.IsNullOrWhiteSpace(name) && !requestedNames.Contains(name) && !IsProtectedFormulaName(name))
            {
                return true;
            }
        }

        return false;
    }

    private static bool ParametersMatch(IList<double> left, IList<double> right)
    {
        IList<double> leftValues = left ?? new List<double>();
        IList<double> rightValues = right ?? new List<double>();
        if (leftValues.Count != rightValues.Count)
        {
            return false;
        }

        for (int i = 0; i < leftValues.Count; i++)
        {
            if (Math.Abs(leftValues[i] - rightValues[i]) > 0.000001d)
            {
                return false;
            }
        }

        return true;
    }

    private bool VerifyTargetsInSession(AscetProject project, IList<AscetProjectFormulaSpec> requested, IList<string> deleted)
    {
        if (project == null)
        {
            return false;
        }

        if (requested != null)
        {
            for (int i = 0; i < requested.Count; i++)
            {
                AscetProjectFormulaSpec entry = requested[i];
                if (entry == null)
                {
                    continue;
                }

                Formula formula = project.GetFormula(entry.Name);
                if (formula == null)
                {
                    throw new AscetReadException(
                        "readback_mismatch",
                        "apply_project_formula",
                        "Formula '" + entry.Name + "' was not found after applying project formulas.");
                }

                if (!FormulaSpecMatchesReference(BuildFormulaRef(formula), entry))
                {
                    throw new AscetReadException(
                        "readback_mismatch",
                        "apply_project_formula",
                        "Formula '" + entry.Name + "' did not match the requested fields after applying project formulas.");
                }
            }
        }

        if (deleted != null)
        {
            for (int i = 0; i < deleted.Count; i++)
            {
                string name = deleted[i];
                if (!String.IsNullOrWhiteSpace(name) && project.GetFormula(name) != null)
                {
                    throw new AscetReadException(
                        "readback_mismatch",
                        "apply_project_formula",
                        "Formula '" + name + "' was still present after restore deletion.");
                }
            }
        }

        return true;
    }

    private bool IsProtectedFormulaName(string name)
    {
        return String.Equals(name ?? String.Empty, "ident", StringComparison.OrdinalIgnoreCase);
    }
}

public sealed class ProjectFormulaDiffService : ProjectFormulaReadService, IProjectFormulaDiffService
{
    public AscetProjectFormulaDiffResult Diff(string leftProjectPath, string rightProjectPath)
    {
        if (String.IsNullOrWhiteSpace(leftProjectPath) || String.IsNullOrWhiteSpace(rightProjectPath))
        {
            throw new AscetReadException("invalid_argument", "diff_project_formulas", "Both left and right project paths must not be empty.");
        }

        AscetProjectFormulaCatalog left = ReadCatalog(leftProjectPath);
        AscetProjectFormulaCatalog right = ReadCatalog(rightProjectPath);
        Dictionary<string, AscetProjectFormulaRef> leftMap = BuildFormulaMap(left == null ? null : left.Formulas);
        Dictionary<string, AscetProjectFormulaRef> rightMap = BuildFormulaMap(right == null ? null : right.Formulas);
        List<string> keys = MergeKeys(leftMap, rightMap);
        List<AscetProjectFormulaRef> added = new List<AscetProjectFormulaRef>();
        List<AscetProjectFormulaRef> removed = new List<AscetProjectFormulaRef>();
        List<AscetProjectFormulaModifiedDiff> modified = new List<AscetProjectFormulaModifiedDiff>();

        for (int i = 0; i < keys.Count; i++)
        {
            string key = keys[i];
            bool hasLeft = leftMap.ContainsKey(key);
            bool hasRight = rightMap.ContainsKey(key);
            if (!hasLeft && hasRight)
            {
                added.Add(CloneFormulaRef(rightMap[key]));
                continue;
            }

            if (hasLeft && !hasRight)
            {
                removed.Add(CloneFormulaRef(leftMap[key]));
                continue;
            }

            AscetProjectFormulaModifiedDiff entry = BuildModifiedDiff(leftMap[key], rightMap[key]);
            if (entry != null)
            {
                modified.Add(entry);
            }
        }

        return new AscetProjectFormulaDiffResult
        {
            LeftProjectPath = leftProjectPath,
            RightProjectPath = rightProjectPath,
            AddedFormulas = added,
            RemovedFormulas = removed,
            ModifiedFormulas = modified,
            Summary = added.Count.ToString() + " added, " + removed.Count.ToString() + " removed, " + modified.Count.ToString() + " modified"
        };
    }

    private Dictionary<string, AscetProjectFormulaRef> BuildFormulaMap(IList<AscetProjectFormulaRef> formulas)
    {
        Dictionary<string, AscetProjectFormulaRef> result = new Dictionary<string, AscetProjectFormulaRef>(StringComparer.Ordinal);
        if (formulas == null)
        {
            return result;
        }

        for (int i = 0; i < formulas.Count; i++)
        {
            AscetProjectFormulaRef formula = formulas[i];
            if (formula == null || String.IsNullOrWhiteSpace(formula.Name))
            {
                continue;
            }

            result[formula.Name] = formula;
        }

        return result;
    }

    private List<string> MergeKeys(IDictionary<string, AscetProjectFormulaRef> left, IDictionary<string, AscetProjectFormulaRef> right)
    {
        HashSet<string> keys = new HashSet<string>(StringComparer.Ordinal);
        AddKeys(keys, left);
        AddKeys(keys, right);

        List<string> result = new List<string>(keys);
        result.Sort(StringComparer.Ordinal);
        return result;
    }

    private void AddKeys(HashSet<string> destination, IDictionary<string, AscetProjectFormulaRef> source)
    {
        if (destination == null || source == null)
        {
            return;
        }

        foreach (KeyValuePair<string, AscetProjectFormulaRef> entry in source)
        {
            if (!String.IsNullOrWhiteSpace(entry.Key))
            {
                destination.Add(entry.Key);
            }
        }
    }

    private AscetProjectFormulaModifiedDiff BuildModifiedDiff(AscetProjectFormulaRef left, AscetProjectFormulaRef right)
    {
        if (left == null || right == null)
        {
            return null;
        }

        List<string> fieldChanges = new List<string>();
        if (!String.Equals(left.Type ?? String.Empty, right.Type ?? String.Empty, StringComparison.Ordinal))
        {
            fieldChanges.Add("type");
        }

        if (!String.Equals(left.Unit ?? String.Empty, right.Unit ?? String.Empty, StringComparison.Ordinal))
        {
            fieldChanges.Add("unit");
        }

        if (!String.Equals(left.Comment ?? String.Empty, right.Comment ?? String.Empty, StringComparison.Ordinal))
        {
            fieldChanges.Add("comment");
        }

        if (!ParametersMatch(left.Parameters, right.Parameters))
        {
            fieldChanges.Add("parameters");
        }

        if (fieldChanges.Count == 0)
        {
            return null;
        }

        return new AscetProjectFormulaModifiedDiff
        {
            Name = left.Name ?? right.Name ?? String.Empty,
            ChangeKind = "Modified",
            LeftType = left.Type ?? String.Empty,
            RightType = right.Type ?? String.Empty,
            LeftUnit = left.Unit ?? String.Empty,
            RightUnit = right.Unit ?? String.Empty,
            LeftComment = left.Comment ?? String.Empty,
            RightComment = right.Comment ?? String.Empty,
            LeftParameters = CloneParameters(left.Parameters),
            RightParameters = CloneParameters(right.Parameters),
            FieldChanges = fieldChanges,
            LeftContents = left.Contents ?? String.Empty,
            RightContents = right.Contents ?? String.Empty
        };
    }

    private bool ParametersMatch(IList<double> left, IList<double> right)
    {
        IList<double> leftValues = left ?? new List<double>();
        IList<double> rightValues = right ?? new List<double>();
        if (leftValues.Count != rightValues.Count)
        {
            return false;
        }

        for (int i = 0; i < leftValues.Count; i++)
        {
            if (Math.Abs(leftValues[i] - rightValues[i]) > 0.000001d)
            {
                return false;
            }
        }

        return true;
    }

    private AscetProjectFormulaRef CloneFormulaRef(AscetProjectFormulaRef source)
    {
        if (source == null)
        {
            return null;
        }

        return new AscetProjectFormulaRef
        {
            Name = source.Name ?? String.Empty,
            Type = source.Type ?? String.Empty,
            Unit = source.Unit ?? String.Empty,
            Comment = source.Comment ?? String.Empty,
            Contents = source.Contents ?? String.Empty,
            Parameters = CloneParameters(source.Parameters)
        };
    }

    private IList<double> CloneParameters(IList<double> source)
    {
        List<double> result = new List<double>();
        if (source == null)
        {
            return result;
        }

        for (int i = 0; i < source.Count; i++)
        {
            result.Add(source[i]);
        }

        return result;
    }
}
