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
		ascet_search: ["Use ascet_search to locate components, declarations, references, messages, and text hits."],
		ascet_read: ["Use ascet_read only for live reads of exact targets; resolve paths with search/explore first."],
	},
	"advanced-read": {
		ascet_read: [
			"Use ascet_read action=read_block_diagram for block diagram, BDE, wiring, connection, or signal-flow questions after resolving componentPath.",
			'Example: ascet_read({action:"read_block_diagram",componentPath:"DEMO/PID",detailLevel:"summary"})',
		],
	},
	reference: {
		ascet_search: [
			"Use references_to_component for component references and references_to_element for element references.",
			'Example: ascet_search({action:"references_to_component",query:"AEB_pDriverIBooster",match:"exact",limit:20})',
		],
	},
	diff: {
		ascet_diff: ["Use ascet_diff for file, snapshot, method, element-spec, and formula comparisons."],
	},
	verify: {
		ascet_verify: ["Use ascet_verify after writes or when runtime readback evidence is required."],
	},
	"write-preflight": {
		ascet_write: [
			"Use ascet_write without executeWrite for preflight unless the user explicitly asks to apply a live write.",
			"After live writes, prefer verifyReadback=true and inspect the returned readback/index impact.",
		],
	},
	"batch-write": {
		ascet_write: [
			"Batch write remains hidden by default; use ascet_write single-operation flow unless explicitly enabled.",
		],
	},
	"component-edit": {
		ascet_component_editable: [
			"Use component editable actions only when the user explicitly asks to change editability.",
		],
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
