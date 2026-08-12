using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public static class AscetParameterDependencyChainExecuteOutputTest
{
    public static int Main()
    {
        string directory = Path.Combine(Path.GetTempPath(), "ascet-chain-parser-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        try
        {
            string path = Path.Combine(directory, "request.json");
            File.WriteAllText(path, RequestJson(), Encoding.UTF8);
            AscetParameterDependencyChainExecuteRequest request = AscetParameterDependencyChainExecuteParser.ParseFile(path);
            AssertEqual("F\\Provider", request.Provider.ComponentPath, "provider path");
            AssertEqual("P_Threshold", request.Provider.Spec.Elements[0].Name, "provider name");
            AssertEqual("P_Threshold", request.Consumer.Spec.Elements[0].Name, "imported name");
            AssertEqual("C_Threshold", request.Local.Spec.Elements[0].Name, "local name");
            AssertEqual("P_Threshold", request.Dependency.Formals[0], "formal");
            AssertEqual("parameter", request.Dependency.Mappings["P_Threshold"].Kind, "mapping kind");
            OperationDescriptor descriptor = OperationRegistry.ResolveOrThrow("configure_parameter_dependency_chain_execute");
            AssertTrue(descriptor.MutatesDatabase, "chain route must mutate");
            AssertTrue(!descriptor.HostEligible && !descriptor.SupportsBatch, "chain route must be one-shot and non-batch");
            TestEditableGateFailureIsBlockedBeforeMutation();
            Console.WriteLine("AscetParameterDependencyChainExecuteOutputTest passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
        finally
        {
            if (Directory.Exists(directory)) Directory.Delete(directory, true);
        }
    }

    private static void TestEditableGateFailureIsBlockedBeforeMutation()
    {
        Dictionary<string, object> result = AscetParameterDependencyChainExecuteService.FailureBeforeMutation(
            "chain-test",
            new AscetReadException(
                "editable_write_gate_blocked",
                "configure_parameter_dependency_chain_execute",
                "Component 'F\\Consumer' is not editable."),
            new List<Dictionary<string, object>>());

        AssertEqual("blocked", Convert.ToString(result["status"]), "editable gate status");
        AssertTrue(!Convert.ToBoolean(result["writesPerformed"]), "editable gate failure must report zero writes");
        AssertTrue(!Convert.ToBoolean(result["mutationStarted"]), "editable gate failure must occur before mutation");

        Dictionary<string, object> error = result["error"] as Dictionary<string, object>;
        AssertTrue(error != null, "editable gate failure must include an error payload");
        AssertEqual("editable_write_gate_blocked", Convert.ToString(error["code"]), "editable gate error code");

        Dictionary<string, object> rollback = result["rollback"] as Dictionary<string, object>;
        AssertTrue(rollback != null, "editable gate failure must include rollback metadata");
        AssertTrue(!Convert.ToBoolean(rollback["required"]), "editable gate failure must not require compensation");
        AssertEqual("not_required", Convert.ToString(rollback["status"]), "editable gate rollback status");
    }
    private static string RequestJson()
    {
        return "{" +
            "\"provider\":{\"componentPath\":\"F\\\\Provider\",\"spec\":{\"elements\":[{\"name\":\"P_Threshold\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"exported\",\"unit\":\"\",\"comment\":\"Provider\",\"calibration\":false}]}}," +
            "\"consumer\":{\"componentPath\":\"F\\\\Consumer\",\"spec\":{\"elements\":[{\"name\":\"P_Threshold\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"imported\"}]}}," +
            "\"local\":{\"componentPath\":\"F\\\\Consumer\",\"spec\":{\"elements\":[{\"name\":\"C_Threshold\",\"kind\":\"parameter\",\"modelType\":\"cont\",\"scope\":\"local\",\"unit\":\"\",\"comment\":\"Local\",\"calibration\":false}]}}," +
            "\"dependency\":{\"targetPath\":\"F\\\\Consumer\",\"elementName\":\"C_Threshold\",\"formula\":\"P_Threshold\",\"formals\":[\"P_Threshold\"],\"bindingPolicy\":\"explicit\",\"mappings\":{\"P_Threshold\":{\"kind\":\"parameter\",\"name\":\"P_Threshold\"}},\"variantPolicy\":\"default\"}" +
            "}";
    }

    private static void AssertTrue(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
    }

    private static void AssertEqual(string expected, string actual, string message)
    {
        if (!String.Equals(expected, actual, StringComparison.Ordinal))
            throw new Exception(message + " expected '" + expected + "' but got '" + actual + "'.");
    }
}
