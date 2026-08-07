using System;
using System.Diagnostics;
using de.etas.cebra.toolAPI.Ascet;

public sealed class AscetLiveContext : IDisposable
{
    private readonly AscetSessionRefreshPolicy _refreshPolicy;
    private readonly AscetLiveSessionOpener _sessionOpener;
    private readonly string _contextInstanceId;
    private IAscetLiveSessionAdapter _sessionAdapter;
    private AscetLiveBindingSnapshot _bindingSnapshot;
    private int _sessionGeneration;
    private int _databaseBindingGeneration;
    private bool _disposed;
    private string _lastDiagnosticMessage;
    private Exception _lastDisposeException;

    internal AscetLiveContext(AscetSessionRefreshPolicy refreshPolicy, AscetLiveSessionOpener sessionOpener)
    {
        _refreshPolicy = refreshPolicy ?? new AscetSessionRefreshPolicy();
        _sessionOpener = sessionOpener ?? DefaultSessionOpener;
        _contextInstanceId = Guid.NewGuid().ToString("N");
        ReplaceSession("startup");
    }

    public int SessionGeneration
    {
        get
        {
            ThrowIfDisposed();
            return _sessionGeneration;
        }
    }

    public int DatabaseBindingGeneration
    {
        get
        {
            ThrowIfDisposed();
            return _databaseBindingGeneration;
        }
    }

    public string LastDiagnosticMessage
    {
        get
        {
            return _lastDiagnosticMessage ?? String.Empty;
        }
    }

    public Exception LastDisposeException
    {
        get
        {
            return _lastDisposeException;
        }
    }

    public AscetLiveContextSnapshot GetSnapshot()
    {
        ThrowIfDisposed();
        return CreatePublicSnapshot();
    }

    public bool IsSnapshotCurrent(AscetLiveContextSnapshot snapshot)
    {
        if (_disposed || snapshot == null || _bindingSnapshot == null)
        {
            return false;
        }

        return
            String.Equals(snapshot.ContextInstanceId ?? String.Empty, _contextInstanceId, StringComparison.Ordinal) &&
            snapshot.SessionGeneration == _sessionGeneration &&
            snapshot.DatabaseBindingGeneration == _databaseBindingGeneration &&
            snapshot.HasSessionHandle == (_bindingSnapshot.SessionHandle != null) &&
            snapshot.HasToolHandle == (_bindingSnapshot.ToolHandle != null) &&
            snapshot.HasDatabaseHandle == (_bindingSnapshot.DatabaseHandle != null) &&
            DatabaseRefsEqual(snapshot.DatabaseRef, _bindingSnapshot.DatabaseRef);
    }

    public bool EnsureCurrentDatabaseBinding()
    {
        ThrowIfDisposed();

        if (_sessionAdapter == null || _bindingSnapshot == null)
        {
            ReplaceSession("open_session");
            return true;
        }

        try
        {
            AscetLiveBindingSnapshot captured = _sessionAdapter.CaptureBinding("ensure_current_database_binding");
            if (!HasBindingChanged(captured))
            {
                return false;
            }

            ApplyBinding(captured, false);
            return true;
        }
        catch (Exception ex)
        {
            if (!_refreshPolicy.ShouldRefreshSession(ex))
            {
                throw;
            }

            ReplaceSession("ensure_current_database_binding_refresh");
            return true;
        }
    }

    public bool RebindCurrentDatabaseBinding()
    {
        ThrowIfDisposed();

        if (_sessionAdapter == null || _bindingSnapshot == null)
        {
            ReplaceSession("rebind_current_database_binding");
            return true;
        }

        AscetLiveBindingSnapshot captured = _sessionAdapter.CaptureBinding("rebind_current_database_binding");
        ApplyBinding(captured, true);
        return true;
    }

    public void RefreshSession(string reason)
    {
        ThrowIfDisposed();
        ReplaceSession(String.IsNullOrWhiteSpace(reason) ? "refresh_session" : reason);
    }

    internal AscetSession GetCurrentSessionHandle(string operation)
    {
        ThrowIfDisposed();
        EnsureCurrentDatabaseBinding();

        if (_bindingSnapshot == null || _bindingSnapshot.SessionHandle == null)
        {
            throw new AscetReadException(
                "tool_connect_failed",
                String.IsNullOrWhiteSpace(operation) ? "get_current_session_handle" : operation,
                "ASCET live context does not currently hold a session handle.");
        }

        AscetSession session = _bindingSnapshot.SessionHandle as AscetSession;
        if (session == null)
        {
            throw new AscetReadException(
                "tool_connect_failed",
                String.IsNullOrWhiteSpace(operation) ? "get_current_session_handle" : operation,
                "ASCET live context session handle is not an AscetSession instance.");
        }

        return session;
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;

        IAscetLiveSessionAdapter currentAdapter = _sessionAdapter;
        _sessionAdapter = null;
        _bindingSnapshot = null;

        DisposeAdapterWithDiagnostics(currentAdapter, "dispose_current_session");
    }

    private void ReplaceSession(string operation)
    {
        IAscetLiveSessionAdapter replacementAdapter = null;
        AscetLiveBindingSnapshot replacementSnapshot = null;

        try
        {
            replacementAdapter = _sessionOpener(operation);
            if (replacementAdapter == null)
            {
                throw new AscetReadException("tool_connect_failed", operation, "Session opener returned null.");
            }

            replacementSnapshot = replacementAdapter.CaptureBinding(operation);
        }
        catch
        {
            if (replacementAdapter != null)
            {
                DisposeAdapterWithDiagnostics(replacementAdapter, operation + "_replacement_teardown");
            }

            throw;
        }

        IAscetLiveSessionAdapter previousAdapter = _sessionAdapter;
        _sessionAdapter = replacementAdapter;
        _sessionGeneration++;
        ApplyBinding(replacementSnapshot, true);

        DisposeAdapterWithDiagnostics(previousAdapter, operation + "_previous_teardown");
    }

    private void ApplyBinding(AscetLiveBindingSnapshot snapshot, bool forceIncrement)
    {
        bool changed = forceIncrement || HasBindingChanged(snapshot);
        _bindingSnapshot = snapshot == null ? null : snapshot.Clone();
        if (changed)
        {
            _databaseBindingGeneration++;
        }
    }

    private bool HasBindingChanged(AscetLiveBindingSnapshot snapshot)
    {
        return
            _bindingSnapshot == null ||
            snapshot == null ||
            snapshot.DatabaseHandle == null ||
            !Object.ReferenceEquals(_bindingSnapshot.DatabaseHandle, snapshot.DatabaseHandle) ||
            !DatabaseRefsEqual(_bindingSnapshot.DatabaseRef, snapshot.DatabaseRef);
    }

    private AscetLiveContextSnapshot CreatePublicSnapshot()
    {
        AscetLiveBindingSnapshot binding = _bindingSnapshot == null ? null : _bindingSnapshot.Clone();
        return new AscetLiveContextSnapshot(
            _contextInstanceId,
            binding != null && binding.SessionHandle != null,
            binding != null && binding.ToolHandle != null,
            binding != null && binding.DatabaseHandle != null,
            binding == null ? null : binding.DatabaseRef,
            _sessionGeneration,
            _databaseBindingGeneration);
    }

    private void DisposeAdapterWithDiagnostics(IAscetLiveSessionAdapter adapter, string operation)
    {
        if (adapter == null)
        {
            return;
        }

        try
        {
            adapter.Dispose();
        }
        catch (Exception ex)
        {
            _lastDisposeException = ex;
            _lastDiagnosticMessage = "ASCET live context teardown failed during " + operation + ": " + ex.Message;
            Trace.TraceWarning(_lastDiagnosticMessage);
        }
    }

    private void ThrowIfDisposed()
    {
        if (_disposed)
        {
            throw new ObjectDisposedException("AscetLiveContext");
        }
    }

    private static IAscetLiveSessionAdapter DefaultSessionOpener(string operation)
    {
        AscetToolApiBootstrap.ConfigureAssemblyResolution();
        return new DefaultAscetLiveSessionAdapter(operation);
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
            String.Equals(left.Path ?? String.Empty, right.Path ?? String.Empty, StringComparison.Ordinal);
    }

    private sealed class DefaultAscetLiveSessionAdapter : IAscetLiveSessionAdapter
    {
        private readonly AscetSession _session;

        public DefaultAscetLiveSessionAdapter(string operation)
        {
            _session = new AscetSession();
            if (_session == null)
            {
                throw new AscetReadException("tool_connect_failed", operation, "Failed to create ASCET ToolAPI session.");
            }
        }

        public AscetLiveBindingSnapshot CaptureBinding(string operation)
        {
            Ascet tool = _session.GetToolHandle();
            if (tool == null)
            {
                throw new AscetReadException("tool_connect_failed", operation, "ASCET ToolAPI session handle is not available.");
            }

            AscetDataBase databaseHandle;
            try
            {
                databaseHandle = tool.GetCurrentDataBase();
            }
            catch (Exception ex)
            {
                throw new AscetReadException("database_binding_invalid", operation, "Failed to resolve the current ASCET database handle.", ex);
            }

            if (databaseHandle == null)
            {
                throw new AscetReadException("database_not_open", operation, "GetCurrentDataBase returned null. Open a database in ASCET first.");
            }

            AscetDatabaseRef databaseRef = new AscetDatabaseRef();
            try
            {
                databaseRef.Name = databaseHandle.GetName();
                databaseRef.Path = tool.GetDataBasePath();
            }
            catch (Exception ex)
            {
                throw new AscetReadException("database_binding_invalid", operation, "Failed to read the current ASCET database binding.", ex);
            }

            return new AscetLiveBindingSnapshot(_session, tool, databaseHandle, databaseRef);
        }

        public void Dispose()
        {
            _session.Dispose();
        }
    }
}

public sealed class AscetLiveContextSnapshot
{
    internal AscetLiveContextSnapshot(
        string contextInstanceId,
        bool hasSessionHandle,
        bool hasToolHandle,
        bool hasDatabaseHandle,
        AscetDatabaseRef databaseRef,
        int sessionGeneration,
        int databaseBindingGeneration)
    {
        ContextInstanceId = contextInstanceId ?? String.Empty;
        HasSessionHandle = hasSessionHandle;
        HasToolHandle = hasToolHandle;
        HasDatabaseHandle = hasDatabaseHandle;
        DatabaseRef = CloneDatabaseRef(databaseRef);
        SessionGeneration = sessionGeneration;
        DatabaseBindingGeneration = databaseBindingGeneration;
    }

    public string ContextInstanceId { get; private set; }
    public bool HasSessionHandle { get; private set; }
    public bool HasToolHandle { get; private set; }
    public bool HasDatabaseHandle { get; private set; }
    public AscetDatabaseRef DatabaseRef { get; private set; }
    public int SessionGeneration { get; private set; }
    public int DatabaseBindingGeneration { get; private set; }

    private static AscetDatabaseRef CloneDatabaseRef(AscetDatabaseRef databaseRef)
    {
        if (databaseRef == null)
        {
            return null;
        }

        AscetDatabaseRef clone = new AscetDatabaseRef();
        clone.Name = databaseRef.Name;
        clone.Path = databaseRef.Path;
        return clone;
    }
}

internal delegate IAscetLiveSessionAdapter AscetLiveSessionOpener(string operation);

internal interface IAscetLiveSessionAdapter : IDisposable
{
    AscetLiveBindingSnapshot CaptureBinding(string operation);
}

internal sealed class AscetLiveBindingSnapshot
{
    public AscetLiveBindingSnapshot(object sessionHandle, object toolHandle, object databaseHandle, AscetDatabaseRef databaseRef)
    {
        SessionHandle = sessionHandle;
        ToolHandle = toolHandle;
        DatabaseHandle = databaseHandle;
        DatabaseRef = CloneDatabaseRef(databaseRef);
    }

    public object SessionHandle { get; private set; }
    public object ToolHandle { get; private set; }
    public object DatabaseHandle { get; private set; }
    public AscetDatabaseRef DatabaseRef { get; private set; }

    public AscetLiveBindingSnapshot Clone()
    {
        return new AscetLiveBindingSnapshot(SessionHandle, ToolHandle, DatabaseHandle, DatabaseRef);
    }

    private static AscetDatabaseRef CloneDatabaseRef(AscetDatabaseRef databaseRef)
    {
        if (databaseRef == null)
        {
            return null;
        }

        AscetDatabaseRef clone = new AscetDatabaseRef();
        clone.Name = databaseRef.Name;
        clone.Path = databaseRef.Path;
        return clone;
    }
}
