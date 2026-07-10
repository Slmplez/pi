import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { Type } from "typebox";
import { clearStaleAscetCliLock } from "../scheduler/cli-lock.ts";
import { createAscetSchedulerStatusReport } from "../scheduler/status.ts";
import { type AscetStatusReport, createAscetStatusReport } from "../status.ts";

export type AscetRecoverParams =
	| { action: "status" }
	| { action: "clear_extension_temp" }
	| { action: "scheduler_status" }
	| { action: "scheduler_recover" }
	| { action: "clear_stale_cli_lock" };

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
		schedulerStatus?: Awaited<ReturnType<typeof createAscetSchedulerStatusReport>>;
		tempRoot?: string;
		cleared?: boolean;
		staleLockCleared?: boolean;
	};
}

export const ascetRecoverParameters = Type.Union([
	Type.Object({ action: Type.Literal("status") }),
	Type.Object({ action: Type.Literal("clear_extension_temp") }),
	Type.Object({ action: Type.Literal("scheduler_status") }),
	Type.Object({ action: Type.Literal("scheduler_recover") }),
	Type.Object({ action: Type.Literal("clear_stale_cli_lock") }),
]);

function getExtensionTempRoot(options: RunAscetRecoverOptions): string {
	return options.tempRoot ?? resolve(tmpdir(), "pi-ascet-extension");
}

export async function runAscetRecover(
	params: AscetRecoverParams,
	options: RunAscetRecoverOptions,
): Promise<AscetRecoverResult> {
	if (params.action === "status") {
		return {
			ok: true,
			action: params.action,
			data: {
				status: createAscetStatusReport(options),
			},
		};
	}

	if (params.action === "scheduler_status" || params.action === "scheduler_recover") {
		const schedulerStatus = await createAscetSchedulerStatusReport(
			params.action === "scheduler_recover" ? "recover" : "status",
			options,
		);
		return {
			ok: true,
			action: params.action,
			data: { schedulerStatus },
		};
	}

	if (params.action === "clear_stale_cli_lock") {
		return {
			ok: true,
			action: params.action,
			data: {
				staleLockCleared: await clearStaleAscetCliLock(options),
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
	if (result.action === "scheduler_status" || result.action === "scheduler_recover") {
		return result.data.schedulerStatus?.summary ?? "ASCET scheduler status unavailable.";
	}
	if (result.action === "clear_stale_cli_lock") {
		return result.data.staleLockCleared ? "ASCET stale CLI lock cleared." : "ASCET stale CLI lock not found.";
	}
	return `ASCET extension temp cleared: ${result.data.tempRoot}`;
}
