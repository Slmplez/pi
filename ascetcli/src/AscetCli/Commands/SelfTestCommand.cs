using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;

public delegate int AscetSelfTestEntryPoint();

public static class SelfTestCommand
{
    private const int ExitCodeStructuredError = 2;
    private static readonly object ConsoleCaptureGate = new object();

    public static int Run(string[] args)
    {
        string profile;
        Dictionary<string, object> parseError = ParseArguments(args, out profile);
        if (parseError != null)
        {
            return AscetCliEnvelope.WriteError(ExitCodeStructuredError, parseError);
        }

        if (String.Equals(profile, "offline", StringComparison.Ordinal))
        {
            return RunOffline();
        }

        AscetSelfTestEntryPoint entryPoint = ResolveEntryPoint(profile);
        SelfTestExecutionResult execution = Execute(entryPoint);
        if (!String.IsNullOrWhiteSpace(execution.Stderr))
        {
            Console.Error.Write(execution.Stderr);
        }

        string status = execution.ExitCode == 0 ? "passed" : ClassifyStatus(execution);
        if (execution.ExitCode != 0)
        {
            return AscetCliEnvelope.WriteError(
                ExitCodeStructuredError,
                AscetCliEnvelope.Error(
                    MapFailureCode(status),
                    "selftest profile '" + profile + "' reported status '" + status + "'. " + execution.Stderr.Trim(),
                    "selftest",
                    profile));
        }

        Dictionary<string, object> result = new Dictionary<string, object>();
        result["profile"] = profile;
        result["passed"] = true;
        result["status"] = status;
        result["stdout"] = execution.Stdout;
        result["stderr"] = execution.Stderr;
        result["inProcess"] = true;

        return AscetCliEnvelope.WriteSuccess(
            AscetCliEnvelope.Success(
                "selftest",
                profile,
                result));
    }

    public static string[] GetSupportedProfiles()
    {
        return new string[] { "offline", "quick", "deep", "smoke" };
    }

    private static int RunOffline()
    {
        IList<OperationDescriptor> descriptors = AscetBridgeOperationRegistry.GetAll();
        int legacyCount = 0;
        for (int i = 0; i < descriptors.Count; i++)
        {
            OperationDescriptor descriptor = descriptors[i];
            if (descriptor == null || descriptor.Handler == null)
            {
                return AscetCliEnvelope.WriteError(
                    ExitCodeStructuredError,
                    AscetCliEnvelope.Error(
                        "registry_handler_missing",
                        "A Bridge operation is missing its handler.",
                        "selftest",
                        "offline"));
            }
            if (descriptor.HandlerKind == OperationHandlerKind.LegacyOneShotAdapter)
            {
                legacyCount++;
            }
        }

        Dictionary<string, object> result = new Dictionary<string, object>();
        result["profile"] = "offline";
        result["passed"] = true;
        result["status"] = "passed";
        result["operationCount"] = descriptors.Count;
        result["legacyOneShotCount"] = legacyCount;
        result["protocolVersion"] = 1;
        result["inProcess"] = true;
        result["toolApiConnected"] = false;

        return AscetCliEnvelope.WriteSuccess(
            AscetCliEnvelope.Success(
                "selftest",
                "offline",
                result));
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
                        "Unknown selftest profile '" + argument + "'. Expected one of: offline, quick, deep, smoke.",
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
                "selftest mode requires a profile token. Expected one of: offline, quick, deep, smoke.",
                "selftest",
                String.Empty);
        }
        return null;
    }

    private static bool IsSupportedProfile(string profile)
    {
        string normalized = (profile ?? String.Empty).Trim().ToLowerInvariant();
        return normalized == "offline" || normalized == "quick" || normalized == "deep" || normalized == "smoke";
    }

    private static AscetSelfTestEntryPoint ResolveEntryPoint(string profile)
    {
        switch (profile ?? String.Empty)
        {
            case "quick":
                return AscetReadDomainQuickCheck.Run;
            case "deep":
                return AscetReadDomainDeepCheck.Run;
            case "smoke":
                return AscetReadDomainSmoke.Run;
            default:
                throw new AscetReadException("invalid_arguments", "selftest", "Unsupported selftest profile '" + profile + "'.");
        }
    }

    private static SelfTestExecutionResult Execute(AscetSelfTestEntryPoint entryPoint)
    {
        if (entryPoint == null)
        {
            throw new ArgumentNullException("entryPoint");
        }

        lock (ConsoleCaptureGate)
        {
            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            TextReader originalIn = Console.In;
            string originalDirectory = Environment.CurrentDirectory;
            CultureInfo originalCulture = CultureInfo.CurrentCulture;
            CultureInfo originalUiCulture = CultureInfo.CurrentUICulture;
            StringWriter stdout = new StringWriter(CultureInfo.InvariantCulture);
            StringWriter stderr = new StringWriter(CultureInfo.InvariantCulture);
            int exitCode;

            try
            {
                Console.SetOut(stdout);
                Console.SetError(stderr);
                exitCode = entryPoint();
            }
            catch (Exception ex)
            {
                exitCode = 1;
                stderr.WriteLine(ex.GetType().FullName);
                stderr.WriteLine(ex.Message);
            }
            finally
            {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
                Console.SetIn(originalIn);
                Environment.CurrentDirectory = originalDirectory;
                CultureInfo.CurrentCulture = originalCulture;
                CultureInfo.CurrentUICulture = originalUiCulture;
            }

            SelfTestExecutionResult result = new SelfTestExecutionResult();
            result.ExitCode = exitCode;
            result.Stdout = stdout.ToString();
            result.Stderr = stderr.ToString();
            return result;
        }
    }

    private static string ClassifyStatus(SelfTestExecutionResult execution)
    {
        string output = (execution.Stdout ?? String.Empty) + Environment.NewLine + (execution.Stderr ?? String.Empty);
        if (output.IndexOf("database_not_open", StringComparison.OrdinalIgnoreCase) >= 0
            || output.IndexOf("tool_connect_failed", StringComparison.OrdinalIgnoreCase) >= 0
            || output.IndexOf("Failed to connect to ASCET ToolAPI", StringComparison.OrdinalIgnoreCase) >= 0
            || output.IndexOf("No database is open in ASCET GUI", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            return "environment_unavailable";
        }
        return "failed";
    }

    private static string MapFailureCode(string status)
    {
        return String.Equals(status, "environment_unavailable", StringComparison.Ordinal)
            ? "environment_unavailable"
            : "selftest_failed";
    }

    private sealed class SelfTestExecutionResult
    {
        public int ExitCode;
        public string Stdout;
        public string Stderr;
    }
}