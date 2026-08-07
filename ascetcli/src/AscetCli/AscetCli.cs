using System;
using System.Collections.Generic;
using System.Text;
using System.Web.Script.Serialization;

public sealed class AscetCli
{
    private const int ExitCodeUnhandled = 1;
    private const int ExitCodeStructuredError = 2;

    [STAThread]
    public static int Main(string[] args)
    {
        Console.InputEncoding = Encoding.UTF8;
        Console.OutputEncoding = new UTF8Encoding(false);

        try
        {
            string subcommand = AscetCliEnvelope.GetToken(args, 0);
            switch ((subcommand ?? String.Empty).ToLowerInvariant())
            {
                case "exec":
                    return ExecCommand.Run(AscetCliEnvelope.Slice(args, 1));
                case "batch":
                    return BatchCommand.Run(AscetCliEnvelope.Slice(args, 1));
                case "host":
                    return HostCommand.Run(AscetCliEnvelope.Slice(args, 1));
                case "capabilities":
                    return CapabilitiesCommand.Run(AscetCliEnvelope.Slice(args, 1));
                case "selftest":
                    return SelfTestCommand.Run(AscetCliEnvelope.Slice(args, 1));
                case "benchmark":
                    return BenchmarkCommand.Run(AscetCliEnvelope.Slice(args, 1));
                default:
                    return AscetCliEnvelope.WriteError(
                        ExitCodeStructuredError,
                        AscetCliEnvelope.Error(
                            "invalid_arguments",
                            "A subcommand is required. Expected one of: exec, batch, host, capabilities, selftest, benchmark.",
                            "root",
                            String.Empty));
            }
        }
        catch (Exception ex)
        {
            return AscetCliEnvelope.WriteError(
                ExitCodeUnhandled,
                AscetCliEnvelope.Error(
                    "unhandled_exception",
                    ex.Message,
                    "root",
                    String.Empty));
        }
    }
}

internal static class AscetCliEnvelope
{
    private static readonly JavaScriptSerializer Serializer = new JavaScriptSerializer();

    public static Dictionary<string, object> Success(string mode, string operation, Dictionary<string, object> result)
    {
        return CreateEnvelope(true, mode, operation, result, null);
    }

    public static Dictionary<string, object> Error(string code, string message, string mode, string operation)
    {
        Dictionary<string, object> error = new Dictionary<string, object>();
        error["code"] = code ?? String.Empty;
        error["message"] = message ?? String.Empty;
        return CreateEnvelope(false, mode, operation, null, error);
    }

    public static int WriteSuccess(Dictionary<string, object> envelope)
    {
        Console.WriteLine(Serializer.Serialize(envelope ?? new Dictionary<string, object>()));
        return 0;
    }

    public static int WriteError(int exitCode, Dictionary<string, object> envelope)
    {
        Console.WriteLine(Serializer.Serialize(envelope ?? new Dictionary<string, object>()));
        return exitCode;
    }

    public static string GetToken(string[] args, int index)
    {
        if (args == null || index < 0 || index >= args.Length)
        {
            return String.Empty;
        }

        return args[index] ?? String.Empty;
    }

    public static string[] Slice(string[] args, int startIndex)
    {
        if (args == null || startIndex >= args.Length)
        {
            return new string[0];
        }

        int count = args.Length - startIndex;
        string[] result = new string[count];
        Array.Copy(args, startIndex, result, 0, count);
        return result;
    }

    public static bool HasJsonFlag(string[] args)
    {
        if (args == null)
        {
            return false;
        }

        for (int i = 0; i < args.Length; i++)
        {
            if (String.Equals(args[i], "--json", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    public static Dictionary<string, object> ParseLaneArguments(string[] args, string mode, string[] allowedLanes, string defaultLane, out string lane, out bool emitJson)
    {
        lane = defaultLane ?? String.Empty;
        emitJson = false;

        if (args == null)
        {
            return null;
        }

        for (int i = 0; i < args.Length; i++)
        {
            string argument = args[i] ?? String.Empty;
            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                emitJson = true;
                continue;
            }

            if (String.Equals(argument, "--lane", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    return Error("invalid_arguments", mode + " mode requires a lane value after --lane.", mode, lane);
                }

                string candidate = args[++i] ?? String.Empty;
                if (!IsAllowedLane(candidate, allowedLanes))
                {
                    return Error("invalid_arguments", "Lane '" + candidate + "' is not valid for " + mode + " mode.", mode, candidate);
                }

                lane = candidate;
                continue;
            }

            return Error("invalid_arguments", "Unknown argument '" + argument + "' for " + mode + " mode.", mode, lane);
        }

        return null;
    }

    private static bool IsAllowedLane(string candidate, string[] allowedLanes)
    {
        if (String.IsNullOrWhiteSpace(candidate) || allowedLanes == null)
        {
            return false;
        }

        for (int i = 0; i < allowedLanes.Length; i++)
        {
            if (String.Equals(candidate, allowedLanes[i], StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static Dictionary<string, object> CreateEnvelope(bool ok, string mode, string operation, Dictionary<string, object> result, Dictionary<string, object> error)
    {
        Dictionary<string, object> envelope = new Dictionary<string, object>();
        envelope["ok"] = ok;
        envelope["result"] = result;
        envelope["error"] = error;

        Dictionary<string, object> meta = new Dictionary<string, object>();
        meta["mode"] = mode ?? String.Empty;
        if (!String.IsNullOrWhiteSpace(operation))
        {
            meta["operation"] = operation;
        }

        envelope["meta"] = meta;
        return envelope;
    }
}
