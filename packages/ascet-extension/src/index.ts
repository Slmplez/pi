import type { AscetExtensionAPI } from "./core/tool.ts";
import { executeAscetSchedulerStatusCommand } from "./scheduler/status.ts";
import { type AscetRuntimeStatusReport, createAscetRuntimeStatusReport } from "./status-runtime.ts";
import { canonicalAscetTools } from "./tools/index.ts";

export default function ascetExtension(pi: AscetExtensionAPI) {
	for (const tool of canonicalAscetTools) {
		pi.registerTool(tool);
	}

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
			const summary = await executeAscetSchedulerStatusCommand(args, { cwd: ctx.cwd });
			ctx.ui.notify(summary, "info");
		},
	});
}
