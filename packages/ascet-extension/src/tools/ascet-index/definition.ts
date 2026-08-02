import { defineSequentialAscetTool } from "../../core/tool.ts";
import {
	evaluateAscetIndex,
	formatAscetIndexStatusSummary,
	markAscetIndexAreasStale,
	readAscetIndexStatus,
	refreshAscetIndex,
	repairAscetIndexStatusFile,
} from "../../index-maintainer/index.ts";
import { routeAscetAction } from "../../routing/router.ts";
import { toToolSuccessPayload } from "../../tool-response-contract.ts";
import { ascetIndexToolManifest } from "./manifest.ts";
import { ascetIndexPrompt } from "./prompt.ts";
import { type AscetIndexParams, ascetIndexParameters } from "./schema.ts";
import { renderCall, renderResult } from "./ui.ts";

function summarizeResult(action: string, result: unknown): string {
	if (action === "status" && result && typeof result === "object" && "state" in result) {
		return formatAscetIndexStatusSummary(result as Parameters<typeof formatAscetIndexStatusSummary>[0]);
	}
	if (action === "mark_stale" && result && typeof result === "object") {
		const areas = (result as { areas?: unknown }).areas;
		return `ASCET index: stale ${Array.isArray(areas) ? areas.length : 0} areas`;
	}
	if (action === "repair_status_file") {
		return "ASCET index: status file repaired from SQLite";
	}
	if (action === "evaluate" && result && typeof result === "object") {
		return `ASCET index evaluate: ${(result as { state?: unknown }).state ?? "unknown"}`;
	}
	if (action === "refresh" && result && typeof result === "object") {
		const state = (result as { state?: unknown }).state ?? "unknown";
		const elapsedMs = (result as { elapsedMs?: unknown }).elapsedMs;
		return `ASCET index: ${state}${typeof elapsedMs === "number" ? ` ${elapsedMs}ms` : ""}`;
	}
	return `ASCET index: ${action}`;
}

export const ascetIndexTool = defineSequentialAscetTool({
	...ascetIndexToolManifest,
	...ascetIndexPrompt,
	parameters: ascetIndexParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetIndexParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: {
			cwd: string;
			env?: Record<string, string | undefined>;
			executeCli?: Parameters<typeof refreshAscetIndex>[0]["executeCli"];
			scheduler?: Parameters<typeof refreshAscetIndex>[0]["scheduler"];
		},
	) {
		let result: unknown;
		switch (params.action) {
			case "status":
				result = readAscetIndexStatus({
					cwd: ctx.cwd,
					detailLevel: params.detailLevel,
					includeScheduler: params.includeScheduler,
					schedulerSnapshot: params.includeScheduler ? ctx.scheduler?.getSnapshot() : undefined,
				});
				break;
			case "refresh":
				result = await refreshAscetIndex({
					cwd: ctx.cwd,
					env: ctx.env,
					signal,
					executeCli: ctx.executeCli,
					scheduler: ctx.scheduler,
					areas: params.areas,
					componentPath: params.componentPath,
					force: params.force,
					mode: params.mode,
					wait: params.wait,
					reason: params.reason,
				});
				break;
			case "mark_stale":
				result = markAscetIndexAreasStale(ctx.cwd, params.areas, params.reason);
				break;
			case "repair_status_file":
				result = repairAscetIndexStatusFile(ctx.cwd);
				break;
			case "evaluate":
				if (params.live) {
					const liveRefresh = await refreshAscetIndex({
						cwd: ctx.cwd,
						env: ctx.env,
						signal,
						executeCli: ctx.executeCli,
						scheduler: ctx.scheduler,
						areas: ["components"],
						componentPath: params.componentPath,
						force: true,
						mode: "foreground",
						reason: "ascet_index.evaluate_live",
					});
					result = {
						...evaluateAscetIndex({
							cwd: ctx.cwd,
							checks: params.checks,
							query: params.query,
							requiredAreas: params.requiredAreas,
							requireFreshness: params.requireFreshness,
							env: ctx.env,
						}),
						live: liveRefresh,
					};
				} else {
					result = evaluateAscetIndex({
						cwd: ctx.cwd,
						checks: params.checks,
						query: params.query,
						requiredAreas: params.requiredAreas,
						requireFreshness: params.requireFreshness,
						env: ctx.env,
					});
				}
				break;
		}

		const text =
			params.format === "text"
				? summarizeResult(params.action, result)
				: JSON.stringify(toToolSuccessPayload(result), null, 2);
		const route = routeAscetAction({ toolName: "ascet_index", action: params.action });
		return {
			content: [{ type: "text", text }],
			details: {
				...(typeof result === "object" && result !== null ? result : { result }),
				tool: "ascet_index",
				action: params.action,
				command: {
					logicalCommandId: route.logicalCommandId,
					backendCommandId: route.backendCommandId,
					operation: route.operation,
				},
			},
		};
	},
});
