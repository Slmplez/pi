export type AscetCreateMethodComponentKind = "class" | "module" | "statemachine";
export type AscetCreateMethodKind = "abstract" | "process" | "action" | "condition" | "trigger";

export const ASCET_CREATE_METHOD_KIND_COMPATIBILITY = {
	class: ["abstract"],
	module: ["process"],
	statemachine: ["action", "condition", "trigger"],
} as const satisfies Record<AscetCreateMethodComponentKind, readonly AscetCreateMethodKind[]>;

export function getCompatibleMethodKinds(
	componentKind: AscetCreateMethodComponentKind,
): readonly AscetCreateMethodKind[] {
	return ASCET_CREATE_METHOD_KIND_COMPATIBILITY[componentKind];
}

export function validateCreateMethodKindCompatibility(params: {
	componentKind?: AscetCreateMethodComponentKind;
	methodKind?: AscetCreateMethodKind;
}): { code: "ascet_write_incompatible_method_kind"; message: string } | undefined {
	if (!params.componentKind || !params.methodKind) {
		return undefined;
	}
	const compatibleKinds = getCompatibleMethodKinds(params.componentKind);
	if (compatibleKinds.includes(params.methodKind)) {
		return undefined;
	}
	return {
		code: "ascet_write_incompatible_method_kind",
		message: createMethodKindCompatibilityMessage(params.componentKind, compatibleKinds),
	};
}

function createMethodKindCompatibilityMessage(
	componentKind: AscetCreateMethodComponentKind,
	compatibleKinds: readonly AscetCreateMethodKind[],
): string {
	switch (componentKind) {
		case "class":
			return "Class method creation supports only abstract methods in v1.";
		case "module":
			return "Module method creation supports only process methods in v1.";
		case "statemachine":
			return "State machine method creation supports only action, condition, or trigger in v1.";
		default:
			return `Method kind must be one of ${compatibleKinds.join(", ")} for ${componentKind}.`;
	}
}
