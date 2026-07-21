const ASCET_IMPLEMENTATION_ROUTING_PROMPT = `
ASCET implementation subagent routing:
- If the user asks to design, create, modify, patch, implement, or validate ASCET ESDL classes, modules, methods, Return Methods, dependent Local parameters, Imported/Exported parameter chains, Calibration parameter classes, Constant parameter classes, Implementation configuration, formulas, Block Diagram architecture, or implementation verification plans, delegate the task to the package subagent \`ascet-implementation\` when subagent delegation is available.
- Pass the original user request, relevant target paths, and any already discovered ASCET evidence to \`ascet-implementation\`.
- Do not delegate these ASCET implementation tasks to generic builtin reviewer, worker, planner, or researcher agents.
- If subagent delegation is unavailable, handle the task inline using the same design-first order required by \`ascet-implementation\`: requirements, decomposition, class/module allocation, interface and method plan, parameter plan, algorithm/ESDL plan, implementation configuration, then write/readback verification when requested.
- Keep read-only full-check workflows on \`ascet-full-check\`; do not reroute full checks to the writable implementation subagent.
`.trim();

const ASCET_TERMS = /\bascet\b|ESDL|Block Diagram|Return Method|Imported|Exported|Calibration|Constant/i;
const IMPLEMENTATION_TERMS =
	/design|create|modify|patch|implement|validate|write|set|update|method|module|class|parameter|dependency|formula|Implementation configuration|Return Method|dependent Local/i;
const FULL_CHECK_TERMS = /\/skill:ascet-full-check|full check|full-check|inspection|rule-based checking/i;

export function isAscetImplementationRoutingRequest(prompt: string): boolean {
	if (FULL_CHECK_TERMS.test(prompt)) return false;
	return ASCET_TERMS.test(prompt) && IMPLEMENTATION_TERMS.test(prompt);
}

export function appendAscetImplementationRoutingPrompt(systemPrompt: string): string {
	if (systemPrompt.includes("ASCET implementation subagent routing:")) {
		return systemPrompt;
	}
	return `${systemPrompt}\n\n${ASCET_IMPLEMENTATION_ROUTING_PROMPT}`;
}
