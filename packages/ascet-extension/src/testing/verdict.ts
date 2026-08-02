export interface VerificationCheck {
	id: string;
	status: "passed" | "failed";
	code?: string;
	message?: string;
	evidencePath?: string;
}

export interface VerificationSummary {
	verdict: "passed" | "failed";
	failureCode: string;
	firstFailure: VerificationCheck | null;
}

export function summarizeVerificationChecks(checks: VerificationCheck[]): VerificationSummary {
	if (checks.length === 0) {
		return { verdict: "failed", failureCode: "evidence_invalid", firstFailure: null };
	}
	const firstFailure = checks.find((check) => check.status === "failed") ?? null;
	if (firstFailure) {
		return {
			verdict: "failed",
			failureCode: firstFailure.code?.trim() || "evidence_invalid",
			firstFailure,
		};
	}
	return { verdict: "passed", failureCode: "", firstFailure: null };
}
