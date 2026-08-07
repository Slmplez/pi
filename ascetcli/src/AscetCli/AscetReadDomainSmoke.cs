using System;
using System.Collections.Generic;
using System.IO;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

class AscetReadDomainSmoke
{
    private static readonly string TracePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "AscetReadDomainSmoke.trace.log");

    static int Main()
    {
        try
        {
            ResetTrace();
            Trace("start");
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            Trace("bootstrap_configured");
            Ascet bootstrapTool = EnsureDatabaseAvailable();
            Trace("database_available");
            AscetSessionFactory sessionFactory = new AscetSessionFactory();
            ComponentClassifier classifier = new ComponentClassifier();
            ComponentLocatorService locator = new ComponentLocatorService();
            DiagramCatalogService diagrams = new DiagramCatalogService();
            MethodCatalogService methods = new MethodCatalogService();
            TextCodeService textCode = new TextCodeService();
            StateMachineReadService stateMachines = new StateMachineReadService();

            try
            {
                using (AscetSession session = (AscetSession)sessionFactory.OpenCurrentDatabaseSession())
                {
                    Trace("session_opened");
                    AscetDatabaseRef database = session.GetCurrentDatabase();
                    Trace("database_resolved:" + database.Name);
                    Console.WriteLine("Database: " + database.Name);
                    Console.WriteLine("DatabasePath: " + database.Path);
                    Console.WriteLine("TopFolders: " + locator.ListTopFolders().Count);

                    PrintComponentSample(session, classifier, diagrams, methods, textCode, stateMachines, "ClassC");
                    PrintComponentSample(session, classifier, diagrams, methods, textCode, stateMachines, "ClassESDL");
                    PrintComponentSample(session, classifier, diagrams, methods, textCode, stateMachines, "ModuleC");
                    PrintComponentSample(session, classifier, diagrams, methods, textCode, stateMachines, "ModuleESDL");
                    PrintComponentSample(session, classifier, diagrams, methods, textCode, stateMachines, "StateMachine");
                }
            }
            finally
            {
                if (bootstrapTool != null)
                {
                    bootstrapTool.DisconnectFromTool();
                }
            }

            return 0;
        }
        catch (Exception ex)
        {
            Trace("exception");
            Trace(FormatException(ex));
            Console.Error.WriteLine(FormatException(ex));
            return 1;
        }
    }

    private static Ascet EnsureDatabaseAvailable()
    {
        Trace("ensure_database_available");
        Ascet tool = new Ascet();
        if (tool.GetCurrentDataBase() != null)
        {
            Trace("database_already_open");
            return tool;
        }

        string configuredPath = Environment.GetEnvironmentVariable("ASCET_DB_PATH");
        string fallbackPath = @"d:\ETASData\ASCET6.4\Database\Tutorial";
        string databasePath = !String.IsNullOrWhiteSpace(configuredPath) ? configuredPath : fallbackPath;
        Trace("opening_database:" + databasePath);

        if (!Directory.Exists(databasePath))
        {
            tool.DisconnectFromTool();
            throw new AscetReadException(
                "database_not_open",
                "ensure_database_available",
                "No current ASCET database is open, and the fallback path was not found: " + databasePath);
        }

        AscetDataBase database = tool.OpenDataBase(databasePath);
        if (database == null)
        {
            tool.DisconnectFromTool();
            throw new AscetReadException(
                "database_open_failed",
                "ensure_database_available",
                "Failed to open fallback ASCET database: " + databasePath);
        }

        Trace("database_opened:" + database.GetName());
        return tool;
    }

    private static void PrintComponentSample(
        AscetSession session,
        ComponentClassifier classifier,
        DiagramCatalogService diagrams,
        MethodCatalogService methods,
        TextCodeService textCode,
        StateMachineReadService stateMachines,
        string typeName)
    {
        DataBaseItem[] items = session.GetCurrentDatabaseHandle().GetAllComponentsOfType(typeName);
        Trace("sample_lookup:" + typeName + ":" + (items == null ? "null" : items.Length.ToString()));
        AscetItemRef component = FirstItem(items, classifier);

        if (component == null)
        {
            Trace("sample_missing:" + typeName);
            Console.WriteLine(typeName + ": <not found>");
            return;
        }

        Trace("sample_component:" + typeName + ":" + component.Path);
        IList<AscetDiagramRef> diagramRefs = diagrams.ListDiagrams(component);
        IList<AscetMethodRef> methodRefs = methods.ListMethods(component);

        Console.WriteLine(typeName + ": " + component.Path);
        Console.WriteLine("  Kind=" + component.Kind + " Language=" + component.LanguageKind);
        Console.WriteLine("  Diagrams=" + diagramRefs.Count + " Methods=" + methodRefs.Count);

        if (component.LanguageKind == AscetLanguageKind.C)
        {
            AscetTextCode text = textCode.GetTextCode(component);
            Trace("sample_text_code:" + typeName + ":" + SafeLength(text.HeaderCode) + ":" + SafeLength(text.ExternalCCode));
            Console.WriteLine("  HeaderLength=" + SafeLength(text.HeaderCode) + " ExternalCLength=" + SafeLength(text.ExternalCCode));
        }

        if (component.Kind == AscetComponentKind.StateMachine)
        {
            IList<AscetStateRef> states = stateMachines.ListStates(component);
            IList<AscetTransitionRef> transitions = stateMachines.ListTransitions(component);
            Trace("sample_state_machine:" + typeName + ":" + states.Count + ":" + transitions.Count);
            Console.WriteLine("  States=" + states.Count + " Transitions=" + transitions.Count);
        }
    }

    private static AscetItemRef FirstItem(DataBaseItem[] items, ComponentClassifier classifier)
    {
        if (items == null)
        {
            return null;
        }

        for (int i = 0; i < items.Length; i++)
        {
            if (items[i] != null)
            {
                return classifier.ToItemRef(items[i]);
            }
        }

        return null;
    }

    private static int SafeLength(string value)
    {
        return value == null ? 0 : value.Length;
    }

    private static string FormatException(Exception ex)
    {
        System.Text.StringBuilder builder = new System.Text.StringBuilder();
        int depth = 0;

        while (ex != null)
        {
            builder.Append("Exception[").Append(depth).Append("]: ").Append(ex.GetType().FullName).AppendLine();
            builder.Append("Message: ").Append(ex.Message).AppendLine();
            if (!String.IsNullOrEmpty(ex.StackTrace))
            {
                builder.AppendLine("StackTrace:");
                builder.AppendLine(ex.StackTrace);
            }

            builder.AppendLine();
            ex = ex.InnerException;
            depth++;
        }

        return builder.ToString();
    }

    private static void ResetTrace()
    {
        File.WriteAllText(TracePath, String.Empty);
    }

    private static void Trace(string message)
    {
        File.AppendAllText(TracePath, DateTime.Now.ToString("O") + " " + message + Environment.NewLine);
    }
}
