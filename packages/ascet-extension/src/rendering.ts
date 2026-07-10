interface TextComponent {
	render(width: number): string[];
	invalidate(): void;
}

interface AscetRenderTheme {
	bold(text: string): string;
	fg(role: string, text: string): string;
}

function textComponent(text: string): TextComponent {
	return {
		render(width: number) {
			if (width <= 0 || text.length <= width) {
				return [text];
			}
			return [`${text.slice(0, Math.max(0, width - 1))}...`];
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

function readArg(args: unknown, ...keys: string[]): string | undefined {
	if (!args || typeof args !== "object") {
		return undefined;
	}
	const record = args as Record<string, unknown>;
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "string" && value.length > 0) {
			return value;
		}
	}
	return undefined;
}

function getTarget(args: unknown): string | undefined {
	const left = readArg(args, "leftComponentPath");
	const right = readArg(args, "rightComponentPath");
	if (left && right) {
		return `${left} -> ${right}`;
	}
	return readArg(
		args,
		"componentPath",
		"classPath",
		"folderPath",
		"projectPath",
		"query",
		"methodName",
		"elementName",
	);
}

function readPath(details: unknown, path: string[]): unknown {
	let current = details;
	for (const key of path) {
		if (!current || typeof current !== "object") {
			return undefined;
		}
		current = (current as Record<string, unknown>)[key];
	}
	return current;
}

function getResultSummary(details: unknown): string | undefined {
	const directSummary = readPath(details, ["data", "result", "summary"]);
	if (typeof directSummary === "string" && directSummary.length > 0) {
		return directSummary;
	}
	const operation = readPath(details, ["data", "operation"]);
	if (typeof operation === "string" && operation.length > 0) {
		return operation;
	}
	const statusSummary = readPath(details, ["summary"]);
	if (typeof statusSummary === "string" && statusSummary.length > 0) {
		return statusSummary.split("\n")[0];
	}
	const errorCode = readPath(details, ["error", "code"]);
	const errorMessage = readPath(details, ["error", "message"]);
	if (typeof errorCode === "string") {
		return typeof errorMessage === "string" && errorMessage.length > 0 ? `${errorCode}: ${errorMessage}` : errorCode;
	}
	return undefined;
}

export function renderAscetToolCall(args: unknown, theme?: AscetRenderTheme): TextComponent {
	const target = getTarget(args);
	const title = style(theme, "toolTitle", bold(theme, "ascet "));
	const text = target ? `${title}${style(theme, "accent", target)}` : title.trimEnd();
	return textComponent(text);
}

export function renderAscetToolResult(
	result: { details?: unknown },
	options: { expanded: boolean; isPartial: boolean },
	theme?: AscetRenderTheme,
): TextComponent {
	if (options.isPartial) {
		return textComponent(style(theme, "warning", "ASCET running..."));
	}
	const ok = readPath(result.details, ["ok"]);
	const prefix = ok === false ? style(theme, "error", "ASCET failed") : style(theme, "success", "ASCET ok");
	const summary = getResultSummary(result.details);
	return textComponent(summary ? `${prefix} ${style(theme, "muted", summary)}` : prefix);
}
