using System;

internal sealed class AscetWriteHostContext
{
    private readonly AscetLiveContext _liveContext;

    public AscetWriteHostContext(AscetLiveContext liveContext)
    {
        if (liveContext == null)
        {
            throw new ArgumentNullException("liveContext");
        }

        _liveContext = liveContext;
    }

    public AscetSession GetSession(string operation)
    {
        return _liveContext.GetCurrentSessionHandle(
            String.IsNullOrWhiteSpace(operation) ? "write_host_session" : operation);
    }

    public AscetLiveContextSnapshot GetSnapshot()
    {
        return _liveContext.GetSnapshot();
    }

    public void RefreshSession(string reason)
    {
        _liveContext.RefreshSession(
            String.IsNullOrWhiteSpace(reason) ? "write_host_refresh_session" : reason);
    }
}
