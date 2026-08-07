using System;
using System.Collections.Generic;

internal sealed class AscetWriteHostCapabilityService
{
    internal const string CapabilityCommandId = "AscetGetCapabilities";

    public Dictionary<string, object> BuildPayload()
    {
        string[] writeOperations = GetSupportedOperations();
        string[] serialWriteCommands = GetSupportedCommandIds();
        string[] allHostCommands = BuildAllHostCommands(serialWriteCommands);

        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["protocolVersion"] = 1;
        payload["lane"] = "write";
        payload["capabilityCommandId"] = CapabilityCommandId;
        payload["supportedOperations"] = writeOperations;
        payload["serialWriteCommands"] = serialWriteCommands;
        payload["supportedCommands"] = allHostCommands;
        payload["commandMap"] = BuildCommandMap(writeOperations, serialWriteCommands);
        return payload;
    }

    public bool TryResolveOperationId(string commandId, out string operationId)
    {
        operationId = String.Empty;
        string normalized = String.IsNullOrWhiteSpace(commandId) ? String.Empty : commandId.Trim();
        if (String.IsNullOrWhiteSpace(normalized))
        {
            return false;
        }

        if (String.Equals(normalized, CapabilityCommandId, StringComparison.Ordinal))
        {
            operationId = "capabilities";
            return true;
        }

        IList<OperationDescriptor> descriptors = OperationRegistry.GetAll();
        for (int i = 0; i < descriptors.Count; i++)
        {
            OperationDescriptor descriptor = descriptors[i];
            if (descriptor == null || !descriptor.HostEligible || descriptor.Lane != ExecutionLane.SerialWrite)
            {
                continue;
            }

            if (String.Equals(ToHostCommandId(descriptor.OperationId), normalized, StringComparison.Ordinal))
            {
                operationId = descriptor.OperationId;
                return true;
            }
        }

        return false;
    }

    public string[] GetSupportedOperations()
    {
        List<string> operations = new List<string>();
        IList<OperationDescriptor> descriptors = OperationRegistry.GetAll();
        for (int i = 0; i < descriptors.Count; i++)
        {
            OperationDescriptor descriptor = descriptors[i];
            if (descriptor == null || !descriptor.HostEligible || descriptor.Lane != ExecutionLane.SerialWrite)
            {
                continue;
            }

            operations.Add(descriptor.OperationId);
        }

        return operations.ToArray();
    }

    public string[] GetSupportedCommandIds()
    {
        string[] operations = GetSupportedOperations();
        string[] commands = new string[operations.Length];
        for (int i = 0; i < operations.Length; i++)
        {
            commands[i] = ToHostCommandId(operations[i]);
        }

        return commands;
    }

    public string ToHostCommandId(string operationId)
    {
        string normalized = String.IsNullOrWhiteSpace(operationId) ? String.Empty : operationId.Trim();
        if (String.IsNullOrWhiteSpace(normalized))
        {
            return "Ascet";
        }

        string[] tokens = normalized.Split(new char[] { '_' }, StringSplitOptions.RemoveEmptyEntries);
        System.Text.StringBuilder builder = new System.Text.StringBuilder("Ascet");
        for (int i = 0; i < tokens.Length; i++)
        {
            string token = tokens[i];
            if (String.IsNullOrWhiteSpace(token))
            {
                continue;
            }

            string lower = token.ToLowerInvariant();
            builder.Append(Char.ToUpperInvariant(lower[0]));
            if (lower.Length > 1)
            {
                builder.Append(lower.Substring(1));
            }
        }

        return builder.ToString();
    }

    private static Dictionary<string, object> BuildCommandMap(string[] operations, string[] commands)
    {
        Dictionary<string, object> map = new Dictionary<string, object>(StringComparer.Ordinal);
        int count = Math.Min(operations == null ? 0 : operations.Length, commands == null ? 0 : commands.Length);
        for (int i = 0; i < count; i++)
        {
            map[operations[i]] = commands[i];
        }

        return map;
    }

    private static string[] BuildAllHostCommands(string[] serialWriteCommands)
    {
        List<string> commands = new List<string>();
        commands.Add(CapabilityCommandId);
        if (serialWriteCommands != null)
        {
            for (int i = 0; i < serialWriteCommands.Length; i++)
            {
                if (!String.IsNullOrWhiteSpace(serialWriteCommands[i]))
                {
                    commands.Add(serialWriteCommands[i]);
                }
            }
        }

        return commands.ToArray();
    }
}
