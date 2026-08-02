using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;

public static class AscetTestEsdlDraftService
{
    public static Dictionary<string, object> Execute(Dictionary<string, object> request)
    {
        string runId = AscetTestContracts.GetString(request, "runId");
        string componentPath = NormalizePath(AscetTestContracts.GetString(request, "componentPath"));
        Dictionary<string, object> inspection = ResolveInspection(request);
        List<AscetTestValidationIssue> issues = new List<AscetTestValidationIssue>();
        if (inspection == null)
        {
            issues.Add(Issue("inspection", "inspection_incomplete", "A versioned inspection is required before generating an ESDL draft."));
        }
        else
        {
            if (!String.Equals(AscetTestContracts.GetString(inspection, "schemaVersion"), "ascet-inspection/v1", StringComparison.Ordinal)) issues.Add(Issue("inspection.schemaVersion", "inspection_incomplete", "Inspection schema must be ascet-inspection/v1."));
            if (!String.Equals(NormalizePath(AscetTestContracts.GetString(inspection, "componentPath")), componentPath, StringComparison.OrdinalIgnoreCase)) issues.Add(Issue("componentPath", "draft_target_mismatch", "Draft componentPath must match inspection.componentPath."));
            if (!AscetTestContracts.GetBoolean(inspection, "complete", false)) issues.Add(Issue("inspection.complete", "inspection_incomplete", "Inspection is incomplete."));
        }

        List<Dictionary<string, object>> methods = ParseMethodDrafts(request, inspection, issues);
        if (methods.Count == 0) issues.Add(Issue("methodDrafts", "esdl_invalid", "At least one Agent-provided methodDraft is required; executable ESDL semantics are never invented by this action."));
        HashSet<string> methodNames = new HashSet<string>(StringComparer.Ordinal);
        for (int index = 0; index < methods.Count; index++) ValidateMethodDraft(methods[index], inspection, index, issues);
        for (int index = 0; index < methods.Count; index++)
        {
            string methodName = AscetTestContracts.GetString(methods[index], "methodName");
            if (!String.IsNullOrWhiteSpace(methodName) && !methodNames.Add(methodName)) issues.Add(Issue("methodDrafts[" + index.ToString() + "].methodName", "esdl_invalid", "Duplicate methodName '" + methodName + "'."));
        }

        string inspectionHash = inspection == null ? String.Empty : AscetTestContracts.GetString(inspection, "sourceHash");
        if (String.IsNullOrWhiteSpace(inspectionHash) && inspection != null) inspectionHash = AscetTestContracts.ComputeSha256(AscetTestContracts.Serialize(inspection));
        string text = RenderText(componentPath, methods);
        ElementBuildResult elementBuild = null;
        if (AscetTestContracts.GetDictionary(request, "elementSpec") != null || !String.IsNullOrWhiteSpace(AscetTestContracts.GetString(request, "elementSpecPath")))
        {
            elementBuild = AscetTestElementSpecService.Build(
                request,
                componentPath,
                inspection,
                new Dictionary<string, object> { { "sourceInspectionHash", inspectionHash } });
            issues.AddRange(elementBuild.Issues);
        }
        Dictionary<string, object> draft = new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-esdl-draft/v1" },
            { "runId", runId },
            { "componentPath", componentPath },
            { "sourceInspectionHash", inspectionHash },
            { "target", new Dictionary<string, object>
                {
                    { "objectKind", inspection == null ? "unknown" : AscetTestContracts.GetString(inspection, "objectKind") },
                    { "methodNames", ExtractMethodNames(methods) }
                }
            },
            { "methods", methods },
            { "text", text },
            { "valid", issues.Count == 0 },
            { "issues", IssuesToPayload(issues) },
            { "readbackRequired", true },
            { "elementSpecHash", elementBuild == null ? String.Empty : AscetTestContracts.GetString(elementBuild.Spec, "hash") },
            { "applyPlanHash", elementBuild == null ? String.Empty : AscetTestContracts.GetString(elementBuild.Plan, "hash") }
        };

        string inspectionPath = String.Empty;
        if (inspection != null) inspectionPath = AscetTestArtifactWriter.WriteJson(request, runId, "inspection.json", inspection);
        string draftPath = AscetTestArtifactWriter.WriteJson(request, runId, "esdl-draft.json", draft);
        string esdlPath = AscetTestArtifactWriter.WriteText(request, runId, "esdl-draft.esdl", text);
        Dictionary<string, object> data = new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-test-esdl-draft/v1" },
            { "ready", issues.Count == 0 },
            { "runId", runId },
            { "componentPath", componentPath },
            { "draft", draft },
            { "inspectionPath", inspectionPath },
            { "draftPath", draftPath },
            { "esdlPath", esdlPath },
            { "elementSpec", elementBuild == null ? null : elementBuild.Spec },
            { "applyPlan", elementBuild == null ? null : elementBuild.Plan },
            { "elementSpecPath", String.Empty },
            { "applyPlanPath", String.Empty },
            { "liveWritePerformed", false }
        };

        if (elementBuild != null)
        {
            data["elementSpecPath"] = AscetTestArtifactWriter.WriteJson(request, runId, "element-spec.json", elementBuild.Spec);
            data["applyPlanPath"] = AscetTestArtifactWriter.WriteJson(request, runId, "esdl-apply-plan.json", elementBuild.Plan);
        }

        if (issues.Count > 0)
        {
            return AscetTestEnvelope.Blocked("generate-esdl", runId, data, FirstIssueCode(issues, "esdl_invalid"), "ESDL draft validation failed.", issues, new List<AscetTestValidationIssue>());
        }
        return AscetTestEnvelope.Success(
            "generate-esdl",
            runId,
            "drafted",
            data,
            new List<AscetTestValidationIssue>(),
            new Dictionary<string, object>
            {
                { "liveExecutionStarted", false },
                { "liveWritePerformed", false },
                { "schedulerUsed", false },
                { "readbackRequired", true }
            });
    }

    private static Dictionary<string, object> ResolveInspection(Dictionary<string, object> request)
    {
        Dictionary<string, object> inline = AscetTestContracts.GetDictionary(request, "inspection");
        if (inline != null) return inline;
        string path = AscetTestContracts.GetString(request, "inspectionPath");
        if (String.IsNullOrWhiteSpace(path)) return null;
        string resolved = AscetTestContracts.ResolvePath(path, Directory.GetCurrentDirectory());
        if (!File.Exists(resolved)) return null;
        return AscetTestContracts.ReadObject(resolved, "inspection");
    }

    private static List<Dictionary<string, object>> ParseMethodDrafts(Dictionary<string, object> request, Dictionary<string, object> inspection, List<AscetTestValidationIssue> issues)
    {
        List<Dictionary<string, object>> drafts = new List<Dictionary<string, object>>();
        IList raw = AscetTestContracts.GetValue(request, "methodDrafts") as IList;
        if (raw == null) return drafts;
        for (int index = 0; index < raw.Count; index++)
        {
            Dictionary<string, object> source = raw[index] as Dictionary<string, object>;
            if (source == null)
            {
                issues.Add(Issue("methodDrafts[" + index.ToString() + "]", "esdl_invalid", "methodDraft must be an object."));
                continue;
            }
            drafts.Add(new Dictionary<string, object>
            {
                { "methodName", AscetTestContracts.GetString(source, "methodName") },
                { "code", AscetTestContracts.GetString(source, "code") },
                { "language", "ESDL" },
                { "operation", String.IsNullOrWhiteSpace(AscetTestContracts.GetString(source, "operation")) ? "review" : AscetTestContracts.GetString(source, "operation") }
            });
        }
        return drafts;
    }

    private static void ValidateMethodDraft(Dictionary<string, object> method, Dictionary<string, object> inspection, int index, List<AscetTestValidationIssue> issues)
    {
        string prefix = "methodDrafts[" + index.ToString() + "]";
        string name = AscetTestContracts.GetString(method, "methodName");
        string code = AscetTestContracts.GetString(method, "code");
        string operation = AscetTestContracts.GetString(method, "operation");
        if (String.IsNullOrWhiteSpace(name)) issues.Add(Issue(prefix + ".methodName", "esdl_invalid", "methodName is required."));
        if (String.IsNullOrWhiteSpace(code)) issues.Add(Issue(prefix + ".code", "esdl_invalid", "ESDL method code must not be empty."));
        if (!IsBalanced(code)) issues.Add(Issue(prefix + ".code", "esdl_invalid", "ESDL method code has unbalanced delimiters."));
        if (operation != "create" && operation != "replace" && operation != "review") issues.Add(Issue(prefix + ".operation", "esdl_invalid", "operation must be create, replace or review."));
        if (inspection != null && (operation == "replace" || operation == "review") && !InspectionHasMethod(inspection, name))
        {
            issues.Add(Issue(prefix + ".methodName", "draft_target_mismatch", "replace/review draft method does not exist in inspection."));
        }
    }

    private static bool InspectionHasMethod(Dictionary<string, object> inspection, string name)
    {
        IList methods = AscetTestContracts.GetValue(inspection, "methods") as IList;
        if (methods == null) return false;
        for (int index = 0; index < methods.Count; index++)
        {
            Dictionary<string, object> method = methods[index] as Dictionary<string, object>;
            if (method != null && String.Equals(AscetTestContracts.GetString(method, "name"), name, StringComparison.Ordinal)) return true;
        }
        return false;
    }

    private static string RenderText(string componentPath, List<Dictionary<string, object>> methods)
    {
        List<string> lines = new List<string> { "/* ASCET ESDL draft v1 - review artifact; no live write performed. */", "/* target: " + componentPath + " */" };
        for (int index = 0; index < methods.Count; index++)
        {
            Dictionary<string, object> method = methods[index];
            lines.Add(String.Empty);
            lines.Add("/* method: " + AscetTestContracts.GetString(method, "methodName") + "; operation: " + AscetTestContracts.GetString(method, "operation") + " */");
            lines.Add(AscetTestContracts.GetString(method, "code").Trim());
        }
        return String.Join(Environment.NewLine, lines.ToArray()) + Environment.NewLine;
    }

    private static List<string> ExtractMethodNames(List<Dictionary<string, object>> methods)
    {
        List<string> result = new List<string>();
        for (int index = 0; index < methods.Count; index++) result.Add(AscetTestContracts.GetString(methods[index], "methodName"));
        return result;
    }

    private static bool IsBalanced(string value)
    {
        Dictionary<char, char> pairs = new Dictionary<char, char> { { ')', '(' }, { ']', '[' }, { '}', '{' } };
        List<char> stack = new List<char>();
        bool lineComment = false;
        bool blockComment = false;
        bool inString = false;
        char stringQuote = '\0';
        bool escaped = false;
        for (int index = 0; index < (value ?? String.Empty).Length; index++)
        {
            char current = value[index];
            char next = index + 1 < value.Length ? value[index + 1] : '\0';
            if (inString)
            {
                if (escaped) { escaped = false; continue; }
                if (current == '\\') { escaped = true; continue; }
                if (current == stringQuote) inString = false;
                continue;
            }
            if (lineComment) { if (current == '\n') lineComment = false; continue; }
            if (blockComment) { if (current == '*' && next == '/') { blockComment = false; index++; } continue; }
            if (current == '/' && next == '/') { lineComment = true; index++; continue; }
            if (current == '/' && next == '*') { blockComment = true; index++; continue; }
            if (current == '"' || current == '\'') { inString = true; stringQuote = current; continue; }
            if (current == '(' || current == '[' || current == '{') stack.Add(current);
            if (current == ')' || current == ']' || current == '}')
            {
                if (stack.Count == 0 || stack[stack.Count - 1] != pairs[current]) return false;
                stack.RemoveAt(stack.Count - 1);
            }
        }
        return !blockComment && !inString && stack.Count == 0;
    }

    private static AscetTestValidationIssue Issue(string path, string code, string message)
    {
        return new AscetTestValidationIssue { Path = path, Code = code, Message = message };
    }

    private static List<Dictionary<string, object>> IssuesToPayload(List<AscetTestValidationIssue> issues)
    {
        List<Dictionary<string, object>> result = new List<Dictionary<string, object>>();
        for (int index = 0; index < issues.Count; index++) result.Add(issues[index].ToDictionary());
        return result;
    }

    private static string FirstIssueCode(List<AscetTestValidationIssue> issues, string fallback)
    {
        return issues.Count == 0 || String.IsNullOrWhiteSpace(issues[0].Code) ? fallback : issues[0].Code;
    }

    private static string NormalizePath(string value)
    {
        return (value ?? String.Empty).Trim().Replace('\\', '/');
    }
}
