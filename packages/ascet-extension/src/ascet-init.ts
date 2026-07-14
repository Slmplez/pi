import { type AscetInitScope, parseAscetInitScopeArgs } from "./ascet-init-scope.ts";
import {
	ensureRepoAscetRulesScaffold,
	loadAscetInitRuleBundle,
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

Your goal is to produce a concise, reusable ASCET workspace overview for future agents. Keep the scan bounded and sampled. Do not deeply read the whole database. Do not try to exhaustively crawl every folder or component.

## Phase 1: Detect ASCET engineering layout before asking scope

ASCET is model-based engineering. Understand project assembly, signal and interface flow, scheduling, data semantics, and generated-code impact before reading or changing detailed implementation.

If an explicit scope is supplied, use it:
- database
- folder <path>
- project <name-or-path>

If no explicit scope is supplied, start by looking for the common ASCET engineering layout:

~~~text
<domain>/components
  <Project anchor>
  XPASS
  ASW2ASW
~~~

Treat the Project anchor as the assembly entry point. Treat XPASS and ASW2ASW as high-priority signal and interface adaptation anchors. Also inspect the parent <domain> folder for parameter, calibration, or implementation-data hints. A parent-level parameter area is useful context but not a complete parameter inventory.

Use this confidence model:
- strong: components plus Project anchor plus XPASS plus ASW2ASW
- medium: components plus Project anchor plus one of XPASS or ASW2ASW
- none: no useful components engineering layout

For strong confidence, use the detected engineering unit as the onboarding scope. For medium confidence, ask the user to confirm. Ask Scope only if layout detection fails or is too weak to trust. When asking, offer exactly: database, folder <path>, or project <name-or-path>. Do not default to scanning the full database just because no args were provided.

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

## Phase 4: Run bounded ASCET model exploration

Use PI canonical ASCET tools only. Use only the canonical PI ascet_* tool names listed in the loaded tool map.

Preferred sequence:
1. ascet_explore action=list_components folderPath="" kind="folder" to browse root folders
2. ascet_explore action=list_components folderPath=<candidate>/components kind="all" to find the Project anchor, XPASS, and ASW2ASW
3. ascet_explore action=list_components folderPath=<candidate-parent> kind="all" to sample parent-level parameter and data hints
4. ascet_search action=resolve_component for likely representative targets
5. ascet_search action=search_components when a project or component name is ambiguous
6. ascet_explore action=inspect_target for a small number of representative targets

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

### Engineering layout
- what scope was analyzed
- whether the scope came from explicit args or engineering-layout detection
- whether detection confidence was strong, medium, or unavailable
- that the summary is sampled / heuristic when appropriate

### Assembly entry points
- likely Project anchor areas
- composition or integration modules/classes/projects found

### Signal and interface path
- likely flow through XPASS, ASW2ASW, or other adapter/interface areas
- dependencies or references that a future agent should inspect first

### Parameter and data semantics
- parent-level parameter, calibration, or implementation-data areas found
- clear caveat that this is not a complete parameter inventory

### Scheduling and execution notes
- any scheduling, runtime, generated-code, or execution-order evidence found from bounded reads

### Recommended navigation path
- where a future agent should start for assembly, signal/interface flow, parameters/data, scheduling, and detailed behavior

### Known limitations
- state clearly that this is a bounded onboarding summary, not a full semantic index
- state clearly when conclusions are sampled, inferred, or unverified

## Phase 7: Proposal before markdown update

Before modifying markdown, briefly propose the planned section replacement or append target. Then update markdown once the target is clear.

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

export function buildAscetInitPrompt(options: { scope: ValidAscetInitScope; projectRulesPrompt?: string }): string {
	const requestedScope = `${renderScopePrompt(options.scope)}\n\n`;
	const prompt = `${requestedScope}${ASCET_INIT_PROMPT}`;
	return options.projectRulesPrompt ? `${options.projectRulesPrompt}\n\n${prompt}` : prompt;
}

export async function executeAscetInitCommand(
	args: string,
	ctx: AscetInitCommandContext,
	pi: Pick<AscetExtensionAPI, "sendUserMessage"> | AscetInitPiApi,
): Promise<void> {
	const scope = parseAscetInitScopeArgs(args);
	if (scope.ok === false) {
		ctx.ui.notify(scope.usage, "warning");
		return;
	}

	const { rulesDir } = await ensureRepoAscetRulesScaffold(ctx.cwd);
	const entrypoints = await loadAscetInitRuleBundle(rulesDir);
	const projectRulesPrompt = renderAscetInitRulesPrompt(entrypoints);
	const prompt = buildAscetInitPrompt({ scope, projectRulesPrompt });

	if (ctx.isIdle()) {
		pi.sendUserMessage(prompt);
		return;
	}

	pi.sendUserMessage(prompt, { deliverAs: "followUp" });
	ctx.ui.notify("Queued ASCET init as a follow-up.", "info");
}
