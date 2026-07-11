import { renderAscetToolCall, renderAscetToolResult } from "../rendering.ts";

export interface AscetExtensionAPI {
	registerTool(tool: unknown): void;
	sendUserMessage(
		content: string,
		options?: {
			deliverAs?: "steer" | "followUp";
		},
	): void;
	registerCommand(
		name: string,
		options: {
			description?: string;
			handler: (
				args: string,
				ctx: {
					cwd: string;
					isIdle(): boolean;
					ui: { notify(message: string, level?: "info" | "warning" | "error"): void };
				},
			) => void;
		},
	): void;
}

export interface AscetToolContext {
	cwd: string;
	hasUI?: boolean;
	ui?: {
		confirm(title: string, message: string, opts?: { signal?: AbortSignal; timeout?: number }): Promise<boolean>;
	};
}

type AscetRenderableTool = {
	name: string;
	executionMode?: "sequential" | "parallel";
	renderCall?: typeof renderAscetToolCall;
	renderResult?: typeof renderAscetToolResult;
};

export function defineSequentialAscetTool<T extends AscetRenderableTool>(
	tool: T,
): Omit<T, "executionMode" | "renderCall" | "renderResult"> & {
	executionMode: "sequential";
	renderCall: typeof renderAscetToolCall;
	renderResult: typeof renderAscetToolResult;
} {
	return {
		...tool,
		executionMode: "sequential",
		renderCall: tool.renderCall ?? renderAscetToolCall,
		renderResult: tool.renderResult ?? renderAscetToolResult,
	};
}
