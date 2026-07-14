# PI ASCET Init Model Engineering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign PI `/ascet-init` so it initializes ASCET model-engineering context by detecting `components` + Project + `XPASS` + `ASW2ASW` before falling back to scope questions.

**Architecture:** Keep `/ascet-init` as a prompt-command workflow starter. Add deterministic command-argument parsing, load a PI-safe init rule bundle, and replace the generic database onboarding prompt with an `/init`-style phased ASCET model-engineering workflow. The agent still performs live ASCET exploration through canonical PI `ascet_*` tools.

**Tech Stack:** TypeScript ESM, Vitest, Node `fs/promises`, PI extension command API, PI canonical ASCET tools, Biome, TypeScript `NodeNext`.

---

### Task 1: Add ASCET Init Scope Parser

**Files:**
- Create: `PI/packages/ascet-extension/src/ascet-init-scope.ts`
- Modify: `PI/packages/coding-agent/test/ascet-init-command.test.ts`

**Step 1: Write the failing tests**

Add this import in `PI/packages/coding-agent/test/ascet-init-command.test.ts`:

```ts
import { parseAscetInitScopeArgs } from "../../ascet-extension/src/ascet-init-scope.ts";
```

Add this test block:

```ts
describe("ASCET init scope args", () => {
	it("parses no-arg, database, folder, and project scopes", () => {
		expect(parseAscetInitScopeArgs("")).toEqual({ ok: true, kind: "auto-detect" });
		expect(parseAscetInitScopeArgs("database")).toEqual({ ok: true, kind: "database" });
		expect(parseAscetInitScopeArgs("folder DEMO\\components")).toEqual({
			ok: true,
			kind: "folder",
			value: "DEMO\\components",
		});
		expect(parseAscetInitScopeArgs("project IdleCon")).toEqual({
			ok: true,
			kind: "project",
			value: "IdleCon",
		});
	});

	it("rejects malformed init scope args", () => {
		expect(parseAscetInitScopeArgs("database extra")).toMatchObject({ ok: false });
		expect(parseAscetInitScopeArgs("folder")).toMatchObject({ ok: false });
		expect(parseAscetInitScopeArgs("project")).toMatchObject({ ok: false });
		expect(parseAscetInitScopeArgs("unknown DEMO")).toMatchObject({ ok: false });
	});
});
```

**Step 2: Run tests to verify failure**

Run:

```powershell
cd E:\Rep\AscetAgent\PI
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-init-command.test.ts
```

Expected: FAIL because `ascet-init-scope.ts` does not exist.

**Step 3: Implement the parser**

Create `PI/packages/ascet-extension/src/ascet-init-scope.ts`:

```ts
export type AscetInitScope =
	| { ok: true; kind: "auto-detect" }
	| { ok: true; kind: "database" }
	| { ok: true; kind: "folder"; value: string }
	| { ok: true; kind: "project"; value: string }
	| { ok: false; usage: string; reason: string };

export const ASCET_INIT_USAGE = "Usage: /ascet-init [database|folder <path>|project <name-or-path>]";

export function parseAscetInitScopeArgs(args: string): AscetInitScope {
	const trimmed = args.trim();
	if (!trimmed) {
		return { ok: true, kind: "auto-detect" };
	}

	const [head, ...tail] = trimmed.split(/\s+/);
	const value = tail.join(" ").trim();

	if (head === "database") {
		if (value) {
			return { ok: false, usage: ASCET_INIT_USAGE, reason: "database scope does not accept extra args" };
		}
		return { ok: true, kind: "database" };
	}

	if (head === "folder") {
		if (!value) {
			return { ok: false, usage: ASCET_INIT_USAGE, reason: "folder scope requires a path" };
		}
		return { ok: true, kind: "folder", value };
	}

	if (head === "project") {
		if (!value) {
			return { ok: false, usage: ASCET_INIT_USAGE, reason: "project scope requires a name or path" };
		}
		return { ok: true, kind: "project", value };
	}

	return { ok: false, usage: ASCET_INIT_USAGE, reason: `unknown scope '${head}'` };
}
```

**Step 4: Run tests to verify pass**

Run:

```powershell
cd E:\Rep\AscetAgent\PI
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-init-command.test.ts
```

Expected: PASS.

**Step 5: Commit**

Do not commit unless the user explicitly asks, because this workspace currently has broad unrelated modified and untracked files.

### Task 2: Stop Invalid Args Before Scaffold Or Prompt Delivery

**Files:**
- Modify: `PI/packages/ascet-extension/src/ascet-init.ts`
- Modify: `PI/packages/coding-agent/test/ascet-init-command.test.ts`

**Step 1: Write the failing test**

In `describe("ASCET init command", ...)`, add:

```ts
it("rejects malformed args before scaffolding or sending a prompt", async () => {
	const projectRoot = createTempProject();
	try {
		const sentMessages: Array<{ content: string; options?: { deliverAs?: "steer" | "followUp" } }> = [];
		const notifications: Array<{ message: string; level?: "info" | "warning" | "error" }> = [];

		await executeAscetInitCommand(
			"folder",
			{
				cwd: projectRoot,
				isIdle: () => true,
				ui: {
					notify: (message: string, level?: "info" | "warning" | "error") =>
						notifications.push({ message, level }),
				},
			},
			{
				sendUserMessage: (content, options) => sentMessages.push({ content, options }),
			},
		);

		expect(sentMessages).toEqual([]);
		expect(notifications).toEqual([
			{
				message: "Usage: /ascet-init [database|folder <path>|project <name-or-path>]",
				level: "warning",
			},
		]);
		expect(existsSync(join(projectRoot, ".ascet", "rules", "manifest.yaml"))).toBe(false);
	} finally {
		removeTempProject(projectRoot);
	}
});
```

**Step 2: Run test to verify failure**

Run:

```powershell
cd E:\Rep\AscetAgent\PI
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-init-command.test.ts
```

Expected: FAIL because malformed args still scaffold and send a prompt.

**Step 3: Wire parser into command executor**

Modify `PI/packages/ascet-extension/src/ascet-init.ts`:

```ts
import { parseAscetInitScopeArgs } from "./ascet-init-scope.ts";
```

At the start of `executeAscetInitCommand()`:

```ts
const scope = parseAscetInitScopeArgs(args);
if (!scope.ok) {
	ctx.ui.notify(scope.usage, "warning");
	return;
}
```

Pass `scope` into `buildAscetInitPrompt()` in a later task. For now, keep `args`
for existing behavior so this task stays small.

**Step 4: Run test to verify pass**

Run:

```powershell
cd E:\Rep\AscetAgent\PI
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-init-command.test.ts
```

Expected: PASS.

**Step 5: Commit**

Do not commit unless the user explicitly asks.

### Task 3: Add Manifest Init Bundle Support

**Files:**
- Modify: `PI/packages/ascet-extension/templates/ascet-project/rules/manifest.yaml`
- Modify: `PI/packages/ascet-extension/src/ascet-project-rules.ts`
- Modify: `PI/packages/coding-agent/test/ascet-init-command.test.ts`

**Step 1: Write failing tests**

In the scaffold test, change the entrypoint assertion into a bundle assertion:

```ts
const bundle = await loadAscetInitRuleBundle(result.rulesDir);
expect(bundle.map((entrypoint) => entrypoint.id)).toEqual([
	"ascet.init.workflow",
	"ascet.tools.pi",
]);
```

Add this import:

```ts
loadAscetInitRuleBundle,
```

Add a malformed manifest test:

```ts
it("rejects init bundle entries missing from manifest rules", async () => {
	const projectRoot = createTempProject();
	try {
		const rulesDir = join(projectRoot, ".ascet", "rules");
		mkdirSync(rulesDir, { recursive: true });
		writeFileSync(
			join(rulesDir, "manifest.yaml"),
			[
				"version: 2",
				"init_bundle:",
				"  - ascet.missing",
				"rules:",
				"  - id: ascet.init.workflow",
				"    path: tasks/init.md",
				"",
			].join("\n"),
			"utf8",
		);

		await expect(loadAscetInitRuleBundle(rulesDir)).rejects.toThrow(
			"ASCET init bundle entry is missing from manifest rules",
		);
	} finally {
		removeTempProject(projectRoot);
	}
});
```

**Step 2: Run tests to verify failure**

Run:

```powershell
cd E:\Rep\AscetAgent\PI
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-init-command.test.ts
```

Expected: FAIL because `loadAscetInitRuleBundle` does not exist.

**Step 3: Add manifest `init_bundle`**

Modify `PI/packages/ascet-extension/templates/ascet-project/rules/manifest.yaml`:

```yaml
init_bundle:
  - ascet.init.workflow
  - ascet.tools.pi
```

Keep the first bundle small. Do not add `always_load` files until their legacy
`Ascet*Tool` names are normalized.

**Step 4: Implement bundle loader**

In `PI/packages/ascet-extension/src/ascet-project-rules.ts`, extend the manifest:

```ts
interface AscetRulesManifest {
	default_entrypoints: string[];
	init_bundle?: string[];
	rules: AscetRulesManifestRule[];
}
```

Update `parseAscetRulesManifest()` to parse `init_bundle` like
`default_entrypoints`:

```ts
const initBundle: string[] = [];
let section: "default_entrypoints" | "init_bundle" | "rules" | undefined;
```

```ts
if (line === "init_bundle:") {
	section = "init_bundle";
	continue;
}
```

```ts
if (section === "init_bundle" && line.startsWith("- ")) {
	initBundle.push(parseInlineString(line.slice(2)));
	continue;
}
```

Return it:

```ts
return { default_entrypoints: defaultEntrypoints, init_bundle: initBundle, rules };
```

Add a shared loader:

```ts
async function loadRulesByIds(
	rulesDir: string,
	manifest: AscetRulesManifest,
	ids: string[],
	missingMessage: string,
): Promise<AscetInitEntrypoint[]> {
	return Promise.all(
		ids.map(async (entrypointId) => {
			const rule = manifest.rules.find((candidate) => candidate.id === entrypointId);
			if (!rule) {
				throw new Error(`${missingMessage}: ${entrypointId}`);
			}
			const resolvedPath = resolveEntrypointPathWithinRulesDir(rulesDir, rule.path);
			return {
				id: rule.id,
				path: rule.path,
				content: await readFile(resolvedPath, "utf8"),
			};
		}),
	);
}
```

Refactor `loadAscetInitEntrypoints()`:

```ts
export async function loadAscetInitEntrypoints(rulesDir: string): Promise<AscetInitEntrypoint[]> {
	const manifestPath = getManifestPath(rulesDir);
	const manifest = parseAscetRulesManifest(await readFile(manifestPath, "utf8"));
	return loadRulesByIds(
		rulesDir,
		manifest,
		manifest.default_entrypoints,
		"ASCET default entrypoint is missing from manifest rules",
	);
}
```

Add:

```ts
export async function loadAscetInitRuleBundle(rulesDir: string): Promise<AscetInitEntrypoint[]> {
	const manifestPath = getManifestPath(rulesDir);
	const manifest = parseAscetRulesManifest(await readFile(manifestPath, "utf8"));
	const ids = manifest.init_bundle?.length ? manifest.init_bundle : manifest.default_entrypoints;
	return loadRulesByIds(
		rulesDir,
		manifest,
		ids,
		"ASCET init bundle entry is missing from manifest rules",
	);
}
```

**Step 5: Run tests to verify pass**

Run:

```powershell
cd E:\Rep\AscetAgent\PI
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-init-command.test.ts
```

Expected: PASS.

**Step 6: Commit**

Do not commit unless the user explicitly asks.

### Task 4: Rewrite Init Rule For ASCET Model-Engineering Workflow

**Files:**
- Modify: `PI/packages/ascet-extension/templates/ascet-project/rules/tasks/init.md`
- Modify: `PI/packages/coding-agent/test/ascet-init-command.test.ts`

**Step 1: Write failing prompt expectations**

In the prompt test, add:

```ts
expect(prompt).toContain("Detect ASCET engineering layout before asking scope");
expect(prompt).toContain("components");
expect(prompt).toContain("XPASS");
expect(prompt).toContain("ASW2ASW");
expect(prompt).toContain("Project anchor");
expect(prompt).toContain("parent-level parameter");
expect(prompt).toContain("not a complete parameter inventory");
expect(prompt).toContain("Ask Scope only if layout detection fails");
```

**Step 2: Run tests to verify failure**

Run:

```powershell
cd E:\Rep\AscetAgent\PI
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-init-command.test.ts
```

Expected: FAIL because the current rule is too generic.

**Step 3: Replace `tasks/init.md` content**

Use this content:

````markdown
# ASCET Init Workflow

Use `/ascet-init` for ASCET model-engineering onboarding. The goal is a concise future-agent navigation summary, not a full database index.

## First Principle

ASCET is model-based engineering. Understand assembly, signal flow, interfaces, scheduling, data semantics, and generated-code impact before reading or changing detailed implementation.

## Scope Flow

1. If the user supplied `database`, `folder <path>`, or `project <name-or-path>`, use that explicit scope.
2. If no explicit scope was supplied, detect ASCET engineering layout before asking scope.
3. Ask Scope only if layout detection fails or is too weak to trust.

## Engineering Layout Detection

Look for a common engineering unit:

```text
<domain>/components
  <Project anchor>
  XPASS
  ASW2ASW
```

Treat the Project anchor as the assembly entry point. Treat `XPASS` and `ASW2ASW` as high-priority signal/interface adaptation anchors.

Also inspect the parent `<domain>` folder for parameter, calibration, or implementation-data hints. Parent-level parameter areas are useful hints but not a complete parameter inventory.

Confidence:

- strong: `components` plus Project anchor plus `XPASS` plus `ASW2ASW`
- medium: `components` plus Project anchor plus one of `XPASS` or `ASW2ASW`
- none: no useful `components` engineering layout

For strong confidence, use the detected engineering unit as the onboarding scope. For medium confidence, ask the user to confirm. For none, ask the user to choose database, folder, or project scope.

## Required Output Section

```md
## ASCET Workspace Overview

### Engineering layout
### Assembly entry points
### Signal and interface path
### Parameter and data semantics
### Scheduling and execution notes
### Recommended navigation path
### Known limitations
```

Mark sampled or heuristic conclusions explicitly. Do not create an exhaustive inventory. Do not dump raw JSON payloads.
````

**Step 4: Run tests to verify pass**

Run:

```powershell
cd E:\Rep\AscetAgent\PI
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-init-command.test.ts
```

Expected: PASS.

**Step 5: Commit**

Do not commit unless the user explicitly asks.

### Task 5: Replace Generic Prompt With Phased `/init`-Style ASCET Prompt

**Files:**
- Modify: `PI/packages/ascet-extension/src/ascet-init.ts`
- Modify: `PI/packages/coding-agent/test/ascet-init-command.test.ts`

**Step 1: Write failing prompt expectations**

Update the prompt tests so no-arg prompts include:

```ts
expect(prompt).toContain("No explicit scope was provided. Start with ASCET engineering layout detection.");
expect(prompt).toContain("Ask Scope only if layout detection fails");
expect(prompt).toContain("Proposal before markdown update");
expect(prompt).toContain("Engineering layout");
expect(prompt).toContain("Assembly entry points");
expect(prompt).toContain("Signal and interface path");
expect(prompt).toContain("Parameter and data semantics");
```

Update explicit scope expectations:

```ts
expect(buildAscetInitPrompt({ scope: { ok: true, kind: "folder", value: "DEMO" } })).toContain(
	"Explicit scope from command args: folder DEMO",
);
```

**Step 2: Run tests to verify failure**

Run:

```powershell
cd E:\Rep\AscetAgent\PI
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-init-command.test.ts
```

Expected: FAIL because `buildAscetInitPrompt()` still accepts raw `args`.

**Step 3: Change prompt builder signature**

In `PI/packages/ascet-extension/src/ascet-init.ts`, import the parser type:

```ts
import type { AscetInitScope } from "./ascet-init-scope.ts";
```

Change signature:

```ts
export function buildAscetInitPrompt(options: {
	scope: Exclude<AscetInitScope, { ok: false }>;
	projectRulesPrompt?: string;
}): string {
	const scopeText = renderScopePrompt(options.scope);
	const prompt = `${scopeText}\n\n${ASCET_INIT_PROMPT}`;
	return options.projectRulesPrompt ? `${options.projectRulesPrompt}\n\n${prompt}` : prompt;
}
```

Add helper:

```ts
function renderScopePrompt(scope: Exclude<AscetInitScope, { ok: false }>): string {
	if (scope.kind === "auto-detect") {
		return "No explicit scope was provided. Start with ASCET engineering layout detection.";
	}
	if (scope.kind === "database") {
		return "Explicit scope from command args: database";
	}
	return `Explicit scope from command args: ${scope.kind} ${scope.value}`;
}
```

Update `executeAscetInitCommand()`:

```ts
const prompt = buildAscetInitPrompt({ scope, projectRulesPrompt });
```

**Step 4: Replace `ASCET_INIT_PROMPT`**

Replace the old generic prompt with a shorter phased prompt:

```ts
const ASCET_INIT_PROMPT = `Create or update an ASCET-focused onboarding section for this PI project.

This command is ASCET model-engineering onboarding, not generic repository onboarding.

## Phase 1: Scope resolution

If scope is explicit, use it.
If no scope is explicit, Detect ASCET engineering layout before asking scope.
Ask Scope only if layout detection fails or is medium confidence and needs user confirmation.

Scope fallback options:
- database
- folder <path>
- project <name-or-path>

## Phase 2: Read existing context

Read only the files needed to safely update the project guidance file:
- README.md
- AGENTS.md
- agent.md
- scaffolded .ascet/rules files loaded above

Do not turn this into generic repository onboarding.

## Phase 3: Runtime preflight

Use ascet_status before live ASCET work.
Use ascet_scheduler_status when runtime health, queueing, lock state, or degraded behavior is unclear.

## Phase 4: Engineering layout detection

For no-arg init, look for <domain>/components. Inside components, look for:
- Project anchor
- XPASS
- ASW2ASW

Also inspect the parent <domain> folder for parent-level parameter, calibration, or implementation-data hints. These are not a complete parameter inventory.

Confidence:
- strong: components + Project anchor + XPASS + ASW2ASW
- medium: components + Project anchor + one of XPASS or ASW2ASW
- none: no useful components engineering layout

Use strong detections as the default onboarding scope. Confirm medium detections with the user. Ask Scope only if layout detection fails.

## Phase 5: Bounded ASCET survey

Use PI canonical ASCET tools only:
1. ascet_explore action=list_components folderPath="" kind="folder"
2. ascet_explore action=list_components folderPath=<candidate>/components kind="all"
3. ascet_search action=resolve_component for Project, XPASS, and ASW2ASW
4. ascet_explore action=inspect_target for assembly and adapter anchors
5. ascet_read only for representative read_implementation, read_block_diagram, or read_state_machine_flow surfaces

Keep budgets small:
- candidate components folders <= 4
- items per candidate folder <= 8
- representative targets <= 4
- deep reads <= 2

## Phase 6: Synthesize model-engineering overview

Include:
- Engineering layout
- Assembly entry points
- Signal and interface path
- Parameter and data semantics
- Scheduling and execution notes
- Recommended navigation path
- Known limitations

Mark sampled and heuristic conclusions explicitly.

## Phase 7: Proposal before markdown update

Before editing markdown, state:
- target file
- detected or requested scope
- sections that will be replaced or appended

## Phase 8: Update markdown

Do not overwrite the whole guidance file.
Only replace or append this section:

${ASCET_AGENT_SECTION_TITLE}

Prefer agent.md if it exists. Otherwise update AGENTS.md. If neither exists, create AGENTS.md.

Avoid exhaustive inventories, raw JSON payloads, and generic coding guidance.
`;
```

**Step 5: Run tests to verify pass**

Run:

```powershell
cd E:\Rep\AscetAgent\PI
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-init-command.test.ts
```

Expected: PASS.

**Step 6: Commit**

Do not commit unless the user explicitly asks.

### Task 6: Switch Command To Init Rule Bundle Loader

**Files:**
- Modify: `PI/packages/ascet-extension/src/ascet-init.ts`
- Modify: `PI/packages/coding-agent/test/ascet-init-command.test.ts`

**Step 1: Write failing assertion**

In the command test that sends the prompt, assert the loaded rule bundle still includes task and tool rules:

```ts
expect(sentMessages[0].content).toContain("ASCET project rules loaded for this command only.");
expect(sentMessages[0].content).toContain("tasks/init.md");
expect(sentMessages[0].content).toContain("tools/pi-ascet-tools.md");
```

If Task 3 already asserts this through `renderAscetInitRulesPrompt`, add this command-level assertion to prove the executor uses the bundle path.

**Step 2: Run tests to verify current behavior**

Run:

```powershell
cd E:\Rep\AscetAgent\PI
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-init-command.test.ts
```

Expected: PASS now if `init_bundle` is identical to `default_entrypoints`; this step locks behavior before refactor.

**Step 3: Replace loader import**

Modify `PI/packages/ascet-extension/src/ascet-init.ts`:

```ts
import {
	ensureRepoAscetRulesScaffold,
	loadAscetInitRuleBundle,
	renderAscetInitRulesPrompt,
} from "./ascet-project-rules.ts";
```

Replace:

```ts
const entrypoints = await loadAscetInitEntrypoints(rulesDir);
```

with:

```ts
const entrypoints = await loadAscetInitRuleBundle(rulesDir);
```

**Step 4: Run tests to verify pass**

Run:

```powershell
cd E:\Rep\AscetAgent\PI
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-init-command.test.ts
```

Expected: PASS.

**Step 5: Commit**

Do not commit unless the user explicitly asks.

### Task 7: Add Guard Against Legacy Tool Names In Init Prompt

**Files:**
- Modify: `PI/packages/coding-agent/test/ascet-init-command.test.ts`
- Modify as needed: `PI/packages/ascet-extension/templates/ascet-project/rules/tasks/init.md`
- Modify as needed: `PI/packages/ascet-extension/templates/ascet-project/rules/tools/pi-ascet-tools.md`

**Step 1: Strengthen existing test**

Replace the three explicit legacy-name assertions with:

```ts
expect(prompt).not.toMatch(/\bAscet[A-Za-z]+Tool\b/);
```

**Step 2: Run tests**

Run:

```powershell
cd E:\Rep\AscetAgent\PI
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-init-command.test.ts
```

Expected: PASS if the init bundle remains PI-safe. If this fails, remove old tool names from files included in `init_bundle`.

**Step 3: Commit**

Do not commit unless the user explicitly asks.

### Task 8: Focused Formatting And Type Checks

**Files:**
- Verify only touched files.

**Step 1: Run targeted tests**

Run:

```powershell
cd E:\Rep\AscetAgent\PI
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-init-command.test.ts
```

Expected: PASS.

**Step 2: Run Biome on touched files**

Run:

```powershell
cd E:\Rep\AscetAgent\PI
npx biome check packages/ascet-extension/src/ascet-init.ts packages/ascet-extension/src/ascet-init-scope.ts packages/ascet-extension/src/ascet-project-rules.ts packages/coding-agent/test/ascet-init-command.test.ts packages/ascet-extension/templates/ascet-project/rules/tasks/init.md packages/ascet-extension/templates/ascet-project/rules/manifest.yaml
```

Expected: PASS or formatting-only diagnostics. If Biome cannot handle markdown/yaml in this repo setup, rerun it on TS files only and record the limitation.

**Step 3: Run focused TypeScript check**

Run:

```powershell
cd E:\Rep\AscetAgent\PI
npx tsc --noEmit --module NodeNext --moduleResolution NodeNext --target ES2022 --types node --allowImportingTsExtensions --skipLibCheck packages/ascet-extension/src/ascet-init.ts packages/ascet-extension/src/ascet-init-scope.ts packages/ascet-extension/src/ascet-project-rules.ts
```

Expected: PASS.

**Step 4: Optional broader regression**

Run only if time permits:

```powershell
cd E:\Rep\AscetAgent\PI
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-init-command.test.ts test/ascet-extension-status.test.ts test/ascet-extension-scheduler.test.ts test/ascet-extension-canonical-tools.test.ts test/ascet-extension-readonly-tools.test.ts test/ascet-extension-write-tools.test.ts test/ascet-extension-copilot-routing.test.ts test/ascet-extension-cli-coverage.test.ts test/ascet-extension-read-code-alias.test.ts test/ascet-extension-core.test.ts
```

Expected: PASS.

**Step 5: Commit**

Do not commit unless the user explicitly asks.

### Task 9: Manual Prompt Review

**Files:**
- No new files expected.

**Step 1: Review generated prompt strings in tests**

Temporarily inspect `buildAscetInitPrompt()` output through a test or local Node/TS snippet.

Expected prompt properties:

- no explicit scope starts with engineering layout detection
- `database`, `folder`, and `project` args are preserved as explicit scopes
- prompt says Ask Scope only after detection fails or medium confidence needs confirmation
- prompt names `components`, Project anchor, `XPASS`, `ASW2ASW`, and parent-level parameter hints
- prompt states parent-level parameters are not complete
- prompt asks for proposal before markdown update
- prompt uses PI canonical `ascet_*` tool names only

**Step 2: Remove temporary inspection code**

Do not leave ad hoc debug scripts or snapshots in the repo.

**Step 3: Commit**

Do not commit unless the user explicitly asks.

## Handoff Notes

- The command remains a prompt workflow starter; it does not directly call ASCET runtime tools.
- Keep `.ascet/rules` command-scoped. Do not add it to generic context loading.
- Do not expand the init bundle to all `always_load` rules until legacy `Ascet*Tool` names are removed or translated.
- Existing full `npx tsgo --noEmit` may fail on unrelated ASCET extension typing issues. Use the focused `tsc` command above for this change unless those broader failures are fixed separately.
