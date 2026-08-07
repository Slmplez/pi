using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public sealed class AscetSetElementDependencyArguments
{
    public string TargetPath { get; set; }
    public string ElementName { get; set; }
    public string RequestedDependency { get; set; }
    public string DependencyFormula { get; set; }
    public Dictionary<string, string> DependencyMappings { get; set; }
    public bool ClearDependencyFormula { get; set; }
    public string TargetKind { get; set; }
    public string MatchMode { get; set; }
    public bool DryRun { get; set; }
    public string BackupDirectory { get; set; }
    public bool VerifyReadback { get; set; }
    public bool EmitJson { get; set; }
}

public sealed class AscetSetElementDependencyResult
{
    public string TargetPath { get; set; }
    public string TargetKind { get; set; }
    public string MatchMode { get; set; }
    public string ElementName { get; set; }
    public string RequestedDependency { get; set; }
    public bool DryRun { get; set; }
    public bool WriteSucceeded { get; set; }
    public bool VerifyReadbackRequested { get; set; }
    public bool ReadbackVerified { get; set; }
    public string BackupDirectory { get; set; }
    public int MatchesChanged { get; set; }
    public string BeforeDependency { get; set; }
    public string AfterDependency { get; set; }
    public string BeforeFormula { get; set; }
    public string AfterFormula { get; set; }
    public bool FormulaChanged { get; set; }
    public bool FormulaCleared { get; set; }
    public IList<AscetDependencyFormulaMappingResult> FormulaMappings { get; set; }
    public AscetElementDependencyPlanResult Plan { get; set; }
    public IList<string> AttemptedMethods { get; set; }
    public IList<string> Issues { get; set; }
}

public sealed class AscetDependencyFormulaMappingResult
{
    public string FormalName { get; set; }
    public string ImportedParameterName { get; set; }
    public bool Verified { get; set; }
    public string Issue { get; set; }
}

public sealed class AscetSetElementDependencyService : AscetReadDomainServiceBase
{
    private const bool DependencyImportDiscardImplementation = true;

    public AscetSetElementDependencyResult Set(AscetSetElementDependencyArguments arguments)
    {
        Validate(arguments);
        if (String.Equals(arguments.TargetKind, "folder", StringComparison.OrdinalIgnoreCase))
        {
            return SetFolder(arguments);
        }

        return ExecuteWithSession("set_element_dependency", delegate(AscetSession session)
        {
            CodeComponent component = ResolveCodeComponent(session, arguments.TargetPath);
            List<string> attempted = new List<string>();
            List<string> issues = new List<string>();
            AscetElementDependencyPlanResult plan = PlanComponent(component, arguments.TargetPath, arguments.ElementName, attempted);
            AscetElementDependencyPlanMatch match = RequireSingleSupportedMatch(plan, arguments.ElementName);
            bool wantDependent = String.Equals(arguments.RequestedDependency, "dependent", StringComparison.OrdinalIgnoreCase);
            bool beforeDependent = String.Equals(match.BeforeDependency, "dependent", StringComparison.OrdinalIgnoreCase);
            string beforeFormula = match.FormulaCode ?? String.Empty;
            bool hasFormula = !String.IsNullOrWhiteSpace(arguments.DependencyFormula);
            bool hasMappings = arguments.DependencyMappings != null && arguments.DependencyMappings.Count > 0;
            bool needsDependencyWrite = beforeDependent != wantDependent;
            bool needsFormulaWrite = (hasFormula && !String.Equals(beforeFormula, arguments.DependencyFormula, StringComparison.Ordinal)) ||
                (hasFormula && hasMappings) ||
                (arguments.ClearDependencyFormula && !String.IsNullOrWhiteSpace(beforeFormula));
            bool needsWrite = needsDependencyWrite || needsFormulaWrite;

            if (arguments.DryRun)
            {
                return new AscetSetElementDependencyResult
                {
                    TargetPath = arguments.TargetPath,
                    TargetKind = "component",
                    MatchMode = arguments.MatchMode,
                    ElementName = arguments.ElementName,
                    RequestedDependency = arguments.RequestedDependency,
                    DryRun = true,
                    WriteSucceeded = false,
                    VerifyReadbackRequested = arguments.VerifyReadback,
                    ReadbackVerified = false,
                    BackupDirectory = String.Empty,
                    MatchesChanged = 0,
                    BeforeDependency = match.BeforeDependency,
                    AfterDependency = match.BeforeDependency,
                    BeforeFormula = beforeFormula,
                    AfterFormula = arguments.ClearDependencyFormula ? String.Empty : (hasFormula ? arguments.DependencyFormula : beforeFormula),
                    FormulaChanged = needsFormulaWrite,
                    FormulaCleared = arguments.ClearDependencyFormula,
                    FormulaMappings = BuildMappingResults(arguments.DependencyMappings, false, "dry_run"),
                    Plan = plan,
                    AttemptedMethods = attempted,
                    Issues = issues
                };
            }

            string backupDirectory = String.Empty;
            int matchesChanged = 0;
            string afterDependency = match.BeforeDependency;
            string afterFormula = beforeFormula;
            bool backupCreated = false;

            try
            {
                if (!needsWrite)
                {
                    issues.Add("Element already has requested dependency state and formula.");
                }
                else
                {
                    backupDirectory = ResolveBackupDirectory(arguments.BackupDirectory, arguments.TargetPath);
                    attempted.Add("ExportXMLToFile(backup)");
                    Directory.CreateDirectory(backupDirectory);
                    if (!component.ExportXMLToFile(backupDirectory, false))
                    {
                        throw new AscetReadException("tool_api_error", "set_element_dependency", "ASCET ExportXMLToFile returned false while backing up component '" + arguments.TargetPath + "'.");
                    }
                    WriteBackupManifest(backupDirectory, arguments.TargetPath);
                    backupCreated = true;

                    ApplyXmlDependency(session, component, arguments.TargetPath, arguments.ElementName, wantDependent, arguments.DependencyFormula, arguments.DependencyMappings, arguments.ClearDependencyFormula, attempted);
                    matchesChanged = 1;
                }

                CodeComponent readbackComponent = ResolveCodeComponent(session, arguments.TargetPath);
                AscetElementDependencyPlanResult afterPlan = PlanComponent(readbackComponent, arguments.TargetPath, arguments.ElementName, attempted);
                AscetElementDependencyPlanMatch afterMatch = RequireSinglePlanMatch(afterPlan, arguments.ElementName);
                afterDependency = afterMatch.BeforeDependency;
                afterFormula = afterMatch.FormulaCode ?? String.Empty;
                bool afterDependent = String.Equals(afterDependency, "dependent", StringComparison.OrdinalIgnoreCase);
                bool formulaVerified = !hasFormula || String.Equals(afterFormula, arguments.DependencyFormula, StringComparison.Ordinal);
                bool clearVerified = !arguments.ClearDependencyFormula || String.IsNullOrWhiteSpace(afterFormula);
                bool readbackVerified = !arguments.VerifyReadback || (afterDependent == wantDependent && formulaVerified && clearVerified);
                if (arguments.VerifyReadback && !readbackVerified)
                {
                    throw new AscetReadException("readback_mismatch", "set_element_dependency", "Element '" + arguments.ElementName + "' dependency/formula readback is dependency='" + afterDependency + "' formula='" + afterFormula + "' but requested dependency='" + arguments.RequestedDependency + "' formula='" + (arguments.DependencyFormula ?? String.Empty) + "'.");
                }

                return new AscetSetElementDependencyResult
                {
                    TargetPath = arguments.TargetPath,
                    TargetKind = "component",
                    MatchMode = arguments.MatchMode,
                    ElementName = arguments.ElementName,
                    RequestedDependency = arguments.RequestedDependency,
                    DryRun = false,
                    WriteSucceeded = afterDependent == wantDependent,
                    VerifyReadbackRequested = arguments.VerifyReadback,
                    ReadbackVerified = readbackVerified,
                    BackupDirectory = backupDirectory,
                    MatchesChanged = matchesChanged,
                    BeforeDependency = match.BeforeDependency,
                    AfterDependency = afterDependency,
                    BeforeFormula = beforeFormula,
                    AfterFormula = afterFormula,
                    FormulaChanged = !String.Equals(beforeFormula, afterFormula, StringComparison.Ordinal),
                    FormulaCleared = arguments.ClearDependencyFormula && String.IsNullOrWhiteSpace(afterFormula),
                    FormulaMappings = BuildMappingResults(arguments.DependencyMappings, arguments.VerifyReadback ? readbackVerified : matchesChanged > 0, String.Empty),
                    Plan = plan,
                    AttemptedMethods = attempted,
                    Issues = issues
                };
            }
            catch (Exception originalError)
            {
                if (!backupCreated)
                {
                    throw;
                }

                try
                {
                    RestoreBackup(
                        session,
                        arguments.TargetPath,
                        arguments.ElementName,
                        match.BeforeDependency,
                        beforeFormula,
                        backupDirectory,
                        attempted);
                }
                catch (Exception rollbackError)
                {
                    throw new AscetReadException(
                        "dependency_write_rollback_failed",
                        "set_element_dependency",
                        "originalError=" + originalError.Message + "; rollbackError=" + rollbackError.Message + "; backupDirectory=" + backupDirectory,
                        rollbackError);
                }

                throw;
            }
        });
    }

    private static void Validate(AscetSetElementDependencyArguments arguments)
    {
        if (arguments == null)
        {
            throw new AscetReadException("invalid_argument", "set_element_dependency", "Arguments must not be null.");
        }

        if (String.IsNullOrWhiteSpace(arguments.TargetPath))
        {
            throw new AscetReadException("invalid_argument", "set_element_dependency", "Target path must not be empty.");
        }

        if (String.IsNullOrWhiteSpace(arguments.ElementName))
        {
            throw new AscetReadException("invalid_argument", "set_element_dependency", "Element name must not be empty.");
        }

        if (!String.Equals(arguments.RequestedDependency, "dependent", StringComparison.OrdinalIgnoreCase) &&
            !String.Equals(arguments.RequestedDependency, "independent", StringComparison.OrdinalIgnoreCase))
        {
            throw new AscetReadException("invalid_argument", "set_element_dependency", "Requested dependency must be dependent or independent.");
        }

        AscetSetElementDependency.ValidateFormulaArguments(
            arguments.RequestedDependency,
            arguments.DependencyFormula,
            arguments.DependencyMappings,
            arguments.ClearDependencyFormula,
            "set_element_dependency");

        string targetKind = String.IsNullOrWhiteSpace(arguments.TargetKind) ? "auto" : arguments.TargetKind.Trim().ToLowerInvariant();
        if (String.Equals(targetKind, "project", StringComparison.OrdinalIgnoreCase))
        {
            throw new AscetReadException("unsupported_target_kind", "set_element_dependency", "Project target writes are not supported until project component enumeration is verified.");
        }

        if (!String.Equals(targetKind, "auto", StringComparison.OrdinalIgnoreCase) &&
            !String.Equals(targetKind, "component", StringComparison.OrdinalIgnoreCase) &&
            !String.Equals(targetKind, "folder", StringComparison.OrdinalIgnoreCase))
        {
            throw new AscetReadException("unsupported_target_kind", "set_element_dependency", "Target kind '" + targetKind + "' is not supported by this single-component write phase.");
        }

        string matchMode = String.IsNullOrWhiteSpace(arguments.MatchMode) ? "exact" : arguments.MatchMode.Trim().ToLowerInvariant();
        if (!String.Equals(matchMode, "exact", StringComparison.Ordinal) &&
            !String.Equals(matchMode, "all", StringComparison.Ordinal))
        {
            throw new AscetReadException("invalid_argument", "set_element_dependency", "Match mode must be exact or all.");
        }
    }

    private AscetSetElementDependencyResult SetFolder(AscetSetElementDependencyArguments arguments)
    {
        AscetElementDependencyPlanService planner = new AscetElementDependencyPlanService();
        AscetElementDependencyPlanResult plan = planner.Plan(new AscetElementDependencyPlanArguments
        {
            TargetPath = arguments.TargetPath,
            ElementName = arguments.ElementName,
            TargetKind = "folder",
            EmitJson = false
        });

        IList<AscetElementDependencyPlanMatch> matches = plan.Matches ?? new List<AscetElementDependencyPlanMatch>();
        List<AscetElementDependencyPlanMatch> supported = new List<AscetElementDependencyPlanMatch>();
        for (int i = 0; i < matches.Count; i++)
        {
            if (matches[i] != null && matches[i].Supported)
            {
                supported.Add(matches[i]);
            }
        }

        if (supported.Count == 0)
        {
            throw new AscetReadException("element_not_found", "set_element_dependency", "No supported dependency candidates were found in folder '" + arguments.TargetPath + "'.");
        }

        string matchMode = String.IsNullOrWhiteSpace(arguments.MatchMode) ? "exact" : arguments.MatchMode.Trim().ToLowerInvariant();
        if (supported.Count > 1 && !String.Equals(matchMode, "all", StringComparison.Ordinal))
        {
            throw new AscetReadException("element_ambiguous", "set_element_dependency", "Element '" + arguments.ElementName + "' matched " + supported.Count + " supported candidates. Use --match all to write all candidates serially.");
        }

        if (arguments.DryRun)
        {
            return new AscetSetElementDependencyResult
            {
                TargetPath = arguments.TargetPath,
                TargetKind = "folder",
                MatchMode = matchMode,
                ElementName = arguments.ElementName,
                RequestedDependency = arguments.RequestedDependency,
                DryRun = true,
                WriteSucceeded = false,
                VerifyReadbackRequested = arguments.VerifyReadback,
                ReadbackVerified = false,
                BackupDirectory = String.Empty,
                MatchesChanged = 0,
                BeforeDependency = String.Empty,
                AfterDependency = String.Empty,
                BeforeFormula = String.Empty,
                AfterFormula = arguments.ClearDependencyFormula ? String.Empty : (arguments.DependencyFormula ?? String.Empty),
                FormulaChanged = !String.IsNullOrWhiteSpace(arguments.DependencyFormula) || arguments.ClearDependencyFormula,
                FormulaCleared = arguments.ClearDependencyFormula,
                FormulaMappings = BuildMappingResults(arguments.DependencyMappings, false, "dry_run"),
                Plan = plan,
                AttemptedMethods = new List<string> { "PlanFolder" },
                Issues = new List<string>()
            };
        }

        int changed = 0;
        bool allVerified = true;
        List<string> attempted = new List<string> { "PlanFolder" };
        List<string> issues = new List<string>();
        string backupRoot = String.IsNullOrWhiteSpace(arguments.BackupDirectory) ? String.Empty : Path.GetFullPath(arguments.BackupDirectory);

        for (int i = 0; i < supported.Count; i++)
        {
            AscetElementDependencyPlanMatch candidate = supported[i];
            string childBackup = String.IsNullOrWhiteSpace(backupRoot) ? String.Empty : Path.Combine(backupRoot, "component-" + ShortHash(candidate.ComponentPath ?? String.Empty));
            AscetSetElementDependencyResult child = Set(new AscetSetElementDependencyArguments
            {
                TargetPath = candidate.ComponentPath,
                ElementName = candidate.ElementName,
                RequestedDependency = arguments.RequestedDependency,
                DependencyFormula = arguments.DependencyFormula,
                DependencyMappings = arguments.DependencyMappings,
                ClearDependencyFormula = arguments.ClearDependencyFormula,
                TargetKind = "component",
                MatchMode = "exact",
                DryRun = false,
                BackupDirectory = childBackup,
                VerifyReadback = arguments.VerifyReadback,
                EmitJson = false
            });

            changed += child.MatchesChanged;
            allVerified = allVerified && child.ReadbackVerified;
            attempted.Add("SetComponent:" + candidate.ComponentPath);
            if (child.Issues != null)
            {
                for (int j = 0; j < child.Issues.Count; j++)
                {
                    issues.Add(candidate.ComponentPath + ":" + child.Issues[j]);
                }
            }
        }

        return new AscetSetElementDependencyResult
        {
            TargetPath = arguments.TargetPath,
            TargetKind = "folder",
            MatchMode = matchMode,
            ElementName = arguments.ElementName,
            RequestedDependency = arguments.RequestedDependency,
            DryRun = false,
            WriteSucceeded = true,
            VerifyReadbackRequested = arguments.VerifyReadback,
            ReadbackVerified = !arguments.VerifyReadback || allVerified,
            BackupDirectory = backupRoot,
            MatchesChanged = changed,
            BeforeDependency = String.Empty,
            AfterDependency = arguments.RequestedDependency,
            BeforeFormula = String.Empty,
            AfterFormula = arguments.ClearDependencyFormula ? String.Empty : (arguments.DependencyFormula ?? String.Empty),
            FormulaChanged = !String.IsNullOrWhiteSpace(arguments.DependencyFormula) || arguments.ClearDependencyFormula,
            FormulaCleared = arguments.ClearDependencyFormula,
            FormulaMappings = BuildMappingResults(arguments.DependencyMappings, allVerified, String.Empty),
            Plan = plan,
            AttemptedMethods = attempted,
            Issues = issues
        };
    }

    private static IList<AscetDependencyFormulaMappingResult> BuildMappingResults(IDictionary<string, string> mappings, bool verified, string issue)
    {
        List<AscetDependencyFormulaMappingResult> results = new List<AscetDependencyFormulaMappingResult>();
        if (mappings == null)
        {
            return results;
        }

        foreach (KeyValuePair<string, string> mapping in mappings)
        {
            results.Add(new AscetDependencyFormulaMappingResult
            {
                FormalName = mapping.Key ?? String.Empty,
                ImportedParameterName = mapping.Value ?? String.Empty,
                Verified = verified,
                Issue = issue ?? String.Empty
            });
        }

        return results;
    }

    private static string SanitizePath(string value)
    {
        return (value ?? "target").Replace('\\', '_').Replace('/', '_').Replace(':', '_');
    }

    private static AscetElementDependencyPlanResult PlanComponent(CodeComponent component, string componentPath, string elementName, IList<string> attempted)
    {
        string directory = CreateTempDirectory("ascet-dependency-set-plan");
        try
        {
            attempted.Add("ExportXMLToFile(plan)");
            if (!component.ExportXMLToFile(directory, false))
            {
                throw new AscetReadException("tool_api_error", "set_element_dependency", "ASCET ExportXMLToFile returned false for component '" + componentPath + "'.");
            }

            string main = AscetElementDependencyXml.FindMainAmd(directory);
            if (String.IsNullOrWhiteSpace(main))
            {
                throw new AscetReadException("tool_api_error", "set_element_dependency", "Exported component did not contain a *.main.amd file.");
            }

            IList<AscetElementDependencyCandidate> candidates = AscetElementDependencyXml.FindCandidates(main, elementName);
            List<AscetElementDependencyPlanMatch> matches = new List<AscetElementDependencyPlanMatch>();
            for (int i = 0; i < candidates.Count; i++)
            {
                AscetElementDependencyCandidate candidate = candidates[i];
                matches.Add(new AscetElementDependencyPlanMatch
                {
                    ComponentPath = componentPath,
                    ElementName = candidate.ElementName ?? String.Empty,
                    Kind = candidate.Kind ?? String.Empty,
                    Scope = candidate.Scope ?? String.Empty,
                    Schema = candidate.Schema ?? String.Empty,
                    BeforeDependency = candidate.BeforeDependency ?? String.Empty,
                    FormulaCode = candidate.FormulaCode ?? String.Empty,
                    IsParameter = candidate.IsParameter,
                    IsDependent = candidate.IsDependent,
                    Supported = candidate.Supported,
                    UnsupportedReason = candidate.UnsupportedReason ?? String.Empty
                });
            }

            return new AscetElementDependencyPlanResult
            {
                TargetPath = componentPath,
                TargetKind = "component",
                ElementName = elementName ?? String.Empty,
                Matches = matches,
                Issues = new List<string>()
            };
        }
        finally
        {
            TryDeleteDirectory(directory);
        }
    }

    private static AscetElementDependencyPlanMatch RequireSingleSupportedMatch(AscetElementDependencyPlanResult plan, string elementName)
    {
        AscetElementDependencyPlanMatch match = RequireSinglePlanMatch(plan, elementName);
        if (!match.Supported)
        {
            throw new AscetReadException("invalid_dependency_target", "set_element_dependency", "Element '" + elementName + "' is not supported for dependency writes: " + (match.UnsupportedReason ?? String.Empty));
        }

        return match;
    }

    private static AscetElementDependencyPlanMatch RequireSinglePlanMatch(AscetElementDependencyPlanResult plan, string elementName)
    {
        IList<AscetElementDependencyPlanMatch> matches = plan == null ? null : plan.Matches;
        if (matches == null || matches.Count == 0)
        {
            throw new AscetReadException("element_not_found", "set_element_dependency", "Element '" + elementName + "' was not found in target.");
        }

        if (matches.Count > 1)
        {
            throw new AscetReadException("element_ambiguous", "set_element_dependency", "Element '" + elementName + "' matched " + matches.Count + " candidates.");
        }

        return matches[0];
    }

    private static void ApplyXmlDependency(AscetSession session, CodeComponent component, string componentPath, string elementName, bool wantDependent, string dependencyFormula, IDictionary<string, string> dependencyMappings, bool clearDependencyFormula, IList<string> attempted)
    {
        string directory = CreateTempDirectory("ascet-dependency-set-apply");
        try
        {
            attempted.Add("ExportXMLToFile(apply)");
            if (!component.ExportXMLToFile(directory, false))
            {
                throw new AscetReadException("tool_api_error", "set_element_dependency", "ASCET ExportXMLToFile returned false for component '" + componentPath + "'.");
            }

            string main = AscetElementDependencyXml.FindMainAmd(directory);
            if (String.IsNullOrWhiteSpace(main))
            {
                throw new AscetReadException("tool_api_error", "set_element_dependency", "Exported component did not contain a *.main.amd file.");
            }

            string data = AscetElementDependencyXml.FindDataAmd(directory, main);
            attempted.Add("SetMainAmdDependencyAndFormula");
            AscetElementDependencyXml.SetMainAmdDependencyAndFormula(main, data, elementName, wantDependent, dependencyFormula, dependencyMappings, clearDependencyFormula);

            AscetItemPath parsed = AscetItemPath.Parse(componentPath);
            AscetDataBase database = session.GetCurrentDatabaseHandle();
            AscetFolder folder = ResolveFolder(database, parsed.FolderPath);
            attempted.Add("ImportXMLFromFile");
            DataBaseItem imported = folder.ImportXMLFromFile(directory, Path.GetFileName(main), DependencyImportDiscardImplementation, false, false, false);
            if (imported == null)
            {
                throw new AscetReadException("tool_api_error", "set_element_dependency", "ASCET ImportXMLFromFile returned null for component '" + componentPath + "'.");
            }
        }
        finally
        {
            TryDeleteDirectory(directory);
        }
    }

    private void RestoreBackup(
        AscetSession session,
        string componentPath,
        string elementName,
        string expectedDependency,
        string expectedFormula,
        string backupDirectory,
        IList<string> attempted)
    {
        string main = AscetElementDependencyXml.FindMainAmd(backupDirectory);
        if (String.IsNullOrWhiteSpace(main))
        {
            throw new AscetReadException("dependency_write_rollback_failed", "set_element_dependency", "Backup directory did not contain a *.main.amd file.");
        }

        AscetItemPath parsed = AscetItemPath.Parse(componentPath);
        AscetDataBase database = session.GetCurrentDatabaseHandle();
        AscetFolder folder = ResolveFolder(database, parsed.FolderPath);
        attempted.Add("ImportXMLFromFile(rollback)");
        DataBaseItem restored = folder.ImportXMLFromFile(backupDirectory, Path.GetFileName(main), DependencyImportDiscardImplementation, false, false, false);
        if (restored == null)
        {
            throw new AscetReadException("dependency_write_rollback_failed", "set_element_dependency", "ASCET ImportXMLFromFile returned null while restoring component '" + componentPath + "'.");
        }

        CodeComponent restoredComponent = ResolveCodeComponent(session, componentPath);
        AscetElementDependencyPlanResult restoredPlan = PlanComponent(restoredComponent, componentPath, elementName, attempted);
        AscetElementDependencyPlanMatch restoredMatch = RequireSinglePlanMatch(restoredPlan, elementName);
        if (!String.Equals(restoredMatch.BeforeDependency, expectedDependency, StringComparison.OrdinalIgnoreCase) ||
            !String.Equals(restoredMatch.FormulaCode ?? String.Empty, expectedFormula ?? String.Empty, StringComparison.Ordinal))
        {
            throw new AscetReadException(
                "dependency_write_rollback_failed",
                "set_element_dependency",
                "Rollback live readback did not restore dependency='" + restoredMatch.BeforeDependency + "' formula='" + (restoredMatch.FormulaCode ?? String.Empty) + "'.");
        }
    }

    private static AscetFolder ResolveFolder(AscetDataBase database, string folderPath)
    {
        if (database == null)
        {
            throw new AscetReadException("invalid_argument", "resolve_folder", "Database must not be null.");
        }

        string normalizedPath = folderPath == null ? String.Empty : folderPath.Trim().Trim('\\');
        if (String.IsNullOrWhiteSpace(normalizedPath))
        {
            throw new AscetReadException("invalid_argument", "resolve_folder", "Folder path must not be empty.");
        }

        AscetFolder[] topFolders = database.GetAllAscetFolders();
        Array currentLevel = topFolders;
        AscetFolder current = null;
        string[] segments = normalizedPath.Split(new[] { '\\' }, StringSplitOptions.RemoveEmptyEntries);
        for (int i = 0; i < segments.Length; i++)
        {
            current = FindFolderByName(currentLevel, segments[i]);
            if (current == null)
            {
                throw new AscetReadException("folder_not_found", "resolve_folder", "Folder '" + normalizedPath + "' was not found.");
            }

            currentLevel = InvokeFolderArray(current);
        }

        return current;
    }

    private static AscetFolder FindFolderByName(Array folders, string name)
    {
        if (folders == null)
        {
            return null;
        }

        for (int i = 0; i < folders.Length; i++)
        {
            AscetFolder folder = folders.GetValue(i) as AscetFolder;
            if (folder != null && String.Equals(folder.GetName(), name, StringComparison.Ordinal))
            {
                return folder;
            }
        }

        return null;
    }

    private static Array InvokeFolderArray(AscetFolder folder)
    {
        if (folder == null)
        {
            return null;
        }

        string[] names = new[] { "GetAllAscetFolders", "GetAllFolders", "GetAllSubFolders", "GetSubFolders" };
        for (int i = 0; i < names.Length; i++)
        {
            MethodInfo method = folder.GetType().GetMethod(names[i], BindingFlags.Instance | BindingFlags.Public);
            if (method == null)
            {
                continue;
            }

            object value = method.Invoke(folder, new object[0]);
            Array array = value as Array;
            if (array != null)
            {
                return array;
            }
        }

        return null;
    }

    private static string ResolveBackupDirectory(string requestedBackupDirectory, string targetPath)
    {
        if (!String.IsNullOrWhiteSpace(requestedBackupDirectory))
        {
            return Path.GetFullPath(requestedBackupDirectory);
        }

        return Path.GetFullPath(Path.Combine("output", "ascet-xml", "backup-" + ShortHash(targetPath ?? "target") + "-" + DateTime.Now.ToString("yyyyMMdd-HHmmss")));
    }

    private static string CreateTempDirectory(string prefix)
    {
        string root = Path.Combine(Path.GetTempPath(), "ascet-ed");
        Directory.CreateDirectory(root);
        string directory = Path.Combine(root, CompactTempPrefix(prefix) + "-" + Guid.NewGuid().ToString("N").Substring(0, 8));
        Directory.CreateDirectory(directory);
        return directory;
    }

    private static string CompactTempPrefix(string prefix)
    {
        if (String.Equals(prefix, "ascet-dependency-set-plan", StringComparison.Ordinal))
        {
            return "p";
        }

        if (String.Equals(prefix, "ascet-dependency-set-apply", StringComparison.Ordinal))
        {
            return "a";
        }

        return "x";
    }

    private static string ShortHash(string value)
    {
        using (SHA1 sha1 = SHA1.Create())
        {
            byte[] bytes = sha1.ComputeHash(Encoding.UTF8.GetBytes(value ?? String.Empty));
            StringBuilder builder = new StringBuilder(12);
            for (int i = 0; i < 6; i++)
            {
                builder.Append(bytes[i].ToString("x2"));
            }

            return builder.ToString();
        }
    }

    private static void WriteBackupManifest(string backupDirectory, string targetPath)
    {
        if (String.IsNullOrWhiteSpace(backupDirectory))
        {
            return;
        }

        File.WriteAllText(Path.Combine(backupDirectory, "component-path.txt"), targetPath ?? String.Empty, Encoding.UTF8);
    }

    private static void TryDeleteDirectory(string directory)
    {
        try
        {
            if (!String.IsNullOrWhiteSpace(directory) && Directory.Exists(directory))
            {
                Directory.Delete(directory, true);
            }
        }
        catch
        {
        }
    }
}

public static class AscetSetElementDependency
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetSetElementDependencyArguments parsed = ParseArguments(args);
            if (parsed.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            AscetSetElementDependencyService service = new AscetSetElementDependencyService();
            AscetSetElementDependencyResult result = service.Set(parsed);
            string output = parsed.EmitJson ? FormatJsonOutput(result) : FormatTextOutput(result);

            Console.SetOut(originalOut);
            Console.Write(output);
            return 0;
        }
        catch (Exception ex)
        {
            Console.SetOut(originalOut);
            Console.Error.WriteLine(AscetElementDependencyPlanSupport.FormatException(ex));
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

    public static AscetSetElementDependencyArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 3)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetSetElementDependency.exe <target-path> <element-name> <dependent|independent> [--formula <expr>] [--mapping <formal=imported>] [--clear-formula] [--target-kind auto|component|project|folder] [--match exact|all] [--dry-run] [--backup-dir <dir>] [--verify-readback] [--json]");
        }

        AscetSetElementDependencyArguments result = new AscetSetElementDependencyArguments
        {
            TargetPath = AscetElementDependencyPlanSupport.NormalizePath(args[0]),
            ElementName = AscetElementDependencyPlanSupport.NormalizeElementName(args[1]),
            RequestedDependency = NormalizeDependency(args[2]),
            DependencyFormula = String.Empty,
            DependencyMappings = new Dictionary<string, string>(StringComparer.Ordinal),
            ClearDependencyFormula = false,
            TargetKind = "auto",
            MatchMode = "exact",
            DryRun = false,
            BackupDirectory = String.Empty,
            VerifyReadback = false,
            EmitJson = false
        };

        for (int i = 3; i < args.Length; i++)
        {
            string argument = args[i];
            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                result.EmitJson = true;
                continue;
            }

            if (String.Equals(argument, "--dry-run", StringComparison.OrdinalIgnoreCase))
            {
                result.DryRun = true;
                continue;
            }

            if (String.Equals(argument, "--verify-readback", StringComparison.OrdinalIgnoreCase))
            {
                result.VerifyReadback = true;
                continue;
            }

            if (String.Equals(argument, "--formula", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --formula.");
                }

                result.DependencyFormula = args[++i] == null ? String.Empty : args[i].Trim();
                if (String.IsNullOrWhiteSpace(result.DependencyFormula))
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Dependency formula must not be empty.");
                }
                continue;
            }

            if (String.Equals(argument, "--mapping", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --mapping.");
                }

                AddMapping(result.DependencyMappings, args[++i]);
                continue;
            }

            if (String.Equals(argument, "--clear-formula", StringComparison.OrdinalIgnoreCase))
            {
                result.ClearDependencyFormula = true;
                continue;
            }

            if (String.Equals(argument, "--target-kind", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --target-kind.");
                }

                result.TargetKind = AscetElementDependencyPlanSupport.NormalizeTargetKind(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--match", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --match.");
                }

                result.MatchMode = NormalizeMatchMode(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--backup-dir", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --backup-dir.");
                }

                result.BackupDirectory = args[++i] == null ? String.Empty : args[i].Trim();
                if (String.IsNullOrWhiteSpace(result.BackupDirectory))
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Backup directory must not be empty.");
                }
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        ValidateFormulaArguments(
            result.RequestedDependency,
            result.DependencyFormula,
            result.DependencyMappings,
            result.ClearDependencyFormula,
            "parse_arguments");

        return result;
    }

    public static string FormatTextOutput(AscetSetElementDependencyResult result)
    {
        if (result == null)
        {
            throw new AscetReadException("invalid_argument", "format_set_dependency_text", "Set dependency result must not be null.");
        }

        StringBuilder builder = new StringBuilder();
        builder.Append("Target: ").Append(result.TargetPath ?? String.Empty).AppendLine();
        builder.Append("TargetKind: ").Append(result.TargetKind ?? String.Empty).AppendLine();
        builder.Append("MatchMode: ").Append(result.MatchMode ?? String.Empty).AppendLine();
        builder.Append("Element: ").Append(result.ElementName ?? String.Empty).AppendLine();
        builder.Append("RequestedDependency: ").Append(result.RequestedDependency ?? String.Empty).AppendLine();
        builder.Append("DryRun: ").Append(result.DryRun).AppendLine();
        builder.Append("WriteSucceeded: ").Append(result.WriteSucceeded).AppendLine();
        builder.Append("VerifyReadbackRequested: ").Append(result.VerifyReadbackRequested).AppendLine();
        builder.Append("ReadbackVerified: ").Append(result.ReadbackVerified).AppendLine();
        builder.Append("BackupDirectory: ").Append(result.BackupDirectory ?? String.Empty).AppendLine();
        builder.Append("MatchesChanged: ").Append(result.MatchesChanged).AppendLine();
        builder.Append("BeforeDependency: ").Append(result.BeforeDependency ?? String.Empty).AppendLine();
        builder.Append("AfterDependency: ").Append(result.AfterDependency ?? String.Empty).AppendLine();
        builder.Append("BeforeFormula: ").Append(result.BeforeFormula ?? String.Empty).AppendLine();
        builder.Append("AfterFormula: ").Append(result.AfterFormula ?? String.Empty).AppendLine();
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetSetElementDependencyResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["target"] = result == null ? String.Empty : (result.TargetPath ?? String.Empty);
        payload["kind"] = result == null ? String.Empty : (result.TargetKind ?? String.Empty);
        payload["element"] = result == null ? String.Empty : (result.ElementName ?? String.Empty);
        payload["requested"] = result == null ? String.Empty : (result.RequestedDependency ?? String.Empty);
        if (result != null && !String.IsNullOrWhiteSpace(result.MatchMode) && !String.Equals(result.MatchMode, "exact", StringComparison.OrdinalIgnoreCase))
        {
            payload["match"] = result.MatchMode;
        }

        Dictionary<string, object> write = new Dictionary<string, object>();
        write["dryRun"] = result != null && result.DryRun;
        write["succeeded"] = result != null && result.WriteSucceeded;
        write["changed"] = result == null ? 0 : result.MatchesChanged;
        if (result != null && result.VerifyReadbackRequested)
        {
            write["readbackVerified"] = result.ReadbackVerified;
        }
        payload["write"] = write;

        Dictionary<string, object> dependency = new Dictionary<string, object>();
        if (result != null && !String.IsNullOrWhiteSpace(result.BeforeDependency))
        {
            dependency["before"] = result.BeforeDependency;
        }
        if (result != null && !String.IsNullOrWhiteSpace(result.AfterDependency))
        {
            dependency["after"] = result.AfterDependency;
        }
        payload["dependency"] = dependency;

        Dictionary<string, object> formula = new Dictionary<string, object>();
        if (result != null && !String.IsNullOrWhiteSpace(result.BeforeFormula))
        {
            formula["before"] = result.BeforeFormula;
        }
        if (result != null && !String.IsNullOrWhiteSpace(result.AfterFormula))
        {
            formula["after"] = result.AfterFormula;
        }
        formula["changed"] = result != null && result.FormulaChanged;
        formula["cleared"] = result != null && result.FormulaCleared;
        payload["formula"] = formula;

        List<Dictionary<string, object>> mappings = new List<Dictionary<string, object>>();
        IList<AscetDependencyFormulaMappingResult> mappingResults = result == null ? null : result.FormulaMappings;
        if (mappingResults != null)
        {
            for (int i = 0; i < mappingResults.Count; i++)
            {
                AscetDependencyFormulaMappingResult mapping = mappingResults[i];
                if (mapping == null)
                {
                    continue;
                }

                Dictionary<string, object> item = new Dictionary<string, object>();
                item["formal"] = mapping.FormalName ?? String.Empty;
                item["imported"] = mapping.ImportedParameterName ?? String.Empty;
                item["verified"] = mapping.Verified;
                if (!String.IsNullOrWhiteSpace(mapping.Issue))
                {
                    item["issue"] = mapping.Issue;
                }
                mappings.Add(item);
            }
        }
        payload["mappings"] = mappings;

        if (result != null && !String.IsNullOrWhiteSpace(result.BackupDirectory))
        {
            payload["backup"] = result.BackupDirectory;
        }
        if (result != null && result.Issues != null && result.Issues.Count > 0)
        {
            payload["issues"] = result.Issues;
        }
        payload["plan"] = BuildPlanPayload(result == null ? null : result.Plan);
        return AscetJsonContract.Serialize(payload);
    }

    private static Dictionary<string, object> BuildPlanPayload(AscetElementDependencyPlanResult plan)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        List<Dictionary<string, object>> matches = new List<Dictionary<string, object>>();
        IList<AscetElementDependencyPlanMatch> values = plan == null ? null : plan.Matches;
        if (values != null)
        {
            for (int i = 0; i < values.Count; i++)
            {
                AscetElementDependencyPlanMatch current = values[i];
                if (current == null)
                {
                    continue;
                }

                matches.Add(AscetElementDependencyPlanSupport.BuildMatchPayload(current));
            }
        }

        payload["count"] = matches.Count;
        payload["matches"] = matches;
        return payload;
    }

    internal static void ValidateFormulaArguments(string dependency, string formula, IDictionary<string, string> mappings, bool clearFormula, string stage)
    {
        bool hasFormula = !String.IsNullOrWhiteSpace(formula);
        bool hasMappings = mappings != null && mappings.Count > 0;
        if (hasFormula && !String.Equals(dependency, "dependent", StringComparison.OrdinalIgnoreCase))
        {
            throw new AscetReadException("invalid_argument", stage, "--formula is only valid when requested dependency is dependent.");
        }

        if (hasFormula && clearFormula)
        {
            throw new AscetReadException("invalid_argument", stage, "--formula and --clear-formula cannot be used together.");
        }

        if (hasMappings && !hasFormula)
        {
            throw new AscetReadException("invalid_argument", stage, "--mapping requires --formula.");
        }
    }

    private static void AddMapping(Dictionary<string, string> mappings, string value)
    {
        if (mappings == null)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "Mapping collection must not be null.");
        }

        string raw = value == null ? String.Empty : value.Trim();
        int separator = raw.IndexOf('=');
        if (separator <= 0 || separator >= raw.Length - 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "--mapping value must use formal=imported syntax.");
        }

        string formal = raw.Substring(0, separator).Trim();
        string imported = raw.Substring(separator + 1).Trim();
        if (String.IsNullOrWhiteSpace(formal) || String.IsNullOrWhiteSpace(imported))
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "--mapping value must use non-empty formal=imported syntax.");
        }

        if (mappings.ContainsKey(formal))
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "Duplicate --mapping formal name '" + formal + "'.");
        }

        mappings[formal] = imported;
    }

    private static string NormalizeDependency(string value)
    {
        if (String.Equals(value, "dependent", StringComparison.OrdinalIgnoreCase))
        {
            return "dependent";
        }

        if (String.Equals(value, "independent", StringComparison.OrdinalIgnoreCase))
        {
            return "independent";
        }

        throw new AscetReadException("invalid_argument", "normalize_dependency", "Dependency must be dependent or independent.");
    }

    private static string NormalizeMatchMode(string value)
    {
        if (String.Equals(value, "exact", StringComparison.OrdinalIgnoreCase))
        {
            return "exact";
        }

        if (String.Equals(value, "all", StringComparison.OrdinalIgnoreCase))
        {
            return "all";
        }

        throw new AscetReadException("invalid_argument", "normalize_match_mode", "Match mode must be exact or all.");
    }
}
