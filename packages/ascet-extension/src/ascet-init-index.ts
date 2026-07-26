import type { AscetInitIndexMode } from "./ascet-init-scope.ts";
import {
	type AscetSearchIndexPartition,
	type AscetSearchIndexWarmupOptions,
	type AscetSearchIndexWarmupResult,
	ensureAscetSearchIndex,
} from "./search-index.ts";
import { createAscetStatusReport } from "./status.ts";

export type AscetInitIndexPartition = Exclude<AscetSearchIndexPartition, "all">;

export interface AscetInitIndexPartitionReport {
	name: AscetInitIndexPartition;
	status: "ready" | "failed" | "skipped";
	count?: number;
	elapsedMs?: number;
	scanComplete?: boolean;
	fromCache?: boolean;
	error?: {
		code: string;
		message: string;
	};
}

export interface AscetInitIndexResult {
	database?: {
		name: string;
		path: string;
	};
	index: {
		status: "ready" | "partial" | "skipped" | "failed";
		mode: AscetInitIndexMode;
		fromCache?: boolean;
		elapsedMs?: number;
		partitions?: AscetInitIndexPartitionReport[];
	};
	error?: {
		code: string;
		message: string;
		recover: string[];
	};
}

export type AscetInitProgressEvent =
	| { phase: "start"; total: number; elapsedMs: number }
	| { phase: "partition_start"; index: number; total: number; partition: AscetInitIndexPartition; elapsedMs: number }
	| {
			phase: "partition_done";
			index: number;
			total: number;
			partition: AscetInitIndexPartition;
			status: "ready" | "failed";
			count?: number;
			fromCache?: boolean;
			elapsedMs: number;
	  }
	| { phase: "done"; status: AscetInitIndexResult["index"]["status"]; elapsedMs: number };

export interface AscetInitIndexOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	scanTimeoutMs?: number;
	indexMode: AscetInitIndexMode;
	forceRefresh?: boolean;
	warmSearchIndex?: (options: AscetSearchIndexWarmupOptions) => Promise<AscetSearchIndexWarmupResult>;
	onProgress?: (event: AscetInitProgressEvent) => void;
}

export const ASCET_INIT_CORE_PARTITIONS: readonly AscetInitIndexPartition[] = [
	"components",
	"diagram_metadata",
	"element_decls",
	"method_decls",
	"text_code",
];

export const ASCET_INIT_ALL_PARTITIONS: readonly AscetInitIndexPartition[] = [
	"components",
	"diagram_metadata",
	"element_decls",
	"method_decls",
	"method_process_elements",
	"component_refs",
	"element_refs",
	"messages",
	"text_code",
];

function normalizeApiPath(value: string): string {
	return value.replace(/\\/g, "/");
}

function partitionsForMode(mode: AscetInitIndexMode): readonly AscetInitIndexPartition[] {
	if (mode === "core") {
		return ASCET_INIT_CORE_PARTITIONS;
	}
	if (mode === "all") {
		return ASCET_INIT_ALL_PARTITIONS;
	}
	return [];
}

function partitionReport(
	partition: AscetInitIndexPartition,
	result: AscetSearchIndexWarmupResult,
): AscetInitIndexPartitionReport {
	if (!result.ok) {
		return {
			name: partition,
			status: "failed",
			error: result.error,
		};
	}
	return {
		name: partition,
		status: "ready",
		count: result.entryCount,
		elapsedMs: result.elapsedMs,
		scanComplete: result.scanComplete,
		fromCache: result.fromCache,
	};
}

function createRecoverSteps(): string[] {
	return ["Run ascet_status.", "Open the target database in ASCET GUI.", "Run ascet-init --force."];
}

export async function runAscetInitIndex(options: AscetInitIndexOptions): Promise<AscetInitIndexResult> {
	const installation = createAscetStatusReport(options);
	if (!installation.ok) {
		return {
			index: { status: "failed", mode: options.indexMode },
			error: {
				code: "ascet_installation_not_ready",
				message: "ASCET CLI executable or contract catalog is missing; init index warmup was skipped.",
				recover: createRecoverSteps(),
			},
		};
	}

	const partitions = partitionsForMode(options.indexMode);
	if (partitions.length === 0) {
		return {
			index: {
				status: "skipped",
				mode: "none",
				partitions: [],
			},
		};
	}

	const warmSearchIndex = options.warmSearchIndex ?? ensureAscetSearchIndex;
	const startedAt = Date.now();
	const reports: AscetInitIndexPartitionReport[] = [];
	let databaseName = "";
	let databasePath = "";
	options.onProgress?.({ phase: "start", total: partitions.length, elapsedMs: 0 });

	for (const [partitionIndex, partition] of partitions.entries()) {
		options.onProgress?.({
			phase: "partition_start",
			index: partitionIndex + 1,
			total: partitions.length,
			partition,
			elapsedMs: Date.now() - startedAt,
		});
		const result = await warmSearchIndex({
			cwd: options.cwd,
			env: options.env,
			signal: options.signal,
			timeoutMs: options.timeoutMs,
			scanTimeoutMs: options.scanTimeoutMs,
			partition,
			forceRefresh: options.forceRefresh,
			includeTextCode: partition === "text_code",
			toolName: "ascet_init",
		});
		if (result.databaseName) {
			databaseName = result.databaseName;
		}
		if (result.databasePath) {
			databasePath = normalizeApiPath(result.databasePath);
		}
		const report = partitionReport(partition, result);
		reports.push(report);
		options.onProgress?.({
			phase: "partition_done",
			index: partitionIndex + 1,
			total: partitions.length,
			partition,
			status: report.status === "failed" ? "failed" : "ready",
			count: report.count,
			fromCache: report.fromCache,
			elapsedMs: Date.now() - startedAt,
		});
	}

	const failed = reports.find((report) => report.status === "failed");
	const readyReports = reports.filter((report) => report.status === "ready");
	const fromCache = readyReports.length > 0 && readyReports.every((report) => report.fromCache === true);
	const elapsedMs = Date.now() - startedAt;
	const status = failed ? (readyReports.length > 0 ? "partial" : "failed") : "ready";
	options.onProgress?.({ phase: "done", status, elapsedMs });
	return {
		database:
			databaseName || databasePath
				? {
						name: databaseName,
						path: databasePath,
					}
				: undefined,
		index: {
			status,
			mode: options.indexMode,
			fromCache,
			elapsedMs,
			partitions: reports,
		},
		error: failed
			? {
					code: "ascet_init_index_failed",
					message: `Failed to warm ${failed.name} partition.`,
					recover: createRecoverSteps(),
				}
			: undefined,
	};
}
