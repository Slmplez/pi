using System;
using System.Collections.Generic;

public static class FolderReadServiceSmoke
{
    public static int Main()
    {
        try
        {
            TestParsePayloadRejectsNegativeDepth();
            TestParsePayloadDefaults();

            Console.WriteLine("FolderReadServiceSmoke passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void TestParsePayloadRejectsNegativeDepth()
    {
        FolderReadService service = new FolderReadService();

        try
        {
            service.ParsePayload(new Dictionary<string, object> { { "depth", -1 } });
            throw new Exception("ParsePayload should reject negative depth.");
        }
        catch (AscetReadException ex)
        {
            AssertEqual("invalid_arguments", ex.Code, "ParsePayload should report invalid_arguments.");
            AssertEqual("parse_payload", ex.Operation, "ParsePayload should preserve parse_payload context.");
        }
    }

    private static void TestParsePayloadDefaults()
    {
        FolderReadService service = new FolderReadService();
        FolderReadRequest request = service.ParsePayload(new Dictionary<string, object>());

        AssertTrue(request != null, "ParsePayload should return a request.");
        AssertEqual(String.Empty, request.RootPath ?? String.Empty, "ParsePayload should default root path to empty.");
        AssertEqual(1, request.Depth, "ParsePayload should default depth to 1.");
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
}
