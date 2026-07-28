export interface AscetEditApprovalContext {
	hasUI?: boolean;
	ui?: {
		confirm(title: string, message: string, opts?: { signal?: AbortSignal; timeout?: number }): Promise<boolean>;
	};
}

export type AscetEditErrorPrefix = "ascet_edit" | "ascet_batch_write";

export interface AscetEditApprovalRequest {
	executeWrite?: boolean;
	title: string;
	message: string;
	signal?: AbortSignal;
	errorPrefix?: AscetEditErrorPrefix;
}

export interface AscetEditApprovalResult {
	approved: boolean;
	code?: `${AscetEditErrorPrefix}_${"preflight_required" | "ui_required" | "rejected"}`;
	message?: string;
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

	const approved = await ctx.ui.confirm(request.title, request.message, {
		signal: request.signal,
		timeout: 30_000,
	});
	if (!approved) {
		return {
			approved: false,
			code: `${errorPrefix}_rejected`,
			message: "ASCET edit was rejected by the user.",
		};
	}

	return { approved: true };
}
