import { appendAscetCodingPolicyPrompt } from "./agent-routing.ts";
import { executeAscetInitCommand } from "./ascet-init.ts";
import { registerBoschLlmFarmProvider } from "./bosch-llmfarm-provider.ts";
import type { AscetExtensionAPI } from "./core/tool.ts";
import { registerAscetPermissionCommand } from "./permissions/command.ts";
import { createAscetPermissionController } from "./permissions/controller.ts";
import { executeAscetSchedulerStatusCommand } from "./scheduler/status.ts";
import type { AscetRuntimeStatusReport } from "./status-runtime.ts";
import { createAscetRuntimeStatusReport } from "./status-runtime.ts";
import { createAscetExposureController } from "./tools/exposure/controller.ts";

export default function ascetExtension(pi: AscetExtensionAPI) {
	registerBoschLlmFarmProvider(pi);
	const permissions = createAscetPermissionController({
		appendEntry: (customType, data) => pi.appendEntry?.(customType, data),
	});
	registerAscetPermissionCommand(pi, permissions);
	const exposure = createAscetExposureController(pi, { permissionProvider: permissions });
	exposure.registerProfileTools();

	pi.on?.("session_start", (_event, ctx) => {
		if (!ctx.cwd || !ctx.sessionManager || !ctx.ui) return;
		permissions.initialize({
			cwd: ctx.cwd,
			sessionManager: ctx.sessionManager,
			ui: {
				notify: (message, level) => ctx.ui?.notify?.(message, level),
				setStatus: (key, text) => ctx.ui?.setStatus?.(key, text),
			},
		});
	});

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
