using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

public static class AscetBatchReadSmoke
{
    private static readonly JavaScriptSerializer Serializer = new JavaScriptSerializer();

    public static int Main()
    {
        try
        {
            TestBatchReadUsesStructuredEnvelopeAndPreservesRequestMapping();
            TestBuiltCliBatchReadEntryPoint();
            Console.WriteLine("AscetBatchReadSmoke passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
        finally
        {
            BatchCommand.ResetBatchReadExecutorForTesting();
        }
    }

    private static void TestBatchReadUsesStructuredEnvelopeAndPreservesRequestMapping()
    {
        FakeBatchReadExecutor fake = new FakeBatchReadExecutor();
        BatchCommand.SetBatchReadExecutorForTesting(fake);

        Dictionary<string, object> input = new Dictionary<string, object>();
        input["requests"] = new object[]
        {
            new Dictionary<string, object>
            {
                { "id", "req-1" },
                { "operation", "list_folders" },
                { "args", new Dictionary<string, object> { { "depth", 0 } } }
            },
            new Dictionary<string, object>
            {
                { "id", "req-2" },
                { "operation", "read_component_summary" },
                { "args", new Dictionary<string, object> { { "componentPath", "Demo/EngineCtrl" } } }
            }
        };

        string stdout;
        int exitCode = RunBatchCommand(Serializer.Serialize(input), out stdout);

        AssertEqual(0, exitCode, "batch read should exit cleanly when the envelope is valid.");
        AssertEqual(2, fake.Requests.Count, "batch read should forward every parsed request to the executor.");
        AssertEqual("req-1", fake.Requests[0].id, "first request id should be preserved.");
        AssertEqual("list_folders", fake.Requests[0].operation, "first request operation should be preserved.");
        AssertEqual("req-2", fake.Requests[1].id, "second request id should be preserved.");
        AssertEqual("read_component_summary", fake.Requests[1].operation, "second request operation should be preserved.");

        Dictionary<string, object> envelope = Serializer.Deserialize<Dictionary<string, object>>(stdout);
        AssertTrue(GetBool(envelope, "ok"), "valid batch read should return an ok envelope.");

        Dictionary<string, object> result = GetDictionary(envelope, "result");
        AssertTrue(result != null, "batch read should return a result payload.");
        AssertEqual("read", GetString(result, "lane"), "batch result should preserve the lane.");

        IList results = GetList(result, "results");
        AssertEqual(2, results.Count, "batch result should contain one entry per request.");

        Dictionary<string, object> first = results[0] as Dictionary<string, object>;
        Dictionary<string, object> second = results[1] as Dictionary<string, object>;
        AssertTrue(first != null, "first batch result should be an object.");
        AssertTrue(second != null, "second batch result should be an object.");

        AssertEqual("req-1", GetString(first, "id"), "first batch result should preserve request id.");
        AssertTrue(GetBool(first, "ok"), "first batch result should succeed.");
        AssertEqual("req-2", GetString(second, "id"), "second batch result should preserve request id.");
        AssertTrue(!GetBool(second, "ok"), "second batch result should surface executor item failure.");

        Dictionary<string, object> secondError = GetDictionary(second, "error");
        AssertTrue(secondError != null, "failed batch result should include an error object.");
        AssertEqual("component_not_found", GetString(secondError, "code"), "failed batch result should preserve the structured error code.");

        Dictionary<string, object> meta = GetDictionary(envelope, "meta");
        AssertTrue(meta != null, "batch read should return meta.");
        AssertEqual(1, GetInt(meta, "protocolVersion", -1), "batch read meta should preserve protocol version.");
        AssertEqual("batch", GetString(meta, "mode"), "batch read meta.mode should be batch.");
        AssertEqual("read", GetString(meta, "lane"), "batch read meta.lane should be read.");
    }

    private static int RunBatchCommand(string stdinJson, out string stdout)
    {
        TextReader originalIn = Console.In;
        TextWriter originalOut = Console.Out;
        StringWriter capture = new StringWriter(new StringBuilder());

        try
        {
            Console.SetIn(new StringReader(stdinJson ?? String.Empty));
            Console.SetOut(capture);
            return BatchCommand.Run(new string[] { "--lane", "read", "--json" });
        }
        finally
        {
            Console.SetIn(originalIn);
            Console.SetOut(originalOut);
            stdout = capture.ToString();
        }
    }

    private static void TestBuiltCliBatchReadEntryPoint()
    {
        string exePath = FindPathUpwards("output", "ascet-csharp", "bin", "AscetCli.exe");
        AssertTrue(File.Exists(exePath), "AscetCli.exe should exist for batch integration smoke.");

        ProcessStartInfo startInfo = new ProcessStartInfo
        {
            FileName = exePath,
            Arguments = "batch list_folders --json",
            UseShellExecute = false,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
            WorkingDirectory = Path.GetDirectoryName(exePath)
        };

        using (Process process = new Process())
        {
            process.StartInfo = startInfo;
            AssertTrue(process.Start(), "Failed to start AscetCli.exe for batch integration smoke.");
            process.StandardInput.Write("{\"requests\":[]}");
            process.StandardInput.Close();

            string stdout = process.StandardOutput.ReadToEnd();
            string stderr = process.StandardError.ReadToEnd();
            AssertTrue(process.WaitForExit(10000), "AscetCli.exe batch integration smoke should exit promptly.");
            AssertTrue(!String.IsNullOrWhiteSpace(stdout), "AscetCli.exe batch integration smoke should emit JSON.");

            Dictionary<string, object> envelope = Serializer.Deserialize<Dictionary<string, object>>(stdout);
            AssertTrue(!GetBool(envelope, "ok"), "empty batch input should fail with a structured error.");
            Dictionary<string, object> error = GetDictionary(envelope, "error");
            AssertTrue(error != null, "empty batch input should include an error object.");
            AssertEqual("invalid_input", GetString(error, "code"), "built AscetCli.exe batch path should no longer return not_implemented.");
            AssertEqual(2, process.ExitCode, "empty batch input should still return structured-error exit code 2." + Environment.NewLine + stderr);
        }
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

    private static int GetInt(Dictionary<string, object> payload, string key, int defaultValue)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return defaultValue;
        }

        try
        {
            return Convert.ToInt32(payload[key]);
        }
        catch
        {
            return defaultValue;
        }
    }

    private static void AssertTrue(bool condition, string message)
    {
        if (!condition)
        {
            throw new Exception(message);
        }
    }

    private static void AssertEqual(string expected, string actual, string message)
    {
        if (!String.Equals(expected ?? String.Empty, actual ?? String.Empty, StringComparison.Ordinal))
        {
            throw new Exception(message + " Expected '" + expected + "' but got '" + actual + "'.");
        }
    }

    private static void AssertEqual(int expected, int actual, string message)
    {
        if (expected != actual)
        {
            throw new Exception(message + " Expected '" + expected + "' but got '" + actual + "'.");
        }
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

    private sealed class FakeBatchReadExecutor : IAscetBatchReadExecutor
    {
        public List<AscetBatchRequestItemDto> Requests { get; private set; }

        public FakeBatchReadExecutor()
        {
            Requests = new List<AscetBatchRequestItemDto>();
        }

        public IList<AscetBatchResultItemDto> Execute(IList<AscetBatchRequestItemDto> requests)
        {
            Requests.Clear();
            if (requests != null)
            {
                for (int i = 0; i < requests.Count; i++)
                {
                    Requests.Add(requests[i]);
                }
            }

            List<AscetBatchResultItemDto> results = new List<AscetBatchResultItemDto>();

            AscetBatchResultItemDto ok = new AscetBatchResultItemDto();
            ok.id = "req-1";
            ok.ok = true;
            ok.result = new Dictionary<string, object> { { "counts", new Dictionary<string, object> { { "folders", 1 } } } };
            results.Add(ok);

            AscetBatchResultItemDto fail = new AscetBatchResultItemDto();
            fail.id = "req-2";
            fail.ok = false;
            fail.error = AscetErrorMapper.Create("component_not_found", "Missing component.", "read_component_summary");
            results.Add(fail);

            return results;
        }
    }
}
