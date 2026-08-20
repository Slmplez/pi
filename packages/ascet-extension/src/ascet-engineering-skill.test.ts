import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { listAscetActionContracts } from "./tools/actions/contract-registry.ts";
import { ascetSearchModes } from "./tools/actions/contracts/search.ts";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = join(packageRoot, "skills", "ascet-engineering");
const referencesRoot = join(skillRoot, "references");
const skillPath = join(skillRoot, "SKILL.md");
const metadataPath = join(skillRoot, "agents", "openai.yaml");

const expectedReferences = [
	"cnms-cust-routing-and-ownership.md",
	"customer-integration-workflow.md",
	"database-root-discovery.md",
	"dependency-advanced-path.md",
	"elements-fast-path.md",
	"esdl-design-and-signal-reuse.md",
	"esdl-fast-path.md",
	"esdl-literals-and-configuration-values.md",
	"feature-package-workflow.md",
	"implementation-type-and-memory-layout.md",
	"parameter-design-and-placement.md",
	"search-and-target-resolution.md",
	"surface-and-signal-flow-routing.md",
	"target-scope-and-ownership.md",
	"task-planning-and-change-design.md",
	"tool-routing-and-write-execution.md",
] as const;

const removedReferences = [
	"bde-and-surface-routing.md",
	"class-path-project-context.md",
	"parameter-naming.md",
	"parameter-provider-placement.md",
	"project-to-esdl-signal-flow.md",
	"scope-resolution-and-ownership.md",
	"task-planning-and-implementation-plan.md",
	"tool-recipes.md",
	"write-execution.md",
] as const;

const historicalIdentifiers = [
	"ascet_edit.set_dependent_chain",
	"configure_parameter_dependency_chain",
	"PREFLIGHTED",
	"executeWrite",
	"planId",
	"ascet_get.elements",
	"ascet_get.component_refs",
	"ascet_get.bde_edges",
	"ascet_get.import_binding",
	"ascet_get.dbitem_refs",
	"ascet_get.database_catalog",
] as const;

function readSkill(): string {
	return readFileSync(skillPath, "utf8");
}

function readReference(name: string): string {
	return readFileSync(join(referencesRoot, name), "utf8");
}

function readGuidance(): string {
	return [readSkill(), ...expectedReferences.map(readReference)].join("\n");
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function assertContains(text: string, phrases: readonly string[]): void {
	for (const phrase of phrases) {
		assert.match(text, new RegExp(escapeRegExp(phrase), "u"), phrase);
	}
}

class FauxAscetTools {
	readonly calls: string[] = [];
	readonly #publicActions = new Set(
		listAscetActionContracts()
			.filter((contract) => contract.visibility === "public")
			.map((contract) => contract.id),
	);

	invoke(actionId: string): void {
		assert.equal(this.#publicActions.has(actionId), true, `${actionId} must be public`);
		this.calls.push(actionId);
	}
}

describe("ASCET engineering Skill", () => {
	test("has trigger-complete frontmatter, concise body, and matching agent metadata", () => {
		const skill = readSkill();
		const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/u)?.[1] ?? "";
		const keys = [...frontmatter.matchAll(/^([a-z][a-z0-9_-]*):/gmu)].map((match) => match[1]);
		const metadata = readFileSync(metadataPath, "utf8");

		assert.deepEqual(keys, ["name", "description"]);
		assert.match(frontmatter, /^name:\s*ascet-engineering\s*$/mu);
		assertContains(frontmatter, ["ASCET", "ESDL", "Element", "Parameter", "dependency", "Use when"]);
		assert.ok(skill.split(/\r?\n/u).length <= 100, "SKILL.md must remain concise");
		assert.match(metadata, /display_name:\s*"ASCET Engineering"/u);
		assert.match(metadata, /short_description:\s*"[^"\r\n]{25,64}"/u);
		assert.match(metadata, /default_prompt:\s*>?-?\s*\r?\n?[\s\S]*\$ascet-engineering/u);
		assert.match(metadata, /allow_implicit_invocation:\s*true/u);
	});

	test("keeps authority with system instructions and active Tool contracts", () => {
		const skill = readSkill();

		assertContains(skill, [
			"System and Developer instructions remain authoritative",
			"Active Tool schemas and Action Contracts are authoritative",
			"follow the Tool contract and report the Skill drift",
		]);
		assert.doesNotMatch(skill, /Skill as the authoritative ASCET engineering workflow/u);
		assert.doesNotMatch(skill, /System Prompt and Tool Prompt guidance must not replace this workflow/u);
	});

	test("uses only complete public Action IDs from the active Contract Registry", () => {
		const guidance = readGuidance();
		const publicActionIds = new Set(
			listAscetActionContracts()
				.filter((contract) => contract.visibility === "public")
				.map((contract) => contract.id),
		);
		const referencedActionIds = new Set(
			guidance.match(/\bascet_(?:batch|diff|edit|get|ops|read|search)\.[a-z][a-z0-9_]*\b/gu) ?? [],
		);

		assert.ok(referencedActionIds.size > 0);
		for (const actionId of referencedActionIds) {
			assert.equal(publicActionIds.has(actionId), true, `${actionId} is not a public Action`);
		}
	});

	test("defines Search as candidate discovery with exact validation before engineering use", () => {
		const search = readReference("search-and-target-resolution.md");
		const documentedModes = [...search.matchAll(/^\| `([^`]+)` \|/gmu)].map((match) => match[1]);

		assert.deepEqual(documentedModes, [...ascetSearchModes]);
		assertContains(search, [
			"Exact validated targets skip Search",
			"Discovery-only requests may stop after `ascet_search.search`",
			"Search results are candidates",
			"`more=true` means the returned list is truncated",
			"Text candidates require `ascet_read.read_code`",
			"Element candidates require `ascet_read.read_element`",
			"Never pass a Search candidate directly to an edit action",
		]);
		assert.doesNotMatch(search, /ascet_search\.search\s*\r?\n\s*->\s*ascet_edit\./u);
		assertContains(search, [
			"Do not default to broad text queries such as `slope`, `AVH`, `state`, or `request`",
			"Prefer a complete identifier such as `AVHActivationByBrakePedal` or `TargetStateAvh`",
			"full signal name or full Parameter name",
			"refine `q` before opening candidate code",
		]);
		const skill = readSkill();
		assert.match(skill, /For `mode=text`, prefer a complete symbol, signal, or Parameter name/u);
	});

	test("limits public Get guidance to tree and formulas", () => {
		const getActionIds = new Set(readGuidance().match(/\bascet_get\.[a-z][a-z0-9_]*\b/gu) ?? []);

		assert.deepEqual([...getActionIds].sort(), ["ascet_get.formulas", "ascet_get.tree"]);
	});

	test("routes code surfaces and Element or Dependency writes to one canonical Action", () => {
		const routing = readReference("tool-routing-and-write-execution.md");
		const elements = readReference("elements-fast-path.md");
		const dependency = readReference("dependency-advanced-path.md");

		assertContains(routing, [
			"Method body → `ascet_edit.set_method_code`",
			"Module header or external C → `ascet_edit.set_module_code`",
			"StateMachine state, transition, binding, or start state → `ascet_edit.set_state_machine_code`",
			"Ordinary Elements → `ascet_edit.apply_element_spec`",
			"Complete Parameter Dependency Chain → `ascet_edit.create_dependent_chain`",
		]);
		assertContains(elements, ["ordinary Element", "`ascet_edit.apply_element_spec`"]);
		assertContains(dependency, [
			"Missing Element: create it",
			"Exact Element: reuse it",
			"Metadata conflict: reject without overwrite",
			"Binding conflict: reject without overwrite",
			"must not also be managed by `ascet_edit.apply_element_spec`",
		]);
	});

	test("documents identity and custom Formula Project-context rules", () => {
		const guidance = readGuidance();

		assert.match(guidance, /ident.*built-in identity formula.*does not require.*projectPath/u);
		assert.match(guidance, /Any non-ident.*impl\.formula.*requires one explicit.*projectPath/u);
		assert.match(guidance, /Never infer a Project from.*componentPath.*Folder layout.*sibling item named.*Project/u);
		assert.match(guidance, /Do not create a Project merely to satisfy [`\\u0060]?ident[`\\u0060]? validation/u);
		assert.match(guidance, /custom formula.*identify one exact existing Project.*pass.*projectPath.*explicitly/iu);
		assert.match(
			guidance,
			/ascet_edit_project_context_required.*project_context_required.*distinct from.*invalid_formula_reference/iu,
		);
	});

	test("documents UI implementation types, range selection, and ascetDefault semantics", () => {
		const implementation = readReference("implementation-type-and-memory-layout.md");

		assertContains(implementation, [
			"There is no public `impl.type` field",
			"Ordinary Element specs use `impl.valueType`",
			"`modelType=cont`: `real64`, `real32`, `sint8`, `sint16`, `sint32`, `uint8`, `uint16`, `uint32`",
			"`modelType=log`: `bit`, `bool`, `sint8`, `sint16`, `sint32`, `uint8`, `uint16`, `uint32`",
			"smallest type that contains the complete required implementation/data range",
			"`sint8` | `[-128, 127]`",
			"`sint16` | `[-32768, 32767]`",
			"`sint32` | `[-2147483648, 2147483647]`",
			"`uint8` | `[0, 255]`",
			"`uint16` | `[0, 65535]`",
			"`uint32` | `[0, 4294967295]`",
			"A range alone cannot determine floating-point precision",
			"`implementation.mode=ascetDefault` is not an implementation type",
			"no `impl` is sent",
			"The Bridge normalizes these `sint*` names to internal `int*` aliases",
		]);
		assert.doesNotMatch(implementation, /"impl"\s*:\s*\{\s*"type"/u);
		assert.doesNotMatch(implementation, /float32|double|sint64|int64/u);
	});

	test("separates read result handling from mutation completion", () => {
		const execution = readReference("tool-routing-and-write-execution.md");

		assertContains(execution, [
			"Search, Get, and Read results",
			"do not require write verification",
			"Mutation success requires passed automatic verification",
			"Stop on blocked, error, partial, rolled-back, unknown, or missing verification outcomes",
		]);
	});

	test("physically removes historical identifiers, product samples, and compatibility References", () => {
		const guidance = readGuidance();

		for (const identifier of historicalIdentifiers) {
			assert.doesNotMatch(guidance, new RegExp(escapeRegExp(identifier), "u"), identifier);
		}
		assert.doesNotMatch(guidance, /plan\/commit|one corresponding commit|AVH_[A-Za-z0-9_]+/u);
		for (const reference of removedReferences) {
			assert.equal(existsSync(join(referencesRoot, reference)), false, reference);
		}
	});

	test("has one complete, non-orphaned Reference set", () => {
		const skill = readSkill();
		const linkedReferences = new Set([...skill.matchAll(/`references\/([^`]+\.md)`/gu)].map((match) => match[1]));
		const actualReferences = readdirSync(referencesRoot)
			.filter((name) => name.endsWith(".md"))
			.sort();

		assert.deepEqual(actualReferences, [...expectedReferences]);
		assert.deepEqual([...linkedReferences].sort(), [...expectedReferences]);
	});

	test("forward routes representative requests through faux public Tools without real writes", () => {
		const scenarios = [
			{
				name: "fuzzy Element resolution",
				actions: ["ascet_search.search", "ascet_read.read_element"],
			},
			{ name: "candidate discovery only", actions: ["ascet_search.search"] },
			{ name: "complete dependency chain", actions: ["ascet_edit.create_dependent_chain"] },
			{ name: "ordinary Element", actions: ["ascet_edit.apply_element_spec"] },
			{ name: "Module header", actions: ["ascet_edit.set_module_code"] },
			{ name: "StateMachine transition", actions: ["ascet_edit.set_state_machine_code"] },
		] as const;

		for (const scenario of scenarios) {
			const tools = new FauxAscetTools();
			for (const actionId of scenario.actions) tools.invoke(actionId);
			assert.deepEqual(tools.calls, [...scenario.actions], scenario.name);
		}

		const missingMetadata = new FauxAscetTools();
		assert.deepEqual(missingMetadata.calls, [], "missing business value or metadata must stop before Tool mutation");
	});
});
