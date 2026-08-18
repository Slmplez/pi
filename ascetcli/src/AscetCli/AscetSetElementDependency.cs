using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Xml;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public sealed class AscetSetElementDependencyArguments
{
    public string TargetPath { get; set; }
    public string ElementName { get; set; }
    public string RequestedDependency { get; set; }
    public string DependencyFormula { get; set; }
    public Dictionary<string, string> DependencyMappings { get; set; }
    public Dictionary<string, string> DependencyMappingKinds { get; set; }
    public Dictionary<string, Dictionary<string, string>> VariantDependencyMappings { get; set; }
    public Dictionary<string, Dictionary<string, string>> VariantDependencyMappingKinds { get; set; }
    public string VariantPolicy { get; set; }
    public IList<string> VariantNames { get; set; }
    public string RestorationPolicy { get; set; }
    public Dictionary<string, string> RestorationValues { get; set; }
    public bool ClearDependencyFormula { get; set; }
    public string TargetKind { get; set; }
    public string MatchMode { get; set; }
    public bool DryRun { get; set; }
    public string BackupDirectory { get; set; }
    public bool VerifyReadback { get; set; }
    public bool EmitJson { get; set; }
    public IList<string> OverlaySpecFiles { get; set; }
}

public sealed class AscetSetElementDependencyResult
{
    public string TargetPath { get; set; }
    public string TargetKind { get; set; }
    public string MatchMode { get; set; }
    public string ElementName { get; set; }
    public string ComponentOid { get; set; }
    public string ElementOid { get; set; }
    public string DefinitionHash { get; set; }
    public string DataConfigurationSource { get; set; }
    public string DataConfigurationName { get; set; }
    public IList<string> DataVariantNames { get; set; }
    public string RequestedDependency { get; set; }
    public bool DryRun { get; set; }
    public bool WriteSucceeded { get; set; }
    public bool VerifyReadbackRequested { get; set; }
    public bool ReadbackVerified { get; set; }
    public string BackupDirectory { get; set; }
    public string SnapshotPath { get; set; }
    public string SnapshotHash { get; set; }
    public string SnapshotMode { get; set; }
    public int MatchesChanged { get; set; }
    public string BeforeDependency { get; set; }
    public string AfterDependency { get; set; }
    public string BeforeFormula { get; set; }
    public string AfterFormula { get; set; }
    public bool FormulaChanged { get; set; }
    public bool FormulaCleared { get; set; }
    public IList<AscetDependencyFormulaMappingResult> BeforeFormulaMappings { get; set; }
    public IList<AscetDependencyFormulaMappingResult> FormulaMappings { get; set; }
    public AscetElementDependencyPlanResult Plan { get; set; }
    public IList<string> AttemptedMethods { get; set; }
    public IList<string> Issues { get; set; }
    public string OverlayMode { get; set; }
    public IList<string> OverlaySpecHashes { get; set; }
    public IDictionary<string, string> OverlayElementOids { get; set; }
    public bool Changed { get; set; }
    public string MutationStatus { get; set; }
    public bool SaveAttempted { get; set; }
    public bool SaveSucceeded { get; set; }
    public string SaveState { get; set; }
    public bool Verified { get; set; }
    public string VerificationStatus { get; set; }
    public string VerificationMode { get; set; }
    public int? SessionCount { get; set; }
    public int? SaveCount { get; set; }
    public int? EditableRetryCount { get; set; }
    public int? NativeMutationAttemptCount { get; set; }
    public string CanonicalEvidenceStatus { get; set; }
    public string CanonicalEvidenceIssue { get; set; }
}

public sealed class AscetDependencyFormulaMappingResult
{
    public string VariantName { get; set; }
    public string FormalName { get; set; }
    public string ValueName { get; set; }
    public string TargetKind { get; set; }
    public string TargetScope { get; set; }
    public string FormalOid { get; set; }
    public string ValueOid { get; set; }
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
            return SetInSession(session, arguments);
        });
    }

    public AscetSetElementDependencyResult SetInSession(AscetSession session, AscetSetElementDependencyArguments arguments)
    {
        Validate(arguments);
        if (String.Equals(arguments.TargetKind, "folder", StringComparison.OrdinalIgnoreCase))
        {
            throw new AscetReadException("invalid_argument", "set_element_dependency", "A bound-session dependency write requires a component target.");
        }

        return ExecuteWithBoundSession("set_element_dependency", session, delegate(AscetSession currentSession)
        {
            session = currentSession;
            CodeComponent component = ResolveCodeComponent(session, arguments.TargetPath);
            List<string> attempted = new List<string>();
            List<string> issues = new List<string>();
            AscetElementDependencyOverlayResult overlayEvidence = AscetElementDependencyOverlay.Describe(arguments.OverlaySpecFiles);
            AscetElementDependencyPlanResult plan = PlanComponent(component, arguments.TargetPath, arguments.ElementName, arguments.OverlaySpecFiles, attempted);
            AscetElementDependencyPlanMatch match = RequireSingleSupportedMatch(plan, arguments.ElementName);
            bool wantDependent = String.Equals(arguments.RequestedDependency, "dependent", StringComparison.OrdinalIgnoreCase);
            bool beforeDependent = String.Equals(match.BeforeDependency, "dependent", StringComparison.OrdinalIgnoreCase);
            string beforeFormula = match.FormulaCode ?? String.Empty;
            bool hasFormula = !String.IsNullOrWhiteSpace(arguments.DependencyFormula);
            bool hasMappings = (arguments.DependencyMappings != null && arguments.DependencyMappings.Count > 0) ||
                (arguments.VariantDependencyMappings != null && arguments.VariantDependencyMappings.Count > 0);
            bool needsFormulaWrite = (hasFormula && !String.Equals(beforeFormula, arguments.DependencyFormula, StringComparison.Ordinal)) ||
                (hasFormula && hasMappings) ||
                (arguments.ClearDependencyFormula && !String.IsNullOrWhiteSpace(beforeFormula));
            bool needsDataWrite = !wantDependent && !String.IsNullOrWhiteSpace(arguments.RestorationPolicy);
            bool needsWrite = RequiresDependencyWrite(match, arguments);
            IList<AscetElementDependencyDataVariantState> beforeDataVariants =
                (hasFormula || needsDataWrite)
                    ? ReadLiveDataVariantStates(component, arguments.TargetPath, arguments.ElementName, arguments.OverlaySpecFiles, attempted)
                    : new List<AscetElementDependencyDataVariantState>();
            AscetDependencySnapshotRecord restorationSnapshot = null;
            IDictionary<string, string> effectiveRestorationValues = arguments.RestorationValues;
            string snapshotPath = String.Empty;
            string snapshotHash = String.Empty;
            string snapshotMode = String.Empty;
            if (!wantDependent && String.Equals(arguments.RestorationPolicy, "fromSnapshot", StringComparison.OrdinalIgnoreCase))
            {
                restorationSnapshot = AscetDependencySnapshotStore.Load(arguments.TargetPath, arguments.ElementName);
                effectiveRestorationValues = restorationSnapshot.ScalarTypeXmlByVariant;
                snapshotPath = restorationSnapshot.SnapshotPath;
                snapshotHash = restorationSnapshot.SnapshotHash;
                snapshotMode = "restore";
            }
            else if (wantDependent && !beforeDependent && hasFormula)
            {
                snapshotPath = AscetDependencySnapshotStore.ResolvePath(arguments.TargetPath, arguments.ElementName);
                snapshotHash = AscetDependencySnapshotStore.ComputeStateHash(beforeDataVariants);
                snapshotMode = "capture";
            }

            string componentOid = ReadObjectString(component, "GetOID");
            if (String.IsNullOrWhiteSpace(componentOid))
            {
                componentOid = ReadObjectString(component, "GetOid");
            }
            string elementOid = ResolveElementOid(component, arguments.ElementName);
            if (String.IsNullOrWhiteSpace(elementOid) && overlayEvidence.ElementOids.ContainsKey(arguments.ElementName))
            {
                elementOid = overlayEvidence.ElementOids[arguments.ElementName];
            }
            DataConfiguration dataConfiguration = component.GetDefaultData();
            string dataConfigurationName = ReadObjectString(dataConfiguration, "GetName");
            IList<string> dataVariantNames = ResolveSelectedVariantNames(beforeDataVariants, arguments.VariantPolicy, arguments.VariantNames);
            string definitionHash = ComputeDefinitionHash(componentOid, elementOid, match, dataConfigurationName, dataVariantNames, overlayEvidence.SpecHashes);

            if (arguments.DryRun)
            {
                IList<AscetDependencyFormulaMappingResult> dryRunMappings = ValidateXmlDependencyDryRun(
                    component,
                    arguments.TargetPath,
                    arguments.ElementName,
                    wantDependent,
                    arguments.DependencyFormula,
                    arguments.DependencyMappings,
                    arguments.DependencyMappingKinds,
                    arguments.VariantDependencyMappings,
                    arguments.VariantDependencyMappingKinds,
                    arguments.ClearDependencyFormula,
                    arguments.VariantPolicy,
                    arguments.VariantNames,
                    arguments.RestorationPolicy,
                    effectiveRestorationValues,
                    arguments.OverlaySpecFiles,
                    attempted,
                    issues);

                return new AscetSetElementDependencyResult
                {
                    TargetPath = arguments.TargetPath,
                    TargetKind = "component",
                    MatchMode = arguments.MatchMode,
                    ElementName = arguments.ElementName,
                    ComponentOid = componentOid,
                    ElementOid = elementOid,
                    DefinitionHash = definitionHash,
                    DataConfigurationSource = "defaultDataConfiguration",
                    DataConfigurationName = dataConfigurationName,
                    DataVariantNames = dataVariantNames,
                    RequestedDependency = arguments.RequestedDependency,
                    DryRun = true,
                    WriteSucceeded = false,
                    VerifyReadbackRequested = arguments.VerifyReadback,
                    ReadbackVerified = false,
                    Changed = false,
                    MutationStatus = "preview",
                    SaveAttempted = false,
                    SaveSucceeded = false,
                    SaveState = "not_required",
                    Verified = false,
                    VerificationStatus = "not_run",
                    VerificationMode = "same_session_dependency_endpoint",
                    SessionCount = 1,
                    SaveCount = 0,
                    EditableRetryCount = 0,
                    NativeMutationAttemptCount = 0,
                    CanonicalEvidenceStatus = "not_applicable",
                    CanonicalEvidenceIssue = "Dry-run does not produce a mutation result.",
                    BackupDirectory = String.Empty,
                    SnapshotPath = snapshotPath,
                    SnapshotHash = snapshotHash,
                    SnapshotMode = snapshotMode,
                    MatchesChanged = 0,
                    BeforeDependency = match.BeforeDependency,
                    AfterDependency = wantDependent ? "dependent" : "independent",
                    BeforeFormula = beforeFormula,
                    AfterFormula = arguments.ClearDependencyFormula ? String.Empty : (hasFormula ? arguments.DependencyFormula : beforeFormula),
                    FormulaChanged = needsFormulaWrite,
                    FormulaCleared = arguments.ClearDependencyFormula,
                    BeforeFormulaMappings = BuildVerifiedMappingResults(beforeDataVariants),
                    FormulaMappings = dryRunMappings,
                    Plan = plan,
                    AttemptedMethods = attempted,
                    Issues = issues,
                    OverlayMode = overlayEvidence.SpecHashes.Count > 0 ? "temporaryAmd" : String.Empty,
                    OverlaySpecHashes = overlayEvidence.SpecHashes,
                    OverlayElementOids = overlayEvidence.ElementOids
                };
            }

            string backupDirectory = String.Empty;
            int matchesChanged = 0;
            string afterDependency = match.BeforeDependency;
            string afterFormula = beforeFormula;
            bool backupCreated = false;
            bool snapshotSaved = false;

            try
            {
                if (!needsWrite)
                {
                    issues.Add("Element already has requested dependency state and formula.");
                }
                else
                {
                    RequireComponentEditableInSession(session, arguments.TargetPath, "set_element_dependency");
                    backupDirectory = ResolveBackupDirectory(arguments.BackupDirectory, arguments.TargetPath);
                    attempted.Add("ExportXMLToFile(backup)");
                    Directory.CreateDirectory(backupDirectory);
                    if (!component.ExportXMLToFile(backupDirectory, false))
                    {
                        throw new AscetReadException("tool_api_error", "set_element_dependency", "ASCET ExportXMLToFile returned false while backing up component '" + arguments.TargetPath + "'.");
                    }
                    WriteBackupManifest(backupDirectory, arguments.TargetPath);
                    backupCreated = true;

                    ApplyXmlDependency(session, component, arguments.TargetPath, arguments.ElementName, wantDependent, arguments.DependencyFormula, arguments.DependencyMappings, arguments.DependencyMappingKinds, arguments.VariantDependencyMappings, arguments.VariantDependencyMappingKinds, arguments.ClearDependencyFormula, arguments.VariantPolicy, arguments.VariantNames, arguments.RestorationPolicy, effectiveRestorationValues, attempted);
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
                IList<AscetDependencyFormulaMappingResult> readbackMappings = new List<AscetDependencyFormulaMappingResult>();
                IList<AscetElementDependencyDataVariantState> readbackVariants;
                bool dataReadbackVerified = true;
                if (wantDependent && hasFormula)
                {
                    readbackVariants = VerifyLiveDependencyMappings(
                        readbackComponent,
                        arguments.TargetPath,
                        arguments.ElementName,
                        arguments.DependencyMappings,
                        arguments.DependencyMappingKinds,
                        arguments.VariantDependencyMappings,
                        arguments.VariantDependencyMappingKinds,
                        arguments.VariantPolicy,
                        arguments.VariantNames,
                        attempted);
                    readbackMappings = BuildVerifiedMappingResults(readbackVariants);
                }
                else if (!wantDependent)
                {
                    readbackVariants = ReadLiveDataVariantStates(
                        readbackComponent,
                        arguments.TargetPath,
                        arguments.ElementName,
                        attempted);
                }
                else
                {
                    readbackVariants = new List<AscetElementDependencyDataVariantState>();
                }
                if (!wantDependent)
                {
                    IList<AscetElementDependencyDataVariantState> selectedReadback = FilterVariantStates(readbackVariants, arguments.VariantPolicy, arguments.VariantNames);
                    dataReadbackVerified = selectedReadback.Count > 0;
                    for (int i = 0; i < selectedReadback.Count; i++)
                    {
                        AscetElementDependencyDataVariantState variant = selectedReadback[i];
                        if (variant == null || variant.HasDependency || !variant.HasScalarType)
                        {
                            dataReadbackVerified = false;
                        }
                    }
                }

                bool readbackVerified = !arguments.VerifyReadback || (afterDependent == wantDependent && formulaVerified && clearVerified && dataReadbackVerified);
                if (arguments.VerifyReadback && !readbackVerified)
                {
                    throw new AscetReadException("readback_mismatch", "set_element_dependency", "Element '" + arguments.ElementName + "' dependency/formula/data readback is dependency='" + afterDependency + "' formula='" + afterFormula + "' but requested dependency='" + arguments.RequestedDependency + "' formula='" + (arguments.DependencyFormula ?? String.Empty) + "'.");
                }

                if (wantDependent && !beforeDependent && hasFormula && matchesChanged > 0)
                {
                    AscetDependencySnapshotRecord captured = AscetDependencySnapshotStore.Save(
                        arguments.TargetPath,
                        arguments.ElementName,
                        beforeDataVariants);
                    snapshotPath = captured.SnapshotPath;
                    snapshotHash = captured.SnapshotHash;
                    snapshotMode = "capture";
                    snapshotSaved = true;
                }
                else if (!wantDependent && restorationSnapshot != null && matchesChanged > 0)
                {
                    AscetDependencySnapshotStore.Delete(arguments.TargetPath, arguments.ElementName);
                    snapshotMode = "consumed";
                }

                return new AscetSetElementDependencyResult
                {
                    TargetPath = arguments.TargetPath,
                    TargetKind = "component",
                    MatchMode = arguments.MatchMode,
                    ElementName = arguments.ElementName,
                    ComponentOid = componentOid,
                    ElementOid = elementOid,
                    DefinitionHash = definitionHash,
                    DataConfigurationSource = "defaultDataConfiguration",
                    DataConfigurationName = dataConfigurationName,
                    DataVariantNames = dataVariantNames,
                    RequestedDependency = arguments.RequestedDependency,
                    DryRun = false,
                    WriteSucceeded = !needsWrite && readbackVerified,
                    VerifyReadbackRequested = arguments.VerifyReadback,
                    ReadbackVerified = readbackVerified,
                    Changed = matchesChanged > 0,
                    MutationStatus = matchesChanged > 0 ? "applied" : "no_op",
                    SaveAttempted = false,
                    SaveSucceeded = false,
                    SaveState = matchesChanged > 0 ? "unknown" : "not_required",
                    Verified = readbackVerified,
                    VerificationStatus = readbackVerified ? "passed" : "failed",
                    VerificationMode = "same_session_dependency_endpoint",
                    SessionCount = 1,
                    SaveCount = 0,
                    EditableRetryCount = 0,
                    NativeMutationAttemptCount = matchesChanged > 0 ? 1 : 0,
                    CanonicalEvidenceStatus = matchesChanged > 0 ? "blocked" : "complete",
                    CanonicalEvidenceIssue = matchesChanged > 0 ? "ImportXMLFromFile save semantics are not proven; no explicit database.Save call was observed." : String.Empty,
                    BackupDirectory = backupDirectory,
                    SnapshotPath = snapshotPath,
                    SnapshotHash = snapshotHash,
                    SnapshotMode = snapshotMode,
                    MatchesChanged = matchesChanged,
                    BeforeDependency = match.BeforeDependency,
                    AfterDependency = afterDependency,
                    BeforeFormula = beforeFormula,
                    AfterFormula = afterFormula,
                    FormulaChanged = !String.Equals(beforeFormula, afterFormula, StringComparison.Ordinal),
                    FormulaCleared = arguments.ClearDependencyFormula && String.IsNullOrWhiteSpace(afterFormula),
                    BeforeFormulaMappings = BuildVerifiedMappingResults(beforeDataVariants),
                    FormulaMappings = readbackMappings.Count > 0
                        ? readbackMappings
                        : BuildMappingResults(arguments.DependencyMappings, arguments.VerifyReadback ? readbackVerified : matchesChanged > 0, String.Empty),
                    Plan = plan,
                    AttemptedMethods = attempted,
                    Issues = issues
                };
            }
            catch (Exception originalError)
            {
                if (snapshotSaved)
                {
                    AscetDependencySnapshotStore.Delete(arguments.TargetPath, arguments.ElementName);
                }
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
                        beforeDataVariants,
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

    private static string ResolveElementOid(CodeComponent component, string elementName)
    {
        AscetDiscreteComponent discrete = component as AscetDiscreteComponent;
        Array elements = discrete == null ? null : (discrete.GetAllModelElements() as Array);
        if (elements == null)
        {
            return String.Empty;
        }

        for (int i = 0; i < elements.Length; i++)
        {
            object element = elements.GetValue(i);
            if (!String.Equals(ReadObjectString(element, "GetName"), elementName, StringComparison.Ordinal))
            {
                continue;
            }

            string oid = ReadObjectString(element, "GetOID");
            return String.IsNullOrWhiteSpace(oid) ? ReadObjectString(element, "GetOid") : oid;
        }

        return String.Empty;
    }

    private static IList<string> ResolveSelectedVariantNames(
        IList<AscetElementDependencyDataVariantState> states,
        string variantPolicy,
        IList<string> requestedNames)
    {
        List<string> names = new List<string>();
        IList<AscetElementDependencyDataVariantState> selected = FilterVariantStates(states, variantPolicy, requestedNames);
        for (int i = 0; i < selected.Count; i++)
        {
            string name = selected[i] == null ? String.Empty : (selected[i].VariantName ?? String.Empty);
            if (!String.IsNullOrWhiteSpace(name) && !names.Contains(name))
            {
                names.Add(name);
            }
        }

        if (names.Count == 0 && String.Equals(variantPolicy, "default", StringComparison.OrdinalIgnoreCase))
        {
            names.Add("default");
        }
        else if (names.Count == 0 && String.Equals(variantPolicy, "selected", StringComparison.OrdinalIgnoreCase) && requestedNames != null)
        {
            for (int i = 0; i < requestedNames.Count; i++)
            {
                if (!String.IsNullOrWhiteSpace(requestedNames[i]) && !names.Contains(requestedNames[i]))
                {
                    names.Add(requestedNames[i]);
                }
            }
        }

        names.Sort(StringComparer.Ordinal);
        return names;
    }

    private static string ComputeDefinitionHash(
        string componentOid,
        string elementOid,
        AscetElementDependencyPlanMatch match,
        string dataConfigurationName,
        IList<string> dataVariantNames,
        IList<string> overlaySpecHashes)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append(componentOid ?? String.Empty).Append("\n")
            .Append(elementOid ?? String.Empty).Append("\n")
            .Append(match == null ? String.Empty : (match.ElementName ?? String.Empty)).Append("\n")
            .Append(match == null ? String.Empty : (match.Kind ?? String.Empty)).Append("\n")
            .Append(match == null ? String.Empty : (match.Scope ?? String.Empty)).Append("\n")
            .Append(match == null ? String.Empty : (match.Schema ?? String.Empty)).Append("\n")
            .Append(match == null ? String.Empty : (match.BeforeDependency ?? String.Empty)).Append("\n")
            .Append(match == null ? String.Empty : (match.FormulaCode ?? String.Empty)).Append("\n")
            .Append(dataConfigurationName ?? String.Empty);
        if (dataVariantNames != null)
        {
            for (int i = 0; i < dataVariantNames.Count; i++)
            {
                builder.Append("\n").Append(dataVariantNames[i] ?? String.Empty);
            }
        }
        if (overlaySpecHashes != null)
        {
            for (int i = 0; i < overlaySpecHashes.Count; i++)
            {
                builder.Append("\noverlay:").Append(overlaySpecHashes[i] ?? String.Empty);
            }
        }

        using (SHA256 algorithm = SHA256.Create())
        {
            byte[] digest = algorithm.ComputeHash(Encoding.UTF8.GetBytes(builder.ToString()));
            StringBuilder hex = new StringBuilder(digest.Length * 2);
            for (int i = 0; i < digest.Length; i++)
            {
                hex.Append(digest[i].ToString("x2"));
            }
            return hex.ToString();
        }
    }

    private static string ReadObjectString(object target, string methodName)
    {
        try
        {
            if (target == null)
            {
                return String.Empty;
            }
            MethodInfo method = target.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
            if (method == null)
            {
                return String.Empty;
            }
            object value = method.Invoke(target, null);
            return value == null ? String.Empty : Convert.ToString(value);
        }
        catch
        {
            return String.Empty;
        }
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
            arguments.VariantDependencyMappings != null && arguments.VariantDependencyMappings.Count > 0,
            arguments.ClearDependencyFormula,
            "set_element_dependency");

        bool writesData = !String.IsNullOrWhiteSpace(arguments.DependencyFormula) ||
            (arguments.DependencyMappings != null && arguments.DependencyMappings.Count > 0) ||
            String.Equals(arguments.RequestedDependency, "independent", StringComparison.OrdinalIgnoreCase);
        if (writesData && String.IsNullOrWhiteSpace(arguments.VariantPolicy))
        {
            throw new AscetReadException("data_variant_selection_required", "set_element_dependency", "DataVariant writes require explicit variantPolicy default, selected, or all.");
        }
        if (String.Equals(arguments.VariantPolicy, "selected", StringComparison.OrdinalIgnoreCase) &&
            (arguments.VariantNames == null || arguments.VariantNames.Count == 0))
        {
            throw new AscetReadException("data_variant_selection_required", "set_element_dependency", "variantPolicy selected requires one or more variants.");
        }
        if (!String.Equals(arguments.VariantPolicy, "selected", StringComparison.OrdinalIgnoreCase) &&
            arguments.VariantNames != null && arguments.VariantNames.Count > 0)
        {
            throw new AscetReadException("invalid_argument", "set_element_dependency", "variants are only valid with variantPolicy selected.");
        }
        if (String.Equals(arguments.RequestedDependency, "independent", StringComparison.OrdinalIgnoreCase))
        {
            if (!arguments.ClearDependencyFormula)
            {
                throw new AscetReadException("invalid_argument", "set_element_dependency", "Independent conversion requires clearDependencyFormula=true.");
            }
            if (String.IsNullOrWhiteSpace(arguments.RestorationPolicy))
            {
                throw new AscetReadException("independent_value_restoration_required", "set_element_dependency", "Independent conversion requires value restoration policy fromSnapshot, explicit, or ascetDefault.");
            }
        }

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

        if (arguments.OverlaySpecFiles != null && arguments.OverlaySpecFiles.Count > 0)
        {
            if (!arguments.DryRun)
            {
                throw new AscetReadException("overlay_dry_run_only", "set_element_dependency", "Element overlay specs are only valid for dry-run preflight.");
            }
            if (String.Equals(targetKind, "folder", StringComparison.OrdinalIgnoreCase))
            {
                throw new AscetReadException("overlay_component_only", "set_element_dependency", "Element overlay specs require a single component target.");
            }
        }

        string matchMode = String.IsNullOrWhiteSpace(arguments.MatchMode) ? "exact" : arguments.MatchMode.Trim().ToLowerInvariant();
        if (!String.Equals(matchMode, "exact", StringComparison.Ordinal) &&
            !String.Equals(matchMode, "all", StringComparison.Ordinal))
        {
            throw new AscetReadException("invalid_argument", "set_element_dependency", "Match mode must be exact or all.");
        }
    }

    internal static bool RequiresDependencyWrite(AscetElementDependencyPlanMatch match, AscetSetElementDependencyArguments arguments)
    {
        if (match == null)
        {
            throw new ArgumentNullException("match");
        }
        if (arguments == null)
        {
            throw new ArgumentNullException("arguments");
        }

        bool wantDependent = String.Equals(arguments.RequestedDependency, "dependent", StringComparison.OrdinalIgnoreCase);
        bool beforeDependent = String.Equals(match.BeforeDependency, "dependent", StringComparison.OrdinalIgnoreCase);
        string beforeFormula = match.FormulaCode ?? String.Empty;
        bool hasFormula = !String.IsNullOrWhiteSpace(arguments.DependencyFormula);
        bool hasMappings = (arguments.DependencyMappings != null && arguments.DependencyMappings.Count > 0) ||
            (arguments.VariantDependencyMappings != null && arguments.VariantDependencyMappings.Count > 0);
        bool needsDependencyWrite = beforeDependent != wantDependent;
        bool needsFormulaWrite = (hasFormula && !String.Equals(beforeFormula, arguments.DependencyFormula, StringComparison.Ordinal)) ||
            (hasFormula && hasMappings) ||
            (arguments.ClearDependencyFormula && !String.IsNullOrWhiteSpace(beforeFormula));
        bool needsDataWrite = !wantDependent && !String.IsNullOrWhiteSpace(arguments.RestorationPolicy);
        return needsDependencyWrite || needsFormulaWrite || needsDataWrite;
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
            List<string> dryRunAttempted = new List<string> { "PlanFolder" };
            List<string> dryRunIssues = new List<string>();
            List<AscetDependencyFormulaMappingResult> dryRunMappings = new List<AscetDependencyFormulaMappingResult>();
            for (int i = 0; i < supported.Count; i++)
            {
                AscetElementDependencyPlanMatch candidate = supported[i];
                AscetSetElementDependencyResult child = Set(new AscetSetElementDependencyArguments
                {
                    TargetPath = candidate.ComponentPath,
                    ElementName = candidate.ElementName,
                    RequestedDependency = arguments.RequestedDependency,
                    DependencyFormula = arguments.DependencyFormula,
                    DependencyMappings = arguments.DependencyMappings,
                    DependencyMappingKinds = arguments.DependencyMappingKinds,
                    VariantDependencyMappings = arguments.VariantDependencyMappings,
                    VariantDependencyMappingKinds = arguments.VariantDependencyMappingKinds,
                    VariantPolicy = arguments.VariantPolicy,
                    VariantNames = arguments.VariantNames,
                    RestorationPolicy = arguments.RestorationPolicy,
                    RestorationValues = arguments.RestorationValues,
                    ClearDependencyFormula = arguments.ClearDependencyFormula,
                    TargetKind = "component",
                    MatchMode = "exact",
                    DryRun = true,
                    BackupDirectory = String.Empty,
                    VerifyReadback = arguments.VerifyReadback,
                    EmitJson = false
                });

                dryRunAttempted.Add("DryRunComponent:" + candidate.ComponentPath);
                if (child.AttemptedMethods != null)
                {
                    for (int j = 0; j < child.AttemptedMethods.Count; j++)
                    {
                        dryRunAttempted.Add(candidate.ComponentPath + ":" + child.AttemptedMethods[j]);
                    }
                }
                if (child.Issues != null)
                {
                    for (int j = 0; j < child.Issues.Count; j++)
                    {
                        dryRunIssues.Add(candidate.ComponentPath + ":" + child.Issues[j]);
                    }
                }
                if (child.FormulaMappings != null)
                {
                    for (int j = 0; j < child.FormulaMappings.Count; j++)
                    {
                        dryRunMappings.Add(child.FormulaMappings[j]);
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
                DryRun = true,
                WriteSucceeded = false,
                VerifyReadbackRequested = arguments.VerifyReadback,
                ReadbackVerified = false,
                BackupDirectory = String.Empty,
                MatchesChanged = 0,
                BeforeDependency = String.Empty,
                AfterDependency = arguments.RequestedDependency,
                BeforeFormula = String.Empty,
                AfterFormula = arguments.ClearDependencyFormula ? String.Empty : (arguments.DependencyFormula ?? String.Empty),
                FormulaChanged = !String.IsNullOrWhiteSpace(arguments.DependencyFormula) || arguments.ClearDependencyFormula,
                FormulaCleared = arguments.ClearDependencyFormula,
                FormulaMappings = dryRunMappings,
                Plan = plan,
                AttemptedMethods = dryRunAttempted,
                Issues = dryRunIssues
            };
        }

        int changed = 0;
        bool allVerified = true;
        List<string> attempted = new List<string> { "PlanFolder" };
        List<string> issues = new List<string>();
        string backupRoot = String.IsNullOrWhiteSpace(arguments.BackupDirectory) ? String.Empty : Path.GetFullPath(arguments.BackupDirectory);

        List<string> componentPaths = new List<string>();
        for (int i = 0; i < supported.Count; i++)
        {
            if (RequiresDependencyWrite(supported[i], arguments))
            {
                componentPaths.Add(supported[i].ComponentPath);
            }
        }

        ExecuteWithSession("set_element_dependency", delegate(AscetSession session)
        {
            RequireComponentsEditableInSession(session, componentPaths, "set_element_dependency");
            return true;
        });

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
                DependencyMappingKinds = arguments.DependencyMappingKinds,
                VariantDependencyMappings = arguments.VariantDependencyMappings,
                VariantDependencyMappingKinds = arguments.VariantDependencyMappingKinds,
                VariantPolicy = arguments.VariantPolicy,
                VariantNames = arguments.VariantNames,
                RestorationPolicy = arguments.RestorationPolicy,
                RestorationValues = arguments.RestorationValues,
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
            WriteSucceeded = changed == 0 && (!arguments.VerifyReadback || allVerified),
            VerifyReadbackRequested = arguments.VerifyReadback,
            ReadbackVerified = !arguments.VerifyReadback || allVerified,
            Changed = changed > 0,
            MutationStatus = changed > 0 ? "applied" : "no_op",
            SaveAttempted = false,
            SaveSucceeded = false,
            SaveState = changed > 0 ? "unknown" : "not_required",
            Verified = !arguments.VerifyReadback || allVerified,
            VerificationStatus = (!arguments.VerifyReadback || allVerified) ? "passed" : "failed",
            VerificationMode = "same_session_dependency_endpoint",
            SessionCount = changed > 0 ? (int?)null : 1,
            SaveCount = changed > 0 ? (int?)null : 0,
            EditableRetryCount = 0,
            NativeMutationAttemptCount = changed > 0 ? (int?)null : 0,
            CanonicalEvidenceStatus = changed > 0 ? "blocked" : "complete",
            CanonicalEvidenceIssue = changed > 0 ? "Folder route delegates to multiple component sessions and ImportXMLFromFile save semantics are not proven." : String.Empty,
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
                ValueName = mapping.Value ?? String.Empty,
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
        return PlanComponent(component, componentPath, elementName, null, attempted);
    }

    private static AscetElementDependencyPlanResult PlanComponent(CodeComponent component, string componentPath, string elementName, IList<string> overlaySpecFiles, IList<string> attempted)
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

            string data = AscetElementDependencyXml.FindDataAmd(directory, main);
            if (overlaySpecFiles != null && overlaySpecFiles.Count > 0)
            {
                attempted.Add("ApplyElementOverlay(plan)");
                AscetElementDependencyOverlay.Apply(main, data, overlaySpecFiles);
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

    private static void ApplyXmlDependency(AscetSession session, CodeComponent component, string componentPath, string elementName, bool wantDependent, string dependencyFormula, IDictionary<string, string> dependencyMappings, IDictionary<string, string> dependencyMappingKinds, IDictionary<string, Dictionary<string, string>> variantDependencyMappings, IDictionary<string, Dictionary<string, string>> variantDependencyMappingKinds, bool clearDependencyFormula, string variantPolicy, IList<string> variantNames, string restorationPolicy, IDictionary<string, string> restorationValues, IList<string> attempted)
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
            if (wantDependent && !String.IsNullOrWhiteSpace(dependencyFormula))
            {
                ValidateNoDependencyCycle(main, data, elementName, dependencyMappings, variantDependencyMappings);
            }
            attempted.Add("SetMainAmdDependencyAndFormula");
            AscetElementDependencyXml.SetMainAmdDependencyAndFormula(main, data, elementName, wantDependent, dependencyFormula, dependencyMappings, variantDependencyMappings, clearDependencyFormula, variantPolicy, variantNames, restorationPolicy, restorationValues);

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

    private static IList<AscetDependencyFormulaMappingResult> ValidateXmlDependencyDryRun(
        CodeComponent component,
        string componentPath,
        string elementName,
        bool wantDependent,
        string dependencyFormula,
        IDictionary<string, string> dependencyMappings,
        IDictionary<string, string> dependencyMappingKinds,
        IDictionary<string, Dictionary<string, string>> variantDependencyMappings,
        IDictionary<string, Dictionary<string, string>> variantDependencyMappingKinds,
        bool clearDependencyFormula,
        string variantPolicy,
        IList<string> variantNames,
        string restorationPolicy,
        IDictionary<string, string> restorationValues,
        IList<string> overlaySpecFiles,
        IList<string> attempted,
        IList<string> issues)
    {
        string directory = CreateTempDirectory("ascet-dependency-set-dry-run");
        try
        {
            attempted.Add("ExportXMLToFile(dry-run)");
            if (!component.ExportXMLToFile(directory, false))
            {
                throw new AscetReadException("tool_api_error", "set_element_dependency", "ASCET ExportXMLToFile returned false for component '" + componentPath + "'.");
            }

            string main = AscetElementDependencyXml.FindMainAmd(directory);
            string data = AscetElementDependencyXml.FindDataAmd(directory, main);
            if (String.IsNullOrWhiteSpace(main))
            {
                throw new AscetReadException("tool_api_error", "set_element_dependency", "Exported component did not contain a *.main.amd file.");
            }

            if (overlaySpecFiles != null && overlaySpecFiles.Count > 0)
            {
                attempted.Add("ApplyElementOverlay(dry-run)");
                AscetElementDependencyOverlay.Apply(main, data, overlaySpecFiles);
            }

            bool requiresDataAmd = !String.IsNullOrWhiteSpace(dependencyFormula) ||
                (dependencyMappings != null && dependencyMappings.Count > 0) ||
                !wantDependent;
            if (String.IsNullOrWhiteSpace(data) && requiresDataAmd)
            {
                throw new AscetReadException("data_amd_not_found", "set_element_dependency", "Exported component did not contain a *.data.amd file required for dependency dry-run.");
            }

            if (wantDependent && !String.IsNullOrWhiteSpace(dependencyFormula))
            {
                ValidateNoDependencyCycle(main, data, elementName, dependencyMappings, variantDependencyMappings);
            }
            attempted.Add("SetMainAmdDependencyAndFormula(dry-run)");
            AscetElementDependencyXml.SetMainAmdDependencyAndFormula(
                main,
                data,
                elementName,
                wantDependent,
                dependencyFormula,
                dependencyMappings,
                variantDependencyMappings,
                clearDependencyFormula,
                variantPolicy,
                variantNames,
                restorationPolicy,
                restorationValues);

            AscetElementDependencyXmlState state = AscetElementDependencyXml.ReadMainAmd(main, elementName);
            bool actualDependent = state != null && state.IsDependent;
            if (actualDependent != wantDependent)
            {
                throw new AscetReadException("dependency_dry_run_mismatch", "set_element_dependency", "Temporary main AMD patch produced dependency='" + (actualDependent ? "dependent" : "independent") + "' instead of requested dependency='" + (wantDependent ? "dependent" : "independent") + "'.");
            }

            if (String.IsNullOrWhiteSpace(data))
            {
                return new List<AscetDependencyFormulaMappingResult>();
            }

            IList<AscetElementDependencyDataVariantState> states = AscetElementDependencyXml.ReadDataVariantStates(data, elementName);
            if (wantDependent && !String.IsNullOrWhiteSpace(dependencyFormula))
            {
                VerifyRequestedMappings(
                    main,
                    data,
                    elementName,
                    dependencyMappings,
                    dependencyMappingKinds,
                    variantDependencyMappings,
                    variantDependencyMappingKinds,
                    variantPolicy,
                    variantNames);
                return BuildVerifiedMappingResults(FilterVariantStates(AscetElementDependencyXml.ReadDataVariantStates(main, data, elementName), variantPolicy, variantNames));
            }

            if (!wantDependent)
            {
                IList<AscetElementDependencyDataVariantState> selected = FilterVariantStates(states, variantPolicy, variantNames);
                for (int i = 0; i < selected.Count; i++)
                {
                    if (selected[i] == null || selected[i].HasDependency || !selected[i].HasScalarType)
                    {
                        throw new AscetReadException("independent_restoration_readback_mismatch", "set_element_dependency", "Dry-run did not restore ScalarType and remove Dependency for selected DataVariant '" + (selected[i] == null ? String.Empty : selected[i].VariantName) + "'.");
                    }
                }
            }

            return new List<AscetDependencyFormulaMappingResult>();
        }
        finally
        {
            TryDeleteDirectory(directory);
        }
    }

    internal static void ValidateNoDependencyCycle(
        string mainAmdPath,
        string dataAmdPath,
        string elementName,
        IDictionary<string, string> mappings,
        IDictionary<string, Dictionary<string, string>> variantMappings)
    {
        if (String.IsNullOrWhiteSpace(mainAmdPath) || String.IsNullOrWhiteSpace(dataAmdPath) || !File.Exists(dataAmdPath))
        {
            return;
        }

        XmlDocument main = new XmlDocument();
        main.Load(mainAmdPath);
        Dictionary<string, AscetDependencyNode> nodesByName = new Dictionary<string, AscetDependencyNode>(StringComparer.Ordinal);
        XmlNodeList elements = main.GetElementsByTagName("Element");
        for (int i = 0; i < elements.Count; i++)
        {
            XmlElement element = elements[i] as XmlElement;
            XmlElement attributes = FindDependencyAttributes(element);
            if (element == null || attributes == null)
            {
                continue;
            }
            AscetDependencyNodeKind kind;
            if (!TryMapDependencyNodeKind(attributes.GetAttribute("kind"), out kind))
            {
                continue;
            }
            string name = element.GetAttribute("name") ?? String.Empty;
            nodesByName[name] = new AscetDependencyNode
            {
                ElementId = String.IsNullOrWhiteSpace(element.GetAttribute("OID")) ? name : element.GetAttribute("OID"),
                Name = name,
                Kind = kind
            };
        }

        AscetDependencyNode source;
        if (!nodesByName.TryGetValue(elementName, out source) || source.Kind != AscetDependencyNodeKind.Parameter)
        {
            return;
        }

        Dictionary<string, AscetDependencyElementAdjacency> adjacencyByName = ReadDependencyAdjacency(dataAmdPath, nodesByName);
        List<AscetDependencyElementAdjacency> reachable = new List<AscetDependencyElementAdjacency>();
        CollectReachableAdjacency(elementName, adjacencyByName, new Dictionary<string, bool>(StringComparer.Ordinal), reachable);
        List<AscetDependencyEdge> proposed = new List<AscetDependencyEdge>();
        Dictionary<string, string> proposedNames = new Dictionary<string, string>(StringComparer.Ordinal);
        if (mappings != null)
        {
            foreach (KeyValuePair<string, string> mapping in mappings)
            {
                proposedNames[mapping.Value] = mapping.Value;
            }
        }
        if (variantMappings != null)
        {
            foreach (KeyValuePair<string, Dictionary<string, string>> variant in variantMappings)
            {
                if (variant.Value == null) continue;
                foreach (KeyValuePair<string, string> mapping in variant.Value)
                {
                    proposedNames[mapping.Value] = mapping.Value;
                }
            }
        }
        foreach (KeyValuePair<string, string> name in proposedNames)
        {
            AscetDependencyNode target;
            if (nodesByName.TryGetValue(name.Key, out target))
            {
                proposed.Add(new AscetDependencyEdge { Source = source, Target = target });
                CollectReachableAdjacency(name.Key, adjacencyByName, new Dictionary<string, bool>(StringComparer.Ordinal), reachable);
            }
        }

        AscetDependencyCycleDetectionResult result = new AscetDependencyCycleDetector().Detect(reachable, proposed);
        if (result.HasCycle)
        {
            throw new AscetReadException("dependency_cycle", "set_dependency_xml", "Dependency mapping would create a cycle: " + result.CyclePath + ".");
        }
    }

    private static Dictionary<string, AscetDependencyElementAdjacency> ReadDependencyAdjacency(
        string dataAmdPath,
        IDictionary<string, AscetDependencyNode> nodesByName)
    {
        Dictionary<string, AscetDependencyElementAdjacency> result = new Dictionary<string, AscetDependencyElementAdjacency>(StringComparer.Ordinal);
        XmlDocument data = new XmlDocument();
        data.Load(dataAmdPath);
        XmlNodeList entries = data.GetElementsByTagName("DataEntry");
        for (int i = 0; i < entries.Count; i++)
        {
            XmlElement entry = entries[i] as XmlElement;
            string sourceName = entry == null ? String.Empty : (entry.GetAttribute("elementName") ?? String.Empty);
            AscetDependencyNode source;
            if (entry == null || !nodesByName.TryGetValue(sourceName, out source) || source.Kind != AscetDependencyNodeKind.Parameter)
            {
                continue;
            }
            AscetDependencyElementAdjacency adjacency;
            if (!result.TryGetValue(sourceName, out adjacency))
            {
                adjacency = new AscetDependencyElementAdjacency { Element = source };
                result[sourceName] = adjacency;
            }
            XmlNodeList parameters = entry.GetElementsByTagName("Parameter");
            for (int j = 0; j < parameters.Count; j++)
            {
                XmlElement parameter = parameters[j] as XmlElement;
                string valueName = parameter == null ? String.Empty : (parameter.GetAttribute("valueName") ?? String.Empty);
                AscetDependencyNode target;
                if (nodesByName.TryGetValue(valueName, out target) && target.Kind == AscetDependencyNodeKind.Parameter)
                {
                    bool duplicate = false;
                    for (int k = 0; k < adjacency.MappedNodes.Count; k++)
                    {
                        if (String.Equals(adjacency.MappedNodes[k].ElementId, target.ElementId, StringComparison.Ordinal))
                        {
                            duplicate = true;
                            break;
                        }
                    }
                    if (!duplicate) adjacency.MappedNodes.Add(target);
                }
            }
        }
        return result;
    }

    private static void CollectReachableAdjacency(
        string name,
        IDictionary<string, AscetDependencyElementAdjacency> adjacencyByName,
        IDictionary<string, bool> visited,
        IList<AscetDependencyElementAdjacency> output)
    {
        if (String.IsNullOrWhiteSpace(name) || visited.ContainsKey(name)) return;
        visited[name] = true;
        AscetDependencyElementAdjacency adjacency;
        if (!adjacencyByName.TryGetValue(name, out adjacency) || adjacency == null) return;
        if (!output.Contains(adjacency)) output.Add(adjacency);
        for (int i = 0; i < adjacency.MappedNodes.Count; i++)
        {
            CollectReachableAdjacency(adjacency.MappedNodes[i].Name, adjacencyByName, visited, output);
        }
    }

    private static XmlElement FindDependencyAttributes(XmlElement element)
    {
        if (element == null) return null;
        XmlNodeList scalar = element.GetElementsByTagName("ScalarAttributes");
        if (scalar.Count > 0) return scalar[0] as XmlElement;
        XmlNodeList primitive = element.GetElementsByTagName("PrimitiveAttributes");
        return primitive.Count > 0 ? primitive[0] as XmlElement : null;
    }

    private static bool TryMapDependencyNodeKind(string rawKind, out AscetDependencyNodeKind kind)
    {
        string normalized = (rawKind ?? String.Empty).Trim().ToLowerInvariant().Replace("_", String.Empty).Replace("-", String.Empty);
        if (normalized == "parameter" || normalized == "dependent")
        {
            kind = AscetDependencyNodeKind.Parameter;
            return true;
        }
        if (normalized == "constant")
        {
            kind = AscetDependencyNodeKind.Constant;
            return true;
        }
        if (normalized == "systemconstant")
        {
            kind = AscetDependencyNodeKind.SystemConstant;
            return true;
        }
        kind = AscetDependencyNodeKind.Parameter;
        return false;
    }

    private static void VerifyRequestedMappings(
        string main,
        string data,
        string elementName,
        IDictionary<string, string> mappings,
        IDictionary<string, string> mappingKinds,
        IDictionary<string, Dictionary<string, string>> variantMappings,
        IDictionary<string, Dictionary<string, string>> variantMappingKinds,
        string variantPolicy,
        IList<string> variantNames)
    {
        if (variantMappings != null && variantMappings.Count > 0)
        {
            foreach (KeyValuePair<string, Dictionary<string, string>> variant in variantMappings)
            {
                IDictionary<string, string> kinds = variantMappingKinds != null && variantMappingKinds.ContainsKey(variant.Key)
                    ? variantMappingKinds[variant.Key]
                    : null;
                AscetElementDependencyXml.VerifyDataVariantMappings(
                    main,
                    data,
                    elementName,
                    variant.Value,
                    "selected",
                    new List<string> { variant.Key },
                    kinds);
            }
            return;
        }

        AscetElementDependencyXml.VerifyDataVariantMappings(main, data, elementName, mappings, variantPolicy, variantNames, mappingKinds);
    }

    private static IList<AscetElementDependencyDataVariantState> VerifyLiveDependencyMappings(
        CodeComponent component,
        string componentPath,
        string elementName,
        IDictionary<string, string> dependencyMappings,
        IDictionary<string, string> dependencyMappingKinds,
        IDictionary<string, Dictionary<string, string>> variantDependencyMappings,
        IDictionary<string, Dictionary<string, string>> variantDependencyMappingKinds,
        string variantPolicy,
        IList<string> variantNames,
        IList<string> attempted)
    {
        string directory = CreateTempDirectory("ascet-dependency-set-readback");
        try
        {
            attempted.Add("ExportXMLToFile(readback)");
            if (!component.ExportXMLToFile(directory, false))
            {
                throw new AscetReadException("tool_api_error", "set_element_dependency", "ASCET ExportXMLToFile returned false for component '" + componentPath + "' during dependency readback.");
            }

            string main = AscetElementDependencyXml.FindMainAmd(directory);
            string data = AscetElementDependencyXml.FindDataAmd(directory, main);
            if (String.IsNullOrWhiteSpace(main) || String.IsNullOrWhiteSpace(data))
            {
                throw new AscetReadException("data_amd_not_found", "set_element_dependency", "Live dependency readback requires both main and data AMD files.");
            }

            VerifyRequestedMappings(
                main,
                data,
                elementName,
                dependencyMappings,
                dependencyMappingKinds,
                variantDependencyMappings,
                variantDependencyMappingKinds,
                variantPolicy,
                variantNames);
            return FilterVariantStates(AscetElementDependencyXml.ReadDataVariantStates(main, data, elementName), variantPolicy, variantNames);
        }
        finally
        {
            TryDeleteDirectory(directory);
        }
    }

    private static IList<AscetElementDependencyDataVariantState> ReadLiveDataVariantStates(
        CodeComponent component,
        string componentPath,
        string elementName,
        IList<string> attempted)
    {
        return ReadLiveDataVariantStates(component, componentPath, elementName, null, attempted);
    }

    private static IList<AscetElementDependencyDataVariantState> ReadLiveDataVariantStates(
        CodeComponent component,
        string componentPath,
        string elementName,
        IList<string> overlaySpecFiles,
        IList<string> attempted)
    {
        string directory = CreateTempDirectory("ascet-dependency-set-data-readback");
        try
        {
            attempted.Add("ExportXMLToFile(data-readback)");
            if (!component.ExportXMLToFile(directory, false))
            {
                throw new AscetReadException("tool_api_error", "set_element_dependency", "ASCET ExportXMLToFile returned false for component '" + componentPath + "' during data readback.");
            }

            string main = AscetElementDependencyXml.FindMainAmd(directory);
            string data = AscetElementDependencyXml.FindDataAmd(directory, main);
            if (String.IsNullOrWhiteSpace(data))
            {
                throw new AscetReadException("data_amd_not_found", "set_element_dependency", "Live dependency data readback requires a data AMD file.");
            }
            if (overlaySpecFiles != null && overlaySpecFiles.Count > 0)
            {
                attempted.Add("ApplyElementOverlay(data-readback)");
                AscetElementDependencyOverlay.Apply(main, data, overlaySpecFiles);
            }

            return AscetElementDependencyXml.ReadDataVariantStates(data, elementName);
        }
        finally
        {
            TryDeleteDirectory(directory);
        }
    }

    private static IList<AscetElementDependencyDataVariantState> FilterVariantStates(IList<AscetElementDependencyDataVariantState> states, string variantPolicy, IList<string> variantNames)
    {
        List<AscetElementDependencyDataVariantState> selected = new List<AscetElementDependencyDataVariantState>();
        if (states == null)
        {
            return selected;
        }

        string policy = variantPolicy == null ? String.Empty : variantPolicy.Trim().ToLowerInvariant();
        if (String.IsNullOrWhiteSpace(policy) && states.Count == 1)
        {
            selected.Add(states[0]);
            return selected;
        }
        for (int i = 0; i < states.Count; i++)
        {
            AscetElementDependencyDataVariantState state = states[i];
            string name = state == null ? String.Empty : (state.VariantName ?? String.Empty);
            bool include = String.Equals(policy, "all", StringComparison.Ordinal) ||
                (String.Equals(policy, "default", StringComparison.Ordinal) && String.Equals(name, "default", StringComparison.OrdinalIgnoreCase));
            if (String.Equals(policy, "selected", StringComparison.Ordinal) && variantNames != null)
            {
                for (int j = 0; j < variantNames.Count; j++)
                {
                    if (String.Equals(name, variantNames[j], StringComparison.Ordinal))
                    {
                        include = true;
                        break;
                    }
                }
            }
            if (include && state != null)
            {
                selected.Add(state);
            }
        }
        return selected;
    }

    private static bool HasDependencyVariant(IList<AscetElementDependencyDataVariantState> states)
    {
        if (states == null)
        {
            return false;
        }

        for (int i = 0; i < states.Count; i++)
        {
            if (states[i] != null && states[i].HasDependency)
            {
                return true;
            }
        }

        return false;
    }

    private static IList<AscetDependencyFormulaMappingResult> BuildVerifiedMappingResults(IList<AscetElementDependencyDataVariantState> states)
    {
        List<AscetDependencyFormulaMappingResult> results = new List<AscetDependencyFormulaMappingResult>();
        if (states == null)
        {
            return results;
        }

        for (int i = 0; i < states.Count; i++)
        {
            AscetElementDependencyDataVariantState state = states[i];
            if (state == null || state.Mappings == null)
            {
                continue;
            }

            for (int j = 0; j < state.Mappings.Count; j++)
            {
                AscetElementDependencyDataVariantMapping mapping = state.Mappings[j];
                if (mapping == null)
                {
                    continue;
                }

                results.Add(new AscetDependencyFormulaMappingResult
                {
                    VariantName = state.VariantName ?? String.Empty,
                    FormalName = mapping.FormalName ?? String.Empty,
                    ValueName = mapping.ValueName ?? String.Empty,
                    TargetKind = mapping.ValueKind ?? String.Empty,
                    TargetScope = mapping.ValueScope ?? String.Empty,
                    FormalOid = mapping.FormalOid ?? String.Empty,
                    ValueOid = mapping.ValueOid ?? String.Empty,
                    Verified = true,
                    Issue = String.Empty
                });
            }
        }

        return results;
    }

    private void RestoreBackup(
        AscetSession session,
        string componentPath,
        string elementName,
        string expectedDependency,
        string expectedFormula,
        IList<AscetElementDependencyDataVariantState> expectedDataVariants,
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
        RequireComponentEditableInSession(session, componentPath, "set_element_dependency");
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

        if (expectedDataVariants != null && expectedDataVariants.Count > 0)
        {
            IList<AscetElementDependencyDataVariantState> restoredVariants = ReadLiveDataVariantStates(
                restoredComponent,
                componentPath,
                elementName,
                attempted);
            if (!VariantStatesEquivalent(expectedDataVariants, restoredVariants))
            {
                throw new AscetReadException(
                    "dependency_write_rollback_failed",
                    "set_element_dependency",
                    "Rollback live data readback did not restore the original DataVariant Dependency/ScalarType state.");
            }
        }
    }

    private static bool VariantStatesEquivalent(
        IList<AscetElementDependencyDataVariantState> expected,
        IList<AscetElementDependencyDataVariantState> actual)
    {
        if (expected == null || actual == null || expected.Count != actual.Count)
        {
            return false;
        }

        Dictionary<string, AscetElementDependencyDataVariantState> actualByName = new Dictionary<string, AscetElementDependencyDataVariantState>(StringComparer.Ordinal);
        for (int i = 0; i < actual.Count; i++)
        {
            AscetElementDependencyDataVariantState state = actual[i];
            if (state != null)
            {
                actualByName[state.VariantName ?? String.Empty] = state;
            }
        }
        for (int i = 0; i < expected.Count; i++)
        {
            AscetElementDependencyDataVariantState left = expected[i];
            AscetElementDependencyDataVariantState right;
            if (left == null || !actualByName.TryGetValue(left.VariantName ?? String.Empty, out right) || right == null ||
                left.HasDependency != right.HasDependency || left.HasScalarType != right.HasScalarType ||
                !String.Equals(left.ScalarTypeXml ?? String.Empty, right.ScalarTypeXml ?? String.Empty, StringComparison.Ordinal) ||
                (left.Mappings == null ? 0 : left.Mappings.Count) != (right.Mappings == null ? 0 : right.Mappings.Count))
            {
                return false;
            }
        }
        return true;
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
        AscetSetElementDependencyArguments parsed = null;

        try
        {
            parsed = ParseArguments(args);
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
            if (parsed != null && parsed.EmitJson)
            {
                Console.Write(FormatJsonFailure(ex));
            }
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
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetSetElementDependency.exe <target-path> <element-name> <dependent|independent> [--formula <expr>] [--mapping <formal=value>] [--clear-formula] [--target-kind auto|component|project|folder] [--match exact|all] [--dry-run] [--overlay-spec <file>] [--backup-dir <dir>] [--verify-readback] [--json]");
        }

        AscetSetElementDependencyArguments result = new AscetSetElementDependencyArguments
        {
            TargetPath = AscetElementDependencyPlanSupport.NormalizePath(args[0]),
            ElementName = AscetElementDependencyPlanSupport.NormalizeElementName(args[1]),
            RequestedDependency = NormalizeDependency(args[2]),
            DependencyFormula = String.Empty,
            DependencyMappings = new Dictionary<string, string>(StringComparer.Ordinal),
            DependencyMappingKinds = new Dictionary<string, string>(StringComparer.Ordinal),
            VariantDependencyMappings = new Dictionary<string, Dictionary<string, string>>(StringComparer.Ordinal),
            VariantDependencyMappingKinds = new Dictionary<string, Dictionary<string, string>>(StringComparer.Ordinal),
            VariantPolicy = String.Empty,
            VariantNames = new List<string>(),
            RestorationPolicy = String.Empty,
            RestorationValues = new Dictionary<string, string>(StringComparer.Ordinal),
            ClearDependencyFormula = false,
            TargetKind = "auto",
            MatchMode = "exact",
            DryRun = false,
            BackupDirectory = String.Empty,
            VerifyReadback = false,
            EmitJson = false,
            OverlaySpecFiles = new List<string>()
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

                AddMapping(result.DependencyMappings, result.DependencyMappingKinds, args[++i]);
                continue;
            }

            if (String.Equals(argument, "--variant-mapping", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --variant-mapping.");
                }
                AddVariantMapping(result.VariantDependencyMappings, result.VariantDependencyMappingKinds, args[++i]);
                continue;
            }

            if (String.Equals(argument, "--variant-policy", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --variant-policy.");
                }
                result.VariantPolicy = NormalizeVariantPolicy(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--variant", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --variant.");
                }
                string variant = args[++i] == null ? String.Empty : args[i].Trim();
                if (String.IsNullOrWhiteSpace(variant) || result.VariantNames.Contains(variant))
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "--variant requires a unique non-empty DataVariant name.");
                }
                result.VariantNames.Add(variant);
                continue;
            }

            if (String.Equals(argument, "--restoration-policy", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --restoration-policy.");
                }
                result.RestorationPolicy = NormalizeRestorationPolicy(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--restore-value", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --restore-value.");
                }
                AddNamedValue(result.RestorationValues, args[++i], "--restore-value");
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

            if (String.Equals(argument, "--overlay-spec", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --overlay-spec.");
                }
                string overlaySpec = args[++i] == null ? String.Empty : args[i].Trim();
                if (String.IsNullOrWhiteSpace(overlaySpec))
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Overlay spec path must not be empty.");
                }
                result.OverlaySpecFiles.Add(overlaySpec);
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
            result.VariantDependencyMappings != null && result.VariantDependencyMappings.Count > 0,
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
        if (result != null && (!String.IsNullOrWhiteSpace(result.ComponentOid) || !String.IsNullOrWhiteSpace(result.ElementOid)))
        {
            Dictionary<string, object> identity = new Dictionary<string, object>();
            identity["componentOID"] = result.ComponentOid ?? String.Empty;
            identity["elementOID"] = result.ElementOid ?? String.Empty;
            payload["identity"] = identity;
        }
        if (result != null && !String.IsNullOrWhiteSpace(result.DefinitionHash))
        {
            payload["definitionHash"] = result.DefinitionHash;
        }
        if (result != null && (!String.IsNullOrWhiteSpace(result.DataConfigurationSource) || !String.IsNullOrWhiteSpace(result.DataConfigurationName)))
        {
            Dictionary<string, object> configuration = new Dictionary<string, object>();
            configuration["source"] = result.DataConfigurationSource ?? String.Empty;
            configuration["name"] = result.DataConfigurationName ?? String.Empty;
            payload["dataConfiguration"] = configuration;
        }
        if (result != null && result.DataVariantNames != null)
        {
            payload["dataVariants"] = result.DataVariantNames;
        }
        payload["requested"] = result == null ? String.Empty : (result.RequestedDependency ?? String.Empty);
        payload["changed"] = result != null && result.Changed;
        payload["mutationStatus"] = result == null ? String.Empty : (result.MutationStatus ?? String.Empty);
        payload["saveAttempted"] = result != null && result.SaveAttempted;
        payload["saveSucceeded"] = result != null && result.SaveSucceeded;
        payload["saveState"] = result == null ? String.Empty : (result.SaveState ?? String.Empty);
        payload["verified"] = result != null && result.Verified;
        payload["verificationStatus"] = result == null ? String.Empty : (result.VerificationStatus ?? String.Empty);
        payload["verificationMode"] = result == null ? String.Empty : (result.VerificationMode ?? String.Empty);
        payload["sessionCount"] = result == null ? null : result.SessionCount;
        payload["saveCount"] = result == null ? null : result.SaveCount;
        payload["editableRetryCount"] = result == null ? null : result.EditableRetryCount;
        payload["nativeMutationAttemptCount"] = result == null ? null : result.NativeMutationAttemptCount;
        payload["canonicalEvidenceStatus"] = result == null ? "blocked" : (result.CanonicalEvidenceStatus ?? String.Empty);
        if (result != null && !String.IsNullOrWhiteSpace(result.CanonicalEvidenceIssue))
        {
            payload["canonicalEvidenceIssue"] = result.CanonicalEvidenceIssue;
        }
        if (result != null && !String.IsNullOrWhiteSpace(result.MatchMode) && !String.Equals(result.MatchMode, "exact", StringComparison.OrdinalIgnoreCase))
        {
            payload["match"] = result.MatchMode;
        }

        Dictionary<string, object> write = new Dictionary<string, object>();
        write["dryRun"] = result != null && result.DryRun;
        write["succeeded"] = result != null && result.WriteSucceeded;
        write["changed"] = result == null ? 0 : result.MatchesChanged;
        write["verifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        write["readbackVerified"] = result != null && result.ReadbackVerified;
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

        payload["beforeMappings"] = BuildMappingsPayload(result == null ? null : result.BeforeFormulaMappings);
        payload["mappings"] = BuildMappingsPayload(result == null ? null : result.FormulaMappings);

        if (result != null && !String.IsNullOrWhiteSpace(result.BackupDirectory))
        {
            payload["backup"] = result.BackupDirectory;
        }

        if (result != null && (!String.IsNullOrWhiteSpace(result.SnapshotPath) || !String.IsNullOrWhiteSpace(result.SnapshotHash)))
        {
            Dictionary<string, object> snapshot = new Dictionary<string, object>();
            snapshot["mode"] = result.SnapshotMode ?? String.Empty;
            snapshot["path"] = result.SnapshotPath ?? String.Empty;
            snapshot["hash"] = result.SnapshotHash ?? String.Empty;
            payload["snapshot"] = snapshot;
        }
        if (result != null && result.OverlaySpecHashes != null && result.OverlaySpecHashes.Count > 0)
        {
            Dictionary<string, object> overlay = new Dictionary<string, object>();
            overlay["mode"] = result.OverlayMode ?? String.Empty;
            overlay["specHashes"] = result.OverlaySpecHashes;
            overlay["elementOIDs"] = result.OverlayElementOids ?? new Dictionary<string, string>();
            payload["elementOverlay"] = overlay;
        }
        if (result != null && result.Issues != null && result.Issues.Count > 0)
        {
            payload["issues"] = result.Issues;
        }
        payload["plan"] = BuildPlanPayload(result == null ? null : result.Plan);
        return AscetJsonContract.Serialize(payload);
    }

    public static string FormatJsonFailure(Exception error)
    {
        AscetReadException ascet = error as AscetReadException;
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["changed"] = false;
        payload["mutationStatus"] = "failed";
        payload["saveAttempted"] = null;
        payload["saveSucceeded"] = null;
        payload["saveState"] = "unknown";
        payload["verified"] = false;
        payload["verificationStatus"] = "failed";
        payload["verificationMode"] = "same_session_dependency_endpoint";
        payload["sessionCount"] = null;
        payload["saveCount"] = null;
        payload["editableRetryCount"] = null;
        payload["nativeMutationAttemptCount"] = null;
        payload["canonicalEvidenceStatus"] = "blocked";
        payload["canonicalEvidenceIssue"] = "The operation failed before complete canonical counters were available.";
        payload["error"] = new Dictionary<string, object>
        {
            { "code", ascet == null ? "tool_api_error" : (ascet.Code ?? "tool_api_error") },
            { "message", error == null ? String.Empty : (error.Message ?? String.Empty) },
            { "operation", ascet == null ? "set_element_dependency" : (ascet.Operation ?? "set_element_dependency") }
        };
        return AscetJsonContract.Serialize(payload);
    }

    private static List<Dictionary<string, object>> BuildMappingsPayload(IList<AscetDependencyFormulaMappingResult> mappingResults)
    {
        List<Dictionary<string, object>> mappings = new List<Dictionary<string, object>>();
        if (mappingResults == null)
        {
            return mappings;
        }

        for (int i = 0; i < mappingResults.Count; i++)
        {
            AscetDependencyFormulaMappingResult mapping = mappingResults[i];
            if (mapping == null)
            {
                continue;
            }

            Dictionary<string, object> item = new Dictionary<string, object>();
            item["formal"] = mapping.FormalName ?? String.Empty;
            item["valueName"] = mapping.ValueName ?? String.Empty;
            if (!String.IsNullOrWhiteSpace(mapping.TargetKind))
            {
                item["targetKind"] = mapping.TargetKind;
            }
            if (!String.IsNullOrWhiteSpace(mapping.TargetScope))
            {
                item["targetScope"] = mapping.TargetScope;
            }
            item["verified"] = mapping.Verified;
            if (!String.IsNullOrWhiteSpace(mapping.VariantName))
            {
                item["variant"] = mapping.VariantName;
            }
            if (!String.IsNullOrWhiteSpace(mapping.FormalOid))
            {
                item["formalOID"] = mapping.FormalOid;
            }
            if (!String.IsNullOrWhiteSpace(mapping.ValueOid))
            {
                item["valueOID"] = mapping.ValueOid;
            }
            if (!String.IsNullOrWhiteSpace(mapping.Issue))
            {
                item["issue"] = mapping.Issue;
            }
            mappings.Add(item);
        }
        return mappings;
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
        ValidateFormulaArguments(dependency, formula, mappings, false, clearFormula, stage);
    }

    internal static void ValidateFormulaArguments(string dependency, string formula, IDictionary<string, string> mappings, bool hasVariantMappings, bool clearFormula, string stage)
    {
        bool hasFormula = !String.IsNullOrWhiteSpace(formula);
        bool hasMappings = (mappings != null && mappings.Count > 0) || hasVariantMappings;
        if (hasFormula && !String.Equals(dependency, "dependent", StringComparison.OrdinalIgnoreCase))
        {
            throw new AscetReadException("invalid_argument", stage, "--formula is only valid when requested dependency is dependent.");
        }

        if (hasFormula && clearFormula)
        {
            throw new AscetReadException("invalid_argument", stage, "--formula and --clear-formula cannot be used together.");
        }

        if (hasFormula && !hasMappings)
        {
            throw new AscetReadException("dependency_mappings_required", stage, "--formula requires at least one explicit --mapping formal=value entry.");
        }

        if (hasMappings && !hasFormula)
        {
            throw new AscetReadException("invalid_argument", stage, "--mapping requires --formula.");
        }
    }

    private static void AddMapping(Dictionary<string, string> mappings, Dictionary<string, string> kinds, string value)
    {
        if (mappings == null)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "Mapping collection must not be null.");
        }

        string raw = value == null ? String.Empty : value.Trim();
        int separator = raw.IndexOf('=');
        if (separator <= 0 || separator >= raw.Length - 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "--mapping value must use formal=value syntax.");
        }

        string formal = raw.Substring(0, separator).Trim();
        string target = raw.Substring(separator + 1).Trim();
        string targetKind = String.Empty;
        string targetName = target;
        int kindSeparator = target.IndexOf(':');
        if (kindSeparator > 0 && kindSeparator < target.Length - 1)
        {
            targetKind = NormalizeMappingTargetKind(target.Substring(0, kindSeparator));
            targetName = target.Substring(kindSeparator + 1).Trim();
        }
        if (String.IsNullOrWhiteSpace(formal) || String.IsNullOrWhiteSpace(targetName))
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "--mapping value must use non-empty formal=value syntax.");
        }

        if (mappings.ContainsKey(formal))
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "Duplicate --mapping formal name '" + formal + "'.");
        }

        mappings[formal] = targetName;
        if (!String.IsNullOrWhiteSpace(targetKind) && kinds != null)
        {
            kinds[formal] = targetKind;
        }
    }

    private static void AddVariantMapping(
        Dictionary<string, Dictionary<string, string>> mappings,
        Dictionary<string, Dictionary<string, string>> kinds,
        string value)
    {
        string raw = value == null ? String.Empty : value.Trim();
        int separator = raw.IndexOf(':');
        if (separator <= 0 || separator >= raw.Length - 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "--variant-mapping must use variant:formal=kind:name syntax.");
        }
        string variant = raw.Substring(0, separator).Trim();
        if (!mappings.ContainsKey(variant))
        {
            mappings[variant] = new Dictionary<string, string>(StringComparer.Ordinal);
            kinds[variant] = new Dictionary<string, string>(StringComparer.Ordinal);
        }
        AddMapping(mappings[variant], kinds[variant], raw.Substring(separator + 1));
    }

    private static void AddNamedValue(Dictionary<string, string> values, string rawValue, string option)
    {
        string raw = rawValue == null ? String.Empty : rawValue.Trim();
        int separator = raw.IndexOf('=');
        if (separator <= 0 || separator >= raw.Length - 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", option + " must use variant=value syntax.");
        }
        string name = raw.Substring(0, separator).Trim();
        string value = raw.Substring(separator + 1);
        if (values.ContainsKey(name))
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "Duplicate restoration value for DataVariant '" + name + "'.");
        }
        values[name] = value;
    }

    private static string NormalizeMappingTargetKind(string value)
    {
        string normalized = (value ?? String.Empty).Trim().ToLowerInvariant().Replace("_", String.Empty).Replace("-", String.Empty);
        if (normalized == "parameter" || normalized == "constant" || normalized == "systemconstant")
        {
            return normalized;
        }
        throw new AscetReadException("invalid_argument", "parse_arguments", "Dependency mapping target kind must be parameter, constant, or systemConstant.");
    }

    private static string NormalizeVariantPolicy(string value)
    {
        string normalized = (value ?? String.Empty).Trim().ToLowerInvariant();
        if (normalized == "default" || normalized == "selected" || normalized == "all")
        {
            return normalized;
        }
        throw new AscetReadException("invalid_argument", "parse_arguments", "variantPolicy must be default, selected, or all.");
    }

    private static string NormalizeRestorationPolicy(string value)
    {
        string normalized = (value ?? String.Empty).Trim();
        if (String.Equals(normalized, "fromSnapshot", StringComparison.OrdinalIgnoreCase))
        {
            return "fromSnapshot";
        }
        if (String.Equals(normalized, "explicit", StringComparison.OrdinalIgnoreCase))
        {
            return "explicit";
        }
        if (String.Equals(normalized, "ascetDefault", StringComparison.OrdinalIgnoreCase))
        {
            return "ascetDefault";
        }
        throw new AscetReadException("invalid_argument", "parse_arguments", "restorationPolicy must be fromSnapshot, explicit, or ascetDefault.");
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
