import {
	ASCET_TEST_CONTRACT_SCHEMA,
	ASCET_TEST_REQUEST_SCHEMA,
	type AscetTestCaseContract,
	type AscetTestContract,
	type AscetTestLevel,
	type AscetTestOracleSource,
	type AscetTestRequestDocument,
	type AscetTestSuiteContract,
	type AscetValidationIssue,
	type AscetValidationResult,
} from "./contracts.ts";

export function validateAscetTestRequest(value: unknown): AscetValidationResult<AscetTestRequestDocument> {
	const errors: AscetValidationIssue[] = [];
	const warnings: AscetValidationIssue[] = [];
	const record = asRecord(value);
	if (!record) {
		return { errors: [issue("$", "request_shape", "Request root must be an object.")], warnings };
	}

	if (record.schemaVersion !== ASCET_TEST_REQUEST_SCHEMA) {
		errors.push(issue("schemaVersion", "schema_version", `schemaVersion must be ${ASCET_TEST_REQUEST_SCHEMA}.`));
	}
	const runId = requiredString(record.runId, "runId", errors);
	const componentPath = validateRelativePath(record.componentPath, "componentPath", errors);
	const levels = validateLevels(record.levels, errors);
	const contract =
		record.contract === undefined ? undefined : validateContract(record.contract, errors, warnings).value;
	if (record.contract === undefined && !isNonEmptyString(record.testContractPath)) {
		errors.push(issue("contract", "contract_missing", "Provide contract or testContractPath."));
	}
	if (record.executeLive === true && !isNonEmptyString(record.approvedRevisionId)) {
		errors.push(issue("approvedRevisionId", "approval_missing", "executeLive requires approvedRevisionId."));
	}

	if (errors.length > 0) {
		return { errors, warnings };
	}
	return {
		errors,
		warnings,
		value: {
			schemaVersion: ASCET_TEST_REQUEST_SCHEMA,
			runId: runId!,
			componentPath: componentPath!,
			levels: levels!,
			contract,
			testContractPath: isNonEmptyString(record.testContractPath) ? record.testContractPath.trim() : undefined,
			runDirectory: isNonEmptyString(record.runDirectory) ? record.runDirectory.trim() : undefined,
			toolchain: asRecord(record.toolchain) as AscetTestRequestDocument["toolchain"],
			executeLive: record.executeLive === true,
			approvedRevisionId: isNonEmptyString(record.approvedRevisionId) ? record.approvedRevisionId.trim() : undefined,
		},
	};
}

export function validateAscetTestContract(value: unknown): AscetValidationResult<AscetTestContract> {
	const errors: AscetValidationIssue[] = [];
	const warnings: AscetValidationIssue[] = [];
	return validateContract(value, errors, warnings);
}

function validateContract(
	value: unknown,
	errors: AscetValidationIssue[],
	warnings: AscetValidationIssue[],
): AscetValidationResult<AscetTestContract> {
	const record = asRecord(value);
	if (!record) {
		errors.push(issue("contract", "contract_shape", "Contract must be an object."));
		return { errors, warnings };
	}
	if (record.schemaVersion !== ASCET_TEST_CONTRACT_SCHEMA) {
		errors.push(
			issue("contract.schemaVersion", "schema_version", `schemaVersion must be ${ASCET_TEST_CONTRACT_SCHEMA}.`),
		);
	}
	const componentPath = validateRelativePath(record.componentPath, "contract.componentPath", errors);
	const suitesRaw = Array.isArray(record.suites) ? record.suites : undefined;
	if (!suitesRaw || suitesRaw.length === 0) {
		errors.push(issue("contract.suites", "suites_missing", "Contract must contain at least one suite."));
		return { errors, warnings };
	}
	const suites: AscetTestSuiteContract[] = [];
	const suiteIds = new Set<string>();
	for (let index = 0; index < suitesRaw.length; index += 1) {
		const suite = validateSuite(suitesRaw[index], `contract.suites[${index}]`, errors, warnings);
		if (!suite) continue;
		if (suiteIds.has(suite.id)) {
			errors.push(issue(`contract.suites[${index}].id`, "duplicate_suite", `Duplicate suite id '${suite.id}'.`));
		}
		suiteIds.add(suite.id);
		suites.push(suite);
	}
	if (errors.length > 0) return { errors, warnings };
	return {
		errors,
		warnings,
		value: { schemaVersion: ASCET_TEST_CONTRACT_SCHEMA, componentPath: componentPath!, suites },
	};
}

function validateSuite(
	value: unknown,
	path: string,
	errors: AscetValidationIssue[],
	warnings: AscetValidationIssue[],
): AscetTestSuiteContract | undefined {
	const record = asRecord(value);
	if (!record) {
		errors.push(issue(path, "suite_shape", "Suite must be an object."));
		return undefined;
	}
	const id = requiredString(record.id, `${path}.id`, errors);
	const entryPoint = requiredString(record.entryPoint, `${path}.entryPoint`, errors);
	const level = record.level;
	if (!isTestLevel(level)) {
		errors.push(issue(`${path}.level`, "invalid_level", "Suite level must be class_ut or component_ct."));
	}
	const dependencyMode = record.dependencyMode;
	if (dependencyMode !== "stub" && dependencyMode !== "real") {
		errors.push(issue(`${path}.dependencyMode`, "invalid_dependency_mode", "dependencyMode must be stub or real."));
	}
	const cycles = record.cycles === undefined ? 1 : asPositiveInteger(record.cycles);
	if (cycles === undefined) {
		errors.push(issue(`${path}.cycles`, "invalid_cycles", "cycles must be a positive integer."));
	}
	if (level === "class_ut" && dependencyMode !== "stub") {
		errors.push(issue(`${path}.dependencyMode`, "class_ut_dependency_mode", "class_ut requires stub dependencies."));
	}
	if (level === "component_ct" && dependencyMode !== "real") {
		errors.push(
			issue(`${path}.dependencyMode`, "component_ct_dependency_mode", "component_ct requires real dependencies."),
		);
	}
	const casesRaw = Array.isArray(record.cases) ? record.cases : undefined;
	if (!casesRaw || casesRaw.length === 0) {
		errors.push(issue(`${path}.cases`, "cases_missing", "Suite must contain at least one case."));
		return undefined;
	}
	const cases: AscetTestCaseContract[] = [];
	const caseIds = new Set<string>();
	for (let index = 0; index < casesRaw.length; index += 1) {
		const current = validateCase(casesRaw[index], `${path}.cases[${index}]`, errors, warnings);
		if (!current) continue;
		if (caseIds.has(current.id)) {
			errors.push(issue(`${path}.cases[${index}].id`, "duplicate_case", `Duplicate case id '${current.id}'.`));
		}
		caseIds.add(current.id);
		cases.push(current);
	}
	if (!id || !entryPoint || !isTestLevel(level) || (dependencyMode !== "stub" && dependencyMode !== "real"))
		return undefined;
	return { id, level, entryPoint, dependencyMode, cycles, cases };
}

function validateCase(
	value: unknown,
	path: string,
	errors: AscetValidationIssue[],
	warnings: AscetValidationIssue[],
): AscetTestCaseContract | undefined {
	const record = asRecord(value);
	if (!record) {
		errors.push(issue(path, "case_shape", "Case must be an object."));
		return undefined;
	}
	const id = requiredString(record.id, `${path}.id`, errors);
	const steps = record.steps === undefined ? 1 : asPositiveInteger(record.steps);
	if (steps === undefined) errors.push(issue(`${path}.steps`, "invalid_steps", "steps must be a positive integer."));
	const expectedOutputs = asRecord(record.expectedOutputs);
	const expectedSteps = Array.isArray(record.expectedSteps) ? record.expectedSteps : [];
	if ((!expectedOutputs || Object.keys(expectedOutputs).length === 0) && expectedSteps.length === 0) {
		warnings.push(
			issue(path, "trace_only_case", "Case has no expected outputs; it is trace-only and cannot prove pass."),
		);
	}
	const oracleSourceValue = record.oracleSource === undefined ? "derived" : record.oracleSource;
	const oracleSource: AscetTestOracleSource | undefined = isOracleSource(oracleSourceValue)
		? oracleSourceValue
		: undefined;
	if (oracleSource === undefined) {
		errors.push(
			issue(`${path}.oracleSource`, "invalid_oracle_source", "oracleSource must be requirement, derived or trace."),
		);
	}
	if (!id || steps === undefined) return undefined;
	return {
		id,
		steps,
		inputs: asRecord(record.inputs) ?? {},
		expectedOutputs: expectedOutputs ?? {},
		expectedSteps: expectedSteps as AscetTestCaseContract["expectedSteps"],
		tolerances: asRecord(record.tolerances) as Record<string, number> | undefined,
		oracleSource,
		tags: Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === "string") : [],
	};
}

function validateLevels(value: unknown, errors: AscetValidationIssue[]): AscetTestLevel[] | undefined {
	if (!Array.isArray(value) || value.length === 0) {
		errors.push(issue("levels", "levels_missing", "levels must contain at least one level."));
		return undefined;
	}
	const levels: AscetTestLevel[] = [];
	for (let index = 0; index < value.length; index += 1) {
		if (!isTestLevel(value[index])) {
			errors.push(issue(`levels[${index}]`, "invalid_level", "Level must be class_ut or component_ct."));
			continue;
		}
		if (levels.includes(value[index]))
			errors.push(issue(`levels[${index}]`, "duplicate_level", `Duplicate level '${value[index]}'.`));
		levels.push(value[index]);
	}
	return levels;
}

function validateRelativePath(value: unknown, path: string, errors: AscetValidationIssue[]): string | undefined {
	if (!isNonEmptyString(value)) {
		errors.push(issue(path, "required", `${path} is required.`));
		return undefined;
	}
	const normalized = value.trim().replace(/\\/g, "/");
	if (/^[A-Za-z]:\//.test(normalized) || normalized.startsWith("/") || normalized.split("/").includes("..")) {
		errors.push(issue(path, "unsafe_path", `${path} must be a relative ASCET path without '..'.`));
		return undefined;
	}
	return normalized;
}

function requiredString(value: unknown, path: string, errors: AscetValidationIssue[]): string | undefined {
	if (!isNonEmptyString(value)) {
		errors.push(issue(path, "required", `${path} is required.`));
		return undefined;
	}
	return value.trim();
}

function asPositiveInteger(value: unknown): number | undefined {
	return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : undefined;
}

function isTestLevel(value: unknown): value is AscetTestLevel {
	return value === "class_ut" || value === "component_ct";
}

function isOracleSource(value: unknown): value is AscetTestOracleSource {
	return value === "requirement" || value === "derived" || value === "trace";
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function issue(path: string, code: string, message: string): AscetValidationIssue {
	return { path, code, message };
}
