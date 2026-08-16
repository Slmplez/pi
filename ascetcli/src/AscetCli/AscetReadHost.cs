using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Text;
using System.Threading;
using de.etas.cebra.toolAPI.Ascet;

public sealed class AscetReadHost
{
    [STAThread]
    public static int Main(string[] args)
    {
        try
        {
            Console.InputEncoding = Encoding.UTF8;
            Console.OutputEncoding = Encoding.UTF8;
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            using (AscetReadHostServer server = new AscetReadHostServer())
            {
                return server.Run();
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(FormatException(ex));
            return 1;
        }
    }

    private static string FormatException(Exception ex)
    {
        AscetReadException ascet = ex as AscetReadException;
        if (ascet != null)
        {
            return ascet.Code + ":" + ascet.Operation + ":" + ascet.Message;
        }

        return ex.GetType().FullName + ":" + ex.Message;
    }
}

internal sealed class AscetReadHostServer : IDisposable
{
    private static readonly object ConsoleSuppressionGate = new object();
    private static readonly TextWriter SuppressedConsoleOut = TextWriter.Synchronized(TextWriter.Null);
    private const int LiveSessionConnectTimeoutMs = 8000;

    private readonly object _executionGate;
    private readonly TextWriter _protocolOut;
    private readonly DateTime _startedUtc;
    private readonly AscetReadHostDispatcher _dispatcher;
    private AscetSession _session;
    private AscetDataBase _database;
    private AscetDatabaseRef _databaseRef;
    private bool _disposed;
    private int _requestCount;
    private int _sessionGeneration;
    private int _databaseBindingGeneration;

    public AscetReadHostServer()
    {
        _executionGate = new object();
        _protocolOut = CreateProtocolWriter();
        _startedUtc = DateTime.UtcNow;
        _dispatcher = new AscetReadHostDispatcher();
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
                WriteResponse(
                    String.Empty,
                    false,
                    null,
                    CreateError(parseFailure.Code, parseFailure.Message, parseFailure));
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
                WriteResponse(
                    requestId,
                    false,
                    null,
                    CreateError(envelopeFailure.Code, envelopeFailure.Message, envelopeFailure));
                continue;
            }

            try
            {
                Dictionary<string, object> result = ExecuteSerializedRequest(envelope);
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
        if (_session != null)
        {
            DisposeSessionQuietly(_session);
            _session = null;
        }
    }

    private Dictionary<string, object> ExecuteSerializedRequest(Dictionary<string, object> envelope)
    {
        lock (_executionGate)
        {
            string requestId = GetRequiredRequestId(envelope);
            string commandId = GetRequiredCommandId(envelope);
            Dictionary<string, object> payload = GetDictionary(envelope, "payload");
            bool requiresLiveSession = RequiresLiveSession(commandId);
            AscetReadHostSessionSnapshot snapshot = requiresLiveSession
                ? EnsureLiveSessionSnapshotLocked()
                : BuildCurrentSessionSnapshot();

            try
            {
                Dictionary<string, object> result = ExecuteSuppressingConsoleOut(delegate()
                {
                    return ExecuteRequest(commandId, payload, snapshot);
                });
                _requestCount++;
                return result;
            }
            catch (Exception ex)
            {
                if (!ShouldRetryWithFreshSession(ex))
                {
                    throw;
                }

                if (!requiresLiveSession)
                {
                    throw;
                }

                snapshot = RefreshLiveSessionLocked("retry_request");
                Dictionary<string, object> retriedResult = ExecuteSuppressingConsoleOut(delegate()
                {
                    return ExecuteRequest(commandId, payload, snapshot);
                });
                _requestCount++;
                return retriedResult;
            }
        }
    }

    private bool RequiresLiveSession(string commandId)
    {
        string operationId;
        if (!new AscetReadHostCapabilityService().TryResolveOperationId(commandId, out operationId))
        {
            return false;
        }

        return !String.Equals(operationId, "capabilities", StringComparison.Ordinal);
    }

    private AscetReadHostSessionSnapshot BuildCurrentSessionSnapshot()
    {
        return new AscetReadHostSessionSnapshot(_database, _databaseRef);
    }

    private Dictionary<string, object> ExecuteRequest(string commandId, Dictionary<string, object> payload, AscetReadHostSessionSnapshot snapshot)
    {
        AscetReadHostDispatchContext context = new AscetReadHostDispatchContext();
        context.StartedUtc = _startedUtc;
        context.RequestCount = _requestCount + 1;
        context.SessionGeneration = _sessionGeneration;
        context.DatabaseBindingGeneration = _databaseBindingGeneration;
        context.DatabaseHandle = snapshot == null ? null : snapshot.DatabaseHandle;
        context.DatabaseRef = snapshot == null ? null : snapshot.DatabaseRef;
        return _dispatcher.Dispatch(commandId, payload, context);
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

    private static string GetRequiredRequestId(IDictionary<string, object> envelope)
    {
        string requestId = GetString(envelope, "id");
        if (String.IsNullOrWhiteSpace(requestId))
        {
            throw new AscetReadException("invalid_envelope", "validate_envelope", "Request envelope must include a non-empty id.");
        }

        return requestId;
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

    private static int GetInt(IDictionary<string, object> payload, string key, int defaultValue)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return defaultValue;
        }

        try
        {
            return Convert.ToInt32(payload[key]);
        }
        catch
        {
            throw new AscetReadException("invalid_argument", "parse_payload", "Field '" + key + "' must be an integer.");
        }
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

    private AscetReadHostSessionSnapshot EnsureLiveSessionSnapshotLocked()
    {
        if (_session == null)
        {
            return RefreshLiveSessionLocked("open_session");
        }

        try
        {
            AscetReadHostSessionSnapshot snapshot = CaptureSessionSnapshot(_session);
            ApplySessionSnapshot(snapshot);
            return snapshot;
        }
        catch
        {
            return RefreshLiveSessionLocked("refresh_session");
        }
    }

    private AscetReadHostSessionSnapshot RefreshLiveSessionLocked(string operation)
    {
        if (_session != null)
        {
            DisposeSessionQuietly(_session);
            _session = null;
        }

        AscetSession session = null;
        AscetReadHostSessionSnapshot snapshot = OpenLiveSessionWithTimeout(operation, out session);

        _session = session;
        _sessionGeneration++;
        ApplySessionSnapshot(snapshot);
        return snapshot;
    }

    private AscetReadHostSessionSnapshot OpenLiveSessionWithTimeout(string operation, out AscetSession session)
    {
        AscetSession openedSession = null;
        AscetReadHostSessionSnapshot snapshot = null;
        Exception failure = null;

        Thread thread = new Thread(delegate()
        {
            try
            {
                snapshot = ExecuteSuppressingConsoleOut(delegate()
                {
                    AscetToolApiBootstrap.ConfigureAssemblyResolution();
                    openedSession = new AscetSession();
                    return CaptureSessionSnapshot(openedSession);
                });
            }
            catch (Exception ex)
            {
                failure = ex;
            }
        });
        thread.IsBackground = true;
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();

        if (!thread.Join(LiveSessionConnectTimeoutMs))
        {
            session = null;
            throw new AscetReadException(
                "tool_connect_timeout",
                operation ?? "open_session",
                "ASCET ToolAPI session did not bind within " + LiveSessionConnectTimeoutMs.ToString() + "ms.");
        }

        if (failure != null)
        {
            if (openedSession != null)
            {
                DisposeSessionQuietly(openedSession);
                openedSession = null;
            }

            throw failure;
        }

        session = openedSession;
        return snapshot;
    }

    private void ApplySessionSnapshot(AscetReadHostSessionSnapshot snapshot)
    {
        bool changed =
            _database == null ||
            snapshot == null ||
            snapshot.DatabaseHandle == null ||
            !Object.ReferenceEquals(_database, snapshot.DatabaseHandle) ||
            !DatabaseRefsEqual(_databaseRef, snapshot.DatabaseRef);

        _database = snapshot == null ? null : snapshot.DatabaseHandle;
        _databaseRef = snapshot == null ? null : snapshot.DatabaseRef;

        if (changed)
        {
            _databaseBindingGeneration++;
        }
    }

    private static bool DatabaseRefsEqual(AscetDatabaseRef left, AscetDatabaseRef right)
    {
        if (left == null && right == null)
        {
            return true;
        }

        if (left == null || right == null)
        {
            return false;
        }

        return
            String.Equals(left.Name ?? String.Empty, right.Name ?? String.Empty, StringComparison.Ordinal) &&
            String.Equals(left.Path ?? String.Empty, right.Path ?? String.Empty, StringComparison.Ordinal) &&
            String.Equals(left.CanonicalPath ?? String.Empty, right.CanonicalPath ?? String.Empty, StringComparison.Ordinal) &&
            String.Equals(left.IdentityStatus ?? String.Empty, right.IdentityStatus ?? String.Empty, StringComparison.Ordinal);
    }

    private static AscetReadHostSessionSnapshot CaptureSessionSnapshot(AscetSession session)
    {
        if (session == null)
        {
            throw new AscetReadException("tool_connect_failed", "capture_session", "ASCET session is not available.");
        }

        Ascet tool = session.GetToolHandle();
        AscetDataBase database = tool.GetCurrentDataBase();
        if (database == null)
        {
            throw new AscetReadException("database_not_open", "capture_session", "GetCurrentDataBase returned null. Open a database in ASCET first.");
        }

        AscetDatabaseRef databaseRef = AscetDatabaseIdentityResolver.Resolve(database, tool);

        return new AscetReadHostSessionSnapshot(database, databaseRef);
    }

    private static bool ShouldRetryWithFreshSession(Exception ex)
    {
        AscetReadException ascet = ex as AscetReadException;
        if (ascet == null)
        {
            return true;
        }

        switch (ascet.Code ?? String.Empty)
        {
            case "unsupported_command":
            case "invalid_argument":
            case "invalid_envelope":
            case "invalid_json":
            case "folder_not_found":
                return false;
            default:
                return true;
        }
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

    private void DisposeSessionQuietly(AscetSession session)
    {
        if (session == null)
        {
            return;
        }

        ExecuteSuppressingConsoleOut(delegate()
        {
            session.Dispose();
            return 0;
        });
    }
}

internal sealed class AscetReadHostSessionSnapshot
{
    public AscetReadHostSessionSnapshot(AscetDataBase databaseHandle, AscetDatabaseRef databaseRef)
    {
        DatabaseHandle = databaseHandle;
        DatabaseRef = databaseRef;
    }

    public AscetDataBase DatabaseHandle { get; private set; }
    public AscetDatabaseRef DatabaseRef { get; private set; }
}
