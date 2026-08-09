using System;
using System.Collections.Generic;

public static class AscetSetEnumeratorsOutputTest
{
    public static int Main()
    {
        try
        {
            TestArgumentParsing();
            TestEnumeratorValidation();
            TestPayload();
            Console.WriteLine("AscetSetEnumeratorsOutputTest passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void TestArgumentParsing()
    {
        AscetSetEnumeratorsArguments parsed = AscetSetEnumerators.ParseArguments(
            new string[]
            {
                @"\DEMO/SmokeEnum",
                "--item",
                "OFF",
                "--items",
                "ON,ERROR",
                "--verify-readback",
                "--json"
            });

        AssertEqual(@"DEMO\SmokeEnum", parsed.ComponentPath, "Enumeration path should be normalized.");
        AssertEqual(3, parsed.Enumerators.Count, "All enumerator arguments should be parsed.");
        AssertEqual("OFF", parsed.Enumerators[0], "First enumerator should preserve order.");
        AssertEqual("ON", parsed.Enumerators[1], "Second enumerator should preserve order.");
        AssertEqual("ERROR", parsed.Enumerators[2], "Third enumerator should preserve order.");
        AssertTrue(parsed.VerifyReadback, "--verify-readback should be preserved.");
        AssertTrue(parsed.EmitJson, "--json should be preserved.");
    }

    private static void TestEnumeratorValidation()
    {
        string[] normalized = EnumerationWriteService.NormalizeEnumerators(
            new List<string> { " OFF ", "ON" });
        AssertEqual(2, normalized.Length, "Enumerator validation should preserve item count.");
        AssertEqual("OFF", normalized[0], "Enumerator validation should trim names.");
        AssertEqual("ON", normalized[1], "Enumerator validation should preserve order.");

        try
        {
            EnumerationWriteService.NormalizeEnumerators(new List<string> { "OFF", "OFF" });
            throw new Exception("Duplicate enumerators should be rejected.");
        }
        catch (AscetReadException ex)
        {
            AssertEqual("invalid_argument", ex.Code, "Duplicate enumerators should return invalid_argument.");
        }
    }

    private static void TestPayload()
    {
        AscetEnumeratorWriteResult result = new AscetEnumeratorWriteResult
        {
            ComponentPath = @"DEMO\SmokeEnum",
            ComponentKind = AscetComponentKind.Enumeration,
            PreviousEnumerators = new List<string> { "OLD" },
            NewEnumerators = new List<string> { "OFF", "ON" },
            WriteSucceeded = true,
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            Summary = "Set 2 enumerators for DEMO\\SmokeEnum."
        };

        string json = AscetSetEnumerators.FormatJsonOutput(result);
        AssertContains(json, "\"componentPath\":\"DEMO\\\\SmokeEnum\"", "Payload should include component path.");
        AssertContains(json, "\"kind\":\"enumeration\"", "Payload should include enumeration kind.");
        AssertContains(json, "\"previousEnumerators\":[\"OLD\"]", "Payload should include previous enumerators.");
        AssertContains(json, "\"enumerators\":[\"OFF\",\"ON\"]", "Payload should include new enumerators.");
        AssertContains(json, "\"verifyReadbackRequested\":true", "Payload should expose verification request.");
        AssertContains(json, "\"readbackVerified\":true", "Payload should expose verification result.");
    }

    private static void AssertContains(string text, string expected, string message)
    {
        if ((text ?? String.Empty).IndexOf(expected, StringComparison.Ordinal) < 0)
        {
            throw new Exception(message + " Output: " + text);
        }
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
            throw new Exception(message + " Expected " + expected + " but got " + actual + ".");
        }
    }

    private static void AssertEqual(string expected, string actual, string message)
    {
        if (!String.Equals(expected ?? String.Empty, actual ?? String.Empty, StringComparison.Ordinal))
        {
            throw new Exception(message + " Expected '" + expected + "' but got '" + actual + "'.");
        }
    }
}