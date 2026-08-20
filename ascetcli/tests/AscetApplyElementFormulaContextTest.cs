using System;
using System.Collections.Generic;
using System.IO;

public static class AscetApplyElementFormulaContextTest
{
    public static int Main()
    {
        int assertions = 0;
        try
        {
            TestBlankFormulaDoesNotRequireProject(ref assertions);
            TestIdentityFormulaDoesNotRequireProject(ref assertions);
            TestTrimmedIdentityFormulaDoesNotRequireProject(ref assertions);
            TestIdentityFormulaDoesNotRequireMembership(ref assertions);
            TestCustomFormulaRequiresProjectContext(ref assertions);
            TestMissingProjectContextUsesDedicatedError(ref assertions);
            TestExplicitCustomFormulaPasses(ref assertions);
            TestMissingCustomFormulaUsesReferenceError(ref assertions);
            TestMixedFormulasRequireProjectContext(ref assertions);
            TestCustomFormulaCompatibilityRemainsActive(ref assertions);
            TestIdentityPathDoesNotUseFolderInference(ref assertions);
            Console.WriteLine(AscetJsonContract.Serialize(new Dictionary<string, object>
            {
                { "passed", true },
                { "runtimeProtocolAssertions", assertions },
                { "metrics", new Dictionary<string, object>
                    {
                        { "identityCases", 4 },
                        { "customFormulaCases", 5 },
                        { "liveWrite", false }
                    }
                }
            }));
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void TestBlankFormulaDoesNotRequireProject(ref int assertions)
    {
        AscetElementFormulaRules.ValidateForProjectContext(
            ComponentPath(),
            SpecWithFormula(" ", "udisc"),
            new List<string>(),
            new List<AscetExistingElementState>());
        assertions++;
    }

    private static void TestIdentityFormulaDoesNotRequireProject(ref int assertions)
    {
        AscetElementFormulaRules.ValidateForProjectContext(
            ComponentPath(),
            SpecWithFormula("ident", "udisc"),
            new List<string>(),
            new List<AscetExistingElementState>());
        assertions++;
    }

    private static void TestTrimmedIdentityFormulaDoesNotRequireProject(ref int assertions)
    {
        AscetElementFormulaRules.ValidateForProjectContext(
            ComponentPath(),
            SpecWithFormula(" IDENT ", "udisc"),
            new List<string>(),
            new List<AscetExistingElementState>());
        assertions++;
    }

    private static void TestIdentityFormulaDoesNotRequireMembership(ref int assertions)
    {
        AscetElementFormulaRules.ValidateForProjectContext(
            ComponentPath(),
            SpecWithFormula("ident", "udisc"),
            new List<string>(),
            new List<AscetExistingElementState>(),
            "Fixture\\FormulaContext");
        assertions++;
    }

    private static void TestCustomFormulaRequiresProjectContext(ref int assertions)
    {
        AscetReadException exception = Capture(() => AscetElementFormulaRules.ValidateForProjectContext(
            ComponentPath(),
            SpecWithFormula("custom_formula", "cont"),
            new List<string> { "custom_formula" },
            new List<AscetExistingElementState>()));
        AssertEqual("project_context_required", exception.Code, "custom formula without project context", ref assertions);
    }

    private static void TestMissingProjectContextUsesDedicatedError(ref int assertions)
    {
        AscetReadException exception = Capture(() => AscetElementFormulaRules.ValidateForProjectContext(
            ComponentPath(),
            SpecWithFormula("linear", "cont"),
            new List<string> { "linear" },
            new List<AscetExistingElementState>()));
        AssertEqual("project_context_required", exception.Code, "missing explicit project context", ref assertions);
    }

    private static void TestExplicitCustomFormulaPasses(ref int assertions)
    {
        AscetElementFormulaRules.ValidateForProjectContext(
            ComponentPath(),
            SpecWithFormula("custom_formula", "cont"),
            new List<string> { "custom_formula" },
            new List<AscetExistingElementState>(),
            "Fixture\\FormulaContext");
        assertions++;
    }
    private static void TestMissingCustomFormulaUsesReferenceError(ref int assertions)
    {
        AscetReadException exception = Capture(() => AscetElementFormulaRules.ValidateForProjectContext(
            ComponentPath(),
            SpecWithFormula("missing_formula", "cont"),
            new List<string>(),
            new List<AscetExistingElementState>(),
            "Fixture\\FormulaContext"));
        AssertEqual("invalid_formula_reference", exception.Code, "missing custom formula in project", ref assertions);
    }

    private static void TestMixedFormulasRequireProjectContext(ref int assertions)
    {
        AscetReadException exception = Capture(() => AscetElementFormulaRules.ValidateForProjectContext(
            ComponentPath(),
            new AscetElementSpecDocument
            {
                Elements = new List<AscetElementSpec>
                {
                    Element("Identity", "ident", "udisc"),
                    Element("Custom", "custom_formula", "cont")
                }
            },
            new List<string> { "custom_formula" },
            null));
        AssertEqual("project_context_required", exception.Code, "mixed identity/custom formulas", ref assertions);
    }

    private static void TestCustomFormulaCompatibilityRemainsActive(ref int assertions)
    {
        AscetReadException exception = Capture(() => AscetElementFormulaRules.ValidateForProjectContext(
            ComponentPath(),
            SpecWithFormula("custom_formula", "udisc"),
            new List<string> { "custom_formula" },
            new List<AscetExistingElementState>(),
            "Fixture\\FormulaContext"));
        AssertEqual("invalid_formula_for_element", exception.Code, "custom formula compatibility", ref assertions);
    }

    private static void TestIdentityPathDoesNotUseFolderInference(ref int assertions)
    {
        string root = Environment.GetEnvironmentVariable("ASCET_REPO_ROOT");
        if (String.IsNullOrWhiteSpace(root))
        {
            root = Directory.GetCurrentDirectory();
        }

        string source = File.ReadAllText(Path.Combine(root, "ascetcli", "src", "AscetCopilot", "AscetElementSync.cs"));
        AssertTrue(source.IndexOf("ContainsProjectFormulaReferences", StringComparison.Ordinal) >= 0,
            "formula validation must distinguish Project formulas from built-in ident.", ref assertions);
        AssertTrue(source.IndexOf("if (!ContainsFormulaReferences(spec))", StringComparison.Ordinal) < 0,
            "formula validation must not use broad formula-presence routing.", ref assertions);
        AssertTrue(source.IndexOf("project_context_required", StringComparison.Ordinal) >= 0,
            "Bridge must expose the dedicated missing project-context error.", ref assertions);
    }

    private static AscetElementSpecDocument SpecWithFormula(string formula, string modelType)
    {
        return new AscetElementSpecDocument
        {
            Elements = new List<AscetElementSpec> { Element("Value", formula, modelType) }
        };
    }

    private static AscetElementSpec Element(string name, string formula, string modelType)
    {
        return new AscetElementSpec
        {
            Name = name,
            ModelType = modelType,
            Impl = new AscetElementImplSpec
            {
                Formula = formula,
                ValueType = "uint8"
            }
        };
    }

    private static string ComponentPath()
    {
        return "PI_EDIT_TEST_READWRITE_004\\Core\\ClassUnderTest";
    }

    private static AscetReadException Capture(Action action)
    {
        try
        {
            action();
        }
        catch (AscetReadException exception)
        {
            return exception;
        }

        throw new Exception("Expected AscetReadException.");
    }

    private static void AssertTrue(bool condition, string message, ref int assertions)
    {
        if (!condition)
        {
            throw new Exception(message);
        }
        assertions++;
    }

    private static void AssertEqual(string expected, string actual, string message, ref int assertions)
    {
        AssertTrue(String.Equals(expected, actual, StringComparison.Ordinal),
            message + ": expected '" + expected + "', actual '" + actual + "'.", ref assertions);
    }
}
