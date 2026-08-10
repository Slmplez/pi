import { Type } from "typebox";
import { type AscetCliJsonResult, runAscetCliJson } from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import type { AscetEditApprovalContext } from "./edit/approval.ts";
import {
	type AscetEditControlParams,
	appendVerifyAndJson,
	createAscetEditSummary,
	formatAscetEditOperationResult,
	type RunAscetEditOperationOptions,
	runApprovedAscetEditOperation,
} from "./edit/common.ts";

export type AscetDependencyTargetKind = "parameter" | "constant" | "systemConstant";
export type AscetDependencyMappingTarget = { kind: AscetDependencyTargetKind; name: string };
export type AscetDependencyRestorationValue = string | number | boolean;

export interface AscetSetElementDependencyParams extends AscetEditControlParams {
	targetPath: string;
	elementName: string;
	dependency: "dependent" | "independent";
	dependencyFormula?: string;
	dependencyFormals?: string[];
	bindingPolicy?: "explicit" | "autoExactName";
	dependencyMappings?: Record<string, string | AscetDependencyMappingTarget>;
	variantMappings?: Record<string, Record<string, string | AscetDependencyMappingTarget>>;
	variantPolicy?: "default" | "selected" | "all";
	variants?: string[];
	valueRestoration?: {
		policy: "fromSnapshot" | "explicit" | "ascetDefault";
		valuesByVariant?: Record<string, AscetDependencyRestorationValue>;
	};
	clearDependencyFormula?: boolean;
	targetKind?: "auto" | "component" | "folder";
	match?: "exact" | "all";
	dryRun?: boolean;
	backupDir?: string;
	overlaySpecFiles?: string[];
}

export type RunAscetSetElementDependencyOptions = RunAscetEditOperationOptions;
export type AscetSetElementDependencyResult = AscetCliJsonResult;

const dependencyTargetSchema = Type.Object(
	{
		kind: Type.Union([Type.Literal("parameter"), Type.Literal("constant"), Type.Literal("systemConstant")]),
		name: Type.String({ minLength: 1 }),
	},
	{ additionalProperties: false },
);

export const ascetSetElementDependencyParameters = Type.Object(
	{
		targetPath: Type.String({ description: "ASCET target component or folder path.", minLength: 1 }),
		elementName: Type.String({
			description: "Local Parameter whose dependency state should be changed.",
			minLength: 1,
		}),
		dependency: Type.Union([Type.Literal("dependent"), Type.Literal("independent")]),
		dependencyFormula: Type.Optional(
			Type.String({
				description: "Dependency expression. Every formal must have an explicit dependencyMappings entry.",
				minLength: 1,
			}),
		),
		dependencyFormals: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1, uniqueItems: true })),
		bindingPolicy: Type.Optional(Type.Union([Type.Literal("explicit"), Type.Literal("autoExactName")])),
		dependencyMappings: Type.Optional(
			Type.Record(
				Type.String({ minLength: 1 }),
				Type.Union([
					dependencyTargetSchema,
					Type.String({
						description:
							"Legacy target name; prefer {kind,name} so Parameter/Constant/System Constant is explicit.",
						minLength: 1,
					}),
				]),
			),
		),
		variantMappings: Type.Optional(
			Type.Record(
				Type.String({ minLength: 1 }),
				Type.Record(
					Type.String({ minLength: 1 }),
					Type.Union([dependencyTargetSchema, Type.String({ minLength: 1 })]),
				),
			),
		),
		variantPolicy: Type.Optional(
			Type.Union([Type.Literal("default"), Type.Literal("selected"), Type.Literal("all")], {
				description:
					"Required for every data AMD write. default changes only the default DataVariant; selected requires variants; all is an explicit bulk change.",
			}),
		),
		variants: Type.Optional(
			Type.Array(Type.String({ minLength: 1 }), {
				description: "Exact DataVariant names; only valid with variantPolicy=selected.",
				minItems: 1,
				uniqueItems: true,
			}),
		),
		valueRestoration: Type.Optional(
			Type.Object(
				{
					policy: Type.Union([
						Type.Literal("fromSnapshot"),
						Type.Literal("explicit"),
						Type.Literal("ascetDefault"),
					]),
					valuesByVariant: Type.Optional(
						Type.Record(
							Type.String({ minLength: 1 }),
							Type.Union([Type.String(), Type.Number(), Type.Boolean()]),
						),
					),
				},
				{ additionalProperties: false },
			),
		),
		clearDependencyFormula: Type.Optional(
			Type.Boolean({
				description:
					"Independent conversion always clears the formula; omit this compatibility field when possible.",
			}),
		),
		targetKind: Type.Optional(Type.Union([Type.Literal("auto"), Type.Literal("component"), Type.Literal("folder")])),
		match: Type.Optional(Type.Union([Type.Literal("exact"), Type.Literal("all")])),
		dryRun: Type.Optional(Type.Boolean({ description: "Plan the write without importing patched XML." })),
		backupDir: Type.Optional(Type.String({ description: "Directory for dependency write backups.", minLength: 1 })),
		executeWrite: Type.Optional(
			Type.Boolean({ description: "When true, PI still requires interactive confirmation." }),
		),
	},
	{ additionalProperties: false },
);

function normalizeMappingTarget(target: string | AscetDependencyMappingTarget): AscetDependencyMappingTarget | string {
	return typeof target === "string" ? target : target;
}

export function resolveSetElementDependencyMappings(
	params: Pick<AscetSetElementDependencyParams, "bindingPolicy" | "dependencyFormals" | "dependencyMappings">,
): Record<string, string | AscetDependencyMappingTarget> | undefined {
	if (params.bindingPolicy !== "autoExactName" || !params.dependencyFormals?.length) {
		return params.dependencyMappings;
	}
	if (params.dependencyMappings && Object.keys(params.dependencyMappings).length > 0) {
		return params.dependencyMappings;
	}
	return Object.fromEntries(params.dependencyFormals.map((formal) => [formal, formal]));
}

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
	const dependencyMappings = resolveSetElementDependencyMappings(params);
	if (dependencyMappings) {
		for (const [formal, rawTarget] of Object.entries(dependencyMappings)) {
			const target = normalizeMappingTarget(rawTarget);
			const encoded = typeof target === "string" ? target : `${target.kind}:${target.name}`;
			args.push("--mapping", `${formal}=${encoded}`);
		}
	}
	if (params.variantMappings) {
		for (const [variant, mappings] of Object.entries(params.variantMappings)) {
			for (const [formal, rawTarget] of Object.entries(mappings)) {
				const encoded = typeof rawTarget === "string" ? rawTarget : `${rawTarget.kind}:${rawTarget.name}`;
				args.push("--variant-mapping", `${variant}:${formal}=${encoded}`);
			}
		}
	}
	if (params.variantPolicy) {
		args.push("--variant-policy", params.variantPolicy);
	}
	for (const variant of params.variants ?? []) {
		args.push("--variant", variant);
	}
	if (params.dependency === "independent" || params.clearDependencyFormula) {
		args.push("--clear-formula");
	}
	if (params.valueRestoration) {
		args.push("--restoration-policy", params.valueRestoration.policy);
		for (const [variant, value] of Object.entries(params.valueRestoration.valuesByVariant ?? {})) {
			args.push("--restore-value", `${variant}=${String(value)}`);
		}
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
	for (const overlaySpecFile of params.overlaySpecFiles ?? []) {
		args.push("--overlay-spec", overlaySpecFile);
	}
	if (params.backupDir) {
		args.push("--backup-dir", params.backupDir);
	}
	return appendVerifyAndJson(args, params.verifyReadback);
}

export function createSetElementDependencySummary(params: AscetSetElementDependencyParams): string {
	return createAscetEditSummary("set_element_dependency", {
		targetPath: params.targetPath,
		elementName: params.elementName,
		dependency: params.dependency,
		dependencyFormula: params.dependencyFormula ?? "",
		dependencyFormals: JSON.stringify(params.dependencyFormals ?? []),
		bindingPolicy: params.bindingPolicy ?? "explicit",
		dependencyMappings: JSON.stringify(resolveSetElementDependencyMappings(params) ?? {}),
		variantMappings: JSON.stringify(params.variantMappings ?? {}),
		variantPolicy: params.variantPolicy ?? "",
		variants: JSON.stringify(params.variants ?? []),
		valueRestoration: JSON.stringify(params.valueRestoration ?? {}),
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
		toolName: "ascet_edit",
		commandId: "set_element_dependency",
		jobKind: "write",
	});
}

export async function runApprovedAscetSetElementDependency(
	params: AscetSetElementDependencyParams,
	options: RunAscetSetElementDependencyOptions,
	ctx: AscetEditApprovalContext,
): Promise<AscetSetElementDependencyResult> {
	const normalized = {
		...params,
		verifyReadback: params.verifyReadback ?? (!params.dryRun && params.executeWrite === true),
	};
	return runApprovedAscetEditOperation(
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
	return formatAscetEditOperationResult("set_element_dependency", result);
}
