using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;

class AscetSetElementDependencyOutputTest
{
    static int Main()
    {
        AscetSetElementDependencyArguments parsed = AscetSetElementDependency.ParseArguments(
            new[] { @"/DEMO/DiscreteRiccatiSolver", "B01", "dependent", "--formula", "K_Factor", "--mapping", "K_Factor=parameter:K_Factor", "--variant-policy", "default", "--target-kind", "component", "--match", "all", "--dry-run", "--backup-dir", @"output\backup", "--verify-readback", "--json" });

        if (!String.Equals(parsed.TargetPath, @"DEMO\DiscreteRiccatiSolver", StringComparison.Ordinal) ||
            !String.Equals(parsed.ElementName, "B01", StringComparison.Ordinal) ||
            !String.Equals(parsed.RequestedDependency, "dependent", StringComparison.Ordinal) ||
            !String.Equals(parsed.DependencyFormula, "K_Factor", StringComparison.Ordinal) ||
            parsed.DependencyMappings == null ||
            parsed.DependencyMappings.Count != 1 ||
            !String.Equals(parsed.DependencyMappings["K_Factor"], "K_Factor", StringComparison.Ordinal) ||
            !String.Equals(parsed.DependencyMappingKinds["K_Factor"], "parameter", StringComparison.Ordinal) ||
            !String.Equals(parsed.VariantPolicy, "default", StringComparison.Ordinal) ||
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
            ComponentOid = "componentOid",
            ElementOid = "elementOid",
            DefinitionHash = new String('a', 64),
            DataConfigurationSource = "defaultDataConfiguration",
            DataConfigurationName = "DefaultData",
            DataVariantNames = new List<string> { "default" },
            RequestedDependency = parsed.RequestedDependency,
            DryRun = false,
            WriteSucceeded = true,
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            Changed = true,
            MutationStatus = "applied",
            SaveAttempted = true,
            SaveSucceeded = true,
            SaveState = "saved",
            Verified = true,
            VerificationStatus = "passed",
            VerificationMode = "same_session_dependency_endpoint",
            SessionCount = 1,
            SaveCount = 1,
            EditableRetryCount = 0,
            NativeMutationAttemptCount = 1,
            CanonicalEvidenceStatus = "complete",
            CanonicalEvidenceIssue = String.Empty,
            BackupDirectory = @"E:\Rep\AscetCopolit\output\ascet-xml\backup-DEMO_DiscreteRiccatiSolver-20260711-000000",
            MatchesChanged = 1,
            BeforeDependency = "independent",
            AfterDependency = "dependent",
            BeforeFormula = String.Empty,
            AfterFormula = "K_Factor",
            FormulaChanged = true,
            BeforeFormulaMappings = new List<AscetDependencyFormulaMappingResult>
            {
                new AscetDependencyFormulaMappingResult
                {
                    VariantName = "default",
                    FormalName = "Old",
                    ValueName = "C_Old",
                    TargetKind = "constant",
                    TargetScope = "local",
                    FormalOid = "oldFormalOid",
                    ValueOid = "oldValueOid",
                    Verified = true
                }
            },
            FormulaMappings = new List<AscetDependencyFormulaMappingResult>
            {
                new AscetDependencyFormulaMappingResult
                {
                    VariantName = "default",
                    FormalName = "K_Factor",
                    ValueName = "K_Factor",
                    TargetKind = "parameter",
                    TargetScope = "imported",
                    FormalOid = "formalOid",
                    ValueOid = "valueOid",
                    Verified = true,
                    Issue = String.Empty
                }
            },
            AttemptedMethods = new List<string> { "ExportXMLToFile(backup)", "ImportXMLFromFile", "database.Save" },
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
            json.IndexOf("\"identity\":{\"componentOID\":\"componentOid\",\"elementOID\":\"elementOid\"}", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"definitionHash\":\"" + new String('a', 64) + "\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"dataConfiguration\":{\"source\":\"defaultDataConfiguration\",\"name\":\"DefaultData\"}", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"dataVariants\":[\"default\"]", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"requested\":\"dependent\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"succeeded\":true", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"verifyReadbackRequested\":true", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"readbackVerified\":true", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"changed\":true", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"formula\":{\"after\":\"K_Factor\",\"changed\":true", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"beforeMappings\":[{\"formal\":\"Old\",\"valueName\":\"C_Old\",\"targetKind\":\"constant\",\"targetScope\":\"local\",\"verified\":true,\"variant\":\"default\",\"formalOID\":\"oldFormalOid\",\"valueOID\":\"oldValueOid\"}]", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"mappings\":[{\"formal\":\"K_Factor\",\"valueName\":\"K_Factor\",\"targetKind\":\"parameter\",\"targetScope\":\"imported\",\"verified\":true,\"variant\":\"default\",\"formalOID\":\"formalOid\",\"valueOID\":\"valueOid\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"plan\":{", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"saveAttempted\":true", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"saveSucceeded\":true", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"saveState\":\"saved\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"saveCount\":1", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"canonicalEvidenceStatus\":\"complete\"", StringComparison.Ordinal) < 0)
        {
            Console.Error.WriteLine("unexpected set dependency json output");
            Console.Error.WriteLine(json);
            return 3;
        }

        ExpectDeferredSaveOverload();
        ExpectConfirmedNoOpCanonicalOutput();
        ExpectIndependentRestorationWriteDecision();

        ExpectXmlFormulaWrite();
        ExpectLogFormulaWriteUsesAscetStyleFormalOid();
        ExpectNativeDependencyValueKinds();
        ExpectIndirectDependencyCycleRejected();

        ExpectInvalid(new[] { @"DEMO\DiscreteRiccatiSolver", "B01" }, "usage:", 4);
        ExpectInvalid(new[] { @"DEMO\DiscreteRiccatiSolver", "B01", "bad" }, "dependent or independent", 5);
        ExpectInvalid(new[] { @"DEMO\DiscreteRiccatiSolver", "B01", "dependent", "--backup-dir" }, "Missing value", 6);
        ExpectInvalid(new[] { @"DEMO\DiscreteRiccatiSolver", "B01", "dependent", "--match", "bad" }, "exact or all", 7);
        ExpectInvalid(new[] { @"DEMO\DiscreteRiccatiSolver", "B01", "independent", "--formula", "K_Factor" }, "only valid when requested dependency is dependent", 8);
        ExpectInvalid(new[] { @"DEMO\DiscreteRiccatiSolver", "B01", "dependent", "--mapping", "bad" }, "formal=value", 9);
        ExpectInvalid(new[] { @"DEMO\DiscreteRiccatiSolver", "B01", "dependent", "--formula", "K_Factor", "--clear-formula" }, "cannot be used together", 10);
        ExpectInvalid(new[] { @"DEMO\DiscreteRiccatiSolver", "B01", "dependent", "--formula", "max(A,B) * 1e-3" }, "requires at least one explicit", 14);

        Console.WriteLine("{\"passed\":true,\"runtimeProtocolAssertions\":38,\"metrics\":{\"operation\":\"set_element_dependency\",\"scenarios\":4}}");
        return 0;
    }

    private static void ExpectDeferredSaveOverload()
    {
        MethodInfo method = typeof(AscetSetElementDependencyService).GetMethod(
            "SetInSession",
            BindingFlags.Instance | BindingFlags.NonPublic,
            null,
            new[] { typeof(AscetSession), typeof(AscetSetElementDependencyArguments), typeof(bool) },
            null);
        if (method == null || !method.IsAssembly)
        {
            Console.Error.WriteLine("internal deferred Save overload is missing");
            Environment.Exit(18);
        }
    }

    private static void ExpectConfirmedNoOpCanonicalOutput()
    {
        AscetSetElementDependencyResult noOp = new AscetSetElementDependencyResult
        {
            TargetPath = @"DEMO\DiscreteRiccatiSolver",
            TargetKind = "component",
            ElementName = "B01",
            RequestedDependency = "dependent",
            WriteSucceeded = true,
            ReadbackVerified = true,
            Changed = false,
            MutationStatus = "no_op",
            SaveAttempted = false,
            SaveSucceeded = false,
            SaveState = "not_required",
            Verified = true,
            VerificationStatus = "passed",
            VerificationMode = "same_session_dependency_endpoint",
            SessionCount = 1,
            SaveCount = 0,
            EditableRetryCount = 0,
            NativeMutationAttemptCount = 0,
            CanonicalEvidenceStatus = "complete",
            CanonicalEvidenceIssue = String.Empty
        };
        string json = AscetSetElementDependency.FormatJsonOutput(noOp);
        if (json.IndexOf("\"succeeded\":true", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"changed\":false", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"mutationStatus\":\"no_op\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"saveAttempted\":false", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"saveSucceeded\":false", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"saveState\":\"not_required\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"saveCount\":0", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"nativeMutationAttemptCount\":0", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"canonicalEvidenceStatus\":\"complete\"", StringComparison.Ordinal) < 0)
        {
            Console.Error.WriteLine("unexpected confirmed no-op canonical output");
            Console.Error.WriteLine(json);
            Environment.Exit(19);
        }
    }

    private static void ExpectIndependentRestorationWriteDecision()
    {
        AscetSetElementDependencyArguments arguments = new AscetSetElementDependencyArguments
        {
            RequestedDependency = "independent",
            RestorationPolicy = "ascetDefault",
            VariantPolicy = "default",
            VariantNames = new List<string>()
        };
        IList<AscetElementDependencyDataVariantState> numericDefault = new List<AscetElementDependencyDataVariantState>
        {
            new AscetElementDependencyDataVariantState
            {
                VariantName = "default",
                HasDependency = false,
                HasScalarType = true,
                ScalarTypeXml = "<ScalarType><Numeric value=\"0.0\" /></ScalarType>",
                Mappings = new List<AscetElementDependencyDataVariantMapping>()
            }
        };
        if (AscetSetElementDependencyService.RequiresIndependentDataWrite(numericDefault, arguments, null))
        {
            Console.Error.WriteLine("ascetDefault Numeric 0.0 must be a confirmed no-op");
            Environment.Exit(20);
        }

        IList<AscetElementDependencyDataVariantState> logicDefault = new List<AscetElementDependencyDataVariantState>
        {
            new AscetElementDependencyDataVariantState
            {
                VariantName = "default",
                HasDependency = false,
                HasScalarType = true,
                ScalarTypeXml = "<ScalarType><Logic value=\"false\" /></ScalarType>",
                Mappings = new List<AscetElementDependencyDataVariantMapping>()
            }
        };
        if (AscetSetElementDependencyService.RequiresIndependentDataWrite(logicDefault, arguments, null))
        {
            Console.Error.WriteLine("ascetDefault Logic false must be a confirmed no-op");
            Environment.Exit(21);
        }

        IList<AscetElementDependencyDataVariantState> numericNonDefault = new List<AscetElementDependencyDataVariantState>
        {
            new AscetElementDependencyDataVariantState
            {
                VariantName = "default",
                HasDependency = false,
                HasScalarType = true,
                ScalarTypeXml = "<ScalarType><Numeric value=\"1.0\" /></ScalarType>",
                Mappings = new List<AscetElementDependencyDataVariantMapping>()
            }
        };
        if (!AscetSetElementDependencyService.RequiresIndependentDataWrite(numericNonDefault, arguments, null))
        {
            Console.Error.WriteLine("ascetDefault Numeric non-default must require a write");
            Environment.Exit(22);
        }
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

            AscetElementDependencyXml.SetMainAmdDependencyAndFormula(
                main,
                data,
                "C_ZJR_New",
                false,
                String.Empty,
                null,
                true,
                "default",
                null,
                "ascetDefault",
                null);
            dataXml = File.ReadAllText(data);
            if (dataXml.IndexOf("<Logic value=\"false\"", StringComparison.Ordinal) < 0 ||
                dataXml.IndexOf("<Dependency", StringComparison.Ordinal) >= 0)
            {
                Console.Error.WriteLine("logical ascetDefault restoration did not use the ASCET logical default");
                Environment.Exit(15);
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

    private static void ExpectNativeDependencyValueKinds()
    {
        string dir = Path.Combine(Path.GetTempPath(), "ascet-set-dependency-native-values-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            string main = Path.Combine(dir, "NATIVE.main.amd");
            string data = Path.Combine(dir, "NATIVE.data.amd");

            File.WriteAllText(main,
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<ComponentMain><Component name=\"NATIVE\"><Elements>" +
                "<Element name=\"P_Result\" OID=\"resultOid\"><ElementAttributes><ScalarType>" +
                "<ScalarAttributes kind=\"parameter\" scope=\"local\" dependent=\"false\" />" +
                "</ScalarType></ElementAttributes></Element>" +
                "<Element name=\"P_Local\" OID=\"parameterOid\"><ElementAttributes><ScalarType>" +
                "<ScalarAttributes kind=\"parameter\" scope=\"local\" dependent=\"false\" />" +
                "</ScalarType></ElementAttributes></Element>" +
                "<Element name=\"C_Gain\" OID=\"constantOid\"><ElementAttributes><ScalarType>" +
                "<ScalarAttributes kind=\"constant\" scope=\"local\" />" +
                "</ScalarType></ElementAttributes></Element>" +
                "<Element name=\"SC_Offset\" OID=\"systemConstantOid\"><ElementAttributes><ScalarType>" +
                "<ScalarAttributes kind=\"systemConstant\" scope=\"exported\" />" +
                "</ScalarType></ElementAttributes></Element>" +
                "</Elements></Component></ComponentMain>");

            File.WriteAllText(data,
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<ComponentData><DataEntry elementName=\"P_Result\" elementOID=\"resultOid\">" +
                "<DataVariant name=\"default\"><ScalarType><Numeric value=\"0.0\" /></ScalarType></DataVariant>" +
                "</DataEntry></ComponentData>");

            Dictionary<string, string> mappings = new Dictionary<string, string>();
            mappings["P_Local"] = "P_Local";
            mappings["C_Gain"] = "C_Gain";
            mappings["SC_Offset"] = "SC_Offset";

            AscetElementDependencyXml.SetMainAmdDependencyAndFormula(
                main,
                data,
                "P_Result",
                true,
                "P_Local + C_Gain + SC_Offset",
                mappings,
                false);

            string dataXml = File.ReadAllText(data);
            if (dataXml.IndexOf("valueName=\"P_Local\" valueOID=\"parameterOid\"", StringComparison.Ordinal) < 0 ||
                dataXml.IndexOf("valueName=\"C_Gain\" valueOID=\"constantOid\"", StringComparison.Ordinal) < 0 ||
                dataXml.IndexOf("valueName=\"SC_Offset\" valueOID=\"systemConstantOid\"", StringComparison.Ordinal) < 0)
            {
                Console.Error.WriteLine("unexpected native dependency value kind mappings");
                Console.Error.WriteLine(dataXml);
                Environment.Exit(13);
            }

            Dictionary<string, string> targetKinds = new Dictionary<string, string>();
            targetKinds["P_Local"] = "parameter";
            targetKinds["C_Gain"] = "constant";
            targetKinds["SC_Offset"] = "systemConstant";
            AscetElementDependencyXml.VerifyDataVariantMappings(main, data, "P_Result", mappings, "default", null, targetKinds);

            IList<AscetElementDependencyDataVariantState> states = AscetElementDependencyXml.ReadDataVariantStates(main, data, "P_Result");
            bool sawParameter = false;
            bool sawConstant = false;
            bool sawSystemConstant = false;
            if (states.Count == 1 && states[0].Mappings != null)
            {
                for (int i = 0; i < states[0].Mappings.Count; i++)
                {
                    string kind = states[0].Mappings[i].ValueKind ?? String.Empty;
                    sawParameter = sawParameter || String.Equals(kind, "parameter", StringComparison.Ordinal);
                    sawConstant = sawConstant || String.Equals(kind, "constant", StringComparison.Ordinal);
                    sawSystemConstant = sawSystemConstant || String.Equals(kind, "systemconstant", StringComparison.Ordinal);
                }
            }
            if (!sawParameter || !sawConstant || !sawSystemConstant)
            {
                Console.Error.WriteLine("dependency target kind readback is missing");
                Environment.Exit(14);
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
    private static void ExpectIndirectDependencyCycleRejected()
    {
        string dir = Path.Combine(Path.GetTempPath(), "ascet-set-dependency-cycle-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            string main = Path.Combine(dir, "Cycle.main.amd");
            string data = Path.Combine(dir, "Cycle.data.amd");
            File.WriteAllText(main,
                "<ComponentMain><Component><Elements>" +
                "<Element name=\"A\" OID=\"oidA\"><ElementAttributes><ScalarType><ScalarAttributes kind=\"parameter\" scope=\"local\" dependent=\"false\" /></ScalarType></ElementAttributes></Element>" +
                "<Element name=\"B\" OID=\"oidB\"><ElementAttributes><ScalarType><ScalarAttributes kind=\"parameter\" scope=\"local\" dependent=\"true\" /></ScalarType></ElementAttributes></Element>" +
                "<Element name=\"C\" OID=\"oidC\"><ElementAttributes><ScalarType><ScalarAttributes kind=\"parameter\" scope=\"local\" dependent=\"true\" /></ScalarType></ElementAttributes></Element>" +
                "</Elements></Component></ComponentMain>");
            File.WriteAllText(data,
                "<ComponentData>" +
                "<DataEntry elementName=\"B\" elementOID=\"oidB\"><DataVariant name=\"default\"><Dependency><Parameter formalName=\"C\" formalOID=\"f1\" valueName=\"C\" valueOID=\"oidC\" /></Dependency></DataVariant></DataEntry>" +
                "<DataEntry elementName=\"C\" elementOID=\"oidC\"><DataVariant name=\"default\"><Dependency><Parameter formalName=\"A\" formalOID=\"f2\" valueName=\"A\" valueOID=\"oidA\" /></Dependency></DataVariant></DataEntry>" +
                "</ComponentData>");
            Dictionary<string, string> mappings = new Dictionary<string, string>();
            mappings["B"] = "B";
            try
            {
                AscetSetElementDependencyService.ValidateNoDependencyCycle(main, data, "A", mappings, null);
                Console.Error.WriteLine("indirect dependency cycle was accepted");
                Environment.Exit(16);
            }
            catch (AscetReadException ex)
            {
                if (!String.Equals(ex.Code, "dependency_cycle", StringComparison.Ordinal) ||
                    ex.Message.IndexOf("A", StringComparison.Ordinal) < 0 ||
                    ex.Message.IndexOf("B", StringComparison.Ordinal) < 0 ||
                    ex.Message.IndexOf("C", StringComparison.Ordinal) < 0)
                {
                    Console.Error.WriteLine("unexpected indirect cycle error: " + ex.Code + " " + ex.Message);
                    Environment.Exit(17);
                }
            }
        }
        finally
        {
            if (Directory.Exists(dir)) Directory.Delete(dir, true);
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
