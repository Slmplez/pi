using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public sealed class AscetDependentChainReadResult
{
    public string ComponentPath { get; set; }
    public string ExporterComponentPath { get; set; }
    public string Direction { get; set; }
    public AscetDependentChainDependent Dependent { get; set; }
    public IList<AscetDependentChainInput> Inputs { get; set; }
    public bool Complete { get; set; }
    public IList<string> Issues { get; set; }
    public string TempDirectory { get; set; }
}

public sealed class AscetDependentChainReadRequest
{
    public string ComponentPath { get; set; }
    public string DependentElementName { get; set; }
    public string ExporterComponentPath { get; set; }
    public string DebugDirectory { get; set; }
    public bool KeepTemp { get; set; }
}

public sealed class AscetDependentChainReadService : AscetReadDomainServiceBase
{
    public AscetDependentChainReadResult Read(AscetDependentChainReadRequest request)
    {
        Validate(request);
        return ExecuteWithSession("read_dependent_chain", delegate(AscetSession session)
        {
            return ReadInSession(session, request);
        });
    }

    internal AscetDependentChainReadResult ReadInSession(AscetSession session, AscetDependentChainReadRequest request)
    {
        Validate(request);
        return ExecuteWithBoundSession("read_dependent_chain", session, delegate(AscetSession currentSession)
        {
            CodeComponent importer = ResolveCodeComponent(currentSession, request.ComponentPath);
            CodeComponent explicitExporter = String.IsNullOrWhiteSpace(request.ExporterComponentPath)
                ? null
                : ResolveCodeComponent(currentSession, request.ExporterComponentPath);
            string exportDirectory = PrepareExportDirectory(request);
            bool deleteExport = !request.KeepTemp && String.IsNullOrWhiteSpace(request.DebugDirectory);

            try
            {
                DataBaseItem item = ResolveItemByPath(currentSession, request.ComponentPath);
                bool ok = item.ExportXMLToFile(exportDirectory, false);
                if (!ok)
                {
                    throw new AscetReadException(
                        "tool_api_error",
                        "read_dependent_chain",
                        BuildExportFailureMessage(item, request.ComponentPath, exportDirectory));
                }

                AscetDependentChainXmlResult xml = AscetDependentChainXml.ReadExportDirectory(exportDirectory, request.DependentElementName);
                AscetDependentChainReadResult result = BuildResult(request, xml, exportDirectory, deleteExport);
                FillRuntimeMatches(currentSession, importer, explicitExporter, request, result);
                FinalizeCompleteness(result);
                return result;
            }
            finally
            {
                if (deleteExport && Directory.Exists(exportDirectory))
                {
                    Directory.Delete(exportDirectory, true);
                }
            }
        });
    }

    private static void Validate(AscetDependentChainReadRequest request)
    {
        if (request == null)
        {
            throw new AscetReadException("invalid_argument", "read_dependent_chain", "Request must not be null.");
        }

        if (String.IsNullOrWhiteSpace(request.ComponentPath))
        {
            throw new AscetReadException("invalid_argument", "read_dependent_chain", "Component path must not be empty.");
        }

        if (String.IsNullOrWhiteSpace(request.DependentElementName))
        {
            throw new AscetReadException("invalid_argument", "read_dependent_chain", "Dependent element name must not be empty.");
        }
    }

    internal static string PrepareExportDirectory(AscetDependentChainReadRequest request)
    {
        if (!String.IsNullOrWhiteSpace(request.DebugDirectory))
        {
            string debugDirectory = Path.GetFullPath(request.DebugDirectory);
            Directory.CreateDirectory(debugDirectory);
            return debugDirectory;
        }

        string root = Path.Combine(Path.GetTempPath(), "ascet-ed");
        Directory.CreateDirectory(root);
        string directory = Path.Combine(root, "d-" + Guid.NewGuid().ToString("N").Substring(0, 8));
        Directory.CreateDirectory(directory);
        return directory;
    }

    private static AscetDependentChainReadResult BuildResult(AscetDependentChainReadRequest request, AscetDependentChainXmlResult xml, string exportDirectory, bool deleteExport)
    {
        IList<string> issues = new List<string>();
        if (xml != null && xml.Issues != null)
        {
            for (int i = 0; i < xml.Issues.Count; i++)
            {
                if (!String.IsNullOrWhiteSpace(xml.Issues[i]))
                {
                    issues.Add(xml.Issues[i]);
                }
            }
        }

        AscetDependentChainDependent dependent = new AscetDependentChainDependent
        {
            Name = xml == null ? request.DependentElementName : (xml.DependentName ?? request.DependentElementName),
            Oid = xml == null ? String.Empty : (xml.DependentOid ?? String.Empty),
            Scope = xml == null ? String.Empty : (xml.DependentScope ?? String.Empty),
            Kind = xml == null ? String.Empty : (xml.DependentKind ?? String.Empty),
            Dependency = xml == null ? String.Empty : (xml.Dependency ?? String.Empty),
            Formula = xml == null ? String.Empty : (xml.FormulaCode ?? String.Empty)
        };

        return new AscetDependentChainReadResult
        {
            ComponentPath = request.ComponentPath,
            ExporterComponentPath = request.ExporterComponentPath,
            Direction = "forward",
            Dependent = dependent,
            Inputs = xml == null || xml.Inputs == null ? new List<AscetDependentChainInput>() : xml.Inputs,
            Complete = false,
            Issues = issues,
            TempDirectory = deleteExport ? String.Empty : exportDirectory
        };
    }

    private void FillRuntimeMatches(AscetSession session, CodeComponent importer, CodeComponent explicitExporter, AscetDependentChainReadRequest request, AscetDependentChainReadResult result)
    {
        if (result == null || result.Inputs == null)
        {
            return;
        }

        for (int i = 0; i < result.Inputs.Count; i++)
        {
            AscetDependentChainInput input = result.Inputs[i];
            if (input == null)
            {
                continue;
            }

            AscetModelElement valueElement = FindElementByExactName(importer, input.ValueName);
            if (valueElement == null)
            {
                input.Issue = "value_element_not_found";
                AddIssue(result, input.Issue + ":" + (input.ValueName ?? String.Empty));
                continue;
            }

            input.ValueElementTypeName = valueElement.GetType().Name;
            input.ValueScope = FirstNonEmpty(input.ValueScope, SafeGetScope(valueElement));

            if (!IsImported(valueElement))
            {
                input.Issue = "value_not_imported";
                AddIssue(result, input.Issue + ":" + (input.ValueName ?? String.Empty));
                continue;
            }

            if (explicitExporter != null)
            {
                FillExplicitRuntimeMatch(explicitExporter, request.ExporterComponentPath, valueElement, input, result);
                continue;
            }

            input.ExportExists = false;
            input.ExportDiscovery = "deferred";
            input.Issue = "provider_resolution_deferred";
            AddIssue(result, input.Issue + ":" + (input.ValueName ?? String.Empty));
        }
    }

    private static void FillExplicitRuntimeMatch(CodeComponent exporter, string exporterComponentPath, AscetModelElement valueElement, AscetDependentChainInput input, AscetDependentChainReadResult result)
    {
        bool exists = exporter.ExistsExportForImport(valueElement);
        input.ExportExists = exists;
        input.ExportDiscovery = "explicit";
        if (!exists)
        {
            input.Issue = "export_not_found";
            AddIssue(result, input.Issue + ":" + (input.ValueName ?? String.Empty));
            return;
        }

        AscetModelElement exportElement = exporter.GetExportForImport(valueElement);
        if (exportElement == null)
        {
            input.Issue = "export_handle_not_returned";
            AddIssue(result, input.Issue + ":" + (input.ValueName ?? String.Empty));
            return;
        }

        FillExportElement(input, exportElement, exporterComponentPath, "explicit");
    }

    private static void FillExportElement(AscetDependentChainInput input, AscetModelElement exportElement, string ownerPath, string discovery)
    {
        input.ExportExists = true;
        input.ExportName = SafeGetName(exportElement);
        input.ExportScope = SafeGetScope(exportElement);
        input.ExportElementTypeName = exportElement == null ? String.Empty : exportElement.GetType().Name;
        input.ExportOwnerPath = ownerPath ?? String.Empty;
        input.ExportDiscovery = discovery ?? String.Empty;
    }

    private static void FinalizeCompleteness(AscetDependentChainReadResult result)
    {
        if (result == null)
        {
            return;
        }

        bool complete = result.Dependent != null &&
            String.Equals(result.Dependent.Dependency, "dependent", StringComparison.OrdinalIgnoreCase) &&
            result.Inputs != null &&
            result.Inputs.Count > 0 &&
            (result.Issues == null || result.Issues.Count == 0);

        if (complete)
        {
            for (int i = 0; i < result.Inputs.Count; i++)
            {
                AscetDependentChainInput input = result.Inputs[i];
                if (input == null || !input.ExportExists)
                {
                    complete = false;
                    break;
                }
            }
        }

        result.Complete = complete;
    }

    private static AscetModelElement FindElementByExactName(CodeComponent component, string elementName)
    {
        if (component == null || String.IsNullOrWhiteSpace(elementName))
        {
            return null;
        }

        Array modelElements = component.GetAllModelElements() as Array;
        AscetModelElement match = null;
        if (modelElements == null)
        {
            return null;
        }

        for (int i = 0; i < modelElements.Length; i++)
        {
            AscetModelElement candidate = modelElements.GetValue(i) as AscetModelElement;
            if (candidate == null || !String.Equals(SafeGetName(candidate), elementName, StringComparison.Ordinal))
            {
                continue;
            }

            if (match != null)
            {
                return null;
            }

            match = candidate;
        }

        return match;
    }

    private static bool IsImported(AscetModelElement element)
    {
        return String.Equals(SafeGetScope(element), "imported", StringComparison.OrdinalIgnoreCase);
    }

    private static string SafeGetName(AscetModelElement element)
    {
        return element == null ? String.Empty : (element.GetName() ?? String.Empty);
    }

    private static string SafeGetScope(AscetModelElement element)
    {
        try
        {
            return element == null ? String.Empty : (element.GetScope() ?? String.Empty);
        }
        catch
        {
            return String.Empty;
        }
    }

    private static string FirstNonEmpty(string first, string second)
    {
        return !String.IsNullOrWhiteSpace(first) ? first : (second ?? String.Empty);
    }

    private static void AddIssue(AscetDependentChainReadResult result, string issue)
    {
        if (result == null || String.IsNullOrWhiteSpace(issue))
        {
            return;
        }

        if (result.Issues == null)
        {
            result.Issues = new List<string>();
        }

        result.Issues.Add(issue);
    }

    private static string BuildExportFailureMessage(DataBaseItem item, string componentPath, string exportDirectory)
    {
        string toolError = String.Empty;
        try
        {
            if (item != null && item.IsToolErrorAvailable())
            {
                toolError = " toolErrorCode=" + item.GetToolErrorCode().ToString() +
                    " toolErrorMessage=" + (item.GetToolErrorMessage() ?? String.Empty);
            }
        }
        catch (Exception ex)
        {
            toolError = " toolErrorReadFailed=" + ex.Message;
        }

        return "ASCET ExportXMLToFile returned false for component '" + (componentPath ?? String.Empty) +
            "'. exportDirectory='" + (exportDirectory ?? String.Empty) +
            "' exportDirectoryLength=" + (exportDirectory == null ? 0 : exportDirectory.Length).ToString() +
            "." + toolError;
    }

}

public static class AscetDependentChainOutput
{
    public static string FormatJsonOutput(AscetDependentChainReadResult result)
    {
        return AscetJsonContract.Serialize(BuildPayload(result));
    }

    public static string FormatTextOutput(AscetDependentChainReadResult result)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(result == null ? String.Empty : (result.ComponentPath ?? String.Empty)).AppendLine();
        builder.Append("Exporter: ").Append(result == null ? String.Empty : (result.ExporterComponentPath ?? String.Empty)).AppendLine();
        builder.Append("Direction: ").Append(result == null ? String.Empty : (result.Direction ?? String.Empty)).AppendLine();
        if (result != null && result.Dependent != null)
        {
            builder.Append("Dependent: ").Append(result.Dependent.Name ?? String.Empty)
                .Append(" Scope=").Append(result.Dependent.Scope ?? String.Empty)
                .Append(" Dependency=").Append(result.Dependent.Dependency ?? String.Empty)
                .Append(" Formula=").Append(result.Dependent.Formula ?? String.Empty)
                .AppendLine();
        }

        IList<AscetDependentChainInput> inputs = result == null ? null : result.Inputs;
        builder.Append("Inputs: ").Append(inputs == null ? 0 : inputs.Count).AppendLine();
        if (inputs != null)
        {
            for (int i = 0; i < inputs.Count; i++)
            {
                AscetDependentChainInput input = inputs[i];
                if (input == null)
                {
                    continue;
                }

                builder.Append("Input: ").Append(input.ValueName ?? String.Empty)
                    .Append(" Formal=").Append(input.FormalName ?? String.Empty)
                    .Append(" ExportExists=").Append(input.ExportExists)
                    .Append(" Export=").Append(input.ExportName ?? String.Empty)
                    .AppendLine();
            }
        }

        builder.Append("Complete: ").Append(result != null && result.Complete).AppendLine();
        return builder.ToString();
    }

    private static Dictionary<string, object> BuildPayload(AscetDependentChainReadResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["component"] = result == null ? String.Empty : (result.ComponentPath ?? String.Empty);
        if (result != null && !String.IsNullOrWhiteSpace(result.ExporterComponentPath))
        {
            payload["exporter"] = result.ExporterComponentPath;
        }
        payload["direction"] = result == null ? String.Empty : (result.Direction ?? String.Empty);
        payload["dependent"] = BuildDependentPayload(result == null ? null : result.Dependent);
        payload["dependencyFormula"] = BuildDependencyFormulaPayload(result);

        List<Dictionary<string, object>> inputs = new List<Dictionary<string, object>>();
        IList<AscetDependentChainInput> sourceInputs = result == null ? null : result.Inputs;
        if (sourceInputs != null)
        {
            for (int i = 0; i < sourceInputs.Count; i++)
            {
                if (sourceInputs[i] != null)
                {
                    inputs.Add(BuildInputPayload(sourceInputs[i]));
                }
            }
        }

        payload["inputs"] = inputs;
        payload["complete"] = result != null && result.Complete;

        List<string> issues = new List<string>();
        IList<string> sourceIssues = result == null ? null : result.Issues;
        if (sourceIssues != null)
        {
            for (int i = 0; i < sourceIssues.Count; i++)
            {
                if (!String.IsNullOrWhiteSpace(sourceIssues[i]))
                {
                    issues.Add(sourceIssues[i]);
                }
            }
        }

        payload["issues"] = issues;
        if (result != null && !String.IsNullOrWhiteSpace(result.TempDirectory))
        {
            payload["tempDirectory"] = result.TempDirectory;
        }

        return payload;
    }

    private static Dictionary<string, object> BuildDependencyFormulaPayload(AscetDependentChainReadResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        string code = result == null || result.Dependent == null ? String.Empty : (result.Dependent.Formula ?? String.Empty);
        bool exists = !String.IsNullOrWhiteSpace(code);
        payload["exists"] = exists;
        if (exists)
        {
            payload["code"] = code;
        }

        List<string> references = new List<string>();
        List<Dictionary<string, object>> mappings = new List<Dictionary<string, object>>();
        IList<AscetDependentChainInput> inputs = result == null ? null : result.Inputs;
        if (inputs != null)
        {
            for (int i = 0; i < inputs.Count; i++)
            {
                AscetDependentChainInput input = inputs[i];
                if (input == null)
                {
                    continue;
                }

                string formal = input.FormalName ?? String.Empty;
                if (!String.IsNullOrWhiteSpace(formal) && !references.Contains(formal))
                {
                    references.Add(formal);
                }

                Dictionary<string, object> mapping = new Dictionary<string, object>();
                mapping["formal"] = formal;
                mapping["imported"] = input.ValueName ?? String.Empty;
                if (!String.IsNullOrWhiteSpace(input.ValueScope))
                {
                    mapping["importedScope"] = input.ValueScope;
                }
                if (!String.IsNullOrWhiteSpace(input.VariantName))
                {
                    mapping["variant"] = input.VariantName;
                }
                mappings.Add(mapping);
            }
        }

        if (references.Count == 0 && exists)
        {
            IList<string> parsedReferences = ExtractFormulaReferences(code);
            for (int i = 0; i < parsedReferences.Count; i++)
            {
                if (!references.Contains(parsedReferences[i]))
                {
                    references.Add(parsedReferences[i]);
                }
            }
        }

        payload["references"] = references;
        payload["mappings"] = mappings;
        return payload;
    }

    private static IList<string> ExtractFormulaReferences(string formula)
    {
        List<string> result = new List<string>();
        if (String.IsNullOrWhiteSpace(formula))
        {
            return result;
        }

        MatchCollection matches = Regex.Matches(formula, "[A-Za-z_][A-Za-z0-9_]*");
        for (int i = 0; i < matches.Count; i++)
        {
            string value = matches[i].Value;
            if (IsFormulaKeyword(value) || result.Contains(value))
            {
                continue;
            }

            result.Add(value);
        }

        return result;
    }

    private static bool IsFormulaKeyword(string value)
    {
        return String.Equals(value, "true", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(value, "false", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(value, "and", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(value, "or", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(value, "not", StringComparison.OrdinalIgnoreCase);
    }

    private static Dictionary<string, object> BuildDependentPayload(AscetDependentChainDependent dependent)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["name"] = dependent == null ? String.Empty : (dependent.Name ?? String.Empty);
        if (dependent != null && !String.IsNullOrWhiteSpace(dependent.Scope))
        {
            payload["scope"] = dependent.Scope;
        }
        if (dependent != null && !String.IsNullOrWhiteSpace(dependent.Kind))
        {
            payload["kind"] = dependent.Kind;
        }
        if (dependent != null && !String.IsNullOrWhiteSpace(dependent.Dependency))
        {
            payload["dependency"] = dependent.Dependency;
        }
        if (dependent != null && !String.IsNullOrWhiteSpace(dependent.Formula))
        {
            payload["formula"] = dependent.Formula;
        }
        return payload;
    }

    private static Dictionary<string, object> BuildInputPayload(AscetDependentChainInput input)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        if (!String.IsNullOrWhiteSpace(input.VariantName))
        {
            payload["variant"] = input.VariantName;
        }

        Dictionary<string, object> formal = new Dictionary<string, object>();
        formal["name"] = input.FormalName ?? String.Empty;
        if (!String.IsNullOrWhiteSpace(input.FormalOid))
        {
            formal["oid"] = input.FormalOid;
        }
        payload["formal"] = formal;

        Dictionary<string, object> value = new Dictionary<string, object>();
        value["name"] = input.ValueName ?? String.Empty;
        if (!String.IsNullOrWhiteSpace(input.ValueScope))
        {
            value["scope"] = input.ValueScope;
        }
        if (!String.IsNullOrWhiteSpace(input.ValueKind))
        {
            value["kind"] = input.ValueKind;
        }
        if (!String.IsNullOrWhiteSpace(input.ValueElementTypeName))
        {
            value["type"] = input.ValueElementTypeName;
        }
        if (!String.IsNullOrWhiteSpace(input.ValueOid))
        {
            value["oid"] = input.ValueOid;
        }
        payload["value"] = value;

        Dictionary<string, object> export = new Dictionary<string, object>();
        export["exists"] = input.ExportExists;
        if (!String.IsNullOrWhiteSpace(input.ExportDiscovery))
        {
            export["discovery"] = input.ExportDiscovery;
        }
        if (input.ExportExists)
        {
            if (!String.IsNullOrWhiteSpace(input.ExportName))
            {
                export["name"] = input.ExportName;
            }
            if (!String.IsNullOrWhiteSpace(input.ExportScope))
            {
                export["scope"] = input.ExportScope;
            }
            if (!String.IsNullOrWhiteSpace(input.ExportElementTypeName))
            {
                export["type"] = input.ExportElementTypeName;
            }
            if (!String.IsNullOrWhiteSpace(input.ExportOwnerPath))
            {
                export["owner"] = input.ExportOwnerPath;
            }
        }
        else if (input.ExportCandidates != null && input.ExportCandidates.Count > 0)
        {
            List<Dictionary<string, object>> candidates = new List<Dictionary<string, object>>();
            for (int i = 0; i < input.ExportCandidates.Count; i++)
            {
                AscetDependentChainExportCandidate candidate = input.ExportCandidates[i];
                if (candidate == null)
                {
                    continue;
                }

                Dictionary<string, object> candidatePayload = new Dictionary<string, object>();
                if (!String.IsNullOrWhiteSpace(candidate.Name))
                {
                    candidatePayload["name"] = candidate.Name;
                }
                if (!String.IsNullOrWhiteSpace(candidate.Scope))
                {
                    candidatePayload["scope"] = candidate.Scope;
                }
                if (!String.IsNullOrWhiteSpace(candidate.Type))
                {
                    candidatePayload["type"] = candidate.Type;
                }
                if (!String.IsNullOrWhiteSpace(candidate.Owner))
                {
                    candidatePayload["owner"] = candidate.Owner;
                }

                candidates.Add(candidatePayload);
            }

            export["candidates"] = candidates;
        }
        payload["export"] = export;

        if (!String.IsNullOrWhiteSpace(input.Issue))
        {
            payload["issue"] = input.Issue;
        }

        return payload;
    }
}
