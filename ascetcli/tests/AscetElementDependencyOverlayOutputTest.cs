using System;
using System.Collections.Generic;
using System.IO;
using System.Xml;

public static class AscetElementDependencyOverlayOutputTest
{
    public static int Main()
    {
        string directory = Path.Combine(Path.GetTempPath(), "ascet-dependency-overlay-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        try
        {
            string main = Path.Combine(directory, "Consumer.main.amd");
            string data = Path.Combine(directory, "Consumer.data.amd");
            string importedSpec = Path.Combine(directory, "imported.json");
            string localSpec = Path.Combine(directory, "local.json");
            File.WriteAllText(main,
                "<ComponentMain><Component name=\"Consumer\"><Elements>" +
                "<Element name=\"C_Gain\" OID=\"constantOid\"><ElementAttributes><ScalarType><ScalarAttributes kind=\"constant\" scope=\"local\" /></ScalarType></ElementAttributes></Element>" +
                "</Elements></Component></ComponentMain>");
            File.WriteAllText(data, "<ComponentData />");
            File.WriteAllText(importedSpec, "{\"elements\":[{\"name\":\"P_Input\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"imported\"}]}");
            File.WriteAllText(localSpec, "{\"elements\":[{\"name\":\"P_Result\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"local\"}]}");

            AscetElementDependencyOverlayResult overlay = AscetElementDependencyOverlay.Apply(
                main,
                data,
                new List<string> { importedSpec, localSpec });
            Assert(overlay.SpecHashes.Count == 2, "overlay must fingerprint both pending specs");
            Assert(overlay.ElementOids.ContainsKey("P_Input") && overlay.ElementOids.ContainsKey("P_Result"), "overlay must expose deterministic element OIDs");
            Assert(AscetElementDependencyXml.FindCandidate(main, "P_Input") != null, "imported parameter must exist in temporary main AMD");
            Assert(AscetElementDependencyXml.FindCandidate(main, "P_Result") != null, "local parameter must exist in temporary main AMD");
            Assert(File.ReadAllText(data).IndexOf("elementName=\"P_Input\"", StringComparison.Ordinal) < 0, "imported parameter must not receive local data");
            Assert(AscetElementDependencyXml.ReadDataVariantStates(data, "P_Result").Count == 1, "local parameter must receive a default DataVariant");

            string repeatedMain = Path.Combine(directory, "Consumer-repeat.main.amd");
            string repeatedData = Path.Combine(directory, "Consumer-repeat.data.amd");
            File.Copy(main, repeatedMain);
            File.Copy(data, repeatedData);

            Dictionary<string, string> mappings = new Dictionary<string, string>(StringComparer.Ordinal);
            mappings["P_Input"] = "P_Input";
            mappings["C_Gain"] = "C_Gain";
            AscetElementDependencyXml.SetMainAmdDependencyAndFormula(
                main,
                data,
                "P_Result",
                true,
                "P_Input + C_Gain",
                mappings,
                null,
                false,
                "default",
                null,
                String.Empty,
                null);
            AscetElementDependencyXml.SetMainAmdDependencyAndFormula(
                repeatedMain,
                repeatedData,
                "P_Result",
                true,
                "P_Input + C_Gain",
                mappings,
                null,
                false,
                "default",
                null,
                String.Empty,
                null);
            AscetElementDependencyXml.VerifyDataVariantMappings(main, data, "P_Result", mappings, "default", null, null);
            Assert(String.Equals(ReadFormalOid(main, "P_Input"), ReadFormalOid(repeatedMain, "P_Input"), StringComparison.Ordinal), "equivalent dry-runs must generate the same formal OID");
            AscetElementDependencyXmlState state = AscetElementDependencyXml.ReadMainAmd(main, "P_Result");
            Assert(state != null && state.IsDependent, "temporary AMD mutation must produce a dependent Parameter");
            Assert(String.Equals(state.FormulaCode, "P_Input + C_Gain", StringComparison.Ordinal), "temporary AMD mutation must preserve formula");
            Console.WriteLine("ascet-element-dependency-overlay-output: ok");
            return 0;
        }
        finally
        {
            try { Directory.Delete(directory, true); } catch { }
        }
    }

    private static string ReadFormalOid(string mainAmdPath, string formalName)
    {
        XmlDocument document = new XmlDocument();
        document.Load(mainAmdPath);
        XmlNodeList formals = document.GetElementsByTagName("Formal");
        for (int i = 0; i < formals.Count; i++)
        {
            XmlElement formal = formals[i] as XmlElement;
            if (formal != null && String.Equals(formal.GetAttribute("name"), formalName, StringComparison.Ordinal))
            {
                return formal.GetAttribute("OID") ?? String.Empty;
            }
        }
        return String.Empty;
    }

    private static void Assert(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }
}