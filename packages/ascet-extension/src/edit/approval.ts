export interface AscetEditApprovalContext {
	hasUI?: boolean;
	ui?: {
		confirm(title: string, message: string, opts?: { signal?: AbortSignal; timeout?: number }): Promise<boolean>;
	};
}

export type AscetEditErrorPrefix = "ascet_edit" | "ascet_batch_write" | "configure_parameter_dependency_chain";

type AscetEditApprovalFailureKind =
	| "approval_required"
	| "confirmation_not_granted"
	| "operation_aborted_before_write"
	| "confirmation_ui_failed";

export type AscetEditApprovalFailure = {
	approved: false;
	code: `${AscetEditErrorPrefix}_${AscetEditApprovalFailureKind}`;
	message: string;
};

export interface AscetEditApprovalRequest {
	title: string;
	message: string;
	signal?: AbortSignal;
	errorPrefix?: AscetEditErrorPrefix;
}

export type AscetEditApprovalResult = { approved: true; approvedAt: string } | AscetEditApprovalFailure;

export function createAscetEditApprovalResultData(approval: AscetEditApprovalFailure): Record<string, unknown> {
	return {
		writeExecuted: false,
		confirmation: { code: approval.code },
		mutation: { status: "not_started" },
	};
}

export function isAscetEditApprovalBlockedCode(code: string): boolean {
	return (
		code.endsWith("_approval_required") ||
		code.endsWith("_confirmation_not_granted") ||
		code.endsWith("_operation_aborted_before_write") ||
		code.endsWith("_confirmation_ui_failed")
	);
}

export async function requestAscetEditApproval(
	request: AscetEditApprovalRequest,
	ctx: AscetEditApprovalContext,
): Promise<AscetEditApprovalResult> {
	const errorPrefix = request.errorPrefix ?? "ascet_edit";
	const approval = await requestAscetMutationApproval(request, ctx);
	if (approval.status === "approved") return { approved: true, approvedAt: approval.approvedAt };
	if (approval.status === "ui_unavailable") {
		return {
			approved: false,
			code: `${errorPrefix}_approval_required`,
			message: "This operation requires an interactive approval channel.",
		};
	}
	if (approval.status === "cancelled") {
		return {
			approved: false,
			code: `${errorPrefix}_operation_aborted_before_write`,
			message: "The operation was cancelled before mutation began.",
		};
	}
	if (approval.status === "ui_failed") {
		return {
			approved: false,
			code: `${errorPrefix}_confirmation_ui_failed`,
			message: `ASCET edit confirmation UI failed: ${approval.message}`,
		};
	}
	return {
		approved: false,
		code: `${errorPrefix}_confirmation_not_granted`,
		message: "ASCET edit confirmation was not granted.",
	};
}

export type AscetMutationApprovalResult =
	| { status: "approved"; approvedAt: string }
	| { status: "rejected" }
	| { status: "cancelled" }
	| { status: "ui_unavailable" }
	| { status: "ui_failed"; message: string };

export interface AscetMutationApprovalRequest {
	title: string;
	message: string;
	signal?: AbortSignal;
}

export async function requestAscetMutationApproval(
	request: AscetMutationApprovalRequest,
	ctx: AscetEditApprovalContext,
): Promise<AscetMutationApprovalResult> {
	if (!ctx.hasUI || !ctx.ui?.confirm) return { status: "ui_unavailable" };
	if (request.signal?.aborted) return { status: "cancelled" };
	try {
		const approved = await ctx.ui.confirm(request.title, request.message, { signal: request.signal });
		if (request.signal?.aborted) return { status: "cancelled" };
		return approved ? { status: "approved", approvedAt: new Date().toISOString() } : { status: "rejected" };
	} catch (error) {
		if (request.signal?.aborted) return { status: "cancelled" };
		return { status: "ui_failed", message: error instanceof Error ? error.message : String(error) };
	}
}
