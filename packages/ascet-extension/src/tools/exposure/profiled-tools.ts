import { allAscetTools } from "../registry.ts";
import type { AscetProfile } from "./profiles.ts";

type PromptedTool = {
	name: string;
	promptGuidelines?: readonly string[];
};
type AscetToolDefinition = (typeof allAscetTools)[number];

const profileGuidelines: Record<AscetProfile, Partial<Record<string, readonly string[]>>> = {
	base: {
		ascet_status: ["Use ascet_status first when ASCET runtime availability is unknown."],
		ascet_get: [
			"Use ascet_get.tree first, then expand a bounded target with elements, formulas, or reference actions.",
		],
		ascet_read: ["Use ascet_read only for precise deep reads of exact targets selected through ascet_get."],
	},
	"advanced-read": {
		ascet_read: [
			"Use ascet_read action=read_block_diagram for block diagram, BDE, wiring, connection, or signal-flow questions after ascet_get resolves componentPath.",
			'Example: ascet_read({action:"read_block_diagram",componentPath:"DEMO/PID",detailLevel:"summary"})',
		],
	},
	reference: {
		ascet_get: ["Use component_refs, elements, and import_binding after tree resolves the exact target."],
	},
	diff: {
		ascet_diff: ["Use ascet_diff for file, snapshot, method, element-spec, and formula comparisons."],
	},
	verify: {
		ascet_verify: ["Use ascet_verify after writes or when runtime readback evidence is required."],
	},
	"write-preflight": {
		ascet_edit: [
			"Use ascet_edit without executeWrite for preflight unless the user explicitly asks to apply a live write.",
			"After live writes, prefer verifyReadback=true and inspect the returned readback and observation invalidation.",
		],
	},
	"batch-write": {
		ascet_edit: [
			"Batch write remains hidden by default; use ascet_edit single-operation flow unless explicitly enabled.",
		],
	},
	"component-edit": {
		ascet_edit: ["Use component editable actions only when the user explicitly asks to change editability."],
	},
	ops: {
		ascet_recover: [
			"Use ascet_recover and ascet_scheduler_status for runtime, queue, lock, or recovery diagnostics.",
		],
	},
};

export function getProfileGuidelines(profile: AscetProfile): Partial<Record<string, readonly string[]>> {
	return profileGuidelines[profile] ?? {};
}

export function buildProfiledAscetTools(profile: AscetProfile, toolNames: readonly string[]): AscetToolDefinition[] {
	const extraGuidelines = getProfileGuidelines(profile);
	const activeNames = new Set(toolNames);
	return allAscetTools
		.filter((tool) => activeNames.has(tool.name))
		.map((tool) => {
			const promptedTool = tool as PromptedTool;
			return {
				...tool,
				promptGuidelines: [...(promptedTool.promptGuidelines ?? []), ...(extraGuidelines[tool.name] ?? [])],
			};
		}) as AscetToolDefinition[];
}
