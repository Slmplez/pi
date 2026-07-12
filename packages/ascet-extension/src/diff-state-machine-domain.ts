import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";

export interface AscetDiffStateMachineDomainParams {
	leftStateMachinePath: string;
	rightStateMachinePath: string;
	changesOnly?: boolean;
}

export interface RunAscetDiffStateMachineDomainOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetDiffStateMachineDomainResult = AscetCliJsonResult;

export const ascetDiffStateMachineDomainParameters = Type.Object({
	leftStateMachinePath: Type.String({ description: "Left ASCET state-machine path.", minLength: 1 }),
	rightStateMachinePath: Type.String({ description: "Right ASCET state-machine path.", minLength: 1 }),
	changesOnly: Type.Optional(Type.Boolean({ description: "Only include changed sections in the diff response." })),
});

export function buildDiffStateMachineDomainArgs(params: AscetDiffStateMachineDomainParams): string[] {
	if (typeof params.leftStateMachinePath !== "string" || params.leftStateMachinePath.length === 0) {
		throw new Error("leftPath is required for ascet_diff.diff_state_machine_domain.");
	}
	if (typeof params.rightStateMachinePath !== "string" || params.rightStateMachinePath.length === 0) {
		throw new Error("rightPath is required for ascet_diff.diff_state_machine_domain.");
	}
	const args = [
		"exec",
		"diff_state_machine_domain",
		normalizeAscetPath(params.leftStateMachinePath),
		normalizeAscetPath(params.rightStateMachinePath),
	];
	if (params.changesOnly) {
		args.push("--changes-only");
	}
	args.push("--json");
	return args;
}

export async function runAscetDiffStateMachineDomain(
	params: AscetDiffStateMachineDomainParams,
	options: RunAscetDiffStateMachineDomainOptions,
): Promise<AscetDiffStateMachineDomainResult> {
	return runAscetCliJson(buildDiffStateMachineDomainArgs(params), options);
}

export function formatDiffStateMachineDomainResult(result: AscetDiffStateMachineDomainResult): string {
	return formatAscetCliJsonResult("diff_state_machine_domain", result);
}
