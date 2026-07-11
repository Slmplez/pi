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
import { runApprovedAscetSetClassMethodCode } from "../set-class-method-code.ts";
import { runApprovedAscetSetMethodCode } from "../set-method-code.ts";
import { runApprovedAscetSetModuleCode } from "../set-module-code.ts";
import {
	ASCET_SET_STATE_MACHINE_CODE_OPERATIONS,
	runApprovedAscetSetStateMachineCode,
} from "../set-state-machine-code.ts";
import type { RunAscetWriteOperationOptions } from "../write-common.ts";
import type { AscetWriteApprovalContext } from "../write-policy.ts";

type CodeSource = { code?: string; codeFile?: string };
const VALID_STATE_MACHINE_OPERATIONS = new Set<string>(ASCET_SET_STATE_MACHINE_CODE_OPERATIONS);
const VALID_STATE_MACHINE_OPERATIONS_TEXT = ASCET_SET_STATE_MACHINE_CODE_OPERATIONS.join(", ");

export type AscetWriteParams =
	| { action: "create_folder"; folderPath: string; verifyReadback?: boolean; executeWrite?: boolean }
	| {
			action: "create_component";
			componentPath: string;
			kind: "class" | "module" | "statemachine";
			language?: "ESDL" | "C";
			ifExists?: "fail" | "return-existing" | "overwrite";
			verifyReadback?: boolean;
			rollbackOnFailure?: boolean;
			executeWrite?: boolean;
	  }
	| {
			action: "create_method";
			componentPath: string;
			methodName: string;
			methodKind?: "abstract" | "process" | "action" | "condition" | "trigger";
			ifExists?: "fail" | "return-existing" | "overwrite";
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
			action: "set_class_method_code";
			classPath: string;
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
	  };

export interface AscetWriteResult {
	content: Array<{ type: "text"; text: string }>;
	details: {
		outcome: AscetToolOutcome;
		raw?: AscetCliJsonResult;
		error?: { code: string; message: string };
	};
}

const codeSourceSchema = {
	code: Type.Optional(Type.String()),
	codeFile: Type.Optional(Type.String()),
};

export const ascetWriteParameters = Type.Object({
	action: Type.Union([
		Type.Literal("create_folder"),
		Type.Literal("create_component"),
		Type.Literal("create_method"),
		Type.Literal("delete_component"),
		Type.Literal("delete_method"),
		Type.Literal("delete_folder"),
		Type.Literal("set_method_code"),
		Type.Literal("set_class_method_code"),
		Type.Literal("set_module_code"),
		Type.Literal("set_state_machine_code"),
		Type.Literal("apply_element_spec"),
		Type.Literal("apply_project_formula"),
	]),
	folderPath: Type.Optional(Type.String({ minLength: 1 })),
	componentPath: Type.Optional(Type.String({ minLength: 1 })),
	classPath: Type.Optional(Type.String({ minLength: 1 })),
	modulePath: Type.Optional(Type.String({ minLength: 1 })),
	stateMachinePath: Type.Optional(Type.String({ minLength: 1 })),
	projectPath: Type.Optional(Type.String({ minLength: 1 })),
	kind: Type.Optional(Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")])),
	language: Type.Optional(Type.Union([Type.Literal("ESDL"), Type.Literal("C")])),
	methodName: Type.Optional(Type.String({ minLength: 1 })),
	methodKind: Type.Optional(
		Type.Union([
			Type.Literal("abstract"),
			Type.Literal("process"),
			Type.Literal("action"),
			Type.Literal("condition"),
			Type.Literal("trigger"),
		]),
	),
	operation: Type.Optional(
		Type.Union([
			Type.Literal("set-method"),
			Type.Literal("set-header"),
			Type.Literal("set-external-c-code"),
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
		]),
	),
	section: Type.Optional(
		Type.Union([Type.Literal("set-method"), Type.Literal("set-header"), Type.Literal("set-external-c-code")]),
	),
	stateName: Type.Optional(Type.String()),
	sourceState: Type.Optional(Type.String()),
	targetState: Type.Optional(Type.String()),
	priority: Type.Optional(Type.Number()),
	specFile: Type.Optional(Type.String({ minLength: 1 })),
	mode: Type.Optional(Type.Literal("restore")),
	deleteMissing: Type.Optional(Type.Boolean()),
	recreateIncompatible: Type.Optional(Type.Boolean()),
	ifExists: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("return-existing"), Type.Literal("overwrite")])),
	ifMissing: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("ignore")])),
	rollbackOnFailure: Type.Optional(Type.Boolean()),
	...codeSourceSchema,
	verifyReadback: Type.Optional(Type.Boolean()),
	executeWrite: Type.Optional(Type.Boolean()),
});

function outcomeFromCliResult(result: AscetCliJsonResult): AscetToolOutcome {
	if (result.ok) {
		return { status: "ok", data: result.data, warnings: [] };
	}
	const code = result.error?.code ?? "ascet_write_failed";
	const message = result.error?.message ?? "ASCET write failed.";
	if (code === "ascet_write_ui_required" || code === "ascet_write_rejected") {
		return { status: "blocked", code, message };
	}
	return { status: "error", error: { code, message } };
}

function asResponse(outcome: AscetToolOutcome, raw?: AscetCliJsonResult): AscetWriteResult {
	return {
		content: [{ type: "text", text: JSON.stringify(outcome, null, 2) }],
		details: {
			outcome,
			raw,
			error: outcome.status === "error" ? outcome.error : undefined,
		},
	};
}

async function withWriteCode<T>(
	params: CodeSource & { action: string },
	run: (codeFile: string) => Promise<T>,
): Promise<T> {
	return withInlineCodeFile({ code: params.code, codeFile: params.codeFile, prefix: params.action }, run);
}

export async function runAscetWrite(
	params: AscetWriteParams,
	options: RunAscetWriteOperationOptions,
	ctx: AscetWriteApprovalContext,
): Promise<AscetWriteResult> {
	const normalizedParams = normalizeAscetWriteParams(params);
	const validation = validateAscetWriteParams(normalizedParams);
	if (validation) {
		return asResponse(validation);
	}
	if (!params.executeWrite) {
		return asResponse(createPreflightOutcome({ action: normalizedParams.action, params: normalizedParams }));
	}

	const raw = await dispatchWrite(normalizedParams, options, ctx);
	return asResponse(outcomeFromCliResult(raw), raw);
}

function normalizeAscetWriteParams(params: AscetWriteParams): AscetWriteParams {
	if (params.action === "set_module_code" && !params.operation && params.section) {
		return { ...params, operation: params.section };
	}
	return params;
}

function validateAscetWriteParams(params: AscetWriteParams): AscetToolOutcome | undefined {
	if (params.action === "set_module_code" && !params.operation) {
		return {
			status: "error",
			error: {
				code: "ascet_write_missing_parameter",
				message: "section parameter is required for set_module_code",
			},
		};
	}
	if (params.action === "set_state_machine_code" && !params.operation) {
		return {
			status: "error",
			error: {
				code: "ascet_write_missing_parameter",
				message:
					`operation parameter is required for set_state_machine_code. Valid values: ${VALID_STATE_MACHINE_OPERATIONS_TEXT}.`,
			},
		};
	}
	if (params.action === "set_state_machine_code" && !VALID_STATE_MACHINE_OPERATIONS.has(params.operation)) {
		return {
			status: "error",
			error: {
				code: "ascet_write_invalid_operation",
				message: `Unknown state-machine write operation '${params.operation}'. Valid values: ${VALID_STATE_MACHINE_OPERATIONS_TEXT}.`,
			},
		};
	}
	return undefined;
}

async function dispatchWrite(
	params: AscetWriteParams,
	options: RunAscetWriteOperationOptions,
	ctx: AscetWriteApprovalContext,
): Promise<AscetCliJsonResult> {
	switch (params.action) {
		case "create_folder":
			return runApprovedAscetCreateFolder(params, options, ctx);
		case "create_component":
			return runApprovedAscetCreateComponent(params, options, ctx);
		case "create_method":
			return runApprovedAscetCreateMethod(params, options, ctx);
		case "delete_component":
			return runApprovedAscetDeleteComponent(params, options, ctx);
		case "delete_method":
			return runApprovedAscetDeleteMethod(params, options, ctx);
		case "delete_folder":
			return runApprovedAscetDeleteFolder(params, options, ctx);
		case "set_method_code":
			return withWriteCode(params, (codeFile) =>
				runApprovedAscetSetMethodCode({ ...params, codeFile }, options, ctx),
			);
		case "set_class_method_code":
			return withWriteCode(params, (codeFile) =>
				runApprovedAscetSetClassMethodCode({ ...params, codeFile }, options, ctx),
			);
		case "set_module_code":
			return withWriteCode(params, (codeFile) =>
				runApprovedAscetSetModuleCode({ ...params, operation: params.operation!, codeFile }, options, ctx),
			);
		case "set_state_machine_code":
			if (params.code !== undefined || params.codeFile !== undefined) {
				return withWriteCode(params, (codeFile) =>
					runApprovedAscetSetStateMachineCode({ ...params, codeFile }, options, ctx),
				);
			}
			return runApprovedAscetSetStateMachineCode(params, options, ctx);
		case "apply_element_spec":
			return runApprovedAscetApplyElementSpec(params, options, ctx);
		case "apply_project_formula":
			return runApprovedAscetApplyProjectFormula(params, options, ctx);
	}
}

export function formatAscetWriteResult(result: AscetWriteResult): string {
	return result.content[0]?.text ?? "";
}
