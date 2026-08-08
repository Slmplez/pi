using System;
using System.Collections.Generic;

class AscetElementWriteOptimizationOutputTest
{
    static int Main()
    {
        ExpectUnknownField("{\"elements\":[],\"extra\":true}", "root.extra", 1);
        ExpectUnknownField("{\"elements\":[{\"name\":\"P\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"local\",\"extra\":true}]}", "elements[0].extra", 2);
        ExpectUnknownField("{\"elements\":[{\"name\":\"P\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"local\",\"data\":{\"value\":1,\"extra\":true}}]}", "elements[0].data.extra", 3);
        ExpectUnknownField("{\"elements\":[{\"name\":\"P\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"local\",\"impl\":{\"valueType\":\"sint16\",\"extra\":true}}]}", "elements[0].impl.extra", 4);
        ExpectUnknownField("{\"elements\":[{\"name\":\"P\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"local\",\"physicalRange\":{\"min\":0,\"max\":1,\"extra\":true}}]}", "elements[0].physicalRange.extra", 5);
        ExpectImportedLogicalRejectsLocalData();
        ExpectPlannerAllowsRecoverableDefaultCreation();
        return 0;
    }

    private static void ExpectUnknownField(string json, string expectedPath, int exitCode)
    {
        try
        {
            AscetElementSpecDocumentParser.ParseJson(json);
            Console.Error.WriteLine("expected unknown field failure for " + expectedPath);
            Environment.Exit(exitCode);
        }
        catch (AscetReadException ex)
        {
            if (!String.Equals(ex.Code, "unknown_element_spec_field", StringComparison.Ordinal) ||
                ex.Message.IndexOf(expectedPath, StringComparison.Ordinal) < 0)
            {
                Console.Error.WriteLine("unexpected unknown field error: " + ex.Code + " " + ex.Message);
                Environment.Exit(exitCode);
            }
        }
    }

    private static void ExpectImportedLogicalRejectsLocalData()
    {
        try
        {
            AscetElementSpecDocumentParser.ParseJson(
                "{\"elements\":[{\"name\":\"P_ImportedLog\",\"kind\":\"parameter\",\"modelType\":\"log\",\"scope\":\"imported\",\"data\":{\"value\":true}}]}");
            throw new Exception("Imported logical Parameter with local data should be rejected.");
        }
        catch (AscetReadException ex)
        {
            if (!String.Equals(ex.Code, "invalid_element_spec", StringComparison.Ordinal) ||
                ex.Message.IndexOf("Imported parameter", StringComparison.Ordinal) < 0)
            {
                throw;
            }
        }
    }

    private static void ExpectPlannerAllowsRecoverableDefaultCreation()
    {
        ComponentElementSyncPlanner planner = new ComponentElementSyncPlanner();
        AscetElementSpecDocument explicitImplementation = AscetElementSpecDocumentParser.ParseJson(
            "{\"elements\":[{\"name\":\"P_Local\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"local\",\"data\":{\"value\":1},\"impl\":{\"valueType\":\"sint16\"}}]}");
        AscetElementSyncPlan implementationPlan = planner.Plan(
            explicitImplementation,
            new List<AscetExistingElementState>(),
            false,
            false);
        if (implementationPlan.ElementsToCreate == null || implementationPlan.ElementsToCreate.Count != 1)
        {
            throw new Exception("Explicit implementation should be planned while default implementation creation is recoverable.");
        }

        AscetElementSpecDocument imported = AscetElementSpecDocumentParser.ParseJson(
            "{\"elements\":[{\"name\":\"P_Imported\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"imported\"}]}");
        AscetElementSyncPlan importedPlan = planner.Plan(
            imported,
            new List<AscetExistingElementState>(),
            false,
            false);
        if (importedPlan.ElementsToCreate == null || importedPlan.ElementsToCreate.Count != 1)
        {
            throw new Exception("Imported Parameter should not require a local default Data or Implementation configuration.");
        }
    }
}
