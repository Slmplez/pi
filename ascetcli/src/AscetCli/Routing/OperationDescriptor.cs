using System;
using System.Collections.Generic;

public sealed class OperationDescriptor
{
    public OperationDescriptor(string operationId, ExecutionLane lane, bool hostEligible, BatchSupportShape batchSupport)
        : this(operationId, lane, hostEligible, batchSupport, null)
    {
    }

    public OperationDescriptor(
        string operationId,
        ExecutionLane lane,
        bool hostEligible,
        BatchSupportShape batchSupport,
        OperationExecutionProfile executionProfile)
    {
        if (String.IsNullOrWhiteSpace(operationId))
        {
            throw new ArgumentException("operationId is required.", "operationId");
        }

        EnsureDefinedEnum(lane, "lane");
        EnsureDefinedEnum(batchSupport, "batchSupport");
        OperationId = operationId.Trim().ToLowerInvariant();
        Validate(lane, hostEligible, batchSupport);
        Lane = lane;
        HostEligible = hostEligible;
        BatchSupport = batchSupport;
        ExecutionProfile = executionProfile == null
            ? OperationExecutionProfile.FromDescriptorDefaults(Lane, HostEligible)
            : executionProfile;
        ExecutionProfile.ValidateForDescriptor(Lane, HostEligible);
    }

    public string OperationId { get; private set; }
    public ExecutionLane Lane { get; private set; }
    public bool HostEligible { get; private set; }
    public BatchSupportShape BatchSupport { get; private set; }
    public OperationExecutionProfile ExecutionProfile { get; private set; }
    public bool SupportsBatch
    {
        get { return BatchSupport != BatchSupportShape.None; }
    }

    public void ThrowIfNotHostEligible(string failureOperation)
    {
        if (!HostEligible)
        {
            throw new AscetReadException(
                "unsupported_operation",
                String.IsNullOrWhiteSpace(failureOperation) ? "parse_host_operation" : failureOperation,
                "Operation '" + OperationId + "' is not host eligible in the single-exe router.");
        }
    }

    public void ThrowIfBatchUnsupported(string failureOperation)
    {
        if (!SupportsBatch)
        {
            throw new AscetReadException(
                "unsupported_operation",
                String.IsNullOrWhiteSpace(failureOperation) ? "parse_batch_operation" : failureOperation,
                "Operation '" + OperationId + "' does not support batch execution in the single-exe router.");
        }
    }

    public string LaneId
    {
        get
        {
            switch (Lane)
            {
                case ExecutionLane.PooledRead:
                    return "pooled_read";
                case ExecutionLane.SerialWrite:
                    return "serial_write";
                case ExecutionLane.Diagnostic:
                    return "diagnostic";
                default:
                    return "legacy_read";
            }
        }
    }

    public string BatchSupportId
    {
        get
        {
            switch (BatchSupport)
            {
                case BatchSupportShape.Read:
                    return "batch_read";
                case BatchSupportShape.Write:
                    return "batch_write";
                default:
                    return "none";
            }
        }
    }

    private static void Validate(ExecutionLane lane, bool hostEligible, BatchSupportShape batchSupport)
    {
        if (hostEligible && lane != ExecutionLane.PooledRead && lane != ExecutionLane.SerialWrite)
        {
            throw new ArgumentException("hostEligible operations must use the pooled_read or serial_write lane.", "hostEligible");
        }

        switch (lane)
        {
            case ExecutionLane.PooledRead:
                if (batchSupport == BatchSupportShape.Write)
                {
                    throw new ArgumentException("pooled_read operations cannot advertise batch_write support.", "batchSupport");
                }
                break;
            case ExecutionLane.SerialWrite:
                if (batchSupport == BatchSupportShape.Read)
                {
                    throw new ArgumentException("serial_write operations cannot advertise batch_read support.", "batchSupport");
                }
                break;
            case ExecutionLane.Diagnostic:
                if (hostEligible)
                {
                    throw new ArgumentException("diagnostic operations cannot be host eligible.", "hostEligible");
                }

                if (batchSupport != BatchSupportShape.None)
                {
                    throw new ArgumentException("diagnostic operations cannot advertise batch support.", "batchSupport");
                }
                break;
            default:
                if (batchSupport == BatchSupportShape.Write)
                {
                    throw new ArgumentException("legacy_read operations cannot advertise batch_write support.", "batchSupport");
                }
                break;
        }
    }

    private static void EnsureDefinedEnum(object value, string paramName)
    {
        Type enumType = value.GetType();
        if (!Enum.IsDefined(enumType, value))
        {
            throw new ArgumentOutOfRangeException(paramName, value, "Undefined " + enumType.Name + " value.");
        }
    }
}

public sealed class OperationExecutionProfile
{
    public OperationExecutionProfile(string hostSafety, string hostPolicy, string timeoutClass)
        : this(hostSafety, hostPolicy, timeoutClass, null, null)
    {
    }

    public OperationExecutionProfile(
        string hostSafety,
        string hostPolicy,
        string timeoutClass,
        int? pageBudget,
        int? cooldownMs)
    {
        HostSafety = NormalizeRequired(hostSafety, "hostSafety");
        HostPolicy = NormalizeRequired(hostPolicy, "hostPolicy");
        TimeoutClass = NormalizeRequired(timeoutClass, "timeoutClass");
        PageBudget = pageBudget;
        CooldownMs = cooldownMs;
    }

    public string HostSafety { get; private set; }
    public string HostPolicy { get; private set; }
    public string TimeoutClass { get; private set; }
    public int? PageBudget { get; private set; }
    public int? CooldownMs { get; private set; }

    public static OperationExecutionProfile FromDescriptorDefaults(ExecutionLane lane, bool hostEligible)
    {
        switch (lane)
        {
            case ExecutionLane.PooledRead:
                return new OperationExecutionProfile(
                    "stable",
                    hostEligible ? "prefer_host" : "force_one_shot",
                    "read");
            case ExecutionLane.SerialWrite:
                return new OperationExecutionProfile(
                    "write",
                    hostEligible ? "prefer_host" : "force_one_shot",
                    "write");
            case ExecutionLane.Diagnostic:
                return new OperationExecutionProfile("stable", "force_one_shot", "diagnostic");
            default:
                return new OperationExecutionProfile("fragile", "force_one_shot", "expensive_read");
        }
    }

    public static OperationExecutionProfile FragileRead()
    {
        return new OperationExecutionProfile("fragile", "force_one_shot", "expensive_read");
    }

    public static OperationExecutionProfile ExpensiveScan(int pageBudget)
    {
        return new OperationExecutionProfile("expensive_scan", "force_one_shot", "scan", pageBudget, null);
    }

    public static OperationExecutionProfile Diff()
    {
        return new OperationExecutionProfile("fragile", "force_one_shot", "diff");
    }

    public void ValidateForDescriptor(ExecutionLane lane, bool hostEligible)
    {
        if (hostEligible && String.Equals(HostPolicy, "force_one_shot", StringComparison.Ordinal))
        {
            throw new ArgumentException("host eligible operations cannot force one-shot execution.", "executionProfile");
        }

        if (hostEligible &&
            (String.Equals(HostSafety, "fragile", StringComparison.Ordinal) ||
             String.Equals(HostSafety, "expensive_scan", StringComparison.Ordinal)))
        {
            throw new ArgumentException("fragile and expensive scan operations cannot be host eligible.", "executionProfile");
        }

        if ((PageBudget.HasValue && PageBudget.Value <= 0) || (CooldownMs.HasValue && CooldownMs.Value < 0))
        {
            throw new ArgumentOutOfRangeException("executionProfile", "Profile budgets must be positive and cooldowns cannot be negative.");
        }
    }

    public Dictionary<string, object> ToDictionary()
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["hostSafety"] = HostSafety;
        result["hostPolicy"] = HostPolicy;
        result["timeoutClass"] = TimeoutClass;
        if (PageBudget.HasValue)
        {
            result["pageBudget"] = PageBudget.Value;
        }

        if (CooldownMs.HasValue)
        {
            result["cooldownMs"] = CooldownMs.Value;
        }

        return result;
    }

    private static string NormalizeRequired(string value, string paramName)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException(paramName + " is required.", paramName);
        }

        return value.Trim();
    }
}
