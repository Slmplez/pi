import { Type } from "typebox";
import type { AscetCliExecutionResult, AscetCliJsonResult, AscetCliRequest } from "../cli.ts";
import { formatVerifyReadbackResult, runAscetVerifyReadback } from "../verify-readback.ts";
import { openAiObjectUnionSchema } from "./_shared/openai-schema.ts";

export type AscetVerifyParams =
	| { action: "readback"; objectKind: "class" | "module" | "statemachine"; componentPath: string }
	| { action: "readback"; objectKind: "project"; projectPath: string };

export interface RunAscetVerifyOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

const componentReadbackSchema = Type.Object(
	{
		action: Type.Literal("readback"),
		objectKind: Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")]),
		componentPath: Type.String({ minLength: 1 }),
	},
	{ additionalProperties: false },
);

const projectReadbackSchema = Type.Object(
	{
		action: Type.Literal("readback"),
		objectKind: Type.Literal("project"),
		projectPath: Type.String({ minLength: 1 }),
	},
	{ additionalProperties: false },
);

export const ascetVerifyParameters = openAiObjectUnionSchema<AscetVerifyParams>([
	componentReadbackSchema,
	projectReadbackSchema,
]);

export async function runAscetVerify(
	params: AscetVerifyParams,
	options: RunAscetVerifyOptions,
): Promise<AscetCliJsonResult> {
	return runAscetVerifyReadback(params, options);
}

export function formatAscetVerifyResult(result: AscetCliJsonResult): string {
	return formatVerifyReadbackResult(result);
}
