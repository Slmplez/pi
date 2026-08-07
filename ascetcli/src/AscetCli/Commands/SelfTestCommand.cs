using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading;

public static class SelfTestCommand
{
    private const int ExitCodeStructuredError = 2;
    private const int DefaultTimeoutMs = 30000;

    public static int Run(string[] args)
    {
        string profile;
        Dictionary<string, object> parseError = ParseArguments(args, out profile);
        if (parseError != null)
        {
            return AscetCliEnvelope.WriteError(ExitCodeStructuredError, parseError);
        }

        string commandName = ResolveCommandName(profile);
        string executablePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, commandName);
        if (!File.Exists(executablePath))
        {
            return AscetCliEnvelope.WriteError(
                ExitCodeStructuredError,
                AscetCliEnvelope.Error(
                    "not_found",
                    "Self-test executable '" + commandName + "' was not found next to AscetCli.exe.",
                    "selftest",
                    profile));
        }

        ProcessExecutionResult execution;
        try
        {
            execution = Execute(executablePath, DefaultTimeoutMs);
        }
        catch (Exception ex)
        {
            return AscetCliEnvelope.WriteError(
                ExitCodeStructuredError,
                AscetCliEnvelope.Error(
                    "selftest_launch_failed",
                    ex.Message,
                    "selftest",
                    profile));
        }

        Dictionary<string, object> result = new Dictionary<string, object>();
        result["profile"] = profile;
        result["command"] = commandName;
        result["passed"] = execution.Passed;
        result["exitCode"] = execution.ExitCode;
        result["timedOut"] = execution.TimedOut;
        result["status"] = ClassifyStatus(execution);
        result["stdout"] = execution.Stdout;
        result["stderr"] = execution.Stderr;

        if (!execution.Passed)
        {
            string status = ClassifyStatus(execution);
            return AscetCliEnvelope.WriteError(
                ExitCodeStructuredError,
                AscetCliEnvelope.Error(
                    MapFailureCode(status),
                    "selftest profile '" + profile + "' reported status '" + status + "'.",
                    "selftest",
                    profile));
        }

        return AscetCliEnvelope.WriteSuccess(
            AscetCliEnvelope.Success(
                "selftest",
                profile,
                result));
    }

    public static string[] GetSupportedProfiles()
    {
        return new string[] { "quick", "deep", "smoke" };
    }

    private static Dictionary<string, object> ParseArguments(string[] args, out string profile)
    {
        profile = String.Empty;
        for (int i = 0; i < (args == null ? 0 : args.Length); i++)
        {
            string argument = args[i] ?? String.Empty;
            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (String.IsNullOrWhiteSpace(profile))
            {
                if (!IsSupportedProfile(argument))
                {
                    return AscetCliEnvelope.Error(
                        "invalid_arguments",
                        "Unknown selftest profile '" + argument + "'. Expected one of: quick, deep, smoke.",
                        "selftest",
                        argument);
                }

                profile = argument.ToLowerInvariant();
                continue;
            }

            return AscetCliEnvelope.Error(
                "invalid_arguments",
                "Unknown argument '" + argument + "' for selftest mode.",
                "selftest",
                profile);
        }

        if (String.IsNullOrWhiteSpace(profile))
        {
            return AscetCliEnvelope.Error(
                "invalid_arguments",
                "selftest mode requires a profile token. Expected one of: quick, deep, smoke.",
                "selftest",
                String.Empty);
        }

        return null;
    }

    private static bool IsSupportedProfile(string candidate)
    {
        string[] profiles = GetSupportedProfiles();
        for (int i = 0; i < profiles.Length; i++)
        {
            if (String.Equals(candidate, profiles[i], StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static string ResolveCommandName(string profile)
    {
        switch ((profile ?? String.Empty).ToLowerInvariant())
        {
            case "quick":
                return "AscetReadDomainQuickCheck.exe";
            case "deep":
                return "AscetReadDomainDeepCheck.exe";
            case "smoke":
                return "AscetReadDomainSmoke.exe";
            default:
                throw new InvalidOperationException("Unsupported selftest profile '" + profile + "'.");
        }
    }

    private static ProcessExecutionResult Execute(string executablePath, int timeoutMs)
    {
        ProcessStartInfo startInfo = new ProcessStartInfo();
        startInfo.FileName = executablePath;
        startInfo.WorkingDirectory = Path.GetDirectoryName(executablePath);
        startInfo.UseShellExecute = false;
        startInfo.RedirectStandardOutput = true;
        startInfo.RedirectStandardError = true;
        startInfo.CreateNoWindow = true;

        using (Process process = new Process())
        {
            process.StartInfo = startInfo;
            if (!process.Start())
            {
                throw new InvalidOperationException("Failed to start self-test executable '" + executablePath + "'.");
            }

            StringBuilder stdoutBuilder = new StringBuilder();
            StringBuilder stderrBuilder = new StringBuilder();
            Exception stdoutError = null;
            Exception stderrError = null;

            Thread stdoutThread = new Thread(delegate()
            {
                try
                {
                    stdoutBuilder.Append(process.StandardOutput.ReadToEnd());
                }
                catch (Exception ex)
                {
                    stdoutError = ex;
                }
            });
            stdoutThread.IsBackground = true;
            stdoutThread.Start();

            Thread stderrThread = new Thread(delegate()
            {
                try
                {
                    stderrBuilder.Append(process.StandardError.ReadToEnd());
                }
                catch (Exception ex)
                {
                    stderrError = ex;
                }
            });
            stderrThread.IsBackground = true;
            stderrThread.Start();

            if (!process.WaitForExit(timeoutMs))
            {
                try
                {
                    process.Kill();
                }
                catch
                {
                }

                process.WaitForExit();
                stdoutThread.Join(1000);
                stderrThread.Join(1000);

                ProcessExecutionResult timedOut = new ProcessExecutionResult();
                timedOut.ExitCode = -1;
                timedOut.Passed = false;
                timedOut.TimedOut = true;
                timedOut.Stdout = stdoutBuilder.ToString();
                timedOut.Stderr = stderrBuilder.ToString();
                return timedOut;
            }

            stdoutThread.Join(1000);
            stderrThread.Join(1000);

            if (stdoutError != null)
            {
                throw new InvalidOperationException("Failed to read self-test stdout.", stdoutError);
            }

            if (stderrError != null)
            {
                throw new InvalidOperationException("Failed to read self-test stderr.", stderrError);
            }

            ProcessExecutionResult completed = new ProcessExecutionResult();
            completed.ExitCode = process.ExitCode;
            completed.Passed = process.ExitCode == 0;
            completed.TimedOut = false;
            completed.Stdout = stdoutBuilder.ToString();
            completed.Stderr = stderrBuilder.ToString();
            return completed;
        }
    }

    private static string ClassifyStatus(ProcessExecutionResult execution)
    {
        if (execution == null)
        {
            return "unknown";
        }

        if (execution.TimedOut)
        {
            return "timeout";
        }

        if (execution.Passed)
        {
            return "passed";
        }

        string output = (execution.Stdout ?? String.Empty) + Environment.NewLine + (execution.Stderr ?? String.Empty);
        if (output.IndexOf("database_not_open", StringComparison.OrdinalIgnoreCase) >= 0
            || output.IndexOf("tool_connect_failed", StringComparison.OrdinalIgnoreCase) >= 0
            || output.IndexOf("Failed to connect to ASCET ToolAPI.", StringComparison.OrdinalIgnoreCase) >= 0
            || output.IndexOf("No database is open in ASCET GUI", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            return "environment_unavailable";
        }

        return "failed";
    }

    private static string MapFailureCode(string status)
    {
        switch (status ?? String.Empty)
        {
            case "timeout":
                return "selftest_timeout";
            case "environment_unavailable":
                return "environment_unavailable";
            default:
                return "selftest_failed";
        }
    }

    private sealed class ProcessExecutionResult
    {
        public int ExitCode;
        public bool Passed;
        public bool TimedOut;
        public string Stdout;
        public string Stderr;
    }
}
