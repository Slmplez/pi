using System;
using System.Collections.Generic;
using System.IO;

class AscetElementDependencyPrimitiveOutputTest
{
    static int Main()
    {
        string dir = Path.Combine(Path.GetTempPath(), "ascet-primitive-dependency-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            string main = Path.Combine(dir, "Probe.main.amd");
            string data = Path.Combine(dir, "Probe.data.amd");

            File.WriteAllText(main,
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<ComponentMain xmlns:ds=\"http://www.w3.org/2000/09/xmldsig#\"><ds:Signature><ds:SignedInfo /></ds:Signature><Component name=\"Probe\"><Elements>" +
                "<Element name=\"C_AEB_IB_pMCDeactThresh\" OID=\"depOid\"><ElementAttributes><ScalarType>" +
                "<PrimitiveAttributes kind=\"parameter\" scope=\"local\" dependent=\"true\">" +
                "<Formula code=\"P_AEB_IB_pMCDeactThresh\"><Formal name=\"P_AEB_IB_pMCDeactThresh\" OID=\"formalOid\" /></Formula>" +
                "</PrimitiveAttributes>" +
                "</ScalarType></ElementAttributes></Element>" +
                "<Element name=\"P_AEB_IB_pMCDeactThresh\" OID=\"valueOid\"><ElementAttributes><ScalarType>" +
                "<PrimitiveAttributes kind=\"parameter\" scope=\"imported\" dependent=\"false\" />" +
                "</ScalarType></ElementAttributes></Element>" +
                "<Element name=\"C_Calibration\" OID=\"constantOid\"><ElementAttributes><ScalarType>" +
                "<PrimitiveAttributes kind=\"constant\" scope=\"local\" />" +
                "</ScalarType></ElementAttributes></Element>" +
                "</Elements></Component></ComponentMain>");

            File.WriteAllText(data,
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<ComponentData xmlns:ds=\"http://www.w3.org/2000/09/xmldsig#\"><ds:Signature><ds:SignedInfo /></ds:Signature><DataEntry elementName=\"C_AEB_IB_pMCDeactThresh\" elementOID=\"depOid\">" +
                "<DataVariant name=\"default\"><ScalarType><Numeric value=\"0.0\" /></ScalarType></DataVariant>" +
                "<DataVariant name=\"calibration\"><ScalarType><Numeric value=\"1.0\" /></ScalarType></DataVariant>" +
                "</DataEntry></ComponentData>");

            AscetElementDependencyCandidate candidate = AscetElementDependencyXml.FindCandidate(main, "C_AEB_IB_pMCDeactThresh");
            if (candidate == null ||
                !candidate.Supported ||
                !String.Equals(candidate.Schema, "primitive-parameter-dependent-flag", StringComparison.Ordinal) ||
                !String.Equals(candidate.BeforeDependency, "dependent", StringComparison.Ordinal) ||
                !String.Equals(candidate.FormulaCode, "P_AEB_IB_pMCDeactThresh", StringComparison.Ordinal))
            {
                Console.Error.WriteLine("unexpected primitive dependency candidate");
                return 1;
            }

            Dictionary<string, string> mappings = new Dictionary<string, string>();
            mappings["P_AEB_IB_pMCDeactThresh"] = "P_AEB_IB_pMCDeactThresh";

            AscetElementDependencyXml.SetMainAmdDependencyAndFormula(
                main,
                data,
                "C_AEB_IB_pMCDeactThresh",
                true,
                "P_AEB_IB_pMCDeactThresh",
                mappings,
                false,
                "default",
                null,
                String.Empty,
                null);

            string mainXml = File.ReadAllText(main);
            string dataXml = File.ReadAllText(data);
            if (mainXml.IndexOf("<PrimitiveAttributes", StringComparison.Ordinal) < 0 ||
                mainXml.IndexOf("<ScalarAttributes", StringComparison.Ordinal) >= 0 ||
                mainXml.IndexOf("dependent=\"true\"", StringComparison.Ordinal) < 0 ||
                mainXml.IndexOf("<Formula code=\"P_AEB_IB_pMCDeactThresh\"", StringComparison.Ordinal) < 0 ||
                dataXml.IndexOf("<Dependency>", StringComparison.Ordinal) < 0 ||
                dataXml.IndexOf("<ScalarType>", StringComparison.Ordinal) < 0 ||
                dataXml.IndexOf("formalName=\"P_AEB_IB_pMCDeactThresh\"", StringComparison.Ordinal) < 0 ||
                dataXml.IndexOf("valueName=\"P_AEB_IB_pMCDeactThresh\"", StringComparison.Ordinal) < 0 ||
                mainXml.IndexOf("Signature", StringComparison.Ordinal) >= 0 ||
                dataXml.IndexOf("Signature", StringComparison.Ordinal) >= 0 ||
                dataXml.IndexOf("valueOID=\"valueOid\"", StringComparison.Ordinal) < 0)
            {
                Console.Error.WriteLine("unexpected primitive dependency XML write");
                Console.Error.WriteLine(mainXml);
                Console.Error.WriteLine(dataXml);
                return 2;
            }

            IList<AscetElementDependencyDataVariantState> states = AscetElementDependencyXml.ReadDataVariantStates(data, "C_AEB_IB_pMCDeactThresh");
            if (states.Count != 2 || states[0].Mappings.Count != 1 || states[1].Mappings.Count != 0 ||
                !states[0].HasDependency || states[0].HasScalarType ||
                states[1].HasDependency || !states[1].HasScalarType ||
                !String.Equals(states[0].VariantName, "default", StringComparison.Ordinal) ||
                !String.Equals(states[1].VariantName, "calibration", StringComparison.Ordinal))
            {
                Console.Error.WriteLine("variantPolicy default modified more than the default DataVariant");
                return 4;
            }

            AscetElementDependencyXml.SetMainAmdDependencyAndFormula(
                main,
                data,
                "C_AEB_IB_pMCDeactThresh",
                true,
                "P_AEB_IB_pMCDeactThresh",
                mappings,
                false,
                "selected",
                new List<string> { "calibration" },
                String.Empty,
                null);

            states = AscetElementDependencyXml.ReadDataVariantStates(data, "C_AEB_IB_pMCDeactThresh");
            if (states.Count != 2 || states[0].Mappings.Count != 1 || states[1].Mappings.Count != 1 ||
                !String.Equals(states[1].Mappings[0].FormalName, "P_AEB_IB_pMCDeactThresh", StringComparison.Ordinal) ||
                !String.Equals(states[1].Mappings[0].FormalOid, "formalOid", StringComparison.Ordinal) ||
                !String.Equals(states[1].Mappings[0].ValueName, "P_AEB_IB_pMCDeactThresh", StringComparison.Ordinal) ||
                !String.Equals(states[1].Mappings[0].ValueOid, "valueOid", StringComparison.Ordinal))
            {
                Console.Error.WriteLine("unexpected selected DataVariant dependency readback");
                return 6;
            }

            AscetElementDependencyXml.VerifyDataVariantMappings(main, data, "C_AEB_IB_pMCDeactThresh", mappings, "all", null, null);

            AscetElementDependencyXml.SetMainAmdDependencyAndFormula(
                main,
                data,
                "C_AEB_IB_pMCDeactThresh",
                false,
                String.Empty,
                null,
                true,
                "all",
                null,
                "explicit",
                new Dictionary<string, string>
                {
                    { "default", "0.0" },
                    { "calibration", "1.0" }
                });

            mainXml = File.ReadAllText(main);
            if (mainXml.IndexOf("<PrimitiveAttributes", StringComparison.Ordinal) < 0 ||
                mainXml.IndexOf("dependent=\"false\"", StringComparison.Ordinal) < 0 ||
                mainXml.IndexOf("<Formula", StringComparison.Ordinal) >= 0)
            {
                Console.Error.WriteLine("unexpected primitive dependency clear formula write");
                Console.Error.WriteLine(mainXml);
                return 3;
            }

            states = AscetElementDependencyXml.ReadDataVariantStates(data, "C_AEB_IB_pMCDeactThresh");
            if (states.Count != 2 || states[0].HasDependency || states[1].HasDependency ||
                !states[0].HasScalarType || !states[1].HasScalarType ||
                states[0].ScalarTypeXml.IndexOf("value=\"0.0\"", StringComparison.Ordinal) < 0 ||
                states[1].ScalarTypeXml.IndexOf("value=\"1.0\"", StringComparison.Ordinal) < 0)
            {
                Console.Error.WriteLine("unexpected primitive independent data variant restoration");
                return 5;
            }

            Dictionary<string, Dictionary<string, string>> perVariantMappings =
                new Dictionary<string, Dictionary<string, string>>(StringComparer.Ordinal);
            perVariantMappings["default"] = new Dictionary<string, string>(StringComparer.Ordinal)
            {
                { "P_AEB_IB_pMCDeactThresh", "P_AEB_IB_pMCDeactThresh" }
            };
            perVariantMappings["calibration"] = new Dictionary<string, string>(StringComparer.Ordinal)
            {
                { "P_AEB_IB_pMCDeactThresh", "C_Calibration" }
            };
            AscetElementDependencyXml.SetMainAmdDependencyAndFormula(
                main,
                data,
                "C_AEB_IB_pMCDeactThresh",
                true,
                "P_AEB_IB_pMCDeactThresh",
                null,
                perVariantMappings,
                false,
                "all",
                null,
                String.Empty,
                null);
            states = AscetElementDependencyXml.ReadDataVariantStates(data, "C_AEB_IB_pMCDeactThresh");
            if (states.Count != 2 || states[0].Mappings.Count != 1 || states[1].Mappings.Count != 1 ||
                !String.Equals(states[0].Mappings[0].ValueName, "P_AEB_IB_pMCDeactThresh", StringComparison.Ordinal) ||
                !String.Equals(states[1].Mappings[0].ValueName, "C_Calibration", StringComparison.Ordinal))
            {
                Console.Error.WriteLine("per-DataVariant mappings were not preserved");
                return 7;
            }

            return 0;
        }
        finally
        {
            if (Directory.Exists(dir))
            {
                Directory.Delete(dir, true);
            }
        }
    }
}
