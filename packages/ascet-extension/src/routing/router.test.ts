import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { listActionDescriptors } from "../tools/actions/descriptors.ts";
import { routeAscetAction } from "./router.ts";

describe("ASCET route manifest", () => {
	test("routes every public action descriptor", () => {
		for (const descriptor of listActionDescriptors()) {
			if (descriptor.visibility !== "public") {
				continue;
			}
			assert.doesNotThrow(
				() => routeAscetAction({ toolName: descriptor.tool, action: descriptor.action }),
				`${descriptor.id} must have a route manifest entry`,
			);
		}
	});
});
