import { ASCET_SCHEDULER_DEFAULTS, type AscetJobKind } from "../scheduler/types.ts";

export const ASCET_TEST_ACTIONS = [
	"inspect",
	"generate-esdl",
	"generate-cases",
	"prepare",
	"apply",
	"export",
	"plan",
	"build",
	"run",
	"verify",
	"pipeline",
	"batch",
	"evidence",
] as const;

export type AscetTestAction = (typeof ASCET_TEST_ACTIONS)[number];

export interface AscetTestCliRequest {
	action: AscetTestAction;
	requestPath: string;
	outputPath: string;
	executeLive?: boolean;
	runId?: string;
}

export interface AscetTestActionClassification {
	jobKind: AscetJobKind;
	resourceKey: string;
	commandId: string;
}

export function isAscetTestAction(value: unknown): value is AscetTestAction {
	return typeof value === "string" && (ASCET_TEST_ACTIONS as readonly string[]).includes(value);
}

export function parseAscetTestAction(value: unknown): AscetTestAction {
	if (isAscetTestAction(value)) {
		return value;
	}
	throw new Error(`Unsupported AscetTest action: ${String(value)}`);
}

export function classifyAscetTestAction(
	action: AscetTestAction,
	options: { executeLive?: boolean; runId?: string } = {},
): AscetTestActionClassification {
	const live = options.executeLive === true && (action === "apply" || action === "export" || action === "pipeline");
	const jobKind: AscetJobKind =
		action === "apply" || live ? "write" : action === "inspect" || action === "export" ? "read" : "maintenance";
	const resourceKey =
		live || action === "inspect" || action === "export"
			? ASCET_SCHEDULER_DEFAULTS.resourceKey
			: `ascet.test.${options.runId?.trim() || "internal"}`;
	return {
		jobKind,
		resourceKey,
		commandId: `ascet_test_${action}`,
	};
}
