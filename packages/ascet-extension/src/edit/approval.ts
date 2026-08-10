export interface AscetEditApprovalContext {
	hasUI?: boolean;
	ui?: {
		confirm(title: string, message: string, opts?: { signal?: AbortSignal; timeout?: number }): Promise<boolean>;
	};
}

export type AscetEditErrorPrefix = "ascet_edit" | "ascet_batch_write" | "configure_parameter_dependency_chain";

type AscetEditApprovalFailureKind =
	| "preflight_required"
	| "ui_required"
	| "confirmation_not_granted"
	| "operation_aborted_before_write"
	| "confirmation_ui_failed";

export type AscetEditApprovalFailure = {
	approved: false;
	code: `${AscetEditErrorPrefix}_${AscetEditApprovalFailureKind}`;
	message: string;
};

export interface AscetEditApprovalRequest {
	executeWrite?: boolean;
	title: string;
	message: string;
	signal?: AbortSignal;
	errorPrefix?: AscetEditErrorPrefix;
}

export type AscetEditApprovalResult = { approved: true } | AscetEditApprovalFailure;

export function createAscetEditApprovalResultData(approval: AscetEditApprovalFailure): Record<string, unknown> {
	if (approval.code.endsWith("_preflight_required")) {
		return { preflightOnly: true };
	}
	return {
		writeExecuted: false,
		confirmation: { code: approval.code },
	};
}

export function isAscetEditApprovalBlockedCode(code: string): boolean {
	return (
		code.endsWith("_ui_required") ||
		code.endsWith("_confirmation_not_granted") ||
		code.endsWith("_operation_aborted_before_write")
	);
}

export async function requestAscetEditApproval(
	request: AscetEditApprovalRequest,
	ctx: AscetEditApprovalContext,
): Promise<AscetEditApprovalResult> {
	const errorPrefix = request.errorPrefix ?? "ascet_edit";
	if (!request.executeWrite) {
		return {
			approved: false,
			code: `${errorPrefix}_preflight_required`,
			message: "ASCET edit was not executed. Re-run with executeWrite=true to request interactive confirmation.",
		};
	}

	if (!ctx.hasUI || !ctx.ui?.confirm) {
		return {
			approved: false,
			code: `${errorPrefix}_ui_required`,
			message: "ASCET edit requires interactive confirmation; this context has no confirmation UI.",
		};
	}

	let approved: boolean;
	try {
		approved = await ctx.ui.confirm(request.title, request.message, {
			timeout: 30_000,
		});
	} catch (error) {
		return {
			approved: false,
			code: `${errorPrefix}_confirmation_ui_failed`,
			message: `ASCET edit confirmation UI failed: ${error instanceof Error ? error.message : String(error)}`,
		};
	}

	if (request.signal?.aborted) {
		return {
			approved: false,
			code: `${errorPrefix}_operation_aborted_before_write`,
			message: "ASCET edit was not started because its tool run was cancelled before the write could begin.",
		};
	}

	if (!approved) {
		return {
			approved: false,
			code: `${errorPrefix}_confirmation_not_granted`,
			message: "ASCET edit confirmation was not granted.",
		};
	}

	return { approved: true };
}
