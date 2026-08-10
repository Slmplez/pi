import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = join(packageRoot, "skills", "ascet-engineering");
const skillPath = join(skillRoot, "SKILL.md");

function readSkill(): string {
	return readFileSync(skillPath, "utf8");
}
function readReference(name: string): string {
	return readFileSync(join(skillRoot, "references", name), "utf8");
}

describe("ASCET engineering Skill", () => {
	test("has valid frontmatter and bounded workflow size", () => {
		const skill = readSkill();
		const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/u)?.[1] ?? "";

		assert.match(frontmatter, /^name:\s*ascet-engineering\s*$/mu);
		assert.match(frontmatter, /^description:\s*\S.+$/mu);
		assert.ok(skill.split(/\r?\n/u).length >= 60 && skill.split(/\r?\n/u).length <= 90);
	});

	test("covers routing, evidence, planning, write readiness, and automatic verification", () => {
		const skill = readSkill();

		for (const phrase of [
			"Input and scope routing",
			"integrationScope",
			"featureScope",
			"Evidence and planning state",
			"blockingUnknowns",
			"todolist",
			"complete implementation plan",
			"Write readiness and stop conditions",
			"executeWrite=true",
			"automatic action-specific verification",
		]) {
			assert.match(skill, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"), phrase);
		}
		assert.doesNotMatch(skill, /AscetVerifyTool|ascet_verify/u);
	});

	test("defines planning granularity, complete change design, and literal boundaries", () => {
		const skill = readSkill();
		const planning = readReference("task-planning-and-implementation-plan.md");
		const esdlDesign = readReference("esdl-design-and-signal-reuse.md");
		const parameterNaming = readReference("parameter-naming.md");
		const literals = readReference("esdl-literals-and-configuration-values.md");

		assert.match(skill, /exact-target reads or single-field operations may use 1–2 items/);
		assert.match(skill, /routine ESDL\/Element changes usually use 3–5/);
		assert.match(skill, /real dependencies or independent write units/);
		assert.match(skill, /never use vague “analyze\/modify” items/);
		assert.match(planning, /scope\/ownership and exclusions/);
		assert.match(planning, /source → transform → consumer and reuse/);
		assert.match(planning, /exact Method\/ESDL patch/);
		assert.match(planning, /blocking unknowns/);
		assert.match(esdlDesign, /concrete ESDL code or an exact patch/);
		assert.match(parameterNaming, /Provider Exported Parameters use `P_<Name>`/);
		assert.match(parameterNaming, /Consumer Imported Parameters use the exact same `P_<Name>`/);
		assert.match(parameterNaming, /Consumer Local Parameters use `C_<Name>`/);
		assert.match(parameterNaming, /value\/source, type, unit, range, initial/);
		assert.match(literals, /Local `0`, `1`, `-1`/);
		assert.match(literals, /needless P_\/C_ chain/);
	});
	test("links only existing Skill References", () => {
		const skill = readSkill();
		const references = [...skill.matchAll(/`(references\/[^`]+\.md)`/gu)].map((match) => match[1]);

		assert.ok(references.length >= 17);
		for (const reference of references) {
			assert.equal(existsSync(join(skillRoot, reference)), true, reference);
		}
	});
});
