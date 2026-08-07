using System;
using System.Collections.Generic;

public sealed class AscetStructuredErrorDto
{
    public AscetStructuredErrorDto()
    {
        code = String.Empty;
        message = String.Empty;
        operation = String.Empty;
        details = null;
    }

    public string code { get; set; }
    public string message { get; set; }
    public string operation { get; set; }
    public Dictionary<string, object> details { get; set; }
}

public sealed class AscetEnvelopeMetaDto
{
    public AscetEnvelopeMetaDto()
    {
        protocolVersion = 1;
        mode = String.Empty;
        operation = String.Empty;
        lane = String.Empty;
    }

    public int protocolVersion { get; set; }
    public string mode { get; set; }
    public string operation { get; set; }
    public string lane { get; set; }
}

public sealed class AscetExecEnvelopeDto
{
    public AscetExecEnvelopeDto()
    {
        ok = false;
        result = null;
        error = null;
        meta = new AscetEnvelopeMetaDto();
    }

    public bool ok { get; set; }
    public object result { get; set; }
    public AscetStructuredErrorDto error { get; set; }
    public AscetEnvelopeMetaDto meta { get; set; }
}
