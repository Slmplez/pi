interface TextComponent {
	render(width: number): string[];
	invalidate(): void;
}

interface AscetRenderTheme {
	bold(text: string): string;
	fg(role: string, text: string): string;
}

interface AscetRenderContext {
	toolName?: string;
	args?: unknown;
	state?: Record<string, unknown>;
	argsComplete?: boolean;
	executionStarted?: boolean;
	isPartial?: boolean;
	expanded?: boolean;
	hasResult?: boolean;
	isError?: boolean;
}

type AscetStatus = "ARGS" | "QUEUED" | "RUNNING" | "READBACK" | "DONE" | "PARTIAL" | "BLOCKED" | "FAILED" | "TIMEOUT";

function truncateLine(text: string, width: number): string {
	if (width <= 0 || text.length <= width) {
		return text;
	}
	if (width <= 3) {
		return text.slice(0, width);
	}
	const visible = width - 3;
	const head = Math.ceil(visible / 2);
	const tail = Math.floor(visible / 2);
	return `${text.slice(0, head)}...${text.slice(text.length - tail)}`;
}

function textComponent(text: string | string[]): TextComponent {
	const lines = Array.isArray(text) ? text : text.split("\n");
	return {
		render(width: number) {
			return lines.map((line) => truncateLine(line, width));
		},
		invalidate() {},
	};
}

function style(theme: AscetRenderTheme | undefined, role: string, text: string): string {
	return theme?.fg ? theme.fg(role, text) : text;
}

function bold(theme: AscetRenderTheme | undefined, text: string): string {
	return theme?.bold ? theme.bold(text) : text;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function readArg(args: unknown, ...keys: string[]): string | undefined {
	const record = asRecord(args);
	if (!record) {
		return undefined;
	}
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "string" && value.trim().length > 0) {
			return value.trim();
		}
	}
	return undefined;
}

function readPath(details: unknown, path: string[]): unknown {
	let current = details;
	for (const key of path) {
		const record = asRecord(current);
		if (!record) {
			return undefined;
		}
		current = record[key];
	}
	return current;
}

function readString(details: unknown, ...path: string[]): string | undefined {
	const value = readPath(details, path);
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readBoolean(details: unknown, ...path: string[]): boolean | undefined {
	const value = readPath(details, path);
	return typeof value === "boolean" ? value : undefined;
}

function readNumber(details: unknown, ...path: string[]): number | undefined {
	const value = readPath(details, path);
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getTarget(args: unknown): string | undefined {
	const left = readArg(args, "leftComponentPath");
	const right = readArg(args, "rightComponentPath");
	if (left && right) {
		return `${left} -> ${right}`;
	}

	let target = readArg(args, "componentPath", "classPath", "modulePath", "folderPath", "projectPath");
	const method = readArg(args, "methodName");
	const element = readArg(args, "elementName");
	const diagram = readArg(args, "diagramName");

	if (target && method) {
		target = `${target}.${method}`;
	} else if (target && element) {
		target = `${target}::${element}`;
	} else if (!target) {
		target = method ?? element;
	}
	if (target && diagram) {
		target = `${target}/${diagram}`;
	}
	return target ?? readArg(args, "query");
}

function getAction(args: unknown, details: unknown): string | undefined {
	return readString(details, "action") ?? readString(details, "data", "action") ?? readArg(args, "action");
}

function formatToolLabel(toolName: string): string {
	const suffix = toolName.replace(/^ascet[_-]?/i, "");
	if (!suffix) {
		return "ASCET";
	}
	const words = suffix
		.split(/[_-]+/u)
		.filter(Boolean)
		.map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`);
	return `ASCET ${words.join(" ")}`;
}

function normalizeStatus(value: unknown): AscetStatus | undefined {
	if (typeof value !== "string") {
		return undefined;
	}
	const normalized = value
		.trim()
		.toLowerCase()
		.replace(/[-\s]+/gu, "_");
	switch (normalized) {
		case "args":
		case "arguments":
			return "ARGS";
		case "queued":
		case "queue":
			return "QUEUED";
		case "running":
		case "executing":
		case "in_progress":
			return "RUNNING";
		case "readback":
		case "verifying":
			return "READBACK";
		case "done":
		case "ok":
		case "success":
		case "succeeded":
		case "verified":
			return "DONE";
		case "partial":
			return "PARTIAL";
		case "blocked":
		case "preflight":
		case "confirmation_required":
		case "cancelled":
		case "canceled":
			return "BLOCKED";
		case "timeout":
		case "timed_out":
			return "TIMEOUT";
		case "failed":
		case "failure":
		case "error":
			return "FAILED";
		default:
			return undefined;
	}
}

function getStatus(details: unknown, options: { isPartial: boolean }, context?: AscetRenderContext): AscetStatus {
	const explicit = normalizeStatus(readString(details, "status") ?? readString(details, "progress", "phase"));
	if (explicit) {
		return explicit;
	}

	if (options.isPartial) {
		return context?.executionStarted ? "RUNNING" : context?.argsComplete ? "QUEUED" : "ARGS";
	}

	const errorCode = readString(details, "error", "code");
	const stage = readString(details, "diagnostics", "stage");
	if (errorCode?.includes("timeout") || stage?.includes("timeout")) {
		return "TIMEOUT";
	}
	if (
		errorCode?.includes("confirmation") ||
		errorCode?.includes("preflight") ||
		errorCode?.includes("blocked") ||
		errorCode?.includes("aborted_before")
	) {
		return "BLOCKED";
	}
	if (context?.isError || readPath(details, ["ok"]) === false) {
		return "FAILED";
	}
	return "DONE";
}

function getResultSummary(details: unknown): string | undefined {
	const candidates = [
		readString(details, "summary"),
		readString(details, "data", "result", "summary"),
		readString(details, "data", "summary"),
		readString(details, "artifact", "summary"),
		readString(details, "data", "operation"),
		readString(details, "operation"),
	];
	for (const value of candidates) {
		if (!value) {
			continue;
		}
		const firstLine = value
			.split(/\r?\n/u)
			.map((line) => line.trim())
			.find((line) => line.length > 0);
		if (firstLine) {
			return firstLine.replace(/\s+/gu, " ");
		}
	}
	return undefined;
}

function getCounts(details: unknown): string | undefined {
	const counts =
		asRecord(readPath(details, ["counts"])) ??
		asRecord(readPath(details, ["data", "counts"])) ??
		asRecord(readPath(details, ["data", "result", "counts"]));
	if (!counts) {
		return undefined;
	}
	const entries = Object.entries(counts).filter(([, value]) => typeof value === "number" || typeof value === "string");
	return entries.length > 0 ? entries.map(([key, value]) => `${key}=${String(value)}`).join(", ") : undefined;
}

function getDurationMs(details: unknown, context?: AscetRenderContext): number | undefined {
	return (
		readNumber(details, "durationMs") ??
		readNumber(details, "executionMs") ??
		readNumber(details, "diagnostics", "executionMs") ??
		readNumber(details, "diagnostics", "durationMs") ??
		readNumber(details, "progress", "elapsedMs") ??
		(typeof context?.state?.startedAtMs === "number" ? Date.now() - context.state.startedAtMs : undefined)
	);
}

function formatDuration(ms: number | undefined): string | undefined {
	if (ms === undefined || ms < 0) {
		return undefined;
	}
	if (ms < 1000) {
		return `${Math.round(ms)}ms`;
	}
	const seconds = ms / 1000;
	return `${seconds >= 10 ? Math.round(seconds) : seconds.toFixed(1).replace(/\.0$/u, "")}s`;
}

function getErrorCode(details: unknown): string | undefined {
	return readString(details, "error", "code");
}

function isRetryable(details: unknown): boolean {
	return (
		readBoolean(details, "diagnostics", "retryable") === true ||
		readBoolean(details, "error", "details", "retryable") === true
	);
}

function isVerified(details: unknown): boolean {
	return (
		readBoolean(details, "verified") === true ||
		readBoolean(details, "data", "verified") === true ||
		readBoolean(details, "data", "result", "verified") === true ||
		(normalizeStatus(readString(details, "status")) === "DONE" &&
			readString(details, "status")?.toLowerCase() === "verified")
	);
}

function getRecoveryActions(details: unknown): string[] {
	const value = readPath(details, ["error", "recoveryActions"]);
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string" && item.length > 0)
		: [];
}

function statusRole(status: AscetStatus): string {
	if (status === "DONE") return "success";
	if (status === "FAILED" || status === "TIMEOUT") return "error";
	if (status === "BLOCKED" || status === "PARTIAL") return "warning";
	return "accent";
}

function getStatusLine(details: unknown, options: { isPartial: boolean }, context?: AscetRenderContext): string {
	const status = getStatus(details, options, context);
	const fragments: string[] = [];
	const errorCode = getErrorCode(details);
	const summary = getResultSummary(details);
	const counts = getCounts(details);
	const duration = formatDuration(getDurationMs(details, context));

	if (status === "DONE") {
		if (summary) fragments.push(summary);
		if (counts) fragments.push(counts);
		if (isVerified(details)) fragments.push("Verified");
	} else if (status === "FAILED" || status === "TIMEOUT" || status === "BLOCKED") {
		if (errorCode) fragments.push(errorCode);
		if (isRetryable(details)) fragments.push("Retryable");
		if (summary && !errorCode) fragments.push(summary);
	} else if (summary) {
		fragments.push(summary);
	}

	if (duration) fragments.push(duration);
	return `Status: ${status}${fragments.length > 0 ? ` · ${fragments.join(" · ")}` : ""}`;
}

function getExpandedLines(details: unknown): string[] {
	const lines: string[] = [];
	const logical = readString(details, "command", "logicalCommandId");
	const backend = readString(details, "command", "backendCommandId");
	const queueWaitMs = readNumber(details, "diagnostics", "queueWaitMs") ?? readNumber(details, "queueWaitMs");
	const executionMs = readNumber(details, "diagnostics", "executionMs") ?? readNumber(details, "executionMs");
	const artifact = readString(details, "artifact", "path");
	const stage = readString(details, "diagnostics", "stage");
	const errorMessage = readString(details, "error", "message");
	const recoveryActions = getRecoveryActions(details);

	if (logical) lines.push(`Logical: ${logical}`);
	if (backend) lines.push(`Backend: ${backend}`);
	if (stage) lines.push(`Stage: ${stage}`);
	if (queueWaitMs !== undefined) lines.push(`Queue: ${formatDuration(queueWaitMs)}`);
	if (executionMs !== undefined) lines.push(`Execution: ${formatDuration(executionMs)}`);
	if (artifact) lines.push(`Artifact: ${artifact}`);
	if (errorMessage) lines.push(`Message: ${errorMessage}`);
	if (recoveryActions.length > 0) lines.push(`Recovery: ${recoveryActions.join("; ")}`);
	return lines;
}

export function renderAscetToolCall(
	args: unknown,
	theme?: AscetRenderTheme,
	context?: AscetRenderContext,
): TextComponent {
	const action = getAction(args, undefined);
	const toolLabel = formatToolLabel(context?.toolName ?? "ascet");
	const title = action ? `${toolLabel} · ${action}` : toolLabel;
	const target = getTarget(args);
	const lines = [style(theme, "toolTitle", bold(theme, title))];
	if (target) {
		lines.push(`Target: ${style(theme, "accent", target)}`);
	}
	if (context?.hasResult !== true) {
		const status = getStatus(undefined, { isPartial: true }, context);
		lines.push(style(theme, statusRole(status), `Status: ${status}`));
	}
	return textComponent(lines);
}

export function renderAscetToolResult(
	result: { details?: unknown },
	options: { expanded: boolean; isPartial: boolean },
	theme?: AscetRenderTheme,
	context?: AscetRenderContext,
): TextComponent {
	const status = getStatus(result.details, options, context);
	const lines = [style(theme, statusRole(status), getStatusLine(result.details, options, context))];
	if (options.expanded && !options.isPartial) {
		lines.push(...getExpandedLines(result.details).map((line) => style(theme, "muted", line)));
	}
	return textComponent(lines);
}
