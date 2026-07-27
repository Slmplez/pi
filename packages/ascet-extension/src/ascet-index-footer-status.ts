import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const STATUS_KEY = "00-ascet-index";
const STATUS_LABEL = "ASCET Index";
const STATUS_LAMP = "●";
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
	state?: "checking" | "building" | "writing" | "ready" | "stale" | "refreshing" | "failed" | "missing" | "disabled";
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

export interface AscetIndexFooterContext {
	cwd?: string;
	hasUI?: boolean;
	mode?: string;
	sessionManager?: {
		getCwd(): string;
	};
	ui?: {
		setStatus?(key: string, text: string | undefined): void;
		theme?: FooterTheme;
	};
}

type FooterThemeColor = "accent" | "success" | "warning" | "error" | "dim" | "muted";

interface FooterTheme {
	fg?(color: FooterThemeColor | string, text: string): string;
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
		case "messages":
			return "msg";
		case "code_blocks":
		case "code_terms":
		case "text_code":
			return "code";
		default:
			return value ?? "";
	}
}

function displayState(status: IndexStatusFile | undefined): string {
	if (!status) {
		return "checking";
	}
	return status.state === "disabled" ? "off" : (status.state ?? "checking");
}

function formatStatusDetail(status: IndexStatusFile | undefined): string {
	if (!status) {
		return "";
	}
	const elapsed = formatElapsed(status.elapsedMs);
	const state = status.state ?? "checking";
	if (state === "ready") {
		const docs = formatCount(status.totalDocs);
		return [docs, elapsed].filter(Boolean).join(" ");
	}
	if (state === "stale") {
		const stale = status.staleAreas?.map(compactAreaName).filter(Boolean) ?? [];
		const unique = [...new Set(stale)];
		return unique.join(",");
	}
	if (state === "refreshing") {
		const area = compactAreaName(status.refreshingArea ?? status.currentArea);
		return [area, elapsed].filter(Boolean).join(" ");
	}
	if (state === "building") {
		return [status.phase?.toLowerCase() ?? "p0", elapsed].filter(Boolean).join(" ");
	}
	if (state === "writing") {
		const docs = formatCount(status.totalDocs);
		return docs;
	}
	if (state === "failed") {
		const failedArea = compactAreaName(status.currentArea);
		const code = status.error?.code ?? status.areas?.[status.currentArea ?? ""]?.errorCode ?? "";
		return [failedArea, code].filter(Boolean).join(" ");
	}
	return "";
}

function colorForState(state: string): FooterThemeColor {
	switch (state) {
		case "ready":
			return "success";
		case "stale":
			return "warning";
		case "building":
		case "refreshing":
		case "writing":
			return "accent";
		case "failed":
			return "error";
		default:
			return "dim";
	}
}

function colorize(theme: FooterTheme | undefined, color: FooterThemeColor, text: string): string {
	try {
		return theme?.fg?.(color, text) ?? text;
	} catch {
		return text;
	}
}

export function formatAscetIndexFooterStatus(status: IndexStatusFile | undefined): string {
	const state = displayState(status);
	const detail = formatStatusDetail(status);
	return `${STATUS_LABEL} ${STATUS_LAMP} ${state}${detail ? ` ${detail}` : ""}`;
}

export function formatAscetIndexFooterStatusForTheme(
	status: IndexStatusFile | undefined,
	theme: FooterTheme | undefined,
): string {
	const state = displayState(status);
	const detail = formatStatusDetail(status);
	const lampState = colorize(theme, colorForState(state), `${STATUS_LAMP} ${state}`);
	return `${STATUS_LABEL} ${lampState}${detail ? ` ${detail}` : ""}`;
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

function getContextCwd(ctx: AscetIndexFooterContext): string | undefined {
	return ctx.sessionManager?.getCwd() ?? ctx.cwd;
}

export function installAscetIndexFooterStatus(ctx: AscetIndexFooterContext): AscetIndexFooterHandle {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let stopped = false;
	let lastText = "";
	const cwd = getContextCwd(ctx);
	const statusPath = cwd ? join(cwd, ".ascet", "index", "status.json") : undefined;

	const refreshNow = () => {
		if (stopped || !ctx.hasUI || ctx.mode !== "tui" || !ctx.ui?.setStatus || !statusPath) {
			return;
		}
		const status = readStatusFile(statusPath);
		const text = formatAscetIndexFooterStatusForTheme(status, ctx.ui.theme);
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
			if (ctx.hasUI && ctx.mode === "tui" && ctx.ui?.setStatus) {
				ctx.ui.setStatus(STATUS_KEY, undefined);
			}
		},
	};
}
