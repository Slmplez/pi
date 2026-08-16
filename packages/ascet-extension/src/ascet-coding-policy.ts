export interface AscetCodingPolicyOptions {
	editToolName?: string;
}

export function buildAscetCodingPolicyPrompt(options: AscetCodingPolicyOptions = {}): string {
	const editToolName = options.editToolName ?? "ascet_edit";
	return `
ASCET coding policy:

1. For ASCET model, ESDL, signal, parameter, dependency, or write work, read and follow the authoritative ascet-engineering Skill.
2. Resolve a bounded exact target with live path/OID evidence. Never edit the first name match or run an unbounded live scan.
3. Freeze integrationScope or featureScope, ownership, modification layer, exclusions, and success criteria. Ask when both scopes remain plausible.
4. Check observation coverage and truncation. Stored search hits are candidates, not proof of identity, ownership, or editability.
5. Before changes, understand Project context, source → transform → consumer flow, code/signature, and relevant Elements/Parameters. Prefer reuse.
6. For non-trivial work, maintain a concrete todolist for scope, evidence, design, writes, and completion; avoid vague tasks.
7. Before Preflight, present a complete implementation plan with the exact ESDL patch, Element/Parameter metadata, mappings/variants, write order, assumptions, and risks. Never invent values or metadata.
8. Use intent=apply when the user requested the exact write. The runtime performs preflight, permission evaluation, optional approval, execution, and readback in one call. Use intent=preview only for a non-mutating preview.
9. Preflight, plan, diff, and dry-run may run while a Component is not editable. Runtime performs a fresh same-session editable=true check immediately before each real mutation; do not call mode=check merely to authorize a write or mode=set without explicit user intent.
10. Executed ${editToolName} writes verify automatically. Success completes the write; do not add verifyReadback, call a separate verification Tool, or read again only to prove success.
11. On failure or unknown outcome, stop and report it; do not blindly retry. Read again only for diagnosis, the next change, or an explicit user request.
`.trim();
}

export const ASCET_CODING_POLICY_PROMPT = buildAscetCodingPolicyPrompt();
