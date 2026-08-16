import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getAscetActionContract } from "../tools/actions/contract-registry.ts";
import { listActionDescriptors } from "../tools/actions/descriptors.ts";
import { routeAscetAction } from "./router.ts";

describe("ASCET route manifest", () => {
	test("routes every public Bridge action descriptor", () => {
		for (const descriptor of listActionDescriptors()) {
			if (descriptor.visibility !== "public") {
				continue;
			}
			const contract = getAscetActionContract(descriptor.tool, descriptor.action);
			if (contract && contract.execution.kind !== "bridge") {
				continue;
			}
			assert.doesNotThrow(
				() => routeAscetAction({ toolName: descriptor.tool, action: descriptor.action }),
				`${descriptor.id} must have a route manifest entry`,
			);
		}
	});
});
