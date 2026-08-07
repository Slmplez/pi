using System;
using System.Collections.Generic;
using System.IO;

class AscetElementDependencyPlanOutputTest
{
    static int Main()
    {
        string dir = Path.Combine(Path.GetTempPath(), "ascet-dependency-plan-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        string main = Path.Combine(dir, "Probe.main.amd");
        File.WriteAllText(main,
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
            "<ComponentMain><Component name=\"Probe\"><Elements>" +
            "<Element name=\"p\"><ElementAttributes><ScalarType><ScalarAttributes kind=\"parameter\" scope=\"local\" dependent=\"false\" /></ScalarType></ElementAttributes></Element>" +
            "<Element name=\"d\"><ElementAttributes><ScalarType><ScalarAttributes kind=\"parameter\" scope=\"local\" dependent=\"true\" /></ScalarType></ElementAttributes></Element>" +
            "<Element name=\"imp\"><ElementAttributes><ScalarType><ScalarAttributes kind=\"parameter\" scope=\"imported\" dependent=\"false\" /></ScalarType></ElementAttributes></Element>" +
            "<Element name=\"ct\"><ElementAttributes><ScalarType><ScalarAttributes kind=\"dependent\" scope=\"local\" dependent=\"false\" /></ScalarType></ElementAttributes></Element>" +
            "<Element name=\"v\"><ElementAttributes><ScalarType><ScalarAttributes kind=\"variable\" scope=\"local\" dependent=\"false\" /></ScalarType></ElementAttributes></Element>" +
            "<Element name=\"arr\"><ElementAttributes><ArrayType /></ElementAttributes></Element>" +
            "</Elements></Component></ComponentMain>");

        AscetElementDependencyCandidate p = AscetElementDependencyXml.FindCandidate(main, "p");
        AscetElementDependencyCandidate d = AscetElementDependencyXml.FindCandidate(main, "d");
        AscetElementDependencyCandidate imp = AscetElementDependencyXml.FindCandidate(main, "imp");
        AscetElementDependencyCandidate ct = AscetElementDependencyXml.FindCandidate(main, "ct");
        AscetElementDependencyCandidate v = AscetElementDependencyXml.FindCandidate(main, "v");
        AscetElementDependencyCandidate arr = AscetElementDependencyXml.FindCandidate(main, "arr");

        if (p == null ||
            !String.Equals(p.Schema, "scalar-parameter-dependent-flag", StringComparison.Ordinal) ||
            !String.Equals(p.BeforeDependency, "independent", StringComparison.Ordinal) ||
            !p.Supported ||
            !String.Equals(p.UnsupportedReason, String.Empty, StringComparison.Ordinal))
        {
            Console.Error.WriteLine("unexpected local independent parameter candidate");
            return 1;
        }

        if (d == null || !d.Supported || !String.Equals(d.BeforeDependency, "dependent", StringComparison.Ordinal))
        {
            Console.Error.WriteLine("unexpected local dependent flag candidate");
            return 2;
        }

        if (imp == null || imp.Supported || !String.Equals(imp.UnsupportedReason, "imported_parameter", StringComparison.Ordinal))
        {
            Console.Error.WriteLine("unexpected imported parameter candidate");
            return 3;
        }

        if (ct == null || ct.Supported || !String.Equals(ct.Schema, "scalar-dependent-kind", StringComparison.Ordinal) || !String.Equals(ct.UnsupportedReason, "dependent_kind_not_write_allowlisted", StringComparison.Ordinal))
        {
            Console.Error.WriteLine("unexpected dependent-kind candidate");
            return 4;
        }

        if (v == null || v.Supported || !String.Equals(v.UnsupportedReason, "kind_not_parameter", StringComparison.Ordinal))
        {
            Console.Error.WriteLine("unexpected variable candidate");
            return 5;
        }

        if (arr == null || arr.Supported || !String.Equals(arr.UnsupportedReason, "no_scalar_attributes", StringComparison.Ordinal))
        {
            Console.Error.WriteLine("unexpected array candidate");
            return 6;
        }

        IList<AscetElementDependencyCandidate> all = AscetElementDependencyXml.FindCandidates(main, String.Empty);
        if (all == null || all.Count != 6)
        {
            Console.Error.WriteLine("unexpected candidate count: " + (all == null ? -1 : all.Count));
            return 7;
        }

        Directory.Delete(dir, true);
        return 0;
    }
}
