import { type AscetActionDescriptor, type AscetActionFewShot, listActionDescriptors } from "../actions/descriptors.ts";

export interface AscetActionExample {
	tool: string;
	action: string;
	variant?: string;
	intent: string;
	args: Record<string, unknown>;
	call: string;
	hidden?: boolean;
}

export interface AscetActionExampleOptions {
	includeHidden?: boolean;
}

function renderValue(value: unknown): string {
	if (typeof value === "string") {
		return JSON.stringify(value);
	}
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	if (Array.isArray(value)) {
		return `[${value.map(renderValue).join(",")}]`;
	}
	if (value && typeof value === "object") {
		return renderArgs(value as Record<string, unknown>);
	}
	return "null";
}

function renderArgs(args: Record<string, unknown>): string {
	return `{${Object.entries(args)
		.filter(([, value]) => value !== undefined)
		.map(([key, value]) => `${key}:${renderValue(value)}`)
		.join(",")}}`;
}

function renderToolCall(tool: string, args: Record<string, unknown>): string {
	return `${tool}(${renderArgs(args)})`;
}

function isHiddenDescriptor(descriptor: AscetActionDescriptor): boolean {
	return descriptor.visibility !== "public" || descriptor.prompt?.hidden === true;
}

function shouldIncludeDescriptor(descriptor: AscetActionDescriptor, options: AscetActionExampleOptions): boolean {
	return options.includeHidden === true || !isHiddenDescriptor(descriptor);
}

function toActionExample(descriptor: AscetActionDescriptor, fewShot: AscetActionFewShot): AscetActionExample {
	const hidden = isHiddenDescriptor(descriptor) ? true : undefined;
	return {
		tool: descriptor.tool,
		action: descriptor.action,
		variant: fewShot.variant,
		intent: fewShot.intent,
		args: fewShot.args,
		call: renderToolCall(descriptor.tool, fewShot.args),
		hidden,
	};
}

function formatExample(example: AscetActionExample): string {
	const key = example.variant ? `${example.action}.${example.variant}` : example.action;
	const guideline = `${key}: ${example.call}`;
	return guideline.length <= 180 ? guideline : example.call;
}

export function examplesForDescriptor(descriptor: AscetActionDescriptor): AscetActionExample[] {
	return (descriptor.prompt?.fewShots ?? []).map((fewShot) => toActionExample(descriptor, fewShot));
}

export function catalogActionExamples(options: AscetActionExampleOptions = {}): AscetActionExample[] {
	return listActionDescriptors()
		.filter((descriptor) => shouldIncludeDescriptor(descriptor, options))
		.flatMap((descriptor) => examplesForDescriptor(descriptor));
}

export const ascetActionExamples = catalogActionExamples({ includeHidden: true });

export function compactExamplesForTool(tool: string, options: AscetActionExampleOptions = {}): string[] {
	return catalogActionExamples(options)
		.filter((example) => example.tool === tool)
		.map(formatExample);
}

export function compactExamplesForAction(
	tool: string | undefined,
	action: string | undefined,
	options: AscetActionExampleOptions = {},
): string[] {
	if (!tool || !action) {
		return [];
	}
	return catalogActionExamples(options)
		.filter((example) => example.tool === tool && example.action === action)
		.map(formatExample);
}
