import { getAscetEditPermissionDescriptor } from "../permissions/descriptors.ts";

export interface AscetEditPermissionDescriptor {
	baseRisk: "safe" | "medium" | "high";
	autoApprovable: boolean;
	destructive: boolean;
	replacesExistingContent: boolean;
	requiresEditableTarget: boolean;
	requiresCompleteImpact: boolean;
	requiresReadback: boolean;
}

const editExecutorByAction = {
	create_folder: "createFolder",
	create_component: "createComponent",
	create_method: "createMethod",
	create_dependent_chain: "createDependentChain",
	set_method_signature: "setMethodSignature",
	delete_component: "deleteComponent",
	delete_method: "deleteMethod",
	delete_folder: "deleteFolder",
	set_method_code: "setMethodCode",
	set_module_code: "setModuleCode",
	set_state_machine_code: "setStateMachineCode",
	set_enumerators: "setEnumerators",
	apply_element_spec: "applyElementSpec",
	apply_project_formula: "applyProjectFormula",
	set_element_dependency: "setElementDependency",
	check: "editability",
	set: "editability",
} as const;

export type AscetEditActionId = keyof typeof editExecutorByAction;

export interface AscetEditRuntimeAction {
	id: AscetEditActionId;
	discriminator: { field: "action" | "mode"; value: AscetEditActionId };
	jobKind: "read" | "write";
	permission?: AscetEditPermissionDescriptor;
	executor: (typeof editExecutorByAction)[AscetEditActionId];
}

function isAscetEditActionId(value: string): value is AscetEditActionId {
	return Object.hasOwn(editExecutorByAction, value);
}

function toRuntimeAction(id: AscetEditActionId): AscetEditRuntimeAction {
	return {
		id,
		discriminator: { field: id === "check" || id === "set" ? "mode" : "action", value: id },
		jobKind: id === "check" ? "read" : "write",
		permission: getAscetEditPermissionDescriptor(id),
		executor: editExecutorByAction[id],
	};
}

export function listAscetEditActions(): readonly AscetEditRuntimeAction[] {
	return Object.keys(editExecutorByAction).map((id) => toRuntimeAction(id as AscetEditActionId));
}

export function getAscetEditAction(id: AscetEditActionId): AscetEditRuntimeAction {
	return toRuntimeAction(id);
}

export function getAscetEditActionByDiscriminator(
	field: AscetEditRuntimeAction["discriminator"]["field"],
	value: string,
): AscetEditRuntimeAction | undefined {
	if (!isAscetEditActionId(value)) return undefined;
	const action = toRuntimeAction(value);
	return action.discriminator.field === field ? action : undefined;
}
