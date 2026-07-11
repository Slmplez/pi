import type { AscetExtensionAPI } from "./core/tool.ts";
import { executeAscetSchedulerStatusCommand } from "./scheduler/status.ts";
import { type AscetRuntimeStatusReport, createAscetRuntimeStatusReport } from "./status-runtime.ts";
import { canonicalAscetTools } from "./tools/index.ts";

function buildAscetFullCheckPrompt(args: string): string {
	const request =
		args.trim() ||
		"Run an ASCET full check. Collect the missing target, scope, rules, verification depth, and output format before planning.";
	return [
		"/skill:ascet-full-check",
		"",
		"Run the extensible ASCET full-check workflow for this request:",
		request,
		"",
		"Command-entry constraints:",
		"- If target, scope, rule family, verification depth, or output format is ambiguous, call ask_user_question before planning.",
		"- Use ascet_status first, and use ascet_scheduler_status when runtime health, queueing, lock, or degraded behavior is unclear.",
		"- Compute check_item_count after scope discovery. It is not class count; it can count classes, methods, diagrams, BDE connections, signals, elements, references, or rule-target pairs.",
		"- Use inline mode when check_item_count < 5.",
		"- Use subagent mode when check_item_count >= 5 unless the user explicitly asks for inline execution.",
		"- Include BDE signal mapping analysis when BDE diagrams, block diagrams, connections, or signal routing are in scope.",
		"- Keep the workflow rule-index driven. Do not hard-code rule steps outside the ascet-full-check skill references.",
	].join("\n");
}

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
			const summary = await executeAscetSchedulerStatusCommand(args);
			ctx.ui.notify(summary, "info");
		},
	});

	pi.registerCommand("ascet-full-check", {
		description: "Run the extensible ASCET full-check skill workflow",
		handler: async (args, ctx) => {
			const prompt = buildAscetFullCheckPrompt(args);
			if (ctx.isIdle()) {
				pi.sendUserMessage(prompt);
				return;
			}

			pi.sendUserMessage(prompt, { deliverAs: "followUp" });
			ctx.ui.notify("Queued ASCET full check as a follow-up.", "info");
		},
	});
}
