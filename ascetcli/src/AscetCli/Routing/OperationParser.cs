using System;

public static class OperationParser
{
    public static OperationDescriptor ParseExecOperation(string[] args)
    {
        return ParseOperation(args, 0, "parse_exec_operation");
    }

    public static OperationDescriptor ParseBatchOperation(string[] args)
    {
        return ParseOperation(args, 0, "parse_batch_operation", ValidateBatchOperation);
    }

    public static OperationDescriptor ParseHostOperation(string[] args)
    {
        return ParseOperation(args, 0, "parse_host_operation", ValidateHostOperation);
    }

    public static OperationDescriptor ParseOperation(string[] args, int operationIndex, string parserOperation)
    {
        return ParseOperation(args, operationIndex, parserOperation, null);
    }

    private static OperationDescriptor ParseOperation(string[] args, int operationIndex, string parserOperation, Action<OperationDescriptor, string> validateDescriptor)
    {
        string failureOperation = String.IsNullOrWhiteSpace(parserOperation) ? "parse_operation" : parserOperation;
        string operationId = GetToken(args, operationIndex);
        if (String.IsNullOrWhiteSpace(operationId))
        {
            throw new AscetReadException(
                "invalid_arguments",
                failureOperation,
                "An operation token is required.");
        }

        OperationDescriptor descriptor = OperationRegistry.ResolveOrThrow(operationId, failureOperation);
        if (validateDescriptor != null)
        {
            validateDescriptor(descriptor, failureOperation);
        }

        return descriptor;
    }

    private static string GetToken(string[] args, int index)
    {
        if (args == null || index < 0 || index >= args.Length)
        {
            return String.Empty;
        }

        return args[index] ?? String.Empty;
    }

    private static void ValidateBatchOperation(OperationDescriptor descriptor, string failureOperation)
    {
        if (descriptor != null)
        {
            descriptor.ThrowIfBatchUnsupported(failureOperation);
        }
    }

    private static void ValidateHostOperation(OperationDescriptor descriptor, string failureOperation)
    {
        if (descriptor != null)
        {
            descriptor.ThrowIfNotHostEligible(failureOperation);
        }
    }
}
