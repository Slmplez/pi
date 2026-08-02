using System;
using System.Collections.Generic;
using System.IO;

public static class AscetTestArtifactWriter
{
    public static string ResolveRunDirectory(Dictionary<string, object> request, string runId)
    {
        string requested = AscetTestContracts.GetString(request, "runDirectory");
        if (!String.IsNullOrWhiteSpace(requested))
        {
            if (requested.IndexOf("..", StringComparison.Ordinal) >= 0)
            {
                throw new AscetTestCliException("unsafe_path", "runDirectory must not contain '..'.");
            }
            return AscetTestContracts.ResolvePath(requested, Directory.GetCurrentDirectory());
        }

        string safeRunId = String.IsNullOrWhiteSpace(runId) ? "internal" : runId.Trim();
        if (safeRunId.IndexOf("..", StringComparison.Ordinal) >= 0 || safeRunId.IndexOf(Path.DirectorySeparatorChar) >= 0 || safeRunId.IndexOf(Path.AltDirectorySeparatorChar) >= 0)
        {
            throw new AscetTestCliException("unsafe_path", "runId must not contain path separators or '..'.");
        }
        return Path.Combine(Directory.GetCurrentDirectory(), ".ascet", "tests", safeRunId);
    }

    public static string WriteJson(Dictionary<string, object> request, string runId, string fileName, Dictionary<string, object> payload)
    {
        string path = Path.Combine(ResolveRunDirectory(request, runId), fileName);
        AscetTestContracts.WriteJson(path, payload);
        return path;
    }

    public static string WriteText(Dictionary<string, object> request, string runId, string fileName, string content)
    {
        string path = Path.Combine(ResolveRunDirectory(request, runId), fileName);
        AscetTestContracts.WriteText(path, content);
        return path;
    }
}
