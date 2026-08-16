import type { AscetEditActionId, AscetEditPermissionDescriptor } from "../edit/contract.ts";

const safe = (overrides: Partial<AscetEditPermissionDescriptor> = {}): AscetEditPermissionDescriptor => ({
	baseRisk: "safe",
	autoApprovable: true,
	destructive: false,
	replacesExistingContent: false,
	requiresEditableTarget: true,
	requiresCompleteImpact: true,
	requiresReadback: true,
	...overrides,
});

const medium = (overrides: Partial<AscetEditPermissionDescriptor> = {}): AscetEditPermissionDescriptor => ({
	...safe(overrides),
	baseRisk: "medium",
});

const high = (overrides: Partial<AscetEditPermissionDescriptor> = {}): AscetEditPermissionDescriptor => ({
	...safe(overrides),
	baseRisk: "high",
	autoApprovable: false,
});

export const ASCET_EDIT_PERMISSION_DESCRIPTORS: Readonly<
	Record<AscetEditActionId, AscetEditPermissionDescriptor | undefined>
> = {
	create_folder: safe({ requiresEditableTarget: false }),
	create_component: safe({ requiresEditableTarget: false }),
	create_method: safe(),
	create_dependent_chain: high(),
	set_method_signature: safe(),
	delete_component: high({ destructive: true }),
	delete_method: high({ destructive: true }),
	delete_folder: high({ destructive: true, requiresEditableTarget: false }),
	set_method_code: high({ replacesExistingContent: true }),
	set_module_code: high({ replacesExistingContent: true }),
	set_state_machine_code: high({ replacesExistingContent: true }),
	set_enumerators: safe(),
	apply_element_spec: medium(),
	apply_project_formula: medium(),
	set_element_dependency: medium(),
	check: undefined,
	set: medium(),
};

export function getAscetEditPermissionDescriptor(action: AscetEditActionId): AscetEditPermissionDescriptor | undefined {
	return ASCET_EDIT_PERMISSION_DESCRIPTORS[action];
}
