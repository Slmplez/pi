import { renderAscetToolCall, renderAscetToolResult } from "../rendering.ts";

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
		renderCall: renderAscetToolCall,
		renderResult: renderAscetToolResult,
	};
}
