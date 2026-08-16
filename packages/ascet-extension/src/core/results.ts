export type AscetToolOutcome<T = unknown> =
	| { status: "ok"; data: T; warnings: string[]; verified?: boolean }
	| { status: "preflight"; plan: Record<string, unknown>; nextStep?: string }
	| { status: "partial"; data: T; failures: Array<Record<string, unknown>> }
	| { status: "blocked"; code: string; message: string }
	| { status: "error"; error: { code: string; message: string } };

export function createPreflightOutcome(plan: Record<string, unknown>): AscetToolOutcome {
	return {
		status: "preflight",
		plan,
		nextStep: "Preview complete. No ASCET mutation was performed.",
	};
}

export function isAscetOutcome(value: unknown): value is AscetToolOutcome {
	return !!value && typeof value === "object" && "status" in value;
}
