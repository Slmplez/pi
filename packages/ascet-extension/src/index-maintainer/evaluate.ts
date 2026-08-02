import { queryAscetComponentIndexSqlite } from "../search-index-sqlite/query.ts";
import { ASCET_REQUIRED_P0_INDEX_AREAS } from "../search-index-sqlite/schema.ts";
import { readAscetIndexStatus } from "./status.ts";

export interface EvaluateAscetIndexOptions {
	cwd: string;
	checks?: readonly string[];
	query?: string;
	requiredAreas?: readonly string[];
	requireFreshness?: boolean;
	env?: Record<string, string | undefined>;
}

export function evaluateAscetIndex(options: EvaluateAscetIndexOptions): Record<string, unknown> {
	const requested = new Set(
		options.checks && options.checks.length > 0 ? options.checks : ["status", "counts", "freshness", "sidecar"],
	);
	const status = readAscetIndexStatus({ cwd: options.cwd, detailLevel: "areas" });
	const checks: Array<{ name: string; passed: boolean; message?: string }> = [];
	const requiredAreas =
		options.requiredAreas && options.requiredAreas.length > 0
			? [...new Set(options.requiredAreas)]
			: [...ASCET_REQUIRED_P0_INDEX_AREAS];
	const areaByName = new Map<string, NonNullable<typeof status.areas>[number]>(
		(status.areas ?? []).map((area) => [area.name, area]),
	);
	const missingAreas = requiredAreas.filter((area) => !areaByName.has(area));
	const notReadyAreas = requiredAreas.filter((area) => areaByName.get(area)?.state !== "ready");
	const incompleteAreas = requiredAreas.filter((area) => areaByName.get(area)?.scanComplete === false);
	const strictFreshness = options.requireFreshness ?? options.env?.ASCET_INDEX_FRESHNESS_STRICT !== "0";

	if (requested.has("status")) {
		checks.push({ name: "status", passed: status.state === "ready" });
	}
	if (requested.has("counts")) {
		checks.push({
			name: "counts",
			passed: missingAreas.length === 0 && notReadyAreas.length === 0 && status.totalDocs > 0,
			message:
				missingAreas.length > 0
					? `Missing areas: ${missingAreas.join(", ")}`
					: notReadyAreas.length > 0
						? `Areas not ready: ${notReadyAreas.join(", ")}`
						: undefined,
		});
	}
	if (requested.has("freshness")) {
		checks.push({
			name: "freshness",
			passed: !strictFreshness || (notReadyAreas.length === 0 && incompleteAreas.length === 0),
			message:
				strictFreshness && notReadyAreas.length > 0
					? `Required areas are not ready: ${notReadyAreas.join(", ")}`
					: strictFreshness && incompleteAreas.length > 0
						? `Required areas are incomplete: ${incompleteAreas.join(", ")}`
						: undefined,
		});
	}
	if (requested.has("sidecar")) {
		checks.push({ name: "sidecar", passed: status.footer?.inSync === true });
	}
	if (requested.has("search_smoke")) {
		const result = queryAscetComponentIndexSqlite(
			{ query: options.query ?? "", match: options.query ? "contains" : "contains", limit: 1 },
			{ cwd: options.cwd },
		);
		const payload =
			result?.data && typeof result.data === "object" && !Array.isArray(result.data)
				? (result.data as { result?: { authoritative?: unknown; searchComplete?: unknown } }).result
				: undefined;
		checks.push({
			name: "search_smoke",
			passed: result?.ok === true && payload?.authoritative === true && payload.searchComplete === true,
		});
	}

	return {
		state: checks.every((check) => check.passed) ? "passed" : "failed",
		checks,
		status,
		requiredAreas,
		freshness: notReadyAreas.length === 0 ? "ready" : status.state,
		staleAreas: notReadyAreas,
		authoritative: notReadyAreas.length === 0,
	};
}
