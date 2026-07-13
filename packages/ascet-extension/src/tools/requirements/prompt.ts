import { compactExamplesForTool } from "../_shared/action-examples.ts";

export const ascetRequirementsPrompt = {
	promptSnippet:
		"Gate ASCET design by retrieving requirement relation leads and paginated Excel risk evidence before live ASCET design.",
	promptGuidelines: [
		'Use ascet_requirements(action="risk_context") before ASCET live design when the user provides a requirement, signal, function description, or design intent.',
		"Before calling risk_context/search/index, locate the requirements .xlsx with agent file search tools and pass sourceFile explicitly.",
		"Do not rely on implicit workbook discovery; set workspaceSearch=true only when the user explicitly wants tool-side workspace scanning.",
		"risk_context is a gate summary only: do not treat it as detailed risk evidence and do not infer ASCET design from it.",
		"If risk_context returns design_gate_ready=false or nextAction, call the next ascet_requirements action before ASCET design.",
		"Use relation_leads to explain why related requirements are connected; use risk_details to retrieve paginated raw Excel risk evidence.",
		"If the user request lacks a searchable requirement ID, signal, function behavior, or scope, ask a concise clarification question before calling this tool.",
		"If blockingClarifications are present, ask the user to choose or refine the target before continuing ASCET design.",
		"Treat Excel evidence as historical risk context, not final truth; confirm implementation details with ASCET read/search/reference tools later.",
		"Never modify Excel from this tool.",
		"Never call ASCET write tools as part of requirements retrieval.",
		...compactExamplesForTool("ascet_requirements"),
	],
};
