using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;
internal static class AscetCliEnvelope
{
    private static readonly JavaScriptSerializer Serializer = CreateSerializer();
    private static readonly TextWriter ProtocolWriter = CreateProtocolWriter();
    private static readonly string BridgeGeneration = Guid.NewGuid().ToString("D");
    private static readonly Stopwatch ProcessStopwatch = Stopwatch.StartNew();

    public static void Initialize()
    {
        long ignored = ProcessStopwatch.ElapsedMilliseconds;
    }
    private static JavaScriptSerializer CreateSerializer()
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        serializer.MaxJsonLength = Int32.MaxValue;
        return serializer;
    }

    private static TextWriter CreateProtocolWriter()
    {
        StreamWriter writer = new StreamWriter(Console.OpenStandardOutput(), new UTF8Encoding(false));
        writer.AutoFlush = true;
        return TextWriter.Synchronized(writer);
    }
    public static Dictionary<string, object> Success(
        string mode,
        string operation,
        Dictionary<string, object> result,
        bool? mutationStarted = null)
    {
        return CreateEnvelope(true, mode, operation, result, null, mutationStarted);
    }

    public static Dictionary<string, object> Error(
        string code,
        string message,
        string mode,
        string operation,
        bool? mutationStarted = null)
    {
        Dictionary<string, object> error = new Dictionary<string, object>();
        error["code"] = code ?? String.Empty;
        error["message"] = message ?? String.Empty;
        return Error(error, mode, operation, mutationStarted);
    }

    public static Dictionary<string, object> Error(
        Dictionary<string, object> error,
        string mode,
        string operation,
        bool? mutationStarted = null)
    {
        return CreateEnvelope(false, mode, operation, null, error, mutationStarted);
    }

    public static int WriteSuccess(Dictionary<string, object> envelope)
    {
        return Write(0, envelope);
    }

    public static int WriteError(int exitCode, Dictionary<string, object> envelope)
    {
        return Write(exitCode, envelope);
    }

    public static int Write(int exitCode, Dictionary<string, object> envelope)
    {
        ProtocolWriter.WriteLine(Serializer.Serialize(envelope ?? new Dictionary<string, object>()));
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

    private static string ResolveSessionPolicy(string mode, string operation)
    {
        if (String.Equals(mode, "capabilities", StringComparison.OrdinalIgnoreCase)
            || String.Equals(mode, "root", StringComparison.OrdinalIgnoreCase)
            || String.Equals(mode, "serve", StringComparison.OrdinalIgnoreCase)
            || String.Equals(mode, "benchmark", StringComparison.OrdinalIgnoreCase)
            || (String.Equals(mode, "selftest", StringComparison.OrdinalIgnoreCase)
                && String.Equals(operation, "offline", StringComparison.OrdinalIgnoreCase)))
        {
            return "no_session";
        }
        return "fresh_session";
    }
    internal static bool? ResolveFailureMutationStarted(bool mutating, string code)
    {
        if (!mutating)
        {
            return false;
        }

        return String.Equals(code, "editable_write_gate_blocked", StringComparison.Ordinal)
            ? (bool?)false
            : null;
    }

    private static bool? ResolveMutationStarted(string mode, string operation, bool? mutationStarted)
    {
        if (mutationStarted.HasValue)
        {
            return mutationStarted;
        }

        if (String.Equals(mode, "exec", StringComparison.OrdinalIgnoreCase)
            || String.Equals(mode, "batch", StringComparison.OrdinalIgnoreCase))
        {
            OperationDescriptor descriptor;
            if (OperationRegistry.TryResolve(operation, out descriptor))
            {
                return descriptor.MutatesDatabase ? (bool?)null : false;
            }
        }

        return false;
    }

    private static Dictionary<string, object> CreateEnvelope(
        bool ok,
        string mode,
        string operation,
        Dictionary<string, object> result,
        Dictionary<string, object> error,
        bool? mutationStarted)
    {
        Dictionary<string, object> envelope = new Dictionary<string, object>();
        envelope["type"] = "response";
        envelope["protocolVersion"] = 1;
        envelope["ok"] = ok;
        envelope["result"] = result;
        envelope["error"] = error;

        Dictionary<string, object> meta = new Dictionary<string, object>();
        meta["bridgePid"] = Process.GetCurrentProcess().Id;
        meta["bridgeGeneration"] = BridgeGeneration;
        meta["durationMs"] = ProcessStopwatch.ElapsedMilliseconds;
        meta["sessionPolicy"] = ResolveSessionPolicy(mode, operation);
        meta["mutationStarted"] = ResolveMutationStarted(mode, operation, mutationStarted);
        meta["mode"] = mode ?? String.Empty;
        if (!String.IsNullOrWhiteSpace(operation))
        {
            meta["operation"] = operation;
        }

        envelope["meta"] = meta;
        return envelope;
    }
}
