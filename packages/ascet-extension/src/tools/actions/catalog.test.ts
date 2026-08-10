import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { listActionCatalogEntries } from "./catalog.ts";

const getActions = [
	"tree",
	"database_catalog",
	"elements",
	"formulas",
	"component_refs",
	"bde_edges",
	"import_binding",
	"dbitem_refs",
] as const;

describe("ASCET action catalog", () => {
	test("has stable model-facing metadata for every public action", () => {
		const entries = listActionCatalogEntries();

		assert.ok(entries.length > 30);
		for (const entry of entries) {
			assert.equal(entry.visibility, "public");
			assert.equal(entry.id, `${entry.tool}.${entry.action}`);
			assert.ok(entry.family);
			assert.ok(entry.risk);
			assert.ok(entry.compact.length > 0);
			assert.ok(entry.miniFewShot.includes(`${entry.tool}(`));
			assert.ok(entry.intent.length > 0);
			assert.ok(entry.schema.required.length + entry.schema.optional.length > 0);
			assert.ok(entry.result.shape.length > 0);
			assert.ok(entry.result.fields.length > 0);
		}
	});

	test("publishes the complete public ascet_get action family", () => {
		const entries = listActionCatalogEntries().filter((entry) => entry.tool === "ascet_get");

		assert.deepEqual(entries.map((entry) => entry.action).sort(), [...getActions].sort());
		for (const entry of entries) {
			assert.equal(entry.family, "get");
			assert.equal(entry.result.shape, "observation");
		}
	});

	test("distinguishes bounded Get discovery from exact live code reads", () => {
		const entries = new Map(listActionCatalogEntries().map((entry) => [entry.id, entry]));

		assert.match(entries.get("ascet_get.tree")?.compact ?? "", /bounded live Folder\/Component tree/);
		assert.match(entries.get("ascet_get.elements")?.rules.join("\n") ?? "", /result-count limit/);
		assert.match(entries.get("ascet_get.import_binding")?.rules.join("\n") ?? "", /exact path or OID/);
		assert.match(entries.get("ascet_read.read_code")?.compact ?? "", /complete live code/);
		assert.match(entries.get("ascet_read.read_element")?.compact ?? "", /exact resolved Element/);
	});

	test("keeps discovery bounded and reference actions outgoing-only", () => {
		const entries = new Map(listActionCatalogEntries().map((entry) => [entry.id, entry]));
		const treeRules = entries.get("ascet_get.tree")?.rules.join("\n") ?? "";
		const elementRules = entries.get("ascet_get.elements")?.rules.join("\n") ?? "";
		const componentReferenceRules = entries.get("ascet_get.component_refs")?.rules.join("\n") ?? "";
		const databaseReferenceRules = entries.get("ascet_get.dbitem_refs")?.rules.join("\n") ?? "";
		const bdeRules = entries.get("ascet_get.bde_edges")?.rules.join("\n") ?? "";

		assert.doesNotMatch(treeRules, /Use tree first/);
		assert.match(treeRules, /exact path or OID.*directly/);
		assert.match(elementRules, /user input, tree discovery, or validated stored evidence/);
		assert.match(componentReferenceRules, /outgoing Component references only/);
		assert.match(componentReferenceRules, /not a reverse-reference or Project-discovery API/);
		assert.match(databaseReferenceRules, /outgoing database-item references only/);
		assert.match(databaseReferenceRules, /not a reverse-reference API/);
		assert.match(bdeRules, /zero-edge result does not prove.*no Diagram/);
	});
	test("defines dependency read/write boundaries around on-demand observations", () => {
		const entries = new Map(listActionCatalogEntries().map((entry) => [entry.id, entry]));
		const readChain = entries.get("ascet_read.read_dependent_chain");
		const writeDependency = entries.get("ascet_edit.set_element_dependency");

		assert.match(
			readChain?.rules.join("\n") ?? "",
			/bounded tree discovery only when those targets are not already known/,
		);
		assert.match(writeDependency?.compact ?? "", /existing local parameter/);
		assert.match(writeDependency?.rules.join("\n") ?? "", /does not create local, imported, or exported elements/);
		assert.match(writeDependency?.rules.join("\n") ?? "", /invalidate matching on-demand observations/);
	});

	test("makes code semantics primary for apply_element_spec", () => {
		const entries = new Map(listActionCatalogEntries().map((entry) => [entry.id, entry]));
		const elementSpec = entries.get("ascet_edit.apply_element_spec");
		const rules = elementSpec?.rules.join("\n") ?? "";

		assert.match(rules, /element's code role and explicit requirements/);
		assert.match(rules, /semantic intent drives the target spec/);
		assert.match(rules, /bounded ascet_get.tree discovery only when the exact target is not known/);
		assert.match(rules, /ascet_get.elements for the resolved Component or bounded Folder/);
		assert.match(rules, /do not copy a sibling's values without semantic equivalence/);
		assert.match(rules, /Provider Exported Parameter creation.*decision groups/);
		assert.match(rules, /Local Dependent Parameter creation.*decision groups/);
		assert.match(rules, /Imported Parameters are the exception/);
		assert.match(rules, /limitAssignments=null/);

		const dependency = entries.get("ascet_edit.set_element_dependency");
		const dependencyRules = dependency?.rules.join("\n") ?? "";
		assert.match(dependencyRules, /Parameter, Constant, or System Constant/);
		assert.match(dependencyRules, /dependencyMappings is mandatory/);
		assert.match(dependencyRules, /variant selection.*all variants/);
		assert.match(dependencyRules, /explicit restoration source/);

		const chain = entries.get("configure_parameter_dependency_chain.execute");
		const chainRules = chain?.rules.join("\n") ?? "";
		assert.match(chainRules, /complete inline definition/);
		assert.match(chainRules, /same P_<Name>/);
		assert.match(chainRules, /Consumer Local must be C_<Name>/);
		assert.match(chainRules, /formals and mapping keys must match exactly/);
		assert.match(chainRules, /zero mutation/);
		assert.match(chainRules, /Do not retry blindly/);
		assert.doesNotMatch(chain?.miniFewShot ?? "", /specFile|mode:"plan"|mode:"commit"|planId/);
		const chainArgs = chain?.fewShots[0]?.args;
		assert.ok(chainArgs);
		const provider = chainArgs.provider as { element?: { name?: unknown } };
		const consumer = chainArgs.consumer as { element?: { name?: unknown } };
		const local = chainArgs.local as { element?: { name?: unknown } };
		const chainDependency = chainArgs.dependency as {
			formals?: unknown;
			mappings?: Record<string, { kind?: unknown; name?: unknown }>;
		};
		assert.equal(provider.element?.name, "P_Threshold");
		assert.equal(consumer.element?.name, "P_Threshold");
		assert.equal(local.element?.name, "C_Threshold");
		assert.deepEqual(chainDependency.formals, ["P_Threshold"]);
		assert.deepEqual(chainDependency.mappings, {
			P_Threshold: { kind: "parameter", name: "P_Threshold" },
		});
	});
});
