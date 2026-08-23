export interface AiGeneratedRegion {
	startLine: number;
	endLine: number;
	closed: boolean;
}

export interface AiGeneratedMarkerIssue {
	code:
		| "ai_marker_invalid_line"
		| "ai_marker_unmatched_end"
		| "ai_marker_nested"
		| "ai_marker_empty"
		| "ai_marker_unclosed";
	message: string;
}

export interface AiGeneratedMarkerInspection {
	regions: AiGeneratedRegion[];
	issue?: AiGeneratedMarkerIssue;
}

const BEGIN_MARKER = /^\s*\/\/\[AI-GEN\]\s*$/u;
const END_MARKER = /^\s*\/\/\[\/AI-GEN\]\s*$/u;
const MALFORMED_MARKER = /^\s*\/\/\[(?:\/?AI-GEN)\]/u;

export function inspectAiGeneratedMarkers(code: string): AiGeneratedMarkerInspection {
	const lines = code.split(/\r?\n/u);
	const regions: AiGeneratedRegion[] = [];
	const firstNonEmptyLine = lines.findIndex((line) => line.trim().length > 0) + 1;
	let openStartLine: number | undefined;
	let hasContent = false;

	for (let index = 0; index < lines.length; index++) {
		const line = lines[index] ?? "";
		const lineNumber = index + 1;
		const isBegin = BEGIN_MARKER.test(line);
		const isEnd = END_MARKER.test(line);

		if (!isBegin && !isEnd && MALFORMED_MARKER.test(line)) {
			return issue("ai_marker_invalid_line", `AI marker must occupy its own line (line ${lineNumber}).`);
		}
		if (isBegin) {
			if (openStartLine !== undefined) return issue("ai_marker_nested", `Nested AI marker at line ${lineNumber}.`);
			openStartLine = lineNumber;
			hasContent = false;
			continue;
		}
		if (isEnd) {
			if (openStartLine === undefined)
				return issue("ai_marker_unmatched_end", `Unmatched AI end marker at line ${lineNumber}.`);
			if (!hasContent) return issue("ai_marker_empty", `AI marker region is empty at line ${lineNumber}.`);
			regions.push({ startLine: openStartLine, endLine: lineNumber, closed: true });
			openStartLine = undefined;
			continue;
		}
		if (openStartLine !== undefined && line.trim().length > 0) hasContent = true;
	}

	if (openStartLine !== undefined) {
		if (openStartLine !== firstNonEmptyLine)
			return issue("ai_marker_unclosed", `AI marker at line ${openStartLine} is not closed.`);
		if (!hasContent) return issue("ai_marker_empty", `AI marker region at line ${openStartLine} is empty.`);
		regions.push({ startLine: openStartLine, endLine: lines.length, closed: false });
	}
	return { regions };
}

function issue(code: AiGeneratedMarkerIssue["code"], message: string): AiGeneratedMarkerInspection {
	return { regions: [], issue: { code, message } };
}
