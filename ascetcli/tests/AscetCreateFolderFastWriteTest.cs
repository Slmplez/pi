using System;
using System.Collections.Generic;
using System.IO;
using System.Web.Script.Serialization;

public static class AscetCreateFolderFastWriteTest
{
    public static int Main()
    {
        try
        {
            TestCreateFolderUsesOneSameSessionExecution();
            TestJsonPayloadIncludesFastWriteFields();
            Console.WriteLine("AscetCreateFolderFastWriteTest passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void TestCreateFolderUsesOneSameSessionExecution()
    {
        string source = File.ReadAllText(FindSourcePath());
        AssertEqual(1, CountOccurrences(source, "ExecuteWithSession(\"create_folder\""), "create_folder must use exactly one session execution.");
        AssertFalse(source.IndexOf("verify_create_folder", StringComparison.Ordinal) >= 0, "create_folder must not open a fresh verification session.");

        int saveIndex = source.IndexOf("database.Save()", StringComparison.Ordinal);
        int verifyIndex = source.IndexOf("ResolveFolder(database, normalizedPath)", StringComparison.Ordinal);
        AssertTrue(saveIndex >= 0, "create_folder must save the database in the write session.");
        AssertTrue(verifyIndex > saveIndex, "create_folder must verify the exact path after save in the same session.");
        AssertTrue(source.IndexOf("VerificationMode = \"same_session_exact_path\"", StringComparison.Ordinal) >= 0, "create_folder must report same-session verification.");
    }

    private static void TestJsonPayloadIncludesFastWriteFields()
    {
        AscetCreateFolderResult result = new AscetCreateFolderResult
        {
            FolderPath = "Workspace\\FastWrite",
            Created = true,
            CreatedCount = 1,
            ExistingCount = 0,
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            SaveSucceeded = true,
            VerificationMode = "same_session_exact_path",
            Summary = "Created folder path."
        };

        JavaScriptSerializer serializer = new JavaScriptSerializer();
        Dictionary<string, object> payload = serializer.DeserializeObject(AscetCreateFolder.FormatJsonOutput(result)) as Dictionary<string, object>;
        AssertTrue(payload != null, "create_folder JSON payload must be an object.");
        AssertTrue(GetBool(payload, "saveSucceeded"), "create_folder JSON payload must report saveSucceeded.");
        AssertEqual("same_session_exact_path", GetString(payload, "verificationMode"), "create_folder JSON payload must report its verification mode.");
        AssertTrue(GetBool(payload, "readbackVerified"), "create_folder JSON payload must preserve readbackVerified.");
        AssertTrue(GetBool(payload, "changed"), "create_folder changed write must report changed=true.");
        AssertEqual("applied", GetString(payload, "mutationStatus"), "create_folder changed write must report mutationStatus=applied.");
        AssertTrue(GetBool(payload, "saveAttempted"), "create_folder changed write must report saveAttempted=true.");
        AssertEqual("saved", GetString(payload, "saveState"), "create_folder changed write must report saveState=saved.");
        AssertTrue(GetBool(payload, "verified"), "create_folder changed write must report verified=true.");
        AssertEqual("passed", GetString(payload, "verificationStatus"), "create_folder changed write must report verificationStatus=passed.");
        AssertEqual(1, GetInt(payload, "sessionCount"), "create_folder changed write must report sessionCount=1.");
        AssertEqual(1, GetInt(payload, "saveCount"), "create_folder changed write must report saveCount=1.");
        AssertEqual(0, GetInt(payload, "editableRetryCount"), "create_folder changed write must report editableRetryCount=0.");
        AssertEqual(1, GetInt(payload, "nativeMutationAttemptCount"), "create_folder changed write must report nativeMutationAttemptCount=1.");
    }

    private static string FindSourcePath()
    {
        string explicitRoot = Environment.GetEnvironmentVariable("ASCET_TEST_SOURCE_ROOT");
        if (!String.IsNullOrWhiteSpace(explicitRoot))
        {
            string explicitCandidate = Path.Combine(explicitRoot, "ascetcli", "src", "AscetCli", "AscetCreateFolder.cs");
            if (File.Exists(explicitCandidate))
            {
                return explicitCandidate;
            }
        }

        string[] roots = new string[]
        {
            AppDomain.CurrentDomain.BaseDirectory,
            Directory.GetCurrentDirectory()
        };

        for (int rootIndex = 0; rootIndex < roots.Length; rootIndex++)
        {
            DirectoryInfo directory = new DirectoryInfo(roots[rootIndex]);
            while (directory != null)
            {
                string candidate = Path.Combine(directory.FullName, "src", "AscetCli", "AscetCreateFolder.cs");
                if (File.Exists(candidate))
                {
                    return candidate;
                }

                candidate = Path.Combine(directory.FullName, "ascetcli", "src", "AscetCli", "AscetCreateFolder.cs");
                if (File.Exists(candidate))
                {
                    return candidate;
                }

                directory = directory.Parent;
            }
        }

        throw new Exception("Unable to locate src\\AscetCli\\AscetCreateFolder.cs.");
    }

    private static int CountOccurrences(string text, string value)
    {
        int count = 0;
        int index = 0;
        while (!String.IsNullOrEmpty(text) && !String.IsNullOrEmpty(value))
        {
            index = text.IndexOf(value, index, StringComparison.Ordinal);
            if (index < 0)
            {
                return count;
            }

            count++;
            index += value.Length;
        }

        return count;
    }

    private static bool GetBool(IDictionary<string, object> payload, string key)
    {
        object value;
        return payload != null && payload.TryGetValue(key, out value) && value is bool && (bool)value;
    }

    private static string GetString(IDictionary<string, object> payload, string key)
    {
        object value;
        if (payload == null || !payload.TryGetValue(key, out value) || value == null)
        {
            return String.Empty;
        }

        return Convert.ToString(value) ?? String.Empty;
    }

    private static int GetInt(IDictionary<string, object> payload, string key)
    {
        object value;
        if (payload == null || !payload.TryGetValue(key, out value) || value == null)
        {
            return 0;
        }

        return Convert.ToInt32(value);
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
