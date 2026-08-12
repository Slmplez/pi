using System;
using System.Collections.Generic;

class AscetElementProvenanceOutputTest
{
    static int Main()
    {
        AscetElementCatalogReadResult catalog = new AscetElementCatalogReadResult
        {
            ComponentPath = @"DEMO\Controller",
            ComponentOid = "COMPONENT-OID",
            ElementOids = new Dictionary<string, string>
            {
                { "P_Exported", "ELEMENT-OID" }
            },
            ComponentConfigurationProvenance = new AscetComponentConfigurationProvenance
            {
                DefaultDataConfiguration = new AscetConfigurationProvenance
                {
                    Source = "defaultDataConfiguration",
                    ConfigurationName = "DefaultData",
                    Selected = true
                },
                DefaultImplementationConfiguration = new AscetConfigurationProvenance
                {
                    Source = "defaultImplementationConfiguration",
                    ConfigurationName = "DefaultImplementation",
                    Selected = true
                }
            },
            Document = new AscetElementSpecDocument
            {
                Elements = new List<AscetElementSpec>
                {
                    new AscetElementSpec
                    {
                        Name = "P_Exported",
                        Kind = AscetElementSpecKind.Parameter,
                        ModelType = "cont",
                        Scope = "exported",
                        ConfigurationProvenance = new AscetElementConfigurationProvenance
                        {
                            DataConfiguration = new AscetConfigurationProvenance
                            {
                                Source = "classDataConfiguration",
                                ConfigurationName = "ClassData",
                                Selected = true
                            },
                            ImplementationConfiguration = new AscetConfigurationProvenance
                            {
                                Source = "classImplementationConfiguration",
                                ConfigurationName = "ClassImplementation",
                                Selected = true
                            }
                        }
                    }
                }
            }
        };

        string json = AscetReadElementCatalog.FormatJsonOutput(catalog);
        if (json.IndexOf("\"identity\":{\"componentOID\":\"COMPONENT-OID\",\"elementOIDs\":{\"P_Exported\":\"ELEMENT-OID\"}}", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"componentConfigurationProvenance\":{\"defaultDataConfiguration\":{\"source\":\"defaultDataConfiguration\",\"configurationName\":\"DefaultData\",\"selected\":true},\"defaultImplementationConfiguration\":{\"source\":\"defaultImplementationConfiguration\",\"configurationName\":\"DefaultImplementation\",\"selected\":true}}", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"configurationProvenance\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"dataConfiguration\":{\"source\":\"classDataConfiguration\",\"configurationName\":\"ClassData\",\"selected\":true}", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"implementationConfiguration\":{\"source\":\"classImplementationConfiguration\",\"configurationName\":\"ClassImplementation\",\"selected\":true}", StringComparison.Ordinal) < 0)
        {
            Console.Error.WriteLine("read_element_catalog identity/configuration provenance was not serialized");
            Console.Error.WriteLine(json);
            return 1;
        }

        return 0;
    }
}
