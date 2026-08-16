using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Web.Script.Serialization;

public static class AscetSearch
{
    private const int DefaultTimeoutMilliseconds = 300000;
    private const int DefaultMaxResults = 100;

    [STAThread]
    public static int Main(string[] args)
    {
        AscetSearchToolApiLoader.ConfigureAssemblyResolution();
        bool json = !ContainsArgument(args, "--plain") && !ContainsArgument(args, "-p");
        try
        {
            AscetSearchOptions options = AscetSearchOptions.Parse(args, DefaultTimeoutMilliseconds, DefaultMaxResults);
            if (options.Command == "help")
            {
                WriteHelp();
                return 0;
            }
            if (options.Command == "types")
            {
                WriteTypes(options.Json);
                return 0;
            }

            SearchTypeDefinition definition = SearchTypeCatalog.Get(options.Mode);
            int ascetProcessId = FindAscetProcessId();
            Stopwatch queueTimer = Stopwatch.StartNew();
            using (AscetSearchProcessLock processLock = AscetSearchProcessLock.Acquire(ascetProcessId, options.TimeoutMilliseconds))
            {
                queueTimer.Stop();
                TextWriter standardOutput = Console.Out;
                AscetSearchResponse response;
                try
                {
                    Console.SetOut(TextWriter.Null);
                    using (AscetNativeSearchSession session = new AscetNativeSearchSession(ascetProcessId))
                    {
                        response = session.Execute(
                            definition,
                            options.Query,
                            options.TimeoutMilliseconds,
                            options.MaxResults,
                            options.KeepUi);
                    }
                }
                finally
                {
                    Console.SetOut(standardOutput);
                }
                response.QueueWaitMilliseconds = queueTimer.ElapsedMilliseconds;
                WriteResponse(response, options.Json);
            }
            return 0;
        }
        catch (AscetSearchUsageException ex)
        {
            WriteError("usage", ex.Message, json);
            return 2;
        }
        catch (Exception ex)
        {
            WriteError(ex.GetType().Name, ex.Message, json);
            if (!json && !String.IsNullOrEmpty(ex.StackTrace))
                Console.Error.WriteLine(ex.StackTrace);
            return 1;
        }
    }

    private static int FindAscetProcessId()
    {
        System.Diagnostics.Process[] processes = System.Diagnostics.Process.GetProcessesByName("ASCET");
        try
        {
            if (processes.Length == 0)
                throw new InvalidOperationException("ASCET is not running.");
            if (processes.Length > 1)
                throw new InvalidOperationException("Multiple ASCET processes are running; exactly one instance is required.");
            return processes[0].Id;
        }
        finally
        {
            for (int i = 0; i < processes.Length; i++)
                processes[i].Dispose();
        }
    }

    private static void WriteHelp()
    {
        Console.WriteLine("Usage:");
        Console.WriteLine("  AscetSearch.exe <mode> <query> [-n <max>] [-t <timeout-ms>] [-k] [-p]");
        Console.WriteLine("  AscetSearch.exe types [-p]");
        Console.WriteLine();
        Console.WriteLine("Default output is compact JSON. -k keeps the native result window; -p selects plain text.");
        Console.WriteLine();
        foreach (SearchTypeDefinition definition in SearchTypeCatalog.All)
            Console.WriteLine("  " + definition.Mode.PadRight(16) + definition.MenuLabel);
    }

    private static void WriteTypes(bool json)
    {
        if (json)
        {
            Dictionary<string, string> types = new Dictionary<string, string>();
            foreach (SearchTypeDefinition definition in SearchTypeCatalog.All)
                types.Add(definition.Mode, definition.MenuLabel);
            Console.WriteLine(SerializeCompact(new Dictionary<string, object>
            {
                { "ok", true },
                { "types", types }
            }));
            return;
        }

        foreach (SearchTypeDefinition definition in SearchTypeCatalog.All)
            Console.WriteLine(definition.Mode + "\t" + definition.MenuLabel);
    }

    private static void WriteResponse(AscetSearchResponse response, bool json)
    {
        if (json)
        {
            Dictionary<string, object> payload = new Dictionary<string, object>();
            payload.Add("ok", true);
            payload.Add("mode", response.Mode);
            payload.Add("q", response.Query);
            payload.Add("ui", response.NativeUiActivated);
            payload.Add("count", response.ResultCount);
            object items = response.Mode == "text" ? (object)BuildTextItems(response.Results) : BuildBrowseItems(response.Results);
            payload.Add("items", items);
            payload.Add("ms", response.SearchElapsedMilliseconds);
            payload.Add("waitMs", response.QueueWaitMilliseconds);
            if (response.Truncated)
                payload.Add("more", true);
            Console.WriteLine(SerializeCompact(payload));
            return;
        }

        Console.WriteLine(response.Mode + "\tcount=" + response.ResultCount + "\tms=" + response.SearchElapsedMilliseconds + "\twaitMs=" + response.QueueWaitMilliseconds + "\tui=" + response.NativeUiActivated);
        for (int i = 0; i < response.Results.Count; i++)
        {
            AscetSearchResultItem item = response.Results[i];
            if (response.Mode != "text")
            {
                Console.WriteLine(item.Label ?? item.RemoteClass);
                continue;
            }
            Console.WriteLine(FormatTextItem(item));
        }
        if (response.Truncated)
            Console.WriteLine("more=true");
    }

    private static List<string> BuildBrowseItems(List<AscetSearchResultItem> results)
    {
        List<string> items = new List<string>(results.Count);
        for (int i = 0; i < results.Count; i++)
            items.Add(results[i].Label ?? results[i].RemoteClass);
        return items;
    }

    private static List<Dictionary<string, object>> BuildTextItems(List<AscetSearchResultItem> results)
    {
        List<Dictionary<string, object>> items = new List<Dictionary<string, object>>(results.Count);
        for (int i = 0; i < results.Count; i++)
        {
            AscetSearchResultItem source = results[i];
            Dictionary<string, object> item = new Dictionary<string, object>();
            if (!String.IsNullOrEmpty(source.Component))
                item.Add("component", source.Component);
            if (!String.IsNullOrWhiteSpace(source.TypeInfo))
                item.Add("symbol", source.TypeInfo.Trim());
            int line;
            if (TryParseLine(source.LineInfo, out line))
                item.Add("line", line);
            if (!String.IsNullOrEmpty(source.CodeLine))
                item.Add("code", source.CodeLine);
            if (source.SelectionBegin.HasValue && source.SelectionEnd.HasValue)
                item.Add("span", new[] { source.SelectionBegin.Value, source.SelectionEnd.Value });
            if (item.Count == 0 && !String.IsNullOrEmpty(source.Label))
                item.Add("text", source.Label);
            items.Add(item);
        }
        return items;
    }

    private static bool TryParseLine(string lineInfo, out int line)
    {
        line = 0;
        if (String.IsNullOrWhiteSpace(lineInfo))
            return false;
        int separator = lineInfo.LastIndexOf(':');
        string value = separator >= 0 ? lineInfo.Substring(separator + 1) : lineInfo;
        return Int32.TryParse(value.Trim(), out line);
    }

    private static string FormatTextItem(AscetSearchResultItem item)
    {
        List<string> fields = new List<string>();
        if (!String.IsNullOrEmpty(item.Component))
            fields.Add(item.Component);
        if (!String.IsNullOrWhiteSpace(item.TypeInfo))
            fields.Add(item.TypeInfo.Trim());
        if (!String.IsNullOrWhiteSpace(item.LineInfo))
            fields.Add(item.LineInfo.Trim());
        if (!String.IsNullOrEmpty(item.CodeLine))
            fields.Add(item.CodeLine);
        return String.Join("\t", fields.ToArray());
    }

    private static void WriteError(string code, string message, bool json)
    {
        if (json)
        {
            Console.Error.WriteLine(SerializeCompact(new Dictionary<string, object>
            {
                { "ok", false },
                { "code", code },
                { "error", message }
            }));
            return;
        }
        Console.Error.WriteLine(code + ": " + message);
    }

    private static string SerializeCompact(object value)
    {
        string json = CreateSerializer().Serialize(value);
        return json
            .Replace("\\u003c", "<")
            .Replace("\\u003e", ">")
            .Replace("\\u0026", "&")
            .Replace("\\u0027", "'");
    }

    private static JavaScriptSerializer CreateSerializer()
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        serializer.MaxJsonLength = Int32.MaxValue;
        return serializer;
    }

    private static bool ContainsArgument(string[] args, string expected)
    {
        for (int i = 0; i < args.Length; i++)
        {
            if (String.Equals(args[i], expected, StringComparison.OrdinalIgnoreCase))
                return true;
        }
        return false;
    }
}

public sealed class AscetSearchOptions
{
    public string Command { get; private set; }
    public string Mode { get; private set; }
    public string Query { get; private set; }
    public bool Json { get; private set; }
    public int MaxResults { get; private set; }
    public int TimeoutMilliseconds { get; private set; }
    public bool KeepUi { get; private set; }

    public static AscetSearchOptions Parse(string[] args, int defaultTimeoutMilliseconds, int defaultMaxResults)
    {
        AscetSearchOptions options = new AscetSearchOptions();
        options.Json = true;
        options.MaxResults = defaultMaxResults;
        options.TimeoutMilliseconds = defaultTimeoutMilliseconds;
        options.KeepUi = false;

        List<string> positional = new List<string>();
        for (int i = 0; i < args.Length; i++)
        {
            string argument = args[i];
            if (String.Equals(argument, "--plain", StringComparison.OrdinalIgnoreCase) || argument == "-p")
            {
                options.Json = false;
                continue;
            }
            if (String.Equals(argument, "--keep-ui", StringComparison.OrdinalIgnoreCase) || argument == "-k")
            {
                options.KeepUi = true;
                continue;
            }
            if (String.Equals(argument, "--max", StringComparison.OrdinalIgnoreCase) || argument == "-n")
            {
                options.MaxResults = ParseNonNegativeInteger(ReadOptionValue(args, ref i, argument), argument);
                continue;
            }
            if (String.Equals(argument, "--timeout", StringComparison.OrdinalIgnoreCase) || argument == "-t")
            {
                options.TimeoutMilliseconds = ParsePositiveInteger(ReadOptionValue(args, ref i, argument), argument);
                continue;
            }
            if (argument.StartsWith("-", StringComparison.Ordinal))
                throw new AscetSearchUsageException("Unknown option: " + argument);
            positional.Add(argument);
        }

        if (positional.Count == 0 || String.Equals(positional[0], "help", StringComparison.OrdinalIgnoreCase) || positional[0] == "/?")
        {
            options.Command = "help";
            return options;
        }
        if (String.Equals(positional[0], "types", StringComparison.OrdinalIgnoreCase))
        {
            if (positional.Count != 1)
                throw new AscetSearchUsageException("types does not accept a query.");
            options.Command = "types";
            return options;
        }
        if (positional.Count != 2)
            throw new AscetSearchUsageException("Expected <mode> <query>.");

        options.Command = "search";
        options.Mode = positional[0];
        options.Query = positional[1];
        if (String.IsNullOrWhiteSpace(options.Query))
            throw new AscetSearchUsageException("Query must not be empty.");
        SearchTypeCatalog.Get(options.Mode);
        return options;
    }

    private static string ReadOptionValue(string[] args, ref int index, string option)
    {
        if (index + 1 >= args.Length)
            throw new AscetSearchUsageException(option + " requires a value.");
        index++;
        return args[index];
    }

    private static int ParsePositiveInteger(string value, string option)
    {
        int parsed;
        if (!Int32.TryParse(value, out parsed) || parsed <= 0)
            throw new AscetSearchUsageException(option + " must be a positive integer.");
        return parsed;
    }

    private static int ParseNonNegativeInteger(string value, string option)
    {
        int parsed;
        if (!Int32.TryParse(value, out parsed) || parsed < 0)
            throw new AscetSearchUsageException(option + " must be zero or a positive integer.");
        return parsed;
    }
}

public sealed class SearchTypeDefinition
{
    public SearchTypeDefinition(string mode, string menuLabel, string engine, string selector)
    {
        Mode = mode;
        MenuLabel = menuLabel;
        Engine = engine;
        Selector = selector;
    }

    public string Mode { get; private set; }
    public string MenuLabel { get; private set; }
    public string Engine { get; private set; }
    public string Selector { get; private set; }
}

public static class SearchTypeCatalog
{
    private static readonly SearchTypeDefinition[] Definitions =
    {
        new SearchTypeDefinition("comp", "Components", "SGBrowseManager", "browseItemsParentWindow:browseString:"),
        new SearchTypeDefinition("comp-ref", "References to component", "SGBrowseManager", "browseReferencesToItemParentWindow:browseString:"),
        new SearchTypeDefinition("method", "Declarations of method/process", "SGBrowseManager", "browseMethodsParentWindow:browseString:"),
        new SearchTypeDefinition("method-ref", "References to method/process", "SGBrowseManager", "browseSendersOfMethodParentWindow:browseString:"),
        new SearchTypeDefinition("method-element", "Declarations of method/process element", "SGBrowseManager", "browseMethodElementsParentWindow:browseString:"),
        new SearchTypeDefinition("element", "Declarations of element", "SGBrowseManager", "browseDefinerOfElementParentWindow:browseString:"),
        new SearchTypeDefinition("element-ref", "References to element", "SGBrowseManager", "browseUserOfElementParentWindow:browseString:"),
        new SearchTypeDefinition("sender", "Senders of message", "SGBrowseManager", "browseSenderOfMessageParentWindow:browseString:"),
        new SearchTypeDefinition("receiver", "Receivers of message", "SGBrowseManager", "browseReceiverOfMessageParentWindow:browseString:"),
        new SearchTypeDefinition("text", "Text in ESDL or C code", "SGFindReplaceWindow", null)
    };

    public static IEnumerable<SearchTypeDefinition> All
    {
        get { return Definitions; }
    }

    public static SearchTypeDefinition Get(string mode)
    {
        for (int i = 0; i < Definitions.Length; i++)
        {
            if (String.Equals(Definitions[i].Mode, mode, StringComparison.OrdinalIgnoreCase))
                return Definitions[i];
        }
        throw new AscetSearchUsageException("Unknown mode: " + mode);
    }
}

public sealed class AscetSearchResponse
{
    public AscetSearchResponse()
    {
        Results = new List<AscetSearchResultItem>();
    }

    public string Mode { get; set; }
    public string Query { get; set; }
    public long QueueWaitMilliseconds { get; set; }
    public long SearchElapsedMilliseconds { get; set; }
    public bool NativeUiActivated { get; set; }
    public int ResultCount { get; set; }
    public int ReturnedCount { get; set; }
    public bool Truncated { get; set; }
    public List<AscetSearchResultItem> Results { get; set; }
}

public sealed class AscetSearchResultItem
{
    public string RemoteClass { get; set; }
    public string Label { get; set; }
    public string Component { get; set; }
    public string TypeInfo { get; set; }
    public string LineInfo { get; set; }
    public string CodeLine { get; set; }
    public int? SelectionBegin { get; set; }
    public int? SelectionEnd { get; set; }
}

public sealed class AscetSearchUsageException : Exception
{
    public AscetSearchUsageException(string message) : base(message)
    {
    }
}

public static class AscetSearchToolApiLoader
{
    private static bool _configured;

    public static void ConfigureAssemblyResolution()
    {
        if (_configured)
            return;
        _configured = true;
        AppDomain.CurrentDomain.AssemblyResolve += ResolveAssembly;
    }

    private static Assembly ResolveAssembly(object sender, ResolveEventArgs args)
    {
        AssemblyName requested = new AssemblyName(args.Name);
        if (!String.Equals(requested.Name, "Etas.AscetNET", StringComparison.OrdinalIgnoreCase))
            return null;
        string path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Ascetapidll", "Etas.AscetNET.dll");
        return File.Exists(path) ? Assembly.LoadFrom(path) : null;
    }
}
