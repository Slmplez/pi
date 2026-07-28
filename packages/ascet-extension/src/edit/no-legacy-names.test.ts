import assert from "node:assert/strict";
import { test } from "node:test";
import { routeAscetAction } from "../routing/router.ts";
import { getActionDescriptor, listActionDescriptors } from "../tools/actions/descriptors.ts";
import { allAscetToolNameSet } from "../tools/registry.ts";

test("the public edit surface has no old tool registrations, descriptors, or routes", () => {
	assert.equal(allAscetToolNameSet.has("ascet_edit"), true);
	assert.equal(allAscetToolNameSet.has("ascet_write"), false);
	assert.equal(allAscetToolNameSet.has("ascet_component_editable"), false);
	assert.equal(getActionDescriptor("ascet_write", "create_folder"), undefined);
	assert.equal(getActionDescriptor("ascet_component_editable", "check"), undefined);
	assert.throws(() => routeAscetAction({ toolName: "ascet_write", action: "create_folder" }));
	assert.throws(() => routeAscetAction({ toolName: "ascet_component_editable", action: "check" }));

	const actionIds = listActionDescriptors()
		.filter((descriptor) => descriptor.tool === "ascet_edit")
		.map((descriptor) => descriptor.action);
	assert.equal(new Set(actionIds).size, actionIds.length);
});
