import type { AscetSearchIndexWarmupPartition } from "../search-index.ts";
import type { AscetP0IndexArea } from "../search-index-sqlite/schema.ts";

export const ASCET_INDEX_PUBLIC_AREAS = [
	"p0",
	"components",
	"tree",
	"elements",
	"methods",
	"refs",
	"code",
	"messages",
	"project",
] as const;

export type AscetIndexPublicArea = (typeof ASCET_INDEX_PUBLIC_AREAS)[number];

export type AscetIndexAction = "status" | "refresh" | "mark_stale" | "repair_status_file" | "evaluate";
export type AscetIndexDetailLevel = "summary" | "areas" | "full";
export type AscetIndexRefreshMode = "foreground" | "background";
export type AscetIndexEvaluateCheck = "status" | "counts" | "freshness" | "search_smoke" | "sidecar";

export interface AscetIndexAreaPlan {
	requestedAreas: AscetIndexPublicArea[];
	effectivePartitions: AscetSearchIndexWarmupPartition[];
	sqliteAreas: AscetP0IndexArea[];
	includeTextCode: boolean;
	requiresP0: boolean;
}

export interface AscetIndexStatusOptions {
	cwd: string;
	detailLevel?: AscetIndexDetailLevel;
	includeScheduler?: boolean;
	schedulerSnapshot?: unknown;
}

export interface AscetIndexStatusArea {
	name: AscetP0IndexArea;
	state: string;
	count: number;
	elapsedMs?: number;
	scanComplete?: boolean;
	errorCode?: string;
	errorMessage?: string;
}

export interface AscetIndexStatusReport {
	state: string;
	storage: "sqlite";
	totalDocs: number;
	databaseName?: string;
	databasePath?: string;
	generatedAt?: string;
	elapsedMs?: number;
	staleAreas?: string[];
	areas?: AscetIndexStatusArea[];
	footer?: {
		inSync: boolean;
		generation?: string;
		state?: string;
		totalDocs?: number;
		path?: string;
		errorCode?: string;
		errorMessage?: string;
	};
	scheduler?: unknown;
}
