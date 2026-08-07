using System;

public sealed class AscetSessionRefreshPolicy
{
    public bool RefreshOnDatabaseBindingInvalid { get; private set; }
    public bool RefreshOnToolConnectFailure { get; private set; }
    public bool RefreshOnUnexpectedFailure { get; private set; }

    public AscetSessionRefreshPolicy()
        : this(true, true, false)
    {
    }

    public AscetSessionRefreshPolicy(bool refreshOnDatabaseBindingInvalid, bool refreshOnToolConnectFailure, bool refreshOnUnexpectedFailure)
    {
        RefreshOnDatabaseBindingInvalid = refreshOnDatabaseBindingInvalid;
        RefreshOnToolConnectFailure = refreshOnToolConnectFailure;
        RefreshOnUnexpectedFailure = refreshOnUnexpectedFailure;
    }

    public bool ShouldRefreshSession(Exception ex)
    {
        AscetReadException ascet = ex as AscetReadException;
        if (ascet == null)
        {
            return RefreshOnUnexpectedFailure;
        }

        switch (ascet.Code ?? String.Empty)
        {
            case "database_binding_invalid":
                return RefreshOnDatabaseBindingInvalid;
            case "tool_connect_failed":
                return RefreshOnToolConnectFailure;
            case "database_not_open":
                return false;
            default:
                return RefreshOnUnexpectedFailure;
        }
    }
}
