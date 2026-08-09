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

	test("defines dependency read/write boundaries around on-demand observations", () => {
		const entries = new Map(listActionCatalogEntries().map((entry) => [entry.id, entry]));
		const readChain = entries.get("ascet_read.read_dependent_chain");
		const writeDependency = entries.get("ascet_edit.set_element_dependency");

		assert.match(readChain?.rules.join("\n") ?? "", /ascet_get.tree and ascet_get.elements/);
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
		assert.match(rules, /ascet_get.tree and ascet_get.elements/);
		assert.match(rules, /Do not copy a sibling's values without semantic equivalence/);
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

		const chainPlan = entries.get("configure_parameter_dependency_chain.plan");
		const chainCommit = entries.get("configure_parameter_dependency_chain.commit");
		assert.match(chainPlan?.rules.join("\n") ?? "", /role-specific inline element/);
		assert.match(chainPlan?.rules.join("\n") ?? "", /formals list and mapping keys must match exactly/);
		assert.doesNotMatch(chainPlan?.miniFewShot ?? "", /specFile/);
		assert.match(chainCommit?.miniFewShot ?? "", /mode:"commit",planId:/);
	});
});
