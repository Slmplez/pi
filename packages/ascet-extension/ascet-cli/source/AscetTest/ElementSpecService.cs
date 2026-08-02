using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;

// Converts an Agent-owned element specification into a deterministic, review-only
// ASCET apply plan.  This service deliberately does not call ASCET: live writes
// belong to the gated apply service and require an explicit disposable target.
public static class AscetTestElementSpecService
{
    public static Dictionary<string, object> ExecutePlan(Dictionary<string, object> request)
    {
        string runId = AscetTestContracts.GetString(request, "runId");
        string componentPath = NormalizePath(AscetTestContracts.GetString(request, "componentPath"));
        Dictionary<string, object> inspection = ResolveInspection(request);
        Dictionary<string, object> draft = new Dictionary<string, object>
        {
            { "sourceInspectionHash", inspection == null ? String.Empty : SourceHash(inspection) }
        };
        ElementBuildResult built = Build(request, componentPath, inspection, draft);
        return WriteResult(request, runId, componentPath, built, "plan");
    }

    public static ElementBuildResult Build(
        Dictionary<string, object> request,
        string componentPath,
        Dictionary<string, object> inspection,
        Dictionary<string, object> draft)
    {
        List<AscetTestValidationIssue> issues = new List<AscetTestValidationIssue>();
        Dictionary<string, object> source = ResolveSpec(request, issues);
        string sourceDraftHash = draft == null ? String.Empty : AscetTestContracts.GetString(draft, "sourceInspectionHash");
        if (String.IsNullOrWhiteSpace(sourceDraftHash) && draft != null) sourceDraftHash = AscetTestContracts.ComputeSha256(AscetTestContracts.Serialize(draft));

        List<Dictionary<string, object>> elements = NormalizeElements(source, issues);
        Dictionary<string, Dictionary<string, object>> existing = ReadExistingElements(request, inspection);
        List<Dictionary<string, object>> operations = new List<Dictionary<string, object>>();
        List<Dictionary<string, object>> conflicts = new List<Dictionary<string, object>>();
        HashSet<string> seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        for (int index = 0; index < elements.Count; index++)
        {
            Dictionary<string, object> element = elements[index];
            string name = AscetTestContracts.GetString(element, "name");
            string kind = AscetTestContracts.GetString(element, "kind");
            string type = AscetTestContracts.GetString(element, "type");
            string requested = AscetTestContracts.GetString(element, "operation");
            if (String.IsNullOrWhiteSpace(requested)) requested = "create";
            string key = kind + ":" + name;
            if (!seen.Add(key))
            {
                AddIssue(issues, "elements[" + index.ToString() + "]", "element_duplicate", "Duplicate element declaration '" + name + "'.");
                continue;
            }

            Dictionary<string, object> previous;
            bool exists = existing.TryGetValue(name, out previous);
            string action = requested;
            string reason = String.Empty;
            bool conflict = false;
            if (requested == "upsert") action = exists ? "update" : "create";
            else if (requested != "create" && requested != "update")
            {
                AddIssue(issues, "elements[" + index.ToString() + "].operation", "element_spec_invalid", "operation must be create, update or upsert.");
                action = requested;
            }
            if (exists && !IsCompatible(previous, kind, type))
            {
                conflict = true;
                action = "conflict";
                reason = "existing_element_type_or_kind_mismatch";
            }
            else if (requested == "create" && exists)
            {
                conflict = true;
                action = "conflict";
                reason = "element_already_exists";
            }
            else if (requested == "update" && !exists)
            {
                conflict = true;
                action = "conflict";
                reason = "element_to_update_missing";
            }
            Dictionary<string, object> operation = new Dictionary<string, object>
            {
                { "sequence", operations.Count + 1 },
                { "action", action },
                { "element", element },
                { "reason", reason }
            };
            operations.Add(operation);
            if (conflict)
            {
                Dictionary<string, object> conflictPayload = new Dictionary<string, object>
                {
                    { "name", name }, { "kind", kind }, { "type", type }, { "reason", reason }
                };
                conflicts.Add(conflictPayload);
                AddIssue(issues, "elements[" + index.ToString() + "]", "element_conflict", "Element '" + name + "' cannot be applied: " + reason + ".");
            }
        }

        string baseline = AscetTestContracts.GetString(request, "baselineFingerprint");
        if (String.IsNullOrWhiteSpace(baseline) && inspection != null) baseline = SourceHash(inspection);
        Dictionary<string, object> canonicalSpec = new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-element-spec/v1" },
            { "componentPath", componentPath },
            { "sourceDraftHash", sourceDraftHash },
            { "elements", elements },
            { "valid", issues.Count == 0 },
            { "issues", IssuesToPayload(issues) }
        };
        canonicalSpec["hash"] = AscetTestContracts.ComputeSha256(AscetTestContracts.Serialize(canonicalSpec));
        Dictionary<string, object> plan = new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-esdl-apply-plan/v1" },
            { "componentPath", componentPath },
            { "sourceElementSpecHash", AscetTestContracts.GetString(canonicalSpec, "hash") },
            { "baselineFingerprint", baseline },
            { "operations", operations },
            { "conflicts", conflicts },
            { "ready", issues.Count == 0 && conflicts.Count == 0 },
            { "liveWritePerformed", false },
            { "readbackRequired", true }
        };
        plan["hash"] = AscetTestContracts.ComputeSha256(AscetTestContracts.Serialize(plan));
        return new ElementBuildResult { Spec = canonicalSpec, Plan = plan, Issues = issues };
    }

    private static Dictionary<string, object> WriteResult(Dictionary<string, object> request, string runId, string componentPath, ElementBuildResult built, string action)
    {
        string specPath = String.Empty;
        string planPath = String.Empty;
        if (built.Spec != null) specPath = AscetTestArtifactWriter.WriteJson(request, runId, "element-spec.json", built.Spec);
        if (built.Plan != null) planPath = AscetTestArtifactWriter.WriteJson(request, runId, "esdl-apply-plan.json", built.Plan);
        Dictionary<string, object> data = new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-test-element-spec/v1" },
            { "runId", runId },
            { "componentPath", componentPath },
            { "elementSpec", built.Spec },
            { "applyPlan", built.Plan },
            { "elementSpecPath", specPath },
            { "applyPlanPath", planPath },
            { "liveWritePerformed", false },
            { "readbackRequired", true }
        };
        if (built.Issues.Count > 0)
        {
            return AscetTestEnvelope.Blocked(action, runId, data, FirstCode(built.Issues), "Element specification or apply plan is not ready.", built.Issues, new List<AscetTestValidationIssue>(), Diagnostics());
        }
        return AscetTestEnvelope.Success(action, runId, action == "plan" ? "planned" : "planned", data, new List<AscetTestValidationIssue>(), Diagnostics());
    }

    private static Dictionary<string, object> ResolveSpec(Dictionary<string, object> request, List<AscetTestValidationIssue> issues)
    {
        Dictionary<string, object> inline = AscetTestContracts.GetDictionary(request, "elementSpec");
        if (inline != null) return inline;
        string path = AscetTestContracts.GetString(request, "elementSpecPath");
        if (String.IsNullOrWhiteSpace(path))
        {
            AddIssue(issues, "elementSpec", "element_spec_missing", "elementSpec or elementSpecPath is required.");
            return new Dictionary<string, object>();
        }
        string resolved = AscetTestContracts.ResolvePath(path, Directory.GetCurrentDirectory());
        if (!File.Exists(resolved))
        {
            AddIssue(issues, "elementSpecPath", "element_spec_missing", "Element specification was not found: " + resolved);
            return new Dictionary<string, object>();
        }
        try { return AscetTestContracts.ReadObject(resolved, "elementSpec"); }
        catch (Exception ex) { AddIssue(issues, "elementSpecPath", "element_spec_invalid", ex.Message); return new Dictionary<string, object>(); }
    }

    private static List<Dictionary<string, object>> NormalizeElements(Dictionary<string, object> source, List<AscetTestValidationIssue> issues)
    {
        List<Dictionary<string, object>> result = new List<Dictionary<string, object>>();
        if (!String.Equals(AscetTestContracts.GetString(source, "schemaVersion"), "ascet-element-spec/v1", StringComparison.OrdinalIgnoreCase))
            AddIssue(issues, "elementSpec.schemaVersion", "element_spec_invalid", "elementSpec schemaVersion must be ascet-element-spec/v1.");
        IList raw = AscetTestContracts.GetValue(source, "elements") as IList;
        if (raw == null || raw.Count == 0)
        {
            AddIssue(issues, "elementSpec.elements", "element_spec_invalid", "elementSpec.elements must contain at least one element.");
            return result;
        }
        for (int index = 0; index < raw.Count; index++)
        {
            Dictionary<string, object> input = raw[index] as Dictionary<string, object>;
            if (input == null) { AddIssue(issues, "elements[" + index.ToString() + "]", "element_spec_invalid", "Each element must be an object."); continue; }
            string name = AscetTestContracts.GetString(input, "name").Trim();
            string kind = AscetTestContracts.GetString(input, "kind").Trim().ToLowerInvariant();
            string type = AscetTestContracts.GetString(input, "type").Trim();
            if (String.IsNullOrWhiteSpace(name)) AddIssue(issues, "elements[" + index.ToString() + "].name", "element_spec_invalid", "Element name is required.");
            if (String.IsNullOrWhiteSpace(kind)) AddIssue(issues, "elements[" + index.ToString() + "].kind", "element_spec_invalid", "Element kind is required.");
            if (kind != "parameter" && kind != "variable" && kind != "constant" && kind != "table" && kind != "lookup") AddIssue(issues, "elements[" + index.ToString() + "].kind", "element_kind_unsupported", "Unsupported element kind '" + kind + "'.");
            if (String.IsNullOrWhiteSpace(type)) AddIssue(issues, "elements[" + index.ToString() + "].type", "element_spec_invalid", "Element type is required.");
            Dictionary<string, object> normalized = new Dictionary<string, object>
            {
                { "name", name }, { "kind", kind }, { "type", type },
                { "operation", String.IsNullOrWhiteSpace(AscetTestContracts.GetString(input, "operation")) ? "create" : AscetTestContracts.GetString(input, "operation").Trim().ToLowerInvariant() }
            };
            string[] optional = { "defaultValue", "min", "max", "step", "unit", "direction", "metadata", "dimensions", "values" };
            for (int optionalIndex = 0; optionalIndex < optional.Length; optionalIndex++)
            {
                object value = AscetTestContracts.GetValue(input, optional[optionalIndex]);
                if (value != null) normalized[optional[optionalIndex]] = value;
            }
            result.Add(normalized);
        }
        result.Sort(delegate(Dictionary<string, object> left, Dictionary<string, object> right)
        {
            int byName = StringComparer.OrdinalIgnoreCase.Compare(AscetTestContracts.GetString(left, "name"), AscetTestContracts.GetString(right, "name"));
            return byName != 0 ? byName : StringComparer.Ordinal.Compare(AscetTestContracts.GetString(left, "kind"), AscetTestContracts.GetString(right, "kind"));
        });
        return result;
    }

    private static Dictionary<string, Dictionary<string, object>> ReadExistingElements(Dictionary<string, object> request, Dictionary<string, object> inspection)
    {
        Dictionary<string, Dictionary<string, object>> result = new Dictionary<string, Dictionary<string, object>>(StringComparer.OrdinalIgnoreCase);
        IList raw = AscetTestContracts.GetValue(request, "existingElements") as IList;
        if (raw != null) AddExisting(result, raw, String.Empty);
        Dictionary<string, object> interfaces = inspection == null ? null : AscetTestContracts.GetDictionary(inspection, "interfaces");
        if (interfaces != null)
        {
            AddExisting(result, AscetTestContracts.GetValue(interfaces, "parameters") as IList, "parameter");
            AddExisting(result, AscetTestContracts.GetValue(interfaces, "variables") as IList, "variable");
            AddExisting(result, AscetTestContracts.GetValue(interfaces, "inputs") as IList, "input");
            AddExisting(result, AscetTestContracts.GetValue(interfaces, "outputs") as IList, "output");
        }
        return result;
    }

    private static void AddExisting(Dictionary<string, Dictionary<string, object>> result, IList raw, string fallbackKind)
    {
        if (raw == null) return;
        for (int index = 0; index < raw.Count; index++)
        {
            Dictionary<string, object> item = raw[index] as Dictionary<string, object>;
            if (item == null) continue;
            string name = AscetTestContracts.GetString(item, "name");
            if (String.IsNullOrWhiteSpace(name)) continue;
            Dictionary<string, object> normalized = new Dictionary<string, object>
            {
                { "name", name },
                { "kind", String.IsNullOrWhiteSpace(AscetTestContracts.GetString(item, "kind")) ? fallbackKind : AscetTestContracts.GetString(item, "kind") },
                { "type", AscetTestContracts.GetString(item, "type") }
            };
            result[name] = normalized;
        }
    }

    private static bool IsCompatible(Dictionary<string, object> previous, string kind, string type)
    {
        string oldKind = AscetTestContracts.GetString(previous, "kind");
        string oldType = AscetTestContracts.GetString(previous, "type");
        bool kindCompatible = String.IsNullOrWhiteSpace(oldKind) || String.IsNullOrWhiteSpace(kind) || String.Equals(oldKind, kind, StringComparison.OrdinalIgnoreCase);
        bool typeCompatible = String.IsNullOrWhiteSpace(oldType) || String.IsNullOrWhiteSpace(type) || String.Equals(oldType, type, StringComparison.OrdinalIgnoreCase);
        return kindCompatible && typeCompatible;
    }

    private static Dictionary<string, object> ResolveInspection(Dictionary<string, object> request)
    {
        Dictionary<string, object> inline = AscetTestContracts.GetDictionary(request, "inspection");
        if (inline != null) return inline;
        string path = AscetTestContracts.GetString(request, "inspectionPath");
        if (String.IsNullOrWhiteSpace(path)) return null;
        string resolved = AscetTestContracts.ResolvePath(path, Directory.GetCurrentDirectory());
        return File.Exists(resolved) ? AscetTestContracts.ReadObject(resolved, "inspection") : null;
    }

    private static string SourceHash(Dictionary<string, object> inspection)
    {
        string hash = AscetTestContracts.GetString(inspection, "sourceHash");
        return String.IsNullOrWhiteSpace(hash) ? AscetTestContracts.ComputeSha256(AscetTestContracts.Serialize(inspection)) : hash;
    }

    private static void AddIssue(List<AscetTestValidationIssue> issues, string path, string code, string message)
    {
        issues.Add(new AscetTestValidationIssue { Path = path, Code = code, Message = message });
    }

    private static List<Dictionary<string, object>> IssuesToPayload(List<AscetTestValidationIssue> issues)
    {
        List<Dictionary<string, object>> result = new List<Dictionary<string, object>>();
        for (int index = 0; index < issues.Count; index++) result.Add(issues[index].ToDictionary());
        return result;
    }

    private static string FirstCode(List<AscetTestValidationIssue> issues)
    {
        return issues.Count == 0 || String.IsNullOrWhiteSpace(issues[0].Code) ? "element_spec_invalid" : issues[0].Code;
    }

    private static Dictionary<string, object> Diagnostics()
    {
        return new Dictionary<string, object> { { "liveExecutionStarted", false }, { "liveWritePerformed", false }, { "serialStages", true }, { "readbackRequired", true } };
    }

    private static string NormalizePath(string value) { return (value ?? String.Empty).Trim().Replace('\\', '/'); }
}

public sealed class ElementBuildResult
{
    public Dictionary<string, object> Spec;
    public Dictionary<string, object> Plan;
    public List<AscetTestValidationIssue> Issues;
}
