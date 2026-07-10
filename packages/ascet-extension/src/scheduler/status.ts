import {
	type AscetCliLockSnapshot,
	acquireAscetCliLock,
	clearStaleAscetCliLock,
	formatAscetCliLockStatus,
	getAscetCliLockSnapshot,
} from "./cli-lock.ts";
import { formatAscetSchedulerSnapshot } from "./format.ts";
import { getGlobalAscetScheduler } from "./global.ts";
import {
	type AscetOperationHealthStore,
	formatAscetOperationHealthStatus,
	getGlobalAscetOperationHealthStore,
} from "./operation-health.ts";
import type { PiAscetRuntimePathOptions } from "./paths.ts";
import type { AscetScheduler } from "./scheduler.ts";
import type { AscetSchedulerSnapshot } from "./types.ts";

export interface AscetSchedulerStatusReport {
	ok: boolean;
	recovery?: "succeeded";
	summary: string;
	scheduler: AscetSchedulerSnapshot;
	cliLock: AscetCliLockSnapshot;
	operationHealth: ReturnType<AscetOperationHealthStore["listUnhealthy"]>;
}

export interface AscetSchedulerStatusDeps extends PiAscetRuntimePathOptions {
	scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
	operationHealth?: AscetOperationHealthStore;
	recover?: () => Promise<unknown>;
}

export type AscetSchedulerStatusAction = "status" | "recover";

export function parseAscetSchedulerStatusAction(args = ""): AscetSchedulerStatusAction {
	const normalized = args.trim().toLowerCase();
	if (normalized === "--recover" || normalized === "recover" || normalized === "reset" || normalized === "--reset") {
		return "recover";
	}
	return "status";
}

export function formatAscetSchedulerStatusReport(report: Omit<AscetSchedulerStatusReport, "summary">): string {
	return [
		report.recovery ? "Recovery: succeeded\n" : null,
		"ASCET Scheduler Status",
		"",
		formatAscetSchedulerSnapshot(report.scheduler),
		"",
		formatAscetCliLockStatus(report.cliLock),
		"",
		formatAscetOperationHealthStatus(report.operationHealth),
	]
		.filter((line): line is string => line !== null)
		.join("\n");
}

async function defaultRecover(options: PiAscetRuntimePathOptions): Promise<void> {
	const staleCleared = await clearStaleAscetCliLock(options);
	if (staleCleared) {
		return;
	}
	const lock = await acquireAscetCliLock(
		{
			agentId: "system",
			commandId: "recover",
			toolName: "AscetSchedulerMaintenance",
			processName: "pi-ascet-extension",
		},
		{ ...options, acquireTimeoutMs: 5_000 },
	);
	await lock.release();
}

export async function createAscetSchedulerStatusReport(
	action: AscetSchedulerStatusAction = "status",
	deps: AscetSchedulerStatusDeps = {},
): Promise<AscetSchedulerStatusReport> {
	const scheduler = deps.scheduler ?? getGlobalAscetScheduler();
	const operationHealth = deps.operationHealth ?? getGlobalAscetOperationHealthStore(deps);
	await operationHealth.loadPersisted();

	let recovery: "succeeded" | undefined;
	if (action === "recover") {
		const recover = deps.recover ?? (() => defaultRecover(deps));
		await scheduler.submit({
			agentId: "system",
			toolName: "AscetSchedulerMaintenance",
			commandId: "recover",
			kind: "maintenance",
			priority: "high",
			queueTimeoutMs: 5_000,
			executionTimeoutMs: 45_000,
			run: recover,
		});
		operationHealth.reset();
		await operationHealth.flush();
		recovery = "succeeded";
	}

	const report = {
		ok: true,
		recovery,
		scheduler: scheduler.getSnapshot(),
		cliLock: await getAscetCliLockSnapshot(deps),
		operationHealth: operationHealth.listUnhealthy(),
	};
	return {
		...report,
		summary: formatAscetSchedulerStatusReport(report),
	};
}

export async function executeAscetSchedulerStatusCommand(
	args = "",
	deps: AscetSchedulerStatusDeps = {},
): Promise<string> {
	const report = await createAscetSchedulerStatusReport(parseAscetSchedulerStatusAction(args), deps);
	return report.summary;
}
