import type { AscetInstructionProfile } from "./types.ts";

export const ascetInstructionProfiles = [
	"base",
	"advanced-read",
	"reference",
	"diff",
	"write-preflight",
	"batch-write",
	"component-edit",
	"ops",
] as const satisfies readonly AscetInstructionProfile[];

export function isAscetInstructionProfile(value: string | undefined): value is AscetInstructionProfile {
	return value !== undefined && (ascetInstructionProfiles as readonly string[]).includes(value);
}
