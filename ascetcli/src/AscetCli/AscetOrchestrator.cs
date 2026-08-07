using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;

class AscetOrchestrator
{
    static int Main(string[] args)
    {
        try
        {
            int readerCount = GetIntArg(args, 0, 2);
            int writerCount = GetIntArg(args, 1, 1);
            int iterations = GetIntArg(args, 2, 5);
            string workerExePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "AscetWorker.exe");

            if (!File.Exists(workerExePath))
            {
                throw new FileNotFoundException("AscetWorker.exe not found.", workerExePath);
            }

            List<ConcurrencyRunResult> results = new List<ConcurrencyRunResult>();

            for (int i = 0; i < readerCount; i++)
            {
                results.Add(RunWorker(workerExePath, "reader-" + (i + 1), "read", iterations));
            }

            for (int i = 0; i < writerCount; i++)
            {
                results.Add(RunWorker(workerExePath, "writer-" + (i + 1), "write", iterations));
            }

            Console.Write(AscetConcurrencySupport.FormatAggregateSummary(results, "multiprocess"));
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(AscetConcurrencySupport.FormatException(ex));
            return 1;
        }
    }

    private static ConcurrencyRunResult RunWorker(string workerExePath, string workerId, string mode, int iterations)
    {
        ProcessStartInfo startInfo = new ProcessStartInfo
        {
            FileName = workerExePath,
            Arguments = workerId + " " + mode + " " + iterations,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
            WorkingDirectory = AppDomain.CurrentDomain.BaseDirectory
        };

        using (Process process = Process.Start(startInfo))
        {
            string stdout = process.StandardOutput.ReadToEnd();
            string stderr = process.StandardError.ReadToEnd();
            process.WaitForExit();

            if (process.ExitCode == 1)
            {
                throw new InvalidOperationException("Worker failed: " + stderr);
            }

            string json = ExtractJson(stdout);
            if (String.IsNullOrEmpty(json))
            {
                throw new InvalidOperationException("Worker returned empty output. stderr=" + stderr);
            }

            return AscetConcurrencySupport.DeserializeResult(json);
        }
    }

    private static int GetIntArg(string[] args, int index, int fallback)
    {
        return args.Length > index ? Int32.Parse(args[index]) : fallback;
    }

    private static string ExtractJson(string stdout)
    {
        string[] lines = stdout.Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);
        for (int i = lines.Length - 1; i >= 0; i--)
        {
            string line = lines[i].Trim();
            if (line.StartsWith("{", StringComparison.Ordinal) && line.EndsWith("}", StringComparison.Ordinal))
            {
                return line;
            }
        }

        return null;
    }
}
