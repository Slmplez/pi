import assert from "node:assert/strict";
import { test } from "node:test";
import { ascetEditParameters } from "../edit/schema.ts";
import { createInvalidParametersToolResult } from "./validation.ts";

interface ValidationPayload {
	error?: {
		code?: string;
		details?: {
			action?: string;
			field?: string;
			variant?: string;
			expected?: string[];
			errors?: Array<{ message?: string; path?: string }>;
		};
	};
}

function validate(params: unknown): ValidationPayload {
	const result = createInvalidParametersToolResult("ascet_edit", ascetEditParameters, params);
	assert.ok(result);
	return JSON.parse(result.content[0]?.text ?? "{}") as ValidationPayload;
}

test("returns unknown_action without unrelated union errors", () => {
	const payload = validate({ action: "does_not_exist" });
	assert.equal(payload.error?.code, "unknown_action");
	assert.equal(payload.error?.details?.action, "does_not_exist");
	assert.equal(payload.error?.details?.errors, undefined);
});

test("returns invalid_variant for an unsupported selected-action phase", () => {
	const payload = validate({ action: "set_element_dependency", phase: "execute" });
	assert.equal(payload.error?.code, "invalid_variant");
	assert.equal(payload.error?.details?.action, "set_element_dependency");
	assert.equal(payload.error?.details?.field, "phase");
	assert.deepEqual(payload.error?.details?.expected, ["commit", "plan"]);
});

test("selects apply_element_spec intent before reporting field errors", () => {
	const payload = validate({
		action: "apply_element_spec",
		phase: "plan",
		intent: "create",
		componentPath: "DEMOConsumer",
		elements: [],
		folderPath: "DEMOUnexpected",
	});
	assert.equal(payload.error?.code, "ascet_invalid_parameters");
	assert.match(payload.error?.details?.variant ?? "", /intent=create/);
	const errors = payload.error?.details?.errors ?? [];
	assert.ok(errors.length > 0);
	assert.equal(
		errors.some((error) => error.message?.includes("planId")),
		false,
	);
	assert.equal(
		errors.some((error) => error.message?.includes("methodName")),
		false,
	);
});

test("selects mode variants without leaking mutation errors", () => {
	const payload = validate({ mode: "set", componentPath: "DEMOConsumer", folderPath: "DEMOUnexpected" });
	assert.equal(payload.error?.code, "ascet_invalid_parameters");
	const errors = payload.error?.details?.errors ?? [];
	assert.ok(errors.length > 0);
	assert.equal(
		errors.some((error) => error.message?.includes("elementName")),
		false,
	);
	assert.equal(
		errors.some((error) => error.message?.includes("methodName")),
		false,
	);
});
