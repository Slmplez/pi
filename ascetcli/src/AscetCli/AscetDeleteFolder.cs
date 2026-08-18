using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetDeleteFolderArguments
{
    public string FolderPath { get; set; }
    public bool IgnoreMissing { get; set; }
    public bool VerifyReadback { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetDeleteFolder
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetDeleteFolderArguments parsed = ParseArguments(args);
            if (parsed.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            FolderDeleteService service = new FolderDeleteService();
            AscetFolderDeleteResult result = service.DeleteFolder(parsed.FolderPath, parsed.VerifyReadback, parsed.IgnoreMissing);

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

    public static AscetDeleteFolderArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec delete_folder <folder-path> [--if-missing <fail|ignore>] [--verify-readback] [--json]");
        }

        AscetDeleteFolderArguments result = new AscetDeleteFolderArguments
        {
            FolderPath = NormalizeFolderPath(args[0]),
            IgnoreMissing = false,
            VerifyReadback = false,
            EmitJson = false
        };

        for (int i = 1; i < args.Length; i++)
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

            if (String.Equals(argument, "--if-missing", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --if-missing.");
                }

                result.IgnoreMissing = ParseIfMissing(args[++i]);
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        return result;
    }

    private static bool ParseIfMissing(string value)
    {
        string normalized = (value ?? String.Empty).Trim().ToLowerInvariant();
        switch (normalized)
        {
            case "fail":
                return false;
            case "ignore":
                return true;
            default:
                throw new AscetReadException("invalid_argument", "if_missing", "Unsupported --if-missing value '" + value + "'. Expected fail or ignore.");
        }
    }

    public static string FormatTextOutput(AscetFolderDeleteResult result)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Folder: ").Append(result == null ? String.Empty : (result.FolderPath ?? String.Empty)).AppendLine();
        builder.Append("Deleted: ").Append(result != null && result.Deleted).AppendLine();
        builder.Append("AlreadyMissing: ").Append(result != null && result.AlreadyMissing).AppendLine();
        builder.Append("VerifyReadbackRequested: ").Append(result != null && result.VerifyReadbackRequested).AppendLine();
        builder.Append("ReadbackVerified: ").Append(result != null && result.ReadbackVerified).AppendLine();
        builder.Append("SaveSucceeded: ").Append(result != null && result.SaveSucceeded).AppendLine();
        builder.Append("VerificationMode: ").Append(result == null ? String.Empty : (result.VerificationMode ?? String.Empty)).AppendLine();
        builder.Append("Summary: ").Append(result == null ? String.Empty : (result.Summary ?? String.Empty)).AppendLine();
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetFolderDeleteResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["folderPath"] = result == null ? String.Empty : (result.FolderPath ?? String.Empty);
        payload["deleted"] = result != null && result.Deleted;
        payload["alreadyMissing"] = result != null && result.AlreadyMissing;
        payload["verifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        payload["readbackVerified"] = result != null && result.ReadbackVerified;
        bool changed = result != null && result.Deleted;
        bool missingNoOp = result != null && result.AlreadyMissing && !changed;
        bool verified = result != null && result.ReadbackVerified;
        payload["saveSucceeded"] = changed && result.SaveSucceeded;
        payload["verificationMode"] = result == null ? String.Empty : (result.VerificationMode ?? String.Empty);
        payload["changed"] = changed;
        payload["mutationStatus"] = changed ? "applied" : (missingNoOp ? "no_op" : "unknown");
        payload["saveAttempted"] = changed;
        payload["saveState"] = changed ? (result.SaveSucceeded ? "saved" : "failed") : "not_required";
        payload["verified"] = verified;
        payload["verificationStatus"] = verified ? "passed" : "failed";
        payload["sessionCount"] = result == null ? 0 : 1;
        payload["saveCount"] = changed ? 1 : 0;
        payload["editableRetryCount"] = 0;
        payload["nativeMutationAttemptCount"] = changed ? 1 : 0;
        payload["summary"] = result == null ? String.Empty : (result.Summary ?? String.Empty);
        return AscetJsonContract.Serialize(payload);
    }

    private static string NormalizeFolderPath(string folderPath)
    {
        string normalized = (folderPath ?? String.Empty).Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }

        while (normalized.EndsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(0, normalized.Length - 1);
        }

        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException("invalid_argument", "normalize_folder_path", "Folder path must not be empty.");
        }

        return normalized;
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
