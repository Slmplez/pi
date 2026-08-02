export const ASCET_TEST_REQUEST_SCHEMA = "ascet-test-request/v1" as const;
export const ASCET_TEST_CONTRACT_SCHEMA = "ascet-test-contract/v1" as const;
export const ASCET_INSPECTION_SCHEMA = "ascet-inspection/v1" as const;
export const ASCET_ESDL_DRAFT_SCHEMA = "ascet-esdl-draft/v1" as const;
export const ASCET_ELEMENT_SPEC_SCHEMA = "ascet-element-spec/v1" as const;
export const ASCET_ESDL_APPLY_PLAN_SCHEMA = "ascet-esdl-apply-plan/v1" as const;
export const ASCET_GENERATED_CASES_SCHEMA = "ascet-generated-cases/v1" as const;
export const ASCET_TEST_RUN_SCHEMA = "ascet-test-run/v1" as const;
export const ASCET_TEST_VERIFY_SCHEMA = "ascet-test-verify/v1" as const;

export type AscetTestLevel = "class_ut" | "component_ct";
export type AscetTestDependencyMode = "stub" | "real";
export type AscetTestOracleSource = "requirement" | "derived" | "trace";
export type AscetComponentKind = "class" | "module" | "statemachine" | "unknown";

export interface AscetInspectionPort {
	name: string;
	direction: "input" | "output" | "inout" | "unknown";
	type?: string;
	physical?: Record<string, unknown>;
	unit?: string;
	min?: number;
	max?: number;
	step?: number;
	metadata?: Record<string, unknown>;
}

export interface AscetInspectionMethod {
	name: string;
	signature?: Record<string, unknown>;
	code?: string;
	language?: string;
	inputs?: AscetInspectionPort[];
	outputs?: AscetInspectionPort[];
	reads?: string[];
	writes?: string[];
	calls?: string[];
	metadata?: Record<string, unknown>;
}

export interface AscetInspectionDependency {
	path: string;
	kind?: string;
	relation?: string;
	metadata?: Record<string, unknown>;
}

export interface AscetInspection {
	schemaVersion: typeof ASCET_INSPECTION_SCHEMA;
	componentPath: string;
	objectKind: AscetComponentKind;
	complete: boolean;
	summary: Record<string, unknown>;
	methods: AscetInspectionMethod[];
	interfaces: {
		inputs: AscetInspectionPort[];
		outputs: AscetInspectionPort[];
		parameters: AscetInspectionPort[];
		variables: AscetInspectionPort[];
	};
	dependencies: AscetInspectionDependency[];
	stateMachine?: Record<string, unknown>;
	cycles?: Record<string, unknown>;
	operations: Array<{ operation: string; ok: boolean; result?: unknown; error?: Record<string, unknown> }>;
	warnings: string[];
	errors: string[];
	sourceHash?: string;
	raw?: Record<string, unknown>;
}

export interface AscetEsdlDraftMethod {
	methodName: string;
	code: string;
	language: "ESDL";
	operation: "create" | "replace" | "review";
}

export type AscetElementKind = "parameter" | "variable" | "constant" | "table" | "lookup";

export interface AscetElementSpecElement {
	name: string;
	kind: AscetElementKind;
	type: string;
	operation?: "create" | "update" | "upsert";
	defaultValue?: unknown;
	min?: number;
	max?: number;
	step?: number;
	unit?: string;
	direction?: string;
	metadata?: Record<string, unknown>;
	dimensions?: number[];
	values?: unknown[];
}

export interface AscetElementSpec {
	schemaVersion: typeof ASCET_ELEMENT_SPEC_SCHEMA;
	componentPath: string;
	sourceDraftHash?: string;
	elements: AscetElementSpecElement[];
	valid?: boolean;
	issues?: Array<{ code: string; message: string; path?: string }>;
	hash?: string;
}

export interface AscetEsdlApplyPlan {
	schemaVersion: typeof ASCET_ESDL_APPLY_PLAN_SCHEMA;
	componentPath: string;
	sourceElementSpecHash: string;
	baselineFingerprint?: string;
	operations: Array<{
		sequence: number;
		action: "create" | "update" | "conflict";
		element: AscetElementSpecElement;
		reason?: string;
	}>;
	conflicts: Array<{ name: string; kind: string; type: string; reason: string }>;
	ready: boolean;
	liveWritePerformed: false;
	readbackRequired: true;
	hash?: string;
}

export interface AscetEsdlDraft {
	schemaVersion: typeof ASCET_ESDL_DRAFT_SCHEMA;
	runId: string;
	componentPath: string;
	sourceInspectionHash: string;
	target: { objectKind: AscetComponentKind; methodNames: string[] };
	methods: AscetEsdlDraftMethod[];
	text: string;
	valid: boolean;
	issues: Array<{ code: string; message: string; path?: string }>;
	readbackRequired: true;
	elementSpec?: AscetElementSpec;
	applyPlan?: AscetEsdlApplyPlan;
}

export interface AscetGeneratedCases {
	schemaVersion: typeof ASCET_GENERATED_CASES_SCHEMA;
	runId: string;
	componentPath: string;
	sourceInspectionHash: string;
	seed: string;
	deterministic: true;
	levels: AscetTestLevel[];
	contract: AscetTestContract;
	generationNotes: string[];
}

export interface AscetTestExpectedStep {
	tick: number;
	outputs: Record<string, unknown>;
	tolerances?: Record<string, number>;
}

export interface AscetTestCaseContract {
	id: string;
	steps?: number;
	inputs?: Record<string, unknown>;
	expectedOutputs?: Record<string, unknown>;
	expectedSteps?: AscetTestExpectedStep[];
	tolerances?: Record<string, number>;
	oracleSource?: AscetTestOracleSource;
	tags?: string[];
}

export interface AscetTestSuiteContract {
	id: string;
	level: AscetTestLevel;
	entryPoint: string;
	dependencyMode: AscetTestDependencyMode;
	cycles?: number;
	cases: AscetTestCaseContract[];
}

export interface AscetTestContract {
	schemaVersion: typeof ASCET_TEST_CONTRACT_SCHEMA;
	componentPath: string;
	suites: AscetTestSuiteContract[];
}

export interface AscetToolchainRequest {
	cmakePath?: string;
	gccPath?: string;
	gxxPath?: string;
	googleTestRoot?: string;
	etasLegacyDirectory?: string;
}

export type AscetTestRunStatus = "passed" | "failed" | "timeout" | "crashed" | "blocked";
export type AscetTestVerifyProfile = "offline" | "live";

export interface AscetTestRunOptions {
	timeoutMs?: number;
	args?: string[];
	runtimePath?: string[];
}

export interface AscetTestVerificationOptions {
	profile?: AscetTestVerifyProfile;
	requireEsdlReadback?: boolean;
	requireExport?: boolean;
	requireCaseCoverage?: boolean;
	esdlReadbackPath?: string;
	exportManifestPath?: string;
}

export interface AscetTestRunResult {
	schemaVersion: typeof ASCET_TEST_RUN_SCHEMA;
	runId: string;
	status: AscetTestRunStatus;
	binary: string;
	exitCode: number;
	durationMs: number;
	stdoutPath: string;
	stderrPath: string;
	gtestXmlPath: string;
	xmlValid: boolean;
	testsRun: number;
	failures: number;
	errors: number;
	disabled: number;
}

export interface AscetTestVerifyResult {
	schemaVersion: typeof ASCET_TEST_VERIFY_SCHEMA;
	runId: string;
	profile: AscetTestVerifyProfile;
	status: "verified" | "blocked";
	verdict: "passed" | "failed";
	checks: Array<{ id: string; status: "passed" | "failed"; code?: string; message?: string; evidencePath?: string }>;
	firstFailure: { code: string; message: string; path: string } | null;
	failureCode: string;
	evidencePaths: Record<string, string>;
}

export interface AscetTestRequestDocument {
	schemaVersion: typeof ASCET_TEST_REQUEST_SCHEMA;
	runId: string;
	componentPath: string;
	levels: AscetTestLevel[];
	objectKind?: AscetComponentKind;
	traceDepth?: number;
	includeMethodCode?: boolean;
	contract?: AscetTestContract;
	testContractPath?: string;
	inspection?: AscetInspection;
	inspectionPath?: string;
	methodDrafts?: Array<{ methodName: string; code: string; operation?: "create" | "replace" | "review" }>;
	elementSpec?: AscetElementSpec;
	elementSpecPath?: string;
	applyPlan?: AscetEsdlApplyPlan;
	applyPlanPath?: string;
	seed?: string;
	cycles?: number;
	runDirectory?: string;
	generatedCSources?: string[];
	generatedCPath?: string;
	cTestSources?: string[];
	cTestSourcePath?: string;
	adapterSource?: string;
	adapterSourcePath?: string;
	testSources?: string[];
	testSourcePath?: string;
	exportManifestPath?: string;
	esdlReadbackPath?: string;
	buildResultPath?: string;
	runResultPath?: string;
	run?: AscetTestRunOptions;
	verification?: AscetTestVerificationOptions;
	pipelineStages?: string[];
	toolchain?: AscetToolchainRequest;
	cliPath?: string;
	cliWorkingDirectory?: string;
	executeLive?: boolean;
	approvedRevisionId?: string;
	approval?: { approved: boolean; revisionId: string; reviewer?: string };
	disposableTarget?: boolean;
	baselineFingerprint?: string;
	currentBaselineFingerprint?: string;
}

export interface AscetValidationIssue {
	path: string;
	code: string;
	message: string;
}

export interface AscetValidationResult<T> {
	value?: T;
	errors: AscetValidationIssue[];
	warnings: AscetValidationIssue[];
}
