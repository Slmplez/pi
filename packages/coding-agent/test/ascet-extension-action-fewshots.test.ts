import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { listAscetRoutes } from "../../ascet-extension/src/routing/router.ts";
import {
	type AscetActionExample,
	ascetActionExamples,
	compactExamplesForTool,
} from "../../ascet-extension/src/tools/_shared/action-examples.ts";
import { ascetBatchWriteParameters } from "../../ascet-extension/src/tools/batch-write/schema.ts";
import { ascetCapabilitiesParameters } from "../../ascet-extension/src/tools/capabilities/schema.ts";
import { ascetDiffParameters } from "../../ascet-extension/src/tools/diff/schema.ts";
import { ascetExploreParameters } from "../../ascet-extension/src/tools/explore/schema.ts";
import { ascetReadParameters } from "../../ascet-extension/src/tools/read/schema.ts";
import { ascetRecoverParameters } from "../../ascet-extension/src/tools/recover/schema.ts";
import { ascetReferenceParameters } from "../../ascet-extension/src/tools/reference/schema.ts";
import { canonicalAscetToolNames } from "../../ascet-extension/src/tools/registry.ts";
import { ascetSchedulerStatusParameters } from "../../ascet-extension/src/tools/scheduler-status/schema.ts";
import { ascetSearchParameters } from "../../ascet-extension/src/tools/search/schema.ts";
import { ascetStatusParameters } from "../../ascet-extension/src/tools/status/schema.ts";
import { ascetVerifyParameters } from "../../ascet-extension/src/tools/verify/schema.ts";
import { ascetWriteParameters } from "../../ascet-extension/src/tools/write/schema.ts";

const schemaByTool = {
	ascet_status: ascetStatusParameters,
	ascet_capabilities: ascetCapabilitiesParameters,
	ascet_recover: ascetRecoverParameters,
	ascet_scheduler_status: ascetSchedulerStatusParameters,
	ascet_explore: ascetExploreParameters,
	ascet_search: ascetSearchParameters,
	ascet_read: ascetReadParameters,
	ascet_reference: ascetReferenceParameters,
	ascet_diff: ascetDiffParameters,
	ascet_write: ascetWriteParameters,
	ascet_batch_write: ascetBatchWriteParameters,
	ascet_verify: ascetVerifyParameters,
} as const;

function stringLiterals(schema: unknown): string[] {
	const node = schema as { const?: unknown; anyOf?: unknown[] } | undefined;
	if (!node) {
		return [];
	}
	if (typeof node.const === "string") {
		return [node.const];
	}
	if (Array.isArray(node.anyOf)) {
		return node.anyOf.flatMap(stringLiterals);
	}
	return [];
}

function exampleKey(example: Pick<AscetActionExample, "tool" | "action" | "variant">): string {
	return example.variant
		? `${example.tool}.${example.action}.${example.variant}`
		: `${example.tool}.${example.action}`;
}

function expectedExampleKeys(): Set<string> {
	const expected = new Set<string>();
	for (const route of listAscetRoutes()) {
		expected.add(`${route.toolName}.${route.action}`);
	}
	for (const tool of canonicalAscetToolNames) {
		const schema = schemaByTool[tool] as {
			properties?: {
				action?: unknown;
				operation?: unknown;
			};
		};
		for (const action of stringLiterals(schema.properties?.action)) {
			expected.add(`${tool}.${action}`);
		}
		if (tool === "ascet_batch_write") {
			for (const operation of stringLiterals(schema.properties?.operation)) {
				expected.add(`${tool}.${operation}`);
			}
		}
	}
	expected.delete("ascet_write.set_module_code");
	expected.delete("ascet_write.set_state_machine_code");
	for (const operation of ["set-method", "set-header", "set-external-c-code"]) {
		expected.add(`ascet_write.set_module_code.${operation}`);
	}
	for (const operation of stringLiterals(
		(ascetWriteParameters as { properties: { operation: unknown } }).properties.operation,
	).filter((operation) => !["set-header", "set-external-c-code"].includes(operation))) {
		expected.add(`ascet_write.set_state_machine_code.${operation}`);
	}
	return expected;
}

describe("ASCET action few-shot examples", () => {
	it("covers every model-facing action and operation variant exactly once", () => {
		const expected = expectedExampleKeys();
		const actual = new Set(ascetActionExamples.map(exampleKey));

		expect(actual).toEqual(expected);
		expect(ascetActionExamples).toHaveLength(expected.size);
		expect(actual.has("ascet_write.set_class_method_code")).toBe(false);
	});

	it("keeps every example schema-valid and compact", () => {
		const seen = new Set<string>();
		for (const example of ascetActionExamples) {
			const key = exampleKey(example);
			expect(canonicalAscetToolNames, key).toContain(example.tool as (typeof canonicalAscetToolNames)[number]);
			expect(seen.has(key), key).toBe(false);
			seen.add(key);
			expect(example.intent.trim(), key).toBe(example.intent);
			expect(example.intent.length, key).toBeGreaterThan(0);
			expect(example.intent.length, key).toBeLessThanOrEqual(36);
			expect(example.call.length, key).toBeLessThanOrEqual(160);
			expect(example.call, key).not.toContain("\n");
			expect(example.call, key).toContain(`${example.tool}(`);
			const schema = schemaByTool[example.tool as keyof typeof schemaByTool];
			expect(Value.Check(schema, example.args), key).toBe(true);
			if (example.tool !== "ascet_status" && example.tool !== "ascet_capabilities") {
				if (example.tool === "ascet_batch_write") {
					expect((example.args as { operation?: string }).operation, key).toBe(example.action);
				} else {
					expect((example.args as { action?: string }).action, key).toBe(example.action);
				}
			}
		}
	});

	it("formats examples for prompt injection within budget", () => {
		const allGuidelines = canonicalAscetToolNames.flatMap((tool) => compactExamplesForTool(tool));
		const totalCharacters = allGuidelines.reduce((sum, guideline) => sum + guideline.length + 1, 0);

		expect(allGuidelines).toHaveLength(expectedExampleKeys().size);
		expect(totalCharacters).toBeLessThanOrEqual(11_000);
		for (const guideline of allGuidelines) {
			expect(guideline.length, guideline).toBeLessThanOrEqual(180);
		}
	});

	it("does not expose the redundant class-specific method body write action", () => {
		expect(Value.Check(ascetWriteParameters, { action: "set_class_method_code", classPath: "DEMO\\PID" })).toBe(
			false,
		);
		expect(compactExamplesForTool("ascet_write").join("\n")).not.toContain("set_class_method_code");
	});

	it("does not expose hidden requirements-tool examples", () => {
		expect(canonicalAscetToolNames).not.toContain("ascet_requirements");
		expect(ascetActionExamples.some((example) => example.tool === "ascet_requirements")).toBe(false);
		expect(compactExamplesForTool("ascet_requirements")).toEqual([]);
	});

	it("does not teach class create_method examples with non-abstract method kinds", () => {
		const classCreateMethodExamples = ascetActionExamples.filter((example) => {
			const args = example.args as { action?: string; componentKind?: string; componentPath?: string };
			return (
				example.tool === "ascet_write" &&
				example.action === "create_method" &&
				args.action === "create_method" &&
				(args.componentKind === "class" || args.componentPath === "DEMO\\PID")
			);
		});

		expect(classCreateMethodExamples.length).toBeGreaterThan(0);
		for (const example of classCreateMethodExamples) {
			expect((example.args as { methodKind?: string }).methodKind, example.call).toBe("abstract");
		}
	});
});
