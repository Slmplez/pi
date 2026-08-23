import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildAscetCodingPolicyPrompt } from "../ascet-coding-policy.ts";
import { getActionDescriptor } from "../tools/actions/descriptors.ts";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const skillPath = join(packageRoot, "skills", "ascet-engineering", "SKILL.md");

function rulesFor(tool: string, action: string): string {
	const descriptor = getActionDescriptor(tool, action);
	assert.ok(descriptor, `${tool}.${action}`);
	return descriptor.prompt?.rules?.join("\n") ?? "";
}

describe("ASCET editable write-gate policy", () => {
	test("uses apply-only mutation guidance and delegates authorization to the runtime same-session gate", () => {
		const policy = buildAscetCodingPolicyPrompt();
		assert.match(policy, /Use ascet_read or ascet_diff for independent inspection/u);
		assert.match(policy, /fresh same-session editable=true check immediately before each real mutation/u);
		assert.match(policy, /do not call mode=check merely to authorize a write/u);
		assert.match(policy, /mode=set without explicit user intent/u);

		const ordinaryWriteRules = rulesFor("ascet_edit", "set_method_code");
		assert.match(ordinaryWriteRules, /Mutation actions execute only with intent=apply/u);
		assert.match(ordinaryWriteRules, /fresh same-session editable=true check immediately before each real mutation/u);
		assert.match(ordinaryWriteRules, /Do not call mode=check merely to authorize a write/u);
		assert.match(ordinaryWriteRules, /never call mode=set without explicit user intent/u);
	});

	test("treats check as observation, set as explicit intent, and dependency writes as one verified call", () => {
		assert.match(rulesFor("ascet_edit", "check"), /write authorization is enforced independently/u);
		assert.match(rulesFor("ascet_edit", "set"), /only when the user intends to make the component editable/u);

		const chainRules = rulesFor("ascet_edit", "create_dependent_chain");
		assert.match(chainRules, /provider\.componentPath is required/u);
		assert.match(chainRules, /fresh same-session editable=true check immediately before each real mutation/u);
		assert.match(chainRules, /automatic full readback/u);

		const skill = readFileSync(skillPath, "utf8");
		assert.match(skill, /Use `intent=apply` for every mutation/u);
		assert.match(skill, /Use `intent=apply` for every mutation/u);
		assert.match(skill, /Do not call `mode=check` merely to authorize a write/u);
		assert.match(skill, /Do not issue a separate `mode=set` as part of an ordinary write flow/u);
	});
});
