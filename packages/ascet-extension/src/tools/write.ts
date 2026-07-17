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
import {
	type AscetCreateMethodComponentKind,
	getDefaultCreateMethodKind,
	validateCreateMethodKindCompatibility,
} from "../method-kind-compatibility.ts";
import { runApprovedAscetSetElementDependency } from "../set-element-dependency.ts";
import { runApprovedAscetSetMethodCode } from "../set-method-code.ts";
import { runApprovedAscetSetMethodSignature } from "../set-method-signature.ts";
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

export const ascetWriteParameters = Type.Object({
	action: Type.Union([
		Type.Literal("create_folder"),
		Type.Literal("create_component"),
		Type.Literal("create_method"),
		Type.Literal("set_method_signature"),
		Type.Literal("delete_component"),
		Type.Literal("delete_method"),
		Type.Literal("delete_folder"),
		Type.Literal("set_method_code"),
		Type.Literal("set_module_code"),
		Type.Literal("set_state_machine_code"),
		Type.Literal("apply_element_spec"),
		Type.Literal("apply_project_formula"),
		Type.Literal("set_element_dependency"),
	]),
	folderPath: Type.Optional(Type.String({ minLength: 1 })),
	componentPath: Type.Optional(Type.String({ minLength: 1 })),
	modulePath: Type.Optional(Type.String({ minLength: 1 })),
	stateMachinePath: Type.Optional(Type.String({ minLength: 1 })),
	projectPath: Type.Optional(Type.String({ minLength: 1 })),
	targetPath: Type.Optional(Type.String({ minLength: 1 })),
	kind: Type.Optional(Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")])),
	componentKind: Type.Optional(
		Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")]),
	),
	language: Type.Optional(Type.Union([Type.Literal("ESDL"), Type.Literal("BDE"), Type.Literal("C")])),
	methodName: Type.Optional(Type.String({ minLength: 1 })),
	elementName: Type.Optional(Type.String({ minLength: 1 })),
	dependency: Type.Optional(Type.Union([Type.Literal("dependent"), Type.Literal("independent")])),
	dependencyFormula: Type.Optional(Type.String({ minLength: 1 })),
	dependencyMappings: Type.Optional(Type.Record(Type.String({ minLength: 1 }), Type.String({ minLength: 1 }))),
	clearDependencyFormula: Type.Optional(Type.Boolean()),
	returnType: Type.Optional(primitiveSignatureTypeSchema),
	arguments: Type.Optional(Type.Array(methodSignatureArgumentSchema)),
	targetKind: Type.Optional(
		Type.Union([Type.Literal("auto"), Type.Literal("component"), Type.Literal("folder"), Type.Literal("project")]),
	),
	match: Type.Optional(Type.Union([Type.Literal("exact"), Type.Literal("all")])),
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
	dryRun: Type.Optional(Type.Boolean()),
	backupDir: Type.Optional(Type.String({ minLength: 1 })),
	ifExists: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("return-existing")])),
	ifReturnExists: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("keep"), Type.Literal("replace")])),
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

function validateAscetWriteParams(params: AscetWriteParams): AscetToolOutcome | undefined {
	if (params.action === "set_element_dependency") {
		if (!params.targetPath && !params.componentPath) {
			return {
				status: "error",
				error: {
					code: "ascet_write_missing_parameter",
					message: "set_element_dependency requires targetPath or componentPath.",
				},
			};
		}
		if (!params.elementName) {
			return {
				status: "error",
				error: {
					code: "ascet_write_missing_parameter",
					message: "set_element_dependency requires elementName.",
				},
			};
		}
		if (!params.dependency) {
			return {
				status: "error",
				error: {
					code: "ascet_write_missing_parameter",
					message: "set_element_dependency requires dependency.",
				},
			};
		}
		if (params.dependency === "independent" && params.dependencyFormula) {
			return {
				status: "error",
				error: {
					code: "ascet_write_invalid_parameter",
					message: 'set_element_dependency dependencyFormula is only valid with dependency="dependent".',
				},
			};
		}
		if (params.dependencyFormula && params.clearDependencyFormula) {
			return {
				status: "error",
				error: {
					code: "ascet_write_invalid_parameter",
					message: "set_element_dependency dependencyFormula and clearDependencyFormula cannot be used together.",
				},
			};
		}
		if (params.dependencyMappings && Object.keys(params.dependencyMappings).length > 0 && !params.dependencyFormula) {
			return {
				status: "error",
				error: {
					code: "ascet_write_invalid_parameter",
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
					code: "ascet_write_missing_component_kind",
					message:
						"create_method with executeWrite=true requires componentKind; inspect the target first so methodKind can be validated before ASCET ToolAPI execution.",
				},
			};
		}
		if (params.executeWrite && !params.methodKind) {
			return {
				status: "error",
				error: {
					code: "ascet_write_missing_method_kind",
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
				message: `operation parameter is required for set_state_machine_code. Valid values: ${VALID_STATE_MACHINE_OPERATIONS_TEXT}.`,
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
	if (
		params.action === "set_method_signature" &&
		!params.returnType &&
		(!params.arguments || params.arguments.length === 0)
	) {
		return {
			status: "error",
			error: {
				code: "ascet_write_missing_parameter",
				message: "set_method_signature requires returnType or at least one argument.",
			},
		};
	}
	if (params.action === "set_element_dependency" && params.targetKind === "folder" && params.match !== "all") {
		return {
			status: "error",
			error: {
				code: "ascet_write_invalid_scope",
				message: 'set_element_dependency folder writes require match="all" to modify multiple candidates.',
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
			return withWriteCode(params, (codeFile) =>
				runApprovedAscetSetMethodCode({ ...params, codeFile }, options, ctx),
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
		case "set_element_dependency":
			if (!params.targetPath) {
				throw new Error("set_element_dependency requires targetPath after validation.");
			}
			return runApprovedAscetSetElementDependency({ ...params, targetPath: params.targetPath }, options, ctx);
	}
}

export function formatAscetWriteResult(result: AscetWriteResult): string {
	return result.content[0]?.text ?? "";
}
