import type { AscetProfile } from "../exposure/profiles.ts";
import { DEFAULT_ASCET_PROFILE, resolveProfileTools } from "../exposure/profiles.ts";
import type { AscetActionActivationState, AscetActionDescriptor } from "./descriptors.ts";

export interface ActionActivationContext {
	env?: Record<string, string | undefined>;
	activeProfile?: AscetProfile;
	activeTools?: readonly string[];
}

const ascetToolNameSet = new Set([
	"ascet_status",
	"ascet_capabilities",
	"ascet_recover",
	"ascet_scheduler_status",
	"ascet_get",
	"ascet_read",
	"ascet_diff",
	"ascet_edit",
	"ascet_verify",
	"ascet_batch_write",
	"configure_parameter_dependency_chain",
]);

function isFeatureEnabled(featureFlag: string | undefined, env: Record<string, string | undefined>): boolean {
	if (!featureFlag) {
		return true;
	}
	return env[featureFlag] === "1" || env[featureFlag] === "true";
}

export function isAscetToolName(tool: string): boolean {
	return ascetToolNameSet.has(tool);
}

export function resolveActionActivation(
	descriptor: AscetActionDescriptor,
	context: ActionActivationContext = {},
): AscetActionActivationState {
	const env = context.env ?? process.env;
	const activeProfile = context.activeProfile ?? DEFAULT_ASCET_PROFILE;
	const activeTools = context.activeTools ?? resolveProfileTools(DEFAULT_ASCET_PROFILE, env);

	if (!isFeatureEnabled(descriptor.featureFlag, env)) {
		return "feature_disabled";
	}
	if (descriptor.visibility === "internal") {
		return "hidden";
	}
	if (!activeTools.includes(descriptor.tool)) {
		return "inactive";
	}
	if (activeProfile === "base") {
		return "active";
	}
	if (!descriptor.profiles.includes(activeProfile)) {
		return "inactive";
	}
	return "active";
}
