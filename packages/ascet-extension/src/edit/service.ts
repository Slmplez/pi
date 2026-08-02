import { readFileSync } from "node:fs";
import { Type } from "typebox";
import { runApprovedAscetApplyElementSpec } from "../apply-element-spec.ts";
import { runApprovedAscetApplyProjectFormula } from "../apply-project-formula.ts";
import type { AscetCliJsonResult } from "../cli.ts";
import { type AscetToolOutcome, createPreflightOutcome } from "../core/results.ts";
import { withInlineCodeFile } from "../core/temp-files.ts";
import { runApprovedAscetCreateComponent } from "../create-component.ts";
import { runApprovedAscetCreateFolder } from "../create-folder.ts";
import { runApprovedAscetCreateMethod } from "../create-method.ts";
import { runApprovedAscetDeleteComponent } from "../delete-component.ts";
import { runApprovedAscetDeleteFolder } from "../delete-folder.ts";
import { runApprovedAscetDeleteMethod } from "../delete-method.ts";
import { type AscetElementIndexWritebackResult, refreshElementsFromLiveCatalog } from "../element-index-writeback.ts";
import {
	type AscetCreateMethodComponentKind,
	getDefaultCreateMethodKind,
	validateCreateMethodKindCompatibility,
} from "../method-kind-compatibility.ts";
import { invalidateAscetSearchIndexPartitions } from "../search-index.ts";
import { runApprovedAscetSetElementDependency } from "../set-element-dependency.ts";
import { runApprovedAscetSetEnumerators } from "../set-enumerators.ts";
import { runApprovedAscetSetMethodCode } from "../set-method-code.ts";
import { runApprovedAscetSetMethodSignature } from "../set-method-signature.ts";
import { runApprovedAscetSetModuleCode } from "../set-module-code.ts";
import {
	ASCET_SET_STATE_MACHINE_CODE_OPERATIONS,
	runApprovedAscetSetStateMachineCode,
} from "../set-state-machine-code.ts";
import { compactObject, toToolFailurePayload, unwrapToolSuccessPayload } from "../tool-response-contract.ts";
import { openAiObjectUnionSchema } from "../tools/_shared/openai-schema.ts";
import { type AscetEditApprovalContext, isAscetEditApprovalBlockedCode } from "./approval.ts";
import type { RunAscetEditOperationOptions } from "./common.ts";
import { type AscetEditImpact, applyAscetEditImpactToSearchIndex, createAscetEditImpact } from "./common.ts";
import { type AscetEditActionId, getAscetEditAction } from "./contract.ts";
import {
	type AscetEditabilityParams,
	formatAscetEditabilityResult,
	runApprovedAscetEditability,
} from "./editability.ts";

type CodeSource = { code?: string; codeFile?: string };
const VALID_STATE_MACHINE_OPERATIONS = new Set<string>(ASCET_SET_STATE_MACHINE_CODE_OPERATIONS);
const VALID_STATE_MACHINE_OPERATIONS_TEXT = ASCET_SET_STATE_MACHINE_CODE_OPERATIONS.join(", ");

export type AscetMutationParams =
	| { action: "create_folder"; folderPath: string; verifyReadback?: boolean; executeWrite?: boolean }
	| {
			action: "create_component";
			componentPath: string;
			kind: "class" | "module" | "statemachine" | "enumeration";
			language?: "ESDL" | "BDE" | "C";
			ifExists?: "fail" | "return-existing";
			verifyReadback?: boolean;
			rollbackOnFailure?: boolean;
			executeWrite?: boolean;
	  }
	| {
			action: "create_method";
			componentPath: string;
			componentKind?: AscetCreateMethodComponentKind;
			methodName: string;
			methodKind?: "abstract" | "process" | "action" | "condition" | "trigger";
			ifExists?: "fail" | "return-existing";
			verifyReadback?: boolean;
			executeWrite?: boolean;
	  }
	| {
			action: "set_method_signature";
			componentPath: string;
			methodName: string;
			returnType?: "cont" | "sdisc" | "udisc" | "log";
			ifReturnExists?: "fail" | "keep" | "replace";
			arguments?: Array<{
				name: string;
				type: "cont" | "sdisc" | "udisc" | "log";
				ifExists?: "fail" | "keep" | "replace";
			}>;
			verifyReadback?: boolean;
			executeWrite?: boolean;
	  }
	| {
			action: "delete_component";
			componentPath: string;
			ifMissing?: "fail" | "ignore";
			verifyReadback?: boolean;
			executeWrite?: boolean;
	  }
	| {
			action: "delete_method";
			componentPath: string;
			methodName: string;
			ifMissing?: "fail" | "ignore";
			verifyReadback?: boolean;
			executeWrite?: boolean;
	  }
	| {
			action: "delete_folder";
			folderPath: string;
			ifMissing?: "fail" | "ignore";
			verifyReadback?: boolean;
			executeWrite?: boolean;
	  }
	| ({
			action: "set_method_code";
			componentPath: string;
			methodName: string;
			verifyReadback?: boolean;
			executeWrite?: boolean;
	  } & CodeSource)
	| ({
			action: "set_module_code";
			modulePath: string;
			operation?: "set-method" | "set-header" | "set-external-c-code";
			section?: "set-method" | "set-header" | "set-external-c-code";
			methodName?: string;
			verifyReadback?: boolean;
			executeWrite?: boolean;
	  } & CodeSource)
	| ({
			action: "set_state_machine_code";
			stateMachinePath: string;
			operation:
				| "set-method"
				| "set-state-entry-esdl"
				| "set-state-exit-esdl"
				| "set-state-static-esdl"
				| "bind-state-entry-method"
				| "bind-state-exit-method"
				| "bind-state-static-method"
				| "set-transition-condition-esdl"
				| "set-transition-action-esdl"
				| "bind-transition-condition-method"
				| "bind-transition-action-method"
				| "set-start-state";
			stateName?: string;
			sourceState?: string;
			targetState?: string;
			priority?: number;
			methodName?: string;
			verifyReadback?: boolean;
			executeWrite?: boolean;
	  } & CodeSource)
	| {
			action: "set_enumerators";
			componentPath: string;
			enumerators: string[];
			verifyReadback?: boolean;
			executeWrite?: boolean;
	  }
	| {
			action: "apply_element_spec";
			componentPath: string;
			specFile: string;
			projectPath?: string;
			mode?: "restore";
			deleteMissing?: boolean;
			recreateIncompatible?: boolean;
			verifyReadback?: boolean;
			executeWrite?: boolean;
	  }
	| {
			action: "apply_project_formula";
			projectPath: string;
			specFile: string;
			mode?: "restore";
			deleteMissing?: boolean;
			verifyReadback?: boolean;
			executeWrite?: boolean;
	  }
	| {
			action: "set_element_dependency";
			targetPath?: string;
			componentPath?: string;
			elementName: string;
			dependency: "dependent" | "independent";
			dependencyFormula?: string;
			dependencyMappings?: Record<string, string>;
			clearDependencyFormula?: boolean;
			targetKind?: "auto" | "component" | "folder" | "project";
			match?: "exact" | "all";
			dryRun?: boolean;
			backupDir?: string;
			verifyReadback?: boolean;
			executeWrite?: boolean;
	  };

export type AscetEditParams = AscetMutationParams | AscetEditabilityParams;

export type AscetEditInvocation =
	| { kind: "mutation"; action: AscetMutationParams["action"] }
	| { kind: "editability"; mode: AscetEditabilityParams["mode"] };

export interface AscetEditResult {
	content: Array<{ type: "text"; text: string }>;
	details: {
		outcome: AscetToolOutcome;
		raw?: AscetCliJsonResult;
		impact?: AscetEditImpact;
		error?: { code: string; message: string };
	};
}

type AscetEditIndexUpdate = AscetEditImpact | AscetElementIndexWritebackResult;

const codeSourceSchema = {
	code: Type.Optional(Type.String()),
	codeFile: Type.Optional(Type.String()),
};
const primitiveSignatureTypeSchema = Type.Union([
	Type.Literal("cont"),
	Type.Literal("sdisc"),
	Type.Literal("udisc"),
	Type.Literal("log"),
]);
const methodSignatureArgumentSchema = Type.Object({
	name: Type.String({ minLength: 1 }),
	type: primitiveSignatureTypeSchema,
	ifExists: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("keep"), Type.Literal("replace")])),
});
const writeControlSchema = {
	verifyReadback: Type.Optional(Type.Boolean()),
	executeWrite: Type.Optional(Type.Boolean()),
};
const componentKindSchema = Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")]);
const writeComponentKindSchema = Type.Union([
	Type.Literal("class"),
	Type.Literal("module"),
	Type.Literal("statemachine"),
	Type.Literal("enumeration"),
]);
const methodKindSchema = Type.Union([
	Type.Literal("abstract"),
	Type.Literal("process"),
	Type.Literal("action"),
	Type.Literal("condition"),
	Type.Literal("trigger"),
]);
const stateMachineOperationSchema = Type.Union([
	Type.Literal("set-method"),
	Type.Literal("set-state-entry-esdl"),
	Type.Literal("set-state-exit-esdl"),
	Type.Literal("set-state-static-esdl"),
	Type.Literal("bind-state-entry-method"),
	Type.Literal("bind-state-exit-method"),
	Type.Literal("bind-state-static-method"),
	Type.Literal("set-transition-condition-esdl"),
	Type.Literal("set-transition-action-esdl"),
	Type.Literal("bind-transition-condition-method"),
	Type.Literal("bind-transition-action-method"),
	Type.Literal("set-start-state"),
]);
const moduleCodeOperationSchema = Type.Union([
	Type.Literal("set-method"),
	Type.Literal("set-header"),
	Type.Literal("set-external-c-code"),
]);

export const ascetMutationActionSchemas = [
	Type.Object({
		action: Type.Literal("create_folder"),
		folderPath: Type.String({ minLength: 1 }),
		...writeControlSchema,
	}),
	Type.Object({
		action: Type.Literal("create_component"),
		componentPath: Type.String({ minLength: 1 }),
		kind: writeComponentKindSchema,
		language: Type.Optional(Type.Union([Type.Literal("ESDL"), Type.Literal("BDE"), Type.Literal("C")])),
		ifExists: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("return-existing")])),
		rollbackOnFailure: Type.Optional(Type.Boolean()),
		...writeControlSchema,
	}),
	Type.Object({
		action: Type.Literal("create_method"),
		componentPath: Type.String({ minLength: 1 }),
		componentKind: Type.Optional(componentKindSchema),
		methodName: Type.String({ minLength: 1 }),
		methodKind: Type.Optional(methodKindSchema),
		ifExists: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("return-existing")])),
		...writeControlSchema,
	}),
	Type.Object({
		action: Type.Literal("set_method_signature"),
		componentPath: Type.String({ minLength: 1 }),
		methodName: Type.String({ minLength: 1 }),
		returnType: Type.Optional(primitiveSignatureTypeSchema),
		arguments: Type.Optional(Type.Array(methodSignatureArgumentSchema)),
		ifReturnExists: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("keep"), Type.Literal("replace")])),
		...writeControlSchema,
	}),
	Type.Object({
		action: Type.Literal("delete_component"),
		componentPath: Type.String({ minLength: 1 }),
		ifMissing: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("ignore")])),
		...writeControlSchema,
	}),
	Type.Object({
		action: Type.Literal("delete_method"),
		componentPath: Type.String({ minLength: 1 }),
		methodName: Type.String({ minLength: 1 }),
		ifMissing: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("ignore")])),
		...writeControlSchema,
	}),
	Type.Object({
		action: Type.Literal("delete_folder"),
		folderPath: Type.String({ minLength: 1 }),
		ifMissing: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("ignore")])),
		...writeControlSchema,
	}),
	Type.Object({
		action: Type.Literal("set_method_code"),
		componentPath: Type.String({ minLength: 1 }),
		methodName: Type.String({ minLength: 1 }),
		...codeSourceSchema,
		...writeControlSchema,
	}),
	Type.Object({
		action: Type.Literal("set_module_code"),
		modulePath: Type.String({ minLength: 1 }),
		operation: Type.Optional(moduleCodeOperationSchema),
		section: Type.Optional(moduleCodeOperationSchema),
		methodName: Type.Optional(Type.String({ minLength: 1 })),
		...codeSourceSchema,
		...writeControlSchema,
	}),
	Type.Object({
		action: Type.Literal("set_state_machine_code"),
		stateMachinePath: Type.String({ minLength: 1 }),
		operation: stateMachineOperationSchema,
		stateName: Type.Optional(Type.String()),
		sourceState: Type.Optional(Type.String()),
		targetState: Type.Optional(Type.String()),
		priority: Type.Optional(Type.Number()),
		methodName: Type.Optional(Type.String({ minLength: 1 })),
		...codeSourceSchema,
		...writeControlSchema,
	}),
	Type.Object({
		action: Type.Literal("set_enumerators"),
		componentPath: Type.String({ minLength: 1 }),
		enumerators: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
		...writeControlSchema,
	}),
	Type.Object({
		action: Type.Literal("apply_element_spec"),
		componentPath: Type.String({ minLength: 1 }),
		specFile: Type.String({ minLength: 1 }),
		projectPath: Type.Optional(Type.String({ minLength: 1 })),
		mode: Type.Optional(Type.Literal("restore")),
		deleteMissing: Type.Optional(Type.Boolean()),
		recreateIncompatible: Type.Optional(Type.Boolean()),
		...writeControlSchema,
	}),
	Type.Object({
		action: Type.Literal("apply_project_formula"),
		projectPath: Type.String({ minLength: 1 }),
		specFile: Type.String({ minLength: 1 }),
		mode: Type.Optional(Type.Literal("restore")),
		deleteMissing: Type.Optional(Type.Boolean()),
		...writeControlSchema,
	}),
	Type.Object({
		action: Type.Literal("set_element_dependency"),
		targetPath: Type.Optional(Type.String({ minLength: 1 })),
		componentPath: Type.Optional(Type.String({ minLength: 1 })),
		elementName: Type.String({ minLength: 1 }),
		dependency: Type.Union([Type.Literal("dependent"), Type.Literal("independent")]),
		dependencyFormula: Type.Optional(Type.String({ minLength: 1 })),
		dependencyMappings: Type.Optional(Type.Record(Type.String({ minLength: 1 }), Type.String({ minLength: 1 }))),
		clearDependencyFormula: Type.Optional(Type.Boolean()),
		targetKind: Type.Optional(
			Type.Union([Type.Literal("auto"), Type.Literal("component"), Type.Literal("folder"), Type.Literal("project")]),
		),
		match: Type.Optional(Type.Union([Type.Literal("exact"), Type.Literal("all")])),
		dryRun: Type.Optional(Type.Boolean()),
		backupDir: Type.Optional(Type.String({ minLength: 1 })),
		...writeControlSchema,
	}),
] as const;

export const ascetMutationParameters = openAiObjectUnionSchema<AscetMutationParams>(ascetMutationActionSchemas);

function outcomeFromCliResult(result: AscetCliJsonResult, action?: string): AscetToolOutcome {
	if (result.ok) {
		return { status: "ok", data: result.data, warnings: [] };
	}
	const code = result.error?.code ?? "ascet_edit_failed";
	const message = result.error?.message ?? "ASCET edit failed.";
	const detailedCode = extractAscetReadExceptionCode(message);
	const readbackCode = code.indexOf("readback_") === 0 ? code : detailedCode;
	if (action === "apply_element_spec" && readbackCode?.indexOf("readback_") === 0) {
		return {
			status: "partial",
			data: { readback: { verified: false }, error: { code: readbackCode, message } },
			failures: [{ code: readbackCode, message }],
		};
	}
	if (isAscetEditApprovalBlockedCode(code)) {
		return { status: "blocked", code, message };
	}
	return { status: "error", error: { code, message } };
}

function extractAscetReadExceptionCode(message: string): string | undefined {
	const match = message.match(/(?:^|\r?\n)Code:\s*([A-Za-z0-9_.-]+)/u);
	return match?.[1];
}

function validateDependencyWriteResult(raw: AscetCliJsonResult): AscetToolOutcome | undefined {
	const payload = extractCliOperationPayload(raw.data);
	const write = asRecord(payload?.write);
	if (!write) {
		return {
			status: "error",
			error: {
				code: "ascet_dependency_write_result_missing",
				message: "set_element_dependency returned no write result.",
			},
		};
	}
	if (write.succeeded !== true) {
		return {
			status: "error",
			error: {
				code: "ascet_dependency_write_not_applied",
				message: "set_element_dependency did not report a successful write.",
			},
		};
	}
	if (write.readbackVerified !== true) {
		return {
			status: "error",
			error: {
				code: "ascet_dependency_readback_not_verified",
				message: "set_element_dependency writeback was not verified by live readback.",
			},
		};
	}
	return undefined;
}

function asResponse(outcome: AscetToolOutcome, raw?: AscetCliJsonResult, impact?: AscetEditImpact): AscetEditResult {
	return {
		content: [{ type: "text", text: formatAscetEditOutcomeContent(outcome) }],
		details: {
			outcome,
			raw,
			impact,
			error: outcome.status === "error" ? outcome.error : undefined,
		},
	};
}

function formatAscetEditOutcomeContent(outcome: AscetToolOutcome): string {
	if (outcome.status === "ok") {
		return JSON.stringify(compactObject(outcome.data) ?? {}, null, 2);
	}
	if (outcome.status === "error") {
		return JSON.stringify(toToolFailurePayload(outcome.error), null, 2);
	}
	if (outcome.status === "blocked") {
		return JSON.stringify(toToolFailurePayload({ code: outcome.code, message: outcome.message }), null, 2);
	}
	return JSON.stringify(compactObject(outcome) ?? {}, null, 2);
}

export function resolveAscetEditInvocation(params: unknown): AscetEditInvocation | undefined {
	if (!isRecord(params)) {
		return undefined;
	}
	if (Object.hasOwn(params, "action")) {
		const action =
			typeof params.action === "string" ? getAscetEditAction(params.action as AscetEditActionId) : undefined;
		if (!action || action.discriminator.field !== "action") {
			return undefined;
		}
		if (
			Object.hasOwn(params, "mode") &&
			!(params.mode === "restore" && (action.id === "apply_element_spec" || action.id === "apply_project_formula"))
		) {
			return undefined;
		}
		return { kind: "mutation", action: action.id as AscetMutationParams["action"] };
	}
	if (!Object.hasOwn(params, "mode")) {
		return undefined;
	}
	const mode = typeof params.mode === "string" ? getAscetEditAction(params.mode as AscetEditActionId) : undefined;
	return mode?.discriminator.field === "mode"
		? { kind: "editability", mode: mode.id as AscetEditabilityParams["mode"] }
		: undefined;
}

export function getAscetEditActionId(params: unknown): AscetEditActionId | undefined {
	const invocation = resolveAscetEditInvocation(params);
	return invocation?.kind === "mutation" ? invocation.action : invocation?.mode;
}

export async function runAscetEdit(
	params: unknown,
	options: RunAscetEditOperationOptions,
	ctx: AscetEditApprovalContext,
): Promise<AscetEditResult> {
	const invocation = resolveAscetEditInvocation(params);
	if (!invocation || !isRecord(params)) {
		return asResponse({
			status: "error",
			error: {
				code: "ascet_edit_invalid_parameter",
				message:
					"ascet_edit requires exactly one supported discriminator: action for a mutation, or mode=check/set for editability.",
			},
		});
	}
	if (invocation.kind === "mutation") {
		return runAscetMutation(params as AscetMutationParams, options, ctx);
	}

	const editabilityParams = params as unknown as AscetEditabilityParams;
	const raw = await runApprovedAscetEditability(editabilityParams, options, ctx);
	const outcome = outcomeFromCliResult(raw);
	return {
		content: [{ type: "text", text: formatAscetEditabilityResult(raw, editabilityParams) }],
		details: {
			outcome,
			raw,
			error: outcome.status === "error" ? outcome.error : undefined,
		},
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function withEditCode<T>(
	params: CodeSource & { action: string },
	run: (codeFile: string) => Promise<T>,
): Promise<T> {
	return withInlineCodeFile({ code: params.code, codeFile: params.codeFile, prefix: params.action }, run);
}

export async function runAscetMutation(
	params: AscetMutationParams,
	options: RunAscetEditOperationOptions,
	ctx: AscetEditApprovalContext,
): Promise<AscetEditResult> {
	const normalizedParams = normalizeAscetMutationParams(params);
	const validation = validateAscetMutationParams(normalizedParams);
	if (validation) {
		return asResponse(validation);
	}
	if (!params.executeWrite) {
		return asResponse(createPreflightOutcome({ action: normalizedParams.action, params: normalizedParams }));
	}

	const raw = await dispatchMutation(normalizedParams, options, ctx);
	if (!raw.ok) {
		return asResponse(outcomeFromCliResult(raw, normalizedParams.action), raw);
	}
	if (normalizedParams.action === "set_element_dependency" && !normalizedParams.dryRun) {
		const dependencyWriteFailure = validateDependencyWriteResult(raw);
		if (dependencyWriteFailure) {
			return asResponse(dependencyWriteFailure, raw);
		}
	}
	const impact = createAscetEditImpact(normalizedParams);
	const indexUpdate = await applySuccessfulEditIndexUpdate(normalizedParams, raw, options, impact);
	return asResponse(createSuccessfulEditOutcome(raw, normalizedParams, impact, indexUpdate), raw, impact);
}

async function applySuccessfulEditIndexUpdate(
	params: AscetMutationParams,
	raw: AscetCliJsonResult,
	options: RunAscetEditOperationOptions,
	impact: AscetEditImpact,
): Promise<AscetEditIndexUpdate> {
	if (params.action === "set_element_dependency") {
		if (params.dryRun) {
			return { ...impact, stale: [] };
		}
		const targets = resolveDependencyWritebackTargets(params, raw);
		if (targets.length === 0) {
			const update: AscetElementIndexWritebackResult = {
				updated: [],
				stale: impact.stale,
				elements: [],
				issues: [
					{
						code: "index-writeback-targets-missing",
						message:
							"set_element_dependency succeeded, but the CLI did not return component targets for index writeback.",
					},
				],
			};
			applyTargetedEditWritebackImpact(update, impact, options);
			return update;
		}
		const updates: AscetElementIndexWritebackResult[] = [];
		for (const componentPath of targets) {
			updates.push(
				await refreshElementsFromLiveCatalog(
					{
						componentPath,
						names: [params.elementName],
						scopes: ["Local"],
						reason: `edit_succeeded:${params.action}`,
						stale: ["text_code"],
					},
					options,
				),
			);
		}
		const update = mergeElementIndexWritebackResults(updates, impact.stale);
		applyTargetedEditWritebackImpact(update, impact, options);
		return update.issues && update.issues.length > 0 ? { ...update, stale: impact.stale } : update;
	}
	if (params.action === "apply_element_spec") {
		const selectors = extractElementSelectorsFromSpecFile(params.specFile);
		const names = uniqueStrings(selectors.map((entry) => entry.name));
		const scopes = uniqueStrings(selectors.map((entry) => entry.scope).filter((entry) => entry !== undefined));
		const update = await refreshElementsFromLiveCatalog(
			{
				componentPath: params.componentPath,
				names: names.length > 0 ? names : undefined,
				scopes: scopes.length > 0 ? scopes : undefined,
				reason: `edit_succeeded:${params.action}`,
				stale: ["text_code"],
			},
			options,
		);
		applyTargetedEditWritebackImpact(update, impact, options);
		return update.issues && update.issues.length > 0 ? { ...update, stale: impact.stale } : update;
	}
	applyAscetEditImpactToSearchIndex(impact, `edit_succeeded:${params.action}`, options);
	return impact;
}

function resolveDependencyWritebackTargets(
	params: Extract<AscetMutationParams, { action: "set_element_dependency" }>,
	raw: AscetCliJsonResult,
): string[] {
	const payload = extractCliOperationPayload(raw.data);
	const plan = asRecord(payload?.plan);
	const matches = Array.isArray(plan?.matches) ? plan.matches.filter(isRecord) : [];
	const plannedComponents = uniqueNormalizedPaths(
		matches
			.filter((match) => match.supported !== false)
			.map((match) => (typeof match.component === "string" ? match.component : "")),
	);
	const multiTarget =
		params.match === "all" || params.targetKind === "folder" || params.targetKind === "project" || matches.length > 1;
	if (multiTarget) {
		return plannedComponents;
	}
	const target = params.targetPath ?? params.componentPath ?? "";
	return target.trim() ? [target] : [];
}

function mergeElementIndexWritebackResults(
	updates: readonly AscetElementIndexWritebackResult[],
	fallbackStale: readonly AscetEditImpact["stale"][number][],
): AscetElementIndexWritebackResult {
	const updated = uniqueStrings(updates.flatMap((update) => update.updated));
	const elements = updates.flatMap((update) => update.elements);
	const stale = uniqueStrings(updates.flatMap((update) => update.stale));
	const issues = updates.flatMap((update) => update.issues ?? []);
	return {
		updated: updated as AscetElementIndexWritebackResult["updated"],
		stale: issues.length > 0 ? [...fallbackStale] : (stale as AscetElementIndexWritebackResult["stale"]),
		elements,
		issues: issues.length > 0 ? issues : undefined,
	};
}

function uniqueNormalizedPaths(values: readonly string[]): string[] {
	const result: string[] = [];
	const seen = new Set<string>();
	for (const value of values) {
		const trimmed = value.trim();
		const key = trimmed
			.replace(/\\/g, "/")
			.replace(/^\/+|\/+$/g, "")
			.toLowerCase();
		if (!key || seen.has(key)) {
			continue;
		}
		seen.add(key);
		result.push(trimmed);
	}
	return result;
}

function applyTargetedEditWritebackImpact(
	update: AscetElementIndexWritebackResult,
	fallbackImpact: AscetEditImpact,
	options: RunAscetEditOperationOptions,
): void {
	if (update.issues && update.issues.length > 0) {
		invalidateAscetSearchIndexPartitions(fallbackImpact.stale, `edit_succeeded:${fallbackImpact.action}`);
		applyAscetEditImpactToSearchIndex(fallbackImpact, `edit_succeeded:${fallbackImpact.action}`, options);
		return;
	}
	if (update.stale.length > 0) {
		invalidateAscetSearchIndexPartitions(update.stale, `edit_succeeded:${fallbackImpact.action}`);
		applyAscetEditImpactToSearchIndex(
			{ ...fallbackImpact, stale: update.stale },
			`edit_succeeded:${fallbackImpact.action}`,
			options,
		);
	}
}

function extractElementSelectorsFromSpecFile(specFile: string): Array<{ name: string; scope?: string }> {
	try {
		const parsed = JSON.parse(readFileSync(specFile, "utf8"));
		if (!isJsonRecord(parsed) || !Array.isArray(parsed.elements)) {
			return [];
		}
		return parsed.elements.filter(isJsonRecord).flatMap((entry) => {
			const name = typeof entry.name === "string" ? entry.name.trim() : "";
			if (!name) {
				return [];
			}
			const scope = typeof entry.scope === "string" && entry.scope.trim() ? entry.scope.trim() : undefined;
			return [{ name, scope }];
		});
	} catch {
		return [];
	}
}

function uniqueStrings(values: readonly string[]): string[] {
	return [...new Set(values.map((entry) => entry.trim()).filter(Boolean))];
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
	return isRecord(value);
}

function createSuccessfulEditOutcome(
	raw: AscetCliJsonResult,
	params: AscetMutationParams,
	_impact: AscetEditImpact,
	indexUpdate: AscetEditIndexUpdate,
): AscetToolOutcome {
	const payload = unwrapToolSuccessPayload(raw.data);
	const record = asRecord(payload);
	const readback = record?.readback ?? record?.verify ?? record?.verification;
	const changed = record ? omitKeys(record, ["readback", "verify", "verification"]) : payload;
	const readbackValue = record?.ReadbackVerified ?? record?.readbackVerified;
	if (
		params.action === "apply_element_spec" &&
		params.verifyReadback !== false &&
		(readbackValue === false || readbackValue === 0)
	) {
		return {
			status: "partial",
			data: { changed, readback, index: indexUpdate },
			failures: [
				{
					code: "readback_not_verified",
					message: "apply_element_spec completed without verified live readback.",
				},
			],
		};
	}
	return {
		status: "ok",
		data: {
			changed,
			readback,
			index: indexUpdate,
		},
		warnings: [],
	};
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function extractCliOperationPayload(data: unknown): Record<string, unknown> | undefined {
	const result = asRecord(unwrapToolSuccessPayload(data));
	const nestedPayload = asRecord(result?.payload);
	return nestedPayload ?? result;
}

function omitKeys(record: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
	const omit = new Set(keys);
	return Object.fromEntries(Object.entries(record).filter(([key]) => !omit.has(key)));
}

function normalizeAscetMutationParams(params: AscetMutationParams): AscetMutationParams {
	if (
		params.action === "create_component" &&
		!params.language &&
		(params.kind === "class" || params.kind === "module")
	) {
		return { ...params, language: "ESDL" };
	}
	if (params.action === "create_method" && !params.methodKind && params.componentKind) {
		const defaultMethodKind = getDefaultCreateMethodKind(params.componentKind);
		if (defaultMethodKind) {
			return { ...params, methodKind: defaultMethodKind };
		}
	}
	if (params.action === "set_module_code" && !params.operation && params.section) {
		return { ...params, operation: params.section };
	}
	if (params.action === "set_element_dependency") {
		const targetPath = params.targetPath ?? params.componentPath;
		if (targetPath) {
			return { ...params, targetPath };
		}
	}
	return params;
}

function validateAscetMutationParams(params: AscetMutationParams): AscetToolOutcome | undefined {
	if (params.action === "set_element_dependency") {
		if (!params.targetPath && !params.componentPath) {
			return {
				status: "error",
				error: {
					code: "ascet_edit_missing_parameter",
					message: "set_element_dependency requires targetPath or componentPath.",
				},
			};
		}
		if (!params.elementName) {
			return {
				status: "error",
				error: {
					code: "ascet_edit_missing_parameter",
					message: "set_element_dependency requires elementName.",
				},
			};
		}
		if (!params.dependency) {
			return {
				status: "error",
				error: {
					code: "ascet_edit_missing_parameter",
					message: "set_element_dependency requires dependency.",
				},
			};
		}
		if (params.dependency === "independent" && params.dependencyFormula) {
			return {
				status: "error",
				error: {
					code: "ascet_edit_invalid_parameter",
					message: 'set_element_dependency dependencyFormula is only valid with dependency="dependent".',
				},
			};
		}
		if (params.dependencyFormula && params.clearDependencyFormula) {
			return {
				status: "error",
				error: {
					code: "ascet_edit_invalid_parameter",
					message: "set_element_dependency dependencyFormula and clearDependencyFormula cannot be used together.",
				},
			};
		}
		if (params.dependencyMappings && Object.keys(params.dependencyMappings).length > 0 && !params.dependencyFormula) {
			return {
				status: "error",
				error: {
					code: "ascet_edit_invalid_parameter",
					message: "set_element_dependency dependencyMappings requires dependencyFormula.",
				},
			};
		}
	}
	if (params.action === "create_method") {
		if (params.executeWrite && !params.componentKind) {
			return {
				status: "error",
				error: {
					code: "ascet_edit_missing_component_kind",
					message:
						"create_method with executeWrite=true requires componentKind; inspect the target first so methodKind can be validated before ASCET ToolAPI execution.",
				},
			};
		}
		if (params.executeWrite && !params.methodKind) {
			return {
				status: "error",
				error: {
					code: "ascet_edit_missing_method_kind",
					message:
						"create_method requires methodKind for statemachine targets; inspect the target and choose action, condition, or trigger.",
				},
			};
		}
		const compatibility = validateCreateMethodKindCompatibility(params);
		if (compatibility) {
			return {
				status: "error",
				error: compatibility,
			};
		}
	}
	if (params.action === "set_module_code" && !params.operation) {
		return {
			status: "error",
			error: {
				code: "ascet_edit_missing_parameter",
				message: "section parameter is required for set_module_code",
			},
		};
	}
	if (params.action === "set_state_machine_code" && !params.operation) {
		return {
			status: "error",
			error: {
				code: "ascet_edit_missing_parameter",
				message: `operation parameter is required for set_state_machine_code. Valid values: ${VALID_STATE_MACHINE_OPERATIONS_TEXT}.`,
			},
		};
	}
	if (params.action === "set_state_machine_code" && !VALID_STATE_MACHINE_OPERATIONS.has(params.operation)) {
		return {
			status: "error",
			error: {
				code: "ascet_edit_invalid_operation",
				message: `Unknown state-machine write operation '${params.operation}'. Valid values: ${VALID_STATE_MACHINE_OPERATIONS_TEXT}.`,
			},
		};
	}
	if (params.action === "set_enumerators" && params.enumerators.length === 0) {
		return {
			status: "error",
			error: {
				code: "ascet_edit_missing_parameter",
				message: "set_enumerators requires at least one enumerator.",
			},
		};
	}
	if (
		params.action === "set_method_signature" &&
		!params.returnType &&
		(!params.arguments || params.arguments.length === 0)
	) {
		return {
			status: "error",
			error: {
				code: "ascet_edit_missing_parameter",
				message: "set_method_signature requires returnType or at least one argument.",
			},
		};
	}
	if (params.action === "set_element_dependency" && params.targetKind === "folder" && params.match !== "all") {
		return {
			status: "error",
			error: {
				code: "ascet_edit_invalid_scope",
				message: 'set_element_dependency folder writes require match="all" to modify multiple candidates.',
			},
		};
	}
	return undefined;
}

async function dispatchMutation(
	params: AscetMutationParams,
	options: RunAscetEditOperationOptions,
	ctx: AscetEditApprovalContext,
): Promise<AscetCliJsonResult> {
	switch (params.action) {
		case "create_folder":
			return runApprovedAscetCreateFolder(params, options, ctx);
		case "create_component":
			return runApprovedAscetCreateComponent(params, options, ctx);
		case "create_method":
			if (!params.methodKind) {
				throw new Error("create_method requires methodKind after validation.");
			}
			return runApprovedAscetCreateMethod({ ...params, methodKind: params.methodKind }, options, ctx);
		case "set_method_signature":
			return runApprovedAscetSetMethodSignature(params, options, ctx);
		case "delete_component":
			return runApprovedAscetDeleteComponent(params, options, ctx);
		case "delete_method":
			return runApprovedAscetDeleteMethod(params, options, ctx);
		case "delete_folder":
			return runApprovedAscetDeleteFolder(params, options, ctx);
		case "set_method_code":
			return withEditCode(params, (codeFile) =>
				runApprovedAscetSetMethodCode({ ...params, codeFile }, options, ctx),
			);
		case "set_module_code":
			return withEditCode(params, (codeFile) =>
				runApprovedAscetSetModuleCode({ ...params, operation: params.operation!, codeFile }, options, ctx),
			);
		case "set_state_machine_code":
			if (params.code !== undefined || params.codeFile !== undefined) {
				return withEditCode(params, (codeFile) =>
					runApprovedAscetSetStateMachineCode({ ...params, codeFile }, options, ctx),
				);
			}
			return runApprovedAscetSetStateMachineCode(params, options, ctx);
		case "set_enumerators":
			return runApprovedAscetSetEnumerators(params, options, ctx);
		case "apply_element_spec":
			return runApprovedAscetApplyElementSpec(params, options, ctx);
		case "apply_project_formula":
			return runApprovedAscetApplyProjectFormula(params, options, ctx);
		case "set_element_dependency":
			if (!params.targetPath) {
				throw new Error("set_element_dependency requires targetPath after validation.");
			}
			return runApprovedAscetSetElementDependency({ ...params, targetPath: params.targetPath }, options, ctx);
	}
}

export function formatAscetEditResult(result: AscetEditResult): string {
	return result.content[0]?.text ?? "";
}
