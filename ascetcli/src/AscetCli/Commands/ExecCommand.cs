using System;
using System.Collections.Generic;
using System.IO;
using System.Web.Script.Serialization;
using Ascet = de.etas.cebra.toolAPI.Ascet.Ascet;
using AscetDataBase = de.etas.cebra.toolAPI.Ascet.AscetDataBase;

public static class ExecCommand
{
    private const int ExitCodeStructuredError = 2;
    private static readonly object ConsoleSuppressionGate = new object();
    private static readonly TextWriter SuppressedConsoleOut = TextWriter.Synchronized(TextWriter.Null);
    private static FolderReadService folderReader = new FolderReadService();
    private static MethodReadService methodReader = new MethodReadService();
    private static SummaryReadService summaryReader = new SummaryReadService();
    private static AscetGetService getReader = new AscetGetService();
    private static DatabaseCatalogService databaseCatalogReader = new DatabaseCatalogService();
    private static IExecComponentWriteService componentWriter = new ComponentWriteService();
    private static IExecMethodCodeWriteService methodWriter = new ExecMethodWriteService();
    private static IExecElementSpecWriteService elementSpecWriter = new ElementSpecWriteService();
    public static string[] GetImplementedOperations()
    {
        return OperationRegistry.GetExecOperationIds();
    }

    public static int Run(string[] args)
    {
        string operation = AscetCliEnvelope.GetToken(args, 0);
        if (String.IsNullOrWhiteSpace(operation))
        {
            return AscetCliEnvelope.WriteError(
                ExitCodeStructuredError,
                AscetCliEnvelope.Error(
                    "invalid_arguments",
                    "exec mode requires an operation token.",
                    "exec",
                    String.Empty));
        }

        switch (operation.ToLowerInvariant())
        {
            case "list_folders":
                return HandleListFolders(AscetCliEnvelope.Slice(args, 1));
            case "get_database_catalog":
                return HandleDatabaseCatalog(AscetCliEnvelope.Slice(args, 1));
            case "get_database_identity":
            case "get_tree":
            case "get_elements":
            case "get_formulas":
            case "get_component_refs":
            case "get_bde_edges":
            case "get_import_binding":
            case "get_dbitem_refs":
                return HandleGet(operation.ToLowerInvariant(), AscetCliEnvelope.Slice(args, 1));
            case "list_methods":
                return HandleListMethods(AscetCliEnvelope.Slice(args, 1));
            case "list_diagrams":
                return HandleListDiagrams(AscetCliEnvelope.Slice(args, 1));
            case "read_component_summary":
                return HandleReadComponentSummary(AscetCliEnvelope.Slice(args, 1));
            case "read_component_children":
                return HandleReadComponentChildren(AscetCliEnvelope.Slice(args, 1));
            case "read_method_code":
                return HandleReadMethodCode(AscetCliEnvelope.Slice(args, 1));
            case "read_method_signature":
                return HandleReadMethodSignature(AscetCliEnvelope.Slice(args, 1));
            case "read_block_diagram":
                return HandleReadBlockDiagram(AscetCliEnvelope.Slice(args, 1), false, "read_block_diagram");
            case "read_block_diagram_raw":
                return HandleReadBlockDiagram(AscetCliEnvelope.Slice(args, 1), true, "read_block_diagram_raw");
            case "read_dependent_chain":
                return HandleReadDependentChain(AscetCliEnvelope.Slice(args, 1));
            case "read_element_dependency":
                return HandleReadElementDependency(AscetCliEnvelope.Slice(args, 1));
            case "read_code":
                return HandleLegacyAliasOperation("read_code", "read_text_code", AscetCliEnvelope.Slice(args, 1));
            case "read_text_code":
                return HandleLegacyAliasOperation("read_code", "read_text_code", AscetCliEnvelope.Slice(args, 1));
            case "diff":
                return HandleLegacyAliasOperation("diff", "diff_component_snapshot", AscetCliEnvelope.Slice(args, 1));
            case "create_component":
                return HandleCreateComponent(AscetCliEnvelope.Slice(args, 1));
            case "set_method_code":
                return HandleSetMethodCode(AscetCliEnvelope.Slice(args, 1));
            case "set_method_signature":
                return HandleSetMethodSignature(AscetCliEnvelope.Slice(args, 1));
            case "apply_element_spec":
                return HandleApplyElementSpec(AscetCliEnvelope.Slice(args, 1));
            case "set_element_dependency":
                return HandleSetElementDependency(AscetCliEnvelope.Slice(args, 1));
            case "configure_parameter_dependency_chain_execute":
                return HandleConfigureParameterDependencyChainExecute(AscetCliEnvelope.Slice(args, 1));
            default:
                return HandleLegacyProxyOperation(operation, AscetCliEnvelope.Slice(args, 1));
        }
    }

    private static int HandleGet(string operation, string[] args)
    {
        try
        {
            Dictionary<string, object> payload = ParseGetPayload(args, operation);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            Dictionary<string, object> result = ExecuteSuppressingConsoleOut(delegate()
            {
                using (AscetSession session = (AscetSession)new AscetSessionFactory().OpenCurrentDatabaseSession())
                {
                    AscetDataBase database = session.GetCurrentDatabaseHandle();
                    if (database == null)
                    {
                        throw new AscetReadException("database_not_open", operation, "GetCurrentDataBase returned null. Open a database in ASCET first.");
                    }
                    AscetDatabaseRef databaseRef = new AscetDatabaseRef();
                    databaseRef.Name = database.GetName();
                    Ascet tool = session.GetToolHandle();
                    databaseRef.Path = tool == null ? String.Empty : (tool.GetDataBasePath() ?? String.Empty);
                    return getReader.Execute(operation, payload, database, databaseRef);
                }
            });
            return AscetCliEnvelope.WriteSuccess(AscetCliEnvelope.Success("exec", operation, result));
        }
        catch (Exception ex)
        {
            AscetReadException ascet = ex as AscetReadException;
            string code = ascet == null ? "unhandled_exception" : (ascet.Code ?? "unhandled_exception");
            return AscetCliEnvelope.WriteError(ExitCodeStructuredError, AscetCliEnvelope.Error(code, ex.Message, "exec", operation));
        }
    }

    private static int HandleDatabaseCatalog(string[] args)
    {
        const string operation = "get_database_catalog";
        try
        {
            Dictionary<string, object> payload = ParseGetPayload(args, operation);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            Dictionary<string, object> result = null;
            long sessionOpenMs = 0L;
            long sessionCloseMs = 0L;
            ExecuteSuppressingConsoleOut(delegate()
            {
                AscetSession session = null;
                try
                {
                    System.Diagnostics.Stopwatch openTimer = System.Diagnostics.Stopwatch.StartNew();
                    session = (AscetSession)new AscetSessionFactory().OpenCurrentDatabaseSession();
                    openTimer.Stop();
                    sessionOpenMs = openTimer.ElapsedMilliseconds;
                    AscetDataBase database = session.GetCurrentDatabaseHandle();
                    if (database == null)
                    {
                        throw new AscetReadException("database_not_open", operation, "GetCurrentDataBase returned null. Open a database in ASCET first.");
                    }
                    AscetDatabaseRef databaseRef = new AscetDatabaseRef();
                    databaseRef.Name = database.GetName();
                    Ascet tool = session.GetToolHandle();
                    databaseRef.Path = tool == null ? String.Empty : (tool.GetDataBasePath() ?? String.Empty);
                    result = databaseCatalogReader.Execute(payload, database, databaseRef);
                }
                finally
                {
                    if (session != null)
                    {
                        System.Diagnostics.Stopwatch closeTimer = System.Diagnostics.Stopwatch.StartNew();
                        session.Dispose();
                        closeTimer.Stop();
                        sessionCloseMs = closeTimer.ElapsedMilliseconds;
                    }
                }
                return true;
            });
            Dictionary<string, object> timings = result == null ? null : result["timings"] as Dictionary<string, object>;
            if (timings == null)
            {
                timings = new Dictionary<string, object>(StringComparer.Ordinal);
                if (result != null) result["timings"] = timings;
            }
            timings["sessionOpenMs"] = sessionOpenMs;
            timings["sessionCloseMs"] = sessionCloseMs;
            return AscetCliEnvelope.WriteSuccess(AscetCliEnvelope.Success("exec", operation, result));
        }
        catch (Exception ex)
        {
            AscetReadException ascet = ex as AscetReadException;
            string code = ascet == null ? "catalog_live_scan_failed" : (ascet.Code ?? "catalog_live_scan_failed");
            return AscetCliEnvelope.WriteError(ExitCodeStructuredError, AscetCliEnvelope.Error(code, ex.Message, "exec", operation));
        }
    }
    private static Dictionary<string, object> ParseGetPayload(string[] args, string operation)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        List<object> scopes = new List<object>();
        for (int i = 0; args != null && i < args.Length; i++)
        {
            string token = args[i] ?? String.Empty;
            if (String.Equals(token, "--json", StringComparison.OrdinalIgnoreCase)) continue;
            if (String.Equals(token, "--request-json", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length) throw new AscetReadException("invalid_argument", operation, "--request-json requires a JSON object.");
                return AscetJsonContract.DeserializeObject(args[++i]);
            }
            if (String.Equals(token, "--request-stdin", StringComparison.OrdinalIgnoreCase))
            {
                string requestJson = Console.In.ReadToEnd();
                if (String.IsNullOrWhiteSpace(requestJson)) throw new AscetReadException("invalid_argument", operation, "--request-stdin requires a JSON object on standard input.");
                return AscetJsonContract.DeserializeObject(requestJson);
            }
            if (!token.StartsWith("--", StringComparison.Ordinal))
            {
                throw new AscetReadException("invalid_argument", operation, "Unknown argument '" + token + "'.");
            }
            if (i + 1 >= args.Length) throw new AscetReadException("invalid_argument", operation, "Argument '" + token + "' requires a value.");
            string value = args[++i] ?? String.Empty;
            string key = token.Substring(2);
            if (String.Equals(key, "scope", StringComparison.OrdinalIgnoreCase))
            {
                scopes.Add(value);
                continue;
            }
            result[ToGetPayloadKey(key)] = value;
        }
        if (scopes.Count > 0) result["scopes"] = scopes;
        return result;
    }

    private static string ToGetPayloadKey(string key)
    {
        switch ((key ?? String.Empty).ToLowerInvariant())
        {
            case "target-path-prefix": return "targetPathPrefix";
            case "element-name": return "elementName";
            case "formula-name": return "formulaName";
            case "diagram-name": return "diagramName";
            case "provider-oid": return "providerOid";
            case "provider-path": return "providerPath";
            case "max-folders": return "maxFolders";
            case "max-components": return "maxComponents";
            default: return key;
        }
    }
    private static int HandleListFolders(string[] args)
    {
        try
        {
            FolderReadRequest request = folderReader.ParseExecArguments(args);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            FolderReadResponse response = ExecuteSuppressingConsoleOut(delegate()
            {
                return folderReader.ReadCurrentDatabase(request);
            });
            return AscetCliEnvelope.WriteSuccess(
                AscetCliEnvelope.Success(
                    "exec",
                    "list_folders",
                    response.Payload));
        }
        catch (Exception ex)
        {
            AscetReadException ascet = ex as AscetReadException;
            string code = ascet == null ? "unhandled_exception" : (ascet.Code ?? "unhandled_exception");
            return AscetCliEnvelope.WriteError(
                ExitCodeStructuredError,
                AscetCliEnvelope.Error(
                    code,
                    ex.Message,
                    "exec",
                    "list_folders"));
        }
    }

    private static int HandleListMethods(string[] args)
    {
        try
        {
            MethodReadRequest request = methodReader.ParseExecArguments(args);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            MethodReadResponse response = ExecuteSuppressingConsoleOut(delegate()
            {
                return methodReader.ReadCurrentDatabase(request);
            });
            return AscetCliEnvelope.WriteSuccess(
                AscetCliEnvelope.Success(
                    "exec",
                    "list_methods",
                    response.Payload));
        }
        catch (Exception ex)
        {
            AscetReadException ascet = ex as AscetReadException;
            string code = ascet == null ? "unhandled_exception" : (ascet.Code ?? "unhandled_exception");
            return AscetCliEnvelope.WriteError(
                ExitCodeStructuredError,
                AscetCliEnvelope.Error(
                    code,
                    ex.Message,
                    "exec",
                    "list_methods"));
        }
    }

    private static int HandleReadComponentSummary(string[] args)
    {
        try
        {
            SummaryReadRequest request = summaryReader.ParseExecArguments(args);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            SummaryReadResponse response = ExecuteSuppressingConsoleOut(delegate()
            {
                return summaryReader.ReadCurrentDatabase(request);
            });
            return AscetCliEnvelope.WriteSuccess(
                AscetCliEnvelope.Success(
                    "exec",
                    "read_component_summary",
                    response.Payload));
        }
        catch (Exception ex)
        {
            AscetReadException ascet = ex as AscetReadException;
            string code = ascet == null ? "unhandled_exception" : (ascet.Code ?? "unhandled_exception");
            return AscetCliEnvelope.WriteError(
                ExitCodeStructuredError,
                AscetCliEnvelope.Error(
                    code,
                    ex.Message,
                    "exec",
                    "read_component_summary"));
        }
    }

    private static int HandleReadMethodCode(string[] args)
    {
        try
        {
            AscetReadMethodCodeArguments request = AscetReadMethodCode.ParseArguments(args);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            AscetMethodCode methodCode = ExecuteSuppressingConsoleOut(delegate()
            {
                return AscetReadMethodCode.ReadMethodCode(request.ComponentPath, request.MethodName);
            });
            return AscetCliEnvelope.WriteSuccess(
                AscetCliEnvelope.Success(
                    "exec",
                    "read_method_code",
                    AscetReadMethodCode.BuildPayload(methodCode)));
        }
        catch (Exception ex)
        {
            AscetReadException ascet = ex as AscetReadException;
            string code = ascet == null ? "unhandled_exception" : (ascet.Code ?? "unhandled_exception");
            return AscetCliEnvelope.WriteError(
                ExitCodeStructuredError,
                AscetCliEnvelope.Error(
                    code,
                    ex.Message,
                    "exec",
                    "read_method_code"));
        }
    }

    private static int HandleReadMethodSignature(string[] args)
    {
        try
        {
            AscetReadMethodSignatureArguments request = AscetReadMethodSignature.ParseArguments(args);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            AscetMethodSignatureSnapshot signature = ExecuteSuppressingConsoleOut(delegate()
            {
                return AscetReadMethodSignature.ReadMethodSignature(request.ComponentPath, request.MethodName);
            });
            return AscetCliEnvelope.WriteSuccess(
                AscetCliEnvelope.Success(
                    "exec",
                    "read_method_signature",
                    AscetReadMethodSignature.BuildPayload(signature)));
        }
        catch (Exception ex)
        {
            AscetReadException ascet = ex as AscetReadException;
            string code = ascet == null ? "unhandled_exception" : (ascet.Code ?? "unhandled_exception");
            return AscetCliEnvelope.WriteError(
                ExitCodeStructuredError,
                AscetCliEnvelope.Error(
                    code,
                    ex.Message,
                    "exec",
                    "read_method_signature"));
        }
    }

    private static int HandleListDiagrams(string[] args)
    {
        try
        {
            ListDiagramsArguments parsed = ParseListDiagramsArguments(args);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();

            Dictionary<string, object> payload = ExecuteSuppressingConsoleOut(delegate()
            {
                return BuildListDiagramsPayload(parsed.ComponentPath, parsed.DiagramKind);
            });

            return AscetCliEnvelope.WriteSuccess(
                AscetCliEnvelope.Success(
                    "exec",
                    "list_diagrams",
                    payload));
        }
        catch (Exception ex)
        {
            AscetReadException ascet = ex as AscetReadException;
            string code = ascet == null ? "unhandled_exception" : (ascet.Code ?? "unhandled_exception");
            return AscetCliEnvelope.WriteError(
                ExitCodeStructuredError,
                AscetCliEnvelope.Error(
                    code,
                    ex.Message,
                    "exec",
                    "list_diagrams"));
        }
    }

    private static int HandleLegacyAliasOperation(string operation, string targetOperation, string[] args)
    {
        LegacyOperationEntryPoint entryPoint;
        if (!AscetLegacyOperationRegistry.TryResolve(targetOperation, out entryPoint))
        {
            return AscetCliEnvelope.WriteError(
                ExitCodeStructuredError,
                AscetCliEnvelope.Error(
                    "not_implemented",
                    "Legacy operation '" + targetOperation + "' is not registered for in-process execution.",
                    "exec",
                    operation));
        }

        return InProcessLegacyOperationAdapter.Run(operation, entryPoint, args);
    }

    private static int HandleReadComponentChildren(string[] args)
    {
        try
        {
            AscetReadComponentChildrenArguments request = AscetReadComponentChildren.ParseArguments(args);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();

            Dictionary<string, object> payload = ExecuteSuppressingConsoleOut(delegate()
            {
                return AscetReadComponentChildren.BuildPayload(request);
            });

            return AscetCliEnvelope.WriteSuccess(
                AscetCliEnvelope.Success(
                    "exec",
                    "read_component_children",
                    payload));
        }
        catch (Exception ex)
        {
            AscetReadException ascet = ex as AscetReadException;
            string code = ascet == null ? "unhandled_exception" : (ascet.Code ?? "unhandled_exception");
            return AscetCliEnvelope.WriteError(
                ExitCodeStructuredError,
                AscetCliEnvelope.Error(
                    code,
                    ex.Message,
                    "exec",
                    "read_component_children"));
        }
    }

    private static int HandleReadBlockDiagram(string[] args, bool emitRawGraph, string operation)
    {
        try
        {
            if (args == null || args.Length < 2 || args.Length > 3)
            {
                throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetBridge.exe exec " + operation + " <component-path> <diagram-name> [--json]");
            }

            string componentPath = AscetReadBlockDiagram.NormalizeComponentPath(args[0]);
            string diagramName = AscetReadBlockDiagram.NormalizeDiagramName(args[1]);
            AscetReadBlockDiagram.IsJsonRequested(args);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();

            Dictionary<string, object> payload = ExecuteSuppressingConsoleOut(delegate()
            {
                ComponentLocatorService locator = new ComponentLocatorService();
                BlockDiagramReadService blockDiagrams = new BlockDiagramReadService();
                AscetItemPath parsed = AscetItemPath.Parse(componentPath);
                AscetItemRef component = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
                if (component == null)
                {
                    if (FolderExists(locator, componentPath))
                    {
                        throw new AscetReadException(
                            "target_is_folder",
                            operation,
                            "Target path '" + componentPath + "' resolves to a folder, not a module component.");
                    }

                    throw new AscetReadException("component_not_found", operation, "Component '" + componentPath + "' was not found.");
                }

                if (component.Kind == AscetComponentKind.Unknown && FolderExists(locator, componentPath))
                {
                    throw new AscetReadException(
                        "target_is_folder",
                        operation,
                        "Target path '" + componentPath + "' resolves to a folder, not a module component.");
                }

                if (!AscetReadBlockDiagram.IsReadableBlockDiagramComponentKind(component.Kind))
                {
                    throw new AscetReadException(
                        "unsupported_component_kind_for_block_diagram",
                        operation,
                        "Component '" + componentPath + "' must be a module or class to read a block diagram.");
                }

                AscetBlockDiagramGraph graph = blockDiagrams.GetBlockDiagramGraph(component, diagramName);
                return ParseJsonObject(emitRawGraph ? AscetReadBlockDiagram.FormatRawJsonOutput(graph) : AscetReadBlockDiagram.FormatJsonOutput(graph));
            });

            return AscetCliEnvelope.WriteSuccess(
                AscetCliEnvelope.Success(
                    "exec",
                    operation,
                    payload));
        }
        catch (Exception ex)
        {
            AscetReadException ascet = ex as AscetReadException;
            string code = ascet == null ? "unhandled_exception" : (ascet.Code ?? "unhandled_exception");
            return AscetCliEnvelope.WriteError(
                ExitCodeStructuredError,
                AscetCliEnvelope.Error(
                    code,
                    ex.Message,
                    "exec",
                    operation));
        }
    }

    private static int HandleReadDependentChain(string[] args)
    {
        const string operation = "read_dependent_chain";
        try
        {
            AscetReadDependentChainArguments request = AscetReadDependentChain.ParseArguments(args);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            Dictionary<string, object> payload = ExecuteSuppressingConsoleOut(delegate()
            {
                AscetDependentChainReadService service = new AscetDependentChainReadService();
                AscetDependentChainReadResult result = service.Read(new AscetDependentChainReadRequest
                {
                    ComponentPath = request.ComponentPath,
                    DependentElementName = request.DependentElementName,
                    ExporterComponentPath = request.ExporterComponentPath,
                    ProviderScopePath = request.ProviderScopePath,
                    MaxCandidates = request.MaxCandidates,
                    DebugDirectory = request.DebugDirectory,
                    KeepTemp = request.KeepTemp
                });
                return ParseJsonObject(AscetDependentChainOutput.FormatJsonOutput(result));
            });

            return AscetCliEnvelope.WriteSuccess(
                AscetCliEnvelope.Success("exec", operation, payload));
        }
        catch (Exception ex)
        {
            return WriteReadException(operation, ex);
        }
    }

    private static int HandleReadElementDependency(string[] args)
    {
        const string operation = "read_element_dependency";
        try
        {
            AscetReadElementDependencyArguments request = AscetReadElementDependency.ParseArguments(args);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            Dictionary<string, object> payload = ExecuteSuppressingConsoleOut(delegate()
            {
                AscetElementDependencyPlanResult result = AscetReadElementDependency.Read(request);
                return ParseJsonObject(AscetReadElementDependency.FormatJsonOutput(result));
            });

            return AscetCliEnvelope.WriteSuccess(
                AscetCliEnvelope.Success("exec", operation, payload));
        }
        catch (Exception ex)
        {
            return WriteReadException(operation, ex);
        }
    }

    internal static void SetServicesForTesting(
        IExecComponentWriteService overrideComponentWriter,
        IExecMethodCodeWriteService overrideMethodWriter,
        IExecElementSpecWriteService overrideElementSpecWriter)
    {
        if (overrideComponentWriter != null)
        {
            componentWriter = overrideComponentWriter;
        }

        if (overrideMethodWriter != null)
        {
            methodWriter = overrideMethodWriter;
        }

        if (overrideElementSpecWriter != null)
        {
            elementSpecWriter = overrideElementSpecWriter;
        }
    }

    internal static void ResetServicesForTesting()
    {
        folderReader = new FolderReadService();
        methodReader = new MethodReadService();
        summaryReader = new SummaryReadService();
        databaseCatalogReader = new DatabaseCatalogService();
        componentWriter = new ComponentWriteService();
        methodWriter = new ExecMethodWriteService();
        elementSpecWriter = new ElementSpecWriteService();
    }

    private static int HandleCreateComponent(string[] args)
    {
        try
        {
            CreateComponentWriteRequest request = componentWriter.ParseExecArguments(args);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            AscetWriteExecutionResult result = ExecuteSuppressingConsoleOut(delegate()
            {
                return componentWriter.Execute(request);
            });
            return WriteStructuredWriteResult("create_component", result);
        }
        catch (Exception ex)
        {
            return WriteExecException("create_component", ex);
        }
    }

    private static int HandleSetMethodCode(string[] args)
    {
        try
        {
            SetMethodCodeWriteRequest request = methodWriter.ParseExecArguments(args);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            AscetWriteExecutionResult result = ExecuteSuppressingConsoleOut(delegate()
            {
                return methodWriter.Execute(request);
            });
            return WriteStructuredWriteResult("set_method_code", result);
        }
        catch (Exception ex)
        {
            return WriteExecException("set_method_code", ex);
        }
    }

    private static int HandleApplyElementSpec(string[] args)
    {
        try
        {
            ApplyElementSpecWriteRequest request = elementSpecWriter.ParseExecArguments(args);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            AscetWriteExecutionResult result = ExecuteSuppressingConsoleOut(delegate()
            {
                return elementSpecWriter.Execute(request);
            });
            return WriteStructuredWriteResult("apply_element_spec", result);
        }
        catch (Exception ex)
        {
            return WriteExecException("apply_element_spec", ex);
        }
    }

    private static int HandleSetMethodSignature(string[] args)
    {
        const string operation = "set_method_signature";
        try
        {
            AscetSetMethodSignatureArguments request = AscetSetMethodSignature.ParseArguments(args);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            AscetWriteExecutionResult result = ExecuteSuppressingConsoleOut(delegate()
            {
                MethodSignatureService service = new MethodSignatureService();
                AscetMethodSignatureResult signature = service.ApplySignature(
                    request.ComponentPath,
                    request.MethodName,
                    request.SignatureSpec,
                    request.VerifyReadback);

                return BuildMethodSignatureWriteResult(signature);
            });

            return WriteStructuredWriteResult(operation, result);
        }
        catch (Exception ex)
        {
            return WriteExecException(operation, ex);
        }
    }

    private static int HandleConfigureParameterDependencyChainExecute(string[] args)
    {
        const string operation = "configure_parameter_dependency_chain_execute";
        try
        {
            string requestFile = AscetCliEnvelope.GetToken(args, 0);
            if (String.IsNullOrWhiteSpace(requestFile))
            {
                throw new AscetReadException("invalid_argument", operation, "usage: configure_parameter_dependency_chain_execute <request-file> [--json]");
            }
            for (int i = 1; i < (args == null ? 0 : args.Length); i++)
            {
                if (!String.Equals(args[i], "--json", StringComparison.OrdinalIgnoreCase))
                {
                    throw new AscetReadException("invalid_argument", operation, "Unknown argument '" + args[i] + "'.");
                }
            }
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            Dictionary<string, object> result = ExecuteSuppressingConsoleOut(delegate()
            {
                AscetParameterDependencyChainExecuteRequest request = AscetParameterDependencyChainExecuteParser.ParseFile(requestFile);
                return new AscetParameterDependencyChainExecuteService().Execute(request);
            });
            object mutationValue;
            bool? mutationStarted = result != null && result.TryGetValue("mutationStarted", out mutationValue) && mutationValue is bool
                ? (bool?)((bool)mutationValue)
                : null;
            return AscetCliEnvelope.WriteSuccess(AscetCliEnvelope.Success("exec", operation, result, mutationStarted));
        }
        catch (AscetReadException ex)
        {
            return WriteReadException(operation, ex);
        }
        catch (Exception ex)
        {
            return WriteExecException(operation, ex);
        }
    }

    private static int HandleSetElementDependency(string[] args)
    {
        const string operation = "set_element_dependency";
        try
        {
            AscetSetElementDependencyArguments request = AscetSetElementDependency.ParseArguments(args);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            AscetWriteExecutionResult result = ExecuteSuppressingConsoleOut(delegate()
            {
                return ExecuteSetElementDependency(request);
            });

            return WriteStructuredWriteResult(operation, result);
        }
        catch (Exception ex)
        {
            return WriteExecException(operation, ex);
        }
    }

    private static AscetWriteExecutionResult BuildMethodSignatureWriteResult(AscetMethodSignatureResult signature)
    {
        WriteVerificationResult verification = new WriteVerificationResult();
        verification.Requested = signature != null && signature.VerifyReadbackRequested;
        verification.Attempted = signature != null && signature.VerifyReadbackRequested;
        bool argumentsVerified = true;
        if (signature != null && signature.Arguments != null)
        {
            for (int i = 0; i < signature.Arguments.Count; i++)
            {
                argumentsVerified = argumentsVerified && signature.Arguments[i] != null && signature.Arguments[i].ReadbackVerified;
            }
        }

        verification.Succeeded = signature == null || !signature.VerifyReadbackRequested || (signature.ReadbackVerified && argumentsVerified);
        verification.Summary = signature == null
            ? String.Empty
            : (signature.VerifyReadbackRequested
                ? (verification.Succeeded ? "method_signature_readback_matches" : "method_signature_readback_mismatch")
                : "verification_not_requested");
        if (signature != null)
        {
            verification.Details["returnElementModelType"] = signature.ReturnElementModelType ?? String.Empty;
            verification.Details["returnElementIsMethodReturn"] = signature.ReturnElementIsMethodReturn;
            verification.Details["argumentCount"] = signature.Arguments == null ? 0 : signature.Arguments.Count;
        }

        AscetWriteExecutionResult result = new AscetWriteExecutionResult();
        result.OperationName = "set_method_signature";
        result.SequenceNumber = 1;
        result.Succeeded = verification.Succeeded;
        result.WriteSucceeded = signature != null;
        result.Summary = signature == null ? String.Empty : (signature.Summary ?? String.Empty);
        result.Payload = MethodSignatureService.BuildPayload(signature);
        result.Verification = verification;
        if (!verification.Succeeded)
        {
            result.Error = verification.Error ?? new AscetWriteError
            {
                Code = "readback_mismatch",
                Operation = "set_method_signature",
                Stage = "verify",
                Message = "Method signature readback did not match the requested type.",
                Details = verification.Details
            };
        }

        return result;
    }

    private static AscetWriteExecutionResult ExecuteSetElementDependency(AscetSetElementDependencyArguments arguments)
    {
        AscetSetElementDependencyArguments safeArguments = arguments ?? new AscetSetElementDependencyArguments();
        AscetWriteExecutor executor = new AscetWriteExecutor(new WriteVerificationService(new SetElementDependencyVerificationHook()));
        AscetWriteRequest request = new AscetWriteRequest();
        request.OperationName = "set_element_dependency";
        request.VerifyAfterWrite = safeArguments.VerifyReadback;
        request.Metadata["targetPath"] = safeArguments.TargetPath ?? String.Empty;
        request.Metadata["elementName"] = safeArguments.ElementName ?? String.Empty;
        request.Metadata["requestedDependency"] = safeArguments.RequestedDependency ?? String.Empty;
        request.Metadata["dependencyFormula"] = safeArguments.DependencyFormula ?? String.Empty;
        request.Metadata["clearDependencyFormula"] = safeArguments.ClearDependencyFormula;
        request.ExecuteWrite = delegate(AscetWriteContext context)
        {
            AscetSetElementDependencyService service = new AscetSetElementDependencyService();
            AscetSetElementDependencyResult setResult = service.Set(safeArguments);
            Dictionary<string, object> payload = ParseJsonObject(AscetSetElementDependency.FormatJsonOutput(setResult));

            AscetWriteActionResult action = new AscetWriteActionResult();
            action.Summary = BuildSetElementDependencySummary(setResult);
            action.Payload = payload;
            return action;
        };

        return executor.Execute(request);
    }

    private static string BuildSetElementDependencySummary(AscetSetElementDependencyResult result)
    {
        if (result == null)
        {
            return String.Empty;
        }

        string element = result.ElementName ?? String.Empty;
        string requested = result.RequestedDependency ?? String.Empty;
        if (result.DryRun)
        {
            return "planned set " + element + " dependency to " + requested;
        }

        return "set " + element + " dependency to " + requested;
    }

    internal static Dictionary<string, object> BuildListDiagramsPayload(string componentPath)
    {
        return BuildListDiagramsPayload(componentPath, String.Empty);
    }

    private static Dictionary<string, object> BuildListDiagramsPayload(string componentPath, string diagramKindFilter)
    {
        ComponentLocatorService locator = new ComponentLocatorService();
        DiagramCatalogService diagrams = new DiagramCatalogService();
        AscetItemPath parsed = AscetItemPath.Parse(componentPath);
        AscetItemRef component = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
        if (component == null)
        {
            if (FolderExists(locator, componentPath))
            {
                throw new AscetReadException("target_is_folder", "list_diagrams", "Target path '" + componentPath + "' resolves to a folder, not a code component.");
            }

            throw new AscetReadException("component_not_found", "list_diagrams", "Component '" + componentPath + "' was not found.");
        }

        IList<AscetDiagramRef> diagramRefs = diagrams.ListDiagrams(component) ?? new List<AscetDiagramRef>();
        string defaultDiagramName = ChooseDefaultDiagramName(diagramRefs);
        List<Dictionary<string, object>> items = BuildDiagramItems(diagramRefs, defaultDiagramName, diagramKindFilter);

        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = component.Path ?? componentPath;
        payload["componentKind"] = AscetDatabaseExplorerCommon.KindToSchema(component.Kind);
        if (!String.IsNullOrWhiteSpace(defaultDiagramName))
        {
            payload["defaultDiagramName"] = defaultDiagramName;
        }

        payload["items"] = items;
        Dictionary<string, object> filters = new Dictionary<string, object>();
        filters["diagramKind"] = String.IsNullOrWhiteSpace(diagramKindFilter) ? "all" : diagramKindFilter;
        payload["filters"] = filters;
        return payload;
    }

    private static string ParseListDiagramsComponentPath(string[] args)
    {
        return ParseListDiagramsArguments(args).ComponentPath;
    }

    private static ListDiagramsArguments ParseListDiagramsArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetBridge.exe exec list_diagrams <component-path> [--diagram-kind <all|block|block_diagram|state|state_machine|sequence|unknown>] [--json]");
        }

        ListDiagramsArguments parsed = new ListDiagramsArguments();
        parsed.ComponentPath = AscetDatabaseExplorerCommon.NormalizePath(args[0], "component_path");
        parsed.DiagramKind = String.Empty;
        for (int i = 1; i < args.Length; i++)
        {
            if (String.Equals(args[i], "--json", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (String.Equals(args[i], "--diagram-kind", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "--diagram-kind expects a value.");
                }

                parsed.DiagramKind = NormalizeDiagramKindFilter(args[++i]);
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + args[i] + "'.");
        }

        return parsed;
    }

    public static object ParseListDiagramsArgumentsForTesting(string[] args)
    {
        return ParseListDiagramsArguments(args);
    }

    private static string NormalizeDiagramKindFilter(string value)
    {
        string normalized = (value ?? String.Empty).Trim().ToLowerInvariant().Replace("-", "_");
        switch (normalized)
        {
            case "":
            case "all":
                return String.Empty;
            case "block":
            case "block_diagram":
            case "state":
            case "state_machine":
            case "sequence":
            case "unknown":
                return normalized;
            default:
                throw new AscetReadException("invalid_argument", "parse_arguments", "Unsupported diagramKind '" + value + "'.");
        }
    }

    private static Dictionary<string, object> ParseJsonObject(string json)
    {
        Dictionary<string, object> payload = AscetJsonContract.DeserializeObject(json ?? String.Empty);
        return payload ?? new Dictionary<string, object>(StringComparer.Ordinal);
    }

    private static bool FolderExists(ComponentLocatorService locator, string folderPath)
    {
        try
        {
            if (locator == null || String.IsNullOrWhiteSpace(folderPath))
            {
                return false;
            }

            locator.ListItemsInFolder(folderPath, false);
            return true;
        }
        catch (AscetReadException ex)
        {
            return !String.Equals(ex.Code, "folder_not_found", StringComparison.Ordinal);
        }
        catch
        {
            return false;
        }
    }

    private static List<Dictionary<string, object>> BuildDiagramItems(IList<AscetDiagramRef> diagramRefs, string defaultDiagramName)
    {
        return BuildDiagramItems(diagramRefs, defaultDiagramName, String.Empty);
    }

    private static List<Dictionary<string, object>> BuildDiagramItems(IList<AscetDiagramRef> diagramRefs, string defaultDiagramName, string diagramKindFilter)
    {
        List<Dictionary<string, object>> items = new List<Dictionary<string, object>>();
        if (diagramRefs == null)
        {
            return items;
        }

        for (int i = 0; i < diagramRefs.Count; i++)
        {
            AscetDiagramRef diagram = diagramRefs[i];
            string name = diagram == null ? String.Empty : (diagram.Name ?? String.Empty);
            AscetDiagramKind diagramKind = diagram == null ? AscetDiagramKind.Unknown : diagram.DiagramKind;
            if (!DiagramMatchesFilter(diagramKind, diagramKindFilter))
            {
                continue;
            }

            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["name"] = name;
            entry["kind"] = diagramKind.ToString();
            entry["visibility"] = "unknown";
            entry["isDefault"] = !String.IsNullOrWhiteSpace(defaultDiagramName) && String.Equals(name, defaultDiagramName, StringComparison.Ordinal);
            entry["supportsReadBlockDiagram"] = diagramKind == AscetDiagramKind.BlockDiagram;
            items.Add(entry);
        }

        return items;
    }

    private static bool DiagramMatchesFilter(AscetDiagramKind diagramKind, string diagramKindFilter)
    {
        if (String.IsNullOrWhiteSpace(diagramKindFilter))
        {
            return true;
        }

        string actual = diagramKind.ToString();
        if (String.Equals(diagramKindFilter, "block", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(diagramKindFilter, "block_diagram", StringComparison.OrdinalIgnoreCase))
        {
            return String.Equals(actual, "BlockDiagram", StringComparison.OrdinalIgnoreCase);
        }

        if (String.Equals(diagramKindFilter, "state", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(diagramKindFilter, "state_machine", StringComparison.OrdinalIgnoreCase))
        {
            return actual.IndexOf("State", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        if (String.Equals(diagramKindFilter, "sequence", StringComparison.OrdinalIgnoreCase))
        {
            return actual.IndexOf("Sequence", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        return String.Equals(actual, diagramKindFilter, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class ListDiagramsArguments
    {
        public string ComponentPath { get; set; }
        public string DiagramKind { get; set; }
    }

    private static string ChooseDefaultDiagramName(IList<AscetDiagramRef> diagramRefs)
    {
        if (diagramRefs == null || diagramRefs.Count == 0)
        {
            return String.Empty;
        }

        for (int i = 0; i < diagramRefs.Count; i++)
        {
            AscetDiagramRef diagram = diagramRefs[i];
            if (diagram != null && diagram.DiagramKind == AscetDiagramKind.BlockDiagram && !String.IsNullOrWhiteSpace(diagram.Name))
            {
                return diagram.Name;
            }
        }

        for (int i = 0; i < diagramRefs.Count; i++)
        {
            AscetDiagramRef diagram = diagramRefs[i];
            if (diagram != null && !String.IsNullOrWhiteSpace(diagram.Name))
            {
                return diagram.Name;
            }
        }

        return String.Empty;
    }

    private static int HandleLegacyProxyOperation(string operation, string[] args)
    {
        LegacyOperationEntryPoint entryPoint;
        if (!AscetLegacyOperationRegistry.TryResolve(operation, out entryPoint))
        {
            return AscetCliEnvelope.WriteError(
                ExitCodeStructuredError,
                AscetCliEnvelope.Error(
                    "not_implemented",
                    "Operation '" + operation + "' is not registered for in-process execution.",
                    "exec",
                    operation));
        }

        return InProcessLegacyOperationAdapter.Run(operation, entryPoint, args);
    }

    private static int WriteStructuredWriteResult(string operation, AscetWriteExecutionResult result)
    {
        if (result == null)
        {
            return AscetCliEnvelope.WriteError(
                ExitCodeStructuredError,
                AscetCliEnvelope.Error(
                    "write_failed",
                    "Operation '" + operation + "' returned no result.",
                    "exec",
                    operation));
        }

        if (!result.Succeeded)
        {
            return AscetCliEnvelope.WriteError(
                ExitCodeStructuredError,
                BuildWriteErrorEnvelope(operation, result));
        }

        return AscetCliEnvelope.WriteSuccess(
            AscetCliEnvelope.Success(
                "exec",
                operation,
                BuildWriteResultPayload(result),
                ResolveWriteMutationStarted(result)));
    }

    private static int WriteExecException(string operation, Exception ex)
    {
        return AscetCliEnvelope.WriteError(
            ExitCodeStructuredError,
            BuildWriteExceptionEnvelope(operation, ex));
    }

    private static int WriteReadException(string operation, Exception ex)
    {
        AscetReadException ascet = ex as AscetReadException;
        string code = ascet == null ? "unhandled_exception" : (ascet.Code ?? "unhandled_exception");
        return AscetCliEnvelope.WriteError(
            ExitCodeStructuredError,
            BuildReadErrorEnvelope(
                code,
                ex == null ? String.Empty : (ex.Message ?? String.Empty),
                operation ?? String.Empty));
    }

    private static Dictionary<string, object> BuildReadErrorEnvelope(string code, string message, string operation)
    {
        Dictionary<string, object> error = new Dictionary<string, object>(StringComparer.Ordinal);
        error["code"] = String.IsNullOrWhiteSpace(code) ? "unhandled_exception" : code;
        error["message"] = message ?? String.Empty;
        error["operation"] = operation ?? String.Empty;
        return AscetCliEnvelope.Error(error, "exec", operation, false);
    }

    private static bool? ResolveWriteMutationStarted(AscetWriteExecutionResult result)
    {
        if (result == null)
        {
            return null;
        }

        Dictionary<string, object> payload = result.Payload;
        object directDryRun;
        if (payload != null && payload.TryGetValue("dryRun", out directDryRun) && directDryRun is bool && (bool)directDryRun)
        {
            return false;
        }

        object writeValue;
        Dictionary<string, object> write = payload != null && payload.TryGetValue("write", out writeValue)
            ? writeValue as Dictionary<string, object>
            : null;
        object nestedDryRun;
        if (write != null && write.TryGetValue("dryRun", out nestedDryRun) && nestedDryRun is bool && (bool)nestedDryRun)
        {
            return false;
        }

        return result.WriteSucceeded ? true : (bool?)null;
    }

    private static Dictionary<string, object> BuildWriteResultPayload(AscetWriteExecutionResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>(StringComparer.Ordinal);
        payload["operationName"] = result == null ? String.Empty : (result.OperationName ?? String.Empty);
        payload["sequenceNumber"] = result == null ? 0L : result.SequenceNumber;
        payload["writeSucceeded"] = result != null && result.WriteSucceeded;
        payload["summary"] = result == null ? String.Empty : (result.Summary ?? String.Empty);
        WriteVerificationResult verification = result == null ? null : result.Verification;
        Dictionary<string, object> nestedPayload = result == null ? new Dictionary<string, object>(StringComparer.Ordinal) : CloneDictionary(result.Payload);
        NormalizeWritePayload(result == null ? String.Empty : result.OperationName, nestedPayload, result != null && result.WriteSucceeded, verification);
        payload["payload"] = nestedPayload;
        payload["verification"] = BuildVerificationPayload(verification);
        return payload;
    }

    private static Dictionary<string, object> BuildVerificationPayload(WriteVerificationResult verification)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>(StringComparer.Ordinal);
        payload["requested"] = verification != null && verification.Requested;
        payload["attempted"] = verification != null && verification.Attempted;
        payload["succeeded"] = verification == null || verification.Succeeded;
        payload["summary"] = verification == null ? String.Empty : (verification.Summary ?? String.Empty);
        payload["details"] = verification == null ? new Dictionary<string, object>(StringComparer.Ordinal) : CloneDictionary(verification.Details);
        return payload;
    }

    private static Dictionary<string, object> BuildWriteErrorEnvelope(string operation, AscetWriteExecutionResult result)
    {
        bool? mutationStarted = ResolveWriteMutationStarted(result);
        return AscetCliEnvelope.Error(
            BuildWriteErrorPayload(operation, result == null ? null : result.Error),
            "exec",
            operation,
            mutationStarted);
    }

    private static Dictionary<string, object> BuildWriteErrorPayload(string fallbackOperation, AscetWriteError error)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>(StringComparer.Ordinal);
        payload["code"] = error == null || String.IsNullOrWhiteSpace(error.Code) ? "write_failed" : error.Code;
        payload["message"] = error == null ? String.Empty : (error.Message ?? String.Empty);
        payload["operation"] = error == null || String.IsNullOrWhiteSpace(error.Operation) ? (fallbackOperation ?? String.Empty) : error.Operation;
        payload["stage"] = error == null ? String.Empty : (error.Stage ?? String.Empty);
        payload["exceptionType"] = error == null ? String.Empty : (error.ExceptionType ?? String.Empty);
        payload["details"] = error == null ? new Dictionary<string, object>(StringComparer.Ordinal) : CloneDictionary(error.Details);
        return payload;
    }

    private static Dictionary<string, object> CloneDictionary(Dictionary<string, object> source)
    {
        Dictionary<string, object> clone = new Dictionary<string, object>(StringComparer.Ordinal);
        if (source == null)
        {
            return clone;
        }

        foreach (KeyValuePair<string, object> entry in source)
        {
            clone[entry.Key] = entry.Value;
        }

        return clone;
    }

    private static Dictionary<string, object> BuildWriteExceptionEnvelope(string fallbackOperation, Exception ex)
    {
        AscetWriteError error = WriteVerificationService.CreateStructuredError(
            "write_failed",
            fallbackOperation ?? String.Empty,
            "input",
            ex);

        return AscetCliEnvelope.Error(
            BuildWriteErrorPayload(fallbackOperation, error),
            "exec",
            fallbackOperation,
            null);
    }

    private static void NormalizeWritePayload(string operationName, Dictionary<string, object> payload, bool writeSucceeded, WriteVerificationResult verification)
    {
        if (payload == null)
        {
            return;
        }

        bool verifyRequested = verification != null && verification.Requested;
        bool readbackVerified = verification != null && verification.Attempted && verification.Succeeded;

        if (String.Equals(operationName, "create_component", StringComparison.Ordinal))
        {
            payload["verifyReadbackRequested"] = verifyRequested;
            payload["readbackVerified"] = readbackVerified;
            return;
        }

        if (String.Equals(operationName, "set_method_code", StringComparison.Ordinal)
            || String.Equals(operationName, "apply_element_spec", StringComparison.Ordinal))
        {
            payload["WriteSucceeded"] = writeSucceeded;
            payload["VerifyReadbackRequested"] = verifyRequested;
            payload["ReadbackVerified"] = readbackVerified;
        }
    }

    private static T ExecuteSuppressingConsoleOut<T>(Func<T> action)
    {
        if (action == null)
        {
            throw new ArgumentNullException("action");
        }

        lock (ConsoleSuppressionGate)
        {
            TextWriter originalOut = Console.Out;

            try
            {
                Console.SetOut(SuppressedConsoleOut);
                return action();
            }
            finally
            {
                Console.SetOut(originalOut);
            }
        }
    }

    private static Dictionary<string, object> BuildLegacyProxyPayload(string legacyExecutableName, string stdout)
    {
        string trimmed = (stdout ?? String.Empty).Trim();
        if (trimmed.Length > 0)
        {
            try
            {
                object parsed = new JavaScriptSerializer().DeserializeObject(trimmed);
                Dictionary<string, object> payload = parsed as Dictionary<string, object>;
                if (payload != null)
                {
                    return payload;
                }
            }
            catch (ArgumentException)
            {
            }
        }

        Dictionary<string, object> fallback = new Dictionary<string, object>(StringComparer.Ordinal);
        fallback["legacyExecutable"] = legacyExecutableName ?? String.Empty;
        fallback["rawOutput"] = stdout ?? String.Empty;
        return fallback;
    }

    private static LegacyProxyError ParseLegacyProxyError(LegacyProxyProcessResult process, string operation, string legacyExecutableName)
    {
        Dictionary<string, object> parsedEnvelope = TryParseJsonObject(
            process == null ? String.Empty : process.Stdout);
        Dictionary<string, object> parsedError =
            parsedEnvelope == null ? null : GetDictionary(parsedEnvelope, "error");
        if (parsedError != null)
        {
            LegacyProxyError structured = new LegacyProxyError();
            structured.Message = NormalizeProxyErrorMessage(FirstNonEmpty(GetString(parsedError, "message"), String.Empty, "Legacy proxy execution failed."));
            structured.Code = NormalizeProxyErrorCode(
                FirstNonEmpty(GetString(parsedError, "code"), String.Empty, "legacy_proxy_failed"),
                structured.Message);
            return structured;
        }

        string details = FirstNonEmpty(
            (process == null ? String.Empty : process.Stderr),
            (process == null ? String.Empty : process.Stdout),
            "Legacy proxy execution failed.");
        string[] parts = details.Split(new char[] { ':' }, 3);
        if (parts.Length == 3 && !String.IsNullOrWhiteSpace(parts[0]) && !String.IsNullOrWhiteSpace(parts[2]))
        {
            LegacyProxyError parsed = new LegacyProxyError();
            parsed.Message = NormalizeProxyErrorMessage(parts[2]);
            parsed.Code = NormalizeProxyErrorCode(parts[0].Trim(), parsed.Message);
            return parsed;
        }

        LegacyProxyError error = new LegacyProxyError();
        error.Code = NormalizeProxyErrorCode("legacy_proxy_failed", details);
        error.Message = NormalizeProxyErrorMessage("Legacy proxy '" + (legacyExecutableName ?? String.Empty) + "' failed for operation '" + (operation ?? String.Empty) + "': " + details.Trim());
        return error;
    }

    private static Dictionary<string, object> TryParseJsonObject(string raw)
    {
        string trimmed = (raw ?? String.Empty).Trim();
        if (trimmed.Length == 0 || !trimmed.StartsWith("{", StringComparison.Ordinal))
        {
            return null;
        }

        try
        {
            return new JavaScriptSerializer().DeserializeObject(trimmed) as Dictionary<string, object>;
        }
        catch
        {
            return null;
        }
    }

    private static Dictionary<string, object> GetDictionary(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key))
        {
            return null;
        }

        return payload[key] as Dictionary<string, object>;
    }

    private static string GetString(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return Convert.ToString(payload[key]) ?? String.Empty;
    }

    private static bool GetBool(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return false;
        }

        object value = payload[key];
        if (value is bool)
        {
            return (bool)value;
        }

        bool parsed;
        return Boolean.TryParse(Convert.ToString(value), out parsed) && parsed;
    }

    private static bool LooksLikeUsageError(string message)
    {
        string normalized = (message ?? String.Empty).Trim();
        return normalized.StartsWith("usage:", StringComparison.OrdinalIgnoreCase)
            || normalized.IndexOf("usage: Ascet", StringComparison.OrdinalIgnoreCase) >= 0;
    }

    internal static string NormalizeProxyErrorCodeForTesting(string code, string message)
    {
        return NormalizeProxyErrorCode(code, message);
    }

    internal static string NormalizeProxyErrorMessageForTesting(string message)
    {
        return NormalizeProxyErrorMessage(message);
    }

    private static string NormalizeProxyErrorMessage(string message)
    {
        string normalized = (message ?? String.Empty).Trim();
        if (String.IsNullOrWhiteSpace(normalized))
        {
            return String.Empty;
        }

        string[] lines = normalized.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None);
        List<string> kept = new List<string>();
        for (int i = 0; i < lines.Length; i++)
        {
            string line = lines[i] ?? String.Empty;
            string trimmed = line.Trim();
            if (trimmed.StartsWith("StackTrace:", StringComparison.OrdinalIgnoreCase)
                || trimmed.StartsWith("at ", StringComparison.Ordinal)
                || trimmed.StartsWith("at\t", StringComparison.Ordinal)
                || trimmed.StartsWith("ÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ¯Ã‚Â¿Ã‚Â½ ", StringComparison.Ordinal))
            {
                break;
            }

            if (trimmed.StartsWith("Exception[", StringComparison.OrdinalIgnoreCase)
                || trimmed.StartsWith("Code:", StringComparison.OrdinalIgnoreCase)
                || trimmed.StartsWith("Operation:", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (trimmed.StartsWith("Message:", StringComparison.OrdinalIgnoreCase))
            {
                kept.Add(trimmed.Substring("Message:".Length).Trim());
                continue;
            }

            kept.Add(line);
        }

        return String.Join(Environment.NewLine, kept.ToArray()).Trim();
    }

    private static string NormalizeProxyErrorCode(string code, string message)
    {
        string normalizedCode = (code ?? String.Empty).Trim();
        string normalizedMessage = (message ?? String.Empty).Trim();

        if (LooksLikeUsageError(normalizedMessage))
        {
            return "invalid_argument";
        }

        if (normalizedMessage.IndexOf("No database is open", StringComparison.OrdinalIgnoreCase) >= 0
            || normalizedMessage.IndexOf("database_not_open", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            return "database_not_open";
        }

        if (normalizedMessage.IndexOf("method_not_found", StringComparison.OrdinalIgnoreCase) >= 0
            || normalizedMessage.IndexOf("Method '", StringComparison.OrdinalIgnoreCase) >= 0
                && normalizedMessage.IndexOf("was not found", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            return "method_not_found";
        }

        if (normalizedMessage.IndexOf("state_not_found", StringComparison.OrdinalIgnoreCase) >= 0
            || normalizedMessage.IndexOf("State '", StringComparison.OrdinalIgnoreCase) >= 0
                && normalizedMessage.IndexOf("was not found", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            return "state_not_found";
        }

        if (normalizedMessage.IndexOf("transition_not_found", StringComparison.OrdinalIgnoreCase) >= 0
            || normalizedMessage.IndexOf("Transition selector '", StringComparison.OrdinalIgnoreCase) >= 0
                && normalizedMessage.IndexOf("was not found", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            return "transition_not_found";
        }

        if (normalizedMessage.IndexOf("component_not_found", StringComparison.OrdinalIgnoreCase) >= 0
            || normalizedMessage.IndexOf("Component '", StringComparison.OrdinalIgnoreCase) >= 0
                && normalizedMessage.IndexOf("was not found", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            return "component_not_found";
        }

        if (normalizedMessage.IndexOf("element_not_found", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            return "element_not_found";
        }

        if (normalizedMessage.IndexOf("folder_not_found", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            return "folder_not_found";
        }

        if (normalizedMessage.IndexOf("unsupported_component_kind", StringComparison.OrdinalIgnoreCase) >= 0
            || normalizedMessage.IndexOf("not a state machine", StringComparison.OrdinalIgnoreCase) >= 0
            || normalizedMessage.IndexOf("not classified as a state machine", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            return "unsupported_component_kind";
        }

        if (normalizedMessage.IndexOf("not an ASCET project", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            return "unsupported_component_kind";
        }

        if (normalizedCode.StartsWith("Exception[", StringComparison.Ordinal)
            && (normalizedMessage.IndexOf("Failed to connect to ASCET ToolAPI", StringComparison.OrdinalIgnoreCase) >= 0
                || normalizedMessage.IndexOf("tool_connect_failed", StringComparison.OrdinalIgnoreCase) >= 0
                || normalizedMessage.IndexOf("startupLog.log", StringComparison.OrdinalIgnoreCase) >= 0))
        {
            return "tool_connect_failed";
        }

        return String.IsNullOrWhiteSpace(normalizedCode) ? "legacy_proxy_failed" : normalizedCode;
    }

    private static string QuoteArgument(string value)
    {
        string argument = value ?? String.Empty;
        if (argument.IndexOfAny(new char[] { ' ', '\t', '"' }) < 0)
        {
            return argument;
        }

        return "\"" + argument.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"";
    }

    private static string FirstNonEmpty(string first, string fallback)
    {
        return FirstNonEmpty(first, String.Empty, fallback);
    }

    private static string FirstNonEmpty(string first, string second, string fallback)
    {
        if (!String.IsNullOrWhiteSpace(first))
        {
            return first;
        }

        if (!String.IsNullOrWhiteSpace(second))
        {
            return second;
        }

        return fallback ?? String.Empty;
    }

    private sealed class SetElementDependencyVerificationHook : IWriteVerificationHook
    {
        public WriteVerificationResult Verify(WriteVerificationRequest request)
        {
            Dictionary<string, object> payload = request == null || request.WriteResult == null
                ? null
                : request.WriteResult.Payload;
            Dictionary<string, object> write = GetDictionary(payload, "write");
            Dictionary<string, object> dependency = GetDictionary(payload, "dependency");
            Dictionary<string, object> formula = GetDictionary(payload, "formula");
            string requested = GetString(request == null ? null : request.Metadata, "requestedDependency");
            string requestedFormula = GetString(request == null ? null : request.Metadata, "dependencyFormula");
            bool clearFormula = GetBool(request == null ? null : request.Metadata, "clearDependencyFormula");
            bool dryRun = GetBool(write, "dryRun");
            string after = GetString(dependency, "after");
            string afterFormula = GetString(formula, "after");

            WriteVerificationResult result = new WriteVerificationResult();
            result.Requested = true;
            result.Attempted = !dryRun;
            result.Details["after"] = after;
            result.Details["requested"] = requested;
            result.Details["formulaAfter"] = afterFormula;
            result.Details["formulaRequested"] = requestedFormula;

            if (dryRun)
            {
                result.Succeeded = true;
                result.Summary = "dependency_dry_run";
                return result;
            }

            bool dependencyMatches = String.Equals(after, requested, StringComparison.OrdinalIgnoreCase);
            bool formulaMatches = String.IsNullOrWhiteSpace(requestedFormula) || String.Equals(afterFormula, requestedFormula, StringComparison.Ordinal);
            bool clearMatches = !clearFormula || String.IsNullOrWhiteSpace(afterFormula);
            result.Succeeded = dependencyMatches && formulaMatches && clearMatches;
            result.Summary = result.Succeeded ? "dependency_readback_matches" : "dependency_readback_mismatch";
            if (!result.Succeeded)
            {
                result.Error = new AscetWriteError
                {
                    Code = "readback_mismatch",
                    Operation = "set_element_dependency",
                    Stage = "verify",
                    Message = "Dependency readback was dependency='" + after + "' formula='" + afterFormula + "' but requested dependency='" + requested + "' formula='" + requestedFormula + "'.",
                    Details = result.Details
                };
            }

            return result;
        }
    }

    private sealed class LegacyProxyProcessResult
    {
        public int ExitCode { get; set; }
        public string Stdout { get; set; }
        public string Stderr { get; set; }
    }

    private sealed class LegacyProxyError
    {
        public string Code { get; set; }
        public string Message { get; set; }
    }
}
