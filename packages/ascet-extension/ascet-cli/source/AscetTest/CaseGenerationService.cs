using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;

public static class AscetTestCaseGenerationService
{
    public static Dictionary<string, object> Execute(Dictionary<string, object> request)
    {
        string runId = AscetTestContracts.GetString(request, "runId");
        string componentPath = NormalizePath(AscetTestContracts.GetString(request, "componentPath"));
        Dictionary<string, object> inspection = ResolveInspection(request);
        List<AscetTestValidationIssue> errors = new List<AscetTestValidationIssue>();
        if (inspection == null) errors.Add(Issue("inspection", "inspection_incomplete", "A versioned inspection is required before generating cases."));
        else
        {
            if (AscetTestContracts.GetString(inspection, "schemaVersion") != "ascet-inspection/v1") errors.Add(Issue("inspection.schemaVersion", "inspection_incomplete", "Inspection schema must be ascet-inspection/v1."));
            if (!AscetTestContracts.GetBoolean(inspection, "complete", false)) errors.Add(Issue("inspection.complete", "inspection_incomplete", "Inspection is incomplete."));
            if (!String.Equals(NormalizePath(AscetTestContracts.GetString(inspection, "componentPath")), componentPath, StringComparison.OrdinalIgnoreCase)) errors.Add(Issue("componentPath", "draft_target_mismatch", "Case componentPath must match inspection.componentPath."));
        }

        List<string> levels = ParseLevels(request, errors);
        List<Dictionary<string, object>> suites = new List<Dictionary<string, object>>();
        List<string> notes = new List<string> { "Cases are generated deterministically from inspection metadata and the supplied seed." };
        if (inspection != null && !AscetTestContracts.GetBoolean(inspection, "complete", false)) notes.Add("Source inspection is incomplete; generated cases remain review-only until inspect succeeds.");
        if (inspection != null)
        {
            if (levels.Contains("class_ut"))
            {
                IList methods = AscetTestContracts.GetValue(inspection, "methods") as IList;
                if (methods == null || methods.Count == 0)
                {
                    suites.Add(BuildClassSuite(LeafName(componentPath), inspection));
                    notes.Add("No methods were discovered; a component-level class_ut placeholder was emitted.");
                }
                else
                {
                    for (int index = 0; index < methods.Count; index++)
                    {
                        Dictionary<string, object> method = methods[index] as Dictionary<string, object>;
                        string name = method == null ? String.Empty : AscetTestContracts.GetString(method, "name");
                        if (!String.IsNullOrWhiteSpace(name)) suites.Add(BuildClassSuite(name, inspection));
                    }
                }
            }
            if (levels.Contains("component_ct")) suites.Add(BuildComponentSuite(componentPath, inspection, AscetTestContracts.GetInteger(request, "cycles", 3)));
        }

        string sourceHash = inspection == null ? String.Empty : AscetTestContracts.GetString(inspection, "sourceHash");
        if (String.IsNullOrWhiteSpace(sourceHash) && inspection != null) sourceHash = AscetTestContracts.ComputeSha256(AscetTestContracts.Serialize(inspection));
        string seed = AscetTestContracts.GetString(request, "seed");
        if (String.IsNullOrWhiteSpace(seed)) seed = AscetTestContracts.ComputeSha256(sourceHash + "|" + String.Join(",", levels.ToArray())).Substring(0, 16);

        Dictionary<string, object> contract = new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-test-contract/v1" },
            { "componentPath", componentPath },
            { "suites", suites }
        };
        AscetTestValidationResult contractValidation = AscetTestContractValidator.ValidateContract(contract);
        MergeErrors(errors, contractValidation.Errors);
        Dictionary<string, object> generated = new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-generated-cases/v1" },
            { "runId", runId },
            { "componentPath", componentPath },
            { "sourceInspectionHash", sourceHash },
            { "seed", seed },
            { "deterministic", true },
            { "levels", levels },
            { "contract", contract },
            { "generationNotes", notes }
        };
        string inspectionPath = String.Empty;
        if (inspection != null) inspectionPath = AscetTestArtifactWriter.WriteJson(request, runId, "inspection.json", inspection);
        string casesPath = AscetTestArtifactWriter.WriteJson(request, runId, "cases.json", generated);
        Dictionary<string, object> data = new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-test-cases/v1" },
            { "ready", errors.Count == 0 },
            { "runId", runId },
            { "componentPath", componentPath },
            { "generated", generated },
            { "inspectionPath", inspectionPath },
            { "casesPath", casesPath },
            { "liveWritePerformed", false }
        };
        List<AscetTestValidationIssue> warnings = new List<AscetTestValidationIssue>();
        for (int index = 0; index < contractValidation.Warnings.Count; index++) warnings.Add(contractValidation.Warnings[index]);
        if (errors.Count > 0) return AscetTestEnvelope.Blocked("generate-cases", runId, data, FirstIssueCode(errors, "cases_invalid"), "Generated test cases failed validation.", errors, warnings);
        return AscetTestEnvelope.Success(
            "generate-cases",
            runId,
            "cases_ready",
            data,
            warnings,
            new Dictionary<string, object>
            {
                { "liveExecutionStarted", false },
                { "liveWritePerformed", false },
                { "schedulerUsed", false },
                { "deterministic", true }
            });
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

    private static List<string> ParseLevels(Dictionary<string, object> request, List<AscetTestValidationIssue> errors)
    {
        List<string> levels = new List<string>();
        IList raw = AscetTestContracts.GetValue(request, "levels") as IList;
        if (raw == null || raw.Count == 0) { levels.Add("class_ut"); levels.Add("component_ct"); return levels; }
        for (int index = 0; index < raw.Count; index++)
        {
            string level = Convert.ToString(raw[index]);
            if (level != "class_ut" && level != "component_ct") errors.Add(Issue("levels[" + index.ToString() + "]", "invalid_level", "Level must be class_ut or component_ct."));
            else if (!levels.Contains(level)) levels.Add(level);
            else errors.Add(Issue("levels[" + index.ToString() + "]", "duplicate_level", "Duplicate level '" + level + "'."));
        }
        return levels;
    }

    private static Dictionary<string, object> BuildClassSuite(string methodName, Dictionary<string, object> inspection)
    {
        List<Dictionary<string, object>> cases = new List<Dictionary<string, object>>
        {
            Case("nominal", "requirement", 1, new Dictionary<string, object>(), new string[0]),
            Case("initialization", "derived", 1, new Dictionary<string, object>(), new string[0]),
            Case("repeated_invocation", "derived", 3, new Dictionary<string, object>(), new string[0])
        };
        foreach (Dictionary<string, object> port in InputPorts(inspection))
        {
            string name = AscetTestContracts.GetString(port, "name");
            double min;
            if (TryNumber(GetValue(port, "min"), out min)) cases.Add(Case(SafeId(name) + "_lower_bound", "derived", 1, Values(name, min), new string[0]));
            double max;
            if (TryNumber(GetValue(port, "max"), out max)) cases.Add(Case(SafeId(name) + "_upper_bound", "derived", 1, Values(name, max), new string[0]));
            Dictionary<string, object> metadata = ToDictionary(GetValue(port, "metadata"));
            double threshold;
            if (metadata != null && TryNumber(GetValue(metadata, "threshold") ?? GetValue(metadata, "trigger") ?? GetValue(metadata, "limit"), out threshold))
            {
                double step = Step(port, threshold);
                cases.Add(Case(SafeId(name) + "_threshold_below", "derived", 1, Values(name, threshold - step), new string[0]));
                cases.Add(Case(SafeId(name) + "_threshold_at", "requirement", 1, Values(name, threshold), new string[0]));
                cases.Add(Case(SafeId(name) + "_threshold_above", "derived", 1, Values(name, threshold + step), new string[0]));
            }
            bool allowsInvalid = metadata != null && (AscetTestContracts.GetBoolean(metadata, "allowInvalid", false) || AscetTestContracts.GetBoolean(metadata, "allowsInvalidInputs", false));
            if (allowsInvalid)
            {
                double invalid;
                if (TryNumber(GetValue(port, "min"), out min)) invalid = min - Step(port, min);
                else if (TryNumber(GetValue(port, "max"), out max)) invalid = max + Step(port, max);
                else continue;
                cases.Add(Case(SafeId(name) + "_invalid_input", "derived", 1, Values(name, invalid), new[] { "invalid_input", "allowed_by_inspection" }));
            }
        }
        return new Dictionary<string, object>
        {
            { "id", SafeId(methodName) + "_class_ut" },
            { "level", "class_ut" },
            { "entryPoint", methodName },
            { "dependencyMode", "stub" },
            { "cases", cases }
        };
    }

    private static Dictionary<string, object> BuildComponentSuite(string componentPath, Dictionary<string, object> inspection, int cycles)
    {
        if (cycles < 1) cycles = 1;
        List<Dictionary<string, object>> cases = new List<Dictionary<string, object>>
        {
            Case("component_initialization", "derived", 1, new Dictionary<string, object>(), new string[0]),
            Case("multi_cycle_sequence", "derived", cycles, new Dictionary<string, object>(), new string[0]),
            Case("input_transition", "derived", 2, new Dictionary<string, object>(), new[] { "transition" }),
            Case("output_oracle", "requirement", 1, new Dictionary<string, object>(), new[] { "oracle" }),
            Case("external_environment", "derived", 1, new Dictionary<string, object>(), new[] { "environment" })
        };
        if (GetValue(inspection, "stateMachine") != null) cases.Insert(3, Case("state_transition", "derived", 2, new Dictionary<string, object>(), new[] { "state_machine" }));
        return new Dictionary<string, object>
        {
            { "id", SafeId(LeafName(componentPath)) + "_component_ct" },
            { "level", "component_ct" },
            { "entryPoint", LeafName(componentPath) },
            { "dependencyMode", "real" },
            { "cycles", cycles },
            { "cases", cases }
        };
    }

    private static List<Dictionary<string, object>> InputPorts(Dictionary<string, object> inspection)
    {
        Dictionary<string, object> interfaces = ToDictionary(GetValue(inspection, "interfaces"));
        List<Dictionary<string, object>> ports = new List<Dictionary<string, object>>();
        foreach (object item in AsList(GetValue(interfaces, "inputs")))
        {
            Dictionary<string, object> port = ToDictionary(item);
            if (port != null) ports.Add(port);
        }
        return ports;
    }

    private static Dictionary<string, object> Case(string id, string oracleSource, int steps, Dictionary<string, object> inputs, string[] tags)
    {
        List<string> tagList = new List<string>(tags ?? new string[0]);
        return new Dictionary<string, object>
        {
            { "id", id },
            { "steps", steps < 1 ? 1 : steps },
            { "inputs", inputs },
            { "expectedOutputs", new Dictionary<string, object>() },
            { "expectedSteps", new List<object>() },
            { "oracleSource", oracleSource },
            { "tags", tagList }
        };
    }

    private static Dictionary<string, object> Values(string name, double value)
    {
        return new Dictionary<string, object> { { name, value } };
    }

    private static double Step(Dictionary<string, object> port, double baseValue)
    {
        double step;
        if (TryNumber(GetValue(port, "step"), out step) && step > 0) return step;
        return Math.Abs(baseValue) > 0 ? Math.Max(Math.Abs(baseValue) * 0.01, 0.000001) : 1;
    }

    private static bool TryNumber(object value, out double result)
    {
        try { result = Convert.ToDouble(value); return value != null && !Double.IsNaN(result) && !Double.IsInfinity(result); }
        catch { result = 0; return false; }
    }

    private static List<object> AsList(object value)
    {
        List<object> result = new List<object>();
        IList raw = value as IList;
        if (raw == null) return result;
        for (int index = 0; index < raw.Count; index++) result.Add(raw[index]);
        return result;
    }

    private static Dictionary<string, object> ToDictionary(object value) { return value as Dictionary<string, object>; }
    private static object GetValue(Dictionary<string, object> source, string key) { object value; return source != null && source.TryGetValue(key, out value) ? value : null; }

    private static string SafeId(string value) { return String.IsNullOrWhiteSpace(value) ? "component" : System.Text.RegularExpressions.Regex.Replace(value.Trim(), "[^A-Za-z0-9_]+", "_").Trim('_'); }
    private static string LeafName(string value) { string[] parts = (value ?? String.Empty).Replace('\\', '/').Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries); return parts.Length == 0 ? "component" : parts[parts.Length - 1]; }
    private static string NormalizePath(string value) { return (value ?? String.Empty).Trim().Replace('\\', '/'); }

    private static void MergeErrors(List<AscetTestValidationIssue> target, IList<AscetTestValidationIssue> source) { for (int index = 0; source != null && index < source.Count; index++) target.Add(source[index]); }
    private static AscetTestValidationIssue Issue(string path, string code, string message) { return new AscetTestValidationIssue { Path = path, Code = code, Message = message }; }
    private static string FirstIssueCode(List<AscetTestValidationIssue> issues, string fallback) { return issues.Count == 0 || String.IsNullOrWhiteSpace(issues[0].Code) ? fallback : issues[0].Code; }
}
