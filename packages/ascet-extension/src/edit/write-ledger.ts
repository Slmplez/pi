import { createHash } from "node:crypto";
import {
	type AscetPersistedWriteTelemetryEvent,
	type AscetWriteTelemetrySummary,
	aggregateAscetWriteTelemetry,
} from "./write-telemetry.ts";

export interface AscetWriteLedger {
	version: 2;
	rawSha256: string;
	eventCount: number;
	events: readonly AscetPersistedWriteTelemetryEvent[];
}

export interface AscetWriteLedgerSummary extends AscetWriteTelemetrySummary {
	rawSha256: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseEvent(line: string, index: number): AscetPersistedWriteTelemetryEvent {
	const value = JSON.parse(line) as unknown;
	if (
		!isRecord(value) ||
		value.version !== 2 ||
		typeof value.timestamp !== "string" ||
		typeof value.operation !== "string" ||
		typeof value.phase !== "string" ||
		typeof value.outcome !== "string"
	) {
		throw new Error(`Invalid ASCET write telemetry event at line ${index + 1}.`);
	}
	return value as unknown as AscetPersistedWriteTelemetryEvent;
}

export function createAscetWriteLedger(rawJsonl: string): {
	ledger: AscetWriteLedger;
	summary: AscetWriteLedgerSummary;
} {
	const lines = rawJsonl.split(/\r?\n/u).filter((line) => line.trim().length > 0);
	const events = lines.map(parseEvent);
	const rawSha256 = createHash("sha256").update(rawJsonl, "utf8").digest("hex");
	return {
		ledger: { version: 2, rawSha256, eventCount: events.length, events },
		summary: { ...aggregateAscetWriteTelemetry(events), rawSha256 },
	};
}
