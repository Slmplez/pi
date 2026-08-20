using System;
using System.Collections.Generic;
using System.IO;
using System.Web.Script.Serialization;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

namespace de.etas.cebra.toolAPI.Common
{
    public class DataBaseItem
    {
    }

    public class Component : DataBaseItem
    {
        private bool isVersion;
        private bool isEdition;

        public Component(bool isVersion, bool isEdition)
        {
            this.isVersion = isVersion;
            this.isEdition = isEdition;
        }

        public bool IsVersion()
        {
            return isVersion;
        }

        public bool IsEdition()
        {
            return isEdition;
        }

        public void MakeEdition()
        {
            isVersion = false;
            isEdition = true;
        }
    }
}

namespace de.etas.cebra.toolAPI.Ascet
{
    public sealed class AscetSCMInterface
    {
        private readonly Component component;

        public AscetSCMInterface(Component component, string bindingInformation, bool lockCreatesEdition)
        {
            this.component = component;
            BindingInformation = bindingInformation;
            LockCreatesEdition = lockCreatesEdition;
            Commands = new List<string>();
        }

        public string BindingInformation { get; private set; }
        public bool LockCreatesEdition { get; private set; }
        public List<string> Commands { get; private set; }

        public string GetSourceControlBindingInformation()
        {
            return BindingInformation;
        }

        public string GetItemSCMData(DataBaseItem[] items)
        {
            return "scm-data";
        }

        public string ExecuteSCMCommand(string command, string items, string data)
        {
            Commands.Add(command);
            if (String.Equals(command, "Lock", StringComparison.Ordinal) && LockCreatesEdition)
            {
                component.MakeEdition();
            }
            return String.Empty;
        }

        public string ExecuteSCMScriptingCommandForItems(string command, DataBaseItem[] items)
        {
            Commands.Add(command);
            if (String.Equals(command, "CreateEdition", StringComparison.Ordinal))
            {
                component.MakeEdition();
            }
            return String.Empty;
        }
    }

    public sealed class AscetToolHandle
    {
        private readonly AscetSCMInterface scm;

        public AscetToolHandle(AscetSCMInterface scm)
        {
            this.scm = scm;
        }

        public AscetSCMInterface GetSCMInterface()
        {
            return scm;
        }
    }

    public sealed class AscetSession
    {
        private readonly AscetToolHandle toolHandle;

        public AscetSession(Component component, AscetSCMInterface scm)
        {
            Item = component;
            toolHandle = new AscetToolHandle(scm);
        }

        public DataBaseItem Item { get; private set; }
        public int ResolveCount { get; set; }

        public AscetToolHandle GetToolHandle()
        {
            return toolHandle;
        }
    }
}

public sealed class AscetReadException : Exception
{
    public AscetReadException(string code, string operation, string message)
        : base(message)
    {
        Code = code;
        Operation = operation;
    }

    public string Code { get; private set; }
    public string Operation { get; private set; }
}

public abstract class AscetReadDomainServiceBase
{
    public static AscetSession CurrentSession { get; set; }

    protected T ExecuteWithSession<T>(string operation, Func<AscetSession, T> action)
    {
        return action(CurrentSession);
    }

    protected DataBaseItem ResolveItemByPath(AscetSession session, string itemPath)
    {
        session.ResolveCount++;
        return session.Item;
    }

    protected T ExecuteWithBoundSession<T>(string operation, AscetSession session, Func<AscetSession, T> action)
    {
        return action(session);
    }
}

public static class AscetToolApiBootstrap
{
    public static void ConfigureAssemblyResolution()
    {
    }
}

public static class AscetJsonContract
{
    public static string Serialize(object value)
    {
        return new JavaScriptSerializer().Serialize(value);
    }
}

public static class AscetComponentEditableTcmOutputTest
{
    public static int Main()
    {
        TestTcmDriverIdUsesReserveAndCreateEdition();
        TestTcmDriverNameUsesReserveAndCreateEdition();
        TestGenericDriverUsesLock();
        TestAlreadyEditableIsNoOp();
        TestFailedSetReturnsStructuredError();
        Console.WriteLine("AscetComponentEditableTcmOutputTest passed.");
        return 0;
    }

    private static void TestTcmDriverIdUsesReserveAndCreateEdition()
    {
        TestContext context = CreateContext("<scmDriverId>RB_CC.TCM</scmDriverId>", false);

        AscetComponentEditableResult result = new AscetEditableService().SetEditable("DEMO\\PID");

        AssertTrue(result.Editable, "TCM set must create an editable edition.");
        AssertTrue(!result.BeforeEditable && result.AfterEditable && result.Changed, "TCM set must report false-to-true telemetry.");
        AssertEqual(1, result.NativeMutationAttemptCount, "TCM set must report one SCM mutation attempt.");
        AssertCommands(context.Scm.Commands, "ReserveItem", "CreateEdition");
        AssertEqual(3, context.Session.ResolveCount, "TCM set must re-resolve after reserve and after create edition.");
    }

    private static void TestTcmDriverNameUsesReserveAndCreateEdition()
    {
        TestContext context = CreateContext("<scmDriverName>TCM</scmDriverName>", false);

        AscetComponentEditableResult result = new AscetEditableService().SetEditable("DEMO\\PID");

        AssertTrue(result.Editable, "TCM driver-name detection must create an editable edition.");
        AssertCommands(context.Scm.Commands, "ReserveItem", "CreateEdition");
    }

    private static void TestGenericDriverUsesLock()
    {
        TestContext context = CreateContext("<scmDriverId>SVN</scmDriverId>", true);

        AscetComponentEditableResult result = new AscetEditableService().SetEditable("DEMO\\PID");

        AssertTrue(result.Editable, "Generic SCM Lock must remain supported.");
        AssertCommands(context.Scm.Commands, "Lock");
        AssertEqual(2, context.Session.ResolveCount, "Generic set must re-resolve after Lock.");
    }

    private static void TestAlreadyEditableIsNoOp()
    {
        Component component = new Component(false, true);
        AscetSCMInterface scm = new AscetSCMInterface(component, "<scmDriverName>TCM</scmDriverName>", false);
        AscetReadDomainServiceBase.CurrentSession = new AscetSession(component, scm);
        AscetComponentEditableResult result = new AscetEditableService().SetEditable("DEMO\\PID");
        AssertTrue(result.Editable && result.BeforeEditable && result.AfterEditable, "Already editable component must remain editable.");
        AssertTrue(!result.Changed, "Already editable component must report changed=false.");
        AssertEqual(0, result.NativeMutationAttemptCount, "Already editable component must not issue an SCM mutation.");
        AssertCommands(scm.Commands);
    }
    private static void TestFailedSetReturnsStructuredError()
    {
        CreateContext("<scmDriverId>SVN</scmDriverId>", false);
        TextWriter originalOut = Console.Out;
        StringWriter output = new StringWriter();
        int exitCode;
        try
        {
            Console.SetOut(output);
            exitCode = AscetComponentEditable.SetMain(new string[] { "DEMO\\PID", "--json" });
        }
        finally
        {
            Console.SetOut(originalOut);
        }

        string json = output.ToString();
        AssertEqual(2, exitCode, "A set operation that leaves the component read-only must fail.");
        AssertContains(json, "\"editable\":false", "Failure output must preserve the final editability state.");
        AssertContains(json, "\"changed\":false", "Failure output must expose mutation telemetry.");
        AssertContains(json, "\"saveState\":\"not_applicable\"", "SCM mutation output must mark database Save as not applicable.");
        AssertContains(json, "\"code\":\"component_not_editable\"", "Failure output must expose a stable error code.");
    }

    private static TestContext CreateContext(string bindingInformation, bool lockCreatesEdition)
    {
        Component component = new Component(true, false);
        AscetSCMInterface scm = new AscetSCMInterface(component, bindingInformation, lockCreatesEdition);
        AscetSession session = new AscetSession(component, scm);
        AscetReadDomainServiceBase.CurrentSession = session;
        return new TestContext(session, scm);
    }

    private static void AssertCommands(IList<string> actual, params string[] expected)
    {
        AssertEqual(expected.Length, actual.Count, "Unexpected SCM command count.");
        for (int i = 0; i < expected.Length; i++)
        {
            if (!String.Equals(expected[i], actual[i], StringComparison.Ordinal))
            {
                throw new Exception("Expected SCM command '" + expected[i] + "' at index " + i + " but got '" + actual[i] + "'.");
            }
        }
    }

    private static void AssertContains(string actual, string expected, string message)
    {
        if (actual == null || actual.IndexOf(expected, StringComparison.Ordinal) < 0)
        {
            throw new Exception(message + " Expected to find '" + expected + "' in '" + actual + "'.");
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

    private sealed class TestContext
    {
        public TestContext(AscetSession session, AscetSCMInterface scm)
        {
            Session = session;
            Scm = scm;
        }

        public AscetSession Session { get; private set; }
        public AscetSCMInterface Scm { get; private set; }
    }
}
