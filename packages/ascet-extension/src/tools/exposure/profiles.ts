export type AscetProfile =
	| "base"
	| "advanced-read"
	| "reference"
	| "diff"
	| "verify"
	| "write-preflight"
	| "batch-write"
	| "component-edit"
	| "ops";

export const DEFAULT_ASCET_PROFILE: AscetProfile = "base";

const ON_DEMAND_DISCOVERY_TOOLS = ["find", "grep", "read", "ascet_get", "ascet_read"] as const;
const COMMON_ASCET_TOOLS = ["ascet_status", "ascet_capabilities", "ascet_recover", "ascet_scheduler_status"] as const;

const DEFAULT_ACTIVE_TOOLS = [
	...ON_DEMAND_DISCOVERY_TOOLS,
	...COMMON_ASCET_TOOLS,
	"ascet_diff",
	"ascet_edit",
	"ascet_verify",
	"configure_parameter_dependency_chain",
] as const;

export const profileTools: Record<AscetProfile, readonly string[]> = {
	base: DEFAULT_ACTIVE_TOOLS,
	"advanced-read": [...ON_DEMAND_DISCOVERY_TOOLS, "ascet_status", "ascet_capabilities"],
	reference: [...ON_DEMAND_DISCOVERY_TOOLS, "ascet_status", "ascet_capabilities"],
	diff: [...ON_DEMAND_DISCOVERY_TOOLS, "ascet_status", "ascet_capabilities", "ascet_diff"],
	verify: [
		...ON_DEMAND_DISCOVERY_TOOLS,
		"ascet_status",
		"ascet_capabilities",
		"ascet_verify",
		"ascet_scheduler_status",
	],
	"write-preflight": [
		...ON_DEMAND_DISCOVERY_TOOLS,
		"ascet_status",
		"ascet_capabilities",
		"ascet_edit",
		"ascet_verify",
		"ascet_scheduler_status",
		"configure_parameter_dependency_chain",
	],
	"batch-write": [
		...ON_DEMAND_DISCOVERY_TOOLS,
		"ascet_status",
		"ascet_capabilities",
		"ascet_edit",
		"ascet_verify",
		"ascet_scheduler_status",
		"configure_parameter_dependency_chain",
	],
	"component-edit": [
		...ON_DEMAND_DISCOVERY_TOOLS,
		"ascet_status",
		"ascet_capabilities",
		"ascet_edit",
		"ascet_verify",
		"configure_parameter_dependency_chain",
	],
	ops: [...ON_DEMAND_DISCOVERY_TOOLS, ...COMMON_ASCET_TOOLS],
};

export function isAscetProfile(value: string | undefined): value is AscetProfile {
	return value !== undefined && Object.hasOwn(profileTools, value);
}

export function isBatchWriteEnabled(env: Record<string, string | undefined> = process.env): boolean {
	return env.PI_ASCET_ENABLE_BATCH_WRITE === "1";
}

export function resolveProfileTools(
	profile: AscetProfile,
	env: Record<string, string | undefined> = process.env,
): string[] {
	const tools = [...profileTools[profile]];
	if (profile === "batch-write" && isBatchWriteEnabled(env)) {
		tools.push("ascet_batch_write");
	}
	return tools;
}
