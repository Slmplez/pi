using System;
using System.Collections.Generic;

class AscetDependentDataValuePolicyOutputTest
{
    static int Main()
    {
        AscetElementSpecDocument spec = new AscetElementSpecDocument
        {
            Elements = new List<AscetElementSpec>
            {
                new AscetElementSpec { Name = "P_Independent", Data = new AscetElementDataSpec { Value = true } },
                new AscetElementSpec { Name = "P_Dependent", Data = new AscetElementDataSpec { Value = false } },
                new AscetElementSpec { Name = "P_Imported", Data = new AscetElementDataSpec { Value = 1 } },
                new AscetElementSpec { Name = "P_New", Data = new AscetElementDataSpec { Value = 2 } }
            }
        };

        List<AscetExistingElementState> existing = new List<AscetExistingElementState>
        {
            new AscetExistingElementState { Name = "P_Independent", Kind = AscetElementSpecKind.Parameter, Scope = "local" },
            new AscetExistingElementState { Name = "P_Dependent", Kind = AscetElementSpecKind.Parameter, Scope = "local" },
            new AscetExistingElementState { Name = "P_Imported", Kind = AscetElementSpecKind.Parameter, Scope = "imported" }
        };

        IList<string> guarded = AscetDependentDataValuePolicy.GetExistingLocalParameterDataValueNames(spec, existing);
        if (guarded.Count != 2 || !guarded.Contains("P_Independent") || !guarded.Contains("P_Dependent"))
        {
            Console.Error.WriteLine("expected only existing local Parameters with data.value to require a dependency-state check");
            return 1;
        }

        Dictionary<string, bool?> dependencyByName = new Dictionary<string, bool?>
        {
            { "P_Independent", false },
            { "P_Dependent", true }
        };
        try
        {
            AscetDependentDataValuePolicy.EnsureExistingLocalParameterDataValuesAreIndependent(guarded, dependencyByName);
            Console.Error.WriteLine("dependent Parameter data.value was accepted");
            return 2;
        }
        catch (AscetReadException ex)
        {
            if (!String.Equals(ex.Code, "dependent_data_value_not_allowed", StringComparison.Ordinal))
            {
                Console.Error.WriteLine("unexpected dependent Parameter rejection: " + ex.Code);
                return 3;
            }
        }

        dependencyByName["P_Dependent"] = false;
        AscetDependentDataValuePolicy.EnsureExistingLocalParameterDataValuesAreIndependent(guarded, dependencyByName);

        dependencyByName.Remove("P_Dependent");
        try
        {
            AscetDependentDataValuePolicy.EnsureExistingLocalParameterDataValuesAreIndependent(guarded, dependencyByName);
            Console.Error.WriteLine("unverified dependency state was accepted");
            return 4;
        }
        catch (AscetReadException ex)
        {
            if (!String.Equals(ex.Code, "dependency_state_unverified", StringComparison.Ordinal))
            {
                Console.Error.WriteLine("unexpected unverified dependency state rejection: " + ex.Code);
                return 5;
            }
        }

        return 0;
    }
}
