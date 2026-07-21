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

export type AscetReadElementDependencyTargetKind = "auto" | "component" | "folder" | "project";

export interface AscetReadElementDependencyParams {
	targetPath?: string;
	componentPath?: string;
	elementName: string;
	targetKind?: AscetReadElementDependencyTargetKind;
}

export interface RunAscetReadElementDependencyOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
	scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
}

export type AscetReadElementDependencyResult = AscetCliJsonResult;

export const ascetReadElementDependencyParameters = Type.Object({
	targetPath: Type.Optional(
		Type.String({
			description: "ASCET component, folder, or project path containing the element to inspect.",
			minLength: 1,
		}),
	),
	componentPath: Type.Optional(
		Type.String({
			description: "Alias for targetPath when inspecting one component.",
			minLength: 1,
		}),
	),
	elementName: Type.String({ description: "Element name whose dependency state should be read.", minLength: 1 }),
	targetKind: Type.Optional(
		Type.Union([Type.Literal("auto"), Type.Literal("component"), Type.Literal("folder"), Type.Literal("project")]),
	),
});

export function normalizeReadElementDependencyParams(
	params: AscetReadElementDependencyParams,
): AscetReadElementDependencyParams & { targetPath: string } {
	const targetPath = params.targetPath ?? params.componentPath;
	if (!targetPath) {
		throw new Error("read_element_dependency requires targetPath or componentPath.");
	}
	return { ...params, targetPath };
}

export function buildReadElementDependencyArgs(params: AscetReadElementDependencyParams): string[] {
	const normalized = normalizeReadElementDependencyParams(params);
	const args = ["exec", "read_element_dependency", normalizeAscetPath(normalized.targetPath), normalized.elementName];
	if (normalized.targetKind) {
		args.push("--target-kind", normalized.targetKind);
	}
	args.push("--json");
	return args;
}

export async function runAscetReadElementDependency(
	params: AscetReadElementDependencyParams,
	options: RunAscetReadElementDependencyOptions,
): Promise<AscetReadElementDependencyResult> {
	return runAscetCliJson(buildReadElementDependencyArgs(params), {
		...options,
		toolName: "ascet_read",
		commandId: "read_element_dependency",
		jobKind: "read",
	});
}

export function formatReadElementDependencyResult(result: AscetReadElementDependencyResult): string {
	return formatAscetCliJsonResult("read_element_dependency", result);
}
