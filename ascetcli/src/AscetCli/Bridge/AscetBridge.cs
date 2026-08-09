using System;
using System.Text;

public sealed class AscetBridge
{
    private const int ExitCodeUnhandled = 1;
    private const int ExitCodeStructuredError = 2;

    [STAThread]
    public static int Main(string[] args)
    {
        AscetCliEnvelope.Initialize();
        Console.InputEncoding = Encoding.UTF8;
        Console.OutputEncoding = new UTF8Encoding(false);

        try
        {
            string subcommand = AscetCliEnvelope.GetToken(args, 0);
            switch ((subcommand ?? String.Empty).ToLowerInvariant())
            {
                case "exec":
                    return AscetBridgeExecCommand.Run(AscetCliEnvelope.Slice(args, 1));
                case "batch":
                    return BatchCommand.Run(AscetCliEnvelope.Slice(args, 1));
                case "capabilities":
                    return CapabilitiesCommand.Run(AscetCliEnvelope.Slice(args, 1));
                case "selftest":
                    return SelfTestCommand.Run(AscetCliEnvelope.Slice(args, 1));
                case "benchmark":
                    return BenchmarkCommand.Run(AscetCliEnvelope.Slice(args, 1));
                case "serve":
                    return AscetCliEnvelope.WriteError(
                        ExitCodeStructuredError,
                        AscetCliEnvelope.Error(
                            "not_implemented",
                            "Persistent stdio is not part of Milestone A.",
                            "serve",
                            "stdio"));
                default:
                    return AscetCliEnvelope.WriteError(
                        ExitCodeStructuredError,
                        AscetCliEnvelope.Error(
                            "invalid_arguments",
                            "A subcommand is required. Expected one of: exec, batch, capabilities, selftest, benchmark.",
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
