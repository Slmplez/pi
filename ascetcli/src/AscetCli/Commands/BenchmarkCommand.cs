using System;

public static class BenchmarkCommand
{
    private const int ExitCodeStructuredError = 2;

    public static int Run(string[] args)
    {
        string requestedProfile = String.Empty;
        for (int i = 0; i < (args == null ? 0 : args.Length); i++)
        {
            string argument = args[i] ?? String.Empty;
            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            return AscetCliEnvelope.WriteError(
                ExitCodeStructuredError,
                AscetCliEnvelope.Error(
                    "invalid_arguments",
                    "benchmark mode does not currently support profile '" + argument + "'.",
                    "benchmark",
                    argument));
        }

        return AscetCliEnvelope.WriteError(
            ExitCodeStructuredError,
            AscetCliEnvelope.Error(
                "not_implemented",
                "benchmark mode is reserved for future live diagnostics benchmarking; no benchmark profile is implemented yet.",
                "benchmark",
                requestedProfile));
    }
}
