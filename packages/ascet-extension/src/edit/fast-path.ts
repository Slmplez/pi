import { Value } from "typebox/value";
import { buildApplyProjectFormulaArgs } from "../apply-project-formula.ts";
import { type AscetCliJsonResult, type RunAscetCliJsonOptions, runAscetCliJson } from "../cli.ts";
import { normalizeAscetPath } from "../core/path.ts";
import { withInlineCodeFile } from "../core/temp-files.ts";
import { buildCreateComponentArgs } from "../create-component.ts";
import { buildCreateFolderArgs } from "../create-folder.ts";
import { buildCreateMethodArgs } from "../create-method.ts";
import { buildDeleteComponentArgs } from "../delete-component.ts";
import { buildDeleteFolderArgs } from "../delete-folder.ts";
import { buildDeleteMethodArgs } from "../delete-method.ts";
import { normalizeAscetElementSpec } from "../element-spec-contract.ts";
import { getAscetArtifactRoot } from "../observation-store.ts";
import { evaluateAscetPermission } from "../permissions/evaluate.ts";
import { type AscetPermissionSnapshot, resolveAscetPermissionSnapshot } from "../permissions/types.ts";
import { buildSetElementDependencyArgs } from "../set-element-dependency.ts";
import { buildSetEnumeratorsArgs } from "../set-enumerators.ts";
import { buildSetMethodCodeArgs } from "../set-method-code.ts";
import { buildSetMethodSignatureArgs, createMethodSignatureSpec } from "../set-method-signature.ts";
import { buildSetModuleCodeArgs } from "../set-module-code.ts";
import { buildSetStateMachineCodeArgs } from "../set-state-machine-code.ts";
import { openAiObjectUnionSchema } from "../tools/_shared/openai-schema.ts";
import { ascetMutationActionSchemas } from "../tools/actions/contracts/edit.ts";
import type { AscetEditApprovalContext } from "./approval.ts";
import { requestAscetEditApproval } from "./approval.ts";
import type { RunAscetEditOperationOptions } from "./common.ts";
import { getAscetEditAction } from "./contract.ts";
import { removeTemporaryElementSpec, writeTemporaryElementSpec } from "./element-spec-plan.ts";
import type { AscetMutationResultEnvelope } from "./mutation-result.ts";
import {
	getAscetMutationPermissionEvidence,
	normalizeAscetMutationParams,
	validateAscetMutationParams,
} from "./mutation-validation.ts";
import { extractBridgeActionPayload, isCanonicalMutationSuccess } from "./result-contract.ts";
import type { AscetMutationParams } from "./service.ts";

type FastContext = AscetEditApprovalContext & { ascetPermission?: AscetPermissionSnapshot };

export interface FastMutationLifecycle {
	beforeBridge: boolean;
	bridgeEntered: boolean;
	backendResponseReceived: boolean;
	permission?: AscetMutationResultEnvelope["permission"];
	audit?: AscetMutationResultEnvelope["audit"];
}

const mutationSchema = openAiObjectUnionSchema<AscetMutationParams>(ascetMutationActionSchemas);

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function targetPath(params: AscetMutationParams): string | undefined {
	switch (params.action) {
		case "create_folder":
		case "delete_folder":
			return params.folderPath;
		case "create_component":
		case "create_method":
		case "set_method_signature":
		case "delete_component":
		case "delete_method":
		case "set_method_code":
		case "set_enumerators":
			return params.componentPath;
		case "set_module_code":
			return params.modulePath;
		case "set_state_machine_code":
			return params.stateMachinePath;
		case "apply_element_spec":
			return params.componentPath;
		case "apply_project_formula":
			return params.projectPath;
		case "set_element_dependency":
			return params.targetPath ?? params.componentPath;
	}
}

function invalid(message: string, code = "ascet_edit_invalid_parameter"): AscetCliJsonResult {
	return {
		ok: false,
		data: null,
		request: { cwd: "", cliPath: "", args: [] },
		stdout: "",
		stderr: "",
		exitCode: null,
		timedOut: false,
		error: {
			code,
			message,
			details: { mutationStatus: "not_started", verificationStatus: "not_applicable" },
		},
	};
}

function permissionPath(params: AscetMutationParams): string | undefined {
	const path = targetPath(params);
	return path ? normalizeAscetPath(path) : undefined;
}

async function authorize(
	params: AscetMutationParams,
	options: RunAscetEditOperationOptions,
	ctx: FastContext,
	lifecycle: FastMutationLifecycle,
): Promise<AscetCliJsonResult | undefined> {
	const descriptor = getAscetEditAction(params.action)?.permission;
	if (!descriptor) return undefined;
	const snapshot = resolveAscetPermissionSnapshot(ctx);
	const evidence = getAscetMutationPermissionEvidence(params);
	const path = permissionPath(params);
	const databaseFingerprintKnown = snapshot.databaseFingerprint !== undefined;
	const databaseFingerprintSource =
		snapshot.databaseFingerprintSource ?? (databaseFingerprintKnown ? "caller" : "unavailable");
	lifecycle.audit = {
		databaseFingerprintKnown,
		databaseFingerprintSource,
		...(snapshot.databaseFingerprint ? { databaseFingerprint: snapshot.databaseFingerprint } : {}),
	};
	const decision = evaluateAscetPermission({
		mode: snapshot.mode,
		action: params.action,
		descriptor,
		rules: snapshot.rules,
		path,
		databaseFingerprint: snapshot.databaseFingerprint,
		hardGatesPassed: true,
		evidenceComplete: evidence.evidenceComplete,
		targetCount: evidence.targetCount,
		variantCount: evidence.variantCount,
		impactUnknown: evidence.impactUnknown,
	});
	lifecycle.permission = {
		mode: snapshot.mode,
		decision: decision.behavior,
		risk: decision.risk,
		reason: decision.reason,
		rule: decision.rule,
		...(path ? { path } : {}),
		databaseFingerprintKnown,
		databaseFingerprintSource,
		evidenceComplete: evidence.evidenceComplete,
		...(evidence.targetCount === undefined ? {} : { targetCount: evidence.targetCount }),
		...(evidence.variantCount === undefined ? {} : { variantCount: evidence.variantCount }),
		impactUnknown: evidence.impactUnknown,
	};
	if (decision.behavior === "deny") {
		return invalid(decision.reason, "ascet_edit_permission_denied");
	}
	if (decision.behavior !== "ask") return undefined;
	const approval = await requestAscetEditApproval(
		{
			title: "Confirm ASCET edit",
			message: `Target: ${permissionPath(params) ?? params.action}`,
			signal: options.signal,
		},
		ctx,
	);
	if (approval.approved) {
		lifecycle.audit = { ...lifecycle.audit, approvedAt: approval.approvedAt };
		return undefined;
	}
	return {
		...invalid(approval.message),
		error: { code: approval.code, message: approval.message },
	};
}

function writeOptions(options: RunAscetEditOperationOptions, action: string): RunAscetCliJsonOptions {
	return { ...options, toolName: "ascet_edit", commandId: action, jobKind: "write" };
}
async function dispatch(
	params: AscetMutationParams,
	options: RunAscetEditOperationOptions,
): Promise<AscetCliJsonResult> {
	switch (params.action) {
		case "create_folder":
			return runAscetCliJson(
				buildCreateFolderArgs({ ...params, verifyReadback: true }),
				writeOptions(options, params.action),
			);
		case "create_component":
			return runAscetCliJson(
				buildCreateComponentArgs({ ...params, verifyReadback: true }),
				writeOptions(options, params.action),
			);
		case "create_method":
			return runAscetCliJson(
				buildCreateMethodArgs({ ...params, verifyReadback: true }),
				writeOptions(options, params.action),
			);
		case "set_method_signature":
			if (params.arguments?.length) {
				return withInlineCodeFile(
					{ code: JSON.stringify(createMethodSignatureSpec(params), null, 2), prefix: "set_method_signature" },
					(file) =>
						runAscetCliJson(
							buildSetMethodSignatureArgs({ ...params, verifyReadback: true }, file),
							writeOptions(options, params.action),
						),
				);
			}
			return runAscetCliJson(
				buildSetMethodSignatureArgs({ ...params, verifyReadback: true }),
				writeOptions(options, params.action),
			);
		case "delete_component":
			return runAscetCliJson(
				buildDeleteComponentArgs({ ...params, verifyReadback: true }),
				writeOptions(options, params.action),
			);
		case "delete_method":
			return runAscetCliJson(
				buildDeleteMethodArgs({ ...params, verifyReadback: true }),
				writeOptions(options, params.action),
			);
		case "delete_folder":
			return runAscetCliJson(
				buildDeleteFolderArgs({ ...params, verifyReadback: true }),
				writeOptions(options, params.action),
			);
		case "set_method_code":
			return withInlineCodeFile({ code: params.code, codeFile: params.codeFile, prefix: params.action }, (file) =>
				runAscetCliJson(
					buildSetMethodCodeArgs({ ...params, codeFile: file, verifyReadback: true }),
					writeOptions(options, params.action),
				),
			);
		case "set_module_code":
			return withInlineCodeFile({ code: params.code, codeFile: params.codeFile, prefix: params.action }, (file) =>
				runAscetCliJson(
					buildSetModuleCodeArgs({
						...params,
						operation: params.operation!,
						codeFile: file,
						verifyReadback: true,
					}),
					writeOptions(options, params.action),
				),
			);
		case "set_state_machine_code":
			if (params.code !== undefined || params.codeFile !== undefined) {
				return withInlineCodeFile({ code: params.code, codeFile: params.codeFile, prefix: params.action }, (file) =>
					runAscetCliJson(
						buildSetStateMachineCodeArgs({ ...params, codeFile: file, verifyReadback: true }),
						writeOptions(options, params.action),
					),
				);
			}
			return runAscetCliJson(
				buildSetStateMachineCodeArgs({ ...params, verifyReadback: true }),
				writeOptions(options, params.action),
			);
		case "set_enumerators":
			return runAscetCliJson(
				buildSetEnumeratorsArgs({ ...params, verifyReadback: true }),
				writeOptions(options, params.action),
			);
		case "apply_element_spec": {
			const spec =
				params.elementIntent === "patch"
					? { elements: params.elements.map(({ role: _role, ...element }) => element) }
					: normalizeAscetElementSpec(params.elementIntent, params.elements, []).spec;
			const specFile = writeTemporaryElementSpec(
				spec,
				getAscetArtifactRoot(options.env as NodeJS.ProcessEnv | undefined),
			);
			try {
				const args = ["exec", "apply_element_spec", normalizeAscetPath(params.componentPath), specFile];
				if (params.projectPath) args.push("--project-path", normalizeAscetPath(params.projectPath));
				if (params.elementIntent === "restore") args.push("--mode", "restore");
				if (params.deleteMissing) args.push("--delete-missing");
				if (params.recreateIncompatible) args.push("--recreate-incompatible");
				args.push("--verify-readback", "--json");
				return await runAscetCliJson(args, writeOptions(options, params.action));
			} finally {
				removeTemporaryElementSpec(specFile);
			}
		}
		case "apply_project_formula":
			return runAscetCliJson(
				buildApplyProjectFormulaArgs({ ...params, verifyReadback: true }),
				writeOptions(options, params.action),
			);
		case "set_element_dependency":
			return runAscetCliJson(
				buildSetElementDependencyArgs({
					...params,
					targetPath: params.targetPath!,
					elementName: params.elementName!,
					dependency: params.dependency!,
					dryRun: false,
					verifyReadback: true,
				}),
				writeOptions(options, params.action),
			);
	}
}

function normalizeResult(raw: AscetCliJsonResult): AscetCliJsonResult {
	const payload = extractBridgeActionPayload(raw.data);
	if (!raw.ok) return payload ? { ...raw, data: payload } : raw;
	if (payload && isCanonicalMutationSuccess(payload)) return { ...raw, data: payload };

	const changed = payload?.changed;
	const mutationStatus = payload?.mutationStatus;
	const saveAttempted = payload?.saveAttempted;
	const saveSucceeded = payload?.saveSucceeded;
	const saveState = payload?.saveState;
	const verified = payload?.verified;
	const verificationStatus = payload?.verificationStatus;
	const verificationMode = payload?.verificationMode;
	const sessionCount = payload?.sessionCount;
	const saveCount = payload?.saveCount;
	const editableRetryCount = payload?.editableRetryCount;
	const nativeMutationAttemptCount = payload?.nativeMutationAttemptCount;
	const saveFailed = saveState === "failed" || (saveAttempted === true && saveSucceeded === false);
	const verificationFailed = verified === false || verificationStatus === "failed";
	const saveEvidenceMissing =
		mutationStatus === "applied" &&
		(saveAttempted !== true || saveSucceeded !== true || saveState !== "saved" || saveCount !== 1);
	const code = saveFailed
		? "ascet_edit_save_failed"
		: verificationFailed
			? "ascet_edit_readback_failed"
			: saveEvidenceMissing
				? "ascet_edit_save_state_missing"
				: "ascet_edit_canonical_evidence_invalid";
	return {
		...raw,
		ok: false,
		data: payload ?? null,
		error: {
			code,
			message:
				code === "ascet_edit_save_failed"
					? "ASCET write did not prove that the database save completed."
					: code === "ascet_edit_readback_failed"
						? "ASCET write completed without proven same-session verification."
						: "ASCET write omitted or contradicted canonical mutation, Save, verification, or session evidence.",
			details: {
				changed,
				mutationStatus,
				saveAttempted,
				saveSucceeded,
				saveState,
				verified,
				verificationStatus,
				verificationMode,
				sessionCount,
				saveCount,
				editableRetryCount,
				nativeMutationAttemptCount,
			},
		},
	};
}

export async function runAscetFastMutation(
	input: AscetMutationParams,
	options: RunAscetEditOperationOptions,
	ctx: FastContext,
	lifecycle: FastMutationLifecycle,
): Promise<AscetCliJsonResult> {
	if (!isRecord(input) || input.intent !== "apply") {
		return invalid(
			"intent=apply is required for ascet_edit writes; use mode=check for read-only editability inspection.",
		);
	}
	if (!Value.Check(mutationSchema, input)) return invalid("Invalid parameters for ascet_edit action.");
	const params = normalizeAscetMutationParams(input);
	if (!Value.Check(mutationSchema, params)) return invalid("Invalid parameters for ascet_edit action.");
	const validationError = validateAscetMutationParams(params, { cwd: options.cwd });
	if (validationError) return invalid(validationError.message, validationError.code);
	const blocked = await authorize(params, options, ctx, lifecycle);
	if (blocked) return blocked;
	return normalizeResult(
		await dispatch(params, {
			...options,
			onLifecycle: (event) => {
				if (event.stage === "before_bridge") lifecycle.beforeBridge = true;
				if (event.stage === "bridge_entered") lifecycle.bridgeEntered = true;
				if (event.stage === "backend_response_received") lifecycle.backendResponseReceived = true;
				options.onLifecycle?.(event);
			},
		}),
	);
}
