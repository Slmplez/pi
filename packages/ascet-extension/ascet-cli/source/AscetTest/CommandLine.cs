using System;
using System.Collections.Generic;

public sealed class AscetTestCommandLine
{
    private static readonly HashSet<string> AllowedActions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "inspect",
        "generate-esdl",
        "generate-cases",
        "prepare",
        "apply",
        "export",
        "plan",
        "build",
        "run",
        "verify",
        "pipeline",
        "batch",
        "evidence"
    };

    public string Action { get; private set; }
    public string RequestPath { get; private set; }
    public string OutputPath { get; private set; }
    public bool EmitJson { get; private set; }
    public bool ExecuteLive { get; private set; }

    public static AscetTestCommandLine Parse(string[] args)
    {
        if (args == null || args.Length == 0)
        {
            throw new AscetTestCliException(
                "invalid_arguments",
                "--action, --request and --out are required.");
        }

        AscetTestCommandLine result = new AscetTestCommandLine();
        HashSet<string> seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        for (int index = 0; index < args.Length; index++)
        {
            string argument = args[index] ?? String.Empty;
            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                result.EmitJson = true;
                continue;
            }

            if (String.Equals(argument, "--execute-live", StringComparison.OrdinalIgnoreCase))
            {
                result.ExecuteLive = true;
                continue;
            }

            if (!String.Equals(argument, "--action", StringComparison.OrdinalIgnoreCase) &&
                !String.Equals(argument, "--request", StringComparison.OrdinalIgnoreCase) &&
                !String.Equals(argument, "--out", StringComparison.OrdinalIgnoreCase))
            {
                throw new AscetTestCliException("invalid_arguments", "Unknown argument '" + argument + "'.");
            }

            if (!seen.Add(argument))
            {
                throw new AscetTestCliException("invalid_arguments", "Argument '" + argument + "' may only be provided once.");
            }

            if (index + 1 >= args.Length || String.IsNullOrWhiteSpace(args[index + 1]))
            {
                throw new AscetTestCliException("invalid_arguments", "Argument '" + argument + "' requires a value.");
            }

            string value = args[++index].Trim();
            if (String.Equals(argument, "--action", StringComparison.OrdinalIgnoreCase))
            {
                string normalizedAction = value.ToLowerInvariant();
                if (!AllowedActions.Contains(normalizedAction))
                {
                    throw new AscetTestCliException(
                        "invalid_action",
                        "Unsupported action '" + value + "'. Expected one of: " + String.Join(", ", SortedActions()) + ".");
                }

                result.Action = normalizedAction;
            }
            else if (String.Equals(argument, "--request", StringComparison.OrdinalIgnoreCase))
            {
                result.RequestPath = value;
            }
            else
            {
                result.OutputPath = value;
            }
        }

        if (String.IsNullOrWhiteSpace(result.Action))
        {
            throw new AscetTestCliException("invalid_arguments", "--action is required.");
        }

        if (String.IsNullOrWhiteSpace(result.RequestPath))
        {
            throw new AscetTestCliException("invalid_arguments", "--request is required.");
        }

        if (String.IsNullOrWhiteSpace(result.OutputPath))
        {
            throw new AscetTestCliException("invalid_arguments", "--out is required.");
        }

        return result;
    }

    private static IList<string> SortedActions()
    {
        List<string> actions = new List<string>(AllowedActions);
        actions.Sort(StringComparer.Ordinal);
        return actions;
    }
}

public sealed class AscetTestCliException : Exception
{
    public AscetTestCliException(string code, string message)
        : base(message)
    {
        Code = code;
    }

    public string Code { get; private set; }
}
