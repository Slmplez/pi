using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

internal sealed class AscetWriteHostServer : IDisposable
{
    private static readonly object ConsoleSuppressionGate = new object();
    private static readonly TextWriter SuppressedConsoleOut = TextWriter.Synchronized(TextWriter.Null);

    private readonly object _executionGate;
    private readonly TextWriter _protocolOut;
    private readonly DateTime _startedUtc;
    private AscetLiveContext _liveContext;
    private AscetWriteHostContext _writeContext;
    private readonly AscetWriteHostDispatcher _dispatcher;
    private bool _disposed;
    private int _requestCount;

    public AscetWriteHostServer()
    {
        _executionGate = new object();
        _protocolOut = CreateProtocolWriter();
        _startedUtc = DateTime.UtcNow;
        _dispatcher = new AscetWriteHostDispatcher();
    }

    internal AscetWriteHostServer(AscetLiveContext liveContext)
    {
        if (liveContext == null)
        {
            throw new ArgumentNullException("liveContext");
        }

        _executionGate = new object();
        _protocolOut = CreateProtocolWriter();
        _startedUtc = DateTime.UtcNow;
        _liveContext = liveContext;
        _writeContext = new AscetWriteHostContext(_liveContext);
        _dispatcher = new AscetWriteHostDispatcher();
    }

    public int Run()
    {
        string line;
        while ((line = Console.In.ReadLine()) != null)
        {
            line = SanitizeInputLine(line);
            if (String.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            Dictionary<string, object> envelope = null;
            try
            {
                envelope = AscetJsonContract.DeserializeObject(line);
            }
            catch (Exception ex)
            {
                AscetReadException parseFailure = new AscetReadException("invalid_json", "parse_request", "Failed to parse JSON request line. " + ex.Message, ex);
                WriteResponse(String.Empty, false, null, CreateError(parseFailure.Code, parseFailure.Message, parseFailure));
                continue;
            }

            string envelopeType = GetString(envelope, "type");
            if (String.Equals(envelopeType, "shutdown", StringComparison.OrdinalIgnoreCase))
            {
                return 0;
            }

            string requestId = GetString(envelope, "id");
            if (!String.Equals(envelopeType, "request", StringComparison.OrdinalIgnoreCase))
            {
                AscetReadException envelopeFailure = new AscetReadException("invalid_envelope", "validate_envelope", "Expected a request envelope or shutdown envelope.");
                WriteResponse(requestId, false, null, CreateError(envelopeFailure.Code, envelopeFailure.Message, envelopeFailure));
                continue;
            }

            try
            {
                Dictionary<string, object> result = ExecuteRequest(envelope);
                WriteResponse(requestId, true, result, null);
            }
            catch (Exception ex)
            {
                WriteResponse(requestId, false, null, CreateError(GetErrorCode(ex), ex.Message, ex));
            }
        }

        return 0;
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        if (_liveContext != null)
        {
            ExecuteSuppressingConsoleOut(delegate()
            {
                _liveContext.Dispose();
                return 0;
            });
        }
    }

    private Dictionary<string, object> ExecuteRequest(Dictionary<string, object> envelope)
    {
        lock (_executionGate)
        {
            string commandId = GetRequiredCommandId(envelope);
            Dictionary<string, object> payload = GetDictionary(envelope, "payload");
            AscetWriteHostContext writeContext = _writeContext;
            AscetLiveContextSnapshot snapshot = writeContext == null ? null : writeContext.GetSnapshot();

            AscetWriteHostDispatchContext context = new AscetWriteHostDispatchContext();
            context.StartedUtc = _startedUtc;
            context.RequestCount = _requestCount + 1;
            context.SessionGeneration = snapshot == null ? 0 : snapshot.SessionGeneration;
            context.DatabaseBindingGeneration = snapshot == null ? 0 : snapshot.DatabaseBindingGeneration;
            context.DatabaseRef = snapshot == null ? null : snapshot.DatabaseRef;
            context.WriteContext = writeContext;

            Dictionary<string, object> result = ExecuteSuppressingConsoleOut(delegate()
            {
                return _dispatcher.Dispatch(commandId, payload, context);
            });
            _requestCount++;
            return result;
        }
    }

    private static Dictionary<string, object> CreateError(string code, string message, Exception ex)
    {
        Dictionary<string, object> error = new Dictionary<string, object>();
        error["message"] = message ?? String.Empty;
        if (!String.IsNullOrWhiteSpace(code))
        {
            error["code"] = code;
        }

        AscetReadException ascet = ex as AscetReadException;
        if (ascet != null && !String.IsNullOrWhiteSpace(ascet.Operation))
        {
            error["operation"] = ascet.Operation;
        }

        return error;
    }

    private void WriteResponse(string requestId, bool ok, Dictionary<string, object> result, Dictionary<string, object> error)
    {
        Dictionary<string, object> response = new Dictionary<string, object>();
        response["type"] = "response";
        response["id"] = requestId ?? String.Empty;
        response["ok"] = ok;
        if (result != null)
        {
            response["result"] = result;
        }

        if (error != null)
        {
            response["error"] = error;
        }

        _protocolOut.WriteLine(AscetJsonContract.Serialize(response));
        _protocolOut.Flush();
    }

    private static string GetRequiredCommandId(IDictionary<string, object> envelope)
    {
        string commandId = GetString(envelope, "commandId");
        if (String.IsNullOrWhiteSpace(commandId))
        {
            throw new AscetReadException("invalid_envelope", "validate_envelope", "Request envelope must include a non-empty commandId.");
        }

        return commandId;
    }

    private static string GetString(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return Convert.ToString(payload[key]) ?? String.Empty;
    }

    private static Dictionary<string, object> GetDictionary(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return new Dictionary<string, object>(StringComparer.Ordinal);
        }

        Dictionary<string, object> dictionary = payload[key] as Dictionary<string, object>;
        if (dictionary != null)
        {
            return dictionary;
        }

        throw new AscetReadException("invalid_argument", "parse_payload", "Field '" + key + "' must be an object.");
    }

    private static string GetErrorCode(Exception ex)
    {
        AscetReadException ascet = ex as AscetReadException;
        if (ascet != null && !String.IsNullOrWhiteSpace(ascet.Code))
        {
            return ascet.Code;
        }

        return "request_failed";
    }

    private static string SanitizeInputLine(string line)
    {
        string sanitized = line ?? String.Empty;
        if (sanitized.Length > 0 && sanitized[0] == '\uFEFF')
        {
            sanitized = sanitized.Substring(1);
        }

        int objectIndex = sanitized.IndexOf('{');
        int arrayIndex = sanitized.IndexOf('[');
        int startIndex;
        if (objectIndex < 0)
        {
            startIndex = arrayIndex;
        }
        else if (arrayIndex < 0)
        {
            startIndex = objectIndex;
        }
        else
        {
            startIndex = Math.Min(objectIndex, arrayIndex);
        }

        if (startIndex > 0)
        {
            sanitized = sanitized.Substring(startIndex);
        }

        return sanitized;
    }

    private static TextWriter CreateProtocolWriter()
    {
        StreamWriter writer = new StreamWriter(Console.OpenStandardOutput(), new UTF8Encoding(false));
        writer.AutoFlush = true;
        return TextWriter.Synchronized(writer);
    }

    private T ExecuteSuppressingConsoleOut<T>(Func<T> action)
    {
        if (action == null)
        {
            throw new ArgumentNullException("action");
        }

        lock (ConsoleSuppressionGate)
        {
            TextWriter originalOut = Console.Out;

            try
            {
                Console.SetOut(SuppressedConsoleOut);
                return action();
            }
            finally
            {
                Console.SetOut(originalOut);
            }
        }
    }
}
