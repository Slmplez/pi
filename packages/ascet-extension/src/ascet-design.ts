import type { AscetExtensionAPI } from "./core/tool.ts";

export function buildAscetDesignPrompt(args: string): string {
	const request =
		args.trim() ||
		"Plan an ASCET design from a requirement. Clarify the requirement, retrieve Excel risk context, then plan read-only ASCET discovery.";
	return [
		"Run the guided ASCET design workflow for this request:",
		request,
		"",
		"Command-entry constraints:",
		"- First decide whether the request has enough anchors for Excel risk search.",
		"- If not, call ask_user_question before searching. Ask at most 3 concise questions.",
		"- If ask_user_question is unavailable, ask one concise blocking question.",
		"- Locate the requirements .xlsx with agent file search tools first; pass its absolute path as sourceFile to ascet_requirements.",
		"- Do not rely on implicit ascet_requirements workbook discovery; use workspaceSearch=true only as an explicit fallback.",
		'- Use ascet_requirements(action="risk_context") before ASCET live design.',
		"- If design_gate_ready=false, do not enter ASCET design; continue requirements retrieval or clarification first.",
		"- If next_action is present, call that ascet_requirements action before ASCET design.",
		"- If blocking_clarifications are present, call ask_user_question with the suggested candidate choices.",
		"- Only enter ASCET design when detail_complete, evidence complete, all pages retrieved, and no blocking clarification.",
		"- Use relation_leads for why requirements are related and risk_details for paginated raw Excel evidence.",
		"- During the first requirements-risk retrieval phase, do not call ascet_write or ascet_batch_write.",
		"- Do not call ascet_write or ascet_batch_write unless the user explicitly asks to apply changes.",
		"- Use ascet_status before live ASCET tools when runtime state is unknown.",
		"- Use ascet_explore, ascet_search, ascet_read, and ascet_reference for read-only design discovery.",
		"- Before any write, present design intent, risk controls, and verification plan for confirmation.",
		"- Treat Supplier Comments, Bosch Defect, COEM SWIM, and LL evidence as historical risk context that must shape the design plan.",
	].join("\n");
}

export async function executeAscetDesignCommand(
	args: string,
	ctx: Parameters<Parameters<AscetExtensionAPI["registerCommand"]>[1]["handler"]>[1],
	pi: Pick<AscetExtensionAPI, "sendUserMessage">,
): Promise<void> {
	const prompt = buildAscetDesignPrompt(args);
	if (ctx.isIdle()) {
		pi.sendUserMessage(prompt);
		return;
	}

	pi.sendUserMessage(prompt, { deliverAs: "followUp" });
	ctx.ui.notify("Queued ASCET design as a follow-up.", "info");
}
