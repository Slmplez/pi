import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getAscetArtifactRoot } from "../observation-store.ts";
import type { RunAscetEditOperationOptions } from "./common.ts";

export type AscetWriteTelemetryOutcome = "plan_ready" | "committed" | "blocked" | "error";

export interface AscetWriteTelemetryEvent {
	operation: string;
	phase: "plan" | "commit";
	outcome: AscetWriteTelemetryOutcome;
	durationMs: number;
	errorCode?: string;
	planId?: string;
}

export function recordAscetWriteTelemetry(
	options: Pick<RunAscetEditOperationOptions, "env">,
	event: AscetWriteTelemetryEvent,
): void {
	try {
		const directory = join(getAscetArtifactRoot(options.env as NodeJS.ProcessEnv | undefined), "telemetry");
		mkdirSync(directory, { recursive: true });
		appendFileSync(
			join(directory, "element-write.jsonl"),
			`${JSON.stringify({ version: 1, timestamp: new Date().toISOString(), ...event })}\n`,
			{ encoding: "utf8", mode: 0o600 },
		);
	} catch {
		// Telemetry must never change mutation behavior.
	}
}
