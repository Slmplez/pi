using System;
using System.Collections.Generic;

public sealed class AscetCapabilitiesPayloadDto
{
    public AscetCapabilitiesPayloadDto()
    {
        modes = new List<string>();
        operations = new List<string>();
        hostOperations = new List<string>();
    }

    public List<string> modes { get; set; }
    public List<string> operations { get; set; }
    public List<string> hostOperations { get; set; }
}

public sealed class AscetCapabilityEnvelopeDto
{
    public AscetCapabilityEnvelopeDto()
    {
        ok = false;
        result = null;
        error = null;
        meta = new AscetEnvelopeMetaDto();
    }

    public bool ok { get; set; }
    public AscetCapabilitiesPayloadDto result { get; set; }
    public AscetStructuredErrorDto error { get; set; }
    public AscetEnvelopeMetaDto meta { get; set; }
}
