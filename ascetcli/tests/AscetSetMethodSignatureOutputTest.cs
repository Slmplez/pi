using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Web.Script.Serialization;

public static class AscetSetMethodSignatureOutputTest
{
    private static readonly JavaScriptSerializer Serializer = new JavaScriptSerializer();

    public static int Main()
    {
        try
        {
            TestLegacyReturnOnlyParsing();
            TestSignatureJsonArgumentParsing();
            TestSignatureJsonReturnPolicyOverride();
            TestInvalidArguments();
            TestFormatJsonIncludesArguments();
            TestFormatJsonIncludesCanonicalMutationFields();
            TestSaveSuccessIsRecordedAfterDatabaseSave();
            Console.WriteLine("AscetSetMethodSignatureOutputTest passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void TestLegacyReturnOnlyParsing()
    {
        AscetSetMethodSignatureArguments parsed = AscetSetMethodSignature.ParseArguments(new string[]
        {
            "/ESDL/Class_ESDL",
            "Trigger_BA_From_IB",
            "--return-type",
            "log",
            "--if-return-exists",
            "replace",
            "--verify-readback",
            "--json"
        });

        AssertEqual("ESDL\\Class_ESDL", parsed.ComponentPath, "component path should normalize slashes.");
        AssertEqual("Trigger_BA_From_IB", parsed.MethodName, "method name should parse.");
        AssertEqual("log", parsed.ReturnType, "return type should parse.");
        AssertEqual("log", parsed.SignatureSpec.ReturnType, "signature spec should preserve return type.");
        AssertEqual(AscetMethodReturnExistsBehavior.Replace, parsed.SignatureSpec.IfReturnExists, "ifReturnExists should parse.");
        AssertTrue(parsed.VerifyReadback, "verifyReadback should parse.");
        AssertTrue(parsed.EmitJson, "json flag should parse.");
    }

    private static void TestSignatureJsonArgumentParsing()
    {
        string path = Path.Combine(Path.GetTempPath(), "ascet-signature-test-" + Guid.NewGuid().ToString("N") + ".json");
        File.WriteAllText(path, "{\"arguments\":[{\"name\":\"p_CmpF_MC1\",\"type\":\"cont\",\"ifExists\":\"keep\"}],\"returnType\":\"log\",\"ifReturnExists\":\"keep\"}");
        try
        {
            AscetSetMethodSignatureArguments parsed = AscetSetMethodSignature.ParseArguments(new string[]
            {
                "ESDL\\Class_ESDL",
                "calc",
                "--signature-json",
                path,
                "--verify-readback",
                "--json"
            });

            AssertEqual("log", parsed.SignatureSpec.ReturnType, "signature json should parse returnType.");
            AssertEqual(AscetMethodReturnExistsBehavior.Keep, parsed.SignatureSpec.IfReturnExists, "signature json should parse ifReturnExists.");
            AssertEqual(1, parsed.SignatureSpec.Arguments.Count, "signature json should parse one argument.");
            AssertEqual("p_CmpF_MC1", parsed.SignatureSpec.Arguments[0].Name, "signature json should parse argument name.");
            AssertEqual("cont", parsed.SignatureSpec.Arguments[0].Type, "signature json should parse argument type.");
            AssertEqual(AscetMethodArgumentExistsBehavior.Keep, parsed.SignatureSpec.Arguments[0].IfExists, "signature json should parse argument ifExists.");
        }
        finally
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
    }

    private static void TestSignatureJsonReturnPolicyOverride()
    {
        string path = Path.Combine(Path.GetTempPath(), "ascet-signature-test-override-" + Guid.NewGuid().ToString("N") + ".json");
        File.WriteAllText(path, "{\"returnType\":\"log\",\"ifReturnExists\":\"keep\"}");
        try
        {
            AscetSetMethodSignatureArguments parsed = AscetSetMethodSignature.ParseArguments(new string[]
            {
                "ESDL\\Class_ESDL",
                "calc",
                "--signature-json",
                path,
                "--if-return-exists",
                "replace"
            });

            AssertEqual("log", parsed.SignatureSpec.ReturnType, "signature json should preserve returnType.");
            AssertEqual(AscetMethodReturnExistsBehavior.Replace, parsed.SignatureSpec.IfReturnExists, "CLI --if-return-exists should override signature json policy.");
        }
        finally
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
    }

    private static void TestInvalidArguments()
    {
        ExpectInvalid(new string[] { "ESDL\\Class_ESDL", "calc" }, "empty signature should fail.");
        ExpectInvalid(new string[] { "ESDL\\Class_ESDL", "calc", "--return-type", "real" }, "invalid return type should fail.");
        ExpectInvalid(new string[] { "ESDL\\Class_ESDL", "calc", "--signature-json", "missing-signature.json" }, "missing signature json should fail.");

        string path = Path.Combine(Path.GetTempPath(), "ascet-signature-test-invalid-" + Guid.NewGuid().ToString("N") + ".json");
        File.WriteAllText(path, "{\"arguments\":[{\"name\":\"\",\"type\":\"cont\"}]}");
        try
        {
            ExpectInvalid(new string[] { "ESDL\\Class_ESDL", "calc", "--signature-json", path }, "empty argument name should fail.");
        }
        finally
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
    }

    private static void TestFormatJsonIncludesArguments()
    {
        AscetMethodSignatureResult result = new AscetMethodSignatureResult
        {
            ComponentPath = "ESDL\\Class_ESDL",
            MethodName = "calc",
            MethodKind = AscetMethodKind.AbstractMethod,
            ReturnType = "log",
            ReturnCreated = true,
            Changed = true,
            MutationStatus = "applied",
            SaveAttempted = true,
            SaveSucceeded = true,
            SaveState = "saved",
            Verified = true,
            VerificationStatus = "passed",
            SessionCount = 1,
            SaveCount = 1,
            NativeMutationAttemptCount = 1,
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            ReturnElementName = "calc\\return",
            ReturnElementModelType = "log",
            ReturnElementIsMethodReturn = true,
            TargetKey = "ESDL\\Class_ESDL::calc::return",
            Summary = "Set method signature."
        };
        result.Arguments.Add(new AscetMethodArgumentResult
        {
            Name = "p_CmpF_MC1",
            Type = "cont",
            Created = true,
            ReadbackVerified = true,
            IsMethodArgument = true,
            ElementName = "calc\\p_CmpF_MC1",
            ElementModelType = "cont"
        });

        Dictionary<string, object> payload = Serializer.Deserialize<Dictionary<string, object>>(AscetSetMethodSignature.FormatJsonOutput(result));
        AssertEqual("log", GetString(payload, "returnType"), "json should include returnType.");
        IList arguments = GetList(payload, "arguments");
        AssertEqual(1, arguments.Count, "json should include arguments array.");
        Dictionary<string, object> argument = arguments[0] as Dictionary<string, object>;
        AssertTrue(argument != null, "argument entry should be an object.");
        AssertEqual("p_CmpF_MC1", GetString(argument, "name"), "json should include argument name.");
        AssertEqual("cont", GetString(argument, "elementModelType"), "json should include argument readback model type.");
        AssertTrue(GetBool(argument, "isMethodArgument"), "json should include isMethodArgument.");
    }

    private static void TestFormatJsonIncludesCanonicalMutationFields()
    {
        AscetMethodSignatureResult changed = new AscetMethodSignatureResult
        {
            ComponentPath = "ESDL\\Class_ESDL",
            MethodName = "calc",
            MethodKind = AscetMethodKind.AbstractMethod,
            ReturnType = "log",
            ReturnCreated = true,
            Changed = true,
            MutationStatus = "applied",
            SaveAttempted = true,
            SaveSucceeded = true,
            SaveState = "saved",
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            Verified = true,
            VerificationStatus = "passed",
            SessionCount = 1,
            SaveCount = 1,
            EditableRetryCount = 0,
            NativeMutationAttemptCount = 1
        };

        Dictionary<string, object> changedPayload = Serializer.Deserialize<Dictionary<string, object>>(AscetSetMethodSignature.FormatJsonOutput(changed));
        AssertTrue(GetBool(changedPayload, "changed"), "signature changed result must report changed=true.");
        AssertEqual("applied", GetString(changedPayload, "mutationStatus"), "signature changed result must report mutationStatus=applied.");
        AssertTrue(GetBool(changedPayload, "saveAttempted"), "signature changed result must report saveAttempted=true.");
        AssertTrue(GetBool(changedPayload, "saveSucceeded"), "signature changed result must report saveSucceeded=true.");
        AssertEqual("saved", GetString(changedPayload, "saveState"), "signature changed result must report saveState=saved.");
        AssertTrue(GetBool(changedPayload, "verified"), "signature changed result must report verified=true.");
        AssertEqual("passed", GetString(changedPayload, "verificationStatus"), "signature changed result must report verificationStatus=passed.");
        AssertEqual(1, Convert.ToInt32(changedPayload["sessionCount"]), "signature changed result must report one session.");
        AssertEqual(1, Convert.ToInt32(changedPayload["saveCount"]), "signature changed result must report one save.");
        AssertEqual(1, Convert.ToInt32(changedPayload["nativeMutationAttemptCount"]), "signature changed result must report one native mutation attempt.");

        AscetMethodSignatureResult noOp = new AscetMethodSignatureResult
        {
            ComponentPath = "ESDL\\Class_ESDL",
            MethodName = "calc",
            MethodKind = AscetMethodKind.AbstractMethod,
            ReturnType = "log",
            ReturnAlreadyExisted = true,
            Changed = false,
            MutationStatus = "no_op",
            SaveAttempted = false,
            SaveSucceeded = false,
            SaveState = "not_required",
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            Verified = true,
            VerificationStatus = "passed",
            SessionCount = 1,
            SaveCount = 0,
            EditableRetryCount = 0,
            NativeMutationAttemptCount = 0
        };

        Dictionary<string, object> noOpPayload = Serializer.Deserialize<Dictionary<string, object>>(AscetSetMethodSignature.FormatJsonOutput(noOp));
        AssertFalse(GetBool(noOpPayload, "changed"), "signature no-op result must report changed=false.");
        AssertEqual("no_op", GetString(noOpPayload, "mutationStatus"), "signature no-op result must report mutationStatus=no_op.");
        AssertFalse(GetBool(noOpPayload, "saveAttempted"), "signature no-op result must not report a save attempt.");
        AssertFalse(GetBool(noOpPayload, "saveSucceeded"), "signature no-op result must not report saveSucceeded=true.");
        AssertEqual("not_required", GetString(noOpPayload, "saveState"), "signature no-op result must report saveState=not_required.");
        AssertTrue(GetBool(noOpPayload, "verified"), "signature no-op result must report verified=true after readback.");
        AssertEqual("passed", GetString(noOpPayload, "verificationStatus"), "signature no-op result must report verificationStatus=passed.");
        AssertEqual(1, Convert.ToInt32(noOpPayload["sessionCount"]), "signature no-op result must report one session.");
        AssertEqual(0, Convert.ToInt32(noOpPayload["saveCount"]), "signature no-op result must report zero saves.");
        AssertEqual(0, Convert.ToInt32(noOpPayload["nativeMutationAttemptCount"]), "signature no-op result must report zero native mutation attempts.");
    }

    private static void TestSaveSuccessIsRecordedAfterDatabaseSave()
    {
        string root = Environment.GetEnvironmentVariable("ASCET_REPO_ROOT");
        if (String.IsNullOrWhiteSpace(root))
        {
            root = Directory.GetCurrentDirectory();
        }
        string source = File.ReadAllText(Path.Combine(root, "ascetcli", "src", "AscetCopilot", "AscetMethodSignature.cs"));
        int saveCall = source.IndexOf("if (!database.Save())", StringComparison.Ordinal);
        int saveRecorded = source.IndexOf("saveSucceeded = true;", saveCall < 0 ? 0 : saveCall, StringComparison.Ordinal);
        AssertTrue(saveCall >= 0 && saveRecorded > saveCall, "successful database.Save() must set saveSucceeded=true before building canonical output.");
    }
    private static void ExpectInvalid(string[] args, string message)
    {
        try
        {
            AscetSetMethodSignature.ParseArguments(args);
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

    private static void AssertFalse(bool condition, string message)
    {
        if (condition)
        {
            throw new Exception(message);
        }
    }
}
