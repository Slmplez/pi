using System;
using System.Collections.Generic;

public static class HostCommand
{
    private const int ExitCodeStructuredError = 2;

    public static int Run(string[] args)
    {
        string lane;
        bool emitJson;
        Dictionary<string, object> parseError = AscetCliEnvelope.ParseLaneArguments(
            args,
            "host",
            new string[] { "read", "write" },
            "read",
            out lane,
            out emitJson);

        if (parseError != null)
        {
            return AscetCliEnvelope.WriteError(ExitCodeStructuredError, parseError);
        }

        if (String.Equals(lane, "write", StringComparison.OrdinalIgnoreCase))
        {
            using (AscetWriteHostServer server = new AscetWriteHostServer())
            {
                return server.Run();
            }
        }

        return AscetCliEnvelope.WriteError(
            ExitCodeStructuredError,
            AscetCliEnvelope.Error(
                "not_implemented",
                "host mode is not implemented yet for lane '" + lane + "'.",
                "host",
                lane));
    }
}
