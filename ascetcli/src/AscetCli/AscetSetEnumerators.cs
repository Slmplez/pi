using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public sealed class AscetEnumeratorWriteResult
{
    public AscetEnumeratorWriteResult()
    {
        ComponentPath = String.Empty;
        ComponentKind = AscetComponentKind.Unknown;
        PreviousEnumerators = new List<string>();
        NewEnumerators = new List<string>();
        Summary = String.Empty;
    }

    public string ComponentPath { get; set; }
    public AscetComponentKind ComponentKind { get; set; }
    public IList<string> PreviousEnumerators { get; set; }
    public IList<string> NewEnumerators { get; set; }
    public bool WriteSucceeded { get; set; }
    public bool VerifyReadbackRequested { get; set; }
    public bool ReadbackVerified { get; set; }
    public bool SaveSucceeded { get; set; }
    public string VerificationMode { get; set; }
    public bool Changed { get; set; }
    public string MutationStatus { get; set; }
    public bool SaveAttempted { get; set; }
    public string SaveState { get; set; }
    public bool Verified { get; set; }
    public string VerificationStatus { get; set; }
    public int SessionCount { get; set; }
    public int SaveCount { get; set; }
    public int EditableRetryCount { get; set; }
    public int NativeMutationAttemptCount { get; set; }
    public string Summary { get; set; }
}

public sealed class AscetSetEnumeratorsArguments
{
    public AscetSetEnumeratorsArguments()
    {
        ComponentPath = String.Empty;
        Enumerators = new List<string>();
    }

    public string ComponentPath { get; set; }
    public IList<string> Enumerators { get; set; }
    public bool VerifyReadback { get; set; }
    public bool EmitJson { get; set; }
}

public sealed class EnumerationWriteService : AscetReadDomainServiceBase
{
    public AscetEnumeratorWriteResult SetEnumerators(
        string componentPath,
        IList<string> enumerators,
        bool verifyReadback)
    {
        string normalizedPath = AscetDatabaseExplorerCommon.NormalizePath(componentPath, "component_path");
        string[] normalizedEnumerators = NormalizeEnumerators(enumerators);
        List<string> previousEnumerators = new List<string>();

        SetEnumeratorsSessionResult sessionResult = ExecuteWithSession("set_enumerators", delegate(AscetSession session)
        {
            AscetDataBase database = session.GetCurrentDatabaseHandle();
            AscetEnumeration enumeration = ResolveEnumeration(session, normalizedPath);
            previousEnumerators.AddRange(ReadEnumerators(enumeration));
            bool changed = !EnumeratorsMatch(previousEnumerators, normalizedEnumerators);
            bool saveAttempted = false;
            bool saveSucceeded = false;
            int nativeMutationAttemptCount = 0;

            if (changed)
            {
                RequireComponentEditableInSession(session, normalizedPath, "set_enumerators");
                nativeMutationAttemptCount = 1;
                if (!enumeration.SetEnumerators(normalizedEnumerators))
                {
                    throw new AscetReadException(
                        "set_enumerators_failed",
                        "set_enumerators",
                        "ASCET returned false while writing enumerators for '" + normalizedPath + "'.");
                }

                saveAttempted = true;
                saveSucceeded = database.Save();
                if (!saveSucceeded)
                {
                    throw new AscetReadException(
                        "set_enumerators_failed",
                        "set_enumerators",
                        "Failed to save current database after writing enumerators for '" + normalizedPath + "'.");
                }
            }

            AscetEnumeration resolvedEnumeration = ResolveEnumeration(session, normalizedPath);
            bool targetResolved = resolvedEnumeration != null;
            List<string> actualEnumerators = ReadEnumerators(resolvedEnumeration);
            bool contentMatches = EnumeratorsMatch(actualEnumerators, normalizedEnumerators);
            bool verified = !verifyReadback || (targetResolved && contentMatches);
            return new SetEnumeratorsSessionResult
            {
                Changed = changed,
                MutationStatus = changed ? "applied" : "no_op",
                SaveAttempted = saveAttempted,
                SaveSucceeded = saveSucceeded,
                SaveState = changed ? (saveSucceeded ? "saved" : "failed") : "not_required",
                TargetResolved = targetResolved,
                Verified = verified,
                VerificationStatus = verified ? "passed" : "failed",
                SessionCount = 1,
                SaveCount = saveSucceeded ? 1 : 0,
                EditableRetryCount = 0,
                NativeMutationAttemptCount = nativeMutationAttemptCount
            };
        });

        bool readbackVerified = !verifyReadback || (sessionResult != null && sessionResult.Verified);
        if (verifyReadback && !readbackVerified)
        {
            throw new AscetReadException(
                "readback_mismatch",
                "set_enumerators",
                "Readback verification failed because enumeration '" + normalizedPath + "' could not be resolved or its enumerators did not match after writing.");
        }

        return new AscetEnumeratorWriteResult
        {
            ComponentPath = normalizedPath,
            ComponentKind = AscetComponentKind.Enumeration,
            PreviousEnumerators = previousEnumerators,
            NewEnumerators = new List<string>(normalizedEnumerators),
            WriteSucceeded = true,
            VerifyReadbackRequested = verifyReadback,
            ReadbackVerified = readbackVerified,
            SaveSucceeded = sessionResult != null && sessionResult.SaveSucceeded,
            VerificationMode = "same_session_target_resolve",
            Changed = sessionResult != null && sessionResult.Changed,
            MutationStatus = sessionResult == null ? String.Empty : sessionResult.MutationStatus,
            SaveAttempted = sessionResult != null && sessionResult.SaveAttempted,
            SaveState = sessionResult == null ? String.Empty : sessionResult.SaveState,
            Verified = sessionResult != null && sessionResult.Verified,
            VerificationStatus = sessionResult == null ? String.Empty : sessionResult.VerificationStatus,
            SessionCount = sessionResult == null ? 0 : sessionResult.SessionCount,
            SaveCount = sessionResult == null ? 0 : sessionResult.SaveCount,
            EditableRetryCount = sessionResult == null ? 0 : sessionResult.EditableRetryCount,
            NativeMutationAttemptCount = sessionResult == null ? 0 : sessionResult.NativeMutationAttemptCount,
            Summary = "Set " + normalizedEnumerators.Length + " enumerators for " + normalizedPath + "."
        };
    }

    private sealed class SetEnumeratorsSessionResult
    {
        public bool Changed { get; set; }
        public string MutationStatus { get; set; }
        public bool SaveAttempted { get; set; }
        public bool SaveSucceeded { get; set; }
        public string SaveState { get; set; }
        public bool TargetResolved { get; set; }
        public bool Verified { get; set; }
        public string VerificationStatus { get; set; }
        public int SessionCount { get; set; }
        public int SaveCount { get; set; }
        public int EditableRetryCount { get; set; }
        public int NativeMutationAttemptCount { get; set; }
    }

    internal static string[] NormalizeEnumerators(IList<string> enumerators)
    {
        if (enumerators == null || enumerators.Count == 0)
        {
            throw new AscetReadException(
                "invalid_argument",
                "set_enumerators",
                "At least one enumerator is required.");
        }

        List<string> normalized = new List<string>();
        HashSet<string> unique = new HashSet<string>(StringComparer.Ordinal);
        for (int i = 0; i < enumerators.Count; i++)
        {
            string value = (enumerators[i] ?? String.Empty).Trim();
            if (String.IsNullOrWhiteSpace(value))
            {
                throw new AscetReadException(
                    "invalid_argument",
                    "set_enumerators",
                    "Enumerator names must not be empty.");
            }
            if (!unique.Add(value))
            {
                throw new AscetReadException(
                    "invalid_argument",
                    "set_enumerators",
                    "Duplicate enumerator '" + value + "'.");
            }
            normalized.Add(value);
        }
        return normalized.ToArray();
    }

    private static bool EnumeratorsMatch(IList<string> current, string[] requested)
    {
        if (current == null || requested == null || current.Count != requested.Length)
        {
            return false;
        }

        for (int i = 0; i < requested.Length; i++)
        {
            if (!String.Equals(current[i], requested[i], StringComparison.Ordinal))
            {
                return false;
            }
        }

        return true;
    }

    private AscetEnumeration ResolveEnumeration(AscetSession session, string componentPath)
    {
        DataBaseItem item = ResolveItemByPath(session, componentPath);
        AscetEnumeration enumeration = item as AscetEnumeration;
        if (enumeration != null)
        {
            return enumeration;
        }

        AscetItemRef itemRef = Classifier.ToItemRef(item);
        string resolvedKind = itemRef == null
            ? AscetComponentKind.Unknown.ToString()
            : itemRef.Kind.ToString();
        throw new AscetReadException(
            "unsupported_component_kind",
            "set_enumerators",
            "Component '" + componentPath + "' must be an enumeration, but resolved kind '" + resolvedKind + "'.");
    }

    private static List<string> ReadEnumerators(AscetEnumeration enumeration)
    {
        string[] values = enumeration == null ? null : enumeration.GetEnumerators();
        List<string> result = new List<string>();
        if (values == null)
        {
            return result;
        }
        for (int i = 0; i < values.Length; i++)
        {
            result.Add(values[i] ?? String.Empty);
        }
        return result;
    }
}

public static class AscetSetEnumerators
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;
        try
        {
            AscetSetEnumeratorsArguments parsed = ParseArguments(args);
            if (parsed.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            EnumerationWriteService service = new EnumerationWriteService();
            AscetEnumeratorWriteResult result = service.SetEnumerators(
                parsed.ComponentPath,
                parsed.Enumerators,
                parsed.VerifyReadback);
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

    public static AscetSetEnumeratorsArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException(
                "invalid_argument",
                "parse_arguments",
                "usage: AscetBridge.exe exec set_enumerators <enumeration-path> (--item <name> | --items <name1,name2,...>) [--verify-readback] [--json]");
        }

        AscetSetEnumeratorsArguments result = new AscetSetEnumeratorsArguments
        {
            ComponentPath = AscetDatabaseExplorerCommon.NormalizePath(args[0], "component_path")
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
            if (String.Equals(argument, "--item", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --item.");
                }
                result.Enumerators.Add(NormalizeEnumerator(args[++i]));
                continue;
            }
            if (String.Equals(argument, "--items", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --items.");
                }
                AddItems(result.Enumerators, args[++i]);
                continue;
            }
            throw new AscetReadException(
                "invalid_argument",
                "parse_arguments",
                "Unknown argument '" + argument + "'.");
        }

        if (result.Enumerators.Count == 0)
        {
            throw new AscetReadException(
                "invalid_argument",
                "parse_arguments",
                "At least one --item or --items value is required.");
        }
        return result;
    }

    public static Dictionary<string, object> BuildPayload(AscetEnumeratorWriteResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = result == null ? String.Empty : (result.ComponentPath ?? String.Empty);
        payload["kind"] = "enumeration";
        payload["previousEnumerators"] = result == null ? new List<string>() : result.PreviousEnumerators;
        payload["enumerators"] = result == null ? new List<string>() : result.NewEnumerators;
        payload["writeSucceeded"] = result != null && result.WriteSucceeded;
        payload["verifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        payload["readbackVerified"] = result != null && result.ReadbackVerified;
        payload["saveSucceeded"] = result != null && result.SaveSucceeded;
        payload["verificationMode"] = result == null ? String.Empty : (result.VerificationMode ?? String.Empty);
        payload["changed"] = result != null && result.Changed;
        payload["mutationStatus"] = result == null ? String.Empty : result.MutationStatus;
        payload["saveAttempted"] = result != null && result.SaveAttempted;
        payload["saveState"] = result == null ? String.Empty : result.SaveState;
        payload["verified"] = result != null && result.Verified;
        payload["verificationStatus"] = result == null ? String.Empty : result.VerificationStatus;
        payload["sessionCount"] = result == null ? 0 : result.SessionCount;
        payload["saveCount"] = result == null ? 0 : result.SaveCount;
        payload["editableRetryCount"] = result == null ? 0 : result.EditableRetryCount;
        payload["nativeMutationAttemptCount"] = result == null ? 0 : result.NativeMutationAttemptCount;
        payload["summary"] = result == null ? String.Empty : (result.Summary ?? String.Empty);
        return payload;
    }

    public static string FormatJsonOutput(AscetEnumeratorWriteResult result)
    {
        return AscetJsonContract.Serialize(BuildPayload(result));
    }

    public static string FormatTextOutput(AscetEnumeratorWriteResult result)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(result == null ? String.Empty : (result.ComponentPath ?? String.Empty)).AppendLine();
        builder.Append("Kind: enumeration").AppendLine();
        builder.Append("WriteSucceeded: ").Append(result != null && result.WriteSucceeded).AppendLine();
        builder.Append("VerifyReadbackRequested: ").Append(result != null && result.VerifyReadbackRequested).AppendLine();
        builder.Append("ReadbackVerified: ").Append(result != null && result.ReadbackVerified).AppendLine();
        builder.Append("SaveSucceeded: ").Append(result != null && result.SaveSucceeded).AppendLine();
        builder.Append("VerificationMode: ").Append(result == null ? String.Empty : (result.VerificationMode ?? String.Empty)).AppendLine();
        builder.Append("changed: ").Append(result != null && result.Changed).AppendLine();
        builder.Append("mutationStatus: ").Append(result == null ? String.Empty : result.MutationStatus).AppendLine();
        builder.Append("saveAttempted: ").Append(result != null && result.SaveAttempted).AppendLine();
        builder.Append("saveState: ").Append(result == null ? String.Empty : result.SaveState).AppendLine();
        builder.Append("verified: ").Append(result != null && result.Verified).AppendLine();
        builder.Append("verificationStatus: ").Append(result == null ? String.Empty : result.VerificationStatus).AppendLine();
        builder.Append("sessionCount: ").Append(result == null ? 0 : result.SessionCount).AppendLine();
        builder.Append("saveCount: ").Append(result == null ? 0 : result.SaveCount).AppendLine();
        builder.Append("editableRetryCount: ").Append(result == null ? 0 : result.EditableRetryCount).AppendLine();
        builder.Append("nativeMutationAttemptCount: ").Append(result == null ? 0 : result.NativeMutationAttemptCount).AppendLine();
        builder.Append("Enumerators:").AppendLine();
        IList<string> enumerators = result == null ? null : result.NewEnumerators;
        if (enumerators != null)
        {
            for (int i = 0; i < enumerators.Count; i++)
            {
                builder.Append("  ").Append(i.ToString()).Append(": ")
                    .Append(enumerators[i] ?? String.Empty)
                    .AppendLine();
            }
        }
        builder.Append("Summary: ").Append(result == null ? String.Empty : (result.Summary ?? String.Empty)).AppendLine();
        return builder.ToString();
    }

    private static void AddItems(IList<string> target, string raw)
    {
        string[] values = (raw ?? String.Empty).Split(
            new char[] { ',', ';' },
            StringSplitOptions.RemoveEmptyEntries);
        for (int i = 0; i < values.Length; i++)
        {
            target.Add(NormalizeEnumerator(values[i]));
        }
    }

    private static string NormalizeEnumerator(string value)
    {
        string normalized = (value ?? String.Empty).Trim();
        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException(
                "invalid_argument",
                "parse_arguments",
                "Enumerator names must not be empty.");
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
