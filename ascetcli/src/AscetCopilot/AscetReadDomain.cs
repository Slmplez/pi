using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Web.Script.Serialization;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;
using AscetAction = de.etas.cebra.toolAPI.Ascet.Action;

public enum AscetComponentKind
{
    Unknown = 0,
    Class = 1,
    Module = 2,
    StateMachine = 3,
    Project = 4,
    ContinuousTimeBlock = 5,
    Enumeration = 6,
    Record = 7,
    Icon = 8,
    Signal = 9,
    Container = 10,
    Folder = 11
}

public enum AscetLanguageKind
{
    Unknown = 0,
    BDE = 1,
    ESDL = 2,
    C = 3
}

public enum AscetMethodKind
{
    Unknown = 0,
    AbstractMethod = 1,
    Process = 2,
    Action = 3,
    Condition = 4,
    Trigger = 5
}

public enum AscetDiagramKind
{
    Unknown = 0,
    BlockDiagram = 1,
    ProcessDiagram = 2,
    StateMachineDiagram = 3,
    ActionConditionDiagram = 4
}

public enum AscetStateKind
{
    Unknown = 0,
    State = 1,
    HierarchyState = 2,
    Pin = 3
}

public enum AscetStateMachineElementKind
{
    Unknown = 0,
    State = 1,
    HierarchyState = 2,
    Pin = 3,
    Transition = 4
}

public enum AscetBlockElementKind
{
    Unknown = 0,
    FunctionalElement = 1,
    Operator = 2,
    ControlElement = 3,
    Literal = 4,
    Hierarchy = 5,
    HierarchyPin = 6
}

public enum AscetBlockPinDirection
{
    Unknown = 0,
    Input = 1,
    Output = 2
}

public enum AscetBlockConnectionSemantic
{
    Unknown = 0,
    Type1 = 1,
    Type2 = 2,
    NumericDataWithInternalFlag = 6,
    Sequence = 256
}

public sealed class AscetDatabaseRef
{
    public string Name { get; set; }
    public string Path { get; set; }
}

public sealed class AscetItemRef
{
    public string Name { get; set; }
    public string Path { get; set; }
    public AscetComponentKind Kind { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
}

public sealed class AscetMethodRef
{
    public string Name { get; set; }
    public AscetMethodKind MethodKind { get; set; }
    public string OwningComponentPath { get; set; }
}

public sealed class AscetMethodCode
{
    public string ComponentPath { get; set; }
    public AscetComponentKind ComponentKind { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
    public string MethodName { get; set; }
    public AscetMethodKind MethodKind { get; set; }
    public string Code { get; set; }
}

public sealed class AscetMethodWriteResult
{
    public string ComponentPath { get; set; }
    public AscetComponentKind ComponentKind { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
    public string MethodName { get; set; }
    public AscetMethodKind MethodKind { get; set; }
    public int PreviousCodeLength { get; set; }
    public int NewCodeLength { get; set; }
    public bool WriteSucceeded { get; set; }
    public bool VerifyReadbackRequested { get; set; }
    public bool ReadbackVerified { get; set; }
}

public sealed class AscetTextCode
{
    public string ComponentPath { get; set; }
    public AscetComponentKind ComponentKind { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
    public string HeaderCode { get; set; }
    public string ExternalCCode { get; set; }
}

public sealed class AscetDiagramRef
{
    public string Name { get; set; }
    public string OwningComponentPath { get; set; }
    public AscetDiagramKind DiagramKind { get; set; }
}

public sealed class AscetStateRef
{
    public string Name { get; set; }
    public AscetStateKind Kind { get; set; }
}

public sealed class AscetTransitionRef
{
    public string Name { get; set; }
    public string SourceName { get; set; }
    public string TargetName { get; set; }
}

public sealed class AscetStateMachineElementRef
{
    public string Name { get; set; }
    public AscetStateMachineElementKind Kind { get; set; }
    public string SourceName { get; set; }
    public string TargetName { get; set; }
}

public sealed class AscetBlockElementRef
{
    public string Id { get; set; }
    public string Name { get; set; }
    public AscetBlockElementKind ElementKind { get; set; }
}

public sealed class AscetBlockPinRef
{
    public string ElementId { get; set; }
    public string ElementName { get; set; }
    public string PinName { get; set; }
    public AscetBlockPinDirection Direction { get; set; }
    public bool HasSequenceCall { get; set; }
    public string SequenceCallId { get; set; }
}

public sealed class AscetBlockPointRef
{
    public int X { get; set; }
    public int Y { get; set; }
}

public sealed class AscetSequenceCallRef
{
    public string Id { get; set; }
    public string DisplayName { get; set; }
    public int SequenceNumber { get; set; }
    public string OwnerElementId { get; set; }
    public string OwnerElementName { get; set; }
    public string OwnerPinName { get; set; }
    public string ConnectionPinName { get; set; }
    public string SequenceActivatorName { get; set; }
    public AscetBlockPointRef Position { get; set; }
}

public sealed class AscetBlockHierarchyPinRef
{
    public string HierarchyElementId { get; set; }
    public string HierarchyElementName { get; set; }
    public string PinName { get; set; }
    public AscetBlockPinDirection Direction { get; set; }
}

public sealed class AscetBlockConnectionRef
{
    public string Id { get; set; }
    public string DiagramName { get; set; }
    public int ConnectionTypeRaw { get; set; }
    public AscetBlockConnectionSemantic ConnectionType { get; set; }
    public AscetBlockPinRef Source { get; set; }
    public AscetBlockPinRef Target { get; set; }
    public IList<AscetBlockPointRef> SegmentPoints { get; set; }
}

public sealed class AscetBlockDiagramGraph
{
    public string ComponentPath { get; set; }
    public AscetComponentKind ComponentKind { get; set; }
    public string DiagramName { get; set; }
    public IList<AscetBlockElementRef> Elements { get; set; }
    public IList<AscetBlockPinRef> Pins { get; set; }
    public IList<AscetSequenceCallRef> SequenceCalls { get; set; }
    public IList<AscetBlockHierarchyPinRef> HierarchyInternalPins { get; set; }
    public IList<AscetBlockConnectionRef> Connections { get; set; }
}

public sealed class AscetItemPath
{
    public string FolderPath { get; private set; }
    public string ItemName { get; private set; }

    private AscetItemPath(string folderPath, string itemName)
    {
        FolderPath = folderPath;
        ItemName = itemName;
    }

    public static AscetItemPath Parse(string itemPath)
    {
        if (String.IsNullOrWhiteSpace(itemPath))
        {
            throw new AscetReadException("invalid_argument", "parse_item_path", "Item path must not be empty.");
        }

        string normalized = itemPath.Replace('/', '\\').Trim();
        if (normalized.EndsWith("\\", StringComparison.Ordinal))
        {
            throw new AscetReadException("invalid_argument", "parse_item_path", "Item path must not end with a path separator.");
        }

        int separatorIndex = normalized.LastIndexOf('\\');
        if (separatorIndex < 0)
        {
            return new AscetItemPath(String.Empty, normalized);
        }

        string folderPath = normalized.Substring(0, separatorIndex);
        string itemName = normalized.Substring(separatorIndex + 1);
        if (String.IsNullOrEmpty(itemName))
        {
            throw new AscetReadException("invalid_argument", "parse_item_path", "Item path must contain an item name.");
        }

        return new AscetItemPath(folderPath, itemName);
    }
}

public sealed class AscetReadException : Exception
{
    public string Code { get; private set; }
    public string Operation { get; private set; }

    public AscetReadException(string code, string operation, string message)
        : base(message)
    {
        Code = code;
        Operation = operation;
    }

    public AscetReadException(string code, string operation, string message, Exception innerException)
        : base(message, innerException)
    {
        Code = code;
        Operation = operation;
    }
}

public interface IAscetSessionFactory
{
    IAscetSession OpenCurrentDatabaseSession();
}

public interface IAscetSession : IDisposable
{
    AscetDatabaseRef GetCurrentDatabase();
}

public interface IComponentLocatorService
{
    IList<AscetItemRef> ListTopFolders();
    IList<AscetItemRef> ListItemsInFolder(string folderPath, bool recursive);
    AscetItemRef FindItemInFolder(string itemName, string folderPath);
    AscetItemRef GetItemByPath(string folderPath, string itemName);
}

public interface IComponentClassifier
{
    AscetComponentKind GetComponentKind(DataBaseItem item);
}

public interface IMethodCatalogService
{
    IList<AscetMethodRef> ListMethods(AscetItemRef component);
    AscetMethodRef GetMethod(string componentPath, string methodName);
}

public interface IMethodCodeService
{
    AscetMethodCode GetMethodCode(AscetItemRef component, string methodName);
    IList<AscetMethodCode> GetAllMethodCodes(AscetItemRef component);
}

public interface IMethodWriteService
{
    AscetMethodWriteResult SetMethodCode(AscetItemRef component, string methodName, string code, bool verifyReadback);
}

public interface ITextCodeService
{
    AscetTextCode GetTextCode(AscetItemRef component);
}

public interface IDiagramCatalogService
{
    IList<AscetDiagramRef> ListDiagrams(AscetItemRef component);
    AscetDiagramRef GetDiagramByName(AscetItemRef component, string diagramName);
}

public interface IStateMachineReadService
{
    IList<AscetStateMachineElementRef> ListStateMachineElements(AscetItemRef stateMachine);
    IList<AscetStateRef> ListStates(AscetItemRef stateMachine);
    IList<AscetTransitionRef> ListTransitions(AscetItemRef stateMachine);
}

public interface IBlockDiagramReadService
{
    IList<AscetBlockElementRef> ListBlockDiagramElements(AscetItemRef component, string diagramName);
    IList<AscetBlockConnectionRef> ListBlockDiagramConnections(AscetItemRef component, string diagramName);
    AscetBlockDiagramGraph GetBlockDiagramGraph(AscetItemRef component, string diagramName);
}

public static class AscetReadDomainUtilities
{
    public static IList<AscetMethodRef> DistinctMethods(IEnumerable<AscetMethodRef> methods)
    {
        Dictionary<string, AscetMethodRef> distinct = new Dictionary<string, AscetMethodRef>(StringComparer.Ordinal);
        List<AscetMethodRef> ordered = new List<AscetMethodRef>();

        foreach (AscetMethodRef method in methods)
        {
            if (method == null)
            {
                continue;
            }

            string key = BuildMethodKey(method.Name, method.MethodKind, method.OwningComponentPath);
            if (distinct.ContainsKey(key))
            {
                continue;
            }

            distinct[key] = method;
            ordered.Add(method);
        }

        return ordered;
    }

    public static string BuildMethodKey(string methodName, AscetMethodKind methodKind, string owningComponentPath)
    {
        return (owningComponentPath ?? String.Empty) + "|" + (methodName ?? String.Empty) + "|" + methodKind.ToString();
    }
}

public static class AscetToolApiBootstrap
{
    private const string AssemblyFileName = "Etas.AscetNET.dll";
    private const string RelativeAssemblyPath = @"Ascetapidll\Etas.AscetNET.dll";
    private static bool _assemblyResolutionConfigured;
    private static string _resolvedAssemblyPath;

    public static string ResolveAssemblyPath()
    {
        if (!String.IsNullOrEmpty(_resolvedAssemblyPath))
        {
            return _resolvedAssemblyPath;
        }

        _resolvedAssemblyPath = ResolveAssemblyPath(AppDomain.CurrentDomain.BaseDirectory);
        return _resolvedAssemblyPath;
    }

    public static string ResolveAssemblyPath(string baseDirectory)
    {
        string resolvedBaseDirectory = String.IsNullOrWhiteSpace(baseDirectory)
            ? AppDomain.CurrentDomain.BaseDirectory
            : Path.GetFullPath(baseDirectory);
        string candidate = Path.Combine(resolvedBaseDirectory, RelativeAssemblyPath);
        if (!File.Exists(candidate))
        {
            throw new FileNotFoundException(
                "ASCET ToolAPI assembly not found relative to base directory '" + resolvedBaseDirectory + "'. Expected 'Ascetapidll\\Etas.AscetNET.dll'.",
                candidate);
        }

        return candidate;
    }

    public static void ConfigureAssemblyResolution()
    {
        if (_assemblyResolutionConfigured)
        {
            return;
        }

        string assemblyPath = ResolveAssemblyPath();
        string ascetDirectory = Path.GetDirectoryName(assemblyPath);
        if (String.IsNullOrEmpty(ascetDirectory))
        {
            throw new AscetReadException("assembly_path_invalid", "configure_assembly_resolution", "Unable to resolve ASCET assembly directory.");
        }

        AppDomain.CurrentDomain.AssemblyResolve += delegate(object sender, ResolveEventArgs args)
        {
            string assemblyFileName = new AssemblyName(args.Name).Name + ".dll";
            string candidatePath = Path.Combine(ascetDirectory, assemblyFileName);
            return File.Exists(candidatePath) ? Assembly.LoadFrom(candidatePath) : null;
        };

        Assembly.LoadFrom(assemblyPath);
        _assemblyResolutionConfigured = true;
    }
}

public static class AscetJsonContract
{
    public static string Serialize(object value)
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return Normalize(serializer.Serialize(value));
    }

    public static Dictionary<string, object> DeserializeObject(string json)
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return serializer.Deserialize<Dictionary<string, object>>(Normalize(json));
    }

    public static string Normalize(string json)
    {
        return (json ?? String.Empty).Replace("\\u003e", ">").Replace("\\u003c", "<");
    }
}

public sealed class AscetSessionFactory : IAscetSessionFactory
{
    public IAscetSession OpenCurrentDatabaseSession()
    {
        AscetToolApiBootstrap.ConfigureAssemblyResolution();
        return new AscetSession();
    }
}

public sealed class AscetSession : IAscetSession
{
    private readonly Ascet _tool;
    private AscetDataBase _databaseHandle;
    private bool _disposed;

    public AscetSession()
    {
        AscetToolApiBootstrap.ConfigureAssemblyResolution();

        try
        {
            _tool = new Ascet();
        }
        catch (Exception ex)
        {
            throw new AscetReadException("tool_connect_failed", "open_session", "Failed to connect to ASCET ToolAPI.", ex);
        }
    }

    public AscetDatabaseRef GetCurrentDatabase()
    {
        AscetDataBase database = GetCurrentDatabaseHandle();
        return new AscetDatabaseRef
        {
            Name = database.GetName(),
            Path = _tool.GetDataBasePath()
        };
    }

    internal AscetDataBase GetCurrentDatabaseHandle()
    {
        ThrowIfDisposed();

        if (_databaseHandle != null)
        {
            return _databaseHandle;
        }

        AscetDataBase database = _tool.GetCurrentDataBase();
        if (database == null)
        {
            throw new AscetReadException("database_not_open", "get_current_database", "GetCurrentDataBase returned null. Open a database in ASCET first.");
        }

        _databaseHandle = database;
        return _databaseHandle;
    }

    internal Ascet GetToolHandle()
    {
        ThrowIfDisposed();
        return _tool;
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        if (_tool != null)
        {
            _tool.DisconnectFromTool();
        }
    }

    private void ThrowIfDisposed()
    {
        if (_disposed)
        {
            throw new ObjectDisposedException("AscetSession");
        }
    }
}

public sealed class ComponentClassifier : IComponentClassifier
{
    public AscetComponentKind GetComponentKind(DataBaseItem item)
    {
        if (item == null)
        {
            return AscetComponentKind.Unknown;
        }

        if (item is AscetFolder || SafeGetBool(item, "IsFolder") || HasTypeName(item, "Folder"))
        {
            return AscetComponentKind.Folder;
        }

        if (item.IsClass())
        {
            return AscetComponentKind.Class;
        }

        if (item.IsModule())
        {
            return AscetComponentKind.Module;
        }

        if (item.IsStateMachine())
        {
            return AscetComponentKind.StateMachine;
        }

        if (SafeGetBool(item, "IsProject") || HasTypeName(item, "Project"))
        {
            return AscetComponentKind.Project;
        }

        if (SafeGetBool(item, "IsEnumeration") || HasTypeName(item, "Enumeration"))
        {
            return AscetComponentKind.Enumeration;
        }

        if (SafeGetBool(item, "IsRecord") || HasTypeName(item, "Record"))
        {
            return AscetComponentKind.Record;
        }

        if (SafeGetBool(item, "IsIcon") || HasTypeName(item, "Icon"))
        {
            return AscetComponentKind.Icon;
        }

        if (SafeGetBool(item, "IsSignal") || HasTypeName(item, "Signal"))
        {
            return AscetComponentKind.Signal;
        }

        if (SafeGetBool(item, "IsContainer") || HasTypeName(item, "Container"))
        {
            return AscetComponentKind.Container;
        }

        AscetLanguageKind languageKind = GetLanguageKind(item);
        if (languageKind != AscetLanguageKind.Unknown)
        {
            return AscetComponentKind.ContinuousTimeBlock;
        }

        return AscetComponentKind.Unknown;
    }

    public AscetLanguageKind GetLanguageKind(DataBaseItem item)
    {
        if (item == null)
        {
            return AscetLanguageKind.Unknown;
        }

        if (item.IsClass())
        {
            AscetClass ascetClass = item as AscetClass;
            if (ascetClass != null)
            {
                if (ascetClass.IsClassC())
                {
                    return AscetLanguageKind.C;
                }

                if (ascetClass.IsClassESDL())
                {
                    return AscetLanguageKind.ESDL;
                }

                if (ascetClass.IsClassBDE())
                {
                    return AscetLanguageKind.BDE;
                }
            }
        }

        if (item.IsModule())
        {
            AscetModule module = item as AscetModule;
            if (module != null)
            {
                if (module.IsModuleC())
                {
                    return AscetLanguageKind.C;
                }

                if (module.IsModuleESDL())
                {
                    return AscetLanguageKind.ESDL;
                }

                if (module.IsModuleBDE())
                {
                    return AscetLanguageKind.BDE;
                }
            }
        }

        AscetLanguageKind stateMachineLanguage = GetStateMachineLanguageKind(item);
        if (stateMachineLanguage != AscetLanguageKind.Unknown)
        {
            return stateMachineLanguage;
        }

        FunctionalComponent functionalComponent = item as FunctionalComponent;
        if (functionalComponent != null)
        {
            if (functionalComponent.IsCType())
            {
                return AscetLanguageKind.C;
            }

            if (functionalComponent.IsESDLType())
            {
                return AscetLanguageKind.ESDL;
            }

            if (functionalComponent.IsBDEType())
            {
                return AscetLanguageKind.BDE;
            }
        }

        if (SafeGetBool(item, "IsCType"))
        {
            return AscetLanguageKind.C;
        }

        if (SafeGetBool(item, "IsESDLType"))
        {
            return AscetLanguageKind.ESDL;
        }

        if (SafeGetBool(item, "IsBDEType"))
        {
            return AscetLanguageKind.BDE;
        }

        return AscetLanguageKind.Unknown;
    }

    private AscetLanguageKind GetStateMachineLanguageKind(DataBaseItem item)
    {
        if (item == null || !item.IsStateMachine())
        {
            return AscetLanguageKind.Unknown;
        }

        CodeComponent component = item as CodeComponent;
        if (component == null)
        {
            return AscetLanguageKind.Unknown;
        }

        try
        {
            AscetDiagram[] diagrams = component.GetAllDiagrams();
            if (diagrams == null)
            {
                return AscetLanguageKind.Unknown;
            }

            for (int i = 0; i < diagrams.Length; i++)
            {
                AscetDiagram diagram = diagrams[i];
                if (diagram == null || !diagram.IsStateMachineDiagram())
                {
                    continue;
                }

                StateMachineDiagram stateMachineDiagram = diagram as StateMachineDiagram;
                if (stateMachineDiagram == null)
                {
                    continue;
                }

                return HasStateMachineTextualBehavior(stateMachineDiagram)
                    ? AscetLanguageKind.ESDL
                    : AscetLanguageKind.BDE;
            }
        }
        catch
        {
            return AscetLanguageKind.Unknown;
        }

        return AscetLanguageKind.Unknown;
    }

    private bool HasStateMachineTextualBehavior(StateMachineDiagram diagram)
    {
        if (diagram == null)
        {
            return false;
        }

        try
        {
            Trigger[] triggers = diagram.GetAllTriggers();
            if (triggers != null && triggers.Length > 0)
            {
                return true;
            }

            State[] states = diagram.GetAllStates();
            if (states != null)
            {
                for (int i = 0; i < states.Length; i++)
                {
                    State state = states[i];
                    if (state == null)
                    {
                        continue;
                    }

                    if ((state.IsEntryActionDefined() && (state.IsEntryActionESDL() || state.GetEntryAction() != null)) ||
                        (state.IsExitActionDefined() && (state.IsExitActionESDL() || state.GetExitAction() != null)) ||
                        (state.IsStaticActionDefined() && (state.IsStaticActionESDL() || state.GetStaticAction() != null)))
                    {
                        return true;
                    }
                }
            }

            Transition[] transitions = diagram.GetAllTransitions();
            if (transitions != null)
            {
                for (int i = 0; i < transitions.Length; i++)
                {
                    Transition transition = transitions[i];
                    if (transition == null)
                    {
                        continue;
                    }

                    if ((transition.IsConditionDefined() && (transition.IsConditionESDL() || transition.GetCondition() != null)) ||
                        (transition.IsActionDefined() && (transition.IsActionESDL() || transition.GetAction() != null)))
                    {
                        return true;
                    }
                }
            }
        }
        catch
        {
            return false;
        }

        return false;
    }

    private bool SafeGetBool(object target, string methodName)
    {
        try
        {
            if (target == null || String.IsNullOrWhiteSpace(methodName))
            {
                return false;
            }

            MethodInfo method = target.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
            if (method == null)
            {
                return false;
            }

            object value = method.Invoke(target, null);
            if (value == null)
            {
                return false;
            }

            return Convert.ToBoolean(value);
        }
        catch
        {
            return false;
        }
    }

    private bool HasTypeName(object target, string expectedFragment)
    {
        try
        {
            if (target == null || String.IsNullOrWhiteSpace(expectedFragment))
            {
                return false;
            }

            Type type = target.GetType();
            if (type == null)
            {
                return false;
            }

            string name = type.Name ?? String.Empty;
            if (name.IndexOf(expectedFragment, StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return true;
            }

            string fullName = type.FullName ?? String.Empty;
            return fullName.IndexOf(expectedFragment, StringComparison.OrdinalIgnoreCase) >= 0;
        }
        catch
        {
            return false;
        }
    }

    public AscetItemRef ToItemRef(DataBaseItem item)
    {
        if (item == null)
        {
            return null;
        }

        return new AscetItemRef
        {
            Name = item.GetName(),
            Path = item.GetNameWithPath(),
            Kind = GetComponentKind(item),
            LanguageKind = GetLanguageKind(item)
        };
    }
}

public abstract class AscetReadDomainServiceBase
{
    protected AscetReadDomainServiceBase()
        : this(new AscetSessionFactory(), new ComponentClassifier())
    {
    }

    protected AscetReadDomainServiceBase(AscetSessionFactory sessionFactory, ComponentClassifier classifier)
    {
        if (sessionFactory == null)
        {
            throw new ArgumentNullException("sessionFactory");
        }

        if (classifier == null)
        {
            throw new ArgumentNullException("classifier");
        }

        SessionFactory = sessionFactory;
        Classifier = classifier;
    }

    protected AscetSessionFactory SessionFactory { get; private set; }
    protected ComponentClassifier Classifier { get; private set; }

    protected bool IsComponentEditableInSession(AscetSession session, string componentPath, string operation)
    {
        if (session == null)
        {
            throw new ArgumentNullException("session");
        }

        DataBaseItem item = ResolveItemByPath(session, componentPath);
        Component component = item as Component;
        if (component == null)
        {
            throw new AscetReadException(
                "unsupported_component_kind",
                operation,
                "Item '" + componentPath + "' is not an ASCET component and has no Component editability state.");
        }

        bool isVersion = component.IsVersion();
        bool isEdition = component.IsEdition();
        return IsEditableComponentState(isVersion, isEdition);
    }

    internal static bool IsEditableComponentState(bool isVersion, bool isEdition)
    {
        return isEdition || (!isVersion && !isEdition);
    }

    protected void RequireComponentEditableInSession(AscetSession session, string componentPath, string operation)
    {
        if (!IsComponentEditableInSession(session, componentPath, operation))
        {
            throw new AscetReadException(
                "editable_write_gate_blocked",
                operation,
                "ASCET write blocked because component '" + componentPath + "' is not editable.");
        }
    }

    protected void RequireComponentsEditableInSession(AscetSession session, IEnumerable<string> componentPaths, string operation)
    {
        if (componentPaths == null)
        {
            throw new ArgumentNullException("componentPaths");
        }

        HashSet<string> checkedPaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (string componentPath in componentPaths)
        {
            if (String.IsNullOrWhiteSpace(componentPath) || !checkedPaths.Add(componentPath))
            {
                continue;
            }

            RequireComponentEditableInSession(session, componentPath, operation);
        }
    }
    protected T ExecuteWithSession<T>(string operation, Func<AscetSession, T> action)
    {
        if (action == null)
        {
            throw new ArgumentNullException("action");
        }

        try
        {
            using (AscetSession session = (AscetSession)SessionFactory.OpenCurrentDatabaseSession())
            {
                return action(session);
            }
        }
        catch (AscetReadException)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw new AscetReadException("tool_api_error", operation, "ASCET ToolAPI call failed.", ex);
        }
    }

    protected T ExecuteWithBoundSession<T>(string operation, AscetSession session, Func<AscetSession, T> action)
    {
        if (session == null)
        {
          throw new ArgumentNullException("session");
        }

        if (action == null)
        {
            throw new ArgumentNullException("action");
        }

        try
        {
            return action(session);
        }
        catch (AscetReadException)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw new AscetReadException("tool_api_error", operation, "ASCET ToolAPI call failed.", ex);
        }
    }

    protected DataBaseItem ResolveItemByPath(AscetSession session, string componentPath)
    {
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            throw new AscetReadException("invalid_argument", "resolve_item_by_path", "Component path must not be empty.");
        }

        AscetResolvedTarget resolved = new AscetTargetResolver(
            new ToolApiAscetTargetResolutionBackend(session.GetCurrentDatabaseHandle()))
            .Resolve(new AscetTargetRequest { Path = componentPath });
        DataBaseItem item = resolved.NativeItem as DataBaseItem;
        if (item == null)
        {
            throw new AscetReadException("unsupported_target_kind", "resolve_item_by_path", "Resolved target is not an ASCET database item.");
        }
        return item;
    }

    protected DataBaseItem ResolveItem(AscetSession session, string itemName, string folderPath)
    {
        if (String.IsNullOrWhiteSpace(itemName))
        {
            throw new AscetReadException("invalid_argument", "resolve_item", "Item name must not be empty.");
        }

        if (itemName.IndexOf("::", StringComparison.Ordinal) >= 0)
        {
            string projectChildPath = String.IsNullOrWhiteSpace(folderPath) ? itemName : folderPath.TrimEnd('\\') + "\\" + itemName;
            return ResolveItemByPath(session, projectChildPath);
        }

        AscetDataBase database = session.GetCurrentDatabaseHandle();
        DataBaseItem item = database.GetItemInFolder(itemName, folderPath ?? String.Empty);
        if (item == null)
        {
            throw new AscetReadException(
                "component_not_found",
                "resolve_item",
                "Item '" + itemName + "' was not found in folder '" + (folderPath ?? String.Empty) + "'.");
        }

        return item;
    }
    protected CodeComponent ResolveCodeComponent(AscetSession session, AscetItemRef component)
    {
        if (component == null)
        {
            throw new AscetReadException("invalid_argument", "resolve_code_component", "Component reference must not be null.");
        }

        return ResolveCodeComponent(session, component.Path);
    }

    protected CodeComponent ResolveCodeComponent(AscetSession session, string componentPath)
    {
        DataBaseItem item = ResolveItemByPath(session, componentPath);
        CodeComponent codeComponent = item as CodeComponent;
        if (codeComponent == null)
        {
            if (item is AscetFolder)
            {
                throw new AscetReadException(
                    "target_is_folder",
                    "resolve_code_component",
                    "Target path '" + componentPath + "' resolves to a folder, not a code component.");
            }

            throw new AscetReadException(
                "unsupported_component_kind",
                "resolve_code_component",
                "Item '" + componentPath + "' is not a code component.");
        }

        return codeComponent;
    }

    protected FunctionalComponent ResolveFunctionalComponent(AscetSession session, AscetItemRef component)
    {
        if (component == null)
        {
            throw new AscetReadException("invalid_argument", "resolve_functional_component", "Component reference must not be null.");
        }

        DataBaseItem item = ResolveItemByPath(session, component.Path);
        FunctionalComponent functionalComponent = item as FunctionalComponent;
        if (functionalComponent == null)
        {
            throw new AscetReadException(
                "unsupported_component_kind",
                "resolve_functional_component",
                "Item '" + component.Path + "' is not a functional component.");
        }

        return functionalComponent;
    }

    protected StateMachineDiagram ResolveStateMachineDiagram(AscetSession session, AscetItemRef stateMachine)
    {
        if (stateMachine == null)
        {
            throw new AscetReadException("invalid_argument", "resolve_state_machine_diagram", "State machine reference must not be null.");
        }

        if (stateMachine.Kind != AscetComponentKind.StateMachine)
        {
            throw new AscetReadException(
                "unsupported_component_kind",
                "resolve_state_machine_diagram",
                "Item '" + stateMachine.Path + "' is not classified as a state machine.");
        }

        CodeComponent component = ResolveCodeComponent(session, stateMachine);
        AscetDiagram[] diagrams = component.GetAllDiagrams();
        if (diagrams == null)
        {
            throw new AscetReadException(
                "state_machine_diagram_not_found",
                "resolve_state_machine_diagram",
                "Component '" + stateMachine.Path + "' does not expose diagrams.");
        }

        for (int i = 0; i < diagrams.Length; i++)
        {
            AscetDiagram diagram = diagrams[i];
            if (diagram == null || !diagram.IsStateMachineDiagram())
            {
                continue;
            }

            StateMachineDiagram stateMachineDiagram = diagram as StateMachineDiagram;
            if (stateMachineDiagram == null)
            {
                throw new AscetReadException(
                    "unsupported_diagram_kind",
                    "resolve_state_machine_diagram",
                    "Failed to cast state machine diagram '" + diagram.GetName() + "'.");
            }

            return stateMachineDiagram;
        }

        throw new AscetReadException(
            "state_machine_diagram_not_found",
            "resolve_state_machine_diagram",
            "No state machine diagram was found for component '" + stateMachine.Path + "'.");
    }

    protected AscetDiagram ResolveBlockDiagram(AscetSession session, AscetItemRef component, string diagramName)
    {
        if (component == null)
        {
            throw new AscetReadException("invalid_argument", "resolve_block_diagram", "Component reference must not be null.");
        }

        if (String.IsNullOrWhiteSpace(diagramName))
        {
            throw new AscetReadException("invalid_argument", "resolve_block_diagram", "Diagram name must not be empty.");
        }

        CodeComponent codeComponent = ResolveCodeComponent(session, component);
        AscetDiagram diagram = codeComponent.GetDiagramWithName(diagramName);
        if (diagram == null)
        {
            throw new AscetReadException(
                "diagram_not_found",
                "resolve_block_diagram",
                "Diagram '" + diagramName + "' was not found in component '" + component.Path + "'.");
        }

        if (!diagram.IsBlockDiagram())
        {
            throw new AscetReadException(
                "unsupported_diagram_kind",
                "resolve_block_diagram",
                "Diagram '" + diagramName + "' in component '" + component.Path + "' is not a block diagram.");
        }

        return diagram;
    }

    protected BlockDiagramElement[] GetAllBlockDiagramElements(AscetDiagram diagram)
    {
        if (diagram == null)
        {
            return new BlockDiagramElement[0];
        }

        if (diagram.IsDiscreteMethodDiagram())
        {
            DiscreteMethodDiagram discrete = diagram as DiscreteMethodDiagram;
            return discrete == null ? new BlockDiagramElement[0] : discrete.GetAllDiagramElements();
        }

        if (diagram.IsContinuousMethodDiagram())
        {
            ContinuousMethodDiagram continuous = diagram as ContinuousMethodDiagram;
            return continuous == null ? new BlockDiagramElement[0] : continuous.GetAllDiagramElements();
        }

        if (diagram.IsProcessDiagram())
        {
            ProcessDiagram process = diagram as ProcessDiagram;
            return process == null ? new BlockDiagramElement[0] : process.GetAllDiagramElements();
        }

        if (diagram.IsActionConditionDiagram())
        {
            ActionConditionDiagram actionCondition = diagram as ActionConditionDiagram;
            return actionCondition == null ? new BlockDiagramElement[0] : actionCondition.GetAllDiagramElements();
        }

        throw new AscetReadException(
            "unsupported_diagram_kind",
            "get_all_block_diagram_elements",
            "Diagram '" + diagram.GetName() + "' is not a supported block diagram type.");
    }

    protected BlockDiagramConnection[] GetAllBlockDiagramConnections(AscetDiagram diagram)
    {
        if (diagram == null)
        {
            return new BlockDiagramConnection[0];
        }

        if (diagram.IsDiscreteMethodDiagram())
        {
            DiscreteMethodDiagram discrete = diagram as DiscreteMethodDiagram;
            return discrete == null ? new BlockDiagramConnection[0] : discrete.GetAllDiagramConnections();
        }

        if (diagram.IsContinuousMethodDiagram())
        {
            ContinuousMethodDiagram continuous = diagram as ContinuousMethodDiagram;
            return continuous == null ? new BlockDiagramConnection[0] : continuous.GetAllDiagramConnections();
        }

        if (diagram.IsProcessDiagram())
        {
            ProcessDiagram process = diagram as ProcessDiagram;
            return process == null ? new BlockDiagramConnection[0] : process.GetAllDiagramConnections();
        }

        if (diagram.IsActionConditionDiagram())
        {
            ActionConditionDiagram actionCondition = diagram as ActionConditionDiagram;
            return actionCondition == null ? new BlockDiagramConnection[0] : actionCondition.GetAllDiagramConnections();
        }

        throw new AscetReadException(
            "unsupported_diagram_kind",
            "get_all_block_diagram_connections",
            "Diagram '" + diagram.GetName() + "' is not a supported block diagram type.");
    }

    protected AscetDiagramKind GetDiagramKind(AscetDiagram diagram)
    {
        if (diagram == null)
        {
            return AscetDiagramKind.Unknown;
        }

        if (diagram.IsBlockDiagram())
        {
            return AscetDiagramKind.BlockDiagram;
        }

        if (diagram.IsStateMachineDiagram())
        {
            return AscetDiagramKind.StateMachineDiagram;
        }

        if (diagram.IsActionConditionDiagram())
        {
            return AscetDiagramKind.ActionConditionDiagram;
        }

        if (diagram.IsProcessDiagram() || diagram.IsDiscreteMethodDiagram() || diagram.IsContinuousMethodDiagram())
        {
            return AscetDiagramKind.ProcessDiagram;
        }

        return AscetDiagramKind.Unknown;
    }

    protected AscetMethodKind GetMethodKind(AbstractMethod method)
    {
        if (method == null)
        {
            return AscetMethodKind.Unknown;
        }

        if (method.IsProcess())
        {
            return AscetMethodKind.Process;
        }

        if (method.IsAction())
        {
            return AscetMethodKind.Action;
        }

        if (method.IsCondition())
        {
            return AscetMethodKind.Condition;
        }

        if (method.IsTrigger())
        {
            return AscetMethodKind.Trigger;
        }

        if (method.IsAbstractMethod())
        {
            return AscetMethodKind.AbstractMethod;
        }

        return AscetMethodKind.Unknown;
    }

    protected AscetStateKind GetStateKind(AbstractStateMachineElement element)
    {
        if (element == null)
        {
            return AscetStateKind.Unknown;
        }

        if (element.IsStateMachinePin())
        {
            return AscetStateKind.Pin;
        }

        if (element.IsHierarchyState())
        {
            return AscetStateKind.HierarchyState;
        }

        if (element.IsState())
        {
            return AscetStateKind.State;
        }

        return AscetStateKind.Unknown;
    }

    protected string GetTransitionEndpointName(State state, StateMachinePin pin)
    {
        if (state != null)
        {
            return state.GetName();
        }

        if (pin != null)
        {
            return pin.GetName();
        }

        return String.Empty;
    }

    protected AscetTransitionRef BuildTransitionRef(Transition transition)
    {
        if (transition == null)
        {
            return null;
        }

        State startState = transition.GetStartState();
        State endState = transition.GetEndState();
        StateMachinePin startPin = transition.GetStartPin();
        StateMachinePin endPin = transition.GetEndPin();
        string sourceName = GetTransitionEndpointName(startState, startPin);
        string targetName = GetTransitionEndpointName(endState, endPin);

        return new AscetTransitionRef
        {
            Name = BuildTransitionName(sourceName, targetName),
            SourceName = sourceName,
            TargetName = targetName
        };
    }

    protected string BuildTransitionName(string sourceName, string targetName)
    {
        return (sourceName ?? String.Empty) + "->" + (targetName ?? String.Empty);
    }

    protected AscetBlockElementKind GetBlockElementKind(BlockDiagramElement element)
    {
        if (element == null)
        {
            return AscetBlockElementKind.Unknown;
        }

        if (element.IsBlockDiagramHierarchyPin())
        {
            return AscetBlockElementKind.HierarchyPin;
        }

        if (element.IsBlockDiagramHierarchy())
        {
            return AscetBlockElementKind.Hierarchy;
        }

        if (element.IsBlockDiagramFunctionalElement())
        {
            return AscetBlockElementKind.FunctionalElement;
        }

        if (element.IsBlockDiagramOperator())
        {
            return AscetBlockElementKind.Operator;
        }

        if (element.IsBlockDiagramControlElement())
        {
            return AscetBlockElementKind.ControlElement;
        }

        if (element.IsBlockDiagramLiteral())
        {
            return AscetBlockElementKind.Literal;
        }

        return AscetBlockElementKind.Unknown;
    }

    protected string GetBlockElementName(BlockDiagramElement element)
    {
        if (element == null)
        {
            return String.Empty;
        }

        if (element.IsBlockDiagramHierarchyPin())
        {
            BlockDiagramHierarchyPin hierarchyPin = element as BlockDiagramHierarchyPin;
            return hierarchyPin == null ? String.Empty : hierarchyPin.GetName();
        }

        if (element.IsBlockDiagramHierarchy())
        {
            BlockDiagramHierarchy hierarchy = element as BlockDiagramHierarchy;
            return hierarchy == null ? String.Empty : hierarchy.GetName();
        }

        if (element.IsBlockDiagramFunctionalElement())
        {
            BlockDiagramFunctionalElement functional = element as BlockDiagramFunctionalElement;
            if (functional == null)
            {
                return String.Empty;
            }

            AscetModelElement modelElement = functional.GetModelElement();
            return modelElement == null ? String.Empty : modelElement.GetName();
        }

        if (element.IsBlockDiagramOperator())
        {
            BlockDiagramOperator blockOperator = element as BlockDiagramOperator;
            return blockOperator == null ? String.Empty : blockOperator.GetOperatorType();
        }

        if (element.IsBlockDiagramControlElement())
        {
            BlockDiagramControlElement control = element as BlockDiagramControlElement;
            return control == null ? String.Empty : control.GetControlElementType();
        }

        if (element.IsBlockDiagramLiteral())
        {
            BlockDiagramLiteral literal = element as BlockDiagramLiteral;
            return literal == null ? String.Empty : literal.GetContents();
        }

        long graphicalId = element.GetGraphicalObjectIdentifier();
        return graphicalId.ToString();
    }

    protected string BuildBlockElementId(BlockDiagramElement element)
    {
        if (element == null)
        {
            return String.Empty;
        }

        long graphicalId = element.GetGraphicalObjectIdentifier();
        if (graphicalId >= 0)
        {
            return graphicalId.ToString();
        }

        return GetBlockElementKind(element).ToString() + ":" + GetBlockElementName(element);
    }

    protected AscetBlockPinDirection GetBlockPinDirection(BlockDiagramElementPin pin)
    {
        if (pin == null)
        {
            return AscetBlockPinDirection.Unknown;
        }

        if (pin.IsInput())
        {
            return AscetBlockPinDirection.Input;
        }

        if (pin.IsOutput())
        {
            return AscetBlockPinDirection.Output;
        }

        return AscetBlockPinDirection.Unknown;
    }

    protected AscetBlockElementRef BuildBlockElementRef(BlockDiagramElement element)
    {
        return new AscetBlockElementRef
        {
            Id = BuildBlockElementId(element),
            Name = GetBlockElementName(element),
            ElementKind = GetBlockElementKind(element)
        };
    }

    protected AscetBlockPinRef BuildBlockPinRef(BlockDiagramElementPin pin)
    {
        if (pin == null)
        {
            return null;
        }

        BlockDiagramElement element = pin.GetBlockDiagramElement();
        bool hasSequenceCall = pin.HasSequenceCall();
        string sequenceCallId = String.Empty;

        if (hasSequenceCall)
        {
            SequenceCall sequenceCall = pin.GetSequenceCall();
            hasSequenceCall = sequenceCall != null;
            sequenceCallId = hasSequenceCall ? BuildSequenceCallId(pin, sequenceCall) : String.Empty;
        }

        return new AscetBlockPinRef
        {
            ElementId = BuildBlockElementId(element),
            ElementName = GetBlockElementName(element),
            PinName = pin.GetName(),
            Direction = GetBlockPinDirection(pin),
            HasSequenceCall = hasSequenceCall,
            SequenceCallId = sequenceCallId
        };
    }

    protected BlockDiagramElementPin[] GetAllBlockElementPins(BlockDiagramElement element)
    {
        if (element == null)
        {
            return new BlockDiagramElementPin[0];
        }

        BlockDiagramElementPin[] pins = element.GetAllPins();
        return pins ?? new BlockDiagramElementPin[0];
    }

    protected AscetBlockConnectionSemantic GetBlockConnectionSemantic(int connectionType)
    {
        switch (connectionType)
        {
            case 1:
                return AscetBlockConnectionSemantic.Type1;
            case 2:
                return AscetBlockConnectionSemantic.Type2;
            case 6:
                return AscetBlockConnectionSemantic.NumericDataWithInternalFlag;
            case 256:
                return AscetBlockConnectionSemantic.Sequence;
            default:
                return AscetBlockConnectionSemantic.Unknown;
        }
    }

    protected string BuildSequenceCallDisplayName(SequenceCall sequenceCall)
    {
        if (sequenceCall == null)
        {
            return String.Empty;
        }

        AbstractMethod activator = sequenceCall.GetSequenceActivator();
        string activatorName = activator == null ? String.Empty : activator.GetName();
        return "/" + sequenceCall.GetSequenceNumber().ToString() + "/" + activatorName;
    }

    protected string BuildSequenceCallId(BlockDiagramElementPin ownerPin, SequenceCall sequenceCall)
    {
        if (sequenceCall == null)
        {
            return String.Empty;
        }

        string ownerElementId = String.Empty;
        string ownerPinName = String.Empty;

        if (ownerPin != null)
        {
            BlockDiagramElement ownerElement = ownerPin.GetBlockDiagramElement();
            ownerElementId = BuildBlockElementId(ownerElement);
            ownerPinName = ownerPin.GetName() ?? String.Empty;
        }

        return "seq:" + ownerElementId + ":" + ownerPinName + ":" + sequenceCall.GetSequenceNumber().ToString();
    }

    protected AscetBlockPointRef BuildBlockPointRef(long[] coordinates)
    {
        if (coordinates == null || coordinates.Length < 2)
        {
            return null;
        }

        return new AscetBlockPointRef
        {
            X = (int)coordinates[0],
            Y = (int)coordinates[1]
        };
    }

    protected AscetBlockPointRef BuildBlockPointRef(int[] coordinates)
    {
        if (coordinates == null || coordinates.Length < 2)
        {
            return null;
        }

        return new AscetBlockPointRef
        {
            X = coordinates[0],
            Y = coordinates[1]
        };
    }

    protected IList<AscetBlockPointRef> BuildSegmentPoints(BlockDiagramConnection connection)
    {
        List<AscetBlockPointRef> points = new List<AscetBlockPointRef>();
        if (connection == null)
        {
            return points;
        }

        int[][] coordinates = connection.GetSegmentCoordinatesXY();
        if (coordinates == null)
        {
            return points;
        }

        for (int i = 0; i < coordinates.Length; i++)
        {
            AscetBlockPointRef point = BuildBlockPointRef(coordinates[i]);
            if (point != null)
            {
                points.Add(point);
            }
        }

        return points;
    }

    protected AscetSequenceCallRef BuildSequenceCallRef(BlockDiagramElementPin ownerPin)
    {
        if (ownerPin == null || !ownerPin.HasSequenceCall())
        {
            return null;
        }

        SequenceCall sequenceCall = ownerPin.GetSequenceCall();
        if (sequenceCall == null)
        {
            return null;
        }

        BlockDiagramElement ownerElement = ownerPin.GetBlockDiagramElement();
        BlockDiagramElementPin connectionPin = sequenceCall.GetConnectionPin();
        AbstractMethod activator = sequenceCall.GetSequenceActivator();

        return new AscetSequenceCallRef
        {
            Id = BuildSequenceCallId(ownerPin, sequenceCall),
            DisplayName = BuildSequenceCallDisplayName(sequenceCall),
            SequenceNumber = sequenceCall.GetSequenceNumber(),
            OwnerElementId = BuildBlockElementId(ownerElement),
            OwnerElementName = GetBlockElementName(ownerElement),
            OwnerPinName = ownerPin.GetName(),
            ConnectionPinName = connectionPin == null ? String.Empty : connectionPin.GetName(),
            SequenceActivatorName = activator == null ? String.Empty : activator.GetName(),
            Position = BuildBlockPointRef(sequenceCall.GetPosition())
        };
    }

    protected AscetBlockHierarchyPinRef BuildHierarchyInternalPinRef(BlockDiagramHierarchy hierarchy, BlockDiagramHierarchyPin pin)
    {
        if (hierarchy == null || pin == null)
        {
            return null;
        }

        return new AscetBlockHierarchyPinRef
        {
            HierarchyElementId = BuildBlockElementId(hierarchy),
            HierarchyElementName = GetBlockElementName(hierarchy),
            PinName = pin.GetName(),
            Direction = pin.IsInput() ? AscetBlockPinDirection.Input : (pin.IsOutput() ? AscetBlockPinDirection.Output : AscetBlockPinDirection.Unknown)
        };
    }

    protected string BuildBlockPinKey(AscetBlockPinRef pin)
    {
        if (pin == null)
        {
            return String.Empty;
        }

        return (pin.ElementId ?? String.Empty) + "|" + (pin.PinName ?? String.Empty) + "|" + pin.Direction.ToString();
    }

    protected string BuildHierarchyInternalPinKey(AscetBlockHierarchyPinRef pin)
    {
        if (pin == null)
        {
            return String.Empty;
        }

        return (pin.HierarchyElementId ?? String.Empty) + "|" + (pin.PinName ?? String.Empty) + "|" + pin.Direction.ToString();
    }
}

public sealed class ComponentLocatorService : AscetReadDomainServiceBase, IComponentLocatorService
{
    public IList<AscetItemRef> ListTopFolders()
    {
        return ExecuteWithSession("list_top_folders", delegate(AscetSession session)
        {
            AscetDataBase database = session.GetCurrentDatabaseHandle();
            AscetFolder[] folders = database.GetAllAscetFolders();
            List<AscetItemRef> result = new List<AscetItemRef>();

            if (folders == null)
            {
                return result;
            }

            for (int i = 0; i < folders.Length; i++)
            {
                AscetFolder folder = folders[i];
                if (folder == null)
                {
                    continue;
                }

                result.Add(new AscetItemRef
                {
                    Name = folder.GetName(),
                    Path = folder.GetNameWithPath(),
                    Kind = AscetComponentKind.Folder,
                    LanguageKind = AscetLanguageKind.Unknown
                });
            }

            return result;
        });
    }

    public IList<AscetItemRef> ListItemsInFolder(string folderPath, bool recursive)
    {
        return ExecuteWithSession("list_items_in_folder", delegate(AscetSession session)
        {
            AscetDataBase database = session.GetCurrentDatabaseHandle();
            List<AscetItemRef> result = new List<AscetItemRef>();
            Dictionary<string, bool> seen = new Dictionary<string, bool>(StringComparer.Ordinal);

            if (String.IsNullOrWhiteSpace(folderPath))
            {
                AscetFolder[] topFolders = database.GetAllAscetFolders();
                if (topFolders == null)
                {
                    return result;
                }

                for (int i = 0; i < topFolders.Length; i++)
                {
                    AscetFolder topFolder = topFolders[i];
                    if (topFolder == null)
                    {
                        continue;
                    }

                    CollectFolderItems(topFolder, recursive, result, seen);
                }

                return result;
            }

            AscetFolder folder = ResolveFolder(database, folderPath);
            CollectFolderItems(folder, recursive, result, seen);
            return result;
        });
    }

    public AscetItemRef FindItemInFolder(string itemName, string folderPath)
    {
        return ExecuteWithSession("find_item_in_folder", delegate(AscetSession session)
        {
            DataBaseItem item = ResolveItem(session, itemName, folderPath);
            return Classifier.ToItemRef(item);
        });
    }

    public AscetItemRef GetItemByPath(string folderPath, string itemName)
    {
        return FindItemInFolder(itemName, folderPath);
    }

    private void CollectFolderItems(AscetFolder folder, bool recursive, IList<AscetItemRef> result, IDictionary<string, bool> seen)
    {
        if (folder == null || result == null || seen == null)
        {
            return;
        }

        Array items = InvokeFolderArray(folder, new string[] { "GetAllDataBaseItems", "GetAllItems", "GetAllComponents" });
        if (items != null)
        {
            for (int i = 0; i < items.Length; i++)
            {
                DataBaseItem item = items.GetValue(i) as DataBaseItem;
                if (item == null)
                {
                    continue;
                }

                AscetItemRef itemRef = Classifier.ToItemRef(item);
                if (itemRef == null || String.IsNullOrWhiteSpace(itemRef.Path) || seen.ContainsKey(itemRef.Path))
                {
                    continue;
                }

                seen[itemRef.Path] = true;
                result.Add(itemRef);
            }
        }

        if (!recursive)
        {
            return;
        }

        Array childFolders = InvokeFolderArray(folder, new string[] { "GetAllAscetFolders", "GetAllFolders", "GetAllSubFolders", "GetSubFolders" });
        if (childFolders == null)
        {
            return;
        }

        for (int i = 0; i < childFolders.Length; i++)
        {
            AscetFolder childFolder = childFolders.GetValue(i) as AscetFolder;
            if (childFolder == null)
            {
                continue;
            }

            CollectFolderItems(childFolder, true, result, seen);
        }
    }

    private AscetFolder ResolveFolder(AscetDataBase database, string folderPath)
    {
        if (database == null)
        {
            throw new AscetReadException("invalid_argument", "resolve_folder", "Database must not be null.");
        }

        string normalizedPath = NormalizeFolderPath(folderPath);
        if (String.IsNullOrWhiteSpace(normalizedPath))
        {
            throw new AscetReadException("invalid_argument", "resolve_folder", "Folder path must not be empty.");
        }

        AscetFolder[] topFolders = database.GetAllAscetFolders();
        if (topFolders == null)
        {
            throw new AscetReadException("folder_not_found", "resolve_folder", "Folder '" + normalizedPath + "' was not found.");
        }

        string[] segments = normalizedPath.Split(new char[] { '\\' }, StringSplitOptions.RemoveEmptyEntries);
        AscetFolder current = null;
        Array currentLevel = topFolders;

        for (int i = 0; i < segments.Length; i++)
        {
            string segment = segments[i];
            current = FindFolderByName(currentLevel, segment);
            if (current == null)
            {
                throw new AscetReadException("folder_not_found", "resolve_folder", "Folder '" + normalizedPath + "' was not found.");
            }

            currentLevel = InvokeFolderArray(current, new string[] { "GetAllAscetFolders", "GetAllFolders", "GetAllSubFolders", "GetSubFolders" });
        }

        return current;
    }

    private AscetFolder FindFolderByName(Array folders, string expectedName)
    {
        if (folders == null || String.IsNullOrWhiteSpace(expectedName))
        {
            return null;
        }

        for (int i = 0; i < folders.Length; i++)
        {
            AscetFolder folder = folders.GetValue(i) as AscetFolder;
            if (folder == null)
            {
                continue;
            }

            if (String.Equals(folder.GetName(), expectedName, StringComparison.Ordinal))
            {
                return folder;
            }
        }

        return null;
    }

    private Array InvokeFolderArray(object target, string[] methodNames)
    {
        if (target == null || methodNames == null)
        {
            return null;
        }

        for (int i = 0; i < methodNames.Length; i++)
        {
            string methodName = methodNames[i];
            if (String.IsNullOrWhiteSpace(methodName))
            {
                continue;
            }

            MethodInfo method = target.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
            if (method == null)
            {
                continue;
            }

            object value = method.Invoke(target, null);
            Array array = value as Array;
            if (array != null)
            {
                return array;
            }
        }

        return null;
    }

    private string NormalizeFolderPath(string folderPath)
    {
        string normalized = (folderPath ?? String.Empty).Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }

        while (normalized.EndsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(0, normalized.Length - 1);
        }

        return normalized;
    }
}

public sealed class DiagramCatalogService : AscetReadDomainServiceBase, IDiagramCatalogService
{
    public IList<AscetDiagramRef> ListDiagrams(AscetItemRef component)
    {
        return ExecuteWithSession("list_diagrams", delegate(AscetSession session)
        {
            CodeComponent codeComponent = ResolveCodeComponent(session, component);
            AscetDiagram[] diagrams = codeComponent.GetAllDiagrams();
            List<AscetDiagramRef> result = new List<AscetDiagramRef>();

            if (diagrams == null)
            {
                return result;
            }

            for (int i = 0; i < diagrams.Length; i++)
            {
                AscetDiagram diagram = diagrams[i];
                if (diagram == null)
                {
                    continue;
                }

                result.Add(new AscetDiagramRef
                {
                    Name = diagram.GetName(),
                    OwningComponentPath = component.Path,
                    DiagramKind = GetDiagramKind(diagram)
                });
            }

            return result;
        });
    }

    public AscetDiagramRef GetDiagramByName(AscetItemRef component, string diagramName)
    {
        return ExecuteWithSession("get_diagram_by_name", delegate(AscetSession session)
        {
            if (String.IsNullOrWhiteSpace(diagramName))
            {
                throw new AscetReadException("invalid_argument", "get_diagram_by_name", "Diagram name must not be empty.");
            }

            CodeComponent codeComponent = ResolveCodeComponent(session, component);
            AscetDiagram diagram = codeComponent.GetDiagramWithName(diagramName);
            if (diagram == null)
            {
                throw new AscetReadException(
                    "diagram_not_found",
                    "get_diagram_by_name",
                    "Diagram '" + diagramName + "' was not found in component '" + component.Path + "'.");
            }

            return new AscetDiagramRef
            {
                Name = diagram.GetName(),
                OwningComponentPath = component.Path,
                DiagramKind = GetDiagramKind(diagram)
            };
        });
    }
}

public sealed class BlockDiagramReadService : AscetReadDomainServiceBase, IBlockDiagramReadService
{
    public IList<AscetBlockElementRef> ListBlockDiagramElements(AscetItemRef component, string diagramName)
    {
        return GetBlockDiagramGraph(component, diagramName).Elements;
    }

    public IList<AscetBlockConnectionRef> ListBlockDiagramConnections(AscetItemRef component, string diagramName)
    {
        return GetBlockDiagramGraph(component, diagramName).Connections;
    }

    public AscetBlockDiagramGraph GetBlockDiagramGraph(AscetItemRef component, string diagramName)
    {
        return ExecuteWithSession("get_block_diagram_graph", delegate(AscetSession session)
        {
            if (component == null)
            {
                throw new AscetReadException("invalid_argument", "get_block_diagram_graph", "Component reference must not be null.");
            }

            AscetDiagram diagram = ResolveBlockDiagram(session, component, diagramName);
            BlockDiagramElement[] elements = GetAllBlockDiagramElements(diagram);
            BlockDiagramConnection[] connections = GetAllBlockDiagramConnections(diagram);

            List<AscetBlockElementRef> elementRefs = new List<AscetBlockElementRef>();
            List<AscetBlockPinRef> pins = new List<AscetBlockPinRef>();
            List<AscetSequenceCallRef> sequenceCalls = new List<AscetSequenceCallRef>();
            List<AscetBlockHierarchyPinRef> hierarchyInternalPins = new List<AscetBlockHierarchyPinRef>();
            List<AscetBlockConnectionRef> connectionRefs = new List<AscetBlockConnectionRef>();

            Dictionary<string, bool> seenPins = new Dictionary<string, bool>(StringComparer.Ordinal);
            Dictionary<string, bool> seenSequenceCalls = new Dictionary<string, bool>(StringComparer.Ordinal);
            Dictionary<string, bool> seenHierarchyPins = new Dictionary<string, bool>(StringComparer.Ordinal);

            if (elements != null)
            {
                for (int i = 0; i < elements.Length; i++)
                {
                    BlockDiagramElement element = elements[i];
                    if (element == null)
                    {
                        continue;
                    }

                    elementRefs.Add(BuildBlockElementRef(element));
                    CollectElementPins(element, pins, sequenceCalls, seenPins, seenSequenceCalls);
                    CollectHierarchyInternalPins(element, hierarchyInternalPins, seenHierarchyPins);
                }
            }

            if (connections != null)
            {
                for (int i = 0; i < connections.Length; i++)
                {
                    BlockDiagramConnection connection = connections[i];
                    if (connection == null)
                    {
                        continue;
                    }

                    connectionRefs.Add(BuildBlockConnectionRef(diagram.GetName(), connection, i));
                }
            }

            return new AscetBlockDiagramGraph
            {
                ComponentPath = component.Path,
                ComponentKind = component.Kind,
                DiagramName = diagram.GetName(),
                Elements = elementRefs,
                Pins = pins,
                SequenceCalls = sequenceCalls,
                HierarchyInternalPins = hierarchyInternalPins,
                Connections = connectionRefs
            };
        });
    }

    private void CollectElementPins(
        BlockDiagramElement element,
        IList<AscetBlockPinRef> pins,
        IList<AscetSequenceCallRef> sequenceCalls,
        IDictionary<string, bool> seenPins,
        IDictionary<string, bool> seenSequenceCalls)
    {
        BlockDiagramElementPin[] elementPins = GetAllBlockElementPins(element);
        if (elementPins == null)
        {
            return;
        }

        for (int i = 0; i < elementPins.Length; i++)
        {
            BlockDiagramElementPin elementPin = elementPins[i];
            AscetBlockPinRef pinRef = BuildBlockPinRef(elementPin);
            string pinKey = BuildBlockPinKey(pinRef);

            if (!String.IsNullOrEmpty(pinKey) && !seenPins.ContainsKey(pinKey))
            {
                seenPins[pinKey] = true;
                pins.Add(pinRef);
            }

            AscetSequenceCallRef sequenceCallRef = BuildSequenceCallRef(elementPin);
            if (sequenceCallRef == null || String.IsNullOrEmpty(sequenceCallRef.Id))
            {
                continue;
            }

            if (seenSequenceCalls.ContainsKey(sequenceCallRef.Id))
            {
                continue;
            }

            seenSequenceCalls[sequenceCallRef.Id] = true;
            sequenceCalls.Add(sequenceCallRef);
        }
    }

    private void CollectHierarchyInternalPins(
        BlockDiagramElement element,
        IList<AscetBlockHierarchyPinRef> hierarchyInternalPins,
        IDictionary<string, bool> seenHierarchyPins)
    {
        if (element == null || !element.IsBlockDiagramHierarchy())
        {
            return;
        }

        BlockDiagramHierarchy hierarchy = element as BlockDiagramHierarchy;
        if (hierarchy == null)
        {
            return;
        }

        BlockDiagramHierarchyPin[] internalPins = hierarchy.GetAllInternalPins();
        if (internalPins == null)
        {
            return;
        }

        for (int i = 0; i < internalPins.Length; i++)
        {
            AscetBlockHierarchyPinRef internalPinRef = BuildHierarchyInternalPinRef(hierarchy, internalPins[i]);
            string internalPinKey = BuildHierarchyInternalPinKey(internalPinRef);

            if (String.IsNullOrEmpty(internalPinKey) || seenHierarchyPins.ContainsKey(internalPinKey))
            {
                continue;
            }

            seenHierarchyPins[internalPinKey] = true;
            hierarchyInternalPins.Add(internalPinRef);
        }
    }

    private AscetBlockConnectionRef BuildBlockConnectionRef(string diagramName, BlockDiagramConnection connection, int index)
    {
        return new AscetBlockConnectionRef
        {
            Id = (diagramName ?? String.Empty) + ":" + index.ToString(),
            DiagramName = diagramName,
            ConnectionTypeRaw = connection.GetConnectionType(),
            ConnectionType = GetBlockConnectionSemantic(connection.GetConnectionType()),
            Source = BuildBlockPinRef(connection.GetOutputPin()),
            Target = BuildBlockPinRef(connection.GetInputPin()),
            SegmentPoints = BuildSegmentPoints(connection)
        };
    }
}

public class MethodCatalogService : AscetReadDomainServiceBase, IMethodCatalogService, IMethodCodeService
{
    public IList<AscetMethodRef> ListMethods(AscetItemRef component)
    {
        return ExecuteWithSession("list_methods", delegate(AscetSession session)
        {
            IList<MethodHandle> methodHandles = CollectMethodHandles(session, component);
            List<AscetMethodRef> refs = new List<AscetMethodRef>();

            for (int i = 0; i < methodHandles.Count; i++)
            {
                refs.Add(methodHandles[i].Reference);
            }

            return AscetReadDomainUtilities.DistinctMethods(refs);
        });
    }

    public AscetMethodRef GetMethod(string componentPath, string methodName)
    {
        return ExecuteWithSession("get_method", delegate(AscetSession session)
        {
            if (String.IsNullOrWhiteSpace(methodName))
            {
                throw new AscetReadException("invalid_argument", "get_method", "Method name must not be empty.");
            }

            DataBaseItem item = ResolveItemByPath(session, componentPath);
            AscetItemRef component = Classifier.ToItemRef(item);
            MethodHandle method = FindMethodHandle(CollectMethodHandles(session, component), component.Path, methodName);
            return method.Reference;
        });
    }

    public AscetMethodCode GetMethodCode(AscetItemRef component, string methodName)
    {
        return ExecuteWithSession("get_method_code", delegate(AscetSession session)
        {
            if (String.IsNullOrWhiteSpace(methodName))
            {
                throw new AscetReadException("invalid_argument", "get_method_code", "Method name must not be empty.");
            }

            MethodHandle method = FindMethodHandle(CollectMethodHandles(session, component), component.Path, methodName);
            return BuildMethodCode(component, method);
        });
    }

    public IList<AscetMethodCode> GetAllMethodCodes(AscetItemRef component)
    {
        return ExecuteWithSession("get_all_method_codes", delegate(AscetSession session)
        {
            IList<MethodHandle> methodHandles = CollectMethodHandles(session, component);
            List<AscetMethodCode> codes = new List<AscetMethodCode>();

            for (int i = 0; i < methodHandles.Count; i++)
            {
                codes.Add(BuildMethodCode(component, methodHandles[i]));
            }

            return codes;
        });
    }

    protected AscetMethodCode BuildMethodCode(AscetItemRef component, MethodHandle method)
    {
        return new AscetMethodCode
        {
            ComponentPath = component.Path,
            ComponentKind = component.Kind,
            LanguageKind = component.LanguageKind,
            MethodName = method.Reference.Name,
            MethodKind = method.Reference.MethodKind,
            Code = method.Method.GetCode()
        };
    }

    protected IList<MethodHandle> CollectMethodHandles(AscetSession session, AscetItemRef component)
    {
        if (component == null)
        {
            throw new AscetReadException("invalid_argument", "collect_method_handles", "Component reference must not be null.");
        }

        CodeComponent codeComponent = ResolveCodeComponent(session, component);
        AscetDiagram[] diagrams = codeComponent.GetAllDiagrams();
        List<MethodHandle> handles = new List<MethodHandle>();
        Dictionary<string, bool> seen = new Dictionary<string, bool>(StringComparer.Ordinal);

        if (diagrams == null)
        {
            return handles;
        }

        for (int i = 0; i < diagrams.Length; i++)
        {
            AscetDiagram diagram = diagrams[i];
            if (diagram == null)
            {
                continue;
            }

            AddMethodsFromDiagram(component.Path, diagram, handles, seen);
        }

        return handles;
    }

    protected void AddMethodsFromDiagram(string componentPath, AscetDiagram diagram, IList<MethodHandle> handles, IDictionary<string, bool> seen)
    {
        if (diagram.IsDiscreteMethodDiagram())
        {
            DiscreteMethodDiagram discreteDiagram = diagram as DiscreteMethodDiagram;
            if (discreteDiagram == null)
            {
                throw new AscetReadException("unsupported_diagram_kind", "list_methods", "Failed to cast discrete method diagram '" + diagram.GetName() + "'.");
            }

            AddMethods(componentPath, discreteDiagram.GetAllMethods(), handles, seen);
            return;
        }

        if (diagram.IsContinuousMethodDiagram())
        {
            ContinuousMethodDiagram continuousDiagram = diagram as ContinuousMethodDiagram;
            if (continuousDiagram == null)
            {
                throw new AscetReadException("unsupported_diagram_kind", "list_methods", "Failed to cast continuous method diagram '" + diagram.GetName() + "'.");
            }

            AddMethods(componentPath, continuousDiagram.GetAllMethods(), handles, seen);
            return;
        }

        if (diagram.IsProcessDiagram())
        {
            ProcessDiagram processDiagram = diagram as ProcessDiagram;
            if (processDiagram == null)
            {
                throw new AscetReadException("unsupported_diagram_kind", "list_methods", "Failed to cast process diagram '" + diagram.GetName() + "'.");
            }

            AddMethods(componentPath, processDiagram.GetAllMethods(), handles, seen);
            AddMethods(componentPath, processDiagram.GetAllProcesses(), handles, seen);
            return;
        }

        if (diagram.IsActionConditionDiagram())
        {
            ActionConditionDiagram actionConditionDiagram = diagram as ActionConditionDiagram;
            if (actionConditionDiagram == null)
            {
                throw new AscetReadException("unsupported_diagram_kind", "list_methods", "Failed to cast action-condition diagram '" + diagram.GetName() + "'.");
            }

            AddMethods(componentPath, actionConditionDiagram.GetAllActions(), handles, seen);
            AddMethods(componentPath, actionConditionDiagram.GetAllConditions(), handles, seen);
            return;
        }

        if (diagram.IsStateMachineDiagram())
        {
            StateMachineDiagram stateMachineDiagram = diagram as StateMachineDiagram;
            if (stateMachineDiagram == null)
            {
                throw new AscetReadException("unsupported_diagram_kind", "list_methods", "Failed to cast state-machine diagram '" + diagram.GetName() + "'.");
            }

            AddMethods(componentPath, stateMachineDiagram.GetAllTriggers(), handles, seen);
        }
    }

    protected void AddMethods(string componentPath, AbstractMethod[] methods, IList<MethodHandle> handles, IDictionary<string, bool> seen)
    {
        if (methods == null)
        {
            return;
        }

        for (int i = 0; i < methods.Length; i++)
        {
            AddMethod(componentPath, methods[i], handles, seen);
        }
    }

    protected void AddMethods(string componentPath, DiscreteMethod[] methods, IList<MethodHandle> handles, IDictionary<string, bool> seen)
    {
        if (methods == null)
        {
            return;
        }

        for (int i = 0; i < methods.Length; i++)
        {
            AddMethod(componentPath, methods[i], handles, seen);
        }
    }

    protected void AddMethods(string componentPath, ContinuousMethod[] methods, IList<MethodHandle> handles, IDictionary<string, bool> seen)
    {
        if (methods == null)
        {
            return;
        }

        for (int i = 0; i < methods.Length; i++)
        {
            AddMethod(componentPath, methods[i], handles, seen);
        }
    }

    protected void AddMethods(string componentPath, AscetAction[] methods, IList<MethodHandle> handles, IDictionary<string, bool> seen)
    {
        if (methods == null)
        {
            return;
        }

        for (int i = 0; i < methods.Length; i++)
        {
            AddMethod(componentPath, methods[i], handles, seen);
        }
    }

    protected void AddMethods(string componentPath, Condition[] methods, IList<MethodHandle> handles, IDictionary<string, bool> seen)
    {
        if (methods == null)
        {
            return;
        }

        for (int i = 0; i < methods.Length; i++)
        {
            AddMethod(componentPath, methods[i], handles, seen);
        }
    }

    protected void AddMethods(string componentPath, Trigger[] methods, IList<MethodHandle> handles, IDictionary<string, bool> seen)
    {
        if (methods == null)
        {
            return;
        }

        for (int i = 0; i < methods.Length; i++)
        {
            AddMethod(componentPath, methods[i], handles, seen);
        }
    }

    protected void AddMethod(string componentPath, AbstractMethod method, IList<MethodHandle> handles, IDictionary<string, bool> seen)
    {
        if (method == null)
        {
            return;
        }

        AscetMethodRef methodRef = new AscetMethodRef
        {
            Name = method.GetName(),
            MethodKind = GetMethodKind(method),
            OwningComponentPath = componentPath
        };

        string key = AscetReadDomainUtilities.BuildMethodKey(methodRef.Name, methodRef.MethodKind, methodRef.OwningComponentPath);
        if (seen.ContainsKey(key))
        {
            return;
        }

        seen[key] = true;
        handles.Add(new MethodHandle
        {
            Reference = methodRef,
            Method = method
        });
    }

    protected MethodHandle FindMethodHandle(IList<MethodHandle> methods, string componentPath, string methodName)
    {
        MethodHandle match = null;

        for (int i = 0; i < methods.Count; i++)
        {
            MethodHandle candidate = methods[i];
            if (!String.Equals(candidate.Reference.Name, methodName, StringComparison.Ordinal))
            {
                continue;
            }

            if (match != null)
            {
                throw new AscetReadException(
                    "method_ambiguous",
                    "find_method_handle",
                    "Method '" + methodName + "' is ambiguous in component '" + componentPath + "'.");
            }

            match = candidate;
        }

        if (match == null)
        {
            throw new AscetReadException(
                "method_not_found",
                "find_method_handle",
                "Method '" + methodName + "' was not found in component '" + componentPath + "'.");
        }

        return match;
    }

    protected sealed class MethodHandle
    {
        public AscetMethodRef Reference { get; set; }
        public AbstractMethod Method { get; set; }
    }
}

public sealed class MethodWriteService : MethodCatalogService, IMethodWriteService
{
    public AscetMethodWriteResult SetMethodCode(AscetItemRef component, string methodName, string code, bool verifyReadback)
    {
        if (component == null)
        {
            throw new AscetReadException("invalid_argument", "set_method_code", "Component reference must not be null.");
        }

        if (String.IsNullOrWhiteSpace(methodName))
        {
            throw new AscetReadException("invalid_argument", "set_method_code", "Method name must not be empty.");
        }

        if (code == null)
        {
            throw new AscetReadException("invalid_argument", "set_method_code", "Code must not be null.");
        }

        AscetMethodRef resolvedMethod = null;
        string previousCode = String.Empty;
        ExecuteWithSession("set_method_code", delegate(AscetSession session)
        {
            MethodHandle method = FindMethodHandle(CollectMethodHandles(session, component), component.Path, methodName);
            resolvedMethod = method.Reference;
            previousCode = method.Method.GetCode() ?? String.Empty;
            RequireComponentEditableInSession(session, component.Path, "set_method_code");
            bool writeSucceeded = method.Method.SetCode(code);

            if (!writeSucceeded)
            {
                throw new AscetReadException(
                    "set_code_failed",
                    "set_method_code",
                    "ASCET returned false while writing method '" + methodName + "' in component '" + component.Path + "'.");
            }

            return true;
        });

        bool readbackVerified = !verifyReadback;
        if (verifyReadback)
        {
            string readbackCode = ExecuteWithSession("verify_method_code_readback", delegate(AscetSession session)
            {
                MethodHandle readbackMethod = FindMethodHandle(CollectMethodHandles(session, component), component.Path, methodName);
                return readbackMethod.Method.GetCode() ?? String.Empty;
            });

            readbackVerified = String.Equals(readbackCode, code, StringComparison.Ordinal);
            if (!readbackVerified)
            {
                throw new AscetReadException(
                    "readback_mismatch",
                    "set_method_code",
                    "Readback verification failed for method '" + methodName + "' in component '" + component.Path + "'.");
            }
        }

        return new AscetMethodWriteResult
        {
            ComponentPath = component.Path,
            ComponentKind = component.Kind,
            LanguageKind = component.LanguageKind,
            MethodName = resolvedMethod == null ? methodName : (resolvedMethod.Name ?? methodName),
            MethodKind = resolvedMethod == null ? AscetMethodKind.Unknown : resolvedMethod.MethodKind,
            PreviousCodeLength = previousCode.Length,
            NewCodeLength = code.Length,
            WriteSucceeded = true,
            VerifyReadbackRequested = verifyReadback,
            ReadbackVerified = readbackVerified
        };
    }

    internal AscetMethodWriteResult SetMethodCodeInSession(AscetSession session, AscetItemRef component, string methodName, string code, bool verifyReadback)
    {
        if (session == null)
        {
            throw new ArgumentNullException("session");
        }

        if (component == null)
        {
            throw new AscetReadException("invalid_argument", "set_method_code", "Component reference must not be null.");
        }

        if (String.IsNullOrWhiteSpace(methodName))
        {
            throw new AscetReadException("invalid_argument", "set_method_code", "Method name must not be empty.");
        }

        if (code == null)
        {
            throw new AscetReadException("invalid_argument", "set_method_code", "Code must not be null.");
        }

        AscetMethodRef resolvedMethod = null;
        string previousCode = String.Empty;
        ExecuteWithBoundSession("set_method_code", session, delegate(AscetSession currentSession)
        {
            MethodHandle method = FindMethodHandle(CollectMethodHandles(currentSession, component), component.Path, methodName);
            resolvedMethod = method.Reference;
            previousCode = method.Method.GetCode() ?? String.Empty;
            RequireComponentEditableInSession(currentSession, component.Path, "set_method_code");
            bool writeSucceeded = method.Method.SetCode(code);

            if (!writeSucceeded)
            {
                throw new AscetReadException(
                    "set_code_failed",
                    "set_method_code",
                    "ASCET returned false while writing method '" + methodName + "' in component '" + component.Path + "'.");
            }

            return true;
        });

        bool readbackVerified = !verifyReadback;
        if (verifyReadback)
        {
            string readbackCode = ExecuteWithBoundSession("verify_method_code_readback", session, delegate(AscetSession currentSession)
            {
                MethodHandle readbackMethod = FindMethodHandle(CollectMethodHandles(currentSession, component), component.Path, methodName);
                return readbackMethod.Method.GetCode() ?? String.Empty;
            });

            readbackVerified = String.Equals(readbackCode, code, StringComparison.Ordinal);
            if (!readbackVerified)
            {
                throw new AscetReadException(
                    "readback_mismatch",
                    "set_method_code",
                    "Readback verification failed for method '" + methodName + "' in component '" + component.Path + "'.");
            }
        }

        return new AscetMethodWriteResult
        {
            ComponentPath = component.Path,
            ComponentKind = component.Kind,
            LanguageKind = component.LanguageKind,
            MethodName = resolvedMethod == null ? methodName : resolvedMethod.Name,
            MethodKind = resolvedMethod == null ? AscetMethodKind.Unknown : resolvedMethod.MethodKind,
            PreviousCodeLength = previousCode.Length,
            NewCodeLength = code.Length,
            WriteSucceeded = true,
            VerifyReadbackRequested = verifyReadback,
            ReadbackVerified = readbackVerified
        };
    }
}

public sealed class TextCodeService : AscetReadDomainServiceBase, ITextCodeService
{
    public AscetTextCode GetTextCode(AscetItemRef component)
    {
        return ExecuteWithSession("get_text_code", delegate(AscetSession session)
        {
            if (component == null)
            {
                throw new AscetReadException("invalid_argument", "get_text_code", "Component reference must not be null.");
            }

            if (component.LanguageKind != AscetLanguageKind.C)
            {
                throw new AscetReadException(
                    "text_code_not_supported",
                    "get_text_code",
                    "Textual C code is only available for C components. Component '" + component.Path + "' is '" + component.LanguageKind.ToString() + "'.");
            }

            FunctionalComponent functionalComponent = ResolveFunctionalComponent(session, component);
            return new AscetTextCode
            {
                ComponentPath = component.Path,
                ComponentKind = component.Kind,
                LanguageKind = component.LanguageKind,
                HeaderCode = functionalComponent.GetHeader(),
                ExternalCCode = functionalComponent.GetExternalCCode()
            };
        });
    }
}

public sealed class StateMachineReadService : AscetReadDomainServiceBase, IStateMachineReadService
{
    public IList<AscetStateMachineElementRef> ListStateMachineElements(AscetItemRef stateMachine)
    {
        return ExecuteWithSession("list_state_machine_elements", delegate(AscetSession session)
        {
            StateMachineDiagram diagram = ResolveStateMachineDiagram(session, stateMachine);
            List<AscetStateMachineElementRef> elements = new List<AscetStateMachineElementRef>();
            StateMachineDiagramElement[] diagramElements = diagram.GetAllDiagramElements();

            if (diagramElements != null)
            {
                for (int i = 0; i < diagramElements.Length; i++)
                {
                    StateMachineDiagramElement diagramElement = diagramElements[i];
                    if (diagramElement == null)
                    {
                        continue;
                    }

                    AbstractStateMachineElement abstractElement = diagramElement as AbstractStateMachineElement;
                    elements.Add(new AscetStateMachineElementRef
                    {
                        Name = diagramElement.GetName(),
                        Kind = GetElementKind(abstractElement)
                    });
                }
            }

            Transition[] transitions = diagram.GetAllTransitions();
            if (transitions != null)
            {
                for (int i = 0; i < transitions.Length; i++)
                {
                    AscetTransitionRef transition = BuildTransitionRef(transitions[i]);
                    elements.Add(new AscetStateMachineElementRef
                    {
                        Name = transition.Name,
                        Kind = AscetStateMachineElementKind.Transition,
                        SourceName = transition.SourceName,
                        TargetName = transition.TargetName
                    });
                }
            }

            return elements;
        });
    }

    public IList<AscetStateRef> ListStates(AscetItemRef stateMachine)
    {
        return ExecuteWithSession("list_states", delegate(AscetSession session)
        {
            StateMachineDiagram diagram = ResolveStateMachineDiagram(session, stateMachine);
            State[] states = diagram.GetAllStates();
            List<AscetStateRef> result = new List<AscetStateRef>();

            if (states == null)
            {
                return result;
            }

            for (int i = 0; i < states.Length; i++)
            {
                State state = states[i];
                if (state == null)
                {
                    continue;
                }

                result.Add(new AscetStateRef
                {
                    Name = state.GetName(),
                    Kind = GetStateKind(state)
                });
            }

            return result;
        });
    }

    public IList<AscetTransitionRef> ListTransitions(AscetItemRef stateMachine)
    {
        return ExecuteWithSession("list_transitions", delegate(AscetSession session)
        {
            StateMachineDiagram diagram = ResolveStateMachineDiagram(session, stateMachine);
            Transition[] transitions = diagram.GetAllTransitions();
            List<AscetTransitionRef> result = new List<AscetTransitionRef>();

            if (transitions == null)
            {
                return result;
            }

            for (int i = 0; i < transitions.Length; i++)
            {
                AscetTransitionRef transitionRef = BuildTransitionRef(transitions[i]);
                if (transitionRef != null)
                {
                    result.Add(transitionRef);
                }
            }

            return result;
        });
    }

    private AscetStateMachineElementKind GetElementKind(AbstractStateMachineElement element)
    {
        if (element == null)
        {
            return AscetStateMachineElementKind.Unknown;
        }

        if (element.IsStateMachinePin())
        {
            return AscetStateMachineElementKind.Pin;
        }

        if (element.IsHierarchyState())
        {
            return AscetStateMachineElementKind.HierarchyState;
        }

        if (element.IsState())
        {
            return AscetStateMachineElementKind.State;
        }

        if (element.IsTransition())
        {
            return AscetStateMachineElementKind.Transition;
        }

        return AscetStateMachineElementKind.Unknown;
    }
}
