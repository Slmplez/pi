import { Type } from "typebox";
import type { AscetCliExecutionResult, AscetCliJsonResult, AscetCliRequest } from "../cli.ts";
import { formatDiffComponentSnapshotResult, runAscetDiffComponentSnapshot } from "../diff-component-snapshot.ts";
import { formatDiffElementSpecResult, runAscetDiffElementSpec } from "../diff-element-spec.ts";
import { formatDiffMethodCodeResult, runAscetDiffMethodCode } from "../diff-method-code.ts";
import { formatDiffProjectFormulasResult, runAscetDiffProjectFormulas } from "../diff-project-formulas.ts";
import { formatDiffStateMachineDomainResult, runAscetDiffStateMachineDomain } from "../diff-state-machine-domain.ts";

export type AscetCompareParams =
	| { action: "component_snapshot"; leftComponentPath: string; rightComponentPath: string; changesOnly?: boolean }
	| {
			action: "method";
			leftComponentPath: string;
			rightComponentPath: string;
			methodName: string;
			changesOnly?: boolean;
	  }
	| { action: "element_spec"; componentPath: string; specFile: string; changesOnly?: boolean }
	| { action: "project_formulas"; leftProjectPath: string; rightProjectPath: string; changesOnly?: boolean }
	| {
			action: "state_machine_domain";
			leftStateMachinePath: string;
			rightStateMachinePath: string;
			changesOnly?: boolean;
	  };

export interface RunAscetCompareOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export const ascetCompareParameters = Type.Union([
	Type.Object({
		action: Type.Literal("component_snapshot"),
		leftComponentPath: Type.String({ minLength: 1 }),
		rightComponentPath: Type.String({ minLength: 1 }),
		changesOnly: Type.Optional(Type.Boolean()),
	}),
	Type.Object({
		action: Type.Literal("method"),
		leftComponentPath: Type.String({ minLength: 1 }),
		rightComponentPath: Type.String({ minLength: 1 }),
		methodName: Type.String({ minLength: 1 }),
		changesOnly: Type.Optional(Type.Boolean()),
	}),
	Type.Object({
		action: Type.Literal("element_spec"),
		componentPath: Type.String({ minLength: 1 }),
		specFile: Type.String({ minLength: 1 }),
		changesOnly: Type.Optional(Type.Boolean()),
	}),
	Type.Object({
		action: Type.Literal("project_formulas"),
		leftProjectPath: Type.String({ minLength: 1 }),
		rightProjectPath: Type.String({ minLength: 1 }),
		changesOnly: Type.Optional(Type.Boolean()),
	}),
	Type.Object({
		action: Type.Literal("state_machine_domain"),
		leftStateMachinePath: Type.String({ minLength: 1 }),
		rightStateMachinePath: Type.String({ minLength: 1 }),
		changesOnly: Type.Optional(Type.Boolean()),
	}),
]);

export async function runAscetCompare(
	params: AscetCompareParams,
	options: RunAscetCompareOptions,
): Promise<AscetCliJsonResult> {
	switch (params.action) {
		case "component_snapshot":
			return runAscetDiffComponentSnapshot(params, options);
		case "method":
			return runAscetDiffMethodCode(params, options);
		case "element_spec":
			return runAscetDiffElementSpec(params, options);
		case "project_formulas":
			return runAscetDiffProjectFormulas(params, options);
		case "state_machine_domain":
			return runAscetDiffStateMachineDomain(params, options);
	}
}

export function formatAscetCompareResult(params: AscetCompareParams, result: AscetCliJsonResult): string {
	switch (params.action) {
		case "component_snapshot":
			return formatDiffComponentSnapshotResult(result);
		case "method":
			return formatDiffMethodCodeResult(result);
		case "element_spec":
			return formatDiffElementSpecResult(result);
		case "project_formulas":
			return formatDiffProjectFormulasResult(result);
		case "state_machine_domain":
			return formatDiffStateMachineDomainResult(result);
	}
}
