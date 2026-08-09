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

This initialization uses live ASCET data on demand through ascet_get and the Pi file tools when large results are stored as task-local observations.

Use this workflow for subsequent ASCET coding or analysis tasks:

1. First run ascet_status when ASCET runtime availability is uncertain.
2. Use ascet_get to navigate and retrieve live data on demand:
   - tree for folder and component navigation
   - elements for component element identity and scope
   - formulas for complete project formula data
   - component_refs for component-instance relationships
   - bde_edges for BDE signal-flow connections
   - import_binding for final Imported/Exported binding validation
   - dbitem_refs for database-object dependencies
3. For large Get results, use Pi find/grep/read on the returned task-local NDJSON and metadata files. Do not treat these observations as a persistent database.
4. Use ascet_read only after the target is located, when exact type, value, implementation, diagram, method, or code detail is needed.
5. Use ascet_edit for all ASCET writes. Executed writes perform mandatory automatic action-specific readback verification; inspect the returned verification feedback and only request a fresh bounded read when verification is partial or new structure evidence is needed.
6. Keep live ToolAPI calls scoped to the required folder, component, project, or reference target. Do not perform ad hoc full-database live scans.

When updating project guidance, use this section title unless the user explicitly asks for another title: ${ASCET_AGENT_SECTION_TITLE}

Keep future ASCET guidance concise and operational:
- engineering layout and analyzed scope
- assembly entry points
- signal and interface paths
- parameter and data semantics
- scheduling and execution notes
- recommended get/read path
- known live-data and scope limitations
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
