using System;

public sealed class AscetLiveContextFactory
{
    public AscetLiveContext Create()
    {
        return Create(new AscetSessionRefreshPolicy());
    }

    public AscetLiveContext Create(AscetSessionRefreshPolicy refreshPolicy)
    {
        return Create(refreshPolicy, null);
    }

    internal AscetLiveContext Create(AscetSessionRefreshPolicy refreshPolicy, AscetLiveSessionOpener sessionOpener)
    {
        AscetToolApiBootstrap.ConfigureAssemblyResolution();
        return new AscetLiveContext(refreshPolicy ?? new AscetSessionRefreshPolicy(), sessionOpener);
    }
}
