using System;
using System.Collections.Generic;
using System.Web.Script.Serialization;

public sealed class AscetJsonProtocol
{
    public const int DefaultMaxJsonLength = 16 * 1024 * 1024;
    public const int DefaultRecursionLimit = 256;

    private readonly JavaScriptSerializer _serializer;

    public AscetJsonProtocol()
        : this(DefaultMaxJsonLength, DefaultRecursionLimit)
    {
    }

    public AscetJsonProtocol(int maxJsonLength, int recursionLimit)
    {
        _serializer = new JavaScriptSerializer();
        _serializer.MaxJsonLength = maxJsonLength <= 0 ? DefaultMaxJsonLength : maxJsonLength;
        _serializer.RecursionLimit = recursionLimit <= 0 ? DefaultRecursionLimit : recursionLimit;
    }

    public int MaxJsonLength
    {
        get { return _serializer.MaxJsonLength; }
    }

    public int RecursionLimit
    {
        get { return _serializer.RecursionLimit; }
    }

    public AscetExecEnvelopeDto ExecSuccess(string operation, object result)
    {
        AscetExecEnvelopeDto envelope = new AscetExecEnvelopeDto();
        envelope.ok = true;
        envelope.result = result;
        envelope.error = null;
        envelope.meta = CreateMeta("exec", operation, String.Empty);
        return envelope;
    }

    public AscetExecEnvelopeDto ExecError(string operation, Exception ex)
    {
        AscetExecEnvelopeDto envelope = new AscetExecEnvelopeDto();
        envelope.ok = false;
        envelope.result = null;
        envelope.error = AscetErrorMapper.FromException(ex, operation);
        envelope.meta = CreateMeta("exec", operation, String.Empty);
        return envelope;
    }

    public AscetHostResponseEnvelopeDto HostSuccess(string id, string operation, object result)
    {
        AscetHostResponseEnvelopeDto envelope = new AscetHostResponseEnvelopeDto();
        envelope.type = "response";
        envelope.id = id ?? String.Empty;
        envelope.ok = true;
        envelope.result = result;
        envelope.error = null;
        envelope.meta = CreateMeta("host", operation, "pooled_read");
        return envelope;
    }

    public AscetHostResponseEnvelopeDto HostError(string id, string operation, Exception ex)
    {
        AscetHostResponseEnvelopeDto envelope = new AscetHostResponseEnvelopeDto();
        envelope.type = "response";
        envelope.id = id ?? String.Empty;
        envelope.ok = false;
        envelope.result = null;
        envelope.error = AscetErrorMapper.FromException(ex, operation);
        envelope.meta = CreateMeta("host", operation, "pooled_read");
        return envelope;
    }

    public AscetBatchEnvelopeDto BatchSuccess(string lane, IList<AscetBatchResultItemDto> results)
    {
        AscetBatchEnvelopeDto envelope = new AscetBatchEnvelopeDto();
        envelope.ok = true;
        envelope.result = new AscetBatchResultPayloadDto();
        envelope.result.lane = lane ?? String.Empty;
        envelope.result.results = CopyResults(results);
        envelope.error = null;
        envelope.meta = CreateMeta("batch", String.Empty, lane);
        return envelope;
    }

    public AscetBatchEnvelopeDto BatchError(string lane, Exception ex)
    {
        AscetBatchEnvelopeDto envelope = new AscetBatchEnvelopeDto();
        envelope.ok = false;
        envelope.result = null;
        envelope.error = AscetErrorMapper.FromException(ex, "batch");
        envelope.meta = CreateMeta("batch", String.Empty, lane);
        return envelope;
    }

    public AscetCapabilityEnvelopeDto CapabilitiesSuccess(IList<string> modes, IList<string> operations, IList<string> hostOperations)
    {
        AscetCapabilityEnvelopeDto envelope = new AscetCapabilityEnvelopeDto();
        envelope.ok = true;
        envelope.result = new AscetCapabilitiesPayloadDto();
        envelope.result.modes = CopyStrings(modes);
        envelope.result.operations = CopyStrings(operations);
        envelope.result.hostOperations = CopyStrings(hostOperations);
        envelope.error = null;
        envelope.meta = CreateMeta("capabilities", "capabilities", String.Empty);
        return envelope;
    }

    public AscetCapabilityEnvelopeDto CapabilitiesError(Exception ex)
    {
        AscetCapabilityEnvelopeDto envelope = new AscetCapabilityEnvelopeDto();
        envelope.ok = false;
        envelope.result = null;
        envelope.error = AscetErrorMapper.FromException(ex, "capabilities");
        envelope.meta = CreateMeta("capabilities", "capabilities", String.Empty);
        return envelope;
    }

    public string Serialize(object payload)
    {
        return _serializer.Serialize(payload);
    }

    public T Deserialize<T>(string json)
    {
        return Deserialize<T>(json, "deserialize_json");
    }

    public T Deserialize<T>(string json, string operation)
    {
        try
        {
            return _serializer.Deserialize<T>(json);
        }
        catch (ArgumentException ex)
        {
            throw CreateInvalidJsonException(operation, ex);
        }
        catch (InvalidOperationException ex)
        {
            throw CreateInvalidJsonException(operation, ex);
        }
    }

    public AscetHostRequestEnvelopeDto ParseHostRequest(string json)
    {
        return Deserialize<AscetHostRequestEnvelopeDto>(json, "parse_host_request");
    }

    private static AscetEnvelopeMetaDto CreateMeta(string mode, string operation, string lane)
    {
        AscetEnvelopeMetaDto meta = new AscetEnvelopeMetaDto();
        meta.mode = mode ?? String.Empty;
        meta.operation = operation ?? String.Empty;
        meta.lane = lane ?? String.Empty;
        return meta;
    }

    private static List<string> CopyStrings(IList<string> values)
    {
        List<string> copy = new List<string>();
        if (values == null)
        {
            return copy;
        }

        for (int i = 0; i < values.Count; i++)
        {
            copy.Add(values[i] ?? String.Empty);
        }

        return copy;
    }

    private static List<AscetBatchResultItemDto> CopyResults(IList<AscetBatchResultItemDto> results)
    {
        List<AscetBatchResultItemDto> copy = new List<AscetBatchResultItemDto>();
        if (results == null)
        {
            return copy;
        }

        for (int i = 0; i < results.Count; i++)
        {
            AscetBatchResultItemDto item = results[i] ?? new AscetBatchResultItemDto();
            AscetBatchResultItemDto cloned = new AscetBatchResultItemDto();
            cloned.id = item.id ?? String.Empty;
            cloned.ok = item.ok;
            cloned.result = item.result;
            cloned.error = item.error;
            copy.Add(cloned);
        }

        return copy;
    }

    private static AscetReadException CreateInvalidJsonException(string operation, Exception ex)
    {
        return new AscetReadException(
            "invalid_json",
            String.IsNullOrWhiteSpace(operation) ? "deserialize_json" : operation,
            "Malformed protocol JSON.",
            ex);
    }
}
