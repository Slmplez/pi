using System;
using System.Diagnostics;
using System.IO;

public static class AscetLegacyShimSmoke
{
    public static int Main()
    {
        try
        {
            string binDir = FindPathUpwards("output", "ascet-csharp", "bin");
            string cliPath = Path.Combine(binDir, "AscetCli.exe");
            string listFoldersShimPath = Path.Combine(binDir, "AscetListFolders.exe");
            string createComponentShimPath = Path.Combine(binDir, "AscetCreateComponent.exe");

            AssertTrue(File.Exists(cliPath), "AscetCli.exe should exist before running the legacy shim smoke.");
            if (!File.Exists(listFoldersShimPath) || !File.Exists(createComponentShimPath))
            {
                Console.WriteLine("AscetLegacyShimSmoke skipped: compatibility shims are not present in this build.");
                return 0;
            }

            AssertShimMatchesDirectCli(
                listFoldersShimPath,
                new string[] { "Demo\\Folder", "--depth", "-1", "--json" },
                cliPath,
                new string[] { "exec", "list_folders", "--root", "Demo\\Folder", "--depth", "-1", "--json" },
                "AscetListFolders.exe");

            AssertShimMatchesDirectCli(
                createComponentShimPath,
                new string[] { "Demo\\Controller", "--json" },
                cliPath,
                new string[] { "exec", "create_component", "Demo\\Controller", "--json" },
                "AscetCreateComponent.exe");

            Console.WriteLine("AscetLegacyShimSmoke passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void AssertShimMatchesDirectCli(
        string shimPath,
        string[] shimArgs,
        string cliPath,
        string[] directArgs,
        string displayName)
    {
        ProcessResult shim = RunProcess(shimPath, shimArgs);
        ProcessResult direct = RunProcess(cliPath, directArgs);

        AssertEqual(direct.ExitCode, shim.ExitCode, displayName + " should preserve the direct AscetCli.exe exit code.");
        AssertEqual(direct.Stdout, shim.Stdout, displayName + " should preserve the direct AscetCli.exe stdout payload.");
        AssertEqual(direct.Stderr, shim.Stderr, displayName + " should preserve the direct AscetCli.exe stderr payload.");
    }

    private static ProcessResult RunProcess(string executablePath, string[] args)
    {
        ProcessStartInfo startInfo = new ProcessStartInfo
        {
            FileName = executablePath,
            Arguments = JoinArguments(args),
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
            WorkingDirectory = Path.GetDirectoryName(executablePath)
        };

        using (Process process = new Process())
        {
            process.StartInfo = startInfo;
            AssertTrue(process.Start(), "Failed to start " + executablePath + ".");
            string stdout = process.StandardOutput.ReadToEnd();
            string stderr = process.StandardError.ReadToEnd();
            AssertTrue(process.WaitForExit(10000), executablePath + " should exit promptly.");

            ProcessResult result = new ProcessResult();
            result.ExitCode = process.ExitCode;
            result.Stdout = stdout;
            result.Stderr = stderr;
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
            if (Directory.Exists(fullPath))
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
            throw new Exception(message + Environment.NewLine + "Expected:" + Environment.NewLine + (expected ?? String.Empty) + Environment.NewLine + "Actual:" + Environment.NewLine + (actual ?? String.Empty));
        }
    }

    private sealed class ProcessResult
    {
        public int ExitCode { get; set; }
        public string Stdout { get; set; }
        public string Stderr { get; set; }
    }
}
