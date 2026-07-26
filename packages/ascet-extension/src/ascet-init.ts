import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { type AscetInitScope, parseAscetInitArgs } from "./ascet-init-scope.ts";
import {
	ensureRepoAscetRulesScaffold,
	loadAscetInitRuleBundle,
	renderAscetInitRulesPrompt,
} from "./ascet-project-rules.ts";

export const ASCET_AGENT_SECTION_TITLE = "## ASCET Workspace Overview";

export interface AscetInitCommandContext {
	cwd: string;
	isIdle(): boolean;
	sendUserMessage?: (content: string, options?: { deliverAs?: "steer" | "followUp" }) => void | Promise<void>;
	ui: {
		notify(message: string, level?: "info" | "warning" | "error"): void;
	};
}

type ValidAscetInitScope = Exclude<AscetInitScope, { ok: false }>;

interface RepoContextFile {
	path: string;
	content: string;
	truncated: boolean;
}

const REPO_CONTEXT_FILES = ["AGENTS.md", "agent.md", "README.md"] as const;
const MAX_REPO_CONTEXT_CHARS = 8_000;

function renderScopePrompt(scope: ValidAscetInitScope): string {
	if (scope.kind === "auto-detect") {
		return "No explicit scope was provided. Start with ASCET engineering layout detection.";
	}
	if (scope.kind === "database") {
		return "Explicit scope from command args: database";
	}
	return `Explicit scope from command args: ${scope.kind} ${scope.value}`;
}

function truncateRepoContext(content: string): { content: string; truncated: boolean } {
	if (content.length <= MAX_REPO_CONTEXT_CHARS) {
		return { content, truncated: false };
	}
	return { content: content.slice(0, MAX_REPO_CONTEXT_CHARS), truncated: true };
}

async function loadRepoContextFile(cwd: string, path: string): Promise<RepoContextFile | undefined> {
	try {
		const loaded = await readFile(join(cwd, path), "utf8");
		const truncated = truncateRepoContext(loaded);
		return { path, content: truncated.content, truncated: truncated.truncated };
	} catch {
		return undefined;
	}
}

async function loadRepoContext(cwd: string): Promise<RepoContextFile[]> {
	const files = await Promise.all(REPO_CONTEXT_FILES.map((path) => loadRepoContextFile(cwd, path)));
	return files.filter((file): file is RepoContextFile => file !== undefined);
}

function renderRepoContext(files: readonly RepoContextFile[]): string {
	if (files.length === 0) {
		return "Repository context files checked: AGENTS.md, agent.md, README.md. None were present.";
	}

	const lines = [
		"Repository context files loaded for this command.",
		"Use them as constraints and project-local guidance before editing ASCET-related docs or code.",
		"",
	];
	for (const file of files) {
		lines.push(`<repo-file: ${file.path}${file.truncated ? " truncated" : ""}>`);
		lines.push(file.content.trimEnd());
		lines.push("");
	}
	return lines.join("\n").trimEnd();
}

const ASCET_INIT_PROMPT = `You are working in an ASCET Copilot workspace.

This initialization does not build or refresh indexes. The P0 SQLite search index is maintained by startup/background infrastructure and reported by ascet_status and the TUI footer.

Use this workflow for subsequent ASCET coding or analysis tasks:

1. First run ascet_status to check whether the ASCET index is ready, stale, refreshing, failed, or missing.
2. Prefer ascet_search for indexed discovery:
   - components
   - declarations_of_element
   - declarations_of_method_process
   - references_to_component
   - references_to_element
   - text_in_code
3. Use ascet_explore for navigation and scoped structure inspection.
4. Use ascet_read only when exact current live ASCET data or complete code content is needed.
5. Use ascet_write for all ASCET writes. After a write, inspect the result index status and pay attention to stale/refresh state before trusting broad search results.
6. Do not perform ad hoc full-database live scans. Do not call broad ToolAPI GetAll loops from the agent path when indexed search can answer the question.
7. If the index is stale, you may use indexed results as approximate context, but confirm critical current data with ascet_read or wait for refresh.

When updating project guidance, use this section title unless the user explicitly asks for another title: ${ASCET_AGENT_SECTION_TITLE}

Keep future ASCET guidance concise and operational:
- engineering layout and analyzed scope
- assembly entry points
- signal and interface paths
- parameter and data semantics
- scheduling and execution notes
- recommended navigation/search path
- known limitations and stale-index cautions
`;

export function buildAscetInitPrompt(options: {
	scope: ValidAscetInitScope;
	projectRulesPrompt?: string;
	repoContextPrompt?: string;
}): string {
	const sections = [
		renderScopePrompt(options.scope),
		options.projectRulesPrompt,
		options.repoContextPrompt,
		ASCET_INIT_PROMPT,
	].filter((section): section is string => Boolean(section?.trim()));
	return sections.join("\n\n");
}

export async function executeAscetInitCommand(args: string, ctx: AscetInitCommandContext): Promise<void> {
	const parsed = parseAscetInitArgs(args);
	if (parsed.ok === false) {
		ctx.ui.notify(`${parsed.usage}\n${parsed.reason}`, "warning");
		return;
	}

	const { rulesDir } = await ensureRepoAscetRulesScaffold(ctx.cwd);
	const entrypoints = await loadAscetInitRuleBundle(rulesDir);
	const projectRulesPrompt = renderAscetInitRulesPrompt(entrypoints);
	const repoContextPrompt = renderRepoContext(await loadRepoContext(ctx.cwd));
	const prompt = buildAscetInitPrompt({ scope: parsed.scope, projectRulesPrompt, repoContextPrompt });

	if (!ctx.sendUserMessage) {
		ctx.ui.notify(
			"ASCET init prompt could not be sent because the extension message bridge is unavailable.",
			"error",
		);
		return;
	}

	if (ctx.isIdle()) {
		await ctx.sendUserMessage(prompt);
		ctx.ui.notify("ASCET init prompt sent.", "info");
		return;
	}

	await ctx.sendUserMessage(prompt, { deliverAs: "followUp" });
	ctx.ui.notify("Queued ASCET init prompt as a follow-up.", "info");
}
