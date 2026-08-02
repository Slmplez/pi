import type { AscetScheduler } from "../scheduler/scheduler.ts";
import { ensureAscetSearchIndex } from "../search-index.ts";
import { writeAscetIndexStatusFile } from "../search-index-sqlite/status-file.ts";
import { planAscetIndexAreas } from "./area-mapping.ts";
import { readAscetIndexStatus } from "./status.ts";
import type { AscetIndexAreaPlan } from "./types.ts";

export interface RefreshAscetIndexOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
	executeCli?: Parameters<typeof ensureAscetSearchIndex>[0]["executeCli"];
	timeoutMs?: number;
	scanTimeoutMs?: number;
	areas?: readonly string[];
	componentPath?: string;
	force?: boolean;
	mode?: "foreground" | "background";
	wait?: boolean;
	reason?: string;
}

const scheduledRefreshes = new Set<string>();

function selectedAreaErrors(
	status: ReturnType<typeof readAscetIndexStatus>,
	plan: AscetIndexAreaPlan,
): Array<{ area: string; state: string; errorCode?: string; errorMessage?: string }> {
	const areas = new Map((status.areas ?? []).map((area) => [area.name, area]));
	return plan.sqliteAreas.flatMap((areaName) => {
		const area = areas.get(areaName);
		if (area && area.state === "ready" && !area.errorCode && !area.errorMessage) {
			return [];
		}
		return [
			{
				area: areaName,
				state: area?.state ?? "missing",
				errorCode: area?.errorCode,
				errorMessage: area?.errorMessage,
			},
		];
	});
}

function normalizeCwd(value: string): string {
	return value.trim().replace(/\\/g, "/").replace(/\/+$/u, "").toLowerCase();
}

function backgroundRefreshKey(options: RefreshAscetIndexOptions, plan: AscetIndexAreaPlan): string {
	return [
		normalizeCwd(options.cwd),
		plan.effectivePartitions.join("+"),
		(options.componentPath ?? "*").trim().replace(/\\/g, "/").toLowerCase(),
	].join(":");
}

function scheduleSelectedBackgroundRefresh(options: RefreshAscetIndexOptions, plan: AscetIndexAreaPlan): boolean {
	const key = backgroundRefreshKey(options, plan);
	if (scheduledRefreshes.has(key)) {
		return false;
	}
	scheduledRefreshes.add(key);
	writeAscetIndexStatusFile(options.cwd, {
		state: "refreshing",
		phase: plan.effectivePartitions.join("+"),
		currentArea: plan.requestedAreas.join("+"),
		startedAt: new Date().toISOString(),
		elapsedMs: 0,
		error: options.reason ? { code: "index_refresh_scheduled", message: options.reason } : undefined,
	});
	const timer = setTimeout(() => {
		(async () => {
			for (const partition of plan.effectivePartitions) {
				const result = await ensureAscetSearchIndex({
					cwd: options.cwd,
					env: options.env,
					signal: options.signal,
					scheduler: options.scheduler,
					executeCli: options.executeCli,
					timeoutMs: options.timeoutMs ?? 120_000,
					scanTimeoutMs: options.scanTimeoutMs ?? 90_000,
					partition,
					componentPath: options.componentPath,
					forceRefresh: options.force ?? true,
					includeTextCode: plan.includeTextCode || partition === "text_code",
					toolName: "ascet_index_refresh",
				});
				if (!result.ok) {
					break;
				}
			}
		})()
			.catch(() => undefined)
			.finally(() => {
				scheduledRefreshes.delete(key);
			});
	}, 250);
	timer.unref?.();
	return true;
}

export async function refreshAscetIndex(options: RefreshAscetIndexOptions): Promise<Record<string, unknown>> {
	const mode = options.wait ? "foreground" : (options.mode ?? "foreground");
	const plan = planAscetIndexAreas(options.areas);
	if (mode === "background") {
		const queued = scheduleSelectedBackgroundRefresh(options, plan);
		return {
			state: queued ? "refreshing" : "ready",
			overallState: queued ? "refreshing" : "ready",
			mode,
			requestedAreas: plan.requestedAreas,
			effectivePartitions: plan.effectivePartitions,
			selectedAreasReady: false,
			staleAreas: [],
			selectedAreaErrors: [],
			statusFinalizeCompleted: false,
			queued,
			jobs: queued
				? plan.effectivePartitions.map((partition) => ({
						toolName: "ascet_index_refresh",
						commandId: "warm_search_index",
						kind: "read",
						partition,
					}))
				: undefined,
			scheduler: options.scheduler?.getSnapshot(),
		};
	}

	const results = [];
	for (const partition of plan.effectivePartitions) {
		results.push(
			await ensureAscetSearchIndex({
				cwd: options.cwd,
				env: options.env,
				signal: options.signal,
				scheduler: options.scheduler,
				executeCli: options.executeCli,
				timeoutMs: options.timeoutMs ?? 120_000,
				scanTimeoutMs: options.scanTimeoutMs ?? 90_000,
				partition,
				componentPath: options.componentPath,
				forceRefresh: options.force ?? true,
				includeTextCode: plan.includeTextCode || partition === "text_code",
				toolName: "ascet_index_refresh",
			}),
		);
	}

	const failed = results.find((result) => !result.ok);
	if (failed) {
		return {
			state: "failed",
			overallState: "failed",
			mode,
			requestedAreas: plan.requestedAreas,
			effectivePartitions: plan.effectivePartitions,
			selectedAreasReady: false,
			staleAreas: [],
			selectedAreaErrors: [
				{
					area: plan.sqliteAreas[0] ?? "unknown",
					state: "failed",
					errorCode: failed.error?.code ?? "indexRefreshFailed",
					errorMessage: failed.error?.message ?? "ASCET index refresh failed.",
				},
			],
			statusFinalizeCompleted: false,
			error: {
				code: failed.error?.code ?? "indexRefreshFailed",
				message: failed.error?.message ?? "ASCET index refresh failed.",
				recover: {
					nextAction: "ascet_index",
					params: { action: "status", detailLevel: "full", includeScheduler: true },
				},
			},
		};
	}

	const status = readAscetIndexStatus({ cwd: options.cwd, detailLevel: "areas" });
	const errors = selectedAreaErrors(status, plan);
	return {
		state: status.state,
		overallState: status.state,
		mode,
		requestedAreas: plan.requestedAreas,
		effectivePartitions: plan.effectivePartitions,
		selectedAreasReady: errors.length === 0,
		staleAreas: status.staleAreas ?? [],
		selectedAreaErrors: errors,
		statusFinalizeCompleted: true,
		totalDocs: status.totalDocs,
		areas: status.areas,
		elapsedMs: results.reduce((total, result) => total + result.elapsedMs, 0),
		fromCache: results.every((result) => result.fromCache),
	};
}
