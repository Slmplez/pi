import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { Type } from "typebox";
import { type AscetStatusReport, createAscetStatusReport } from "../status.ts";

export type AscetRecoverParams = { action: "status" } | { action: "clear_extension_temp" };

export interface RunAscetRecoverOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	tempRoot?: string;
}

export interface AscetRecoverResult {
	ok: boolean;
	action: AscetRecoverParams["action"];
	data: {
		status?: AscetStatusReport;
		tempRoot?: string;
		cleared?: boolean;
	};
}

export const ascetRecoverParameters = Type.Union([
	Type.Object({ action: Type.Literal("status") }),
	Type.Object({ action: Type.Literal("clear_extension_temp") }),
]);

function getExtensionTempRoot(options: RunAscetRecoverOptions): string {
	return options.tempRoot ?? resolve(tmpdir(), "pi-ascet-extension");
}

export function runAscetRecover(params: AscetRecoverParams, options: RunAscetRecoverOptions): AscetRecoverResult {
	if (params.action === "status") {
		return {
			ok: true,
			action: params.action,
			data: {
				status: createAscetStatusReport(options),
			},
		};
	}

	const tempRoot = getExtensionTempRoot(options);
	if (existsSync(tempRoot)) {
		rmSync(tempRoot, { recursive: true, force: true });
	}
	return {
		ok: true,
		action: params.action,
		data: {
			tempRoot,
			cleared: true,
		},
	};
}

export function formatAscetRecoverResult(result: AscetRecoverResult): string {
	if (result.action === "status") {
		return result.data.status?.summary ?? "ASCET recover status unavailable.";
	}
	return `ASCET extension temp cleared: ${result.data.tempRoot}`;
}
