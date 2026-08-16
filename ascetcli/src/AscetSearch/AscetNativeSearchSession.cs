using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using de.etas.cebra.socket;
using de.etas.cebra.toolAPI;
using de.etas.cebra.toolAPI.Common;
using de.etas.types;
using AscetTool = de.etas.cebra.toolAPI.Ascet.Ascet;

public sealed class AscetNativeSearchSession : IDisposable
{
    private const int WmSetText = 0x000C;
    private const int WmGetText = 0x000D;
    private const string FindWindowTitlePrefix = "Find (ESDL";

    private readonly int _ascetProcessId;
    private readonly AscetTool _tool;
    private readonly Identifiable _mainView;
    private readonly Identifiable _browseManager;
    private bool _disposed;

    private delegate bool EnumWindowsProc(IntPtr window, IntPtr parameter);

    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr parameter);
    [DllImport("user32.dll")]
    private static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc callback, IntPtr parameter);
    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr window, int command);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetWindowText(IntPtr window, StringBuilder text, int count);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetClassName(IntPtr window, StringBuilder text, int count);
    [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "SendMessageW")]
    private static extern IntPtr SendMessageSetText(IntPtr window, int message, IntPtr wParam, string lParam);
    [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "SendMessageW")]
    private static extern IntPtr SendMessageGetText(IntPtr window, int message, IntPtr wParam, StringBuilder lParam);

    public AscetNativeSearchSession(int ascetProcessId)
    {
        _ascetProcessId = ascetProcessId;
        _tool = new AscetTool();
        try
        {
            View facade = _tool.GetComponentManagerWindow();
            if (facade == null)
                throw new InvalidOperationException("ASCET Component Manager is not available.");
            _mainView = InstVarAt((Identifiable)facade, 2);
            _browseManager = InstVarAt(_mainView, 18);
        }
        catch
        {
            _tool.DisconnectFromTool();
            throw;
        }
    }

    public AscetSearchResponse Execute(
        SearchTypeDefinition definition,
        string query,
        int timeoutMilliseconds,
        int maxResults,
        bool keepUi)
    {
        EnsureNotDisposed();
        if (definition.Engine == "SGFindReplaceWindow")
            return ExecuteTextSearch(definition, query, timeoutMilliseconds, maxResults, keepUi);
        return ExecuteBrowseSearch(definition, query, timeoutMilliseconds, maxResults, keepUi);
    }

    public void Dispose()
    {
        if (_disposed)
            return;
        _disposed = true;
        _tool.DisconnectFromTool();
    }

    private AscetSearchResponse ExecuteBrowseSearch(
        SearchTypeDefinition definition,
        string query,
        int timeoutMilliseconds,
        int maxResults,
        bool keepUi)
    {
        HashSet<long> childIdentifiersBefore = GetChildIdentifiers();
        HashSet<IntPtr> topWindowsBefore = keepUi ? null : GetTopWindowHandles();
        InstanceMethodCall search = new InstanceMethodCall(_browseManager, definition.Selector, _tool);
        search.appendParameter(_mainView);
        search.appendParameter(query);

        Stopwatch timer = Stopwatch.StartNew();
        _tool.call(search, true);
        timer.Stop();

        Identifiable resultWindow = WaitForNewListWindow(
            childIdentifiersBefore,
            Math.Min(timeoutMilliseconds, 5000));
        AscetSearchResponse response = CreateResponse(definition, query, timer.ElapsedMilliseconds);
        if (resultWindow == null)
        {
            response.NativeUiActivated = false;
            response.ResultCount = 0;
            response.ReturnedCount = 0;
            return response;
        }

        response.NativeUiActivated = true;
        if (!keepUi)
            HideNewBrowseWindows(topWindowsBefore);
        try
        {
            Identifiable[] items = GetRemoteObjects(SendRemote(resultWindow, "items"));
            response.ResultCount = items.Length;
            int count = GetReturnedCount(items.Length, maxResults);
            for (int i = 0; i < count; i++)
            {
                response.Results.Add(new AscetSearchResultItem
                {
                    RemoteClass = RemoteClassName(items[i]),
                    Label = TrySendString(items[i], "longLabel")
                });
            }
            response.ReturnedCount = response.Results.Count;
            response.Truncated = response.ReturnedCount < response.ResultCount;
            return response;
        }
        finally
        {
            if (!keepUi)
                TrySendVoid(resultWindow, "close");
        }
    }
    private AscetSearchResponse ExecuteTextSearch(
        SearchTypeDefinition definition,
        string query,
        int timeoutMilliseconds,
        int maxResults,
        bool keepUi)
    {
        Identifiable findWindow = FindChildByClass("SGFindReplaceWindow");
        if (findWindow == null)
        {
            SendVoid(_browseManager, "menuFind");
            findWindow = WaitForChildByClass("SGFindReplaceWindow", Math.Min(timeoutMilliseconds, 5000));
        }
        if (findWindow == null)
            throw new InvalidOperationException("The native Text in ESDL or C code Search window was not created.");
        if (SendBoolean(findWindow, "findProcessAlive"))
            throw new InvalidOperationException("A native Text in ESDL or C code search is already running.");

        IntPtr findTopWindow;
        IntPtr edit = WaitForFindWhatEdit(Math.Min(timeoutMilliseconds, 5000), out findTopWindow);
        if (edit == IntPtr.Zero)
            throw new InvalidOperationException("The native Search Find what control was not found.");
        if (!keepUi && findTopWindow != IntPtr.Zero)
            ShowWindow(findTopWindow, 0);
        SendMessageSetText(edit, WmSetText, IntPtr.Zero, query);
        Thread.Sleep(100);
        string actualQuery = ReadControlText(edit);
        if (!String.Equals(actualQuery, query, StringComparison.Ordinal))
            throw new InvalidOperationException("ASCET did not retain the requested text search query.");

        Identifiable findWhatComboBox = SendRemote(findWindow, "findWhatString");
        SendFindChange(findWindow, findWhatComboBox);
        Thread.Sleep(100);
        if (!SendBoolean(findWindow, "findPossible"))
            throw new InvalidOperationException("The native Find action remained disabled after setting the query.");

        try
        {
            Stopwatch timer = Stopwatch.StartNew();
            SendVoid(findWindow, "findNextButtonActivate");
            WaitForTextSearch(findWindow, timeoutMilliseconds, timer);
            timer.Stop();

            Identifiable[] results = GetRemoteObjects(SendRemote(findWindow, "findResults"));
            AscetSearchResponse response = CreateResponse(definition, query, timer.ElapsedMilliseconds);
            response.NativeUiActivated = true;
            response.ResultCount = results.Length;
            int count = GetReturnedCount(results.Length, maxResults);
            for (int i = 0; i < count; i++)
                response.Results.Add(ReadTextResult(results[i]));
            response.ReturnedCount = response.Results.Count;
            response.Truncated = response.ReturnedCount < response.ResultCount;
            return response;
        }
        finally
        {
            if (!keepUi)
                TrySendVoid(findWindow, "closeDialog");
        }
    }
    private AscetSearchResultItem ReadTextResult(Identifiable result)
    {
        AscetSearchResultItem item = new AscetSearchResultItem();
        item.RemoteClass = RemoteClassName(result);
        item.CodeLine = TrySendString(result, "codeLine");
        item.LineInfo = TrySendString(result, "printLineInfoCellValue");
        item.TypeInfo = TrySendString(result, "printTypeInfoCellValue");
        item.SelectionBegin = TrySendInteger(result, "selectionBegin");
        item.SelectionEnd = TrySendInteger(result, "selectionEnd");
        Identifiable component = TrySendRemote(result, "component");
        if (component != null)
        {
            item.Component = TrySendString(component, "name");
            if (String.IsNullOrEmpty(item.Component))
                item.Component = NormalizeComponentLabel(TrySendString(component, "printString"));
        }
        item.Label = BuildTextResultLabel(item);
        return item;
    }

    private static string NormalizeComponentLabel(string value)
    {
        if (String.IsNullOrWhiteSpace(value))
            return value;
        string trimmed = value.Trim();
        const string prefix = "a SGClass: ";
        return trimmed.StartsWith(prefix, StringComparison.Ordinal) ? trimmed.Substring(prefix.Length).Trim() : trimmed;
    }

    private static string BuildTextResultLabel(AscetSearchResultItem item)
    {
        StringBuilder label = new StringBuilder();
        if (!String.IsNullOrEmpty(item.Component))
            label.Append(item.Component);
        if (!String.IsNullOrEmpty(item.TypeInfo))
        {
            if (label.Length > 0)
                label.Append(" - ");
            label.Append(item.TypeInfo.Trim());
        }
        if (!String.IsNullOrEmpty(item.LineInfo))
        {
            if (label.Length > 0)
                label.Append(" - ");
            label.Append(item.LineInfo.Trim());
        }
        return label.Length == 0 ? item.CodeLine : label.ToString();
    }

    private AscetSearchResponse CreateResponse(SearchTypeDefinition definition, string query, long elapsedMilliseconds)
    {
        AscetSearchResponse response = new AscetSearchResponse();
        response.Mode = definition.Mode;
        response.Query = query;
        response.SearchElapsedMilliseconds = elapsedMilliseconds;
        return response;
    }

    private Identifiable WaitForNewListWindow(HashSet<long> identifiersBefore, int timeoutMilliseconds)
    {
        Stopwatch timer = Stopwatch.StartNew();
        while (true)
        {
            Identifiable[] children = GetChildren();
            for (int i = children.Length - 1; i >= 0; i--)
            {
                if (identifiersBefore.Contains(children[i].getIdentifier()))
                    continue;
                string className = RemoteClassName(children[i]);
                if (className.StartsWith("SGList", StringComparison.Ordinal) && className.EndsWith("Window", StringComparison.Ordinal))
                    return children[i];
            }
            if (timer.ElapsedMilliseconds >= timeoutMilliseconds)
                return null;
            Thread.Sleep(50);
        }
    }

    private Identifiable WaitForChildByClass(string expectedClass, int timeoutMilliseconds)
    {
        Stopwatch timer = Stopwatch.StartNew();
        while (true)
        {
            Identifiable child = FindChildByClass(expectedClass);
            if (child != null)
                return child;
            if (timer.ElapsedMilliseconds >= timeoutMilliseconds)
                return null;
            Thread.Sleep(50);
        }
    }

    private void WaitForTextSearch(Identifiable findWindow, int timeoutMilliseconds, Stopwatch overallTimer)
    {
        bool observedRunning = false;
        while (true)
        {
            bool running = SendBoolean(findWindow, "findProcessAlive");
            if (running)
                observedRunning = true;
            else if (observedRunning || overallTimer.ElapsedMilliseconds >= 250)
                return;
            if (overallTimer.ElapsedMilliseconds >= timeoutMilliseconds)
                throw new TimeoutException("The native text search exceeded " + timeoutMilliseconds + " ms.");
            Thread.Sleep(100);
        }
    }

    private IntPtr WaitForFindWhatEdit(int timeoutMilliseconds, out IntPtr topWindow)
    {
        Stopwatch timer = Stopwatch.StartNew();
        while (true)
        {
            IntPtr edit = FindFindWhatEdit(out topWindow);
            if (edit != IntPtr.Zero)
                return edit;
            if (timer.ElapsedMilliseconds >= timeoutMilliseconds)
            {
                topWindow = IntPtr.Zero;
                return IntPtr.Zero;
            }
            Thread.Sleep(50);
        }
    }

    private IntPtr FindFindWhatEdit(out IntPtr topWindow)
    {
        IntPtr result = IntPtr.Zero;
        IntPtr matchedTop = IntPtr.Zero;
        EnumWindows(delegate(IntPtr top, IntPtr ignored)
        {
            uint owner;
            GetWindowThreadProcessId(top, out owner);
            if (owner != (uint)_ascetProcessId || !WindowText(top).StartsWith(FindWindowTitlePrefix, StringComparison.OrdinalIgnoreCase))
                return true;

            matchedTop = top;
            EnumChildWindows(top, delegate(IntPtr child, IntPtr childIgnored)
            {
                if (WindowClassName(child) != "ComboBox")
                    return true;
                EnumChildWindows(child, delegate(IntPtr nested, IntPtr nestedIgnored)
                {
                    if (WindowClassName(nested) == "Edit")
                    {
                        result = nested;
                        return false;
                    }
                    return true;
                }, IntPtr.Zero);
                return result == IntPtr.Zero;
            }, IntPtr.Zero);
            return false;
        }, IntPtr.Zero);
        topWindow = matchedTop;
        return result;
    }

    private HashSet<IntPtr> GetTopWindowHandles()
    {
        HashSet<IntPtr> handles = new HashSet<IntPtr>();
        EnumWindows(delegate(IntPtr window, IntPtr ignored)
        {
            uint owner;
            GetWindowThreadProcessId(window, out owner);
            if (owner == (uint)_ascetProcessId)
                handles.Add(window);
            return true;
        }, IntPtr.Zero);
        return handles;
    }

    private void HideNewBrowseWindows(HashSet<IntPtr> handlesBefore)
    {
        EnumWindows(delegate(IntPtr window, IntPtr ignored)
        {
            uint owner;
            GetWindowThreadProcessId(window, out owner);
            if (owner == (uint)_ascetProcessId && !handlesBefore.Contains(window) && WindowText(window).StartsWith("Browse ", StringComparison.OrdinalIgnoreCase))
                ShowWindow(window, 0);
            return true;
        }, IntPtr.Zero);
    }
    private static string ReadControlText(IntPtr window)
    {
        StringBuilder text = new StringBuilder(4096);
        SendMessageGetText(window, WmGetText, new IntPtr(text.Capacity), text);
        return text.ToString();
    }

    private static string WindowText(IntPtr window)
    {
        StringBuilder text = new StringBuilder(1024);
        GetWindowText(window, text, text.Capacity);
        return text.ToString();
    }

    private static string WindowClassName(IntPtr window)
    {
        StringBuilder text = new StringBuilder(256);
        GetClassName(window, text, text.Capacity);
        return text.ToString();
    }

    private HashSet<long> GetChildIdentifiers()
    {
        HashSet<long> identifiers = new HashSet<long>();
        Identifiable[] children = GetChildren();
        for (int i = 0; i < children.Length; i++)
            identifiers.Add(children[i].getIdentifier());
        return identifiers;
    }

    private Identifiable[] GetChildren()
    {
        return GetRemoteObjects(InstVarAt(_mainView, 2));
    }

    private Identifiable FindChildByClass(string expectedClass)
    {
        Identifiable[] children = GetChildren();
        for (int i = children.Length - 1; i >= 0; i--)
        {
            if (RemoteClassName(children[i]) == expectedClass)
                return children[i];
        }
        return null;
    }

    private Identifiable[] GetRemoteObjects(Identifiable collectionHandle)
    {
        object[] values = _tool.getObjectsFromCollection(new Collection(_tool, collectionHandle));
        Identifiable[] result = new Identifiable[values.Length];
        for (int i = 0; i < values.Length; i++)
        {
            result[i] = values[i] as Identifiable;
            if (result[i] == null)
                throw new InvalidOperationException("ASCET returned a non-remote value in a remote collection.");
        }
        return result;
    }

    private Identifiable InstVarAt(Identifiable target, int index)
    {
        InstanceMethodCall call = new InstanceMethodCall(target, "instVarAt:", _tool);
        call.appendParameter(index);
        _tool.call(call, true);
        return call.ResultRemoteObject;
    }

    private void SendFindChange(Identifiable findWindow, Identifiable comboBox)
    {
        InstanceMethodCall call = new InstanceMethodCall(findWindow, "findChange:clientData:callData:", _tool);
        call.appendParameter(comboBox);
        call.appendParameter();
        call.appendParameter();
        _tool.call(call, true);
    }

    private void SendVoid(Identifiable target, string selector)
    {
        InstanceMethodCall call = new InstanceMethodCall(target, selector, _tool);
        _tool.call(call, true);
    }

    private void TrySendVoid(Identifiable target, string selector)
    {
        try
        {
            SendVoid(target, selector);
        }
        catch
        {
        }
    }

    private Identifiable SendRemote(Identifiable target, string selector)
    {
        InstanceMethodCall call = new InstanceMethodCall(target, selector, _tool);
        _tool.call(call, true);
        return call.ResultRemoteObject;
    }

    private Identifiable TrySendRemote(Identifiable target, string selector)
    {
        try
        {
            return SendRemote(target, selector);
        }
        catch
        {
            return null;
        }
    }

    private string TrySendString(Identifiable target, string selector)
    {
        try
        {
            InstanceMethodCall call = new InstanceMethodCall(target, selector, _tool);
            _tool.call(call, true);
            return call.ResultString;
        }
        catch
        {
            return null;
        }
    }

    private int? TrySendInteger(Identifiable target, string selector)
    {
        try
        {
            InstanceMethodCall call = new InstanceMethodCall(target, selector, _tool);
            _tool.call(call, true);
            return call.ResultInteger;
        }
        catch
        {
            return null;
        }
    }

    private bool SendBoolean(Identifiable target, string selector)
    {
        InstanceMethodCall call = new InstanceMethodCall(target, selector, _tool);
        _tool.call(call, true);
        return call.ResultBoolean;
    }

    private string RemoteClassName(Identifiable target)
    {
        InstanceMethodCall call = new InstanceMethodCall(target, "class", _tool);
        _tool.call(call, true);
        object value = call.ResultObject;
        FieldInfo field = value.GetType().GetField("name", BindingFlags.Instance | BindingFlags.NonPublic);
        if (field == null)
            throw new InvalidOperationException("ASCET class metadata did not expose a class name.");
        return Convert.ToString(field.GetValue(value));
    }

    private static int GetReturnedCount(int totalCount, int maxResults)
    {
        if (maxResults == 0 || maxResults >= totalCount)
            return totalCount;
        return maxResults;
    }

    private void EnsureNotDisposed()
    {
        if (_disposed)
            throw new ObjectDisposedException("AscetNativeSearchSession");
    }
}

public sealed class AscetSearchProcessLock : IDisposable
{
    private readonly Mutex _mutex;
    private bool _acquired;

    private AscetSearchProcessLock(Mutex mutex, bool acquired)
    {
        _mutex = mutex;
        _acquired = acquired;
    }

    public static AscetSearchProcessLock Acquire(int ascetProcessId, int timeoutMilliseconds)
    {
        string name = "Local\\VafAgentworks.AscetSearch.NativeUi." + ascetProcessId;
        Mutex mutex = new Mutex(false, name);
        bool acquired;
        try
        {
            acquired = mutex.WaitOne(timeoutMilliseconds);
        }
        catch (AbandonedMutexException)
        {
            acquired = true;
        }

        if (!acquired)
        {
            mutex.Dispose();
            throw new TimeoutException("Timed out waiting for the ASCET Search UI queue after " + timeoutMilliseconds + " ms.");
        }
        return new AscetSearchProcessLock(mutex, true);
    }

    public void Dispose()
    {
        if (_acquired)
        {
            _mutex.ReleaseMutex();
            _acquired = false;
        }
        _mutex.Dispose();
    }
}
