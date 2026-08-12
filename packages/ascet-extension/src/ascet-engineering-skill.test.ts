import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

	test("covers fast CNMS/CUST routing, database identity, and canonical ownership", () => {
		const skill = readSkill();
		const routing = readReference("cnms-cust-routing-and-ownership.md");
		const discovery = readReference("database-root-discovery.md");
		const signalFlow = readReference("project-to-esdl-signal-flow.md");
		const guidance = `${skill}\n${routing}\n${discovery}\n${signalFlow}`;

		for (const phrase of [
			"databaseRole",
			"ownerLayer",
			"Project::Module",
			"same-OID",
			"canonical definition",
			"database.name",
			"database.path",
			"integrationScope",
			"featureScope",
		]) {
			assert.match(guidance, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"), phrase);
		}
		assert.match(guidance, /feature semantics/u);
		assert.match(guidance, /concrete ESDL code or an exact patch/u);
		assert.match(guidance, /complete live database scan/u);
		assert.doesNotMatch(guidance, /CUST-to-CNMS|promotion workflow|promotion-readiness/iu);
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
		assert.match(parameterNaming, /Consumer Local Dependent Parameters use `C_<Name>`/);
		assert.match(parameterNaming, /`C_` identifies the Consumer Local Dependent Parameter role/);
		assert.match(parameterNaming, /It is not a generic prefix for local Elements/);
		assert.match(parameterNaming, /Local State or Internal Variable/);
		assert.match(parameterNaming, /AVH_DoubleBrakePressCount/);
		assert.match(parameterNaming, /value\/source, type, unit, range, initial/);
		assert.match(literals, /Local `0`, `1`, `-1`/);
		assert.match(literals, /needless P_\/C_ chain/);
	});
	test("makes shared OID warnings contextual and non-repetitive", () => {
		const skill = readSkill();
		const recipes = readReference("tool-recipes.md");
		const guidance = `${skill}\n${recipes}`;

		assert.match(guidance, /actual mutation/u);
		assert.match(guidance, /Project-local/u);
		assert.match(guidance, /impact (?:has )?changed/u);
		assert.match(guidance, /shared ownership/u);
		assert.match(guidance, /reads?, preflight(?:-only)?(?: calls?)?, (?:and )?no-op/u);
		assert.match(guidance, /same OID/u);
		assert.match(guidance, /already (?:been )?(?:acknowledged|explained)/u);
		assert.match(guidance, /contextual wording/u);
		assert.match(guidance, /second shared-object confirmation/u);
		assert.doesNotMatch(guidance, /提醒：本次修改可能影响所有引用该 OID 的 Project。/u);
	});

	test("keeps live database samples out of production guidance", () => {
		const referencesRoot = join(skillRoot, "references");
		const guidance = [
			readSkill(),
			...readdirSync(referencesRoot)
				.filter((name) => name.endsWith(".md"))
				.map((name) => readFileSync(join(referencesRoot, name), "utf8")),
		].join("\n");

		for (const sampleIdentity of ["Xiaomi", "ChangAn", "BB88010", "BB00000", "BB88962", "F05_IPB_L2_0429"]) {
			assert.doesNotMatch(guidance, new RegExp(sampleIdentity, "u"), sampleIdentity);
		}
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
