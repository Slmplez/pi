using System;
using System.Collections.Generic;

class AscetReadDependentChainOutputTest
{
    static int Main()
    {
        AscetReadDependentChainArguments parsed = AscetReadDependentChain.ParseArguments(
            new[] { @"/Custom/TESTCLASS", "C_K_Effective", "--provider-scope", @"\Custom", "--max-candidates", "25", "--json" });

        if (!String.Equals(parsed.ComponentPath, @"Custom\TESTCLASS", StringComparison.Ordinal) ||
            !String.Equals(parsed.DependentElementName, "C_K_Effective", StringComparison.Ordinal) ||
            !String.Equals(parsed.ProviderScopePath, @"Custom", StringComparison.Ordinal) ||
            parsed.MaxCandidates != 25 ||
            !parsed.EmitJson)
        {
            Console.Error.WriteLine("unexpected dependent chain argument parsing");
            return 1;
        }

        AscetReadDependentChainArguments constrained = AscetReadDependentChain.ParseArguments(
            new[] { @"Custom\TESTCLASS", "C_K_Effective", "--exporter", @"\Custom\Components\_CalibrationParameters" });
        if (!String.Equals(constrained.ExporterComponentPath, @"Custom\Components\_CalibrationParameters", StringComparison.Ordinal) ||
            constrained.MaxCandidates != 200)
        {
            Console.Error.WriteLine("unexpected dependent chain constrained argument parsing");
            return 6;
        }

        AscetDependentChainReadResult result = new AscetDependentChainReadResult
        {
            ComponentPath = parsed.ComponentPath,
            Direction = "forward",
            Complete = true,
            Issues = new List<string>(),
            Dependent = new AscetDependentChainDependent
            {
                Name = parsed.DependentElementName,
                Scope = "local",
                Kind = "parameter",
                Dependency = "dependent",
                Formula = "K_Base"
            },
            Inputs = new List<AscetDependentChainInput>
            {
                new AscetDependentChainInput
                {
                    VariantName = "default",
                    FormalName = "K_Base",
                    ValueName = "K_Base",
                    ValueScope = "imported",
                    ValueElementTypeName = "ScalarElement",
                    ExportExists = true,
                    ExportName = "K_Base",
                    ExportScope = "exported",
                    ExportElementTypeName = "ScalarElement",
                    ExportOwnerPath = @"Custom\Components\_CalibrationParameters",
                    ExportDiscovery = "auto"
                }
            }
        };

        string json = AscetDependentChainOutput.FormatJsonOutput(result);
        if (json.IndexOf("\"component\":\"Custom\\\\TESTCLASS\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"direction\":\"forward\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"dependent\":{\"name\":\"C_K_Effective\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"dependency\":\"dependent\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"formula\":\"K_Base\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"dependencyFormula\":{\"exists\":true,\"code\":\"K_Base\",\"references\":[\"K_Base\"],\"mappings\":[{\"formal\":\"K_Base\",\"imported\":\"K_Base\",\"importedScope\":\"imported\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"inputs\":[", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"variant\":\"default\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"formal\":{\"name\":\"K_Base\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"value\":{\"name\":\"K_Base\",\"scope\":\"imported\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"export\":{\"exists\":true,\"discovery\":\"auto\",\"name\":\"K_Base\",\"scope\":\"exported\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"owner\":\"Custom\\\\Components\\\\_CalibrationParameters\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"complete\":true", StringComparison.Ordinal) < 0)
        {
            Console.Error.WriteLine("unexpected dependent chain json output");
            Console.Error.WriteLine(json);
            return 2;
        }

        ExpectInvalid(new[] { @"Custom\TESTCLASS", "C_K_Effective", "--exporter" }, "Missing value after --exporter", 4);
        ExpectInvalid(new[] { @"Custom\TESTCLASS", "C_K_Effective", "--exporter", @"Custom\Components\_CalibrationParameters", "extra" }, "Unknown argument", 5);
        ExpectInvalid(new[] { @"Custom\TESTCLASS", "C_K_Effective", "--max-candidates", "0" }, "positive integer", 3);

        return 0;
    }

    private static void ExpectInvalid(string[] args, string expectedMessagePart, int exitCode)
    {
        try
        {
            AscetReadDependentChain.ParseArguments(args);
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
}
