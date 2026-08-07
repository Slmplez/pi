import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { AscetObservationStore } from "../observation-store.ts";
import { appendVerifyAndJson, invalidateAscetEditObservations } from "./common.ts";

describe("ASCET edit observation lifecycle", () => {
	test("keeps verification flags and invalidates matching component observations", () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-common-"));
		try {
			const store = new AscetObservationStore({ root, thresholdBytes: 1, generateResultId: () => "obs-component" });
			store.create({
				domain: "elements",
				target: { path: "DEMO\\E" },
				items: [{ name: "P" }],
				coverage: { status: "complete_for_scope" },
				delivery: "stored",
			});

			assert.deepEqual(appendVerifyAndJson(["exec", "set_enumerators", "DEMO/E"], true), [
				"exec",
				"set_enumerators",
				"DEMO/E",
				"--verify-readback",
				"--json",
			]);
			assert.deepEqual(
				invalidateAscetEditObservations(
					{ action: "set_enumerators", componentPath: "DEMO/E" },
					{ env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: root } },
				),
				{ invalidated: ["obs-component"] },
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
