using System;
using System.Collections.Generic;

public sealed class AscetEsdlCoveragePrepareRequest
{
    public string ComponentPath { get; set; }
    public string TargetKind { get; set; }
    public string TargetMember { get; set; }
    public string OutputRootPath { get; set; }
    public string RunID { get; set; }
}

public sealed class AscetEsdlCoveragePreparePlan
{
    public string RunID { get; set; }
    public string OriginalComponentPath { get; set; }
    public string TargetKind { get; set; }
    public string TargetMember { get; set; }
    public string ShadowComponentPath { get; set; }
    public string ShadowHarnessPath { get; set; }
    public string ReportDirectoryPath { get; set; }
    public string ManifestPath { get; set; }
    public string TracePath { get; set; }
    public string ReportJsonPath { get; set; }
    public string ReportMarkdownPath { get; set; }
}

public sealed class AscetEsdlCoveragePreparePlanService
{
    private const int ShadowItemNameMaxLength = 80;

    public AscetEsdlCoveragePreparePlan BuildPlan(AscetEsdlCoveragePrepareRequest request, string requestFilePath)
    {
        if (request == null)
        {
            throw new AscetReadException("invalid_argument", "build_prepare_plan", "Prepare request is required.");
        }

        string componentPath = NormalizeRequiredValue(request.ComponentPath, "componentPath", "build_prepare_plan");
        string targetKind = NormalizeTargetKind(request.TargetKind, "build_prepare_plan");
        string targetMember = NormalizeRequiredValue(request.TargetMember, "targetMember", "build_prepare_plan");
        string outputRootPath = NormalizeRequiredValue(request.OutputRootPath, "outputRootPath", "build_prepare_plan");
        string runID = String.IsNullOrWhiteSpace(request.RunID)
            ? BuildDeterministicRunID(componentPath, targetMember)
            : NormalizeRunID(request.RunID);

        string shadowComponentPath = BuildShadowComponentPath(componentPath, runID);
        string shadowHarnessPath = String.Equals(targetKind, "class", StringComparison.Ordinal)
            ? BuildShadowHarnessPath(componentPath, runID)
            : String.Empty;
        string reportDirectoryPath = CombinePath(outputRootPath, runID);
        string manifestPath = CombinePath(reportDirectoryPath, "prepare.json");
        string tracePath = CombinePath(reportDirectoryPath, "trace.json");
        string reportJsonPath = CombinePath(reportDirectoryPath, "report.json");
        string reportMarkdownPath = CombinePath(reportDirectoryPath, "report.md");

        return new AscetEsdlCoveragePreparePlan
        {
            RunID = runID,
            OriginalComponentPath = componentPath,
            TargetKind = targetKind,
            TargetMember = targetMember,
            ShadowComponentPath = shadowComponentPath,
            ShadowHarnessPath = shadowHarnessPath,
            ReportDirectoryPath = reportDirectoryPath,
            ManifestPath = manifestPath,
            TracePath = tracePath,
            ReportJsonPath = reportJsonPath,
            ReportMarkdownPath = reportMarkdownPath
        };
    }

    public AscetEsdlCoveragePrepareRequest ParseRequestJson(string json)
    {
        if (String.IsNullOrWhiteSpace(json))
        {
            throw new AscetReadException("invalid_argument", "parse_prepare_request", "Prepare request JSON must not be empty.");
        }

        Dictionary<string, object> payload = AscetJsonContract.DeserializeObject(json);
        if (payload == null)
        {
            throw new AscetReadException("invalid_argument", "parse_prepare_request", "Prepare request JSON could not be parsed.");
        }

        return new AscetEsdlCoveragePrepareRequest
        {
            ComponentPath = GetString(payload, "componentPath"),
            TargetKind = GetString(payload, "targetKind"),
            TargetMember = GetString(payload, "targetMember"),
            OutputRootPath = GetString(payload, "outputRootPath"),
            RunID = GetString(payload, "runId")
        };
    }

    private string BuildDeterministicRunID(string componentPath, string targetMember)
    {
        string folderPath;
        string itemName;
        SplitComponentPath(componentPath, out folderPath, out itemName);
        string combined = (itemName ?? String.Empty) + "-" + (targetMember ?? String.Empty);
        combined = combined.Replace('\\', '-').Replace('/', '-').Replace('_', '-');
        List<char> chars = new List<char>();
        bool previousDash = false;

        for (int i = 0; i < combined.Length; i++)
        {
            char value = Char.ToLowerInvariant(combined[i]);
            if (Char.IsLetterOrDigit(value))
            {
                chars.Add(value);
                previousDash = false;
                continue;
            }

            if (!previousDash)
            {
                chars.Add('-');
                previousDash = true;
            }
        }

        string result = new string(chars.ToArray()).Trim('-');
        if (String.IsNullOrWhiteSpace(result))
        {
            throw new AscetReadException("invalid_argument", "build_prepare_plan", "Could not derive a deterministic runId from the request.");
        }

        return result;
    }

    private string NormalizeRunID(string value)
    {
        string runID = NormalizeRequiredValue(value, "runId", "build_prepare_plan").ToLowerInvariant();
        List<char> chars = new List<char>();
        bool previousDash = false;

        for (int i = 0; i < runID.Length; i++)
        {
            char current = runID[i];
            if (Char.IsLetterOrDigit(current))
            {
                chars.Add(current);
                previousDash = false;
                continue;
            }

            if ((current == '-' || current == '_') && !previousDash)
            {
                chars.Add('-');
                previousDash = true;
                continue;
            }

            throw new AscetReadException("invalid_argument", "build_prepare_plan", "runId contains unsupported characters.");
        }

        string normalized = new string(chars.ToArray()).Trim('-');
        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException("invalid_argument", "build_prepare_plan", "runId must contain at least one alphanumeric character.");
        }

        return normalized;
    }

    private string BuildShadowComponentPath(string componentPath, string runID)
    {
        string folderPath;
        string itemName;
        SplitComponentPath(componentPath, out folderPath, out itemName);
        string shadowItemName = NormalizeAscetShadowItemName(itemName + "__cov__" + NormalizeRunIDForItemName(runID));
        return String.IsNullOrWhiteSpace(folderPath)
            ? shadowItemName
            : folderPath + "\\" + shadowItemName;
    }

    private string BuildShadowHarnessPath(string componentPath, string runID)
    {
        string folderPath;
        string itemName;
        SplitComponentPath(componentPath, out folderPath, out itemName);
        string harnessItemName = NormalizeAscetShadowItemName(itemName + "__cov_harness__" + NormalizeRunIDForItemName(runID));
        return String.IsNullOrWhiteSpace(folderPath)
            ? harnessItemName
            : folderPath + "\\" + harnessItemName;
    }

    private void SplitComponentPath(string componentPath, out string folderPath, out string itemName)
    {
        string normalized = NormalizeRequiredValue(componentPath, "componentPath", "split_component_path").Replace('/', '\\');
        int separator = normalized.LastIndexOf('\\');
        if (separator < 0)
        {
            folderPath = String.Empty;
            itemName = normalized;
            return;
        }

        folderPath = normalized.Substring(0, separator);
        itemName = normalized.Substring(separator + 1);
    }

    private string CombinePath(string left, string right)
    {
        if (String.IsNullOrWhiteSpace(left))
        {
            return right ?? String.Empty;
        }

        if (String.IsNullOrWhiteSpace(right))
        {
            return left;
        }

        string normalizedLeft = left.TrimEnd('\\', '/');
        string normalizedRight = right.TrimStart('\\', '/');
        return normalizedLeft + "\\" + normalizedRight;
    }

    private string NormalizeRequiredValue(string value, string fieldName, string operation)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            throw new AscetReadException("invalid_argument", operation, fieldName + " must not be empty.");
        }

        return value.Trim();
    }

    private string NormalizeTargetKind(string value, string operation)
    {
        string targetKind = NormalizeRequiredValue(value, "targetKind", operation).ToLowerInvariant();
        switch (targetKind)
        {
            case "class":
            case "module":
                return targetKind;
            default:
                throw new AscetReadException("invalid_argument", operation, "targetKind must be class or module for the current planning slice.");
        }
    }

    private string NormalizeAscetShadowItemName(string value)
    {
        string itemName = NormalizeRequiredValue(value, "shadowItemName", "normalize_shadow_item_name");
        if (itemName.Length > ShadowItemNameMaxLength)
        {
            throw new AscetReadException("invalid_argument", "normalize_shadow_item_name", "Shadow item name exceeds the supported length limit.");
        }

        for (int i = 0; i < itemName.Length; i++)
        {
            char current = itemName[i];
            if (Char.IsLetterOrDigit(current) || current == '_')
            {
                continue;
            }

            throw new AscetReadException("invalid_argument", "normalize_shadow_item_name", "Shadow item name contains unsupported characters.");
        }

        return itemName;
    }

    private string NormalizeRunIDForItemName(string runID)
    {
        return NormalizeRequiredValue(runID, "runId", "normalize_run_id_for_item_name").Replace('-', '_');
    }

    private string GetString(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key))
        {
            return String.Empty;
        }

        object value = payload[key];
        return value == null ? String.Empty : value.ToString();
    }
}
