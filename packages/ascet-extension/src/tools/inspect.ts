import { Type } from "typebox";
import type { AscetCliExecutionResult, AscetCliJsonResult, AscetCliRequest } from "../cli.ts";
import { formatReadBlockDiagramResult, runAscetReadBlockDiagram } from "../read-block-diagram.ts";
import { formatReadComponentChildrenResult, runAscetReadComponentChildren } from "../read-component-children.ts";
import { formatReadComponentSummaryResult, runAscetReadComponentSummary } from "../read-component-summary.ts";
import { formatReadImplementationResult, runAscetReadImplementation } from "../read-implementation.ts";
import { formatReadProjectFormulasResult, runAscetReadProjectFormulas } from "../read-project-formulas.ts";
import { formatReadStateMachineFlowResult, runAscetReadStateMachineFlow } from "../read-state-machine-flow.ts";

export type AscetInspectParams =
	| { action: "summary"; componentPath: string }
	| { action: "children"; componentPath: string; group?: "methods" | "elements" | "variables" | "diagrams" | "all" }
	| { action: "project_formulas"; projectPath: string }
	| { action: "block_diagram"; componentPath: string; diagramName: string }
	| {
			action: "implementation";
			componentPath: string;
			mode?: "list" | "default" | "class-impl" | "impl";
			implementationName?: string;
	  }
	| { action: "state_machine_flow"; componentPath: string; traceDepth?: number };

export interface RunAscetInspectOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export const ascetInspectParameters = Type.Union([
	Type.Object({ action: Type.Literal("summary"), componentPath: Type.String({ minLength: 1 }) }),
	Type.Object({
		action: Type.Literal("children"),
		componentPath: Type.String({ minLength: 1 }),
		group: Type.Optional(
			Type.Union([
				Type.Literal("methods"),
				Type.Literal("elements"),
				Type.Literal("variables"),
				Type.Literal("diagrams"),
				Type.Literal("all"),
			]),
		),
	}),
	Type.Object({ action: Type.Literal("project_formulas"), projectPath: Type.String({ minLength: 1 }) }),
	Type.Object({
		action: Type.Literal("block_diagram"),
		componentPath: Type.String({ minLength: 1 }),
		diagramName: Type.String({ minLength: 1 }),
	}),
	Type.Object({
		action: Type.Literal("implementation"),
		componentPath: Type.String({ minLength: 1 }),
		mode: Type.Optional(
			Type.Union([Type.Literal("list"), Type.Literal("default"), Type.Literal("class-impl"), Type.Literal("impl")]),
		),
		implementationName: Type.Optional(Type.String()),
	}),
	Type.Object({
		action: Type.Literal("state_machine_flow"),
		componentPath: Type.String({ minLength: 1 }),
		traceDepth: Type.Optional(Type.Number({ minimum: 0 })),
	}),
]);

export async function runAscetInspect(
	params: AscetInspectParams,
	options: RunAscetInspectOptions,
): Promise<AscetCliJsonResult> {
	switch (params.action) {
		case "summary":
			return runAscetReadComponentSummary(params, options);
		case "children":
			return runAscetReadComponentChildren(params, options);
		case "project_formulas":
			return runAscetReadProjectFormulas(params, options);
		case "block_diagram":
			return runAscetReadBlockDiagram(params, options);
		case "implementation":
			return runAscetReadImplementation(params, options);
		case "state_machine_flow":
			return runAscetReadStateMachineFlow(params, options);
	}
}

export function formatAscetInspectResult(params: AscetInspectParams, result: AscetCliJsonResult): string {
	switch (params.action) {
		case "summary":
			return formatReadComponentSummaryResult(result);
		case "children":
			return formatReadComponentChildrenResult(result);
		case "project_formulas":
			return formatReadProjectFormulasResult(result);
		case "block_diagram":
			return formatReadBlockDiagramResult(result);
		case "implementation":
			return formatReadImplementationResult(result);
		case "state_machine_flow":
			return formatReadStateMachineFlowResult(result);
	}
}
