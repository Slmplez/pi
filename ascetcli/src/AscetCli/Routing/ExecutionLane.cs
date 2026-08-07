public enum ExecutionLane
{
    LegacyRead = 0,
    PooledRead = 1,
    SerialWrite = 2,
    Diagnostic = 3
}

public enum BatchSupportShape
{
    None = 0,
    Read = 1,
    Write = 2
}
