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

export interface AscetSetEnumeratorsParams extends AscetWriteControlParams {
	componentPath: string;
	enumerators: string[];
}

export type RunAscetSetEnumeratorsOptions = RunAscetWriteOperationOptions;
export type AscetSetEnumeratorsResult = AscetCliJsonResult;

export function buildSetEnumeratorsArgs(params: AscetSetEnumeratorsParams): string[] {
	return appendVerifyAndJson(
		["exec", "set_enumerators", normalizeAscetPath(params.componentPath), "--items", params.enumerators.join(",")],
		params.verifyReadback,
	);
}

export function createSetEnumeratorsSummary(params: AscetSetEnumeratorsParams): string {
	return createWriteSummary("set_enumerators", {
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
	return runAscetCliJson(buildSetEnumeratorsArgs(params), {
		...options,
		toolName: "ascet_write",
		commandId: "set_enumerators",
		jobKind: "write",
	});
}

export async function runApprovedAscetSetEnumerators(
	params: AscetSetEnumeratorsParams,
	options: RunAscetSetEnumeratorsOptions,
	ctx: AscetWriteApprovalContext,
): Promise<AscetSetEnumeratorsResult> {
	return runApprovedAscetWriteOperation(
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
	return formatWriteOperationResult("set_enumerators", result);
}
