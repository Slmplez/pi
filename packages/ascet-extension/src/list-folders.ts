import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";

export interface AscetListFoldersParams {
	rootPath?: string;
	depth?: number;
}

export interface RunAscetListFoldersOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetListFoldersResult = AscetCliJsonResult;

export const ascetListFoldersParameters = Type.Object({
	rootPath: Type.Optional(Type.String({ description: "ASCET root folder path, for example DEMO.", minLength: 1 })),
	depth: Type.Optional(Type.Number({ minimum: 0, maximum: 20 })),
});

export function buildListFoldersArgs(params: AscetListFoldersParams): string[] {
	const args = ["exec", "list_folders"];
	if (params.rootPath) {
		args.push("--root", params.rootPath);
	}
	if (params.depth !== undefined) {
		args.push("--depth", String(params.depth));
	}
	args.push("--json");
	return args;
}

export async function runAscetListFolders(
	params: AscetListFoldersParams,
	options: RunAscetListFoldersOptions,
): Promise<AscetListFoldersResult> {
	return runAscetCliJson(buildListFoldersArgs(params), options);
}

export function formatListFoldersResult(result: AscetListFoldersResult): string {
	return formatAscetCliJsonResult("list_folders", result);
}
