using System;
using System.Collections.Generic;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;

public static class CapabilitiesCommand
{
    private const int ExitCodeStructuredError = 2;

    public static int Run(string[] args)
    {
        for (int i = 0; i < (args == null ? 0 : args.Length); i++)
        {
            string argument = args[i] ?? String.Empty;
            if (!String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
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

        IList<Dictionary<string, object>> routes = AscetBridgeOperationRegistry.GetRouteCatalog();
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["protocolVersion"] = 1;
        result["bridgeVersion"] = ResolveBridgeVersion();
        result["modes"] = new string[] { "exec", "batch", "capabilities", "selftest" };
        result["reservedModes"] = new string[] { "benchmark", "serve" };
        result["operations"] = AscetBridgeOperationRegistry.GetOperationIds();
        result["routes"] = routes;
        result["capabilitiesHash"] = ComputeHash(AscetJsonContract.Serialize(routes));
        result["batchLanes"] = new string[] { "read", "write" };
        result["selftestProfiles"] = SelfTestCommand.GetSupportedProfiles();
        result["persistentImplemented"] = false;

        return AscetCliEnvelope.WriteSuccess(
            AscetCliEnvelope.Success(
                "capabilities",
                "capabilities",
                result));
    }

    private static string ResolveBridgeVersion()
    {
        Version version = Assembly.GetExecutingAssembly().GetName().Version;
        return version == null ? "0.0.0.0" : version.ToString();
    }

    private static string ComputeHash(string value)
    {
        using (SHA256 sha = SHA256.Create())
        {
            byte[] hash = sha.ComputeHash(Encoding.UTF8.GetBytes(value ?? String.Empty));
            StringBuilder builder = new StringBuilder("sha256:");
            for (int i = 0; i < hash.Length; i++)
            {
                builder.Append(hash[i].ToString("x2"));
            }
            return builder.ToString();
        }
    }
}