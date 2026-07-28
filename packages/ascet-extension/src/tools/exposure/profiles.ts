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

const DEFAULT_ACTIVE_TOOLS = [
	"ascet_status",
	"ascet_capabilities",
	"ascet_index",
	"ascet_recover",
	"ascet_scheduler_status",
	"ascet_explore",
	"ascet_search",
	"ascet_read",
	"ascet_diff",
	"ascet_edit",
	"ascet_verify",
] as const;

export const profileTools: Record<AscetProfile, readonly string[]> = {
	base: DEFAULT_ACTIVE_TOOLS,
	"advanced-read": ["ascet_status", "ascet_capabilities", "ascet_index", "ascet_explore", "ascet_search", "ascet_read"],
	reference: ["ascet_status", "ascet_capabilities", "ascet_index", "ascet_explore", "ascet_search", "ascet_read"],
	diff: ["ascet_status", "ascet_capabilities", "ascet_index", "ascet_explore", "ascet_search", "ascet_read", "ascet_diff"],
	verify: [
		"ascet_status",
		"ascet_capabilities",
		"ascet_index",
		"ascet_explore",
		"ascet_search",
		"ascet_read",
		"ascet_verify",
		"ascet_scheduler_status",
	],
	"write-preflight": [
		"ascet_status",
		"ascet_capabilities",
		"ascet_index",
		"ascet_explore",
		"ascet_search",
		"ascet_read",
		"ascet_edit",
		"ascet_verify",
		"ascet_scheduler_status",
	],
	"batch-write": [
		"ascet_status",
		"ascet_capabilities",
		"ascet_index",
		"ascet_explore",
		"ascet_search",
		"ascet_read",
		"ascet_edit",
		"ascet_verify",
		"ascet_scheduler_status",
	],
	"component-edit": [
		"ascet_status",
		"ascet_capabilities",
		"ascet_index",
		"ascet_explore",
		"ascet_search",
		"ascet_read",
		"ascet_edit",
		"ascet_verify",
	],
	ops: ["ascet_status", "ascet_capabilities", "ascet_index", "ascet_recover", "ascet_scheduler_status"],
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
