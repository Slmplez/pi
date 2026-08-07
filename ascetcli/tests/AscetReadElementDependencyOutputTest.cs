using System;
using System.Collections.Generic;

class AscetReadElementDependencyOutputTest
{
    static int Main()
    {
        AscetReadElementDependencyArguments parsed = AscetReadElementDependency.ParseArguments(
            new[] { @"/DEMO/DiscreteRiccatiSolver", "B01", "--target-kind", "component", "--json" });

        if (!String.Equals(parsed.TargetPath, @"DEMO\DiscreteRiccatiSolver", StringComparison.Ordinal) ||
            !String.Equals(parsed.ElementName, "B01", StringComparison.Ordinal) ||
            !String.Equals(parsed.TargetKind, "component", StringComparison.Ordinal) ||
            !parsed.EmitJson)
        {
            Console.Error.WriteLine("unexpected read element dependency argument parsing");
            return 1;
        }

        AscetElementDependencyPlanResult result = new AscetElementDependencyPlanResult
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
                    Kind = "parameter",
                    Scope = "local",
                    Schema = "primitive-parameter-dependent-flag",
                    BeforeDependency = "dependent",
                    FormulaCode = "K_Factor",
                    IsParameter = true,
                    IsDependent = true,
                    Supported = true
                }
            },
            Issues = new List<string>()
        };

        string text = AscetReadElementDependency.FormatTextOutput(result);
        string json = AscetReadElementDependency.FormatJsonOutput(result);

        if (text.IndexOf("Dependency: dependent", StringComparison.Ordinal) < 0 ||
            text.IndexOf("Formula: K_Factor", StringComparison.Ordinal) < 0 ||
            text.IndexOf("Supported: True", StringComparison.Ordinal) < 0)
        {
            Console.Error.WriteLine("unexpected read element dependency text output");
            return 2;
        }

        if (json.IndexOf("\"target\":\"DEMO\\\\DiscreteRiccatiSolver\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"element\":\"B01\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"count\":1", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"schema\":\"primitive-parameter-dependent-flag\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"dependency\":\"dependent\"", StringComparison.Ordinal) < 0 ||
            json.IndexOf("\"formula\":\"K_Factor\"", StringComparison.Ordinal) < 0)
        {
            Console.Error.WriteLine("unexpected read element dependency json output");
            Console.Error.WriteLine(json);
            return 3;
        }

        ExpectInvalid(new[] { @"DEMO\DiscreteRiccatiSolver" }, "usage:", 4);
        ExpectInvalid(new[] { @"DEMO\DiscreteRiccatiSolver", "B01", "--target-kind" }, "Missing value", 5);
        ExpectInvalid(new[] { @"DEMO\DiscreteRiccatiSolver", "B01", "--target-kind", "bad" }, "auto, component, project, or folder", 6);
        ExpectInvalid(new[] { @"DEMO\DiscreteRiccatiSolver", "B01", "--bad" }, "Unknown argument", 7);

        return 0;
    }

    private static void ExpectInvalid(string[] args, string expectedMessagePart, int exitCode)
    {
        try
        {
            AscetReadElementDependency.ParseArguments(args);
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
