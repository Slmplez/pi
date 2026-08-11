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
import {
	compareAscetEnumerationReadback,
	parseAscetAutomaticEnumerationReadback,
} from "./read/enumeration-readback.ts";

export interface AscetSetEnumeratorsParams extends AscetEditControlParams {
	componentPath: string;
	enumerators: string[];
}

export type RunAscetSetEnumeratorsOptions = RunAscetEditOperationOptions;
export type AscetSetEnumeratorsResult = AscetCliJsonResult;

export function buildSetEnumeratorsArgs(params: AscetSetEnumeratorsParams): string[] {
	return appendVerifyAndJson(
		["exec", "set_enumerators", normalizeAscetPath(params.componentPath), "--items", params.enumerators.join(",")],
		params.verifyReadback,
	);
}

export function createSetEnumeratorsSummary(params: AscetSetEnumeratorsParams): string {
	return createAscetEditSummary("set_enumerators", {
		componentPath: params.componentPath,
		enumeratorCount: params.enumerators.length,
		enumerators: params.enumerators.join(","),
		verifyReadback: params.verifyReadback === true,
	});
}

export async function runAscetSetEnumerators(
	params: AscetSetEnumeratorsParams,
	options: RunAscetSetEnumeratorsOptions,
): Promise<AscetSetEnumeratorsResult> {
	const result = await runAscetCliJson(buildSetEnumeratorsArgs(params), {
		...options,
		toolName: "ascet_edit",
		commandId: "set_enumerators",
		jobKind: "write",
	});
	if (!result.ok || params.verifyReadback !== true) return result;
	const readback = parseAscetAutomaticEnumerationReadback(result.data);
	const comparison = compareAscetEnumerationReadback(params.enumerators, readback?.enumerators ?? []);
	if (readback && comparison.matches) return result;
	return {
		...result,
		ok: false,
		stage: "result",
		error: {
			code: "readback_mismatch",
			message: "set_enumerators automatic readback did not match the requested enumerator names and order.",
			operation: "set_enumerators",
			stage: "automatic_readback",
			details: { ...comparison, requiresReadback: true },
		},
	};
}

export async function runApprovedAscetSetEnumerators(
	params: AscetSetEnumeratorsParams,
	options: RunAscetSetEnumeratorsOptions,
	ctx: AscetEditApprovalContext,
): Promise<AscetSetEnumeratorsResult> {
	return runApprovedAscetEditOperation(
		"set_enumerators",
		params,
		options,
		ctx,
		buildSetEnumeratorsArgs,
		createSetEnumeratorsSummary(params),
		"Confirm ASCET enumeration write",
	);
}

export function formatSetEnumeratorsResult(result: AscetSetEnumeratorsResult): string {
	return formatAscetEditOperationResult("set_enumerators", result);
}
