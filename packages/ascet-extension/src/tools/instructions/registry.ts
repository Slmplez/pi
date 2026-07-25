import { compactExamplesForAction } from "../_shared/action-examples.ts";
import { listActionDescriptors } from "../actions/descriptors.ts";
import type { AscetActionInstruction, AscetInstructionQuery, AscetPromptAssemblyOptions } from "./types.ts";

function descriptorInstructions(): AscetActionInstruction[] {
	return listActionDescriptors()
		.filter((descriptor) => descriptor.prompt !== undefined)
		.map((descriptor) => ({
			id: descriptor.id,
			tool: descriptor.tool,
			action: descriptor.action,
			profiles: [...descriptor.profiles],
			summary: descriptor.prompt?.summary ?? "",
			rules: descriptor.prompt?.rules ? [...descriptor.prompt.rules] : [],
			fewShots: compactExamplesForAction(descriptor.tool, descriptor.action, { includeHidden: true }),
			tags: descriptor.prompt?.tags ? [...descriptor.prompt.tags] : undefined,
			hidden: descriptor.visibility !== "public" || descriptor.prompt?.hidden === true,
		}));
}

export const ascetActionInstructions: readonly AscetActionInstruction[] = descriptorInstructions();

const instructionById = new Map(ascetActionInstructions.map((instruction) => [instruction.id, instruction]));

function matchesInstruction(instruction: AscetActionInstruction, query: AscetInstructionQuery): boolean {
	if (!query.includeHidden && instruction.hidden) {
		return false;
	}
	if (query.tool && instruction.tool !== query.tool) {
		return false;
	}
	if (query.action && instruction.action !== query.action) {
		return false;
	}
	if (query.profile && !instruction.profiles.includes(query.profile)) {
		return false;
	}
	if (query.tags?.length) {
		const tags = new Set(instruction.tags ?? []);
		if (!query.tags.every((tag) => tags.has(tag))) {
			return false;
		}
	}
	return true;
}

export function getActionInstruction(
	id: string,
	options: { includeHidden?: boolean } = {},
): AscetActionInstruction | undefined {
	const instruction = instructionById.get(id);
	if (!instruction || (!options.includeHidden && instruction.hidden)) {
		return undefined;
	}
	return instruction;
}

export function findActionInstructions(query: AscetInstructionQuery = {}): AscetActionInstruction[] {
	return ascetActionInstructions.filter((instruction) => matchesInstruction(instruction, query));
}

export function actionInstructionIds(query: AscetInstructionQuery = {}): string[] {
	return findActionInstructions(query).map((instruction) => instruction.id);
}

function renderInstruction(instruction: AscetActionInstruction, includeExamples: boolean): string[] {
	const lines = [`${instruction.id}: ${instruction.summary}`, ...instruction.rules];
	if (includeExamples) {
		lines.push(...(instruction.fewShots ?? []));
	}
	return lines;
}

export function buildToolPromptGuidelines(options: AscetPromptAssemblyOptions): string[] {
	const actionSet = options.actions?.length ? new Set(options.actions) : undefined;
	const instructions = findActionInstructions({
		tool: options.tool,
		profile: options.profile,
		includeHidden: options.includeHidden,
	}).filter((instruction) => !actionSet || actionSet.has(instruction.action));

	return [
		...(options.extraGuidelines ?? []),
		...instructions.flatMap((instruction) => renderInstruction(instruction, options.includeExamples ?? true)),
	];
}
