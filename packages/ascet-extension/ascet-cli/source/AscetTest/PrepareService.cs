using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;

public static class AscetTestPrepareService
{
    public static Dictionary<string, object> Execute(Dictionary<string, object> request)
    {
        string runId = AscetTestContracts.GetString(request, "runId");
        Dictionary<string, object> contract = ResolveContract(request);
        AscetTestValidationResult validation = AscetTestContractValidator.ValidateRequest(request, contract);
        ValidateToolchain(request, validation);

        Dictionary<string, object> data = BuildPrepareData(request, contract, validation);
        if (!validation.IsValid)
        {
            return AscetTestEnvelope.Blocked(
                "prepare",
                runId,
                data,
                "invalid_contract",
                "prepare rejected the request or test contract.",
                validation.Errors,
                validation.Warnings);
        }

        return AscetTestEnvelope.Success(
            "prepare",
            runId,
            data,
            validation.Warnings,
            new Dictionary<string, object>
            {
                { "liveExecutionStarted", false },
                { "schedulerUsed", false },
                { "schedulerRequiredForLiveActions", true }
            });
    }

    private static Dictionary<string, object> ResolveContract(Dictionary<string, object> request)
    {
        object inline;
        if (request != null && request.TryGetValue("contract", out inline))
        {
            Dictionary<string, object> inlineContract = inline as Dictionary<string, object>;
            if (inlineContract != null)
            {
                return inlineContract;
            }
        }

        string contractPath = AscetTestContracts.GetString(request, "testContractPath");
        if (String.IsNullOrWhiteSpace(contractPath))
        {
            return null;
        }

        string resolvedPath = Path.GetFullPath(contractPath);
        if (!File.Exists(resolvedPath))
        {
            return new Dictionary<string, object>
            {
                { "schemaVersion", AscetTestContractValidator.ContractSchema },
                { "componentPath", AscetTestContracts.GetString(request, "componentPath") },
                { "suites", new object[0] },
                { "_loadError", "testContractPath not found: " + resolvedPath }
            };
        }

        return AscetTestContracts.ReadObject(resolvedPath, "testContract");
    }

    private static void ValidateToolchain(Dictionary<string, object> request, AscetTestValidationResult validation)
    {
        object rawToolchain;
        Dictionary<string, object> toolchain = request != null && request.TryGetValue("toolchain", out rawToolchain)
            ? rawToolchain as Dictionary<string, object>
            : null;
        if (toolchain == null)
        {
            validation.Warnings.Add(new AscetTestValidationIssue
            {
                Path = "toolchain",
                Code = "toolchain_deferred",
                Message = "Toolchain paths were not supplied; build validation is deferred to the plan/build action."
            });
            return;
        }

        ValidateFilePath(toolchain, "cmakePath", validation);
        ValidateFilePath(toolchain, "gccPath", validation);
        ValidateFilePath(toolchain, "gxxPath", validation);
        ValidateDirectoryPath(toolchain, "googleTestRoot", validation);
        ValidateDirectoryPath(toolchain, "etasLegacyDirectory", validation);
    }

    private static void ValidateFilePath(Dictionary<string, object> toolchain, string key, AscetTestValidationResult validation)
    {
        string path = AscetTestContracts.GetString(toolchain, key);
        if (String.IsNullOrWhiteSpace(path))
        {
            return;
        }
        if (!File.Exists(Path.GetFullPath(path)))
        {
            validation.Errors.Add(new AscetTestValidationIssue
            {
                Path = "toolchain." + key,
                Code = "toolchain_missing",
                Message = "Toolchain file was not found: " + path
            });
        }
    }

    private static void ValidateDirectoryPath(Dictionary<string, object> toolchain, string key, AscetTestValidationResult validation)
    {
        string path = AscetTestContracts.GetString(toolchain, key);
        if (String.IsNullOrWhiteSpace(path))
        {
            return;
        }
        if (!Directory.Exists(Path.GetFullPath(path)))
        {
            validation.Errors.Add(new AscetTestValidationIssue
            {
                Path = "toolchain." + key,
                Code = "toolchain_missing",
                Message = "Toolchain directory was not found: " + path
            });
        }
    }

    private static Dictionary<string, object> BuildPrepareData(
        Dictionary<string, object> request,
        Dictionary<string, object> contract,
        AscetTestValidationResult validation)
    {
        string runId = AscetTestContracts.GetString(request, "runId");
        string componentPath = AscetTestContracts.GetString(request, "componentPath");
        bool executeLive = false;
        object liveValue;
        if (request != null && request.TryGetValue("executeLive", out liveValue) && liveValue is bool)
        {
            executeLive = (bool)liveValue;
        }

        Dictionary<string, object> data = new Dictionary<string, object>();
        data["schemaVersion"] = "ascet-test-prepare/v1";
        data["ready"] = validation.IsValid;
        data["runId"] = runId ?? String.Empty;
        data["componentPath"] = componentPath ?? String.Empty;
        data["levels"] = BuildLevels(request);
        data["contract"] = BuildContractSummary(contract);
        data["toolchain"] = BuildToolchainSummary(request);
        data["scheduler"] = new Dictionary<string, object>
        {
            { "liveResourceKey", "ascet.toolapi.global" },
            { "offlineResourceKey", "ascet.test." + (String.IsNullOrWhiteSpace(runId) ? "internal" : runId) },
            { "concurrency", 1 },
            { "executeLive", executeLive },
            { "usedByPrepare", false }
        };
        data["runDirectory"] = AscetTestContracts.GetString(request, "runDirectory");
        data["nextAction"] = executeLive ? "apply_after_review" : "inspect_or_export";
        data["validation"] = new Dictionary<string, object>
        {
            { "errorCount", validation.Errors.Count },
            { "warningCount", validation.Warnings.Count },
            { "errors", AscetTestContractValidator.IssuesToPayload(validation.Errors) },
            { "warnings", AscetTestContractValidator.IssuesToPayload(validation.Warnings) }
        };
        return data;
    }

    private static IList BuildLevels(Dictionary<string, object> request)
    {
        object raw;
        if (request == null || !request.TryGetValue("levels", out raw))
        {
            return new List<object>();
        }
        IList source = raw as IList;
        List<object> levels = new List<object>();
        if (source != null)
        {
            for (int index = 0; index < source.Count; index++)
            {
                levels.Add(Convert.ToString(source[index]) ?? String.Empty);
            }
        }
        return levels;
    }

    private static Dictionary<string, object> BuildContractSummary(Dictionary<string, object> contract)
    {
        string loadError = AscetTestContracts.GetString(contract, "_loadError");
        Dictionary<string, object> summary = new Dictionary<string, object>
        {
            { "present", contract != null && String.IsNullOrWhiteSpace(loadError) },
            { "schemaVersion", AscetTestContracts.GetString(contract, "schemaVersion") },
            { "componentPath", AscetTestContracts.GetString(contract, "componentPath") },
            { "loadError", loadError },
            { "suites", new List<object>() }
        };

        IList rawSuites = null;
        object suitesValue;
        if (contract != null && contract.TryGetValue("suites", out suitesValue)) rawSuites = suitesValue as IList;
        List<object> suites = new List<object>();
        if (rawSuites != null)
        {
            for (int index = 0; index < rawSuites.Count; index++)
            {
                Dictionary<string, object> suite = rawSuites[index] as Dictionary<string, object>;
                if (suite == null) continue;
                IList cases = null;
                object casesValue;
                if (suite.TryGetValue("cases", out casesValue)) cases = casesValue as IList;
                suites.Add(new Dictionary<string, object>
                {
                    { "id", AscetTestContracts.GetString(suite, "id") },
                    { "level", AscetTestContracts.GetString(suite, "level") },
                    { "entryPoint", AscetTestContracts.GetString(suite, "entryPoint") },
                    { "caseCount", cases == null ? 0 : cases.Count },
                    { "cycles", GetPositiveInteger(suite, "cycles", 1) }
                });
            }
        }
        summary["suites"] = suites;
        summary["suiteCount"] = suites.Count;
        return summary;
    }

    private static Dictionary<string, object> BuildToolchainSummary(Dictionary<string, object> request)
    {
        object raw;
        Dictionary<string, object> toolchain = request != null && request.TryGetValue("toolchain", out raw)
            ? raw as Dictionary<string, object>
            : null;
        return new Dictionary<string, object>
        {
            { "status", toolchain == null ? "deferred" : "provided" },
            { "cmakePath", AscetTestContracts.GetString(toolchain, "cmakePath") },
            { "gccPath", AscetTestContracts.GetString(toolchain, "gccPath") },
            { "gxxPath", AscetTestContracts.GetString(toolchain, "gxxPath") },
            { "googleTestRoot", AscetTestContracts.GetString(toolchain, "googleTestRoot") },
            { "etasLegacyDirectory", AscetTestContracts.GetString(toolchain, "etasLegacyDirectory") }
        };
    }

    private static int GetPositiveInteger(Dictionary<string, object> source, string key, int defaultValue)
    {
        object value;
        if (source == null || !source.TryGetValue(key, out value) || value == null) return defaultValue;
        try { return Convert.ToInt32(value); } catch { return defaultValue; }
    }
}
