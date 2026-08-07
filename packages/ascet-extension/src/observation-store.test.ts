import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import {
	AscetObservationStore,
	DEFAULT_ASCET_OUTPUT_THRESHOLD_BYTES,
	getAscetArtifactRoot,
	getAscetOutputThresholdBytes,
} from "./observation-store.ts";

function createRoot(): string {
	return mkdtempSync(join(tmpdir(), "pi-ascet-observation-"));
}

function withEnvironment<T>(values: Record<string, string | undefined>, callback: () => T): T {
	const previous = new Map<string, string | undefined>();
	for (const [key, value] of Object.entries(values)) {
		previous.set(key, process.env[key]);
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
	try {
		return callback();
	} finally {
		for (const [key, value] of previous) {
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
	}
}

describe("AscetObservationStore", () => {
	test("reuses the artifact root and output threshold environment settings", () => {
		const root = createRoot();
		try {
			withEnvironment(
				{
					PI_ASCET_EXTENSION_ARTIFACT_ROOT: root,
					PI_ASCET_EXTENSION_OUTPUT_THRESHOLD_BYTES: "128",
				},
				() => {
					assert.equal(getAscetArtifactRoot(), root);
					assert.equal(getAscetOutputThresholdBytes(), 128);
					assert.equal(
						getAscetOutputThresholdBytes({ PI_ASCET_EXTENSION_OUTPUT_THRESHOLD_BYTES: "0" }),
						DEFAULT_ASCET_OUTPUT_THRESHOLD_BYTES,
					);
				},
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("keeps small results inline and stores large results as NDJSON plus metadata", () => {
		const root = createRoot();
		try {
			const store = new AscetObservationStore({
				root,
				thresholdBytes: 128,
				generateResultId: () => "obs-formulas-1",
			});
			const inline = store.create({
				domain: "elements",
				target: { componentOid: "component-1", componentPath: "Demo\\Controller" },
				items: [{ path: "Demo\\Controller::small", oid: "component-1", scope: "local" }],
				coverage: { status: "complete_for_scope" },
			});
			assert.equal(inline.delivery, "inline");
			assert.equal(readdirSync(root).length, 0);

			const stored = store.create({
				domain: "formulas",
				target: { projectOid: "project-1", projectPath: "Demo\\Project" },
				items: [
					{
						path: "Demo\\Project::FormulaA",
						name: "FormulaA",
						contents: "line 1\nline 2",
					},
					{ path: "Demo\\Project::FormulaB", contents: "x * 2" },
				],
				coverage: { status: "complete_for_scope" },
				capturedAt: "2026-08-07T12:00:00.000Z",
			});
			assert.equal(stored.delivery, "stored");
			const metadata = stored.observation.metadata;
			assert.equal(metadata.resultId, "obs-formulas-1");
			assert.equal(metadata.domain, "formulas");
			assert.deepEqual(metadata.target, { projectOid: "project-1", projectPath: "Demo\\Project" });
			assert.equal(metadata.itemCount, 2);
			assert.deepEqual(metadata.coverage, { status: "complete_for_scope" });
			assert.equal(metadata.source, "live");
			assert.equal(metadata.capturedAt, "2026-08-07T12:00:00.000Z");

			const dataLines = readFileSync(stored.observation.dataPath, "utf8").trimEnd().split("\n");
			assert.equal(dataLines.length, 2);
			assert.deepEqual(JSON.parse(dataLines[0] ?? ""), {
				path: "Demo\\Project::FormulaA",
				name: "FormulaA",
				contents: "line 1\nline 2",
			});
			assert.deepEqual(JSON.parse(readFileSync(stored.observation.metaPath, "utf8")), metadata);
			assert.deepEqual(readdirSync(root).sort(), ["obs-formulas-1.formulas.ndjson", "obs-formulas-1.meta.json"]);
			assert.equal(
				readdirSync(root).some((file) => file.includes(".tmp-")),
				false,
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("supports explicit delivery overrides at the threshold boundary", () => {
		const root = createRoot();
		try {
			const store = new AscetObservationStore({ root, thresholdBytes: 1, generateResultId: () => "boundary" });
			const forcedInline = store.create({
				domain: "tree",
				target: { path: "Demo" },
				items: [{ path: "Demo\\Component", kind: "component" }],
				coverage: { status: "complete_for_scope" },
				delivery: "inline",
			});
			assert.equal(forcedInline.delivery, "inline");
			assert.equal(existsSync(join(root, "boundary.meta.json")), false);

			const forcedStored = store.create({
				domain: "tree",
				target: { path: "Demo" },
				items: [],
				coverage: { status: "complete_for_scope" },
				delivery: "stored",
			});
			assert.equal(forcedStored.delivery, "stored");
			assert.equal(existsSync(forcedStored.observation.metaPath), true);
			assert.equal(existsSync(forcedStored.observation.dataPath), true);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("invalidates matching component and project observations without touching others", () => {
		const root = createRoot();
		try {
			let counter = 0;
			const store = new AscetObservationStore({
				root,
				thresholdBytes: 1,
				generateResultId: () => `result-${String(++counter)}`,
			});
			const componentObservation = store.create({
				domain: "elements",
				target: { componentOid: "component-1", componentPath: "Demo\\Controller" },
				items: [{ name: "limit" }],
				coverage: { status: "complete_for_scope" },
				delivery: "stored",
			});
			const childObservation = store.create({
				domain: "refs",
				target: { componentPath: "Demo\\Controller\\Nested" },
				items: [{ target: "other" }],
				coverage: { status: "partial" },
				delivery: "stored",
			});
			const otherObservation = store.create({
				domain: "formulas",
				target: { projectOid: "project-2", projectPath: "Other" },
				items: [{ name: "formula" }],
				coverage: { status: "complete_for_scope" },
				delivery: "stored",
			});
			if (
				componentObservation.delivery !== "stored" ||
				childObservation.delivery !== "stored" ||
				otherObservation.delivery !== "stored"
			) {
				throw new Error("Expected stored observations.");
			}
			const componentPaths = componentObservation.observation;
			const childPaths = childObservation.observation;
			const otherPaths = otherObservation.observation;

			assert.deepEqual(store.invalidate({ componentOid: "component-1" }).sort(), ["result-1"]);
			assert.equal(existsSync(componentPaths.metaPath), false);
			assert.equal(existsSync(componentPaths.dataPath), false);
			assert.equal(existsSync(childPaths.metaPath), true);

			assert.deepEqual(store.invalidate({ componentPath: "demo/controller" }).sort(), ["result-2"]);
			assert.equal(existsSync(childPaths.metaPath), false);
			assert.deepEqual(store.invalidate({ projectPath: "Other" }), ["result-3"]);
			assert.equal(existsSync(otherPaths.metaPath), false);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
