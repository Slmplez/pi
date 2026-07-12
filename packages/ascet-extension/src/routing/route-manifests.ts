import { resolveAscetBackendCommandId } from "./command-aliases.ts";

export type AscetRouteCategory = "domain" | "ops";

export interface AscetRouteManifestEntry {
	toolName: string;
	action: string;
	logicalCommandId: string;
	operation: string;
	category: AscetRouteCategory;
}

export interface AscetRouteEntry extends AscetRouteManifestEntry {
	backendCommandId: string;
}

export const ascetRouteManifestEntries = [
	{
		toolName: "ascet_status",
		action: "status",
		logicalCommandId: "PiAscetStatus",
		operation: "status",
		category: "ops",
	},
	{
		toolName: "ascet_capabilities",
		action: "search",
		logicalCommandId: "PiAscetCapabilities",
		operation: "capabilities",
		category: "ops",
	},
	{
		toolName: "ascet_recover",
		action: "status",
		logicalCommandId: "PiAscetRecoverStatus",
		operation: "recover_status",
		category: "ops",
	},
	{
		toolName: "ascet_recover",
		action: "clear_extension_temp",
		logicalCommandId: "PiAscetRecoverClearExtensionTemp",
		operation: "clear_extension_temp",
		category: "ops",
	},
	{
		toolName: "ascet_recover",
		action: "scheduler_status",
		logicalCommandId: "PiAscetRecoverSchedulerStatus",
		operation: "scheduler_status",
		category: "ops",
	},
	{
		toolName: "ascet_recover",
		action: "scheduler_recover",
		logicalCommandId: "PiAscetRecoverSchedulerRecover",
		operation: "scheduler_recover",
		category: "ops",
	},
	{
		toolName: "ascet_recover",
		action: "clear_stale_cli_lock",
		logicalCommandId: "PiAscetRecoverClearStaleCliLock",
		operation: "clear_stale_cli_lock",
		category: "ops",
	},

	{
		toolName: "ascet_explore",
		action: "list_components",
		logicalCommandId: "AscetListComponents",
		operation: "list_components",
		category: "domain",
	},
	{
		toolName: "ascet_explore",
		action: "list_diagrams",
		logicalCommandId: "AscetListDiagrams",
		operation: "list_diagrams",
		category: "domain",
	},
	{
		toolName: "ascet_explore",
		action: "resolve_target",
		logicalCommandId: "AscetResolveComponent",
		operation: "resolve_component",
		category: "domain",
	},
	{
		toolName: "ascet_explore",
		action: "inspect_target",
		logicalCommandId: "AscetReadComponentSummary",
		operation: "read_component_summary",
		category: "domain",
	},
	{
		toolName: "ascet_explore",
		action: "preview_children",
		logicalCommandId: "AscetReadComponentChildren",
		operation: "read_component_children",
		category: "domain",
	},

	{
		toolName: "ascet_search",
		action: "search_components",
		logicalCommandId: "AscetSearchComponents",
		operation: "search_components",
		category: "domain",
	},
	{
		toolName: "ascet_search",
		action: "resolve_component",
		logicalCommandId: "AscetResolveComponent",
		operation: "resolve_component",
		category: "domain",
	},
	{
		toolName: "ascet_search",
		action: "search_elements",
		logicalCommandId: "AscetSearchElements",
		operation: "search_elements",
		category: "domain",
	},
	{
		toolName: "ascet_search",
		action: "search_occurrences",
		logicalCommandId: "AscetSearchOccurrences",
		operation: "search_occurrences",
		category: "domain",
	},

	{
		toolName: "ascet_read",
		action: "read",
		logicalCommandId: "AscetReadComponentSummary",
		operation: "read_component_summary",
		category: "domain",
	},
	{
		toolName: "ascet_read",
		action: "read_code",
		logicalCommandId: "AscetReadCode",
		operation: "read_code",
		category: "domain",
	},
	{
		toolName: "ascet_read",
		action: "read_implementation",
		logicalCommandId: "AscetReadImplementation",
		operation: "read_implementation",
		category: "domain",
	},
	{
		toolName: "ascet_read",
		action: "read_block_diagram",
		logicalCommandId: "AscetReadBlockDiagram",
		operation: "read_block_diagram",
		category: "domain",
	},
	{
		toolName: "ascet_read",
		action: "read_state_machine_flow",
		logicalCommandId: "AscetReadStateMachineFlow",
		operation: "read_state_machine_flow",
		category: "domain",
	},
	{
		toolName: "ascet_read",
		action: "read_import_export_match",
		logicalCommandId: "AscetReadImportExportMatch",
		operation: "read_import_export_match",
		category: "domain",
	},
	{
		toolName: "ascet_read",
		action: "read_import_export_matches",
		logicalCommandId: "AscetReadImportExportMatches",
		operation: "read_import_export_matches",
		category: "domain",
	},
	{
		toolName: "ascet_read",
		action: "plan_element_dependency",
		logicalCommandId: "AscetPlanElementDependency",
		operation: "plan_element_dependency",
		category: "domain",
	},

	{
		toolName: "ascet_reference",
		action: "component_refs",
		logicalCommandId: "AscetReadComponentRefs",
		operation: "read_component_refs",
		category: "domain",
	},
	{
		toolName: "ascet_reference",
		action: "used_by",
		logicalCommandId: "AscetReadComponentUsedBy",
		operation: "read_component_used_by",
		category: "domain",
	},
	{
		toolName: "ascet_reference",
		action: "element_refs",
		logicalCommandId: "AscetReadElementRefs",
		operation: "read_element_refs",
		category: "domain",
	},

	{
		toolName: "ascet_diff",
		action: "diff",
		logicalCommandId: "AscetDiffComponentSnapshot",
		operation: "diff_component_snapshot",
		category: "domain",
	},
	{
		toolName: "ascet_diff",
		action: "diff_method",
		logicalCommandId: "AscetDiffMethodCode",
		operation: "diff_method_code",
		category: "domain",
	},
	{
		toolName: "ascet_diff",
		action: "diff_component_snapshot",
		logicalCommandId: "AscetDiffComponentSnapshot",
		operation: "diff_component_snapshot",
		category: "domain",
	},
	{
		toolName: "ascet_diff",
		action: "diff_state_machine_domain",
		logicalCommandId: "AscetDiffStateMachineDomain",
		operation: "diff_state_machine_domain",
		category: "domain",
	},
	{
		toolName: "ascet_diff",
		action: "diff_element_spec",
		logicalCommandId: "AscetDiffElementSpec",
		operation: "diff_element_spec",
		category: "domain",
	},
	{
		toolName: "ascet_diff",
		action: "diff_project_formulas",
		logicalCommandId: "AscetDiffProjectFormulas",
		operation: "diff_project_formulas",
		category: "domain",
	},

	{
		toolName: "ascet_write",
		action: "create_folder",
		logicalCommandId: "AscetCreateFolder",
		operation: "create_folder",
		category: "domain",
	},
	{
		toolName: "ascet_write",
		action: "delete_folder",
		logicalCommandId: "AscetDeleteFolder",
		operation: "delete_folder",
		category: "domain",
	},
	{
		toolName: "ascet_write",
		action: "create_component",
		logicalCommandId: "AscetCreateComponent",
		operation: "create_component",
		category: "domain",
	},
	{
		toolName: "ascet_write",
		action: "create_method",
		logicalCommandId: "AscetCreateMethod",
		operation: "create_method",
		category: "domain",
	},
	{
		toolName: "ascet_write",
		action: "set_method_signature",
		logicalCommandId: "AscetSetMethodSignature",
		operation: "set_method_signature",
		category: "domain",
	},
	{
		toolName: "ascet_write",
		action: "delete_component",
		logicalCommandId: "AscetDeleteComponent",
		operation: "delete_component",
		category: "domain",
	},
	{
		toolName: "ascet_write",
		action: "delete_method",
		logicalCommandId: "AscetDeleteMethod",
		operation: "delete_method",
		category: "domain",
	},
	{
		toolName: "ascet_write",
		action: "set_method_code",
		logicalCommandId: "AscetSetMethodCode",
		operation: "set_method_code",
		category: "domain",
	},
	{
		toolName: "ascet_write",
		action: "set_class_method_code",
		logicalCommandId: "AscetSetClassMethodCode",
		operation: "set_class_method_code",
		category: "domain",
	},
	{
		toolName: "ascet_write",
		action: "set_module_code",
		logicalCommandId: "AscetSetModuleCode",
		operation: "set_module_code",
		category: "domain",
	},
	{
		toolName: "ascet_write",
		action: "set_state_machine_code",
		logicalCommandId: "AscetSetStateMachineCode",
		operation: "set_state_machine_code",
		category: "domain",
	},
	{
		toolName: "ascet_write",
		action: "apply_element_spec",
		logicalCommandId: "AscetApplyElementSpec",
		operation: "apply_element_spec",
		category: "domain",
	},
	{
		toolName: "ascet_write",
		action: "apply_project_formula",
		logicalCommandId: "AscetApplyProjectFormula",
		operation: "apply_project_formula",
		category: "domain",
	},
	{
		toolName: "ascet_write",
		action: "set_element_dependency",
		logicalCommandId: "AscetSetElementDependency",
		operation: "set_element_dependency",
		category: "domain",
	},

	{
		toolName: "ascet_batch_write",
		action: "batch_set_method_code",
		logicalCommandId: "AscetBatchSetMethodCode",
		operation: "batch_set_method_code",
		category: "domain",
	},
	{
		toolName: "ascet_batch_write",
		action: "batch_set_element_spec",
		logicalCommandId: "AscetBatchApplyElementSpec",
		operation: "batch_set_element_spec",
		category: "domain",
	},
	{
		toolName: "ascet_batch_write",
		action: "batch_create_component",
		logicalCommandId: "AscetBatchCreateComponent",
		operation: "batch_create_component",
		category: "domain",
	},
	{
		toolName: "ascet_batch_write",
		action: "batch_create_method",
		logicalCommandId: "AscetBatchCreateMethod",
		operation: "batch_create_method",
		category: "domain",
	},
	{
		toolName: "ascet_batch_write",
		action: "batch_set_project_formula",
		logicalCommandId: "AscetBatchApplyProjectFormula",
		operation: "batch_set_project_formula",
		category: "domain",
	},
	{
		toolName: "ascet_batch_write",
		action: "batch_delete_component",
		logicalCommandId: "AscetBatchDeleteComponent",
		operation: "batch_delete_component",
		category: "domain",
	},
	{
		toolName: "ascet_batch_write",
		action: "batch_delete_method",
		logicalCommandId: "AscetBatchDeleteMethod",
		operation: "batch_delete_method",
		category: "domain",
	},
	{
		toolName: "ascet_batch_write",
		action: "batch_create_folder",
		logicalCommandId: "AscetBatchCreateFolder",
		operation: "batch_create_folder",
		category: "domain",
	},
	{
		toolName: "ascet_batch_write",
		action: "batch_delete_folder",
		logicalCommandId: "AscetBatchDeleteFolder",
		operation: "batch_delete_folder",
		category: "domain",
	},

	{
		toolName: "ascet_verify",
		action: "readback",
		logicalCommandId: "AscetReadComponentSummary",
		operation: "read_component_summary",
		category: "domain",
	},
	{
		toolName: "ascet_scheduler_status",
		action: "status",
		logicalCommandId: "PiAscetSchedulerStatus",
		operation: "scheduler_status",
		category: "ops",
	},
	{
		toolName: "ascet_scheduler_status",
		action: "recover",
		logicalCommandId: "PiAscetSchedulerRecover",
		operation: "scheduler_recover",
		category: "ops",
	},
] as const satisfies readonly AscetRouteManifestEntry[];

export const ascetRouteEntries = ascetRouteManifestEntries.map((entry) => ({
	...entry,
	backendCommandId: resolveAscetBackendCommandId(entry.logicalCommandId),
})) as readonly AscetRouteEntry[];
