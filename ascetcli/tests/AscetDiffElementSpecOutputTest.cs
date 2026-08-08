using System;
using System.IO;

public static class AscetDiffElementSpecOutputTest
{
    public static int Main()
    {
        try
        {
            TestRelativeSpecFileUsesExplicitWorkingDirectory();
            TestParseArgumentsCapturesInvocationWorkingDirectory();
            TestAbsoluteSpecFileIsIndependentOfWorkingDirectory();
            Console.WriteLine("AscetDiffElementSpecOutputTest passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void TestRelativeSpecFileUsesExplicitWorkingDirectory()
    {
        string root = CreateTemporaryDirectory();
        string workingDirectory = Path.Combine(root, "workspace");
        string specPath = Path.Combine(workingDirectory, "specs", "element-spec.json");
        Directory.CreateDirectory(Path.GetDirectoryName(specPath));
        File.WriteAllText(specPath, "{}");

        string resolved = AscetDiffElementSpec.ResolveSpecFilePath("specs\\element-spec.json", workingDirectory);
        AssertEqual(Path.GetFullPath(specPath), resolved, "relative spec file should resolve from the supplied working directory.");
        AssertEqual("{}", AscetDiffElementSpec.ReadSpecFile(resolved), "resolved spec file should be readable.");
    }

    private static void TestParseArgumentsCapturesInvocationWorkingDirectory()
    {
        string root = CreateTemporaryDirectory();
        string originalWorkingDirectory = Environment.CurrentDirectory;
        string specPath = Path.Combine(root, "relative", "element-spec.json");
        Directory.CreateDirectory(Path.GetDirectoryName(specPath));
        File.WriteAllText(specPath, "{}");

        try
        {
            Directory.SetCurrentDirectory(root);
            AscetDiffElementSpecArguments parsed = AscetDiffElementSpec.ParseArguments(new string[]
            {
                "PlatformLibrary/Package/Example",
                "relative/element-spec.json",
                "--json"
            });

            AssertEqual(Path.GetFullPath(specPath), parsed.SpecFilePath, "ParseArguments should resolve relative specs from the invocation working directory.");
            AssertEqual("PlatformLibrary\\Package\\Example", parsed.ComponentPath, "component path should normalize separators.");
            AssertTrue(parsed.EmitJson, "json flag should parse.");
        }
        finally
        {
            Directory.SetCurrentDirectory(originalWorkingDirectory);
        }
    }

    private static void TestAbsoluteSpecFileIsIndependentOfWorkingDirectory()
    {
        string root = CreateTemporaryDirectory();
        string absoluteSpecPath = Path.Combine(root, "absolute-spec.json");
        string unrelatedDirectory = Path.Combine(root, "unrelated");
        File.WriteAllText(absoluteSpecPath, "{}");
        Directory.CreateDirectory(unrelatedDirectory);

        string resolved = AscetDiffElementSpec.ResolveSpecFilePath(absoluteSpecPath, unrelatedDirectory);
        AssertEqual(Path.GetFullPath(absoluteSpecPath), resolved, "absolute spec file path should not be rebased to the working directory.");
    }

    private static string CreateTemporaryDirectory()
    {
        string directory = Path.Combine(Path.GetTempPath(), "AscetDiffElementSpecOutputTest_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        return directory;
    }

    private static void AssertEqual<T>(T expected, T actual, string message)
    {
        if (Object.Equals(expected, actual) == false)
        {
            throw new Exception(message + " Expected '" + expected + "', got '" + actual + "'.");
        }
    }

    private static void AssertTrue(bool condition, string message)
    {
        if (condition == false)
        {
            throw new Exception(message);
        }
    }
}
