import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getAscetArtifactRoot } from "../observation-store.ts";
import type { RunAscetEditOperationOptions } from "./common.ts";
import type { AscetEditMutationStatus, AscetEditVerificationStatus } from "./verification.ts";

export type AscetWriteTelemetryOutcome =
	| "plan_ready"
	| "committed"
	| "no_change"
	| "rolled_back"
	| "rollback_failed"
	| "committed_unverified"
	| "outcome_unknown"
	| "blocked"
	| "error";

export interface AscetWriteTelemetryEvent {
	operation: string;
	phase: "plan" | "commit" | "execute";
	outcome: AscetWriteTelemetryOutcome;
	durationMs: number;
	errorCode?: string;
	planId?: string;
	verificationStatus?: AscetEditVerificationStatus;
	mutationStatus?: AscetEditMutationStatus;
	bridgeEntered?: boolean;
	backendResponseReceived?: boolean;
	writeClass?: "read_only" | "isolated_fixture" | "cleanup" | "unexpected";
	mutationStarted?: boolean;
	writesPerformed?: boolean;
	cleanupRequired?: boolean;
	runId?: string;
	phaseId?: string;
	caseId?: string;
	attemptId?: string;
}

export interface AscetPersistedWriteTelemetryEvent extends AscetWriteTelemetryEvent {
	version: 2;
	timestamp: string;
}
export interface AscetWriteTelemetryGroupSummary {
	eventCount: number;
	bridgeEntered: boolean;
	writesPerformed: boolean;
	mutationStarted: boolean;
	unknownOutcome: boolean;
	cleanupRequired: boolean;
	readOnlyWrites: number;
	isolatedFixtureWrites: number;
	cleanupWrites: number;
	unexpectedWrites: number;
}

export interface AscetWriteTelemetrySummary {
	version: 2;
	eventCount: number;
	bridgeEntered: boolean;
	writesPerformed: boolean;
	mutationStarted: boolean;
	unknownOutcome: boolean;
	cleanupRequired: boolean;
	readOnlyWrites: number;
	isolatedFixtureWrites: number;
	cleanupWrites: number;
	unexpectedWrites: number;
	byRun: Readonly<Record<string, AscetWriteTelemetryGroupSummary>>;
	byPhase: Readonly<Record<string, AscetWriteTelemetryGroupSummary>>;
	byCase: Readonly<Record<string, AscetWriteTelemetryGroupSummary>>;
	byAttempt: Readonly<Record<string, AscetWriteTelemetryGroupSummary>>;
}

export function recordAscetWriteTelemetry(
	options: Pick<RunAscetEditOperationOptions, "env">,
	event: AscetWriteTelemetryEvent,
): void {
	try {
		const directory = join(getAscetArtifactRoot(options.env as NodeJS.ProcessEnv | undefined), "telemetry");
		mkdirSync(directory, { recursive: true });
		const context = options.env ?? {};
		const enrichedEvent = {
			version: 2,
			timestamp: new Date().toISOString(),
			...event,
			...(context.PI_ASCET_RUN_ID ? { runId: context.PI_ASCET_RUN_ID } : {}),
			...(context.PI_ASCET_PHASE_ID ? { phaseId: context.PI_ASCET_PHASE_ID } : {}),
			...(context.PI_ASCET_CASE_ID ? { caseId: context.PI_ASCET_CASE_ID } : {}),
			...(context.PI_ASCET_ATTEMPT_ID ? { attemptId: context.PI_ASCET_ATTEMPT_ID } : {}),
			...(context.PI_ASCET_WRITE_CLASS === "read_only" ||
			context.PI_ASCET_WRITE_CLASS === "isolated_fixture" ||
			context.PI_ASCET_WRITE_CLASS === "cleanup" ||
			context.PI_ASCET_WRITE_CLASS === "unexpected"
				? { writeClass: context.PI_ASCET_WRITE_CLASS }
				: {}),
		};
		appendFileSync(join(directory, "element-write.jsonl"), `${JSON.stringify(enrichedEvent)}\n`, {
			encoding: "utf8",
			mode: 0o600,
		});
	} catch {
		// Telemetry must never change mutation behavior.
	}
}

function updateTelemetryGroup(
	groups: Record<string, AscetWriteTelemetryGroupSummary>,
	key: string,
	event: AscetWriteTelemetryEvent,
	eventWrites: boolean,
	eventStarted: boolean,
	eventUnknown: boolean,
): void {
	const summary = groups[key] ?? {
		eventCount: 0,
		bridgeEntered: false,
		writesPerformed: false,
		mutationStarted: false,
		unknownOutcome: false,
		cleanupRequired: false,
		readOnlyWrites: 0,
		isolatedFixtureWrites: 0,
		cleanupWrites: 0,
		unexpectedWrites: 0,
	};
	summary.eventCount += 1;
	summary.bridgeEntered ||= event.bridgeEntered === true;
	summary.writesPerformed ||= eventWrites;
	summary.mutationStarted ||= eventStarted;
	summary.unknownOutcome ||= eventUnknown;
	summary.cleanupRequired ||= event.cleanupRequired === true;
	if (eventWrites) {
		if (event.writeClass === "read_only") summary.readOnlyWrites += 1;
		else if (event.writeClass === "isolated_fixture") summary.isolatedFixtureWrites += 1;
		else if (event.writeClass === "cleanup") summary.cleanupWrites += 1;
		else summary.unexpectedWrites += 1;
	}
	groups[key] = summary;
}

export function aggregateAscetWriteTelemetry(events: readonly AscetWriteTelemetryEvent[]): AscetWriteTelemetrySummary {
	const byRun: Record<string, AscetWriteTelemetryGroupSummary> = {};
	const byPhase: Record<string, AscetWriteTelemetryGroupSummary> = {};
	const byCase: Record<string, AscetWriteTelemetryGroupSummary> = {};
	const byAttempt: Record<string, AscetWriteTelemetryGroupSummary> = {};
	let bridgeEntered = false;
	let writesPerformed = false;
	let mutationStarted = false;
	let unknownOutcome = false;
	let cleanupRequired = false;
	let readOnlyWrites = 0;
	let isolatedFixtureWrites = 0;
	let cleanupWrites = 0;
	let unexpectedWrites = 0;
	for (const event of events) {
		const eventWrites = event.writesPerformed === true || event.mutationStatus === "applied";
		const eventStarted =
			event.mutationStarted === true ||
			(event.mutationStatus !== undefined && event.mutationStatus !== "not_started" && event.phase !== "plan");
		const eventUnknown = event.outcome === "outcome_unknown" || event.mutationStatus === "unknown";
		updateTelemetryGroup(byRun, event.runId ?? "unassigned", event, eventWrites, eventStarted, eventUnknown);
		updateTelemetryGroup(byPhase, event.phaseId ?? event.phase, event, eventWrites, eventStarted, eventUnknown);
		updateTelemetryGroup(byCase, event.caseId ?? "unassigned", event, eventWrites, eventStarted, eventUnknown);
		updateTelemetryGroup(byAttempt, event.attemptId ?? "unassigned", event, eventWrites, eventStarted, eventUnknown);
		bridgeEntered ||= event.bridgeEntered === true;
		writesPerformed ||= eventWrites;
		mutationStarted ||= eventStarted;
		unknownOutcome ||= eventUnknown;
		cleanupRequired ||= event.cleanupRequired === true;
		if (eventWrites) {
			if (event.writeClass === "read_only") readOnlyWrites += 1;
			else if (event.writeClass === "isolated_fixture") isolatedFixtureWrites += 1;
			else if (event.writeClass === "cleanup") cleanupWrites += 1;
			else unexpectedWrites += 1;
		}
	}
	return {
		version: 2,
		eventCount: events.length,
		bridgeEntered,
		writesPerformed,
		mutationStarted,
		unknownOutcome,
		cleanupRequired,
		readOnlyWrites,
		isolatedFixtureWrites,
		cleanupWrites,
		unexpectedWrites,
		byRun,
		byPhase,
		byCase,
		byAttempt,
	};
}
