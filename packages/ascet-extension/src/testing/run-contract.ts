import {
	ASCET_TEST_RUN_SCHEMA,
	ASCET_TEST_VERIFY_SCHEMA,
	type AscetTestRunOptions,
	type AscetTestRunResult,
	type AscetTestVerificationOptions,
	type AscetTestVerifyResult,
	type AscetValidationIssue,
	type AscetValidationResult,
} from "./contracts.ts";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 600_000;

export function validateAscetRunOptions(
	value: unknown,
): AscetValidationResult<Required<Pick<AscetTestRunOptions, "timeoutMs">> & AscetTestRunOptions> {
	const errors: AscetValidationIssue[] = [];
	const record = asRecord(value) ?? {};
	const timeoutMs = record.timeoutMs === undefined ? DEFAULT_TIMEOUT_MS : record.timeoutMs;
	if (typeof timeoutMs !== "number" || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_TIMEOUT_MS) {
		errors.push(issue("run.timeoutMs", "invalid_timeout", "timeoutMs must be an integer between 1 and 600000."));
	}
	const args = validateStringList(record.args, "run.args", errors);
	const runtimePath = validateRuntimePaths(record.runtimePath, errors);
	if (errors.length > 0) return { errors, warnings: [] };
	return { errors, warnings: [], value: { timeoutMs: timeoutMs as number, args, runtimePath } };
}

export function validateAscetRunRequest(value: unknown): AscetValidationResult<{
	runId: string;
	buildResultPath: string;
	run: Required<Pick<AscetTestRunOptions, "timeoutMs">> & AscetTestRunOptions;
}> {
	const errors: AscetValidationIssue[] = [];
	const record = asRecord(value);
	if (!record) return { errors: [issue("$", "request_shape", "Run request must be an object.")], warnings: [] };
	const runId = requiredString(record.runId, "runId", errors);
	const buildResultPath = requiredString(record.buildResultPath, "buildResultPath", errors);
	const run = validateAscetRunOptions(record.run);
	errors.push(...run.errors);
	if (errors.length > 0) return { errors, warnings: run.warnings };
	return {
		errors,
		warnings: run.warnings,
		value: { runId: runId!, buildResultPath: buildResultPath!, run: run.value! },
	};
}

export function validateAscetVerificationOptions(
	value: unknown,
): AscetValidationResult<Required<Pick<AscetTestVerificationOptions, "profile">> & AscetTestVerificationOptions> {
	const errors: AscetValidationIssue[] = [];
	const record = asRecord(value) ?? {};
	const profile = record.profile === undefined ? "offline" : record.profile;
	if (profile !== "offline" && profile !== "live")
		errors.push(issue("verification.profile", "invalid_profile", "profile must be offline or live."));
	const esdlReadbackPath = optionalSafePath(record.esdlReadbackPath, "verification.esdlReadbackPath", errors);
	const exportManifestPath = optionalSafePath(record.exportManifestPath, "verification.exportManifestPath", errors);
	if (profile === "live" && !esdlReadbackPath)
		errors.push(
			issue(
				"verification.esdlReadbackPath",
				"readback_required",
				"live verification requires ESDL readback evidence.",
			),
		);
	if (errors.length > 0) return { errors, warnings: [] };
	return {
		errors,
		warnings: [],
		value: {
			profile: profile as "offline" | "live",
			requireEsdlReadback: record.requireEsdlReadback === true,
			requireExport: record.requireExport === true,
			requireCaseCoverage: record.requireCaseCoverage === true,
			esdlReadbackPath,
			exportManifestPath,
		},
	};
}

export function isPassedRunResult(value: unknown): value is AscetTestRunResult {
	const record = asRecord(value);
	return (
		record?.schemaVersion === ASCET_TEST_RUN_SCHEMA &&
		record.status === "passed" &&
		record.exitCode === 0 &&
		record.xmlValid === true &&
		numberAtLeast(record.testsRun, 1) &&
		record.failures === 0 &&
		record.errors === 0
	);
}

export function isPassedVerifyResult(value: unknown): value is AscetTestVerifyResult {
	const record = asRecord(value);
	return (
		record?.schemaVersion === ASCET_TEST_VERIFY_SCHEMA &&
		record.status === "verified" &&
		record.verdict === "passed" &&
		Array.isArray(record.checks) &&
		record.failureCode === ""
	);
}

function validateStringList(value: unknown, path: string, errors: AscetValidationIssue[]): string[] {
	if (value === undefined) return [];
	if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
		errors.push(issue(path, "invalid_list", `${path} must be an array of strings.`));
		return [];
	}
	return value.map((entry) => entry.trim()).filter(Boolean);
}

function validateRuntimePaths(value: unknown, errors: AscetValidationIssue[]): string[] {
	const values = validateStringList(value, "run.runtimePath", errors);
	for (const entry of values) {
		if (entry.includes(".."))
			errors.push(issue("run.runtimePath", "unsafe_path", "runtimePath must not contain '..'."));
	}
	return values;
}

function optionalSafePath(value: unknown, path: string, errors: AscetValidationIssue[]): string | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== "string" || !value.trim() || value.includes("..")) {
		errors.push(issue(path, "unsafe_path", `${path} must be a non-empty path without '..'.`));
		return undefined;
	}
	return value.trim();
}

function requiredString(value: unknown, path: string, errors: AscetValidationIssue[]): string | undefined {
	if (typeof value !== "string" || !value.trim()) {
		errors.push(issue(path, "required", `${path} is required.`));
		return undefined;
	}
	return value.trim();
}

function numberAtLeast(value: unknown, minimum: number): value is number {
	return typeof value === "number" && Number.isFinite(value) && value >= minimum;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function issue(path: string, code: string, message: string): AscetValidationIssue {
	return { path, code, message };
}
