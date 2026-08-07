using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Web.Script.Serialization;

public static class AscetCliBenchmarkSmoke
{
    private static readonly JavaScriptSerializer Serializer = new JavaScriptSerializer();

    public static int Main()
    {
        try
        {
            string exePath = FindPathUpwards("output", "ascet-csharp", "bin", "AscetCli.exe");
            AssertTrue(File.Exists(exePath), "AscetCli.exe should exist in the ascet-csharp bin output.");

            TestBenchmarkPlaceholder(exePath);
            TestCapabilitiesAdvertisePooledReadOperations(exePath);

            Console.WriteLine("AscetCliBenchmarkSmoke passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void TestBenchmarkPlaceholder(string exePath)
    {
        ProcessJsonResult result = RunJson(exePath, "benchmark", "--json");
        AssertEqual(2, result.ExitCode, "benchmark placeholder should use structured-error exit code 2.");

        Dictionary<string, object> envelope = result.Payload;
        AssertTrue(!GetBool(envelope, "ok"), "benchmark placeholder should fail structurally.");
        Dictionary<string, object> error = GetDictionary(envelope, "error");
        AssertTrue(error != null, "benchmark placeholder should include an error object.");
        AssertEqual("not_implemented", GetString(error, "code"), "benchmark placeholder should report not_implemented.");

        Dictionary<string, object> meta = GetDictionary(envelope, "meta");
        AssertTrue(meta != null, "benchmark placeholder should include meta.");
        AssertEqual("benchmark", GetString(meta, "mode"), "benchmark placeholder meta.mode should be benchmark.");
    }

    private static void TestCapabilitiesAdvertisePooledReadOperations(string exePath)
    {
        ProcessJsonResult result = RunJson(exePath, "capabilities", "--json");
        AssertEqual(0, result.ExitCode, "capabilities should succeed.");

        Dictionary<string, object> envelope = result.Payload;
        AssertTrue(GetBool(envelope, "ok"), "capabilities should return ok=true.");
        Dictionary<string, object> payload = GetDictionary(envelope, "result");
        AssertTrue(payload != null, "capabilities should include result.");
        Dictionary<string, object> host = GetDictionary(payload, "host");
        AssertTrue(host != null, "capabilities should include host metadata.");
        AssertContains(GetList(host, "supportedOperations"), "list_folders", "host capabilities should advertise list_folders.");
        AssertContains(GetList(host, "supportedOperations"), "get_tree", "host capabilities should advertise get_tree.");
        AssertContains(GetList(host, "supportedOperations"), "list_methods", "host capabilities should advertise list_methods.");
        AssertContains(GetList(host, "supportedOperations"), "read_component_summary", "host capabilities should advertise read_component_summary.");
    }

    private static ProcessJsonResult RunJson(string exePath, params string[] args)
    {
        ProcessStartInfo startInfo = new ProcessStartInfo
        {
            FileName = exePath,
            Arguments = JoinArguments(args),
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
            WorkingDirectory = Path.GetDirectoryName(exePath)
        };

        using (Process process = new Process())
        {
            process.StartInfo = startInfo;
            AssertTrue(process.Start(), "Failed to start AscetCli.exe.");
            string stdout = process.StandardOutput.ReadToEnd();
            string stderr = process.StandardError.ReadToEnd();
            AssertTrue(process.WaitForExit(10000), "AscetCli.exe benchmark smoke should exit promptly.");
            AssertTrue(!String.IsNullOrWhiteSpace(stdout), "AscetCli.exe benchmark smoke should emit JSON." + Environment.NewLine + stderr);

            ProcessJsonResult result = new ProcessJsonResult();
            result.ExitCode = process.ExitCode;
            result.Payload = Serializer.Deserialize<Dictionary<string, object>>(stdout);
            return result;
        }
    }

    private static string JoinArguments(string[] args)
    {
        if (args == null || args.Length == 0)
        {
            return String.Empty;
        }

        string[] quoted = new string[args.Length];
        for (int i = 0; i < args.Length; i++)
        {
            quoted[i] = QuoteArgument(args[i]);
        }

        return String.Join(" ", quoted);
    }

    private static string QuoteArgument(string value)
    {
        string argument = value ?? String.Empty;
        if (argument.IndexOfAny(new char[] { ' ', '\t', '"' }) < 0)
        {
            return argument;
        }

        return "\"" + argument.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"";
    }

    private static string FindPathUpwards(params string[] relativeParts)
    {
        string cursor = AppDomain.CurrentDomain.BaseDirectory;
        while (!String.IsNullOrWhiteSpace(cursor))
        {
            string candidate = cursor;
            for (int i = 0; i < relativeParts.Length; i++)
            {
                candidate = Path.Combine(candidate, relativeParts[i]);
            }

            string fullPath = Path.GetFullPath(candidate);
            if (File.Exists(fullPath))
            {
                return fullPath;
            }

            DirectoryInfo parent = Directory.GetParent(cursor);
            if (parent == null)
            {
                break;
            }

            cursor = parent.FullName;
        }

        throw new Exception("Failed to resolve required path from base directory '" + AppDomain.CurrentDomain.BaseDirectory + "'.");
    }

    private static Dictionary<string, object> GetDictionary(Dictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key))
        {
            return null;
        }

        return payload[key] as Dictionary<string, object>;
    }

    private static IList GetList(Dictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return new object[0];
        }

        IList list = payload[key] as IList;
        return list ?? new object[0];
    }

    private static bool GetBool(Dictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return false;
        }

        object value = payload[key];
        if (value is bool)
        {
            return (bool)value;
        }

        bool parsed;
        return Boolean.TryParse(Convert.ToString(value), out parsed) && parsed;
    }

    private static string GetString(Dictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return Convert.ToString(payload[key]) ?? String.Empty;
    }

    private static void AssertTrue(bool condition, string message)
    {
        if (!condition)
        {
            throw new Exception(message);
        }
    }

    private static void AssertEqual(int expected, int actual, string message)
    {
        if (expected != actual)
        {
            throw new Exception(message + " Expected '" + expected + "' but got '" + actual + "'.");
        }
    }

    private static void AssertEqual(string expected, string actual, string message)
    {
        if (!String.Equals(expected ?? String.Empty, actual ?? String.Empty, StringComparison.Ordinal))
        {
            throw new Exception(message + " Expected '" + expected + "' but got '" + actual + "'.");
        }
    }

    private static void AssertContains(IList list, string expected, string message)
    {
        if (list == null)
        {
            throw new Exception(message);
        }

        for (int i = 0; i < list.Count; i++)
        {
            if (String.Equals(Convert.ToString(list[i]) ?? String.Empty, expected ?? String.Empty, StringComparison.Ordinal))
            {
                return;
            }
        }

        throw new Exception(message);
    }

    private sealed class ProcessJsonResult
    {
        public int ExitCode { get; set; }
        public Dictionary<string, object> Payload { get; set; }
    }
}
