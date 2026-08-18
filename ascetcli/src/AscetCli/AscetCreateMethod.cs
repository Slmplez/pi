using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetCreateMethodArguments
{
    public string ComponentPath { get; set; }
    public string MethodName { get; set; }
    public AscetMethodKind MethodKind { get; set; }
    public string DiagramName { get; set; }
    public bool ReturnExisting { get; set; }
    public bool VerifyReadback { get; set; }
    public bool RollbackOnFailure { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetCreateMethod
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetCreateMethodArguments parsed = ParseArguments(args);
            if (parsed.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            MethodCreateService service = new MethodCreateService();
            AscetMethodCreateResult result = service.CreateMethod(
                parsed.ComponentPath,
                parsed.MethodName,
                parsed.MethodKind,
                parsed.DiagramName,
                parsed.VerifyReadback,
                parsed.RollbackOnFailure,
                parsed.ReturnExisting);

            string output = parsed.EmitJson ? FormatJsonOutput(result) : FormatTextOutput(result);
            Console.SetOut(originalOut);
            Console.Write(output);
            return 0;
        }
        catch (Exception ex)
        {
            Console.SetOut(originalOut);
            Console.Error.WriteLine(FormatException(ex));
            return 1;
        }
        finally
        {
            Console.SetOut(originalOut);
            if (suppressedOut != null)
            {
                suppressedOut.Dispose();
            }
        }
    }

    public static AscetCreateMethodArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 2)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec create_method <component-path> <method-name> --method-kind <abstract|process|action|condition|trigger> [--diagram <name>] [--if-exists <fail|return-existing>] [--verify-readback] [--rollback-on-failure] [--json]");
        }

        AscetCreateMethodArguments result = new AscetCreateMethodArguments
        {
            ComponentPath = AscetReadMethodCode.NormalizeComponentPath(args[0]),
            MethodName = AscetReadMethodCode.NormalizeMethodName(args[1]),
            MethodKind = AscetMethodKind.Unknown,
            DiagramName = "Main",
            ReturnExisting = false,
            VerifyReadback = false,
            RollbackOnFailure = false,
            EmitJson = false
        };

        for (int i = 2; i < args.Length; i++)
        {
            string argument = args[i];
            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                result.EmitJson = true;
                continue;
            }

            if (String.Equals(argument, "--verify-readback", StringComparison.OrdinalIgnoreCase))
            {
                result.VerifyReadback = true;
                continue;
            }

            if (String.Equals(argument, "--rollback-on-failure", StringComparison.OrdinalIgnoreCase))
            {
                result.RollbackOnFailure = true;
                continue;
            }

            if (String.Equals(argument, "--diagram", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --diagram.");
                }

                result.DiagramName = NormalizeDiagramName(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--method-kind", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --method-kind.");
                }

                result.MethodKind = ParseMethodKind(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--if-exists", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --if-exists.");
                }

                result.ReturnExisting = ParseIfExists(args[++i]);
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        if (result.MethodKind == AscetMethodKind.Unknown)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "--method-kind is required.");
        }

        return result;
    }

    private static bool ParseIfExists(string value)
    {
        string normalized = (value ?? String.Empty).Trim().ToLowerInvariant();
        switch (normalized)
        {
            case "fail":
                return false;
            case "return-existing":
                return true;
            default:
                throw new AscetReadException("invalid_argument", "if_exists", "Unsupported --if-exists value '" + value + "'. Expected fail or return-existing.");
        }
    }

    private static string NormalizeDiagramName(string value)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            throw new AscetReadException("invalid_argument", "diagram", "Diagram name must not be empty.");
        }

        return value.Trim();
    }

    private static AscetMethodKind ParseMethodKind(string value)
    {
        string normalized = (value ?? String.Empty).Trim().ToLowerInvariant();
        switch (normalized)
        {
            case "abstract":
                return AscetMethodKind.AbstractMethod;
            case "process":
                return AscetMethodKind.Process;
            case "action":
                return AscetMethodKind.Action;
            case "condition":
                return AscetMethodKind.Condition;
            case "trigger":
                return AscetMethodKind.Trigger;
            default:
                throw new AscetReadException("invalid_argument", "method_kind", "Unsupported method kind '" + value + "'.");
        }
    }

    public static string FormatTextOutput(AscetMethodCreateResult result)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(result == null ? String.Empty : (result.ComponentPath ?? String.Empty)).AppendLine();
        builder.Append("Method: ").Append(result == null ? String.Empty : (result.MethodName ?? String.Empty)).AppendLine();
        builder.Append("MethodKind: ").Append(result == null ? AscetMethodKind.Unknown.ToString() : result.MethodKind.ToString()).AppendLine();
        builder.Append("Diagram: ").Append(result == null ? String.Empty : (result.DiagramName ?? String.Empty)).AppendLine();
        builder.Append("Created: ").Append(result != null && result.Created).AppendLine();
        builder.Append("AlreadyExisted: ").Append(result != null && result.AlreadyExisted).AppendLine();
        builder.Append("Changed: ").Append(result != null && result.Changed).AppendLine();
        builder.Append("MutationStatus: ").Append(result == null ? String.Empty : (result.MutationStatus ?? String.Empty)).AppendLine();
        builder.Append("TargetKey: ").Append(result == null ? String.Empty : (result.TargetKey ?? String.Empty)).AppendLine();
        builder.Append("VerifyReadbackRequested: ").Append(result != null && result.VerifyReadbackRequested).AppendLine();
        builder.Append("RollbackOnFailureRequested: ").Append(result != null && result.RollbackOnFailureRequested).AppendLine();
        builder.Append("ReadbackVerified: ").Append(result != null && result.ReadbackVerified).AppendLine();
        builder.Append("SaveAttempted: ").Append(result != null && result.SaveAttempted).AppendLine();
        builder.Append("SaveSucceeded: ").Append(result != null && result.SaveSucceeded).AppendLine();
        builder.Append("SaveState: ").Append(result == null ? String.Empty : (result.SaveState ?? String.Empty)).AppendLine();
        builder.Append("Verified: ").Append(result != null && result.Verified).AppendLine();
        builder.Append("VerificationStatus: ").Append(result == null ? String.Empty : (result.VerificationStatus ?? String.Empty)).AppendLine();
        builder.Append("VerificationMode: ").Append(result == null ? String.Empty : (result.VerificationMode ?? String.Empty)).AppendLine();
        builder.Append("SessionCount: ").Append(result == null ? 0 : result.SessionCount).AppendLine();
        builder.Append("SaveCount: ").Append(result == null ? 0 : result.SaveCount).AppendLine();
        builder.Append("EditableRetryCount: ").Append(result == null ? 0 : result.EditableRetryCount).AppendLine();
        builder.Append("NativeMutationAttemptCount: ").Append(result == null ? 0 : result.NativeMutationAttemptCount).AppendLine();
        builder.Append("Summary: ").Append(result == null ? String.Empty : (result.Summary ?? String.Empty)).AppendLine();
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetMethodCreateResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = result == null ? String.Empty : (result.ComponentPath ?? String.Empty);
        payload["methodName"] = result == null ? String.Empty : (result.MethodName ?? String.Empty);
        payload["methodKind"] = result == null ? AscetMethodKind.Unknown.ToString() : result.MethodKind.ToString();
        payload["diagram"] = result == null ? String.Empty : (result.DiagramName ?? String.Empty);
        payload["created"] = result != null && result.Created;
        payload["alreadyExisted"] = result != null && result.AlreadyExisted;
        payload["changed"] = result != null && result.Changed;
        payload["mutationStatus"] = result == null ? String.Empty : (result.MutationStatus ?? String.Empty);
        payload["targetKey"] = result == null ? String.Empty : (result.TargetKey ?? String.Empty);
        payload["verifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        payload["rollbackOnFailureRequested"] = result != null && result.RollbackOnFailureRequested;
        payload["readbackVerified"] = result != null && result.ReadbackVerified;
        payload["saveAttempted"] = result != null && result.SaveAttempted;
        payload["saveSucceeded"] = result != null && result.SaveSucceeded;
        payload["saveState"] = result == null ? String.Empty : (result.SaveState ?? String.Empty);
        payload["verified"] = result != null && result.Verified;
        payload["verificationStatus"] = result == null ? String.Empty : (result.VerificationStatus ?? String.Empty);
        payload["verificationMode"] = result == null ? String.Empty : (result.VerificationMode ?? String.Empty);
        payload["sessionCount"] = result == null ? 0 : result.SessionCount;
        payload["saveCount"] = result == null ? 0 : result.SaveCount;
        payload["editableRetryCount"] = result == null ? 0 : result.EditableRetryCount;
        payload["nativeMutationAttemptCount"] = result == null ? 0 : result.NativeMutationAttemptCount;
        payload["summary"] = result == null ? String.Empty : (result.Summary ?? String.Empty);
        return AscetJsonContract.Serialize(payload);
    }

    private static string FormatException(Exception ex)
    {
        AscetReadException ascet = ex as AscetReadException;
        if (ascet != null)
        {
            return ascet.Code + ":" + ascet.Operation + ":" + ascet.Message;
        }

        return ex.GetType().FullName + ":" + ex.Message;
    }
}
