import { appendAscetCodingPolicyPrompt } from "./agent-routing.ts";
import { executeAscetInitCommand } from "./ascet-init.ts";
import { registerBoschLlmFarmProvider } from "./bosch-llmfarm-provider.ts";
import type { AscetExtensionAPI } from "./core/tool.ts";
import { executeAscetSchedulerStatusCommand } from "./scheduler/status.ts";
import type { AscetRuntimeStatusReport } from "./status-runtime.ts";
import { createAscetRuntimeStatusReport } from "./status-runtime.ts";
import { createAscetExposureController } from "./tools/exposure/controller.ts";
import { canonicalAscetTools } from "./tools/index.ts";

export default function ascetExtension(pi: AscetExtensionAPI) {
	registerBoschLlmFarmProvider(pi);
	const exposure = createAscetExposureController(pi);

	for (const tool of canonicalAscetTools) {
		pi.registerTool(tool);
	}

	pi.on?.("before_agent_start", (event) => {
		exposure.activateProfile(exposure.getProfile());
		return {
			systemPrompt: appendAscetCodingPolicyPrompt(event.systemPrompt),
		};
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
