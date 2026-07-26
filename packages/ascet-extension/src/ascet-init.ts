import { writeAscetInitArtifacts } from "./ascet-init-artifacts.ts";
import { type AscetInitProgressEvent, runAscetInitIndex } from "./ascet-init-index.ts";
import { type AscetInitScope, parseAscetInitArgs } from "./ascet-init-scope.ts";
import {
	ensureRepoAscetRulesScaffold,
	loadAscetInitRuleBundle,
	renderAscetInitRulesPrompt,
} from "./ascet-project-rules.ts";
import type { AscetSearchIndexWarmupOptions, AscetSearchIndexWarmupResult } from "./search-index.ts";

export const ASCET_AGENT_SECTION_TITLE = "## ASCET Workspace Overview";

export interface AscetInitCommandContext {
	cwd: string;
	env?: Record<string, string | undefined>;
	warmSearchIndex?: (options: AscetSearchIndexWarmupOptions) => Promise<AscetSearchIndexWarmupResult>;
	isIdle(): boolean;
	sendUserMessage?: (content: string, options?: { deliverAs?: "steer" | "followUp" }) => void | Promise<void>;
	ui: {
		notify(message: string, level?: "info" | "warning" | "error"): void;
		setStatus?: (key: string, text: string | undefined) => void;
	};
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

const ASCET_INIT_STATUS_KEY = "ascet-init";
const ASCET_INIT_SPINNER_FRAMES = ["|", "/", "-", "\\"];

function formatElapsed(elapsedMs: number): string {
	const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function createAscetInitStatus(ui: AscetInitCommandContext["ui"]) {
	if (!ui.setStatus) {
		return {
			progress(_event: AscetInitProgressEvent) {},
			finish(status: string, elapsedMs: number) {
				ui.notify(`ASCET init ${status} in ${formatElapsed(elapsedMs)}.`, status === "failed" ? "error" : "info");
			},
			dispose() {},
		};
	}

	let current: AscetInitProgressEvent | undefined;
	let frame = 0;
	const startedAtMs = Date.now();
	const render = () => {
		const elapsedMs = Date.now() - startedAtMs;
		const spinner = ASCET_INIT_SPINNER_FRAMES[frame % ASCET_INIT_SPINNER_FRAMES.length];
		frame += 1;
		if (!current) {
			ui.setStatus?.(ASCET_INIT_STATUS_KEY, `ASCET init ${spinner} ${formatElapsed(elapsedMs)} preparing`);
			return;
		}
		if (current.phase === "partition_start") {
			ui.setStatus?.(
				ASCET_INIT_STATUS_KEY,
				`ASCET init ${spinner} ${formatElapsed(elapsedMs)} [${current.index}/${current.total}] ${current.partition}`,
			);
			return;
		}
		if (current.phase === "partition_done") {
			const count = typeof current.count === "number" ? ` count:${current.count}` : "";
			const cache = current.fromCache ? " cache" : "";
			ui.setStatus?.(
				ASCET_INIT_STATUS_KEY,
				`ASCET init ${spinner} ${formatElapsed(elapsedMs)} [${current.index}/${current.total}] ${current.partition} ${current.status}${count}${cache}`,
			);
			return;
		}
		ui.setStatus?.(ASCET_INIT_STATUS_KEY, `ASCET init ${spinner} ${formatElapsed(elapsedMs)} warming index`);
	};
	const interval = setInterval(render, 250);
	render();

	return {
		progress(event: AscetInitProgressEvent) {
			current = event;
			render();
		},
		finish(status: string, elapsedMs: number) {
			ui.setStatus?.(
				ASCET_INIT_STATUS_KEY,
				`ASCET init ${status === "failed" ? "!" : "ok"} ${formatElapsed(elapsedMs)} ${status}`,
			);
		},
		dispose() {
			clearInterval(interval);
		},
	};
}

export async function executeAscetInitCommand(args: string, ctx: AscetInitCommandContext): Promise<void> {
	const parsed = parseAscetInitArgs(args);
	if (parsed.ok === false) {
		ctx.ui.notify(`${parsed.usage}\n${parsed.reason}`, "warning");
		return;
	}

	ctx.ui.notify("ASCET init started: preparing rules and search index.", "info");
	const status = createAscetInitStatus(ctx.ui);
	let statusDisposed = false;
	const disposeStatus = () => {
		if (!statusDisposed) {
			status.dispose();
			statusDisposed = true;
		}
	};
	let indexElapsedMs = 0;
	try {
		const { rulesDir } = await ensureRepoAscetRulesScaffold(ctx.cwd);
		const entrypoints = await loadAscetInitRuleBundle(rulesDir);
		const projectRulesPrompt = renderAscetInitRulesPrompt(entrypoints);
		const index = await runAscetInitIndex({
			cwd: ctx.cwd,
			env: ctx.env,
			indexMode: parsed.indexMode,
			forceRefresh: parsed.forceRefresh,
			warmSearchIndex: ctx.warmSearchIndex,
			onProgress(event) {
				indexElapsedMs = event.elapsedMs;
				status.progress(event);
			},
		});
		if (index.error && index.index.status === "failed") {
			status.finish("failed", index.index.elapsedMs ?? indexElapsedMs);
			disposeStatus();
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
		status.finish(index.index.status, index.index.elapsedMs ?? indexElapsedMs);
		disposeStatus();

		if (!ctx.sendUserMessage) {
			ctx.ui.notify(
				"ASCET init prompt could not be sent because the extension message bridge is unavailable.",
				"error",
			);
			return;
		}

		if (ctx.isIdle()) {
			await ctx.sendUserMessage(prompt);
			return;
		}

		await ctx.sendUserMessage(prompt, { deliverAs: "followUp" });
		ctx.ui.notify("Queued ASCET init as a follow-up.", "info");
	} catch (error) {
		status.finish("failed", indexElapsedMs);
		throw error;
	} finally {
		disposeStatus();
	}
}
