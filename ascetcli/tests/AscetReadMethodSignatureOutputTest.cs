using System;
using System.Collections;
using System.Collections.Generic;
using System.Web.Script.Serialization;

public static class AscetReadMethodSignatureOutputTest
{
    private static readonly JavaScriptSerializer Serializer = new JavaScriptSerializer();

    public static int Main()
    {
        try
        {
            TestParsing();
            TestInvalidArguments();
            TestFormatJsonIncludesSignatureShape();
            TestFormatTextIncludesSignatureShape();
            Console.WriteLine("AscetReadMethodSignatureOutputTest passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void TestParsing()
    {
        AscetReadMethodSignatureArguments parsed = AscetReadMethodSignature.ParseArguments(new string[]
        {
            "/ESDL/Class_ESDL",
            "calc",
            "--json"
        });

        AssertEqual("ESDL\\Class_ESDL", parsed.ComponentPath, "component path should normalize slashes.");
        AssertEqual("calc", parsed.MethodName, "method name should parse.");
        AssertTrue(parsed.EmitJson, "json flag should parse.");
    }

    private static void TestInvalidArguments()
    {
        ExpectInvalid(new string[] { "ESDL\\Class_ESDL" }, "missing method name should fail.");
        ExpectInvalid(new string[] { "ESDL\\Class_ESDL", "calc", "--unknown" }, "unknown argument should fail.");
    }

    private static void TestFormatJsonIncludesSignatureShape()
    {
        AscetMethodSignatureSnapshot signature = BuildSignature();
        Dictionary<string, object> payload = Serializer.Deserialize<Dictionary<string, object>>(AscetReadMethodSignature.FormatJsonOutput(signature));

        AssertEqual("ESDL\\Class_ESDL", GetString(payload, "componentPath"), "json should include componentPath.");
        AssertEqual("calc", GetString(payload, "methodName"), "json should include methodName.");
        AssertTrue(GetBool(payload, "supportsPrimitiveSignature"), "json should include supportsPrimitiveSignature.");

        Dictionary<string, object> returnPayload = GetDictionary(payload, "return");
        AssertTrue(returnPayload != null, "json should include return object.");
        AssertTrue(GetBool(returnPayload, "exists"), "return should exist.");
        AssertEqual("log", GetString(returnPayload, "modelType"), "return should include modelType.");
        AssertTrue(GetBool(returnPayload, "isMethodReturn"), "return should expose isMethodReturn.");

        IList arguments = GetList(payload, "arguments");
        AssertEqual(1, arguments.Count, "json should include one argument.");
        Dictionary<string, object> argument = arguments[0] as Dictionary<string, object>;
        AssertTrue(argument != null, "argument entry should be an object.");
        AssertEqual("p_CmpF_MC1", GetString(argument, "name"), "argument should include normalized name.");
        AssertEqual("cont", GetString(argument, "modelType"), "argument should include modelType.");
        AssertTrue(GetBool(argument, "isMethodArgument"), "argument should expose isMethodArgument.");

        Dictionary<string, object> counts = GetDictionary(payload, "counts");
        AssertTrue(counts != null, "json should include counts object.");
        AssertEqual(1, GetInt(counts, "return"), "counts.return should be one.");
        AssertEqual(1, GetInt(counts, "arguments"), "counts.arguments should be one.");
    }

    private static void TestFormatTextIncludesSignatureShape()
    {
        string text = AscetReadMethodSignature.FormatTextOutput(BuildSignature());
        AssertContains(text, "Component: ESDL\\Class_ESDL", "text should include component.");
        AssertContains(text, "Method: calc", "text should include method.");
        AssertContains(text, "Return: log", "text should include return type.");
        AssertContains(text, "p_CmpF_MC1::cont", "text should include argument.");
    }

    private static AscetMethodSignatureSnapshot BuildSignature()
    {
        AscetMethodSignatureSnapshot signature = new AscetMethodSignatureSnapshot
        {
            ComponentPath = "ESDL\\Class_ESDL",
            ComponentKind = AscetComponentKind.Class,
            LanguageKind = AscetLanguageKind.BDE,
            MethodName = "calc",
            MethodKind = AscetMethodKind.AbstractMethod,
            SupportsPrimitiveSignature = true,
            TargetKey = "ESDL\\Class_ESDL::calc::signature",
            Summary = "Read method signature."
        };
        signature.Return = new AscetMethodSignatureElementSnapshot
        {
            Name = "return",
            ElementName = "calc\\return",
            ModelType = "log",
            Exists = true,
            IsMethodReturn = true
        };
        signature.Arguments.Add(new AscetMethodSignatureElementSnapshot
        {
            Name = "p_CmpF_MC1",
            ElementName = "calc\\p_CmpF_MC1",
            ModelType = "cont",
            Exists = true,
            IsMethodArgument = true
        });
        return signature;
    }

    private static void ExpectInvalid(string[] args, string message)
    {
        try
        {
            AscetReadMethodSignature.ParseArguments(args);
            throw new Exception(message);
        }
        catch (AscetReadException)
        {
        }
    }

    private static string GetString(IDictionary<string, object> payload, string key)
    {
        return payload != null && payload.ContainsKey(key) && payload[key] != null ? Convert.ToString(payload[key]) : String.Empty;
    }

    private static bool GetBool(IDictionary<string, object> payload, string key)
    {
        return payload != null && payload.ContainsKey(key) && payload[key] is bool && (bool)payload[key];
    }

    private static int GetInt(IDictionary<string, object> payload, string key)
    {
        return payload != null && payload.ContainsKey(key) && payload[key] != null ? Convert.ToInt32(payload[key]) : 0;
    }

    private static Dictionary<string, object> GetDictionary(IDictionary<string, object> payload, string key)
    {
        return payload != null && payload.ContainsKey(key) ? payload[key] as Dictionary<string, object> : null;
    }

    private static IList GetList(IDictionary<string, object> payload, string key)
    {
        return payload != null && payload.ContainsKey(key) ? payload[key] as IList : null;
    }

    private static void AssertEqual<T>(T expected, T actual, string message)
    {
        if (!Object.Equals(expected, actual))
        {
            throw new Exception(message + " Expected '" + expected + "', got '" + actual + "'.");
        }
    }

    private static void AssertTrue(bool condition, string message)
    {
        if (!condition)
        {
            throw new Exception(message);
        }
    }

    private static void AssertContains(string haystack, string needle, string message)
    {
        if (haystack == null || haystack.IndexOf(needle, StringComparison.Ordinal) < 0)
        {
            throw new Exception(message);
        }
    }
}
