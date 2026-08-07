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
                "</Elements></Component></ComponentMain>");

            File.WriteAllText(data,
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<ComponentData xmlns:ds=\"http://www.w3.org/2000/09/xmldsig#\"><ds:Signature><ds:SignedInfo /></ds:Signature><DataEntry elementName=\"C_AEB_IB_pMCDeactThresh\" elementOID=\"depOid\">" +
                "<DataVariant name=\"default\"><ScalarType><Numeric value=\"0.0\" /></ScalarType></DataVariant>" +
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
                false);

            string mainXml = File.ReadAllText(main);
            string dataXml = File.ReadAllText(data);
            if (mainXml.IndexOf("<PrimitiveAttributes", StringComparison.Ordinal) < 0 ||
                mainXml.IndexOf("<ScalarAttributes", StringComparison.Ordinal) >= 0 ||
                mainXml.IndexOf("dependent=\"true\"", StringComparison.Ordinal) < 0 ||
                mainXml.IndexOf("<Formula code=\"P_AEB_IB_pMCDeactThresh\"", StringComparison.Ordinal) < 0 ||
                dataXml.IndexOf("<Dependency>", StringComparison.Ordinal) < 0 ||
                dataXml.IndexOf("<ScalarType>", StringComparison.Ordinal) >= 0 ||
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

            AscetElementDependencyXml.SetMainAmdDependencyAndFormula(
                main,
                data,
                "C_AEB_IB_pMCDeactThresh",
                false,
                String.Empty,
                null,
                true);

            mainXml = File.ReadAllText(main);
            if (mainXml.IndexOf("<PrimitiveAttributes", StringComparison.Ordinal) < 0 ||
                mainXml.IndexOf("dependent=\"false\"", StringComparison.Ordinal) < 0 ||
                mainXml.IndexOf("<Formula", StringComparison.Ordinal) >= 0)
            {
                Console.Error.WriteLine("unexpected primitive dependency clear formula write");
                Console.Error.WriteLine(mainXml);
                return 3;
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
