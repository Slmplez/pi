using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Web.Script.Serialization;

public static class AscetWriteHostSmoke
{
    private static readonly JavaScriptSerializer Serializer = new JavaScriptSerializer();

    public static int Main()
    {
        Process cliHost = null;

        try
        {
            AssertHostCommandSupportsWriteLane();
            AssertWriteHostSourceCoverage();
            AssertWriteHostRegistryCoverage();

            string cliPath = GetCliPath();
            AssertTrue(File.Exists(cliPath), "AscetCli.exe should exist in the ascet-csharp bin output.");

            cliHost = StartProcess(cliPath, "host", "--lane", "write");
            if (ShouldSkipForEnvironment(cliHost))
            {
                Console.WriteLine("AscetWriteHostSmoke passed (live probe skipped: no ASCET database is open).");
                return 0;
            }

            TestCapabilities(cliHost);
            TestUnsupportedCommand(cliHost);
            ShutdownAndAssertCleanExit(cliHost, "AscetCli host --lane write");
            cliHost = null;

            Console.WriteLine("AscetWriteHostSmoke passed.");
            return 0;
        }
        catch (Exception ex)
        {
            if (cliHost != null && !cliHost.HasExited)
            {
                TryKill(cliHost);
            }

            Console.Error.WriteLine(ex.Message);
            return 1;
        }
        finally
        {
            if (cliHost != null)
            {
                cliHost.Dispose();
            }
        }
    }

    private static bool ShouldSkipForEnvironment(Process process)
    {
        if (process == null)
        {
            return false;
        }

        if (!process.WaitForExit(5000))
        {
            return false;
        }

        string stdout = ReadRemaining(process.StandardOutput);
        string stderr = ReadRemaining(process.StandardError);
        string combined = (stdout ?? String.Empty) + Environment.NewLine + (stderr ?? String.Empty);
        if (combined.IndexOf("database_not_open", StringComparison.OrdinalIgnoreCase) >= 0
            || combined.IndexOf("tool_connect_failed", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            return true;
        }

        throw new Exception("AscetCli host --lane write exited during startup." + Environment.NewLine + combined);
    }

    private static void AssertHostCommandSupportsWriteLane()
    {
        string sourcePath = GetHostCommandSourcePath();
        AssertTrue(File.Exists(sourcePath), "HostCommand.cs should exist for source regression checks.");

        string source = File.ReadAllText(sourcePath);
        AssertTrue(
            source.IndexOf("new string[] { \"read\", \"write\" }", StringComparison.Ordinal) >= 0,
            "HostCommand should accept both read and write lanes.");
    }

    private static void AssertWriteHostSourceCoverage()
    {
        string entrypointPath = GetWriteHostSourcePath();
        string serverPath = GetWriteHostServerSourcePath();
        string dispatcherPath = GetWriteHostDispatcherSourcePath();
        string capabilityPath = GetWriteHostCapabilitySourcePath();

        AssertTrue(File.Exists(entrypointPath), "AscetWriteHost.cs should exist for source regression checks.");
        AssertTrue(File.Exists(serverPath), "AscetWriteHostServer.cs should exist for source regression checks.");
        AssertTrue(File.Exists(dispatcherPath), "AscetWriteHostDispatcher.cs should exist for source regression checks.");
        AssertTrue(File.Exists(capabilityPath), "AscetWriteHostCapabilityService.cs should exist for source regression checks.");

        string entrypointSource = File.ReadAllText(entrypointPath);
        string serverSource = File.ReadAllText(serverPath);
        string dispatcherSource = File.ReadAllText(dispatcherPath);
        string capabilitySource = File.ReadAllText(capabilityPath);

        AssertTrue(
            entrypointSource.IndexOf("AscetWriteHostServer", StringComparison.Ordinal) >= 0,
            "AscetWriteHost should construct AscetWriteHostServer.");
        AssertTrue(
            serverSource.IndexOf("Expected a request envelope or shutdown envelope.", StringComparison.Ordinal) >= 0,
            "AscetWriteHostServer should validate request envelopes and support shutdown.");
        AssertTrue(
            dispatcherSource.IndexOf("not_implemented", StringComparison.Ordinal) >= 0,
            "AscetWriteHostDispatcher should report supported write commands as not implemented for now.");
        AssertTrue(
            dispatcherSource.IndexOf("unsupported_command", StringComparison.Ordinal) >= 0,
            "AscetWriteHostDispatcher should report unsupported commands.");
        AssertTrue(
            capabilitySource.IndexOf("descriptor.Lane != ExecutionLane.SerialWrite", StringComparison.Ordinal) >= 0,
            "AscetWriteHostCapabilityService should scope capabilities to serial_write operations.");
        AssertTrue(
            capabilitySource.IndexOf("serialWriteCommands", StringComparison.Ordinal) >= 0,
            "AscetWriteHostCapabilityService should advertise serialWriteCommands.");
    }

    private static void AssertWriteHostRegistryCoverage()
    {
        string registryPath = GetOperationRegistrySourcePath();
        AssertTrue(File.Exists(registryPath), "OperationRegistry.cs should exist for source regression checks.");

        string source = File.ReadAllText(registryPath);
        AssertTrue(
            source.IndexOf("Register(descriptors, \"create_component\", ExecutionLane.SerialWrite, true", StringComparison.Ordinal) >= 0,
            "OperationRegistry should mark create_component as host eligible on the serial_write lane.");
        AssertTrue(
            source.IndexOf("Register(descriptors, \"create_method\", ExecutionLane.SerialWrite, true", StringComparison.Ordinal) >= 0,
            "OperationRegistry should mark create_method as host eligible on the serial_write lane.");
        AssertTrue(
            source.IndexOf("Register(descriptors, \"set_method_code\", ExecutionLane.SerialWrite, true", StringComparison.Ordinal) >= 0,
            "OperationRegistry should mark set_method_code as host eligible on the serial_write lane.");
        AssertTrue(
            source.IndexOf("Register(descriptors, \"set_class_method_code\", ExecutionLane.SerialWrite, true", StringComparison.Ordinal) >= 0,
            "OperationRegistry should mark set_class_method_code as host eligible on the serial_write lane.");
        AssertTrue(
            source.IndexOf("Register(descriptors, \"set_method_signature\", ExecutionLane.SerialWrite, true", StringComparison.Ordinal) >= 0,
            "OperationRegistry should mark set_method_signature as host eligible on the serial_write lane.");
    }

    private static Process StartProcess(string executablePath, params string[] arguments)
    {
        ProcessStartInfo startInfo = new ProcessStartInfo
        {
            FileName = executablePath,
            Arguments = JoinArguments(arguments),
            UseShellExecute = false,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
            WorkingDirectory = Path.GetDirectoryName(executablePath)
        };

        Process process = new Process();
        process.StartInfo = startInfo;
        if (!process.Start())
        {
            throw new Exception("Failed to start process '" + executablePath + "'.");
        }

        return process;
    }

    private static void TestCapabilities(Process process)
    {
        Dictionary<string, object> request = new Dictionary<string, object>();
        request["type"] = "request";
        request["id"] = "write-capabilities-1";
        request["commandId"] = "AscetGetCapabilities";

        Dictionary<string, object> response = SendJsonRequest(process, request);
        AssertEqual("response", GetString(response, "type"), "capabilities response.type should be 'response'.");
        AssertEqual("write-capabilities-1", GetString(response, "id"), "capabilities response.id should round-trip.");
        AssertTrue(GetBool(response, "ok"), "write-host capabilities should succeed.");

        Dictionary<string, object> result = GetDictionary(response, "result");
        AssertTrue(result != null, "write-host capabilities should include a result object.");
        AssertEqual(1, GetInt(result, "protocolVersion", -1), "write-host capabilities should expose protocolVersion=1.");
        AssertEqual("write", GetString(result, "lane"), "write-host capabilities should expose the write lane.");
        AssertEqual("AscetGetCapabilities", GetString(result, "capabilityCommandId"), "write-host capabilities should advertise AscetGetCapabilities.");
        AssertContains(GetList(result, "supportedOperations"), "create_component", "write-host capabilities should advertise create_component.");
        AssertContains(GetList(result, "supportedOperations"), "create_method", "write-host capabilities should advertise create_method.");
        AssertContains(GetList(result, "supportedOperations"), "set_method_code", "write-host capabilities should advertise set_method_code.");
        AssertContains(GetList(result, "supportedOperations"), "set_class_method_code", "write-host capabilities should advertise set_class_method_code.");
        AssertContains(GetList(result, "supportedOperations"), "set_method_signature", "write-host capabilities should advertise set_method_signature.");
        AssertContains(GetList(result, "serialWriteCommands"), "AscetCreateComponent", "write-host capabilities should advertise AscetCreateComponent.");
        AssertContains(GetList(result, "serialWriteCommands"), "AscetCreateMethod", "write-host capabilities should advertise AscetCreateMethod.");
        AssertContains(GetList(result, "serialWriteCommands"), "AscetSetMethodCode", "write-host capabilities should advertise AscetSetMethodCode.");
        AssertContains(GetList(result, "serialWriteCommands"), "AscetSetClassMethodCode", "write-host capabilities should advertise AscetSetClassMethodCode.");
        AssertContains(GetList(result, "serialWriteCommands"), "AscetSetMethodSignature", "write-host capabilities should advertise AscetSetMethodSignature.");
        AssertContains(GetList(result, "supportedCommands"), "AscetGetCapabilities", "write-host capabilities should advertise AscetGetCapabilities.");

        Dictionary<string, object> commandMap = GetDictionary(result, "commandMap");
        AssertTrue(commandMap != null, "write-host capabilities should include a command map.");
        AssertEqual("AscetCreateComponent", GetString(commandMap, "create_component"), "write-host command map should preserve create_component.");
        AssertEqual("AscetSetMethodCode", GetString(commandMap, "set_method_code"), "write-host command map should preserve set_method_code.");
        AssertEqual("AscetSetMethodSignature", GetString(commandMap, "set_method_signature"), "write-host command map should preserve set_method_signature.");

        Dictionary<string, object> host = GetDictionary(result, "host");
        AssertTrue(host != null, "write-host capabilities should include host metadata.");
        AssertEqual("AscetGetCapabilities", GetString(host, "commandId"), "write-host host.commandId should reflect the dispatched command.");
        AssertEqual(1, GetInt(host, "requestCount", -1), "first successful write-host request should report requestCount=1.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(host, "startedUtc")), "write-host host.startedUtc should be present.");
        AssertTrue(GetInt(host, "sessionGeneration", -1) >= 0, "write-host host.sessionGeneration should be present.");
    }

    private static void TestUnsupportedCommand(Process process)
    {
        Dictionary<string, object> request = new Dictionary<string, object>();
        request["type"] = "request";
        request["id"] = "write-unsupported-1";
        request["commandId"] = "AscetDeleteComponent";

        Dictionary<string, object> response = SendJsonRequest(process, request);
        AssertEqual("response", GetString(response, "type"), "unsupported command response.type should be 'response'.");
        AssertEqual("write-unsupported-1", GetString(response, "id"), "unsupported command response.id should round-trip.");
        AssertTrue(!GetBool(response, "ok"), "unsupported write-host commands should fail.");

        Dictionary<string, object> error = GetDictionary(response, "error");
        AssertTrue(error != null, "unsupported write-host commands should include an error object.");
        AssertEqual("unsupported_command", GetString(error, "code"), "unsupported write-host commands should report unsupported_command.");
        AssertEqual("dispatch_request", GetString(error, "operation"), "unsupported write-host commands should preserve dispatcher context.");
    }

    private static void ShutdownAndAssertCleanExit(Process process, string displayName)
    {
        if (process == null)
        {
            throw new Exception(displayName + " process is required.");
        }

        Dictionary<string, object> shutdown = new Dictionary<string, object>();
        shutdown["type"] = "shutdown";
        process.StandardInput.WriteLine(Serialize(shutdown));
        process.StandardInput.Flush();
        process.StandardInput.Close();

        AssertTrue(process.WaitForExit(10000), displayName + " should exit after shutdown.");
        if (process.ExitCode != 0)
        {
            throw new Exception(displayName + " exited with code " + process.ExitCode + "." + Environment.NewLine + ReadRemaining(process.StandardError));
        }
    }

    private static Dictionary<string, object> SendJsonRequest(Process process, Dictionary<string, object> payload)
    {
        process.StandardInput.WriteLine(Serialize(payload));
        process.StandardInput.Flush();

        string responseLine = ReadLineWithTimeout(process.StandardOutput, 10000);
        AssertTrue(!String.IsNullOrWhiteSpace(responseLine), "Write host should emit one JSON response line.");
        return DeserializeObject(responseLine);
    }

    private static string ReadLineWithTimeout(StreamReader reader, int timeoutMs)
    {
        string line = null;
        Exception error = null;

        Thread thread = new Thread(delegate()
        {
            try
            {
                line = reader.ReadLine();
            }
            catch (Exception ex)
            {
                error = ex;
            }
        });

        thread.IsBackground = true;
        thread.Start();

        if (!thread.Join(timeoutMs))
        {
            throw new TimeoutException("Timed out waiting for a JSON response line from AscetWriteHost.");
        }

        if (error != null)
        {
            throw new Exception("Failed to read AscetWriteHost stdout.", error);
        }

        return line;
    }

    private static string JoinArguments(string[] arguments)
    {
        if (arguments == null || arguments.Length == 0)
        {
            return String.Empty;
        }

        List<string> quoted = new List<string>();
        for (int i = 0; i < arguments.Length; i++)
        {
            quoted.Add(QuoteArgument(arguments[i] ?? String.Empty));
        }

        return String.Join(" ", quoted.ToArray());
    }

    private static string QuoteArgument(string argument)
    {
        string value = argument ?? String.Empty;
        if (value.IndexOf(' ') < 0 && value.IndexOf('\t') < 0 && value.IndexOf('"') < 0)
        {
            return value;
        }

        return "\"" + value.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"";
    }

    private static void TryKill(Process process)
    {
        try
        {
            process.Kill();
        }
        catch
        {
        }
    }

    private static string ReadRemaining(StreamReader reader)
    {
        try
        {
            return reader == null ? String.Empty : (reader.ReadToEnd() ?? String.Empty);
        }
        catch
        {
            return String.Empty;
        }
    }

    private static string Serialize(object value)
    {
        return Serializer.Serialize(value);
    }

    private static Dictionary<string, object> DeserializeObject(string json)
    {
        return Serializer.Deserialize<Dictionary<string, object>>(json);
    }

    private static string GetCliPath()
    {
        return FindPathUpwards("output", "ascet-csharp", "bin", "AscetCli.exe");
    }

    private static string GetHostCommandSourcePath()
    {
        return FindPathUpwards("src", "AscetCli", "Commands", "HostCommand.cs");
    }

    private static string GetWriteHostSourcePath()
    {
        return FindPathUpwards("src", "AscetCli", "Host", "AscetWriteHost.cs");
    }

    private static string GetWriteHostServerSourcePath()
    {
        return FindPathUpwards("src", "AscetCli", "Host", "AscetWriteHostServer.cs");
    }

    private static string GetWriteHostDispatcherSourcePath()
    {
        return FindPathUpwards("src", "AscetCli", "Host", "AscetWriteHostDispatcher.cs");
    }

    private static string GetWriteHostCapabilitySourcePath()
    {
        return FindPathUpwards("src", "AscetCli", "Host", "AscetWriteHostCapabilityService.cs");
    }

    private static string GetOperationRegistrySourcePath()
    {
        return FindPathUpwards("src", "AscetCli", "Routing", "OperationRegistry.cs");
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

    private static string GetString(Dictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return Convert.ToString(payload[key]) ?? String.Empty;
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
        return Boolean.TryParse(Convert.ToString(value) ?? String.Empty, out parsed) && parsed;
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
}
