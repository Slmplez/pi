import type { RequirementCanonicalField } from "./types.ts";

export interface RequirementSchemaProfile {
	fieldToHeader: Partial<Record<RequirementCanonicalField, { name: string; columnNumber: number }>>;
	missingRequiredFields: RequirementCanonicalField[];
}

const HEADER_ALIASES: Record<RequirementCanonicalField, string[]> = {
	title: ["design requirements name", "requirement name", "title"],
	requirement_id: ["design requirement id", "requirement id", "id"],
	description: ["description", "requirement description"],
	supplier_comments: ["supplier comments", "supplier comment", "comments"],
	rb_top_fnid: ["rb_top_fnid", "rb top fnid", "rbtopfnid"],
	feature: ["swrt_feature", "swrt feature", "feature"],
	ccp: ["ccp"],
	signal_group: ["signal group", "signal_group"],
	signal: ["signal"],
	reused_signal: ["reused signal", "reused_signal"],
	defect: ["bosch defect", "defect", "bosch_defect"],
	swim: ["coem swim", "swim", "coem_swim"],
	lesson_learned: ["ll", "lesson learned", "lessons learned", "lesson_learned"],
};

const REQUIRED_FIELDS: RequirementCanonicalField[] = ["title", "requirement_id"];

function normalizeHeader(header: string): string {
	return header.trim().toLowerCase().replaceAll(/\s+/g, " ");
}

export function profileRequirementHeaders(
	headers: Array<{ name: string; columnNumber: number }>,
): RequirementSchemaProfile {
	const fieldToHeader: RequirementSchemaProfile["fieldToHeader"] = {};
	for (const header of headers) {
		const normalized = normalizeHeader(header.name);
		for (const [field, aliases] of Object.entries(HEADER_ALIASES) as Array<[RequirementCanonicalField, string[]]>) {
			if (fieldToHeader[field]) {
				continue;
			}
			if (aliases.includes(normalized)) {
				fieldToHeader[field] = header;
			}
		}
	}

	return {
		fieldToHeader,
		missingRequiredFields: REQUIRED_FIELDS.filter((field) => !fieldToHeader[field]),
	};
}
