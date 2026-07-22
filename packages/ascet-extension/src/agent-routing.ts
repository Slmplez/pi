const ASCET_IMPLEMENTATION_ROUTING_PROMPT = `
ASCET implementation policy:
- For ASCET implementation tasks, prefer the package subagent \`ascet-implementation\` when available.
- Use it for ESDL coding, class/module/method design, Return Methods, parameter chains, Calibration/Constant providers, Implementation configuration, formulas, Block Diagrams, and validation plans.
- If subagent delegation is unavailable, handle inline with the same design-first order.
`.trim();

export function appendAscetImplementationRoutingPrompt(systemPrompt: string): string {
	if (
		systemPrompt.includes("ASCET implementation policy:") ||
		systemPrompt.includes("ASCET implementation subagent routing:")
	) {
		return systemPrompt;
	}
	return `${systemPrompt}\n\n${ASCET_IMPLEMENTATION_ROUTING_PROMPT}`;
}
