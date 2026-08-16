using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Web.Script.Serialization;

public delegate int LegacyOperationEntryPoint(string[] args);

public sealed class LegacyOperationInvocationResult
{
    public int ExitCode { get; set; }
    public string Stdout { get; set; }
    public string Stderr { get; set; }
}

public sealed class InProcessLegacyOperationException : Exception
{
    public string Code { get; private set; }
    public string Operation { get; private set; }
    public bool? MutationStarted { get; private set; }
    public Dictionary<string, object> Envelope { get; private set; }

    public InProcessLegacyOperationException(
        string code,
        string operation,
        string message,
        bool? mutationStarted,
        Dictionary<string, object> envelope)
        : base(message)
    {
        Code = code ?? String.Empty;
        Operation = operation ?? String.Empty;
        MutationStarted = mutationStarted;
        Envelope = envelope;
    }
}

public static class InProcessLegacyOperationAdapter
{
    private const int ExitCodeStructuredError = 2;
    private static readonly object ConsoleCaptureGate = new object();

    public static int Run(string operation, LegacyOperationEntryPoint entryPoint, string[] args)
    {
        try
        {
            ValidateInvocationArguments(operation, args);
        }
        catch (AscetReadException ex)
        {
            return WriteFailure(operation, ex.Code, ex.Message, String.Empty, String.Empty, false);
        }

        LegacyOperationInvocationResult invocation = Invoke(entryPoint, args);
        if (invocation.ExitCode != 0)
        {
            Dictionary<string, object> envelope = TryParseObject(invocation.Stdout);
            Dictionary<string, object> error = GetDictionary(envelope, "error");
            string code = GetString(error, "code");
            string message = GetString(error, "message");
            if (String.IsNullOrWhiteSpace(code))
            {
                code = "legacy_operation_failed";
            }
            if (String.IsNullOrWhiteSpace(message))
            {
                message = FirstNonEmpty(
                    invocation.Stderr,
                    invocation.Stdout,
                    "Legacy operation returned exit code " + invocation.ExitCode.ToString(CultureInfo.InvariantCulture) + ".");
            }
            return WriteFailure(operation, code, message, invocation.Stdout, invocation.Stderr, ReadMutationStarted(envelope) ?? AscetCliEnvelope.ResolveFailureMutationStarted(IsMutatingOperation(operation), code));
        }

        Dictionary<string, object> result = TryParseObject(invocation.Stdout);
        if (result == null)
        {
            result = new Dictionary<string, object>(StringComparer.Ordinal);
            result["rawOutput"] = invocation.Stdout ?? String.Empty;
        }
        if (!String.IsNullOrWhiteSpace(invocation.Stderr))
        {
            Console.Error.Write(invocation.Stderr);
        }
        return AscetCliEnvelope.WriteSuccess(AscetCliEnvelope.Success("exec", operation, result, IsMutatingOperation(operation)));
    }

    public static void ValidateInvocationArguments(string operation, string[] args)
    {
        int requiredCount = ResolveRequiredPositionalCount(operation, args);
        if (requiredCount == 0)
        {
            return;
        }

        if (args == null || args.Length < requiredCount)
        {
            throw new AscetReadException(
                "invalid_arguments",
                operation ?? String.Empty,
                "Operation '" + (operation ?? String.Empty) + "' requires " + requiredCount.ToString(CultureInfo.InvariantCulture) + " positional argument(s) before options.");
        }

        for (int i = 0; i < requiredCount; i++)
        {
            string value = args[i] ?? String.Empty;
            if (String.IsNullOrWhiteSpace(value) || value.StartsWith("--", StringComparison.Ordinal))
            {
                throw new AscetReadException(
                    "invalid_arguments",
                    operation ?? String.Empty,
                    "Positional argument " + (i + 1).ToString(CultureInfo.InvariantCulture) + " for operation '" + (operation ?? String.Empty) + "' is missing or looks like an option.");
            }
        }
    }

    private static int ResolveRequiredPositionalCount(string operation, string[] args)
    {
        switch ((operation ?? String.Empty).Trim().ToLowerInvariant())
        {
            case "apply_project_formula":
            case "create_method":
            case "guarded_create_method":
            case "preflight_create_method":
            case "delete_method":
                return 2;
            case "create_folder":
            case "preflight_create_folder":
            case "delete_component":
            case "delete_folder":
                return 1;
            case "set_class_method_code":
                return 3;
            case "set_module_code":
                return ResolveSetModuleCodeRequiredCount(args);
            case "set_state_machine_code":
                return ResolveSetStateMachineCodeRequiredCount(args);
            default:
                return 0;
        }
    }

    private static int ResolveSetModuleCodeRequiredCount(string[] args)
    {
        string suboperation = args != null && args.Length > 1 ? args[1] : String.Empty;
        return String.Equals(suboperation, "set-method", StringComparison.OrdinalIgnoreCase) ? 4 : 3;
    }

    private static int ResolveSetStateMachineCodeRequiredCount(string[] args)
    {
        string suboperation = args != null && args.Length > 1 ? args[1] : String.Empty;
        switch ((suboperation ?? String.Empty).Trim().ToLowerInvariant())
        {
            case "set-transition-condition-esdl":
            case "set-transition-action-esdl":
            case "bind-transition-condition-method":
            case "bind-transition-action-method":
                return 6;
            case "set-start-state":
                return 3;
            default:
                return 4;
        }
    }
    public static LegacyOperationInvocationResult Invoke(LegacyOperationEntryPoint entryPoint, string[] args)
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
            StringWriter capturedOut = new StringWriter(CultureInfo.InvariantCulture);
            StringWriter capturedError = new StringWriter(CultureInfo.InvariantCulture);
            int exitCode;

            try
            {
                Console.SetOut(capturedOut);
                Console.SetError(capturedError);
                exitCode = entryPoint(args ?? new string[0]);
            }
            catch (Exception ex)
            {
                exitCode = 1;
                capturedError.WriteLine(ex.GetType().FullName);
                capturedError.WriteLine(ex.Message);
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

            return new LegacyOperationInvocationResult
            {
                ExitCode = exitCode,
                Stdout = capturedOut.ToString(),
                Stderr = capturedError.ToString()
            };
        }
    }

    public static Dictionary<string, object> InvokeJsonObject(string operation, LegacyOperationEntryPoint entryPoint, string[] args)
    {
        LegacyOperationInvocationResult invocation = Invoke(entryPoint, args);
        Dictionary<string, object> parsed = TryParseObject(invocation.Stdout);
        if (invocation.ExitCode != 0)
        {
            Dictionary<string, object> error = GetDictionary(parsed, "error");
            throw new InProcessLegacyOperationException(
                FirstNonEmpty(GetString(error, "code"), String.Empty, "in_process_operation_failed"),
                operation ?? String.Empty,
                FirstNonEmpty(GetString(error, "message"), invocation.Stderr, "In-process operation failed."),
                ReadMutationStarted(parsed),
                parsed);
        }

        if (parsed == null)
        {
            throw new AscetReadException(
                "invalid_json",
                operation ?? String.Empty,
                "In-process operation did not return a JSON object.");
        }

        object okValue;
        if (parsed.TryGetValue("ok", out okValue) && okValue is bool && !(bool)okValue)
        {
            Dictionary<string, object> error = GetDictionary(parsed, "error");
            throw new InProcessLegacyOperationException(
                FirstNonEmpty(GetString(error, "code"), String.Empty, "in_process_operation_failed"),
                operation ?? String.Empty,
                FirstNonEmpty(GetString(error, "message"), invocation.Stderr, "In-process operation failed."),
                ReadMutationStarted(parsed),
                parsed);
        }

        Dictionary<string, object> result = GetDictionary(parsed, "result");
        return result ?? parsed;
    }

    private static int WriteFailure(string operation, string code, string message, string stdout, string stderr, bool? mutationStarted)
    {
        if (!String.IsNullOrWhiteSpace(stderr))
        {
            Console.Error.Write(stderr);
        }
        else if (!String.IsNullOrWhiteSpace(stdout))
        {
            Console.Error.Write(stdout);
        }

        return AscetCliEnvelope.WriteError(
            ExitCodeStructuredError,
            AscetCliEnvelope.Error(
                String.IsNullOrWhiteSpace(code) ? "legacy_operation_failed" : code,
                message ?? String.Empty,
                "exec",
                operation,
                mutationStarted));
    }

    private static bool IsMutatingOperation(string operation)
    {
        OperationDescriptor descriptor;
        return OperationRegistry.TryResolve(operation, out descriptor) && descriptor.MutatesDatabase;
    }

    private static Dictionary<string, object> TryParseObject(string raw)
    {
        string trimmed = (raw ?? String.Empty).Trim();
        if (trimmed.Length == 0 || !trimmed.StartsWith("{", StringComparison.Ordinal))
        {
            return null;
        }

        try
        {
            JavaScriptSerializer serializer = new JavaScriptSerializer();
            serializer.MaxJsonLength = Int32.MaxValue;
            return serializer.DeserializeObject(trimmed) as Dictionary<string, object>;
        }
        catch
        {
            return null;
        }
    }

    internal static bool? ReadMutationStarted(IDictionary<string, object> envelope)
    {
        Dictionary<string, object> meta = GetDictionary(envelope, "meta");
        if (meta == null || !meta.ContainsKey("mutationStarted") || !(meta["mutationStarted"] is bool))
        {
            return null;
        }
        return (bool)meta["mutationStarted"];
    }

    private static Dictionary<string, object> GetDictionary(IDictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key))
        {
            return null;
        }
        return payload[key] as Dictionary<string, object>;
    }

    private static string GetString(IDictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }
        return Convert.ToString(payload[key], CultureInfo.InvariantCulture) ?? String.Empty;
    }

    private static string FirstNonEmpty(string first, string second, string fallback)
    {
        if (!String.IsNullOrWhiteSpace(first))
        {
            return first.Trim();
        }
        if (!String.IsNullOrWhiteSpace(second))
        {
            return second.Trim();
        }
        return fallback ?? String.Empty;
    }
}



