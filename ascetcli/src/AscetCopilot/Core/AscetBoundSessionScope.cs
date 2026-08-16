using System;

internal static class AscetBoundSessionContext
{
    [ThreadStatic]
    private static AscetSession _current;

    internal static AscetSession Current
    {
        get { return _current; }
    }

    internal static IDisposable Bind(AscetSession session)
    {
        if (session == null)
        {
            throw new ArgumentNullException("session");
        }
        return new Scope(session);
    }

    private sealed class Scope : IDisposable
    {
        private readonly AscetSession _previous;
        private bool _disposed;

        internal Scope(AscetSession session)
        {
            _previous = _current;
            _current = session;
        }

        public void Dispose()
        {
            if (_disposed)
            {
                return;
            }
            _disposed = true;
            _current = _previous;
        }
    }
}
