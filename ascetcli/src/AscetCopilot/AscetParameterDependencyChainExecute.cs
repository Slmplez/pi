using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Web.Script.Serialization;

public sealed class AscetParameterDependencyChainElementRequest
{
    public string ComponentPath { get; set; }
    public AscetElementSpecDocument Spec { get; set; }
}

public sealed class AscetParameterDependencyChainMappingRequest
{
    public string Kind { get; set; }
    public string Name { get; set; }
}

public sealed class AscetParameterDependencyChainDependencyRequest
{
    public string TargetPath { get; set; }
    public string ElementName { get; set; }
    public string Formula { get; set; }
    public IList<string> Formals { get; set; }
    public string BindingPolicy { get; set; }
    public IDictionary<string, AscetParameterDependencyChainMappingRequest> Mappings { get; set; }
    public string VariantPolicy { get; set; }
    public IList<string> Variants { get; set; }
}

public sealed class AscetParameterDependencyChainExecuteRequest
{
    public AscetParameterDependencyChainElementRequest Provider { get; set; }
    public AscetParameterDependencyChainElementRequest Consumer { get; set; }
    public AscetParameterDependencyChainElementRequest Local { get; set; }
    public AscetParameterDependencyChainDependencyRequest Dependency { get; set; }
}

public sealed class AscetParameterDependencyChainExecuteService : AscetReadDomainServiceBase
{
    private readonly ComponentElementSyncService _elementSync;
    private readonly AscetSetElementDependencyService _dependencyService;

    public AscetParameterDependencyChainExecuteService()
        : this(new ComponentElementSyncService(), new AscetSetElementDependencyService())
    {
    }

    public AscetParameterDependencyChainExecuteService(ComponentElementSyncService elementSync, AscetSetElementDependencyService dependencyService)
    {
        if (elementSync == null) throw new ArgumentNullException("elementSync");
        if (dependencyService == null) throw new ArgumentNullException("dependencyService");
        _elementSync = elementSync;
        _dependencyService = dependencyService;
    }

    public Dictionary<string, object> Execute(AscetParameterDependencyChainExecuteRequest request)
    {
        ValidateRequest(request);
        return ExecuteWithSession("configure_parameter_dependency_chain_execute", delegate(AscetSession session)
        {
            return ExecuteInSession(session, request);
        });
    }

    public Dictionary<string, object> ExecuteInSession(AscetSession session, AscetParameterDependencyChainExecuteRequest request)
    {
        ValidateRequest(request);
        return ExecuteWithBoundSession("configure_parameter_dependency_chain_execute", session, delegate(AscetSession currentSession)
        {
            return ExecuteCore(currentSession, request);
        });
    }

    private Dictionary<string, object> ExecuteCore(AscetSession session, AscetParameterDependencyChainExecuteRequest request)
    {
        string operationId = "chain-" + Guid.NewGuid().ToString("N");
        List<Dictionary<string, object>> stages = new List<Dictionary<string, object>>();
        List<Dictionary<string, object>> conflicts = new List<Dictionary<string, object>>();
        string overlayDirectory = String.Empty;
        bool mutationStarted = false;
        bool providerWritten = false;
        bool consumerWritten = false;
        bool localWritten = false;
        bool dependencyWritten = false;
        AscetItemRef providerRef = new AscetItemRef { Path = request.Provider.ComponentPath };
        AscetItemRef consumerRef = new AscetItemRef { Path = request.Consumer.ComponentPath };
        AscetElementCatalogReadResult providerBefore = null;
        AscetElementCatalogReadResult consumerBefore = null;
        AscetElementSpec providerElementBefore = null;
        AscetElementSpec consumerElementBefore = null;
        AscetElementSpec localElementBefore = null;
        AscetSetElementDependencyResult dependencyBefore = null;

        try
        {
            providerBefore = _elementSync.ReadCatalogInSession(session, providerRef);
            consumerBefore = _elementSync.ReadCatalogInSession(session, consumerRef);
            providerElementBefore = FindElement(providerBefore, request.Provider.Spec.Elements[0].Name);
            consumerElementBefore = FindElement(consumerBefore, request.Consumer.Spec.Elements[0].Name);
            localElementBefore = FindElement(consumerBefore, request.Local.Spec.Elements[0].Name);
            AscetElementSpecDiffResult providerDiff = _elementSync.DiffInSession(session, providerRef, request.Provider.Spec);
            AscetElementSpecDiffResult consumerDiff = _elementSync.DiffInSession(session, consumerRef, request.Consumer.Spec);
            AscetElementSpecDiffResult localDiff = _elementSync.DiffInSession(session, consumerRef, request.Local.Spec);
            AddElementConflicts(conflicts, "provider", providerDiff);
            AddElementConflicts(conflicts, "consumer", consumerDiff);
            AddElementConflicts(conflicts, "local", localDiff);

            overlayDirectory = CreateOverlayDirectory(operationId, request);
            dependencyBefore = _dependencyService.SetInSession(session, BuildDependencyArguments(request, true, overlayDirectory));
            bool localExists = ContainsElement(consumerBefore, request.Dependency.ElementName);
            bool dependencyExact = localExists && DependencyMatches(dependencyBefore, request.Dependency);
            if (localExists && String.Equals(dependencyBefore.BeforeDependency, "dependent", StringComparison.OrdinalIgnoreCase) && !dependencyExact)
            {
                conflicts.Add(Conflict("dependency", request.Dependency.TargetPath + "/" + request.Dependency.ElementName, "Existing dependency, formula, mappings, or variants do not match the requested chain."));
            }
            if (conflicts.Count > 0) return Rejected(operationId, conflicts, stages);

            string beforeHash = ComputeStateHash(providerBefore, consumerBefore, dependencyBefore);
            bool providerNeedsWrite = HasAdded(providerDiff);
            bool consumerNeedsWrite = HasAdded(consumerDiff);
            bool localNeedsWrite = HasAdded(localDiff);
            bool dependencyNeedsWrite = !dependencyExact;
            if (!providerNeedsWrite && !consumerNeedsWrite && !localNeedsWrite && !dependencyNeedsWrite)
            {
                stages.Add(Stage("provider", "verified", true));
                stages.Add(Stage("consumer", "verified", true));
                stages.Add(Stage("local", "verified", true));
                stages.Add(Stage("dependency", "verified", true));
                return Success("no_change", operationId, false, false, beforeHash, beforeHash, stages);
            }

            if (providerNeedsWrite)
            {
                mutationStarted = true;
                AscetElementSyncResult applied = _elementSync.ApplyInSession(session, providerRef, request.Provider.Spec, null, true, true);
                providerWritten = HasCreated(applied);
                RequireElementReadback(applied, "provider");
                stages.Add(Stage("provider", "created", true));
                ThrowIfInjectedFailure("provider");
            }
            else stages.Add(Stage("provider", "verified", true));

            if (consumerNeedsWrite)
            {
                mutationStarted = true;
                AscetElementSyncResult applied = _elementSync.ApplyInSession(session, consumerRef, request.Consumer.Spec, null, true, true);
                consumerWritten = HasCreated(applied);
                RequireElementReadback(applied, "consumer");
                stages.Add(Stage("consumer", "created", true));
                ThrowIfInjectedFailure("consumer");
            }
            else stages.Add(Stage("consumer", "verified", true));

            if (localNeedsWrite)
            {
                mutationStarted = true;
                AscetElementSyncResult applied = _elementSync.ApplyInSession(session, consumerRef, request.Local.Spec, null, true, true);
                localWritten = HasCreated(applied);
                RequireElementReadback(applied, "local");
                stages.Add(Stage("local", "created", true));
                ThrowIfInjectedFailure("local");
            }
            else stages.Add(Stage("local", "verified", true));

            if (dependencyNeedsWrite)
            {
                mutationStarted = true;
                AscetSetElementDependencyResult applied = _dependencyService.SetInSession(session, BuildDependencyArguments(request, false, String.Empty));
                dependencyWritten = applied != null && applied.MatchesChanged > 0;
                if (applied == null || !applied.WriteSucceeded || !applied.ReadbackVerified)
                    throw new AscetReadException("readback_mismatch", "configure_parameter_dependency_chain_execute", "Dependency write did not pass mandatory readback.");
                stages.Add(Stage("dependency", "created", true));
                ThrowIfInjectedFailure("dependency");
            }
            else stages.Add(Stage("dependency", "verified", true));

            VerifyFinalState(session, request, providerRef, consumerRef);
            AscetElementCatalogReadResult providerAfter = _elementSync.ReadCatalogInSession(session, providerRef);
            AscetElementCatalogReadResult consumerAfter = _elementSync.ReadCatalogInSession(session, consumerRef);
            AscetSetElementDependencyResult dependencyAfter = _dependencyService.SetInSession(session, BuildDependencyArguments(request, true, String.Empty));
            return Success("committed", operationId, true, mutationStarted, beforeHash, ComputeStateHash(providerAfter, consumerAfter, dependencyAfter), stages);
        }
        catch (Exception originalError)
        {
            if (!mutationStarted) return FailureBeforeMutation(operationId, originalError, stages);
            List<Dictionary<string, object>> rollbackStages = new List<Dictionary<string, object>>();
            List<string> rollbackErrors = new List<string>();
            if (dependencyWritten || localWritten)
                TryRollback("dependency", rollbackStages, rollbackErrors, delegate() { RestoreDependency(session, request, dependencyBefore); });
            if (localWritten)
                TryRollback("local", rollbackStages, rollbackErrors, delegate() { RestoreElement(session, consumerRef, request.Local.Spec.Elements[0].Name, localElementBefore); });
            if (consumerWritten)
                TryRollback("consumer", rollbackStages, rollbackErrors, delegate() { RestoreElement(session, consumerRef, request.Consumer.Spec.Elements[0].Name, consumerElementBefore); });
            if (providerWritten)
                TryRollback("provider", rollbackStages, rollbackErrors, delegate() { RestoreElement(session, providerRef, request.Provider.Spec.Elements[0].Name, providerElementBefore); });
            bool rollbackPassed = rollbackErrors.Count == 0;
            Dictionary<string, object> result = BaseResult(rollbackPassed ? "rolled_back" : "rollback_failed", operationId, true, true);
            result["stages"] = stages;
            result["originalError"] = ErrorPayload(originalError);
            Dictionary<string, object> rollback = new Dictionary<string, object>();
            rollback["required"] = true;
            rollback["status"] = rollbackPassed ? "passed" : "failed";
            rollback["verified"] = rollbackPassed;
            rollback["stages"] = rollbackStages;
            if (!rollbackPassed) rollback["errors"] = rollbackErrors;
            result["rollback"] = rollback;
            return result;
        }
        finally
        {
            TryDeleteDirectory(overlayDirectory);
        }
    }

    private static void ValidateRequest(AscetParameterDependencyChainExecuteRequest request)
    {
        if (request == null || request.Provider == null || request.Consumer == null || request.Local == null || request.Dependency == null)
            throw new AscetReadException("invalid_argument", "configure_parameter_dependency_chain_execute", "Provider, Consumer, Local, and Dependency are required.");
        ValidateElementRequest(request.Provider, "provider");
        ValidateElementRequest(request.Consumer, "consumer");
        ValidateElementRequest(request.Local, "local");
        if (!String.Equals(NormalizePath(request.Consumer.ComponentPath), NormalizePath(request.Local.ComponentPath), StringComparison.OrdinalIgnoreCase))
            throw new AscetReadException("invalid_argument", "configure_parameter_dependency_chain_execute", "Consumer and Local component paths must match.");
        if (String.Equals(NormalizePath(request.Provider.ComponentPath), NormalizePath(request.Consumer.ComponentPath), StringComparison.OrdinalIgnoreCase))
            throw new AscetReadException("invalid_argument", "configure_parameter_dependency_chain_execute", "Provider and Consumer component paths must differ.");
        if (String.IsNullOrWhiteSpace(request.Dependency.TargetPath) || String.IsNullOrWhiteSpace(request.Dependency.ElementName) || String.IsNullOrWhiteSpace(request.Dependency.Formula))
            throw new AscetReadException("invalid_argument", "configure_parameter_dependency_chain_execute", "Dependency target, element, and formula are required.");
        if (!String.Equals(NormalizePath(request.Dependency.TargetPath), NormalizePath(request.Consumer.ComponentPath), StringComparison.OrdinalIgnoreCase))
            throw new AscetReadException("invalid_argument", "configure_parameter_dependency_chain_execute", "Dependency target must equal the Consumer component path.");
        if (request.Dependency.Mappings == null || request.Dependency.Mappings.Count == 0 || request.Dependency.Formals == null || request.Dependency.Formals.Count == 0)
            throw new AscetReadException("invalid_argument", "configure_parameter_dependency_chain_execute", "Explicit formals and mappings are required.");
        HashSet<string> formals = new HashSet<string>(request.Dependency.Formals, StringComparer.Ordinal);
        if (formals.Count != request.Dependency.Formals.Count || formals.Count != request.Dependency.Mappings.Count)
            throw new AscetReadException("dependency_mapping_formals_mismatch", "configure_parameter_dependency_chain_execute", "Dependency formals and mapping keys must match exactly.");
        foreach (KeyValuePair<string, AscetParameterDependencyChainMappingRequest> mapping in request.Dependency.Mappings)
        {
            if (!formals.Contains(mapping.Key) || mapping.Value == null || String.IsNullOrWhiteSpace(mapping.Value.Name) || !IsMappingKind(mapping.Value.Kind))
                throw new AscetReadException("dependency_mapping_formals_mismatch", "configure_parameter_dependency_chain_execute", "Dependency mappings contain an invalid formal, kind, or target name.");
        }
    }

    private static void ValidateElementRequest(AscetParameterDependencyChainElementRequest request, string role)
    {
        if (request == null || String.IsNullOrWhiteSpace(request.ComponentPath) || request.Spec == null || request.Spec.Elements == null || request.Spec.Elements.Count != 1)
            throw new AscetReadException("invalid_argument", "configure_parameter_dependency_chain_execute", role + " requires one component path and exactly one Element spec.");
    }

    private AscetSetElementDependencyArguments BuildDependencyArguments(AscetParameterDependencyChainExecuteRequest request, bool dryRun, string overlayDirectory)
    {
        Dictionary<string, string> mappings = new Dictionary<string, string>(StringComparer.Ordinal);
        Dictionary<string, string> kinds = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (KeyValuePair<string, AscetParameterDependencyChainMappingRequest> entry in request.Dependency.Mappings)
        {
            mappings[entry.Key] = entry.Value.Name;
            kinds[entry.Key] = entry.Value.Kind;
        }
        List<string> overlayFiles = new List<string>();
        if (!String.IsNullOrWhiteSpace(overlayDirectory))
        {
            overlayFiles.Add(Path.Combine(overlayDirectory, "consumer.json"));
            overlayFiles.Add(Path.Combine(overlayDirectory, "local.json"));
        }
        return new AscetSetElementDependencyArguments
        {
            TargetPath = request.Dependency.TargetPath,
            ElementName = request.Dependency.ElementName,
            RequestedDependency = "dependent",
            DependencyFormula = request.Dependency.Formula,
            DependencyMappings = mappings,
            DependencyMappingKinds = kinds,
            VariantPolicy = request.Dependency.VariantPolicy,
            VariantNames = request.Dependency.Variants == null ? new List<string>() : new List<string>(request.Dependency.Variants),
            TargetKind = "component",
            MatchMode = "exact",
            DryRun = dryRun,
            VerifyReadback = true,
            OverlaySpecFiles = overlayFiles
        };
    }

    private static string CreateOverlayDirectory(string operationId, AscetParameterDependencyChainExecuteRequest request)
    {
        string directory = Path.Combine(Path.GetTempPath(), "ascet-chain-" + operationId);
        Directory.CreateDirectory(directory);
        File.WriteAllText(Path.Combine(directory, "consumer.json"), AscetReadElementCatalog.FormatSpecDocumentJson(request.Consumer.Spec), Encoding.UTF8);
        File.WriteAllText(Path.Combine(directory, "local.json"), AscetReadElementCatalog.FormatSpecDocumentJson(request.Local.Spec), Encoding.UTF8);
        return directory;
    }

    private static void AddElementConflicts(IList<Dictionary<string, object>> conflicts, string stage, AscetElementSpecDiffResult diff)
    {
        if (diff == null)
        {
            conflicts.Add(Conflict(stage, String.Empty, "Element diff returned no result."));
            return;
        }
        if (diff.ModifiedElements != null)
            for (int i = 0; i < diff.ModifiedElements.Count; i++)
            {
                AscetElementModifiedDiff item = diff.ModifiedElements[i];
                conflicts.Add(Conflict(stage, diff.ComponentPath + "/" + (item == null ? String.Empty : item.Name), "Existing Element differs from the requested definition."));
            }
        if (diff.IncompatibleElements != null)
            for (int i = 0; i < diff.IncompatibleElements.Count; i++)
            {
                AscetElementIncompatibleDiff item = diff.IncompatibleElements[i];
                conflicts.Add(Conflict(stage, diff.ComponentPath + "/" + (item == null ? String.Empty : item.Name), item == null ? "Incompatible Element." : item.Reason));
            }
    }

    private static bool DependencyMatches(AscetSetElementDependencyResult before, AscetParameterDependencyChainDependencyRequest requested)
    {
        if (before == null || !String.Equals(before.BeforeDependency, "dependent", StringComparison.OrdinalIgnoreCase) || !String.Equals(before.BeforeFormula, requested.Formula, StringComparison.Ordinal)) return false;
        IList<AscetDependencyFormulaMappingResult> existing = before.BeforeFormulaMappings;
        if (existing == null || existing.Count == 0) return false;
        for (int i = 0; i < existing.Count; i++)
        {
            AscetDependencyFormulaMappingResult mapping = existing[i];
            AscetParameterDependencyChainMappingRequest expected;
            if (mapping == null || !mapping.Verified || !requested.Mappings.TryGetValue(mapping.FormalName ?? String.Empty, out expected) || expected == null ||
                !String.Equals(expected.Name, mapping.ValueName, StringComparison.Ordinal) ||
                (!String.IsNullOrWhiteSpace(mapping.TargetKind) && !String.Equals(expected.Kind, mapping.TargetKind, StringComparison.OrdinalIgnoreCase))) return false;
        }
        foreach (KeyValuePair<string, AscetParameterDependencyChainMappingRequest> expected in requested.Mappings)
        {
            bool found = false;
            for (int i = 0; i < existing.Count; i++)
            {
                AscetDependencyFormulaMappingResult mapping = existing[i];
                if (mapping != null && mapping.Verified && String.Equals(mapping.FormalName, expected.Key, StringComparison.Ordinal) &&
                    String.Equals(mapping.ValueName, expected.Value.Name, StringComparison.Ordinal) &&
                    (String.IsNullOrWhiteSpace(mapping.TargetKind) || String.Equals(mapping.TargetKind, expected.Value.Kind, StringComparison.OrdinalIgnoreCase)))
                {
                    found = true;
                    break;
                }
            }
            if (!found) return false;
        }
        return true;
    }

    private void VerifyFinalState(AscetSession session, AscetParameterDependencyChainExecuteRequest request, AscetItemRef providerRef, AscetItemRef consumerRef)
    {
        RequireExactDiff(_elementSync.DiffInSession(session, providerRef, request.Provider.Spec), "provider");
        RequireExactDiff(_elementSync.DiffInSession(session, consumerRef, request.Consumer.Spec), "consumer");
        RequireExactDiff(_elementSync.DiffInSession(session, consumerRef, request.Local.Spec), "local");
        AscetSetElementDependencyResult dependency = _dependencyService.SetInSession(session, BuildDependencyArguments(request, true, String.Empty));
        if (!DependencyMatches(dependency, request.Dependency))
        {
            Dictionary<string, object> details = new Dictionary<string, object>();
            details["beforeDependency"] = dependency == null ? String.Empty : dependency.BeforeDependency;
            details["beforeFormula"] = dependency == null ? String.Empty : dependency.BeforeFormula;
            details["beforeMappings"] = dependency == null ? null : dependency.BeforeFormulaMappings;
            throw new AscetReadException("readback_mismatch", "configure_parameter_dependency_chain_execute", "Final Dependency readback does not match the requested chain: " + AscetJsonContract.Serialize(details));
        }
    }

    private static void RequireExactDiff(AscetElementSpecDiffResult diff, string stage)
    {
        if (diff == null || HasAdded(diff) || Count(diff.ModifiedElements) > 0 || Count(diff.IncompatibleElements) > 0 || Count(diff.SkippedElements) != 1)
            throw new AscetReadException("readback_mismatch", "configure_parameter_dependency_chain_execute", stage + " Element readback does not exactly match the request.");
    }

    private void RestoreDependency(AscetSession session, AscetParameterDependencyChainExecuteRequest request, AscetSetElementDependencyResult before)
    {
        if (before != null && String.Equals(before.BeforeDependency, "dependent", StringComparison.OrdinalIgnoreCase))
        {
            Dictionary<string, string> mappings = new Dictionary<string, string>(StringComparer.Ordinal);
            Dictionary<string, string> kinds = new Dictionary<string, string>(StringComparer.Ordinal);
            if (before.BeforeFormulaMappings != null)
                for (int i = 0; i < before.BeforeFormulaMappings.Count; i++)
                {
                    AscetDependencyFormulaMappingResult mapping = before.BeforeFormulaMappings[i];
                    if (mapping != null && !String.IsNullOrWhiteSpace(mapping.FormalName))
                    {
                        mappings[mapping.FormalName] = mapping.ValueName;
                        kinds[mapping.FormalName] = mapping.TargetKind;
                    }
                }
            _dependencyService.SetInSession(session, new AscetSetElementDependencyArguments
            {
                TargetPath = request.Dependency.TargetPath,
                ElementName = request.Dependency.ElementName,
                RequestedDependency = "dependent",
                DependencyFormula = before.BeforeFormula,
                DependencyMappings = mappings,
                DependencyMappingKinds = kinds,
                VariantPolicy = request.Dependency.VariantPolicy,
                VariantNames = request.Dependency.Variants == null ? new List<string>() : new List<string>(request.Dependency.Variants),
                TargetKind = "component",
                MatchMode = "exact",
                VerifyReadback = true
            });
            return;
        }
        _dependencyService.SetInSession(session, new AscetSetElementDependencyArguments
        {
            TargetPath = request.Dependency.TargetPath,
            ElementName = request.Dependency.ElementName,
            RequestedDependency = "independent",
            ClearDependencyFormula = true,
            RestorationPolicy = "ascetDefault",
            VariantPolicy = request.Dependency.VariantPolicy,
            VariantNames = request.Dependency.Variants == null ? new List<string>() : new List<string>(request.Dependency.Variants),
            TargetKind = "component",
            MatchMode = "exact",
            VerifyReadback = true
        });
    }

    private void RestoreElement(AscetSession session, AscetItemRef component, string elementName, AscetElementSpec before)
    {
        if (before == null)
        {
            _elementSync.RemoveElementInSession(session, component, elementName, true, true);
            return;
        }
        AscetElementSpecDocument document = new AscetElementSpecDocument { Elements = new List<AscetElementSpec> { before } };
        AscetElementSyncResult restored = _elementSync.ApplyInSession(
            session,
            component,
            document,
            new AscetElementApplyOptions { Mode = AscetElementApplyMode.Restore, DeleteMissing = false, RecreateIncompatible = true },
            true,
            true);
        if (restored == null || !restored.WriteSucceeded || !restored.ReadbackVerified)
            throw new AscetReadException("rollback_readback_mismatch", "configure_parameter_dependency_chain_execute", "Element rollback did not pass readback verification for '" + elementName + "'.");
    }

    private static AscetElementSpec FindElement(AscetElementCatalogReadResult catalog, string elementName)
    {
        if (catalog == null || catalog.Document == null || catalog.Document.Elements == null) return null;
        for (int i = 0; i < catalog.Document.Elements.Count; i++)
        {
            AscetElementSpec element = catalog.Document.Elements[i];
            if (element != null && String.Equals(element.Name, elementName, StringComparison.Ordinal)) return element;
        }
        return null;
    }

    private static void TryRollback(string stage, IList<Dictionary<string, object>> results, IList<string> errors, Action action)
    {
        try
        {
            action();
            results.Add(Stage(stage, "restored", true));
        }
        catch (Exception error)
        {
            results.Add(Stage(stage, "failed", false));
            errors.Add(stage + ": " + error.Message);
        }
    }

    private static Dictionary<string, object> Success(string status, string operationId, bool writesPerformed, bool mutationStarted, string beforeHash, string afterHash, IList<Dictionary<string, object>> stages)
    {
        Dictionary<string, object> result = BaseResult(status, operationId, writesPerformed, mutationStarted);
        result["beforeStateHash"] = beforeHash ?? String.Empty;
        result["afterStateHash"] = afterHash ?? String.Empty;
        result["stages"] = stages;
        result["verification"] = new Dictionary<string, object> { { "status", "passed" }, { "verified", true } };
        result["rollback"] = new Dictionary<string, object> { { "required", false }, { "status", "not_required" } };
        return result;
    }

    private static Dictionary<string, object> Rejected(string operationId, IList<Dictionary<string, object>> conflicts, IList<Dictionary<string, object>> stages)
    {
        Dictionary<string, object> result = BaseResult("rejected", operationId, false, false);
        result["conflicts"] = conflicts;
        result["stages"] = stages;
        result["rollback"] = new Dictionary<string, object> { { "required", false }, { "status", "not_required" } };
        return result;
    }

    private static Dictionary<string, object> FailureBeforeMutation(string operationId, Exception error, IList<Dictionary<string, object>> stages)
    {
        Dictionary<string, object> result = BaseResult("rejected", operationId, false, false);
        result["error"] = ErrorPayload(error);
        result["stages"] = stages;
        result["rollback"] = new Dictionary<string, object> { { "required", false }, { "status", "not_required" } };
        return result;
    }

    private static Dictionary<string, object> BaseResult(string status, string operationId, bool writesPerformed, bool mutationStarted)
    {
        return new Dictionary<string, object>
        {
            { "status", status }, { "operationId", operationId }, { "writesPerformed", writesPerformed },
            { "mutationStarted", mutationStarted }, { "consistency", "compensating" }
        };
    }

    private static Dictionary<string, object> ErrorPayload(Exception error)
    {
        AscetReadException ascet = error as AscetReadException;
        return new Dictionary<string, object>
        {
            { "code", ascet == null ? "tool_api_error" : (ascet.Code ?? "tool_api_error") },
            { "message", error == null ? String.Empty : (error.Message ?? String.Empty) },
            { "operation", ascet == null ? "configure_parameter_dependency_chain_execute" : (ascet.Operation ?? "configure_parameter_dependency_chain_execute") }
        };
    }

    private static Dictionary<string, object> Conflict(string stage, string target, string message)
    {
        return new Dictionary<string, object> { { "stage", stage ?? String.Empty }, { "target", target ?? String.Empty }, { "message", message ?? String.Empty } };
    }

    private static Dictionary<string, object> Stage(string stage, string status, bool readbackVerified)
    {
        return new Dictionary<string, object> { { "stage", stage ?? String.Empty }, { "status", status ?? String.Empty }, { "readbackVerified", readbackVerified } };
    }

    private static bool ContainsElement(AscetElementCatalogReadResult catalog, string name)
    {
        if (catalog == null || catalog.Document == null || catalog.Document.Elements == null) return false;
        for (int i = 0; i < catalog.Document.Elements.Count; i++)
        {
            AscetElementSpec element = catalog.Document.Elements[i];
            if (element != null && String.Equals(element.Name, name, StringComparison.Ordinal)) return true;
        }
        return false;
    }

    private static bool HasAdded(AscetElementSpecDiffResult diff) { return diff != null && Count(diff.AddedElements) > 0; }
    private static bool HasCreated(AscetElementSyncResult result) { return result != null && Count(result.CreatedElements) > 0; }
    private static void RequireElementReadback(AscetElementSyncResult result, string stage)
    {
        if (result == null || !result.WriteSucceeded || !result.ReadbackVerified)
            throw new AscetReadException("readback_mismatch", "configure_parameter_dependency_chain_execute", stage + " Element write did not pass mandatory readback.");
    }
    private static int Count<T>(ICollection<T> values) { return values == null ? 0 : values.Count; }
    private static bool IsMappingKind(string kind)
    {
        return String.Equals(kind, "parameter", StringComparison.OrdinalIgnoreCase) || String.Equals(kind, "constant", StringComparison.OrdinalIgnoreCase) || String.Equals(kind, "systemConstant", StringComparison.OrdinalIgnoreCase);
    }
    private static string NormalizePath(string path) { return (path ?? String.Empty).Trim().Replace('/', '\\').TrimStart('\\'); }

    private static string ComputeStateHash(AscetElementCatalogReadResult provider, AscetElementCatalogReadResult consumer, AscetSetElementDependencyResult dependency)
    {
        Dictionary<string, object> state = new Dictionary<string, object>();
        state["providerPath"] = provider == null ? String.Empty : provider.ComponentPath;
        state["provider"] = provider == null ? null : provider.Document;
        state["consumerPath"] = consumer == null ? String.Empty : consumer.ComponentPath;
        state["consumer"] = consumer == null ? null : consumer.Document;
        state["localDependency"] = new Dictionary<string, object>
        {
            { "dependency", dependency == null ? String.Empty : dependency.BeforeDependency },
            { "formula", dependency == null ? String.Empty : dependency.BeforeFormula },
            { "mappings", dependency == null ? null : dependency.BeforeFormulaMappings },
            { "variants", dependency == null ? null : dependency.DataVariantNames }
        };
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        serializer.MaxJsonLength = Int32.MaxValue;
        string canonical = Canonicalize(serializer.DeserializeObject(serializer.Serialize(state)), String.Empty);
        using (SHA256 algorithm = SHA256.Create())
        {
            byte[] digest = algorithm.ComputeHash(Encoding.UTF8.GetBytes(canonical));
            StringBuilder output = new StringBuilder(digest.Length * 2);
            for (int i = 0; i < digest.Length; i++) output.Append(digest[i].ToString("x2"));
            return output.ToString();
        }
    }

    private static string Canonicalize(object value, string key)
    {
        if (IsVolatileKey(key)) return String.Empty;
        if (value == null) return "null";
        IDictionary<string, object> dictionary = value as IDictionary<string, object>;
        if (dictionary != null)
        {
            List<string> keys = new List<string>(dictionary.Keys);
            keys.Sort(StringComparer.Ordinal);
            StringBuilder builder = new StringBuilder("{");
            for (int i = 0; i < keys.Count; i++)
            {
                string current = keys[i];
                if (!IsVolatileKey(current)) builder.Append(current).Append(':').Append(Canonicalize(dictionary[current], current)).Append(';');
            }
            return builder.Append('}').ToString();
        }
        IEnumerable sequence = value as IEnumerable;
        if (sequence != null && !(value is string))
        {
            StringBuilder builder = new StringBuilder("[");
            foreach (object item in sequence) builder.Append(Canonicalize(item, key)).Append(';');
            return builder.Append(']').ToString();
        }
        return Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture) ?? String.Empty;
    }

    private static bool IsVolatileKey(string key)
    {
        string value = key ?? String.Empty;
        return value.EndsWith("Oid", StringComparison.OrdinalIgnoreCase) || value.EndsWith("Oids", StringComparison.OrdinalIgnoreCase) ||
            value.IndexOf("backup", StringComparison.OrdinalIgnoreCase) >= 0 || value.IndexOf("snapshotPath", StringComparison.OrdinalIgnoreCase) >= 0 ||
            value.IndexOf("duration", StringComparison.OrdinalIgnoreCase) >= 0 || value.IndexOf("timestamp", StringComparison.OrdinalIgnoreCase) >= 0;
    }

    private static void ThrowIfInjectedFailure(string stage)
    {
        if (String.Equals(Environment.GetEnvironmentVariable("ASCET_PARAMETER_CHAIN_ENABLE_FAILURE_INJECTION"), "1", StringComparison.Ordinal) &&
            String.Equals(Environment.GetEnvironmentVariable("ASCET_PARAMETER_CHAIN_FAIL_AFTER_STAGE"), stage, StringComparison.OrdinalIgnoreCase))
        {
            throw new AscetReadException("injected_chain_failure", "configure_parameter_dependency_chain_execute", "Injected dependency-chain failure after stage '" + stage + "'.");
        }
    }

    private static void TryDeleteDirectory(string directory)
    {
        try { if (!String.IsNullOrWhiteSpace(directory) && Directory.Exists(directory)) Directory.Delete(directory, true); }
        catch { }
    }
}

public static class AscetParameterDependencyChainExecuteParser
{
    public static AscetParameterDependencyChainExecuteRequest ParseFile(string path)
    {
        if (String.IsNullOrWhiteSpace(path) || !File.Exists(path))
            throw new AscetReadException("invalid_argument", "configure_parameter_dependency_chain_execute", "A readable request file is required.");
        Dictionary<string, object> root = AscetJsonContract.DeserializeObject(File.ReadAllText(path, Encoding.UTF8));
        return new AscetParameterDependencyChainExecuteRequest
        {
            Provider = ParseElement(GetDictionary(root, "provider"), "provider"),
            Consumer = ParseElement(GetDictionary(root, "consumer"), "consumer"),
            Local = ParseElement(GetDictionary(root, "local"), "local"),
            Dependency = ParseDependency(GetDictionary(root, "dependency"))
        };
    }

    private static AscetParameterDependencyChainElementRequest ParseElement(Dictionary<string, object> value, string name)
    {
        if (value == null)
            throw new AscetReadException("invalid_argument", "configure_parameter_dependency_chain_execute", name + " request is required.");
        object specValue;
        if (!value.TryGetValue("spec", out specValue) || specValue == null)
            throw new AscetReadException("invalid_argument", "configure_parameter_dependency_chain_execute", name + ".spec is required.");
        return new AscetParameterDependencyChainElementRequest
        {
            ComponentPath = GetString(value, "componentPath"),
            Spec = AscetElementSpecDocumentParser.ParseJson(AscetJsonContract.Serialize(specValue))
        };
    }

    private static AscetParameterDependencyChainDependencyRequest ParseDependency(Dictionary<string, object> value)
    {
        if (value == null)
            throw new AscetReadException("invalid_argument", "configure_parameter_dependency_chain_execute", "dependency request is required.");
        Dictionary<string, AscetParameterDependencyChainMappingRequest> mappings = new Dictionary<string, AscetParameterDependencyChainMappingRequest>(StringComparer.Ordinal);
        Dictionary<string, object> mappingValues = GetDictionary(value, "mappings");
        if (mappingValues != null)
            foreach (KeyValuePair<string, object> entry in mappingValues)
            {
                Dictionary<string, object> mapping = entry.Value as Dictionary<string, object>;
                mappings[entry.Key] = new AscetParameterDependencyChainMappingRequest { Kind = GetString(mapping, "kind"), Name = GetString(mapping, "name") };
            }
        return new AscetParameterDependencyChainDependencyRequest
        {
            TargetPath = GetString(value, "targetPath"),
            ElementName = GetString(value, "elementName"),
            Formula = GetString(value, "formula"),
            Formals = GetStrings(value, "formals"),
            BindingPolicy = GetString(value, "bindingPolicy"),
            Mappings = mappings,
            VariantPolicy = GetString(value, "variantPolicy"),
            Variants = GetStrings(value, "variants")
        };
    }

    private static Dictionary<string, object> GetDictionary(Dictionary<string, object> value, string key)
    {
        object result;
        return value != null && value.TryGetValue(key, out result) ? result as Dictionary<string, object> : null;
    }

    private static string GetString(Dictionary<string, object> value, string key)
    {
        object result;
        return value != null && value.TryGetValue(key, out result) && result != null ? Convert.ToString(result) : String.Empty;
    }

    private static IList<string> GetStrings(Dictionary<string, object> value, string key)
    {
        List<string> result = new List<string>();
        object raw;
        IEnumerable values = value != null && value.TryGetValue(key, out raw) ? raw as IEnumerable : null;
        if (values != null && !(values is string))
            foreach (object item in values)
            {
                string text = item == null ? String.Empty : Convert.ToString(item);
                if (!String.IsNullOrWhiteSpace(text)) result.Add(text);
            }
        return result;
    }
}
