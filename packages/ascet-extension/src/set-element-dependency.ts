import { Type } from "typebox";
import { type AscetCliJsonResult, runAscetCliJson } from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import {
	type AscetWriteControlParams,
	appendVerifyAndJson,
	createWriteSummary,
	formatWriteOperationResult,
	type RunAscetWriteOperationOptions,
	runApprovedAscetWriteOperation,
} from "./write-common.ts";
import type { AscetWriteApprovalContext } from "./write-policy.ts";

export interface AscetSetElementDependencyParams extends AscetWriteControlParams {
	targetPath: string;
	elementName: string;
	dependency: "dependent" | "independent";
	dependencyFormula?: string;
	dependencyMappings?: Record<string, string>;
	clearDependencyFormula?: boolean;
	targetKind?: "auto" | "component" | "folder" | "project";
	match?: "exact" | "all";
	dryRun?: boolean;
	backupDir?: string;
}

export type RunAscetSetElementDependencyOptions = RunAscetWriteOperationOptions;
export type AscetSetElementDependencyResult = AscetCliJsonResult;

export const ascetSetElementDependencyParameters = Type.Object({
	targetPath: Type.String({ description: "ASCET target component or folder path.", minLength: 1 }),
	elementName: Type.String({ description: "Element name whose dependency flag should be changed.", minLength: 1 }),
	dependency: Type.Union([Type.Literal("dependent"), Type.Literal("independent")]),
	dependencyFormula: Type.Optional(
		Type.String({
			description: "Dependency expression stored on the local dependent parameter, emitted as --formula.",
			minLength: 1,
		}),
	),
	dependencyMappings: Type.Optional(
		Type.Record(
			Type.String({ minLength: 1 }),
			Type.String({
				description: "Map a formula formal/reference name to an existing imported parameter name.",
				minLength: 1,
			}),
		),
	),
	clearDependencyFormula: Type.Optional(
		Type.Boolean({ description: "When true, explicitly clear the stored dependency formula." }),
	),
	targetKind: Type.Optional(
		Type.Union([Type.Literal("auto"), Type.Literal("component"), Type.Literal("folder"), Type.Literal("project")]),
	),
	match: Type.Optional(Type.Union([Type.Literal("exact"), Type.Literal("all")])),
	dryRun: Type.Optional(Type.Boolean({ description: "Plan the write without importing patched XML." })),
	backupDir: Type.Optional(Type.String({ description: "Directory for dependency write backups.", minLength: 1 })),
	verifyReadback: Type.Optional(Type.Boolean({ description: "Ask the ASCET CLI to verify readback after writing." })),
	executeWrite: Type.Optional(Type.Boolean({ description: "When true, PI still requires interactive confirmation." })),
});

export function buildSetElementDependencyArgs(params: AscetSetElementDependencyParams): string[] {
	const args = [
		"exec",
		"set_element_dependency",
		normalizeAscetPath(params.targetPath),
		params.elementName,
		params.dependency,
	];
	if (params.dependencyFormula) {
		args.push("--formula", params.dependencyFormula);
	}
	if (params.dependencyMappings) {
		for (const [formal, imported] of Object.entries(params.dependencyMappings)) {
			args.push("--mapping", `${formal}=${imported}`);
		}
	}
	if (params.clearDependencyFormula) {
		args.push("--clear-formula");
	}
	if (params.targetKind) {
		args.push("--target-kind", params.targetKind);
	}
	if (params.match) {
		args.push("--match", params.match);
	}
	if (params.dryRun) {
		args.push("--dry-run");
	}
	if (params.backupDir) {
		args.push("--backup-dir", params.backupDir);
	}
	return appendVerifyAndJson(args, params.verifyReadback);
}

export function createSetElementDependencySummary(params: AscetSetElementDependencyParams): string {
	return createWriteSummary("set_element_dependency", {
		targetPath: params.targetPath,
		elementName: params.elementName,
		dependency: params.dependency,
		dependencyFormula: params.dependencyFormula ?? "",
		dependencyMappings: params.dependencyMappings ?? {},
		clearDependencyFormula: params.clearDependencyFormula === true,
		targetKind: params.targetKind ?? "",
		match: params.match ?? "",
		dryRun: params.dryRun === true,
		backupDir: params.backupDir ?? "",
		verifyReadback: params.verifyReadback === true,
	});
}

export async function runAscetSetElementDependency(
	params: AscetSetElementDependencyParams,
	options: RunAscetSetElementDependencyOptions,
): Promise<AscetSetElementDependencyResult> {
	return runAscetCliJson(buildSetElementDependencyArgs(params), {
		...options,
		toolName: "ascet_write",
		commandId: "set_element_dependency",
		jobKind: "write",
	});
}

export async function runApprovedAscetSetElementDependency(
	params: AscetSetElementDependencyParams,
	options: RunAscetSetElementDependencyOptions,
	ctx: AscetWriteApprovalContext,
): Promise<AscetSetElementDependencyResult> {
	const normalized = {
		...params,
		verifyReadback: params.verifyReadback ?? (!params.dryRun && params.executeWrite === true),
	};
	return runApprovedAscetWriteOperation(
		"set_element_dependency",
		normalized,
		options,
		ctx,
		buildSetElementDependencyArgs,
		createSetElementDependencySummary(normalized),
		"Confirm ASCET dependency write",
	);
}

export function formatSetElementDependencyResult(result: AscetSetElementDependencyResult): string {
	return formatWriteOperationResult("set_element_dependency", result);
}
