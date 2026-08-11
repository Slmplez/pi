using System;
using System.Collections.Generic;
using System.IO;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public sealed class AscetComponentEditableResult
{
    public bool Editable { get; set; }
}

public sealed class AscetEditableService : AscetReadDomainServiceBase
{
    public AscetComponentEditableResult CheckEditable(string itemPath)
    {
        return GetEditableState(itemPath, false);
    }

    public AscetComponentEditableResult SetEditable(string itemPath)
    {
        return GetEditableState(itemPath, true);
    }

    private AscetComponentEditableResult GetEditableState(string itemPath, bool setEditable)
    {
        string normalizedPath = AscetComponentEditable.NormalizeItemPath(itemPath);
        string operation = setEditable ? "component_editable_set" : "component_editable_check";
        return ExecuteWithSession(operation, delegate(AscetSession session)
        {
            DataBaseItem item = ResolveItemByPath(session, normalizedPath);
            Component component = item as Component;
            if (component == null)
            {
                throw new AscetReadException(
                    "unsupported_item_kind",
                    operation,
                    "Item '" + normalizedPath + "' is not an ASCET component and cannot be checked or set editable.");
            }

            bool wasVersion = component.IsVersion();
            bool wasEdition = component.IsEdition();
            if (setEditable && wasVersion && !wasEdition)
            {
                AscetSCMInterface scm = session.GetToolHandle().GetSCMInterface();
                if (scm == null)
                {
                    throw new AscetReadException(
                        "scm_interface_unavailable",
                        operation,
                        "ASCET returned no SCM interface. Ensure ASCET-SCM is installed and the database/workspace is source-control enabled.");
                }

                DataBaseItem[] items = new DataBaseItem[] { component };
                if (IsTcmDriver(scm))
                {
                    scm.ExecuteSCMScriptingCommandForItems("ReserveItem", items);
                    item = ResolveItemByPath(session, normalizedPath);
                    component = item as Component;
                    if (component == null)
                    {
                        throw new AscetReadException(
                            "unsupported_item_kind",
                            operation,
                            "Item '" + normalizedPath + "' was no longer an ASCET component after reserving it in TCM.");
                    }

                    if (component.IsVersion() && !component.IsEdition())
                    {
                        scm.ExecuteSCMScriptingCommandForItems(
                            "CreateEdition",
                            new DataBaseItem[] { component });
                    }
                }
                else
                {
                    string scmData = scm.GetItemSCMData(items);
                    scm.ExecuteSCMCommand("Lock", scmData, String.Empty);
                }

                item = ResolveItemByPath(session, normalizedPath);
                component = item as Component;
                if (component == null)
                {
                    throw new AscetReadException(
                        "unsupported_item_kind",
                        operation,
                        "Item '" + normalizedPath + "' was no longer an ASCET component after setting it editable.");
                }
            }

            bool isVersion = component.IsVersion();
            bool isEdition = component.IsEdition();
            bool usesScmState = wasVersion || wasEdition || isVersion || isEdition;
            return new AscetComponentEditableResult
            {
                Editable = isEdition || !usesScmState
            };
        });
    }

    private bool IsTcmDriver(AscetSCMInterface scm)
    {
        string binding = scm.GetSourceControlBindingInformation();
        if (String.IsNullOrWhiteSpace(binding))
        {
            return false;
        }

        return binding.IndexOf("<scmDriverId>RB_CC.TCM</scmDriverId>", StringComparison.OrdinalIgnoreCase) >= 0 ||
               binding.IndexOf("<scmDriverName>TCM</scmDriverName>", StringComparison.OrdinalIgnoreCase) >= 0;
    }
}

public static class AscetComponentEditable
{
    public static int CheckMain(string[] args)
    {
        return Run(args, false);
    }

    public static int SetMain(string[] args)
    {
        return Run(args, true);
    }

    public static string NormalizeItemPath(string itemPath)
    {
        string normalized = (itemPath ?? String.Empty).Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }
        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException("invalid_argument", "normalize_item_path", "Component path must not be empty.");
        }
        return normalized;
    }

    private static int Run(string[] args, bool setEditable)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;
        try
        {
            string itemPath = ParseItemPath(args);
            suppressedOut = new StringWriter();
            Console.SetOut(suppressedOut);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            AscetEditableService service = new AscetEditableService();
            AscetComponentEditableResult result = setEditable
                ? service.SetEditable(itemPath)
                : service.CheckEditable(itemPath);
            Console.SetOut(originalOut);
            bool editable = result != null && result.Editable;
            Dictionary<string, object> payload = new Dictionary<string, object>();
            payload["editable"] = editable;
            if (setEditable && !editable)
            {
                Dictionary<string, object> error = new Dictionary<string, object>();
                error["code"] = "component_not_editable";
                error["message"] = "Component '" + itemPath + "' remained read-only after the SCM editability command.";
                payload["error"] = error;
            }
            Console.Write(AscetJsonContract.Serialize(payload));
            return setEditable && !editable ? 2 : 0;
        }
        catch (Exception ex)
        {
            Console.SetOut(originalOut);
            Console.Error.WriteLine(FormatException(ex));
            return 1;
        }
        finally
        {
            Console.SetOut(originalOut);
            if (suppressedOut != null)
            {
                suppressedOut.Dispose();
            }
        }
    }

    private static string ParseItemPath(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException(
                "invalid_argument",
                "parse_arguments",
                "usage: AscetBridge.exe exec component_editable_(check|set) <component-path> [--json]");
        }
        for (int i = 1; i < args.Length; i++)
        {
            if (!String.Equals(args[i], "--json", StringComparison.OrdinalIgnoreCase))
            {
                throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + args[i] + "'.");
            }
        }
        return NormalizeItemPath(args[0]);
    }

    private static string FormatException(Exception ex)
    {
        AscetReadException ascet = ex as AscetReadException;
        if (ascet != null)
        {
            return ascet.Code + ":" + ascet.Operation + ":" + ascet.Message;
        }
        return ex.GetType().FullName + ":" + ex.Message;
    }
}
