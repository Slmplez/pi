using System;
using System.Collections.Generic;

public sealed class AscetBatchRequestItemDto
{
    public AscetBatchRequestItemDto()
    {
        id = String.Empty;
        operation = String.Empty;
        args = null;
    }

    public string id { get; set; }
    public string operation { get; set; }
    public Dictionary<string, object> args { get; set; }
}

public sealed class AscetBatchResultItemDto
{
    public AscetBatchResultItemDto()
    {
        id = String.Empty;
        ok = false;
        result = null;
        error = null;
    }

    public string id { get; set; }
    public bool ok { get; set; }
    public object result { get; set; }
    public AscetStructuredErrorDto error { get; set; }
}

public sealed class AscetBatchResultPayloadDto
{
    public AscetBatchResultPayloadDto()
    {
        lane = String.Empty;
        results = new List<AscetBatchResultItemDto>();
    }

    public string lane { get; set; }
    public List<AscetBatchResultItemDto> results { get; set; }
}

public sealed class AscetBatchEnvelopeDto
{
    public AscetBatchEnvelopeDto()
    {
        ok = false;
        result = null;
        error = null;
        meta = new AscetEnvelopeMetaDto();
    }

    public bool ok { get; set; }
    public AscetBatchResultPayloadDto result { get; set; }
    public AscetStructuredErrorDto error { get; set; }
    public AscetEnvelopeMetaDto meta { get; set; }
}
