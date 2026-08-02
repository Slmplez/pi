using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Xml;

public static class AscetTestEvidenceService
{
    public static Dictionary<string, object> Collect(
        Dictionary<string, object> request,
        string runDirectory)
    {
        Dictionary<string, object> evidence = new Dictionary<string, object>();
        string buildPath = ResolveArtifactPath(request, "buildResultPath", Path.Combine(runDirectory, "build-result.json"));
        string runPath = ResolveArtifactPath(request, "runResultPath", Path.Combine(runDirectory, "run-result.json"));
        Dictionary<string, object> build = ReadJson(buildPath);
        Dictionary<string, object> run = ReadJson(runPath);
        string exportPath = ResolveArtifactPath(request, "exportResultPath", Path.Combine(runDirectory, "live-export.json"));
        string projectExportPath = ResolveArtifactPath(request, "projectExportResultPath", Path.Combine(runDirectory, "live-export-project.json"));
        string manifestPath = ResolveArtifactPath(request, "exportManifestPath", Path.Combine(runDirectory, "export-manifest.json"));
        string xmlPath = run == null ? String.Empty : AscetTestContracts.GetString(run, "gtestXmlPath");
        if (String.IsNullOrWhiteSpace(xmlPath)) xmlPath = Path.Combine(runDirectory, "google-test", "test-results.xml");
        xmlPath = AscetTestContracts.ResolvePath(xmlPath, runDirectory);

        evidence["paths"] = new Dictionary<string, object>
        {
            { "runDirectory", runDirectory },
            { "buildResult", buildPath },
            { "runResult", runPath },
            { "exportResult", exportPath },
            { "projectExportResult", projectExportPath },
            { "exportManifest", manifestPath },
            { "gtestXml", xmlPath }
        };
        evidence["buildResult"] = build;
        evidence["runResult"] = run;
        evidence["exportResult"] = ReadJson(exportPath);
        evidence["projectExportResult"] = ReadJson(projectExportPath);
        evidence["exportManifest"] = ReadJson(manifestPath);
        evidence["gtestXml"] = ReadXml(xmlPath);
        return evidence;
    }

    public static Dictionary<string, object> ReadJson(string path)
    {
        if (String.IsNullOrWhiteSpace(path) || !File.Exists(path)) return null;
        try { return AscetTestContracts.ReadObject(path, "evidence"); }
        catch { return null; }
    }

    public static Dictionary<string, object> ReadXml(string path)
    {
        Dictionary<string, object> result = new Dictionary<string, object>
        {
            { "path", path },
            { "exists", File.Exists(path) },
            { "valid", false },
            { "testsRun", 0 },
            { "failures", 0 },
            { "errors", 0 },
            { "disabled", 0 },
            { "testNames", new List<object>() }
        };
        if (!File.Exists(path)) return result;
        try
        {
            XmlDocument document = new XmlDocument();
            document.Load(path);
            XmlElement root = document.DocumentElement;
            if (root == null || !String.Equals(root.Name, "testsuites", StringComparison.OrdinalIgnoreCase)) return result;
            int tests = ReadAttribute(root, "tests", -1);
            if (tests < 0) tests = document.SelectNodes("//testcase").Count;
            result["valid"] = true;
            result["testsRun"] = tests;
            result["failures"] = ReadAttribute(root, "failures", 0);
            result["errors"] = ReadAttribute(root, "errors", 0);
            result["disabled"] = ReadAttribute(root, "disabled", 0);
            List<object> names = new List<object>();
            XmlNodeList testNodes = document.SelectNodes("//testcase");
            for (int index = 0; index < testNodes.Count; index++)
            {
                XmlElement test = testNodes[index] as XmlElement;
                if (test == null) continue;
                string suite = test.GetAttribute("classname");
                string name = test.GetAttribute("name");
                names.Add((String.IsNullOrWhiteSpace(suite) ? String.Empty : suite + ".") + name);
            }
            result["testNames"] = names;
        }
        catch
        {
            result["valid"] = false;
        }
        return result;
    }

    private static string ResolveArtifactPath(Dictionary<string, object> request, string key, string fallback)
    {
        string value = AscetTestContracts.GetString(request, key);
        if (String.IsNullOrWhiteSpace(value)) return Path.GetFullPath(fallback);
        return AscetTestContracts.ResolvePath(value, Directory.GetCurrentDirectory());
    }

    private static int ReadAttribute(XmlElement element, string name, int fallback)
    {
        int value;
        return Int32.TryParse(element.GetAttribute(name), out value) ? value : fallback;
    }
}
