using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;

public sealed class AscetTestValidationIssue
{
    public string Path { get; set; }
    public string Code { get; set; }
    public string Message { get; set; }

    public Dictionary<string, object> ToDictionary()
    {
        return new Dictionary<string, object>
        {
            { "path", Path ?? String.Empty },
            { "code", Code ?? String.Empty },
            { "message", Message ?? String.Empty }
        };
    }
}

public sealed class AscetTestValidationResult
{
    public AscetTestValidationResult()
    {
        Errors = new List<AscetTestValidationIssue>();
        Warnings = new List<AscetTestValidationIssue>();
    }

    public IList<AscetTestValidationIssue> Errors { get; private set; }
    public IList<AscetTestValidationIssue> Warnings { get; private set; }
    public bool IsValid { get { return Errors.Count == 0; } }
}

public static class AscetTestContractValidator
{
    public const string RequestSchema = "ascet-test-request/v1";
    public const string ContractSchema = "ascet-test-contract/v1";

    public static AscetTestValidationResult ValidateRequest(
        IDictionary<string, object> request,
        IDictionary<string, object> contract)
    {
        AscetTestValidationResult result = new AscetTestValidationResult();
        if (request == null)
        {
            AddError(result, "$", "request_shape", "Request root must be an object.");
            return result;
        }

        RequireString(request, "schemaVersion", "schema_version", RequestSchema, result);
        RequireString(request, "runId", "required", null, result);
        ValidateRelativePath(GetString(request, "componentPath"), "componentPath", result);
        ValidateLevels(GetList(request, "levels"), "levels", result);

        bool executeLive = GetBoolean(request, "executeLive");
        if (executeLive && String.IsNullOrWhiteSpace(GetString(request, "approvedRevisionId")))
        {
            AddError(result, "approvedRevisionId", "approval_missing", "executeLive requires approvedRevisionId.");
        }

        if (contract == null)
        {
            AddError(result, "contract", "contract_missing", "Provide contract or testContractPath.");
        }
        else
        {
            string loadError = GetString(contract, "_loadError");
            if (!String.IsNullOrWhiteSpace(loadError))
            {
                AddError(result, "testContractPath", "test_contract_missing", loadError);
            }
            Merge(result, ValidateContract(contract));
            string requestComponent = NormalizePath(GetString(request, "componentPath"));
            string contractComponent = NormalizePath(GetString(contract, "componentPath"));
            if (!String.IsNullOrWhiteSpace(requestComponent) &&
                !String.IsNullOrWhiteSpace(contractComponent) &&
                !String.Equals(requestComponent, contractComponent, StringComparison.OrdinalIgnoreCase))
            {
                AddError(result, "contract.componentPath", "component_mismatch", "Contract componentPath must match request componentPath.");
            }
        }

        ValidateOptionalRunDirectory(request, result);
        return result;
    }

    public static AscetTestValidationResult ValidateContract(IDictionary<string, object> contract)
    {
        AscetTestValidationResult result = new AscetTestValidationResult();
        if (contract == null)
        {
            AddError(result, "contract", "contract_shape", "Contract must be an object.");
            return result;
        }

        if (!String.IsNullOrWhiteSpace(GetString(contract, "_loadError")))
        {
            return result;
        }

        RequireString(contract, "schemaVersion", "schema_version", ContractSchema, result);
        ValidateRelativePath(GetString(contract, "componentPath"), "contract.componentPath", result);
        IList suites = GetList(contract, "suites");
        if (suites == null || suites.Count == 0)
        {
            AddError(result, "contract.suites", "suites_missing", "Contract must contain at least one suite.");
            return result;
        }

        HashSet<string> suiteIds = new HashSet<string>(StringComparer.Ordinal);
        for (int index = 0; index < suites.Count; index++)
        {
            IDictionary<string, object> suite = AsDictionary(suites[index]);
            string path = "contract.suites[" + index.ToString() + "]";
            if (suite == null)
            {
                AddError(result, path, "suite_shape", "Suite must be an object.");
                continue;
            }

            string id = RequireString(suite, "id", "required", null, result, path + ".id");
            if (!String.IsNullOrWhiteSpace(id) && !suiteIds.Add(id))
            {
                AddError(result, path + ".id", "duplicate_suite", "Duplicate suite id '" + id + "'.");
            }

            string level = GetString(suite, "level");
            if (!IsLevel(level))
            {
                AddError(result, path + ".level", "invalid_level", "Suite level must be class_ut or component_ct.");
            }

            string entryPoint = RequireString(suite, "entryPoint", "required", null, result, path + ".entryPoint");
            string dependencyMode = GetString(suite, "dependencyMode");
            if (!String.Equals(dependencyMode, "stub", StringComparison.Ordinal) &&
                !String.Equals(dependencyMode, "real", StringComparison.Ordinal))
            {
                AddError(result, path + ".dependencyMode", "invalid_dependency_mode", "dependencyMode must be stub or real.");
            }
            if (String.Equals(level, "class_ut", StringComparison.Ordinal) && !String.Equals(dependencyMode, "stub", StringComparison.Ordinal))
            {
                AddError(result, path + ".dependencyMode", "class_ut_dependency_mode", "class_ut requires stub dependencies.");
            }
            if (String.Equals(level, "component_ct", StringComparison.Ordinal) && !String.Equals(dependencyMode, "real", StringComparison.Ordinal))
            {
                AddError(result, path + ".dependencyMode", "component_ct_dependency_mode", "component_ct requires real dependencies.");
            }

            int cycles = GetPositiveInteger(suite, "cycles", 1);
            if (cycles < 1)
            {
                AddError(result, path + ".cycles", "invalid_cycles", "cycles must be a positive integer.");
            }

            IList cases = GetList(suite, "cases");
            if (cases == null || cases.Count == 0)
            {
                AddError(result, path + ".cases", "cases_missing", "Suite must contain at least one case.");
                continue;
            }

            HashSet<string> caseIds = new HashSet<string>(StringComparer.Ordinal);
            for (int caseIndex = 0; caseIndex < cases.Count; caseIndex++)
            {
                IDictionary<string, object> testCase = AsDictionary(cases[caseIndex]);
                string casePath = path + ".cases[" + caseIndex.ToString() + "]";
                if (testCase == null)
                {
                    AddError(result, casePath, "case_shape", "Case must be an object.");
                    continue;
                }

                string caseId = RequireString(testCase, "id", "required", null, result, casePath + ".id");
                if (!String.IsNullOrWhiteSpace(caseId) && !caseIds.Add(caseId))
                {
                    AddError(result, casePath + ".id", "duplicate_case", "Duplicate case id '" + caseId + "'.");
                }

                if (GetPositiveInteger(testCase, "steps", 1) < 1)
                {
                    AddError(result, casePath + ".steps", "invalid_steps", "steps must be a positive integer.");
                }

                IDictionary<string, object> expectedOutputs = AsDictionary(GetValue(testCase, "expectedOutputs"));
                IList expectedSteps = GetList(testCase, "expectedSteps");
                if ((expectedOutputs == null || expectedOutputs.Count == 0) && (expectedSteps == null || expectedSteps.Count == 0))
                {
                    AddWarning(result, casePath, "trace_only_case", "Case has no expected outputs; it cannot prove a passing behavior.");
                }

                string oracleSource = GetString(testCase, "oracleSource");
                if (String.IsNullOrWhiteSpace(oracleSource))
                {
                    oracleSource = "derived";
                }
                if (!String.Equals(oracleSource, "requirement", StringComparison.Ordinal) &&
                    !String.Equals(oracleSource, "derived", StringComparison.Ordinal) &&
                    !String.Equals(oracleSource, "trace", StringComparison.Ordinal))
                {
                    AddError(result, casePath + ".oracleSource", "invalid_oracle_source", "oracleSource must be requirement, derived or trace.");
                }
            }
        }

        return result;
    }

    public static Dictionary<string, object> IssuesToPayload(IList<AscetTestValidationIssue> issues)
    {
        List<Dictionary<string, object>> payload = new List<Dictionary<string, object>>();
        if (issues != null)
        {
            for (int index = 0; index < issues.Count; index++)
            {
                payload.Add(issues[index].ToDictionary());
            }
        }
        return new Dictionary<string, object> { { "items", payload }, { "count", payload.Count } };
    }

    private static void ValidateLevels(IList levels, string path, AscetTestValidationResult result)
    {
        if (levels == null || levels.Count == 0)
        {
            AddError(result, path, "levels_missing", "levels must contain at least one level.");
            return;
        }

        HashSet<string> seen = new HashSet<string>(StringComparer.Ordinal);
        for (int index = 0; index < levels.Count; index++)
        {
            string level = Convert.ToString(levels[index]) ?? String.Empty;
            if (!IsLevel(level))
            {
                AddError(result, path + "[" + index.ToString() + "]", "invalid_level", "Level must be class_ut or component_ct.");
            }
            else if (!seen.Add(level))
            {
                AddError(result, path + "[" + index.ToString() + "]", "duplicate_level", "Duplicate level '" + level + "'.");
            }
        }
    }

    private static void ValidateOptionalRunDirectory(IDictionary<string, object> request, AscetTestValidationResult result)
    {
        string runDirectory = GetString(request, "runDirectory");
        if (String.IsNullOrWhiteSpace(runDirectory))
        {
            return;
        }

        if (runDirectory.IndexOf("..", StringComparison.Ordinal) >= 0)
        {
            AddError(result, "runDirectory", "unsafe_path", "runDirectory must not contain '..'.");
        }
    }

    private static bool IsLevel(string level)
    {
        return String.Equals(level, "class_ut", StringComparison.Ordinal) ||
               String.Equals(level, "component_ct", StringComparison.Ordinal);
    }

    private static string ValidateRelativePath(string value, string path, AscetTestValidationResult result)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            AddError(result, path, "required", path + " is required.");
            return String.Empty;
        }

        string normalized = NormalizePath(value);
        if (Path.IsPathRooted(value) || normalized.StartsWith("/", StringComparison.Ordinal) || normalized.Contains("../"))
        {
            AddError(result, path, "unsafe_path", path + " must be a relative ASCET path without '..'.");
        }
        return normalized;
    }

    private static string NormalizePath(string value)
    {
        return (value ?? String.Empty).Trim().Replace('\\', '/');
    }

    private static string RequireString(
        IDictionary<string, object> source,
        string key,
        string code,
        string expected,
        AscetTestValidationResult result,
        string path = null)
    {
        string value = GetString(source, key);
        string issuePath = String.IsNullOrWhiteSpace(path) ? key : path;
        if (String.IsNullOrWhiteSpace(value))
        {
            AddError(result, issuePath, "required", issuePath + " is required.");
        }
        else if (!String.IsNullOrWhiteSpace(expected) && !String.Equals(value, expected, StringComparison.Ordinal))
        {
            AddError(result, issuePath, code, issuePath + " must be " + expected + ".");
        }
        return value.Trim();
    }

    private static int GetPositiveInteger(IDictionary<string, object> source, string key, int defaultValue)
    {
        object value = GetValue(source, key);
        if (value == null)
        {
            return defaultValue;
        }

        try
        {
            int parsed = Convert.ToInt32(value);
            return parsed;
        }
        catch
        {
            return 0;
        }
    }

    private static bool GetBoolean(IDictionary<string, object> source, string key)
    {
        object value = GetValue(source, key);
        return value is bool && (bool)value;
    }

    private static string GetString(IDictionary<string, object> source, string key)
    {
        object value = GetValue(source, key);
        return value == null ? String.Empty : Convert.ToString(value) ?? String.Empty;
    }

    private static object GetValue(IDictionary<string, object> source, string key)
    {
        object value;
        return source != null && source.TryGetValue(key, out value) ? value : null;
    }

    private static IList GetList(IDictionary<string, object> source, string key)
    {
        object value = GetValue(source, key);
        return value as IList;
    }

    private static IDictionary<string, object> AsDictionary(object value)
    {
        return value as IDictionary<string, object>;
    }

    private static void Merge(AscetTestValidationResult target, AscetTestValidationResult source)
    {
        if (source == null)
        {
            return;
        }
        for (int index = 0; index < source.Errors.Count; index++) target.Errors.Add(source.Errors[index]);
        for (int index = 0; index < source.Warnings.Count; index++) target.Warnings.Add(source.Warnings[index]);
    }

    private static void AddError(AscetTestValidationResult result, string path, string code, string message)
    {
        result.Errors.Add(new AscetTestValidationIssue { Path = path, Code = code, Message = message });
    }

    private static void AddWarning(AscetTestValidationResult result, string path, string code, string message)
    {
        result.Warnings.Add(new AscetTestValidationIssue { Path = path, Code = code, Message = message });
    }
}
