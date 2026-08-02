import { createHash } from "node:crypto";
import type {
	AscetGeneratedCases,
	AscetInspection,
	AscetInspectionMethod,
	AscetInspectionPort,
	AscetTestCaseContract,
	AscetTestLevel,
	AscetTestSuiteContract,
} from "./contracts.ts";

export interface GenerateAscetCasesInput {
	runId: string;
	componentPath: string;
	inspection: AscetInspection;
	levels?: AscetTestLevel[];
	seed?: string;
	cycles?: number;
}

export function generateAscetCases(input: GenerateAscetCasesInput): AscetGeneratedCases {
	const levels = normalizeLevels(input.levels);
	const seed = input.seed?.trim() || createSeed(input.inspection, levels);
	const suites: AscetTestSuiteContract[] = [];
	const notes: string[] = ["Cases are generated deterministically from inspection metadata and the supplied seed."];
	if (!input.inspection.complete)
		notes.push("Source inspection is incomplete; generated cases remain review-only until inspect succeeds.");

	if (levels.includes("class_ut")) {
		const methods =
			input.inspection.methods.length > 0 ? input.inspection.methods : [{ name: leafName(input.componentPath) }];
		for (const method of methods) suites.push(buildClassSuite(method, input.inspection));
		if (input.inspection.methods.length === 0)
			notes.push("No methods were discovered; a component-level class_ut placeholder was emitted.");
	}
	if (levels.includes("component_ct")) {
		suites.push(buildComponentSuite(input.componentPath, input.inspection, input.cycles));
		if (!input.inspection.stateMachine)
			notes.push("No state-machine flow was discovered; state_transition is not emitted.");
	}

	return {
		schemaVersion: "ascet-generated-cases/v1",
		runId: input.runId.trim(),
		componentPath: input.componentPath.trim().replace(/\\/g, "/"),
		sourceInspectionHash:
			input.inspection.sourceHash ??
			createHash("sha256").update(JSON.stringify(input.inspection), "utf8").digest("hex"),
		seed,
		deterministic: true,
		levels,
		contract: {
			schemaVersion: "ascet-test-contract/v1",
			componentPath: input.componentPath.trim().replace(/\\/g, "/"),
			suites,
		},
		generationNotes: notes,
	};
}

function buildClassSuite(method: AscetInspectionMethod, inspection: AscetInspection): AscetTestSuiteContract {
	const cases: AscetTestCaseContract[] = [
		caseContract("nominal", "requirement"),
		caseContract("initialization", "derived", { steps: 1 }),
		caseContract("repeated_invocation", "derived", { steps: 3 }),
	];
	for (const port of inspection.interfaces.inputs) {
		if (port.min !== undefined)
			cases.push(caseContract(`${safeId(port.name)}_lower_bound`, "derived", { inputs: { [port.name]: port.min } }));
		if (port.max !== undefined)
			cases.push(caseContract(`${safeId(port.name)}_upper_bound`, "derived", { inputs: { [port.name]: port.max } }));
		const threshold = getThreshold(port);
		if (threshold !== undefined) {
			cases.push(
				caseContract(`${safeId(port.name)}_threshold_below`, "derived", {
					inputs: { [port.name]: threshold - stepFor(port, threshold) },
				}),
			);
			cases.push(
				caseContract(`${safeId(port.name)}_threshold_at`, "requirement", { inputs: { [port.name]: threshold } }),
			);
			cases.push(
				caseContract(`${safeId(port.name)}_threshold_above`, "derived", {
					inputs: { [port.name]: threshold + stepFor(port, threshold) },
				}),
			);
		}
		if (allowsInvalid(port)) {
			const invalidValue =
				port.min !== undefined
					? port.min - stepFor(port, port.min)
					: port.max !== undefined
						? port.max + stepFor(port, port.max)
						: undefined;
			if (invalidValue !== undefined)
				cases.push(
					caseContract(`${safeId(port.name)}_invalid_input`, "derived", {
						inputs: { [port.name]: invalidValue },
						tags: ["invalid_input", "allowed_by_inspection"],
					}),
				);
		}
	}
	return {
		id: `${safeId(method.name)}_class_ut`,
		level: "class_ut",
		entryPoint: method.name,
		dependencyMode: "stub",
		cases: deduplicateCases(cases),
	};
}

function buildComponentSuite(componentPath: string, inspection: AscetInspection, cycles = 3): AscetTestSuiteContract {
	const cases: AscetTestCaseContract[] = [
		caseContract("component_initialization", "derived", { steps: 1 }),
		caseContract("multi_cycle_sequence", "derived", { steps: Math.max(2, Math.trunc(cycles)) }),
		caseContract("input_transition", "derived", { steps: 2, tags: ["transition"] }),
		caseContract("output_oracle", "requirement", { tags: ["oracle"] }),
		caseContract("external_environment", "derived", { tags: ["environment"] }),
	];
	if (inspection.stateMachine)
		cases.splice(3, 0, caseContract("state_transition", "derived", { steps: 2, tags: ["state_machine"] }));
	return {
		id: `${safeId(leafName(componentPath))}_component_ct`,
		level: "component_ct",
		entryPoint: leafName(componentPath),
		dependencyMode: "real",
		cycles: Math.max(1, Math.trunc(cycles)),
		cases: deduplicateCases(cases),
	};
}

function caseContract(
	id: string,
	oracleSource: "requirement" | "derived",
	overrides: Partial<AscetTestCaseContract> = {},
): AscetTestCaseContract {
	return {
		id,
		steps: overrides.steps ?? 1,
		inputs: overrides.inputs ?? {},
		expectedOutputs: overrides.expectedOutputs ?? {},
		expectedSteps: overrides.expectedSteps ?? [],
		oracleSource,
		tags: overrides.tags ?? [],
	};
}

function deduplicateCases(cases: AscetTestCaseContract[]): AscetTestCaseContract[] {
	const seen = new Set<string>();
	return cases.filter((testCase) => {
		if (seen.has(testCase.id)) return false;
		seen.add(testCase.id);
		return true;
	});
}

function normalizeLevels(levels: AscetTestLevel[] | undefined): AscetTestLevel[] {
	const requested = levels && levels.length > 0 ? levels : ["class_ut", "component_ct"];
	return ["class_ut", "component_ct"].filter((level): level is AscetTestLevel => requested.includes(level));
}

function createSeed(inspection: AscetInspection, levels: AscetTestLevel[]): string {
	return createHash("sha256")
		.update(`${inspection.sourceHash ?? JSON.stringify(inspection)}|${levels.join(",")}`, "utf8")
		.digest("hex")
		.slice(0, 16);
}

function getThreshold(port: AscetInspectionPort): number | undefined {
	const metadata = port.metadata ?? {};
	const value = metadata.threshold ?? metadata.trigger ?? metadata.limit;
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function allowsInvalid(port: AscetInspectionPort): boolean {
	const metadata = port.metadata ?? {};
	return metadata.allowInvalid === true || metadata.allowsInvalidInputs === true;
}

function stepFor(port: AscetInspectionPort, base: number): number {
	if (port.step !== undefined && port.step > 0) return port.step;
	const magnitude = Math.abs(base);
	return magnitude > 0 ? Math.max(magnitude * 0.01, 1e-6) : 1;
}

function safeId(value: string): string {
	return (
		value
			.trim()
			.replace(/[^A-Za-z0-9_]+/g, "_")
			.replace(/^_+|_+$/g, "") || "component"
	);
}

function leafName(value: string): string {
	const parts = value.replace(/\\/g, "/").split("/").filter(Boolean);
	return parts[parts.length - 1] ?? "component";
}
