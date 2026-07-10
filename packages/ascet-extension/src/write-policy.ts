export interface AscetWriteApprovalContext {
	hasUI?: boolean;
	ui?: {
		confirm(title: string, message: string, opts?: { signal?: AbortSignal; timeout?: number }): Promise<boolean>;
	};
}

export interface AscetWriteApprovalRequest {
	executeWrite?: boolean;
	title: string;
	message: string;
	signal?: AbortSignal;
}

export interface AscetWriteApprovalResult {
	approved: boolean;
	code?: "ascet_write_preflight_required" | "ascet_write_ui_required" | "ascet_write_rejected";
	message?: string;
}

export async function requestAscetWriteApproval(
	request: AscetWriteApprovalRequest,
	ctx: AscetWriteApprovalContext,
): Promise<AscetWriteApprovalResult> {
	if (!request.executeWrite) {
		return {
			approved: false,
			code: "ascet_write_preflight_required",
			message: "ASCET write was not executed. Re-run with executeWrite=true to request interactive confirmation.",
		};
	}

	if (!ctx.hasUI || !ctx.ui?.confirm) {
		return {
			approved: false,
			code: "ascet_write_ui_required",
			message: "ASCET write requires interactive confirmation; this context has no confirmation UI.",
		};
	}

	const approved = await ctx.ui.confirm(request.title, request.message, {
		signal: request.signal,
		timeout: 30_000,
	});
	if (!approved) {
		return {
			approved: false,
			code: "ascet_write_rejected",
			message: "ASCET write was rejected by the user.",
		};
	}

	return { approved: true };
}
