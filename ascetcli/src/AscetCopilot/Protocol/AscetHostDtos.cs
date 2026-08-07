using System;
using System.Collections.Generic;

public sealed class AscetHostRequestEnvelopeDto
{
    public AscetHostRequestEnvelopeDto()
    {
        type = "request";
        id = String.Empty;
        operation = String.Empty;
        args = null;
    }

    public string type { get; set; }
    public string id { get; set; }
    public string operation { get; set; }
    public Dictionary<string, object> args { get; set; }
}

public sealed class AscetHostResponseEnvelopeDto
{
    public AscetHostResponseEnvelopeDto()
    {
        type = "response";
        id = String.Empty;
        ok = false;
        result = null;
        error = null;
        meta = new AscetEnvelopeMetaDto();
    }

    public string type { get; set; }
    public string id { get; set; }
    public bool ok { get; set; }
    public object result { get; set; }
    public AscetStructuredErrorDto error { get; set; }
    public AscetEnvelopeMetaDto meta { get; set; }
}
