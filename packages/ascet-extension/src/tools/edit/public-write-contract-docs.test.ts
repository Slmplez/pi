import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");

function read(path: string): string {
	return readFileSync(resolve(repositoryRoot, path), "utf8");
}

const modelFacingWriteSources = [
	"packages/ascet-extension/src/tools/actions/contracts/edit.ts",
	"packages/ascet-extension/src/tools/actions/contracts/dependency.ts",
	"packages/ascet-extension/src/tools/edit/prompt.ts",
	"packages/ascet-extension/src/tools/edit/definition.ts",
	"packages/ascet-extension/src/tools/actions/compact-prompt.ts",
	"packages/ascet-extension/src/tools/actions/catalog.ts",
	"packages/ascet-extension/src/ascet-coding-policy.ts",
	"packages/ascet-extension/contracts/catalog-snapshot.json",
	".ascet/rules/tools/pi-ascet-tools.md",
	"packages/ascet-extension/templates/ascet-project/rules/tools/pi-ascet-tools.md",
	"packages/ascet-extension/templates/ascet-project/rules/tools/write.md",
	"packages/ascet-extension/templates/ascet-project/rules/tasks/small-safe-edit.md",
	"packages/ascet-extension/skills/ascet-engineering/SKILL.md",
	"packages/ascet-extension/skills/ascet-engineering/references/tool-routing-and-write-execution.md",
	"packages/ascet-extension/skills/ascet-engineering/references/dependency-advanced-path.md",
	"packages/ascet-extension/CHANGELOG.md",
] as const;

const retiredPreviewContract =
	/intent\s*(?:=|:)\s*["'`]?preview|["'`]preview["'`]\s*\|\s*["'`]apply["'`]|preview\s+(?:or|and)\s+apply/iu;

test("model-facing ascet_edit sources contain no retired public preview contract", () => {
	for (const path of modelFacingWriteSources) {
		assert.doesNotMatch(read(path), retiredPreviewContract, path);
	}
});

test("live and generated tool rules describe the same apply-only dependent-chain contract", () => {
	const liveRules = read(".ascet/rules/tools/pi-ascet-tools.md");
	const templateRules = read("packages/ascet-extension/templates/ascet-project/rules/tools/pi-ascet-tools.md");
	assert.equal(templateRules, liveRules);
	for (const source of [liveRules, templateRules]) {
		assert.match(source, /one `ascet_edit` call with `intent="apply"`/u);
		assert.match(source, /`mode="check"` only for read-only editability inspection/u);
		assert.match(source, /`formula="x"`, `formal="x"`, and map `x` to the Consumer Imported Parameter/u);
	}
});

test("Skill and dependency guidance distinguish formula, formal, and Imported Parameter mapping", () => {
	for (const path of [
		"packages/ascet-extension/skills/ascet-engineering/SKILL.md",
		"packages/ascet-extension/skills/ascet-engineering/references/dependency-advanced-path.md",
		"packages/ascet-extension/src/tools/actions/contracts/dependency.ts",
	]) {
		const source = read(path);
		assert.ok(source.includes('formula="x"') || source.includes('formula=\\"x\\"'), path);
		assert.ok(source.includes('formal="x"') || source.includes('formal=\\"x\\"'), path);
		assert.match(source, /Consumer Imported Parameter|consumer\.importedElement\.name/u, path);
	}
});
