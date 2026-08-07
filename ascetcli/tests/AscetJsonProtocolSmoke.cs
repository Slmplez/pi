using System;
using System.Collections;
using System.Collections.Generic;

public static class AscetJsonProtocolSmoke
{
    public static int Main()
    {
        try
        {
            AscetJsonProtocol protocol = new AscetJsonProtocol();

            TestExecEnvelopeSerialization(protocol);
            TestHostEnvelopeSerialization(protocol);
            TestHostRequestRoundTrip(protocol);
            TestBatchEnvelopeSerialization(protocol);
            TestCapabilitiesEnvelopeSerialization(protocol);
            TestStructuredErrorMapping(protocol);
            TestMalformedJsonParseBehavior(protocol);
            TestSerializerBoundary(protocol);

            Console.WriteLine("AscetJsonProtocolSmoke passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void TestExecEnvelopeSerialization(AscetJsonProtocol protocol)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["rootPath"] = "DEMO";
        result["depth"] = 1;

        string json = protocol.Serialize(protocol.ExecSuccess("list_folders", result));
        Dictionary<string, object> payload = protocol.Deserialize<Dictionary<string, object>>(json);

        AssertEnvelopeShape(payload, true, "exec", "list_folders", String.Empty);
        Dictionary<string, object> execResult = GetDictionary(payload, "result");
        AssertTrue(execResult != null, "exec envelope should include result.");
        AssertEqual("DEMO", GetString(execResult, "rootPath"), "exec result should preserve rootPath.");
        AssertEqual(1, GetInt(execResult, "depth", -1), "exec result should preserve depth.");
    }

    private static void TestHostEnvelopeSerialization(AscetJsonProtocol protocol)
    {
        Dictionary<string, object> hostResult = new Dictionary<string, object>();
        hostResult["requestCount"] = 2;
        hostResult["sessionGeneration"] = 1;

        string json = protocol.Serialize(protocol.HostSuccess("host-1", "list_folders", hostResult));
        Dictionary<string, object> payload = protocol.Deserialize<Dictionary<string, object>>(json);

        AssertEqual("response", GetString(payload, "type"), "host envelope should set type=response.");
        AssertEqual("host-1", GetString(payload, "id"), "host envelope should preserve id.");
        AssertEnvelopeShape(payload, true, "host", "list_folders", "pooled_read");
        Dictionary<string, object> result = GetDictionary(payload, "result");
        AssertEqual(2, GetInt(result, "requestCount", -1), "host result should preserve requestCount.");
    }

    private static void TestHostRequestRoundTrip(AscetJsonProtocol protocol)
    {
        AscetHostRequestEnvelopeDto request = new AscetHostRequestEnvelopeDto();
        request.type = "request";
        request.id = "req-1";
        request.operation = "list_folders";
        request.args = new Dictionary<string, object>
        {
            { "rootPath", "DEMO" },
            { "depth", 2 }
        };

        string json = protocol.Serialize(request);
        AscetHostRequestEnvelopeDto parsed = protocol.ParseHostRequest(json);

        AssertTrue(parsed != null, "host request should round-trip.");
        AssertEqual("request", parsed.type, "host request type should round-trip.");
        AssertEqual("req-1", parsed.id, "host request id should round-trip.");
        AssertEqual("list_folders", parsed.operation, "host request operation should round-trip.");
        AssertTrue(parsed.args != null, "host request args should round-trip.");
        AssertEqual("DEMO", Convert.ToString(parsed.args["rootPath"]), "host request rootPath should round-trip.");
        AssertEqual(2, Convert.ToInt32(parsed.args["depth"]), "host request depth should round-trip.");
    }

    private static void TestBatchEnvelopeSerialization(AscetJsonProtocol protocol)
    {
        List<AscetBatchResultItemDto> items = new List<AscetBatchResultItemDto>();

        AscetBatchResultItemDto okItem = new AscetBatchResultItemDto();
        okItem.id = "r1";
        okItem.ok = true;
        okItem.result = new Dictionary<string, object> { { "count", 3 } };
        okItem.error = null;
        items.Add(okItem);

        AscetBatchResultItemDto failItem = new AscetBatchResultItemDto();
        failItem.id = "r2";
        failItem.ok = false;
        failItem.result = null;
        failItem.error = AscetErrorMapper.Create("invalid_arguments", "bad request", "batch_item");
        items.Add(failItem);

        string json = protocol.Serialize(protocol.BatchSuccess("read", items));
        Dictionary<string, object> payload = protocol.Deserialize<Dictionary<string, object>>(json);

        AssertEnvelopeShape(payload, true, "batch", String.Empty, "read");
        Dictionary<string, object> result = GetDictionary(payload, "result");
        AssertTrue(result != null, "batch envelope should include result.");
        AssertEqual("read", GetString(result, "lane"), "batch result should preserve lane.");
        IList results = GetList(result, "results");
        AssertEqual(2, results.Count, "batch result should preserve all items.");
    }

    private static void TestCapabilitiesEnvelopeSerialization(AscetJsonProtocol protocol)
    {
        string json = protocol.Serialize(
            protocol.CapabilitiesSuccess(
                new string[] { "exec", "batch", "host", "capabilities" },
                new string[] { "list_folders", "list_components" },
                new string[] { "list_folders" }));

        Dictionary<string, object> payload = protocol.Deserialize<Dictionary<string, object>>(json);

        AssertEnvelopeShape(payload, true, "capabilities", "capabilities", String.Empty);
        Dictionary<string, object> result = GetDictionary(payload, "result");
        AssertTrue(result != null, "capabilities should include result.");
        AssertContains(GetList(result, "modes"), "exec", "capabilities should contain exec mode.");
        AssertContains(GetList(result, "operations"), "list_components", "capabilities should contain operation.");
        AssertContains(GetList(result, "hostOperations"), "list_folders", "capabilities should contain host operation.");
    }

    private static void TestStructuredErrorMapping(AscetJsonProtocol protocol)
    {
        string json = protocol.Serialize(
            protocol.ExecError(
                "list_folders",
                new AscetReadException("database_not_open", "list_folders", "No database is open.")));

        Dictionary<string, object> payload = protocol.Deserialize<Dictionary<string, object>>(json);
        AssertEnvelopeShape(payload, false, "exec", "list_folders", String.Empty);

        Dictionary<string, object> error = GetDictionary(payload, "error");
        AssertTrue(error != null, "error envelope should include error object.");
        AssertEqual("database_not_open", GetString(error, "code"), "error mapper should preserve AscetReadException code.");
        AssertEqual("list_folders", GetString(error, "operation"), "error mapper should preserve operation.");
        AssertEqual("No database is open.", GetString(error, "message"), "error mapper should preserve message.");

        string invalidArgumentJson = protocol.Serialize(protocol.BatchError("write", new ArgumentException("Invalid lane.")));
        Dictionary<string, object> invalidArgumentPayload = protocol.Deserialize<Dictionary<string, object>>(invalidArgumentJson);
        AssertEnvelopeShape(invalidArgumentPayload, false, "batch", String.Empty, "write");
        Dictionary<string, object> invalidArgumentError = GetDictionary(invalidArgumentPayload, "error");
        AssertEqual("invalid_arguments", GetString(invalidArgumentError, "code"), "ArgumentException should map to invalid_arguments.");
    }

    private static void TestMalformedJsonParseBehavior(AscetJsonProtocol protocol)
    {
        try
        {
            protocol.ParseHostRequest("{\"type\":");
            throw new Exception("Malformed JSON should throw an AscetReadException.");
        }
        catch (AscetReadException ex)
        {
            AssertEqual("invalid_json", ex.Code, "Malformed JSON should map to invalid_json.");
            AssertEqual("parse_host_request", ex.Operation, "Malformed JSON should preserve parse operation.");
            AssertTrue(ex.InnerException != null, "Malformed JSON should preserve the original serializer exception.");
        }
    }

    private static void TestSerializerBoundary(AscetJsonProtocol protocol)
    {
        AssertTrue(protocol.MaxJsonLength >= (8 * 1024 * 1024), "Serializer MaxJsonLength should be explicitly increased above the default.");

        string largePayload = new string('x', 3 * 1024 * 1024);
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["payload"] = largePayload;

        string json = protocol.Serialize(protocol.ExecSuccess("read_component_code", result));
        Dictionary<string, object> payload = protocol.Deserialize<Dictionary<string, object>>(json, "deserialize_large_exec");
        Dictionary<string, object> execResult = GetDictionary(payload, "result");
        AssertEqual(largePayload.Length, GetString(execResult, "payload").Length, "Serializer should round-trip a payload above the default JavaScriptSerializer limit.");
    }

    private static void AssertEnvelopeShape(Dictionary<string, object> payload, bool expectedOk, string expectedMode, string expectedOperation, string expectedLane)
    {
        AssertTrue(payload.ContainsKey("ok"), "envelope should include ok.");
        AssertTrue(payload.ContainsKey("result"), "envelope should include result even on errors.");
        AssertTrue(payload.ContainsKey("error"), "envelope should include error even on success.");
        AssertTrue(payload.ContainsKey("meta"), "envelope should include meta.");
        AssertEqual(expectedOk, GetBool(payload, "ok"), "envelope ok should match.");

        Dictionary<string, object> meta = GetDictionary(payload, "meta");
        AssertTrue(meta != null, "envelope meta should be an object.");
        AssertEqual(1, GetInt(meta, "protocolVersion", -1), "protocolVersion should default to 1.");
        AssertEqual(expectedMode, GetString(meta, "mode"), "meta.mode should match.");
        AssertEqual(expectedOperation, GetString(meta, "operation"), "meta.operation should match.");
        AssertEqual(expectedLane, GetString(meta, "lane"), "meta.lane should match.");
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
        return Boolean.TryParse(Convert.ToString(value), out parsed) && parsed;
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

    private static void AssertEqual(bool expected, bool actual, string message)
    {
        if (expected != actual)
        {
            throw new Exception(message + " Expected '" + expected + "' but got '" + actual + "'.");
        }
    }
}
