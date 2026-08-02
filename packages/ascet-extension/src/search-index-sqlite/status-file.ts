import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface AscetIndexStatusFileArea {
	status: "pending" | "building" | "refreshing" | "ready" | "stale" | "failed" | "missing";
	count?: number;
	itemCount?: number;
	elapsedMs?: number;
	errorCode?: string;
	errorMessage?: string;
}

export interface AscetIndexStatusFile {
	state: "checking" | "building" | "writing" | "ready" | "stale" | "refreshing" | "failed" | "disabled";
	generation?: string;
	generationBefore?: string;
	generationAfter?: string;
	transactionCommitted?: boolean;
	clearedInvalidations?: string[];
	phase?: string;
	currentArea?: string;
	refreshingArea?: string;
	startedAt?: string;
	elapsedMs?: number;
	totalDocs?: number;
	staleAreas?: string[];
	error?: { code?: string; message?: string };
	areas?: Record<string, AscetIndexStatusFileArea>;
}

export function getAscetIndexStatusFilePath(cwd: string): string {
	return join(cwd, ".ascet", "index", "status.json");
}

export function writeAscetIndexStatusFile(cwd: string, status: AscetIndexStatusFile): void {
	const path = getAscetIndexStatusFilePath(cwd);
	try {
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, `${JSON.stringify(status, null, 2)}\n`, "utf8");
	} catch {
		// Index status is UI-only; never fail search/index work because the sidecar cannot be written.
	}
}
