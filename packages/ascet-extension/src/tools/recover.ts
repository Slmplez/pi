import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { Type } from "typebox";
import { clearStaleAscetCliLock } from "../scheduler/cli-lock.ts";
import { createAscetSchedulerStatusReport } from "../scheduler/status.ts";
import { type AscetRuntimeStatusReport, createAscetRuntimeStatusReport } from "../status-runtime.ts";
import { toToolSuccessPayload } from "../tool-response-contract.ts";
import { openAiObjectSchema } from "./_shared/openai-schema.ts";

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
	createStatusReport?: (options: RunAscetRecoverOptions) => Promise<AscetRuntimeStatusReport>;
}

export interface AscetRecoverResult {
	ok: boolean;
	action: AscetRecoverParams["action"];
	data: {
		status?: AscetRuntimeStatusReport;
		schedulerStatus?: Awaited<ReturnType<typeof createAscetSchedulerStatusReport>>;
		tempRoot?: string;
		cleared?: boolean;
		staleLockCleared?: boolean;
	};
}

export const ascetRecoverParameters = openAiObjectSchema<AscetRecoverParams>(
	Type.Object({
		action: Type.Union([
			Type.Literal("status"),
			Type.Literal("clear_extension_temp"),
			Type.Literal("scheduler_status"),
			Type.Literal("scheduler_recover"),
			Type.Literal("clear_stale_cli_lock"),
		]),
	}),
);

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
				status: await (options.createStatusReport ?? createAscetRuntimeStatusReport)(options),
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
		return JSON.stringify(toToolSuccessPayload(result.data.status ?? {}), null, 2);
	}
	if (result.action === "scheduler_status" || result.action === "scheduler_recover") {
		return JSON.stringify(toToolSuccessPayload(result.data.schedulerStatus ?? {}), null, 2);
	}
	if (result.action === "clear_stale_cli_lock") {
		return JSON.stringify(toToolSuccessPayload({ staleLockCleared: result.data.staleLockCleared }), null, 2);
	}
	return JSON.stringify(toToolSuccessPayload({ path: result.data.tempRoot, cleared: result.data.cleared }), null, 2);
}
