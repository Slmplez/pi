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

test("live and generated tool rules expose the compact dependent-chain construction guide", () => {
	const liveRules = read(".ascet/rules/tools/pi-ascet-tools.md");
	const templateRules = read("packages/ascet-extension/templates/ascet-project/rules/tools/pi-ascet-tools.md");
	assert.equal(templateRules, liveRules);
	for (const source of [liveRules, templateRules]) {
		assert.match(
			source,
			/`ascet_edit\.create_dependent_chain`: Create one Provider Exported P_<Name> -> Consumer Imported P_<Name> -> Consumer Local Dependent C_<Name> Parameter chain/u,
		);
		assert.match(source, /explicit implementation with valueType, memoryLocation, formula, and limitAssignments/u);
		assert.match(
			source,
			/ident needs no projectPath; another formula needs the matching Provider or Consumer projectPath/u,
		);
		assert.match(source, /formula="x", formal="x"; apply verifies readback/u);
		assert.match(source, /one `ascet_edit` call with `intent="apply"`/u);
		assert.doesNotMatch(source, /ascetDefault is (?:not supported for this action|not accepted)/u);
	}
});

test("dependency guidance keeps the public binding shape free of mapping fields", () => {
	const contract = read("packages/ascet-extension/src/tools/actions/contracts/dependency.ts");
	const dependency = read("packages/ascet-extension/skills/ascet-engineering/references/dependency-advanced-path.md");

	assert.ok(contract.includes('binding.formula="x"'));
	assert.ok(contract.includes('binding.formal="x"'));
	assert.ok(contract.includes('binding.variantPolicy="default"'));
	assert.match(contract, /Do not add a mapping field/u);
	assert.doesNotMatch(contract, /binding\.mappings/u);
	assert.doesNotMatch(dependency, /binding\.mappings/u);
});

test("hidden legacy dependency-chain metadata is explicitly recovery-only", () => {
	for (const path of [
		"ascetcli/contracts/cli-catalog.json",
		"ascetcli/contracts/commands/AscetConfigureParameterDependencyChainExecute.json",
		"packages/ascet-extension/ascet-cli/contracts/cli-catalog.json",
		"packages/ascet-extension/ascet-cli/contracts/commands/AscetConfigureParameterDependencyChainExecute.json",
	]) {
		const source = read(path);
		assert.match(source, /Legacy recovery-only dependency-chain operation/u, path);
		assert.doesNotMatch(source, /Preview or apply one/u, path);
		assert.match(source, /public writes use ascet_edit\.create_dependent_chain with intent=apply/u, path);
	}
});

test("dependent-chain guidance keeps explicit implementation and Project-scoped custom-formula semantics", () => {
	const contract = read("packages/ascet-extension/src/tools/actions/contracts/dependency.ts");
	const dependency = read("packages/ascet-extension/skills/ascet-engineering/references/dependency-advanced-path.md");
	assert.match(contract, /Provider and Local each require implementation\.mode="explicit"/u);
	assert.match(contract, /Use formula="ident" without projectPath.*each Formula must exist in that Project/isu);
	assert.match(contract, /Imported contains only name, modelType, and optional unit/u);
	assert.match(
		dependency,
		/Provider and Local have complete explicit implementation decisions; Imported remains structural/u,
	);
	assert.match(dependency, /Resolve each custom Formula against exact Project evidence/u);
	assert.doesNotMatch(contract, /ascetDefault is not supported for this action/u);
});
