import { type AscetCodingPolicyOptions, buildAscetCodingPolicyPrompt } from "./ascet-coding-policy.ts";

export function appendAscetCodingPolicyPrompt(systemPrompt: string, options: AscetCodingPolicyOptions = {}): string {
	if (systemPrompt.includes("ASCET coding policy:")) {
		return systemPrompt;
	}
	return `${systemPrompt}\n\n${buildAscetCodingPolicyPrompt(options)}`;
}
