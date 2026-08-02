import { appendAscetCodingPolicyPrompt } from "./agent-routing.ts";
import { type AscetIndexFooterHandle, installAscetIndexFooterStatus } from "./ascet-index-footer-status.ts";
import { executeAscetInitCommand } from "./ascet-init.ts";
import { registerBoschLlmFarmProvider } from "./bosch-llmfarm-provider.ts";
import type { AscetExtensionAPI } from "./core/tool.ts";
import { getGlobalAscetScheduler } from "./scheduler/global.ts";
import { executeAscetSchedulerStatusCommand } from "./scheduler/status.ts";
import {
	type AscetSearchIndexWarmupOptions,
	type AscetSearchIndexWarmupResult,
	ensureAscetSearchIndex,
} from "./search-index.ts";
import { type AscetRuntimeStatusReport, createAscetRuntimeStatusReport } from "./status-runtime.ts";
import { createAscetExposureController } from "./tools/exposure/controller.ts";
import { canonicalAscetTools } from "./tools/index.ts";

let indexFooterStatus: AscetIndexFooterHandle | undefined;
let startupIndexWarmupTimer: ReturnType<typeof setTimeout> | undefined;

type StartupIndexWarmupContext = Parameters<NonNullable<AscetExtensionAPI["on"]>>[1] extends (
	event: { type: "session_start" | "session_shutdown" },
	ctx: infer T,
) => unknown
	? T
	: { cwd?: string; sessionManager?: { getCwd(): string } };

interface StartupIndexWarmupDeps {
	delayMs?: number;
	env?: Record<string, string | undefined>;
	warmSearchIndex?: (options: AscetSearchIndexWarmupOptions) => Promise<AscetSearchIndexWarmupResult>;
}

function getStartupCwd(ctx: StartupIndexWarmupContext): string | undefined {
	return ctx.sessionManager?.getCwd() ?? ctx.cwd;
}

export function scheduleStartupAscetSearchIndexWarmup(
	ctx: StartupIndexWarmupContext,
	deps: StartupIndexWarmupDeps = {},
): boolean {
	const cwd = getStartupCwd(ctx);
	if (!cwd) {
		return false;
	}
	if (startupIndexWarmupTimer) {
		clearTimeout(startupIndexWarmupTimer);
		startupIndexWarmupTimer = undefined;
	}
	const warmSearchIndex = deps.warmSearchIndex ?? ensureAscetSearchIndex;
	startupIndexWarmupTimer = setTimeout(() => {
		startupIndexWarmupTimer = undefined;
		void warmSearchIndex({
			cwd,
			env: deps.env,
			timeoutMs: 120_000,
			partition: "p0",
			forceRefresh: true,
			includeTextCode: true,
			scanTimeoutMs: 90_000,
			scheduler: getGlobalAscetScheduler(),
			toolName: "ascet_status",
		}).catch(() => undefined);
	}, deps.delayMs ?? 250);
	startupIndexWarmupTimer.unref?.();
	return true;
}

export default function ascetExtension(pi: AscetExtensionAPI) {
	registerBoschLlmFarmProvider(pi);
	const exposure = createAscetExposureController(pi);

	for (const tool of canonicalAscetTools) {
		pi.registerTool(tool);
	}

	pi.on?.("session_start", (_event, ctx) => {
		// Activate the selected profile before the first model turn. Profile activation
		// rebuilds the agent's base system prompt; doing it from before_agent_start
		// would rebuild from a stale event.systemPrompt and make profile guidance
		// visible only on a later turn.
		exposure.activateProfile(exposure.getProfile());
		indexFooterStatus?.stop();
		indexFooterStatus = installAscetIndexFooterStatus(ctx);
		scheduleStartupAscetSearchIndexWarmup(ctx);
	});

	pi.on?.("before_agent_start", (event) => ({
		systemPrompt: appendAscetCodingPolicyPrompt(event.systemPrompt),
	}));

	pi.on?.("session_shutdown", () => {
		indexFooterStatus?.stop();
		indexFooterStatus = undefined;
		if (startupIndexWarmupTimer) {
			clearTimeout(startupIndexWarmupTimer);
			startupIndexWarmupTimer = undefined;
		}
	});

	pi.registerCommand("ascet-status", {
		description: "Show ASCET installation diagnostics and live ToolAPI runtime status",
		handler: async (_args, ctx) => {
			const report: AscetRuntimeStatusReport = await createAscetRuntimeStatusReport({ cwd: ctx.cwd });
			ctx.ui.notify(report.summary, report.ok ? "info" : "error");
		},
	});

	pi.registerCommand("ascet-scheduler-status", {
		description: "Show ASCET scheduler queue, PI CLI lock, and operation health diagnostics",
		handler: async (args, ctx) => {
			const summary = await executeAscetSchedulerStatusCommand(args);
			ctx.ui.notify(summary, "info");
		},
	});

	pi.registerCommand("ascet-init", {
		description: "Create or update an ASCET workspace onboarding section",
		handler: async (args, ctx) => {
			await executeAscetInitCommand(args, {
				...ctx,
				sendUserMessage: (content, options) => pi.sendUserMessage(content, options),
			});
		},
	});
}
