export const ASCET_TEST_REQUEST_SCHEMA = "ascet-test-request/v1" as const;
export const ASCET_TEST_CONTRACT_SCHEMA = "ascet-test-contract/v1" as const;
export const ASCET_INSPECTION_SCHEMA = "ascet-inspection/v1" as const;
export const ASCET_ESDL_DRAFT_SCHEMA = "ascet-esdl-draft/v1" as const;
export const ASCET_GENERATED_CASES_SCHEMA = "ascet-generated-cases/v1" as const;

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
	seed?: string;
	cycles?: number;
	runDirectory?: string;
	toolchain?: AscetToolchainRequest;
	cliPath?: string;
	cliWorkingDirectory?: string;
	executeLive?: boolean;
	approvedRevisionId?: string;
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
