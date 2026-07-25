import { writeAscetInitArtifacts } from "./ascet-init-artifacts.ts";
import { runAscetInitIndex } from "./ascet-init-index.ts";
import { type AscetInitScope, parseAscetInitArgs } from "./ascet-init-scope.ts";
import {
	ensureRepoAscetRulesScaffold,
	loadAscetInitRuleBundle,
	renderAscetInitRulesPrompt,
} from "./ascet-project-rules.ts";
import type { AscetExtensionAPI } from "./core/tool.ts";
import type { AscetSearchIndexWarmupOptions, AscetSearchIndexWarmupResult } from "./search-index.ts";

export const ASCET_AGENT_SECTION_TITLE = "## ASCET Workspace Overview";

export interface AscetInitCommandContext {
	cwd: string;
	env?: Record<string, string | undefined>;
	warmSearchIndex?: (options: AscetSearchIndexWarmupOptions) => Promise<AscetSearchIndexWarmupResult>;
	isIdle(): boolean;
	ui: {
		notify(message: string, level?: "info" | "warning" | "error"): void;
	};
}

export interface AscetInitPiApi {
	sendUserMessage(content: string, options?: { deliverAs?: "steer" | "followUp" }): void;
}

type ValidAscetInitScope = Exclude<AscetInitScope, { ok: false }>;

function renderScopePrompt(scope: ValidAscetInitScope): string {
	if (scope.kind === "auto-detect") {
		return "No explicit scope was provided. Start with ASCET engineering layout detection.";
	}
	if (scope.kind === "database") {
		return "Explicit scope from command args: database";
	}
	return `Explicit scope from command args: ${scope.kind} ${scope.value}`;
}

const ASCET_INIT_PROMPT = `Create or update an ASCET model-engineering onboarding section for this PI project.

This command is for ASCET model-based engineering onboarding, not generic repository onboarding.

Deterministic ASCET initialization has already run before this prompt. Use the generated artifacts first:
- .ascet/index/manifest.json
- .ascet/ascet-workspace-summary.json

Use indexed ASCET tools for discovery. Use live reads only for representative confirmation:
- ascet_search.* for indexed component, element, reference, message, and text-code discovery
- ascet_explore.* for navigation and diagram metadata
- ascet_read.read_code only when complete current live code is needed

Do not rebuild the index, do not exhaustively scan the database, and do not paste raw JSON payloads into markdown.

Read only the context files needed to safely update project guidance:
- README.md
- AGENTS.md
- agent.md
- .ascet/index/manifest.json
- .ascet/ascet-workspace-summary.json
- the scaffolded .ascet/rules default entrypoints created by /ascet-init

Update target rules:
- If agent.md already exists, update agent.md.
- Otherwise update AGENTS.md.
- If neither file exists, create AGENTS.md.
- Use this exact section title unless the user explicitly requested another one: ${ASCET_AGENT_SECTION_TITLE}
- Replace or append only that ASCET section; preserve manual edits outside it.

The final ASCET section must be concise, reusable, onboarding-oriented, scoped to the analyzed database/folder/project, and useful to future agents deciding where to explore next.

Include:
- Engineering layout and analyzed scope
- Assembly entry points
- Signal and interface path
- Parameter and data semantics
- Scheduling and execution notes
- Recommended navigation path
- Known limitations
`;

export function buildAscetInitPrompt(options: {
	scope: ValidAscetInitScope;
	projectRulesPrompt?: string;
	artifacts?: { manifest: string; summary: string };
}): string {
	const requestedScope = `${renderScopePrompt(options.scope)}\n\n`;
	const artifacts = options.artifacts
		? `ASCET init artifacts:\n- manifest: ${options.artifacts.manifest}\n- summary: ${options.artifacts.summary}\n\n`
		: "";
	const prompt = `${requestedScope}${artifacts}${ASCET_INIT_PROMPT}`;
	return options.projectRulesPrompt ? `${options.projectRulesPrompt}\n\n${prompt}` : prompt;
}

export async function executeAscetInitCommand(
	args: string,
	ctx: AscetInitCommandContext,
	pi: Pick<AscetExtensionAPI, "sendUserMessage"> | AscetInitPiApi,
): Promise<void> {
	const parsed = parseAscetInitArgs(args);
	if (parsed.ok === false) {
		ctx.ui.notify(`${parsed.usage}\n${parsed.reason}`, "warning");
		return;
	}

	const { rulesDir } = await ensureRepoAscetRulesScaffold(ctx.cwd);
	const entrypoints = await loadAscetInitRuleBundle(rulesDir);
	const projectRulesPrompt = renderAscetInitRulesPrompt(entrypoints);
	const index = await runAscetInitIndex({
		cwd: ctx.cwd,
		env: ctx.env,
		indexMode: parsed.indexMode,
		forceRefresh: parsed.forceRefresh,
		warmSearchIndex: ctx.warmSearchIndex,
	});
	if (index.error && index.index.status === "failed") {
		ctx.ui.notify(`${index.error.message}\n${index.error.recover.join("\n")}`, "error");
		return;
	}
	const artifacts = parsed.writeSummary
		? await writeAscetInitArtifacts({
				cwd: ctx.cwd,
				scope: parsed.scope,
				index,
			})
		: undefined;
	const prompt = buildAscetInitPrompt({ scope: parsed.scope, projectRulesPrompt, artifacts });
	const partitionCount = index.index.partitions?.length ?? 0;
	ctx.ui.notify(
		`ASCET init index ${index.index.status}: ${partitionCount} partition(s)${
			artifacts ? `; wrote ${artifacts.manifest} and ${artifacts.summary}` : ""
		}`,
		index.error ? "warning" : "info",
	);

	if (ctx.isIdle()) {
		pi.sendUserMessage(prompt);
		return;
	}

	pi.sendUserMessage(prompt, { deliverAs: "followUp" });
	ctx.ui.notify("Queued ASCET init as a follow-up.", "info");
}
