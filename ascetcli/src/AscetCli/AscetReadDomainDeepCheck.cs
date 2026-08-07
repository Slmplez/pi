using System;
using System.Collections.Generic;
using de.etas.cebra.toolAPI.Common;

class AscetReadDomainDeepCheck
{
    static int Main()
    {
        try
        {
            AscetToolApiBootstrap.ConfigureAssemblyResolution();

            AscetSessionFactory sessionFactory = new AscetSessionFactory();
            ComponentClassifier classifier = new ComponentClassifier();
            DiagramCatalogService diagrams = new DiagramCatalogService();
            MethodCatalogService methods = new MethodCatalogService();
            TextCodeService textCode = new TextCodeService();
            StateMachineReadService stateMachines = new StateMachineReadService();

            using (AscetSession session = (AscetSession)sessionFactory.OpenCurrentDatabaseSession())
            {
                AscetDatabaseRef database = session.GetCurrentDatabase();
                Console.WriteLine("Database: " + database.Name);

                PrintSample(session, classifier, diagrams, methods, textCode, stateMachines, "ClassC");
                PrintSample(session, classifier, diagrams, methods, textCode, stateMachines, "ClassESDL");
                PrintSample(session, classifier, diagrams, methods, textCode, stateMachines, "ModuleC");
                PrintSample(session, classifier, diagrams, methods, textCode, stateMachines, "ModuleESDL");
                PrintSample(session, classifier, diagrams, methods, textCode, stateMachines, "StateMachine");
            }

            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.GetType().FullName);
            Console.Error.WriteLine(ex.Message);
            if (ex.InnerException != null)
            {
                Console.Error.WriteLine(ex.InnerException.GetType().FullName);
                Console.Error.WriteLine(ex.InnerException.Message);
            }

            return 1;
        }
    }

    private static void PrintSample(
        AscetSession session,
        ComponentClassifier classifier,
        DiagramCatalogService diagrams,
        MethodCatalogService methods,
        TextCodeService textCode,
        StateMachineReadService stateMachines,
        string typeName)
    {
        DataBaseItem[] items = session.GetCurrentDatabaseHandle().GetAllComponentsOfType(typeName);
        AscetItemRef component = FirstItem(items, classifier);

        if (component == null)
        {
            Console.WriteLine(typeName + ": <not found>");
            return;
        }

        IList<AscetDiagramRef> diagramRefs = diagrams.ListDiagrams(component);
        IList<AscetMethodRef> methodRefs = methods.ListMethods(component);

        Console.WriteLine(typeName + ": " + component.Path);
        Console.WriteLine("  Diagrams=" + diagramRefs.Count + " Methods=" + methodRefs.Count);

        if (component.LanguageKind == AscetLanguageKind.C)
        {
            AscetTextCode text = textCode.GetTextCode(component);
            Console.WriteLine("  HeaderLength=" + SafeLength(text.HeaderCode) + " ExternalCLength=" + SafeLength(text.ExternalCCode));
        }

        if (component.Kind == AscetComponentKind.StateMachine)
        {
            IList<AscetStateRef> states = stateMachines.ListStates(component);
            IList<AscetTransitionRef> transitions = stateMachines.ListTransitions(component);
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
}
