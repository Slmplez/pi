using System.Collections.Generic;

public static class CapabilitiesCommand
{
    private const int ExitCodeStructuredError = 2;
    private static readonly AscetReadHostCapabilityService HostCapabilityService = new AscetReadHostCapabilityService();

    public static int Run(string[] args)
    {
        for (int i = 0; i < (args == null ? 0 : args.Length); i++)
        {
            string argument = args[i] ?? string.Empty;
            if (!string.Equals(argument, "--json", System.StringComparison.OrdinalIgnoreCase))
            {
                return AscetCliEnvelope.WriteError(
                    ExitCodeStructuredError,
                    AscetCliEnvelope.Error(
                        "invalid_arguments",
                        "Unknown argument '" + argument + "' for capabilities mode.",
                        "capabilities",
                        "capabilities"));
            }
        }

        Dictionary<string, object> hostPayload = HostCapabilityService.BuildPayload();
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["protocolVersion"] = 1;
        result["placeholder"] = false;
        result["modes"] = new string[] { "exec", "batch", "capabilities", "selftest", "benchmark" };
        result["operations"] = ExecCommand.GetImplementedOperations();
        result["operationCatalog"] = OperationRegistry.GetOperationCatalog();
        result["hostOperations"] = HostCapabilityService.GetSupportedOperations();
        result["batchLanes"] = new string[] { "read", "write" };
        result["selftestProfiles"] = SelfTestCommand.GetSupportedProfiles();
        result["benchmarkImplemented"] = false;
        result["host"] = hostPayload;

        return AscetCliEnvelope.WriteSuccess(
            AscetCliEnvelope.Success(
                "capabilities",
                "capabilities",
                result));
    }
}
