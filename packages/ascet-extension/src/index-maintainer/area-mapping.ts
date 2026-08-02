import type { AscetSearchIndexWarmupPartition } from "../search-index.ts";
import {
	ASCET_LOGICAL_INDEX_AREA_MAP,
	ASCET_P0_INDEX_AREAS,
	type AscetP0IndexArea,
} from "../search-index-sqlite/schema.ts";
import { ASCET_INDEX_PUBLIC_AREAS, type AscetIndexAreaPlan, type AscetIndexPublicArea } from "./types.ts";

const publicAreaSet = new Set<string>(ASCET_INDEX_PUBLIC_AREAS);

const publicAreaSqliteAreas: Record<AscetIndexPublicArea, readonly AscetP0IndexArea[]> = {
	p0: ASCET_LOGICAL_INDEX_AREA_MAP.p0,
	components: ASCET_LOGICAL_INDEX_AREA_MAP.components,
	tree: ASCET_LOGICAL_INDEX_AREA_MAP.tree,
	elements: ASCET_LOGICAL_INDEX_AREA_MAP.elements,
	methods: ASCET_LOGICAL_INDEX_AREA_MAP.methods,
	refs: ASCET_LOGICAL_INDEX_AREA_MAP.refs,
	code: ASCET_LOGICAL_INDEX_AREA_MAP.text_code,
	messages: ASCET_LOGICAL_INDEX_AREA_MAP.messages,
	project: ASCET_LOGICAL_INDEX_AREA_MAP.project,
};

export function isAscetIndexPublicArea(value: string): value is AscetIndexPublicArea {
	return publicAreaSet.has(value);
}

export function normalizeAscetIndexAreas(areas: readonly string[] | undefined): AscetIndexPublicArea[] {
	const requested = areas && areas.length > 0 ? areas : ["p0"];
	const normalized: AscetIndexPublicArea[] = [];
	for (const raw of requested) {
		if (!isAscetIndexPublicArea(raw)) {
			throw new Error(`Unsupported ASCET index area: ${raw}`);
		}
		if (!normalized.includes(raw)) {
			normalized.push(raw);
		}
	}
	return normalized.includes("p0") ? ["p0"] : normalized;
}

export function planAscetIndexAreas(areas: readonly string[] | undefined): AscetIndexAreaPlan {
	const requestedAreas = normalizeAscetIndexAreas(areas);
	const sqliteAreas = new Set<AscetP0IndexArea>();
	for (const area of requestedAreas) {
		for (const sqliteArea of publicAreaSqliteAreas[area]) {
			sqliteAreas.add(sqliteArea);
		}
	}

	const partitionSet = new Set<AscetSearchIndexWarmupPartition>();
	let requiresP0 = false;
	let includeTextCode = false;
	for (const area of requestedAreas) {
		switch (area) {
			case "p0":
				requiresP0 = true;
				break;
			case "components":
				partitionSet.add("components");
				break;
			case "tree":
				partitionSet.add("tree");
				break;
			case "elements":
				partitionSet.add("element_decls");
				break;
			case "methods":
				partitionSet.add("method_decls");
				break;
			case "refs":
				partitionSet.add("refs");
				break;
			case "code":
				partitionSet.add("text_code");
				includeTextCode = true;
				break;
			case "messages":
				partitionSet.add("messages");
				break;
			case "project":
				partitionSet.add("project");
				break;
		}
	}

	const effectivePartitions = requiresP0 ? ["p0" as const] : [...partitionSet];
	return {
		requestedAreas,
		effectivePartitions,
		sqliteAreas: requiresP0 ? [...ASCET_P0_INDEX_AREAS] : [...sqliteAreas],
		includeTextCode: includeTextCode || requiresP0,
		requiresP0,
	};
}
