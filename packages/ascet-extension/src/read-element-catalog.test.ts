import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	buildReadElementCatalogArgs,
	extractElementCatalogItems,
	findCatalogElement,
	toElementDeclarationEntry,
} from "./read-element-catalog.ts";
import type { AscetComponentSearchIndexEntry } from "./search-index.ts";

describe("ASCET read element catalog wrapper", () => {
	test("builds read_element_catalog args", () => {
		assert.deepEqual(buildReadElementCatalogArgs({ componentPath: "A/B" }), [
			"exec",
			"read_element_catalog",
			"A\\B",
			"--json",
		]);
	});

	test("extracts catalog items from direct and enveloped payloads", () => {
		const direct = { elements: [{ name: "K", kind: "parameter" }] };
		const enveloped = { ok: true, result: direct };

		assert.deepEqual(extractElementCatalogItems(direct), [{ name: "K", kind: "parameter" }]);
		assert.deepEqual(extractElementCatalogItems(enveloped), [{ name: "K", kind: "parameter" }]);
	});

	test("selects an exact exported catalog element", () => {
		const selection = findCatalogElement(
			{
				elements: [
					{ name: "K", kind: "parameter", scope: "Local" },
					{ name: "K", kind: "parameter", scope: "Exported", modelType: "cont" },
				],
			},
			{ name: "K", scope: "Exported" },
		);

		assert.equal(selection.status, "found");
		assert.equal(selection.element?.scope, "Exported");
	});

	test("reports ambiguity when same-name elements match without scope", () => {
		const selection = findCatalogElement(
			{
				elements: [
					{ name: "K", kind: "parameter", scope: "Local" },
					{ name: "K", kind: "parameter", scope: "Exported" },
				],
			},
			{ name: "K" },
		);

		assert.equal(selection.status, "ambiguous");
		assert.equal(selection.candidates.length, 2);
	});

	test("converts catalog element to declaration entry", () => {
		const component: AscetComponentSearchIndexEntry = {
			path: "A\\Provider",
			name: "Provider",
			kind: "class",
			languageKind: "ESDL",
			displayName: "Provider",
			parentPath: "A",
			ownerKind: "folder",
			targetKind: "component",
			objectKind: "class",
		};

		const entry = toElementDeclarationEntry(
			"A/Provider",
			{
				name: "K",
				kind: "parameter",
				modelType: "cont",
				scope: "Exported",
			},
			component,
		);

		assert.deepEqual(entry, {
			group: "primitive",
			componentPath: "A/Provider",
			componentKind: "class",
			componentLanguageKind: "ESDL",
			elementName: "K",
			elementKind: "parameter",
			displayType: "cont",
			displayScope: "Exported",
			referencedComponentPath: "",
			path: "A/Provider/K",
		});
	});
});
