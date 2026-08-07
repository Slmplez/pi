using System;
using System.IO;

class AscetDependentChainXmlOutputTest
{
    static int Main()
    {
        string dir = Path.Combine(Path.GetTempPath(), "ascet-dependent-chain-xml-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            string main = Path.Combine(dir, "TESTCLASS.main.amd");
            string data = Path.Combine(dir, "TESTCLASS.data.amd");

            File.WriteAllText(main,
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<ComponentMain><Component name=\"TESTCLASS\"><Elements>" +
                "<Element name=\"C_K_Effective\" OID=\"depOid\"><ElementAttributes><ScalarType>" +
                "<ScalarAttributes kind=\"parameter\" scope=\"local\" dependent=\"true\">" +
                "<Formula code=\"K_Base\"><Formal name=\"K_Base\" OID=\"formalOid\" /></Formula>" +
                "</ScalarAttributes></ScalarType></ElementAttributes></Element>" +
                "<Element name=\"K_Base\" OID=\"valueOid\"><ElementAttributes><ScalarType>" +
                "<ScalarAttributes kind=\"parameter\" scope=\"imported\" dependent=\"false\" />" +
                "</ScalarType></ElementAttributes></Element>" +
                "</Elements></Component></ComponentMain>");

            File.WriteAllText(data,
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<ComponentData><DataEntry elementName=\"C_K_Effective\" elementOID=\"depOid\">" +
                "<DataVariant name=\"default\"><Dependency>" +
                "<Parameter formalName=\"K_Base\" formalOID=\"formalOid\" valueName=\"K_Base\" valueOID=\"valueOid\" />" +
                "</Dependency></DataVariant></DataEntry></ComponentData>");

            AscetDependentChainXmlResult result = AscetDependentChainXml.ReadExportDirectory(dir, "C_K_Effective");

            if (result == null ||
                !String.Equals(result.DependentName, "C_K_Effective", StringComparison.Ordinal) ||
                !String.Equals(result.DependentScope, "local", StringComparison.Ordinal) ||
                !String.Equals(result.DependentKind, "parameter", StringComparison.Ordinal) ||
                !String.Equals(result.Dependency, "dependent", StringComparison.Ordinal) ||
                !String.Equals(result.FormulaCode, "K_Base", StringComparison.Ordinal))
            {
                Console.Error.WriteLine("unexpected dependent xml header parse");
                return 1;
            }

            if (result.Inputs == null || result.Inputs.Count != 1)
            {
                Console.Error.WriteLine("unexpected dependent xml input count");
                return 2;
            }

            AscetDependentChainInput input = result.Inputs[0];
            if (!String.Equals(input.VariantName, "default", StringComparison.Ordinal) ||
                !String.Equals(input.FormalName, "K_Base", StringComparison.Ordinal) ||
                !String.Equals(input.FormalOid, "formalOid", StringComparison.Ordinal) ||
                !String.Equals(input.ValueName, "K_Base", StringComparison.Ordinal) ||
                !String.Equals(input.ValueOid, "valueOid", StringComparison.Ordinal) ||
                !String.Equals(input.ValueScope, "imported", StringComparison.Ordinal) ||
                !String.Equals(input.ValueKind, "parameter", StringComparison.Ordinal))
            {
                Console.Error.WriteLine("unexpected dependent xml input parse");
                return 3;
            }

            TestPrimitiveAttributesFixture();
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

    private static void TestPrimitiveAttributesFixture()
    {
        string dir = Path.Combine(Path.GetTempPath(), "ascet-dependent-chain-primitive-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            string main = Path.Combine(dir, "TESTCLASS.main.amd");
            string data = Path.Combine(dir, "TESTCLASS.data.amd");
            File.WriteAllText(main,
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<ComponentMain><Component name=\"TESTCLASS\"><Elements>" +
                "<Element name=\"C_K_Effective\" OID=\"depOid\"><ElementAttributes><ScalarType>" +
                "<PrimitiveAttributes kind=\"parameter\" scope=\"local\" dependent=\"true\" />" +
                "<Formula code=\"K_Base\"><Formal name=\"K_Base\" OID=\"formalOid\" /></Formula>" +
                "</ScalarType></ElementAttributes></Element>" +
                "<Element name=\"K_Base\" OID=\"valueOid\"><ElementAttributes><ScalarType>" +
                "<PrimitiveAttributes kind=\"parameter\" scope=\"imported\" dependent=\"false\" />" +
                "</ScalarType></ElementAttributes></Element>" +
                "</Elements></Component></ComponentMain>");
            File.WriteAllText(data,
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<ComponentData><DataEntry elementName=\"C_K_Effective\" elementOID=\"depOid\">" +
                "<DataVariant name=\"default\"><Dependency>" +
                "<Parameter formalName=\"K_Base\" formalOID=\"formalOid\" valueName=\"K_Base\" valueOID=\"valueOid\" />" +
                "</Dependency></DataVariant></DataEntry></ComponentData>");

            AscetDependentChainXmlResult result = AscetDependentChainXml.ReadExportDirectory(dir, "C_K_Effective");
            if (result == null ||
                !String.Equals(result.DependentScope, "local", StringComparison.Ordinal) ||
                !String.Equals(result.DependentKind, "parameter", StringComparison.Ordinal) ||
                !String.Equals(result.Dependency, "dependent", StringComparison.Ordinal) ||
                !String.Equals(result.FormulaCode, "K_Base", StringComparison.Ordinal) ||
                result.Issues == null || result.Issues.Count != 0 ||
                result.Inputs == null || result.Inputs.Count != 1 ||
                !String.Equals(result.Inputs[0].ValueScope, "imported", StringComparison.Ordinal) ||
                !String.Equals(result.Inputs[0].ValueKind, "parameter", StringComparison.Ordinal))
            {
                throw new Exception("PrimitiveAttributes dependent XML should be parsed as a scalar parameter without issues.");
            }
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
