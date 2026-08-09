using System;
using System.Collections.Generic;

public static class AscetLegacyOperationRegistry
{
    private static readonly Dictionary<string, LegacyOperationEntryPoint> EntryPoints = BuildEntryPoints();

    public static bool TryResolve(string operation, out LegacyOperationEntryPoint entryPoint)
    {
        entryPoint = null;
        if (String.IsNullOrWhiteSpace(operation))
        {
            return false;
        }
        return EntryPoints.TryGetValue(operation.Trim(), out entryPoint);
    }

    public static ICollection<string> GetOperationIds()
    {
        return EntryPoints.Keys;
    }

    private static Dictionary<string, LegacyOperationEntryPoint> BuildEntryPoints()
    {
        Dictionary<string, LegacyOperationEntryPoint> entries =
            new Dictionary<string, LegacyOperationEntryPoint>(StringComparer.OrdinalIgnoreCase);

        entries["apply_project_formula"] = AscetApplyProjectFormula.Main;
        entries["create_folder"] = AscetCreateFolder.Main;
        entries["create_method"] = AscetCreateMethod.Main;
        entries["delete_component"] = AscetDeleteComponent.Main;
        entries["delete_folder"] = AscetDeleteFolder.Main;
        entries["delete_method"] = AscetDeleteMethod.Main;
        entries["diff_class"] = AscetDiffClass.Main;
        entries["diff_component_snapshot"] = AscetDiffComponentSnapshot.Main;
        entries["diff_element_spec"] = AscetDiffElementSpec.Main;
        entries["diff_method_code"] = AscetDiffMethodCode.Main;
        entries["diff_module"] = AscetDiffModule.Main;
        entries["diff_project_formulas"] = AscetDiffProjectFormulas.Main;
        entries["diff_state_machine"] = AscetDiffStateMachine.Main;
        entries["diff_state_machine_domain"] = AscetDiffStateMachineDomain.Main;
        entries["read_block_diagram"] = AscetReadBlockDiagram.Main;
        entries["read_class_snapshot"] = AscetReadClassSnapshot.Main;
        entries["read_class_summary"] = AscetReadClassSummary.Main;
        entries["read_component_code"] = AscetReadComponentCode.Main;
        entries["read_component_refs"] = AscetReadComponentRefs.Main;
        entries["read_component_snapshot"] = AscetReadComponentSnapshot.Main;
        entries["read_component_used_by"] = AscetReadComponentUsedBy.Main;
        entries["read_element_catalog"] = AscetReadElementCatalog.Main;
        entries["read_element_refs"] = AscetReadElementRefs.Main;
        entries["read_implementation"] = AscetReadImplementation.Main;
        entries["read_method_code"] = AscetReadMethodCode.Main;
        entries["read_module_closure"] = AscetReadModuleClosure.Main;
        entries["read_module_snapshot"] = AscetReadModuleSnapshot.Main;
        entries["read_module_summary"] = AscetReadModuleSummary.Main;
        entries["read_references"] = AscetReadReferences.Main;
        entries["read_state_machine"] = AscetReadStateMachine.Main;
        entries["read_state_machine_flow"] = AscetReadStateMachineFlow.Main;
        entries["read_state_machine_snapshot"] = AscetReadStateMachineSnapshot.Main;
        entries["read_state_machine_summary"] = AscetReadStateMachineSummary.Main;
        entries["read_text_code"] = AscetReadTextCode.Main;
        entries["set_class_method_code"] = AscetSetClassMethodCode.Main;
        entries["set_method_signature"] = AscetSetMethodSignature.Main;
        entries["set_module_code"] = AscetSetModuleCode.Main;
        entries["set_state_machine_code"] = AscetSetStateMachineCode.Main;

        return entries;
    }
}