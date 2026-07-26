import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

const STATUS_KEY = "00-ascet-index";
const ACTIVE_POLL_MS = 500;
const IDLE_POLL_MS = 4_000;

type AreaStatus = "pending" | "building" | "refreshing" | "ready" | "stale" | "failed" | "missing";

interface StatusArea {
	status?: AreaStatus;
	count?: number;
	itemCount?: number;
	elapsedMs?: number;
	errorCode?: string;
	errorMessage?: string;
}

interface IndexStatusFile {
	state?: "checking" | "building" | "writing" | "ready" | "stale" | "refreshing" | "failed" | "disabled";
	phase?: string;
	currentArea?: string;
	refreshingArea?: string;
	elapsedMs?: number;
	totalDocs?: number;
	staleAreas?: string[];
	error?: { code?: string; message?: string };
	areas?: Record<string, StatusArea>;
}

export interface AscetIndexFooterHandle {
	stop(): void;
	refreshNow(): void;
}

function formatElapsed(ms: unknown): string {
	if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) {
		return "";
	}
	if (ms < 1_000) {
		return `${Math.round(ms)}ms`;
	}
	return `${(ms / 1_000).toFixed(1)}s`;
}

function formatCount(value: unknown): string {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		return "";
	}
	if (value >= 1_000) {
		return `${(value / 1_000).toFixed(1)}k`;
	}
	return String(Math.round(value));
}

function areaStatus(status: IndexStatusFile, names: string[]): AreaStatus | undefined {
	for (const name of names) {
		const value = status.areas?.[name]?.status;
		if (value === "failed" || value === "stale" || value === "refreshing" || value === "building") {
			return value;
		}
	}
	for (const name of names) {
		const value = status.areas?.[name]?.status;
		if (value === "ready") {
			return "ready";
		}
	}
	return undefined;
}

function marker(status: AreaStatus | undefined): string {
	switch (status) {
		case "ready":
			return "[ok]";
		case "building":
		case "refreshing":
			return "[..]";
		case "stale":
		case "failed":
			return "[x]";
		default:
			return "[ ]";
	}
}

function formatAreaMarkers(status: IndexStatusFile): string {
	const groups: Array<[string, string[]]> = [
		["cmp", ["components"]],
		["tree", ["folders", "folder_items", "project_items"]],
		["elem", ["elements", "element_decls"]],
		["meth", ["methods", "method_decls"]],
		["refs", ["component_refs", "element_refs", "dbitem_dependencies"]],
		["code", ["code_blocks", "code_terms", "text_code"]],
	];
	return groups.map(([label, names]) => `${marker(areaStatus(status, names))}${label}`).join(" ");
}

function compactAreaName(value: string | undefined): string {
	switch (value) {
		case "components":
			return "cmp";
		case "folders":
		case "folder_items":
		case "project_items":
			return "tree";
		case "elements":
		case "element_decls":
			return "elem";
		case "methods":
		case "method_decls":
			return "meth";
		case "component_refs":
		case "element_refs":
		case "dbitem_dependencies":
			return "refs";
		case "code_blocks":
		case "code_terms":
		case "text_code":
			return "code";
		default:
			return value ?? "";
	}
}

export function formatAscetIndexFooterStatus(status: IndexStatusFile | undefined): string {
	if (!status) {
		return "ASCET index: checking";
	}

	const elapsed = formatElapsed(status.elapsedMs);
	const elapsedSuffix = elapsed ? ` ${elapsed}` : "";
	const state = status.state ?? "checking";
	if (state === "ready") {
		const docs = formatCount(status.totalDocs);
		return `ASCET index: ready${docs ? ` ${docs} docs` : ""}${elapsedSuffix}`;
	}
	if (state === "stale") {
		const stale = status.staleAreas?.map(compactAreaName).filter(Boolean) ?? [];
		const unique = [...new Set(stale)];
		return unique.length > 0
			? `ASCET index: stale ${unique.map((area) => `[x]${area}`).join(" ")}`
			: `ASCET index: stale ${formatAreaMarkers(status)}`;
	}
	if (state === "refreshing") {
		const area = compactAreaName(status.refreshingArea ?? status.currentArea);
		return `ASCET index: refreshing${area ? ` ${area}` : ""}${elapsedSuffix}`;
	}
	if (state === "building") {
		return `ASCET index: ${(status.phase ?? "P0").toUpperCase()}${elapsedSuffix} ${formatAreaMarkers(status)}`;
	}
	if (state === "writing") {
		const docs = formatCount(status.totalDocs);
		return `ASCET index: writing SQLite${docs ? ` ${docs} docs` : ""}`;
	}
	if (state === "failed") {
		const failedArea = compactAreaName(status.currentArea);
		const code = status.error?.code ?? status.areas?.[status.currentArea ?? ""]?.errorCode ?? "";
		return `ASCET index: failed${failedArea ? ` ${failedArea}` : ""}${code ? ` ${code}` : ""}`;
	}
	if (state === "disabled") {
		return "ASCET index: off";
	}
	return "ASCET index: checking";
}

function readStatusFile(path: string): IndexStatusFile | undefined {
	if (!existsSync(path)) {
		return undefined;
	}
	try {
		const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as IndexStatusFile) : undefined;
	} catch {
		return { state: "failed", error: { code: "status_read_failed" } };
	}
}

export function installAscetIndexFooterStatus(ctx: ExtensionContext): AscetIndexFooterHandle {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let stopped = false;
	let lastText = "";
	const statusPath = join(ctx.sessionManager.getCwd(), ".ascet", "index", "status.json");

	const refreshNow = () => {
		if (stopped || !ctx.hasUI || ctx.mode !== "tui") {
			return;
		}
		const status = readStatusFile(statusPath);
		const text = formatAscetIndexFooterStatus(status);
		if (text !== lastText) {
			ctx.ui.setStatus(STATUS_KEY, text);
			lastText = text;
		}
		const active = status?.state === "building" || status?.state === "writing" || status?.state === "refreshing";
		timer = setTimeout(refreshNow, active ? ACTIVE_POLL_MS : IDLE_POLL_MS);
	};

	refreshNow();

	return {
		refreshNow,
		stop() {
			stopped = true;
			if (timer) {
				clearTimeout(timer);
				timer = undefined;
			}
			if (ctx.hasUI && ctx.mode === "tui") {
				ctx.ui.setStatus(STATUS_KEY, undefined);
			}
		},
	};
}
