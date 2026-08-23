using System;
using System.Globalization;
using System.Collections.Generic;
using System.IO;

public static class AscetBridgeAdapterSmoke
{
    public static int Main()
    {
        string originalDirectory = Environment.CurrentDirectory;
        CultureInfo originalCulture = CultureInfo.CurrentCulture;
        CultureInfo originalUiCulture = CultureInfo.CurrentUICulture;
        TextReader originalIn = Console.In;
        TextWriter originalOut = Console.Out;
        TextWriter originalError = Console.Error;
        try
        {
            LegacyOperationInvocationResult result = InProcessLegacyOperationAdapter.Invoke(ChangeAmbientState, new string[] { "alpha" });
            AssertEqual(7, result.ExitCode, "Adapter must preserve legacy exit code.");
            AssertContains(result.Stdout, "stdout:alpha", "Adapter must capture stdout.");
            AssertContains(result.Stderr, "stderr:alpha", "Adapter must capture stderr.");
            AssertAmbientRestored(originalDirectory, originalCulture, originalUiCulture, originalIn, originalOut, originalError);

            AssertRejectedWriteArguments("create_folder", new string[] { "--json" });
            AssertRejectedWriteArguments("apply_project_formula", new string[] { @"\Project" });
            AssertRejectedWriteArguments("delete_component", new string[] { "--json" });
            AssertRejectedWriteArguments("delete_folder", new string[] { "--json" });
            AssertRejectedWriteArguments("delete_method", new string[] { @"\Folder\Component" });
            AssertRejectedWriteArguments("set_class_method_code", new string[] { @"\Folder\Class", "Method" });
            AssertRejectedWriteArguments("create_method", new string[] { @"\Folder\Component", "--json" });
            AssertRejectedWriteArguments("set_module_code", new string[] { @"\Folder\Module", "set-method", "Method", "--json" });
            AssertRejectedWriteArguments("set_state_machine_code", new string[] { @"\Folder\StateMachine", "bind-state-entry-action-method", "State", "--json" });
            try
            {
                BatchCommand.ReadBatchInput(new StringReader(new String('x', BatchCommand.MaxBatchInputCharacters + 1)));
                throw new Exception("Oversized batch input should be rejected.");
            }
            catch (AscetReadException ex)
            {
                AssertEqual("request_too_large", ex.Code, "Oversized batch input should report request_too_large.");
            }

            Dictionary<string, object> directState = new Dictionary<string, object>(StringComparer.Ordinal);
            directState["changed"] = true;
            directState["saveAttempted"] = true;
            directState["saveSucceeded"] = true;
            directState["verified"] = true;
            Dictionary<string, object> canonicalSuccess = AscetCanonicalWriteResult.NormalizeSuccess(
                directState,
                true,
                true,
                true);
            Dictionary<string, object> successEnvelope = AscetCliEnvelope.Success(
                "exec",
                "set_method_code",
                canonicalSuccess,
                true);
            Dictionary<string, object> preservedSuccess = successEnvelope["result"] as Dictionary<string, object>;
            AssertTrue(preservedSuccess != null, "Bridge success envelope must retain the canonical result at result.");
            AssertEqual("succeeded", Convert.ToString(preservedSuccess["outcome"]), "Bridge success result must expose outcome at the canonical level.");
            AssertEqual("applied", Convert.ToString(preservedSuccess["mutationStatus"]), "Bridge success result must expose mutationStatus at the canonical level.");
            AssertTrue(!preservedSuccess.ContainsKey("payload"), "Bridge success result must not wrap canonical evidence in result.payload.");
            Dictionary<string, object> partialState = new Dictionary<string, object>(StringComparer.Ordinal);
            partialState["mutationStatus"] = "partial_failure";
            partialState["nativeScmOperationCount"] = 2;
            partialState["recovery"] = new Dictionary<string, object>(StringComparer.Ordinal)
            {
                { "required", true },
                { "actions", new string[] { "Inspect the retained SCM reservation before retrying." } }
            };
            Dictionary<string, object> canonicalFailure = AscetCanonicalWriteResult.NormalizeFailure(
                partialState,
                true,
                "component_editable_set_failed",
                "CreateEdition failed after ReserveItem returned.");
            Dictionary<string, object> envelopeError = new Dictionary<string, object>(StringComparer.Ordinal);
            envelopeError["code"] = "component_editable_set_failed";
            envelopeError["message"] = "CreateEdition failed after ReserveItem returned.";
            Dictionary<string, object> failureEnvelope = AscetCliEnvelope.Error(
                envelopeError,
                "exec",
                "component_editable_set",
                canonicalFailure,
                true);
            Dictionary<string, object> preservedResult = failureEnvelope["result"] as Dictionary<string, object>;
            AssertTrue(preservedResult != null, "Bridge failure envelope must retain canonical mutation result evidence.");
            AssertEqual("partial_failure", Convert.ToString(preservedResult["mutationStatus"]), "Bridge failure result must preserve partial mutation status.");
            AssertTrue(InProcessLegacyOperationAdapter.ReadMutationStarted(failureEnvelope) == true, "Adapter must infer mutationStarted=true from preserved native SCM evidence.");
            Dictionary<string, object> preservedRecovery = preservedResult["recovery"] as Dictionary<string, object>;
            AssertTrue(preservedRecovery != null && Convert.ToBoolean(preservedRecovery["required"]), "Bridge failure result must preserve required recovery evidence.");

            LegacyOperationInvocationResult failure = InProcessLegacyOperationAdapter.Invoke(ThrowingEntryPoint, new string[0]);
            AssertEqual(1, failure.ExitCode, "Adapter must convert exceptions to a failed invocation.");
            AssertContains(failure.Stderr, "adapter-test-failure", "Adapter must capture exception details.");
            AssertAmbientRestored(originalDirectory, originalCulture, originalUiCulture, originalIn, originalOut, originalError);

            Console.WriteLine("AscetBridgeAdapterSmoke passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void AssertRejectedWriteArguments(string operation, string[] args)
    {
        try
        {
            InProcessLegacyOperationAdapter.ValidateInvocationArguments(operation, args);
            throw new Exception(operation + " unsafe write arguments should be rejected before invocation.");
        }
        catch (AscetReadException ex)
        {
            AssertEqual("invalid_arguments", ex.Code, operation + " should report invalid_arguments.");
        }
    }

    private static int ChangeAmbientState(string[] args)
    {
        Console.WriteLine("stdout:" + args[0]);
        Console.Error.WriteLine("stderr:" + args[0]);
        Console.SetIn(new StringReader("changed"));
        CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("fr-FR");
        CultureInfo.CurrentUICulture = CultureInfo.GetCultureInfo("fr-FR");
        Environment.CurrentDirectory = Path.GetTempPath();
        return 7;
    }

    private static int ThrowingEntryPoint(string[] args)
    {
        Console.SetIn(new StringReader("changed-before-throw"));
        CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("de-DE");
        CultureInfo.CurrentUICulture = CultureInfo.GetCultureInfo("de-DE");
        Environment.CurrentDirectory = Path.GetTempPath();
        throw new InvalidOperationException("adapter-test-failure");
    }

    private static void AssertAmbientRestored(
        string directory,
        CultureInfo culture,
        CultureInfo uiCulture,
        TextReader input,
        TextWriter output,
        TextWriter error)
    {
        AssertEqual(directory, Environment.CurrentDirectory, "Adapter must restore working directory.");
        AssertEqual(culture.Name, CultureInfo.CurrentCulture.Name, "Adapter must restore culture.");
        AssertEqual(uiCulture.Name, CultureInfo.CurrentUICulture.Name, "Adapter must restore UI culture.");
        if (!Object.ReferenceEquals(input, Console.In))
        {
            throw new Exception("Adapter must restore Console.In.");
        }
        if (!Object.ReferenceEquals(output, Console.Out))
        {
            throw new Exception("Adapter must restore Console.Out.");
        }
        if (!Object.ReferenceEquals(error, Console.Error))
        {
            throw new Exception("Adapter must restore Console.Error.");
        }
    }

    private static void AssertTrue(bool condition, string message)
    {
        if (!condition)
        {
            throw new Exception(message);
        }
    }

    private static void AssertEqual(int expected, int actual, string message)
    {
        if (expected != actual)
        {
            throw new Exception(message + " Expected " + expected + " but got " + actual + ".");
        }
    }

    private static void AssertEqual(string expected, string actual, string message)
    {
        if (!String.Equals(expected, actual, StringComparison.Ordinal))
        {
            throw new Exception(message + " Expected '" + expected + "' but got '" + actual + "'.");
        }
    }

    private static void AssertContains(string value, string expected, string message)
    {
        if ((value ?? String.Empty).IndexOf(expected, StringComparison.Ordinal) < 0)
        {
            throw new Exception(message + " Missing '" + expected + "'.");
        }
    }
}
