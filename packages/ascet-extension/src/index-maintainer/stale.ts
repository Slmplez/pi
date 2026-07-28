import { markAscetSqliteIndexAreasStale } from "../search-index-sqlite/status.ts";
import { planAscetIndexAreas } from "./area-mapping.ts";

export function markAscetIndexAreasStale(
	cwd: string,
	areas: readonly string[] | undefined,
	reason: string,
): { state: "stale"; requestedAreas: string[]; areas: string[]; reason: string } {
	const plan = planAscetIndexAreas(areas);
	markAscetSqliteIndexAreasStale(cwd, plan.sqliteAreas, reason);
	return {
		state: "stale",
		requestedAreas: plan.requestedAreas,
		areas: plan.sqliteAreas,
		reason,
	};
}
