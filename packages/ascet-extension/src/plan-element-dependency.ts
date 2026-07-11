import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import type { AscetScheduler } from "./scheduler/scheduler.ts";

export interface AscetPlanElementDependencyParams {
	targetPath: string;
	elementName?: string;
	targetKind?: "auto" | "component" | "folder" | "project";
}

export interface RunAscetPlanElementDependencyOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
	scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
}

export type AscetPlanElementDependencyResult = AscetCliJsonResult;

export const ascetPlanElementDependencyParameters = Type.Object({
	targetPath: Type.String({ description: "ASCET target component, folder, or project path.", minLength: 1 }),
	elementName: Type.Optional(Type.String({ description: "Optional element name to filter dependency candidates." })),
	targetKind: Type.Optional(
		Type.Union([Type.Literal("auto"), Type.Literal("component"), Type.Literal("folder"), Type.Literal("project")]),
	),
});

export function buildPlanElementDependencyArgs(params: AscetPlanElementDependencyParams): string[] {
	if (typeof params.targetPath !== "string" || params.targetPath.length === 0) {
		throw new Error("targetPath is required for plan_element_dependency.");
	}
	const args = ["exec", "plan_element_dependency", normalizeAscetPath(params.targetPath)];
	if (params.elementName) {
		args.push(params.elementName);
	}
	if (params.targetKind) {
		args.push("--target-kind", params.targetKind);
	}
	args.push("--json");
	return args;
}

export async function runAscetPlanElementDependency(
	params: AscetPlanElementDependencyParams,
	options: RunAscetPlanElementDependencyOptions,
): Promise<AscetPlanElementDependencyResult> {
	return runAscetCliJson(buildPlanElementDependencyArgs(params), {
		...options,
		toolName: "ascet_read",
		commandId: "plan_element_dependency",
		jobKind: "read",
	});
}

export function formatPlanElementDependencyResult(result: AscetPlanElementDependencyResult): string {
	return formatAscetCliJsonResult("plan_element_dependency", result);
}
