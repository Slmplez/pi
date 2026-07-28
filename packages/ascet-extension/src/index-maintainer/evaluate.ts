import { queryAscetComponentIndexSqlite } from "../search-index-sqlite/query.ts";
import { ASCET_REQUIRED_P0_INDEX_AREAS } from "../search-index-sqlite/schema.ts";
import { readAscetIndexStatus } from "./status.ts";

export interface EvaluateAscetIndexOptions {
	cwd: string;
	checks?: readonly string[];
	query?: string;
}

export function evaluateAscetIndex(options: EvaluateAscetIndexOptions): Record<string, unknown> {
	const requested = new Set(
		options.checks && options.checks.length > 0 ? options.checks : ["status", "counts", "sidecar"],
	);
	const status = readAscetIndexStatus({ cwd: options.cwd, detailLevel: "areas" });
	const checks: Array<{ name: string; passed: boolean; message?: string }> = [];

	if (requested.has("status")) {
		checks.push({ name: "status", passed: status.state === "ready" || status.state === "stale" });
	}
	if (requested.has("counts")) {
		const areas = new Map(status.areas?.map((area) => [area.name, area]));
		const missing = ASCET_REQUIRED_P0_INDEX_AREAS.filter((area) => !areas.has(area));
		checks.push({
			name: "counts",
			passed: missing.length === 0 && status.totalDocs > 0,
			message: missing.length > 0 ? `Missing areas: ${missing.join(", ")}` : undefined,
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
		checks.push({ name: "search_smoke", passed: result?.ok === true });
	}

	return {
		state: checks.every((check) => check.passed) ? "passed" : "failed",
		checks,
		status,
	};
}
