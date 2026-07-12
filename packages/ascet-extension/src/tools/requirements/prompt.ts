export const ascetRequirementsPrompt = {
	promptSnippet:
		"Retrieve requirement, signal, defect, SWIM, Supplier Comments, and lesson-learned risk context from Excel before ASCET design.",
	promptGuidelines: [
		"Use ascet_requirements.risk_context before ASCET live design when the user provides a requirement, signal, function description, or design intent.",
		"If the user request lacks a searchable requirement ID, signal, function behavior, or scope, ask a concise clarification question before calling this tool.",
		"If risk_context returns needsClarification=true, ask the user to choose or refine the target before continuing ASCET design.",
		"Treat Excel evidence as historical risk context, not final truth; confirm implementation details with ASCET read/search/reference tools later.",
		"Never modify Excel from this tool.",
		"Never call ASCET write tools as part of requirements retrieval.",
	],
};
