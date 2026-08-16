import { allAscetTools } from "../registry.ts";
import type { AscetProfile } from "./profiles.ts";

type PromptedTool = {
	name: string;
	promptGuidelines?: readonly string[];
};
type AscetToolDefinition = (typeof allAscetTools)[number];
type ToolExecute = (...args: unknown[]) => unknown;

const profileGuidelines: Record<AscetProfile, Partial<Record<string, readonly string[]>>> = {
	base: {},

	"advanced-read": {
		ascet_read: [
			"Use ascet_read action=read_block_diagram for block diagram, BDE, wiring, connection, or signal-flow questions after componentPath is resolved exactly.",
			'Example: ascet_read({action:"read_block_diagram",componentPath:"DEMO/PID",detailLevel:"summary"})',
		],
	},
	reference: {
		ascet_get: [
			"Use ascet_search comp-ref or element-ref for live reference candidates, then validate the exact target with ascet_read.",
		],
	},
	diff: {
		ascet_diff: ["Use ascet_diff for file, snapshot, method, element-spec, and formula comparisons."],
	},
	"write-preflight": {
		ascet_edit: [
			"Executed ascet_edit mutations perform mandatory automatic action-specific readback verification. Inspect verification status and returned evidence. Do not issue a redundant read after passed.",
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function buildProfiledAscetTools(
	profile: AscetProfile,
	toolNames: readonly string[],
	env: Record<string, string | undefined> = process.env,
): AscetToolDefinition[] {
	const extraGuidelines = getProfileGuidelines(profile);
	const activeNames = new Set(toolNames);
	return allAscetTools
		.filter((tool) => activeNames.has(tool.name))
		.map((tool) => {
			const promptedTool = tool as PromptedTool;
			const execute = (tool as unknown as { execute?: ToolExecute }).execute;
			return {
				...tool,
				...(execute
					? {
							execute: (...args: unknown[]) => {
								const nextArgs = [...args];
								const toolContext = isRecord(nextArgs[4]) ? nextArgs[4] : {};
								nextArgs[4] = {
									...toolContext,
									actionActivationContext: {
										env,
										activeProfile: profile,
										activeTools: toolNames,
									},
								};
								return execute(...nextArgs);
							},
						}
					: {}),
				promptGuidelines: [...(promptedTool.promptGuidelines ?? []), ...(extraGuidelines[tool.name] ?? [])],
			};
		}) as AscetToolDefinition[];
}
