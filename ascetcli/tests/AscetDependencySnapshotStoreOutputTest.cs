using System;
using System.Collections.Generic;
using System.IO;

class AscetDependencySnapshotStoreOutputTest
{
    static int Main()
    {
        string root = Path.Combine(Path.GetTempPath(), "ascet-dependency-snapshot-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        string previous = Environment.GetEnvironmentVariable("ASCET_DEPENDENCY_SNAPSHOT_ROOT");
        Environment.SetEnvironmentVariable("ASCET_DEPENDENCY_SNAPSHOT_ROOT", root);
        try
        {
            List<AscetElementDependencyDataVariantState> states = new List<AscetElementDependencyDataVariantState>
            {
                new AscetElementDependencyDataVariantState
                {
                    VariantName = "default",
                    HasScalarType = true,
                    ScalarTypeXml = "<ScalarType><Numeric value=\"4.5\" /></ScalarType>"
                },
                new AscetElementDependencyDataVariantState
                {
                    VariantName = "sport",
                    HasScalarType = true,
                    ScalarTypeXml = "<ScalarType><Numeric value=\"9.0\" /></ScalarType>"
                }
            };

            AscetDependencySnapshotRecord saved = AscetDependencySnapshotStore.Save("DEMO\\Controller", "P_Effective", states);
            AscetDependencySnapshotRecord loaded = AscetDependencySnapshotStore.Load("DEMO\\Controller", "P_Effective");
            if (!File.Exists(saved.SnapshotPath) ||
                !String.Equals(saved.SnapshotPath, loaded.SnapshotPath, StringComparison.OrdinalIgnoreCase) ||
                String.IsNullOrWhiteSpace(saved.SnapshotHash) ||
                !String.Equals(saved.SnapshotHash, loaded.SnapshotHash, StringComparison.Ordinal) ||
                loaded.ScalarTypeXmlByVariant.Count != 2 ||
                loaded.ScalarTypeXmlByVariant["sport"].IndexOf("9.0", StringComparison.Ordinal) < 0)
            {
                Console.Error.WriteLine("dependency snapshot persistence mismatch");
                return 1;
            }

            string beforeHash = AscetDependencySnapshotStore.ComputeStateHash(states);
            states[1].ScalarTypeXml = "<ScalarType><Numeric value=\"10.0\" /></ScalarType>";
            if (String.Equals(beforeHash, AscetDependencySnapshotStore.ComputeStateHash(states), StringComparison.Ordinal))
            {
                Console.Error.WriteLine("dependency snapshot state hash did not change");
                return 2;
            }

            AscetDependencySnapshotStore.Delete("DEMO\\Controller", "P_Effective");
            try
            {
                AscetDependencySnapshotStore.Load("DEMO\\Controller", "P_Effective");
                Console.Error.WriteLine("deleted dependency snapshot remained readable");
                return 3;
            }
            catch (AscetReadException ex)
            {
                if (!String.Equals(ex.Code, "dependency_snapshot_not_found", StringComparison.Ordinal))
                {
                    Console.Error.WriteLine("unexpected deleted snapshot error: " + ex.Code);
                    return 4;
                }
            }
            return 0;
        }
        finally
        {
            Environment.SetEnvironmentVariable("ASCET_DEPENDENCY_SNAPSHOT_ROOT", previous);
            if (Directory.Exists(root))
            {
                Directory.Delete(root, true);
            }
        }
    }
}
