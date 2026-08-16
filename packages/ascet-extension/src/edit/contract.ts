import { getAscetEditPermissionDescriptor } from "../permissions/descriptors.ts";

export type AscetEditActionId =
	| "create_folder"
	| "create_component"
	| "create_method"
	| "create_dependent_chain"
	| "set_method_signature"
	| "delete_component"
	| "delete_method"
	| "delete_folder"
	| "set_method_code"
	| "set_module_code"
	| "set_state_machine_code"
	| "set_enumerators"
	| "apply_element_spec"
	| "apply_project_formula"
	| "set_element_dependency"
	| "check"
	| "set";

export interface AscetEditPermissionDescriptor {
	baseRisk: "safe" | "medium" | "high";
	autoApprovable: boolean;
	destructive: boolean;
	replacesExistingContent: boolean;
	requiresEditableTarget: boolean;
	requiresCompleteImpact: boolean;
	requiresReadback: boolean;
}

export interface AscetEditActionContract {
	id: AscetEditActionId;
	discriminator: {
		field: "action" | "mode";
		value: AscetEditActionId;
	};
	logicalCommandId: string;
	operation: string;
	jobKind: "read" | "write";
	permission?: AscetEditPermissionDescriptor;
	profileNames: readonly string[];
	executor: string;
	schemaKey: string;
	promptKey: string;
}

const mutationProfiles = ["write-preflight", "batch-write"] as const;
const editabilityProfiles = ["component-edit"] as const;

const ascetEditActions = [
	{
		id: "create_folder",
		discriminator: { field: "action", value: "create_folder" },
		logicalCommandId: "AscetCreateFolder",
		operation: "create_folder",
		jobKind: "write",
		permission: getAscetEditPermissionDescriptor("create_folder")!,
		profileNames: mutationProfiles,
		executor: "createFolder",
		schemaKey: "create_folder",
		promptKey: "create_folder",
	},
	{
		id: "create_component",
		discriminator: { field: "action", value: "create_component" },
		logicalCommandId: "AscetCreateComponent",
		operation: "create_component",
		jobKind: "write",
		permission: getAscetEditPermissionDescriptor("create_component")!,
		profileNames: mutationProfiles,
		executor: "createComponent",
		schemaKey: "create_component",
		promptKey: "create_component",
	},
	{
		id: "create_method",
		discriminator: { field: "action", value: "create_method" },
		logicalCommandId: "AscetCreateMethod",
		operation: "create_method",
		jobKind: "write",
		permission: getAscetEditPermissionDescriptor("create_method")!,
		profileNames: mutationProfiles,
		executor: "createMethod",
		schemaKey: "create_method",
		promptKey: "create_method",
	},
	{
		id: "create_dependent_chain",
		discriminator: { field: "action", value: "create_dependent_chain" },
		logicalCommandId: "AscetCreateDependentChain",
		operation: "configure_parameter_dependency_chain_execute",
		jobKind: "write",
		permission: getAscetEditPermissionDescriptor("create_dependent_chain")!,
		profileNames: mutationProfiles,
		executor: "createDependentChain",
		schemaKey: "create_dependent_chain",
		promptKey: "create_dependent_chain",
	},
	{
		id: "set_method_signature",
		discriminator: { field: "action", value: "set_method_signature" },
		logicalCommandId: "AscetSetMethodSignature",
		operation: "set_method_signature",
		jobKind: "write",
		permission: getAscetEditPermissionDescriptor("set_method_signature")!,
		profileNames: mutationProfiles,
		executor: "setMethodSignature",
		schemaKey: "set_method_signature",
		promptKey: "set_method_signature",
	},
	{
		id: "delete_component",
		discriminator: { field: "action", value: "delete_component" },
		logicalCommandId: "AscetDeleteComponent",
		operation: "delete_component",
		jobKind: "write",
		permission: getAscetEditPermissionDescriptor("delete_component")!,
		profileNames: mutationProfiles,
		executor: "deleteComponent",
		schemaKey: "delete_component",
		promptKey: "delete_component",
	},
	{
		id: "delete_method",
		discriminator: { field: "action", value: "delete_method" },
		logicalCommandId: "AscetDeleteMethod",
		operation: "delete_method",
		jobKind: "write",
		permission: getAscetEditPermissionDescriptor("delete_method")!,
		profileNames: mutationProfiles,
		executor: "deleteMethod",
		schemaKey: "delete_method",
		promptKey: "delete_method",
	},
	{
		id: "delete_folder",
		discriminator: { field: "action", value: "delete_folder" },
		logicalCommandId: "AscetDeleteFolder",
		operation: "delete_folder",
		jobKind: "write",
		permission: getAscetEditPermissionDescriptor("delete_folder")!,
		profileNames: mutationProfiles,
		executor: "deleteFolder",
		schemaKey: "delete_folder",
		promptKey: "delete_folder",
	},
	{
		id: "set_method_code",
		discriminator: { field: "action", value: "set_method_code" },
		logicalCommandId: "AscetSetMethodCode",
		operation: "set_method_code",
		jobKind: "write",
		permission: getAscetEditPermissionDescriptor("set_method_code")!,
		profileNames: mutationProfiles,
		executor: "setMethodCode",
		schemaKey: "set_method_code",
		promptKey: "set_method_code",
	},
	{
		id: "set_module_code",
		discriminator: { field: "action", value: "set_module_code" },
		logicalCommandId: "AscetSetModuleCode",
		operation: "set_module_code",
		jobKind: "write",
		permission: getAscetEditPermissionDescriptor("set_module_code")!,
		profileNames: mutationProfiles,
		executor: "setModuleCode",
		schemaKey: "set_module_code",
		promptKey: "set_module_code",
	},
	{
		id: "set_state_machine_code",
		discriminator: { field: "action", value: "set_state_machine_code" },
		logicalCommandId: "AscetSetStateMachineCode",
		operation: "set_state_machine_code",
		jobKind: "write",
		permission: getAscetEditPermissionDescriptor("set_state_machine_code")!,
		profileNames: mutationProfiles,
		executor: "setStateMachineCode",
		schemaKey: "set_state_machine_code",
		promptKey: "set_state_machine_code",
	},
	{
		id: "set_enumerators",
		discriminator: { field: "action", value: "set_enumerators" },
		logicalCommandId: "AscetSetEnumerators",
		operation: "set_enumerators",
		jobKind: "write",
		permission: getAscetEditPermissionDescriptor("set_enumerators")!,
		profileNames: mutationProfiles,
		executor: "setEnumerators",
		schemaKey: "set_enumerators",
		promptKey: "set_enumerators",
	},
	{
		id: "apply_element_spec",
		discriminator: { field: "action", value: "apply_element_spec" },
		logicalCommandId: "AscetApplyElementSpec",
		operation: "apply_element_spec",
		jobKind: "write",
		permission: getAscetEditPermissionDescriptor("apply_element_spec")!,
		profileNames: mutationProfiles,
		executor: "applyElementSpec",
		schemaKey: "apply_element_spec",
		promptKey: "apply_element_spec",
	},
	{
		id: "apply_project_formula",
		discriminator: { field: "action", value: "apply_project_formula" },
		logicalCommandId: "AscetApplyProjectFormula",
		operation: "apply_project_formula",
		jobKind: "write",
		permission: getAscetEditPermissionDescriptor("apply_project_formula")!,
		profileNames: mutationProfiles,
		executor: "applyProjectFormula",
		schemaKey: "apply_project_formula",
		promptKey: "apply_project_formula",
	},
	{
		id: "set_element_dependency",
		discriminator: { field: "action", value: "set_element_dependency" },
		logicalCommandId: "AscetSetElementDependency",
		operation: "set_element_dependency",
		jobKind: "write",
		permission: getAscetEditPermissionDescriptor("set_element_dependency")!,
		profileNames: mutationProfiles,
		executor: "setElementDependency",
		schemaKey: "set_element_dependency",
		promptKey: "set_element_dependency",
	},
	{
		id: "check",
		discriminator: { field: "mode", value: "check" },
		logicalCommandId: "AscetComponentEditableCheck",
		operation: "component_editable_check",
		jobKind: "read",
		profileNames: editabilityProfiles,
		executor: "editability",
		schemaKey: "check",
		promptKey: "check",
	},
	{
		id: "set",
		discriminator: { field: "mode", value: "set" },
		logicalCommandId: "AscetComponentEditableSet",
		operation: "component_editable_set",
		jobKind: "write",
		permission: getAscetEditPermissionDescriptor("set")!,
		profileNames: editabilityProfiles,
		executor: "editability",
		schemaKey: "set",
		promptKey: "set",
	},
] as const satisfies readonly AscetEditActionContract[];

const actionById = new Map(ascetEditActions.map((action) => [action.id, action]));

export function listAscetEditActions(): readonly AscetEditActionContract[] {
	return ascetEditActions;
}

export function getAscetEditAction(id: AscetEditActionId): AscetEditActionContract | undefined {
	return actionById.get(id);
}

export function getAscetEditActionByDiscriminator(
	field: AscetEditActionContract["discriminator"]["field"],
	value: string,
): AscetEditActionContract | undefined {
	return ascetEditActions.find(
		(action) => action.discriminator.field === field && action.discriminator.value === value,
	);
}
