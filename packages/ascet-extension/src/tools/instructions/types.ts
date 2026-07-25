import type { AscetProfile } from "../exposure/profiles.ts";

export type AscetInstructionProfile = AscetProfile;

export interface AscetActionInstruction {
	id: string;
	tool: string;
	action: string;
	profiles: readonly AscetInstructionProfile[];
	summary: string;
	rules: readonly string[];
	fewShots?: readonly string[];
	tags?: readonly string[];
	hidden?: boolean;
}

export interface AscetInstructionQuery {
	tool?: string;
	action?: string;
	profile?: AscetInstructionProfile;
	tags?: readonly string[];
	includeHidden?: boolean;
}

export interface AscetPromptAssemblyOptions {
	tool: string;
	profile?: AscetInstructionProfile;
	actions?: readonly string[];
	includeExamples?: boolean;
	includeHidden?: boolean;
	extraGuidelines?: readonly string[];
}
