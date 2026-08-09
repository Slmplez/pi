using System;

public static class AscetBridgeExecCommand
{
    private const int ExitCodeStructuredError = 2;

    public static int Run(string[] args)
    {
        string operation = AscetCliEnvelope.GetToken(args, 0);
        if (String.IsNullOrWhiteSpace(operation))
        {
            return AscetCliEnvelope.WriteError(
                ExitCodeStructuredError,
                AscetCliEnvelope.Error(
                    "invalid_arguments",
                    "exec mode requires an operation token.",
                    "exec",
                    String.Empty));
        }

        OperationDescriptor descriptor;
        if (!AscetBridgeOperationRegistry.TryResolve(operation, out descriptor) || descriptor.Handler == null)
        {
            return AscetCliEnvelope.WriteError(
                ExitCodeStructuredError,
                AscetCliEnvelope.Error(
                    "unsupported_operation",
                    "Operation '" + operation + "' is not registered in AscetBridge.",
                    "exec",
                    operation));
        }

        return descriptor.Handler(AscetCliEnvelope.Slice(args, 1));
    }
}