import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createActionCatalogSnapshot, diffActionCatalogSnapshots, listActionCatalogEntries } from "./catalog.ts";

function entriesById() {
	return new Map(listActionCatalogEntries().map((entry) => [entry.id, entry]));
}

describe("ASCET action catalog", () => {
	test("has stable model-facing metadata for every public action", () => {
		const entries = listActionCatalogEntries();

		assert.ok(entries.length > 20);
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

	test("publishes one live Search action and only tree/formulas for Get", () => {
		const entries = listActionCatalogEntries();
		const search = entries.filter((entry) => entry.tool === "ascet_search");
		const get = entries.filter((entry) => entry.tool === "ascet_get");

		assert.deepEqual(
			search.map((entry) => entry.action),
			["*"],
		);
		assert.equal(search[0]?.family, "search");
		assert.deepEqual(search[0]?.schema.required, ["mode", "q"]);
		assert.deepEqual(search[0]?.schema.optional, ["limit"]);
		assert.deepEqual(search[0]?.result, {
			shape: "searchMatches",
			fields: ["count", "items", "more", "error"],
		});

		assert.deepEqual(get.map((entry) => entry.action).sort(), ["formulas", "tree"]);
		for (const entry of get) {
			assert.equal(entry.family, "get");
			assert.deepEqual(entry.result, { shape: "items", fields: ["count", "items", "more", "error"] });
		}
	});

	test("keeps Search live-only and Get bounded/exact", () => {
		const entries = entriesById();
		const searchRules = entries.get("ascet_search.*")?.rules.join("\n") ?? "";
		const treeRules = entries.get("ascet_get.tree")?.rules.join("\n") ?? "";
		const formulasRules = entries.get("ascet_get.formulas")?.rules.join("\n") ?? "";

		assert.match(searchRules, /live hints, not complete metadata/);
		assert.match(searchRules, /Resolve an exact path/);
		assert.match(treeRules, /bounded hierarchy expansion/);
		assert.match(treeRules, /does not perform name search/);
		assert.match(treeRules, /depth defaults to 1.*1 through 5/);
		assert.match(formulasRules, /one exact Project path/);
		assert.match(formulasRules, /name optionally filters one Formula/);
	});

	test("does not publish retired Get, raw dependency, or composite actions", () => {
		const entries = entriesById();
		for (const id of [
			"ascet_get.database_identity",
			"ascet_get.database_catalog",
			"ascet_get.elements",
			"ascet_get.component_refs",
			"ascet_get.bde_edges",
			"ascet_get.import_binding",
			"ascet_get.dbitem_refs",
			"ascet_edit.set_element_dependency",
			"configure_parameter_dependency_chain.execute",
		]) {
			assert.equal(entries.has(id), false, id);
		}
	});

	test("defines the final dependency-chain read/write pair", () => {
		const entries = entriesById();
		const read = entries.get("ascet_read.read_dependent_chain");
		const write = entries.get("ascet_edit.create_dependent_chain");
		const readRules = read?.rules.join("\n") ?? "";
		const writeRules = write?.rules.join("\n") ?? "";

		assert.match(readRules, /exact Consumer Component and Local Parameter/);
		assert.match(readRules, /live native Element Search/);
		assert.match(readRules, /Never choose the first same-named result/);
		assert.deepEqual(read?.result, { shape: "dependentChain", fields: ["found", "chain", "error"] });
		assert.match(write?.compact ?? "", /create-or-verify one Provider\/Imported\/Local Parameter dependency chain/);
		assert.match(writeRules, /Missing Elements are created/);
		assert.match(writeRules, /live native Element Search/);
		assert.match(writeRules, /automatic full readback/);
		assert.deepEqual(write?.result, {
			shape: "dependentChainWrite",
			fields: ["ok", "changed", "verified", "created", "configured", "code"],
		});
	});

	test("derives concise public schemas from TypeBox variants", () => {
		const entries = entriesById();
		const tree = entries.get("ascet_get.tree");
		const formulas = entries.get("ascet_get.formulas");
		const chain = entries.get("ascet_edit.create_dependent_chain");

		assert.deepEqual(tree?.schema.required, ["action"]);
		assert.deepEqual([...(tree?.schema.optional ?? [])].sort(), ["depth", "path"]);
		assert.deepEqual([...(formulas?.schema.required ?? [])].sort(), ["action", "path"]);
		assert.deepEqual(formulas?.schema.optional, ["name"]);
		assert.deepEqual([...(chain?.schema.required ?? [])].sort(), [
			"action",
			"binding",
			"consumer",
			"intent",
			"provider",
		]);
	});

	test("makes code semantics primary for apply_element_spec", () => {
		const rules = entriesById().get("ascet_edit.apply_element_spec")?.rules.join("\n") ?? "";

		assert.match(rules, /element's code role and explicit requirements/);
		assert.match(rules, /semantic intent drives the target spec/);
		assert.match(rules, /use ascet_search when the exact target is not known/);
		assert.match(rules, /validate existing candidates with ascet_read.read_element/);
		assert.match(rules, /do not copy a sibling's values without semantic equivalence/);
		assert.match(rules, /Provider Exported Parameter creation.*decision groups/);
		assert.match(rules, /Local Dependent Parameter creation.*decision groups/);
		assert.match(rules, /Imported Parameters are the exception/);
		assert.match(rules, /limitAssignments=null/);
	});

	test("publishes stable action fingerprints and classifies breaking schema drift", () => {
		const snapshot = createActionCatalogSnapshot();
		assert.equal(snapshot.version, 1);
		assert.ok(snapshot.catalogFingerprint.length > 0);
		assert.ok(snapshot.actions.every((action) => action.schemaFingerprint.length > 0));
		assert.deepEqual(diffActionCatalogSnapshots(snapshot, snapshot), {
			catalogDrift: false,
			breakingSchemaChange: false,
			changes: [],
		});

		const removed = { ...snapshot, actions: snapshot.actions.slice(1) };
		const diff = diffActionCatalogSnapshots(snapshot, removed);
		assert.equal(diff.breakingSchemaChange, true);
		assert.equal(diff.changes[0]?.classification, "removed");
	});

	test("classifies an optional field addition within an existing variant as non-breaking", () => {
		const snapshot = createActionCatalogSnapshot();
		const before = snapshot.actions.find((action) => action.id === "ascet_edit.apply_element_spec");
		assert.ok(before?.schema.variants?.length);
		const variants = before.schema.variants.map((variant, index) =>
			index === 0 ? { ...variant, optional: [...variant.optional, "newOptionalField"] } : variant,
		);
		const changed = {
			...snapshot,
			actions: snapshot.actions.map((action) =>
				action.id === before.id
					? { ...action, schemaFingerprint: "changed", schema: { ...action.schema, variants } }
					: action,
			),
		};
		const diff = diffActionCatalogSnapshots(snapshot, changed);
		const change = diff.changes.find((entry) => entry.id === before.id);
		assert.equal(change?.breaking, false);
		assert.deepEqual(change?.reasons, []);
	});

	test("classifies result shape and field removals as breaking", () => {
		const snapshot = createActionCatalogSnapshot();
		const before = snapshot.actions.find((action) => action.id === "ascet_get.tree");
		assert.ok(before);
		const changed = {
			...snapshot,
			actions: snapshot.actions.map((action) =>
				action.id === before.id
					? {
							...action,
							resultFingerprint: "changed",
							supportedObjectKinds: ["database"],
							result: { shape: `${action.result.shape}V2`, fields: action.result.fields.slice(1) },
						}
					: action,
			),
		};
		const diff = diffActionCatalogSnapshots(snapshot, changed);
		assert.equal(diff.breakingSchemaChange, true);
		assert.match(diff.changes[0]?.reasons.join(",") ?? "", /object_kind_removed/);
		assert.match(diff.changes[0]?.reasons.join(",") ?? "", /result_shape_changed/);
		assert.match(diff.changes[0]?.reasons.join(",") ?? "", /result_field_removed/);
	});
});
