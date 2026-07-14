import { parseAscetInitScopeArgs } from "./ascet-init-scope.ts";
import {
	ensureRepoAscetRulesScaffold,
	loadAscetInitEntrypoints,
	renderAscetInitRulesPrompt,
} from "./ascet-project-rules.ts";
import type { AscetExtensionAPI } from "./core/tool.ts";

export const ASCET_AGENT_SECTION_TITLE = "## ASCET Workspace Overview";

export interface AscetInitCommandContext {
	cwd: string;
	isIdle(): boolean;
	ui: {
		notify(message: string, level?: "info" | "warning" | "error"): void;
	};
}

export interface AscetInitPiApi {
	sendUserMessage(content: string, options?: { deliverAs?: "steer" | "followUp" }): void;
}

const ASCET_INIT_PROMPT = `Create or update an ASCET-focused onboarding section for this PI project.

This command is for ASCET database onboarding, not generic repository onboarding.

Your goal is to produce a concise, reusable ASCET workspace overview for future agents. Keep the scan bounded and sampled. Do not deeply read the whole database. Do not try to exhaustively crawl every folder or component.

## Phase 1: Confirm scope

If the requested scope is not explicit, ask the user what ASCET scope should be analyzed.

Offer these options:
- current database
- folder <path>
- project <path-or-name>

If the user does not choose a narrower scope, default to the current database.

## Phase 2: Read project context

Read only the context files needed to safely update the project guidance file and align with existing repo conventions.

Check:
- README.md
- AGENTS.md
- agent.md
- the scaffolded project .ascet/rules default entrypoints created by /ascet-init

Output target rules:
- If agent.md already exists, update agent.md.
- Otherwise update AGENTS.md.
- If neither file exists, create AGENTS.md.
- Use this exact section title unless the user explicitly requested another one: ${ASCET_AGENT_SECTION_TITLE}

Do not turn this into generic repository onboarding. Only read enough to update the ASCET section and preserve existing conventions.

## Phase 3: Runtime preflight

Use ascet_status before live ASCET work.
Use ascet_scheduler_status when runtime health, queueing, lock state, or degraded behavior is unclear.

## Phase 4: Run bounded ASCET exploration

Use PI canonical ASCET tools only. Do not use old ASCET Copilot tool names.

Preferred sequence:
1. ascet_explore action=list_components folderPath="" kind="folder" to browse root folders
2. ascet_explore action=list_components folderPath=<sample-folder> kind="all" to sample folder contents
3. ascet_search action=resolve_component for likely representative targets
4. ascet_search action=search_components when a project or component name is ambiguous
5. ascet_explore action=inspect_target for a small number of representative targets

Use ascet_read only for a few representative samples when needed:
- ascet_read action=read_implementation
- ascet_read action=read_block_diagram
- ascet_read action=read_state_machine_flow

## Phase 5: Stay bounded

Use these sampling budgets unless the user explicitly asks for a narrower scope:
- top-level folder sample <= 4
- components per sampled folder <= 4
- representative targets <= 4
- deep reads <= 2

Keep the workflow sampled and bounded:
- do not exhaustively traverse the whole database
- do not inspect every folder or project
- do not deeply read every representative component
- prefer representative samples over completeness

If the user selected:
- database: stay especially high-level
- folder: be more specific within that subtree
- project: focus on project shape, representative children, and likely entry areas

## Phase 6: Synthesize ASCET onboarding summary

Generate a concise summary suitable for future agents. The summary must not be a dump of raw tool payloads.

Include these sections:

### ASCET workspace scope
- what scope was analyzed
- whether it was database, folder, or project scoped
- that the summary is sampled / heuristic when appropriate

### Database shape
- top-level folders or projects found
- dominant object kinds present
- notable component categories

### Architecture patterns
Infer likely patterns from the sampled exploration, for example:
- modules used for wiring or orchestration
- classes used for logic or algorithms
- state machines used for modes or transitions
- projects used for composition or integration

Be explicit when these are sampled inferences rather than confirmed facts.

### Recommended navigation path
Describe where a future agent should start when it wants to inspect:
- behavior
- wiring / composition
- dependencies / references
- mode / transition logic

### Known limitations
State clearly that this is a bounded onboarding summary, not a full semantic index.

## Phase 7: Update markdown

Do not overwrite the whole guidance file.

Instead:
- if the ASCET section exists, replace or update only that section
- if no ASCET section exists, append one
- preserve manual edits outside the ASCET section

Use this exact section title unless the user explicitly requested another one:

${ASCET_AGENT_SECTION_TITLE}

## Quality bar

The final ASCET section must be:
- concise
- reusable
- onboarding-oriented
- scoped to the analyzed database, folder, or project
- useful to future agents deciding where to explore next

Avoid:
- exhaustive inventories
- raw JSON payloads
- deep implementation explanation
- generic coding guidance
`;

export function buildAscetInitPrompt(options: { args: string; projectRulesPrompt?: string }): string {
	const requestedScope = options.args.trim()
		? `Requested scope from command args: ${options.args.trim()}\n\n`
		: "No explicit scope was provided in the command args. Confirm scope before scanning.\n\n";
	const prompt = `${requestedScope}${ASCET_INIT_PROMPT}`;
	return options.projectRulesPrompt ? `${options.projectRulesPrompt}\n\n${prompt}` : prompt;
}

export async function executeAscetInitCommand(
	args: string,
	ctx: AscetInitCommandContext,
	pi: Pick<AscetExtensionAPI, "sendUserMessage"> | AscetInitPiApi,
): Promise<void> {
	const scope = parseAscetInitScopeArgs(args);
	if (!scope.ok) {
		ctx.ui.notify(scope.usage, "warning");
		return;
	}

	const { rulesDir } = await ensureRepoAscetRulesScaffold(ctx.cwd);
	const entrypoints = await loadAscetInitEntrypoints(rulesDir);
	const projectRulesPrompt = renderAscetInitRulesPrompt(entrypoints);
	const prompt = buildAscetInitPrompt({ args, projectRulesPrompt });

	if (ctx.isIdle()) {
		pi.sendUserMessage(prompt);
		return;
	}

	pi.sendUserMessage(prompt, { deliverAs: "followUp" });
	ctx.ui.notify("Queued ASCET init as a follow-up.", "info");
}
