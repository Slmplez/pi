using System;
using System.Collections.Generic;
using System.IO;

class AscetSetElementDependencyOutputTest
{
    static int Main()
    {
        AscetSetElementDependencyArguments parsed = AscetSetElementDependency.ParseArguments(
            new[] { @"/DEMO/DiscreteRiccatiSolver", "B01", "dependent", "--formula", "K_Factor", "--mapping", "K_Factor=K_Factor", "--target-kind", "component", "--match", "all", "--dry-run", "--backup-dir", @"output\backup", "--verify-readback", "--json" });

        if (!String.Equals(parsed.TargetPath, @"DEMO\DiscreteRiccatiSolver", StringComparison.Ordinal) ||
            !String.Equals(parsed.ElementName, "B01", StringComparison.Ordinal) ||
            !String.Equals(parsed.RequestedDependency, "dependent", StringComparison.Ordinal) ||
            !String.Equals(parsed.DependencyFormula, "K_Factor", StringComparison.Ordinal) ||
            parsed.DependencyMappings == null ||
            parsed.DependencyMappings.Count != 1 ||
            !String.Equals(parsed.DependencyMappings["K_Factor"], "K_Factor", StringComparison.Ordinal) ||
            !String.Equals(parsed.TargetKind, "component", StringComparison.Ordinal) ||
            !String.Equals(parsed.MatchMode, "all", StringComparison.Ordinal) ||
            !parsed.DryRun ||
            !parsed.VerifyReadback ||
            !parsed.EmitJson ||
            !String.Equals(parsed.BackupDirectory, @"output\backup", StringComparison.Ordinal))
        {
            Console.Error.WriteLine("unexpected set dependency argument parsing");
            return 1;
        }

        AscetSetElementDependencyResult result = new AscetSetElementDependencyResult
        {
            TargetPath = parsed.TargetPath,
            TargetKind = "component",
            MatchMode = parsed.MatchMode,
            ElementName = parsed.ElementName,
            RequestedDependency = parsed.RequestedDependency,
            DryRun = false,
            WriteSucceeded = true,
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            BackupDirectory = @"E:\Rep\AscetCopolit\output\ascet-xml\backup-DEMO_DiscreteRiccatiSolver-20260711-000000",
            MatchesChanged = 1,
            BeforeDependency = "independent",
            AfterDependency = "dependent",
            BeforeFormula = String.Empty,
            AfterFormula = "K_Factor",
            FormulaChanged = true,
            FormulaMappings = new List<AscetDependencyFormulaMappingResult>
            {
                new AscetDependencyFormulaMappingResult
                {
                    FormalName = "K_Factor",
                    ImportedParameterName = "K_Factor",
                    Verified = true,
                    Issue = String.Empty
                }
            },
            AttemptedMethods = new List<string> { "ExportXMLToFile(backup)", "ImportXMLFromFile" },
            Issues = new List<string>(),
            Plan = new AscetElementDependencyPlanResult
            {
                TargetPath = parsed.TargetPath,
                TargetKind = "component",
                ElementName = parsed.ElementName,
                Matches = new List<AscetElementDependencyPlanMatch>
                {
                    new AscetElementDependencyPlanMatch
                    {
                        ComponentPath = parsed.TargetPath,
                        ElementName = parsed.ElementName,
                        Schema = "scalar-parameter-dependent-flag",
                        BeforeDependency = "independent",
                        Supported = true
                    }
                },
                Issues = new List<string>()
            }
        };

        string text = AscetSetElementDependency.FormatTextOutput(result);
        string json = AscetSetElementDependency.FormatJsonOutput(result);

        if (text.IndexOf("WriteSucceeded: True", StringComparison.Ordinal) < 0 ||
            text.IndexOf("MatchMode: all", StringComparison.Ordinal) < 0 ||
            text.IndexOf("MatchesChanged: 1", StringComparison.Ordinal) < 0 ||
            text.IndexOf("AfterDependency: dependent", StringComparison.Ordinal) < 0 ||
            text.IndexOf("AfterFormula: K_Factor", StringComparison.Ordinal) < 0)
        {
            Console.Error.WriteLine("unexpected set dependency text output");
            return 2;
        }

        if (json.IndexOf("\"target\":\"DEMO\\\\DiscreteRiccatiSolver\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"match\":\"all\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"requested\":\"dependent\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"succeeded\":true", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"readbackVerified\":true", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"changed\":1", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"formula\":{\"after\":\"K_Factor\",\"changed\":true", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"mappings\":[{\"formal\":\"K_Factor\",\"imported\":\"K_Factor\",\"verified\":true", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"plan\":{", StringComparison.Ordinal) < 0)
        {
            Console.Error.WriteLine("unexpected set dependency json output");
            Console.Error.WriteLine(json);
            return 3;
        }

        ExpectXmlFormulaWrite();
        ExpectLogFormulaWriteUsesAscetStyleFormalOid();

        ExpectInvalid(new[] { @"DEMO\DiscreteRiccatiSolver", "B01" }, "usage:", 4);
        ExpectInvalid(new[] { @"DEMO\DiscreteRiccatiSolver", "B01", "bad" }, "dependent or independent", 5);
        ExpectInvalid(new[] { @"DEMO\DiscreteRiccatiSolver", "B01", "dependent", "--backup-dir" }, "Missing value", 6);
        ExpectInvalid(new[] { @"DEMO\DiscreteRiccatiSolver", "B01", "dependent", "--match", "bad" }, "exact or all", 7);
        ExpectInvalid(new[] { @"DEMO\DiscreteRiccatiSolver", "B01", "independent", "--formula", "K_Factor" }, "only valid when requested dependency is dependent", 8);
        ExpectInvalid(new[] { @"DEMO\DiscreteRiccatiSolver", "B01", "dependent", "--mapping", "bad" }, "formal=imported", 9);
        ExpectInvalid(new[] { @"DEMO\DiscreteRiccatiSolver", "B01", "dependent", "--formula", "K_Factor", "--clear-formula" }, "cannot be used together", 10);

        return 0;
    }

    private static void ExpectInvalid(string[] args, string expectedMessagePart, int exitCode)
    {
        try
        {
            AscetSetElementDependency.ParseArguments(args);
            Console.Error.WriteLine("expected invalid argument failure");
            Environment.Exit(exitCode);
        }
        catch (AscetReadException ex)
        {
            if (ex.Message.IndexOf(expectedMessagePart, StringComparison.OrdinalIgnoreCase) < 0)
            {
                Console.Error.WriteLine("unexpected invalid argument message: " + ex.Message);
                Environment.Exit(exitCode);
            }
        }
    }

    private static void ExpectXmlFormulaWrite()
    {
        string dir = Path.Combine(Path.GetTempPath(), "ascet-set-dependency-formula-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            string main = Path.Combine(dir, "TESTCLASS.main.amd");
            string data = Path.Combine(dir, "TESTCLASS.data.amd");

            File.WriteAllText(main,
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<ComponentMain><Component name=\"TESTCLASS\"><Elements>" +
                "<Element name=\"C_K_Factor_Result\" OID=\"depOid\"><ElementAttributes><ScalarType>" +
                "<ScalarAttributes kind=\"parameter\" scope=\"local\" dependent=\"false\" />" +
                "</ScalarType></ElementAttributes></Element>" +
                "<Element name=\"K_Factor\" OID=\"valueOid\"><ElementAttributes><ScalarType>" +
                "<ScalarAttributes kind=\"parameter\" scope=\"imported\" dependent=\"false\" />" +
                "</ScalarType></ElementAttributes></Element>" +
                "</Elements></Component></ComponentMain>");

            File.WriteAllText(data,
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<ComponentData><DataEntry elementName=\"C_K_Factor_Result\" elementOID=\"depOid\">" +
                "<DataVariant name=\"default\"><ScalarType><Numeric value=\"0.0\" /></ScalarType></DataVariant>" +
                "</DataEntry></ComponentData>");

            Dictionary<string, string> mappings = new Dictionary<string, string>();
            mappings["K_Factor"] = "K_Factor";

            AscetElementDependencyXml.SetMainAmdDependencyAndFormula(
                main,
                data,
                "C_K_Factor_Result",
                true,
                "K_Factor",
                mappings,
                false);

            string mainXml = File.ReadAllText(main);
            string dataXml = File.ReadAllText(data);
            if (mainXml.IndexOf("dependent=\"true\"", StringComparison.Ordinal) < 0 ||
                mainXml.IndexOf("<Formula code=\"K_Factor\"", StringComparison.Ordinal) < 0 ||
                mainXml.IndexOf("<Formal name=\"K_Factor\"", StringComparison.Ordinal) < 0 ||
                mainXml.IndexOf("<Formal name=\"K_Factor\" OID=\"\"", StringComparison.Ordinal) >= 0 ||
                dataXml.IndexOf("<Dependency>", StringComparison.Ordinal) < 0 ||
                dataXml.IndexOf("<ScalarType>", StringComparison.Ordinal) >= 0 ||
                dataXml.IndexOf("formalName=\"K_Factor\"", StringComparison.Ordinal) < 0 ||
                dataXml.IndexOf("formalOID=\"\"", StringComparison.Ordinal) >= 0 ||
                dataXml.IndexOf("valueName=\"K_Factor\"", StringComparison.Ordinal) < 0 ||
                dataXml.IndexOf("valueOID=\"valueOid\"", StringComparison.Ordinal) < 0)
            {
                Console.Error.WriteLine("unexpected dependency formula XML write");
                Console.Error.WriteLine(mainXml);
                Console.Error.WriteLine(dataXml);
                Environment.Exit(11);
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

    private static void ExpectLogFormulaWriteUsesAscetStyleFormalOid()
    {
        string dir = Path.Combine(Path.GetTempPath(), "ascet-set-dependency-log-formula-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            string main = Path.Combine(dir, "LOGCLASS.main.amd");
            string data = Path.Combine(dir, "LOGCLASS.data.amd");

            File.WriteAllText(main,
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<ComponentMain><Component name=\"LOGCLASS\" OID=\"_040ts00000001qg70s8g6ldd0gjg0\"><Elements>" +
                "<Element name=\"C_ZJR_New\" OID=\"_040ts00000001qg70s8g7m47lij00\"><ElementAttributes modelType=\"scalar\" basicModelType=\"log\"><ScalarType>" +
                "<ScalarAttributes kind=\"parameter\" scope=\"local\" dependent=\"true\" />" +
                "</ScalarType></ElementAttributes></Element>" +
                "<Element name=\"ZJR\" OID=\"_040ts00000001qg70s8g6lejgssg0\"><ElementAttributes modelType=\"scalar\" basicModelType=\"log\"><ScalarType>" +
                "<ScalarAttributes kind=\"parameter\" scope=\"imported\" dependent=\"false\" />" +
                "</ScalarType></ElementAttributes></Element>" +
                "</Elements></Component></ComponentMain>");

            File.WriteAllText(data,
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<ComponentData><DataEntry elementName=\"C_ZJR_New\" elementOID=\"_040ts00000001qg70s8g7m47lij00\">" +
                "<DataVariant name=\"default\"><ScalarType><Logic value=\"false\" /></ScalarType></DataVariant>" +
                "</DataEntry></ComponentData>");

            Dictionary<string, string> mappings = new Dictionary<string, string>();
            mappings["ZJR"] = "ZJR";

            AscetElementDependencyXml.SetMainAmdDependencyAndFormula(
                main,
                data,
                "C_ZJR_New",
                true,
                "ZJR",
                mappings,
                false);

            string mainXml = File.ReadAllText(main);
            string dataXml = File.ReadAllText(data);
            string formalOid = ExtractAttribute(dataXml, "formalOID=\"");
            if (String.IsNullOrWhiteSpace(formalOid) ||
                !formalOid.StartsWith("_040ts", StringComparison.Ordinal) ||
                formalOid.Length != 30 ||
                mainXml.IndexOf("<Formal name=\"ZJR\" OID=\"" + formalOid + "\"", StringComparison.Ordinal) < 0 ||
                dataXml.IndexOf("formalOID=\"" + formalOid + "\"", StringComparison.Ordinal) < 0 ||
                dataXml.IndexOf("valueOID=\"_040ts00000001qg70s8g6lejgssg0\"", StringComparison.Ordinal) < 0)
            {
                Console.Error.WriteLine("unexpected log dependency formula OID");
                Console.Error.WriteLine(mainXml);
                Console.Error.WriteLine(dataXml);
                Environment.Exit(12);
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

    private static string ExtractAttribute(string xml, string prefix)
    {
        int start = xml.IndexOf(prefix, StringComparison.Ordinal);
        if (start < 0)
        {
            return String.Empty;
        }

        start += prefix.Length;
        int end = xml.IndexOf("\"", start, StringComparison.Ordinal);
        if (end < start)
        {
            return String.Empty;
        }

        return xml.Substring(start, end - start);
    }
}
