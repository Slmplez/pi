import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Value } from "typebox/value";
import { ascetVerifyParameters } from "./verify.ts";

describe("ascet_verify schema", () => {
	test("requires a componentPath for component readback", () => {
		assert.equal(
			Value.Check(ascetVerifyParameters, {
				action: "readback",
				objectKind: "class",
				componentPath: "Demo\\Controller",
			}),
			true,
		);
		assert.equal(
			Value.Check(ascetVerifyParameters, {
				action: "readback",
				objectKind: "class",
				projectPath: "Demo\\Project",
			}),
			false,
		);
	});

	test("requires a projectPath for project readback", () => {
		assert.equal(
			Value.Check(ascetVerifyParameters, {
				action: "readback",
				objectKind: "project",
				projectPath: "Demo\\Project",
			}),
			true,
		);
		assert.equal(
			Value.Check(ascetVerifyParameters, {
				action: "readback",
				objectKind: "project",
				componentPath: "Demo\\Controller",
			}),
			false,
		);
	});

	test("rejects missing and ambiguous readback targets", () => {
		assert.equal(
			Value.Check(ascetVerifyParameters, {
				action: "readback",
				objectKind: "class",
			}),
			false,
		);
		assert.equal(
			Value.Check(ascetVerifyParameters, {
				action: "readback",
				objectKind: "project",
				componentPath: "Demo\\Controller",
				projectPath: "Demo\\Project",
			}),
			false,
		);
	});
});
