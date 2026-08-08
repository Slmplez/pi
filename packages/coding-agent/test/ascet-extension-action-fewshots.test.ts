import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { configureParameterDependencyChainParameters } from "../../ascet-extension/src/configure-parameter-dependency-chain.ts";
import { ascetGetParameters } from "../../ascet-extension/src/get.ts";
import {
	type AscetActionExample,
	ascetActionExamples,
	compactExamplesForTool,
} from "../../ascet-extension/src/tools/_shared/action-examples.ts";
import { listActionDescriptors } from "../../ascet-extension/src/tools/actions/descriptors.ts";
import { ascetBatchWriteParameters } from "../../ascet-extension/src/tools/batch-write/schema.ts";
import { ascetCapabilitiesParameters } from "../../ascet-extension/src/tools/capabilities/schema.ts";
import { ascetDiffParameters } from "../../ascet-extension/src/tools/diff/schema.ts";
import { ascetEditParameters } from "../../ascet-extension/src/tools/edit/schema.ts";
import { ascetReadParameters } from "../../ascet-extension/src/tools/read/schema.ts";
import { ascetRecoverParameters } from "../../ascet-extension/src/tools/recover/schema.ts";
import { allAscetToolNames, canonicalAscetToolNames } from "../../ascet-extension/src/tools/registry.ts";
import { ascetSchedulerStatusParameters } from "../../ascet-extension/src/tools/scheduler-status/schema.ts";
import { ascetStatusParameters } from "../../ascet-extension/src/tools/status/schema.ts";
import { ascetVerifyParameters } from "../../ascet-extension/src/tools/verify/schema.ts";

const schemaByTool = {
	ascet_status: ascetStatusParameters,
	ascet_capabilities: ascetCapabilitiesParameters,
	ascet_recover: ascetRecoverParameters,
	ascet_scheduler_status: ascetSchedulerStatusParameters,
	ascet_get: ascetGetParameters,
	ascet_read: ascetReadParameters,
	ascet_diff: ascetDiffParameters,
	ascet_edit: ascetEditParameters,
	ascet_batch_write: ascetBatchWriteParameters,
	ascet_verify: ascetVerifyParameters,
	configure_parameter_dependency_chain: configureParameterDependencyChainParameters,
} as const;

function stringLiterals(schema: unknown): string[] {
	const node = schema as
		| { const?: unknown; enum?: unknown[]; anyOf?: unknown[]; anyOfReadonly?: unknown[] }
		| undefined;
	if (!node) {
		return [];
	}
	if (typeof node.const === "string") {
		return [node.const];
	}
	if (Array.isArray(node.enum)) {
		return node.enum.filter((item): item is string => typeof item === "string");
	}
	if (Array.isArray(node.anyOf)) {
		return node.anyOf.flatMap(stringLiterals);
	}
	return [];
}

function actionSchemas(
	schema: unknown,
): Array<{ properties?: { action?: unknown; operation?: unknown; mode?: unknown } }> {
	const node = schema as
		| {
				anyOf?: Array<{ properties?: { action?: unknown; operation?: unknown; mode?: unknown } }>;
				properties?: { action?: unknown; operation?: unknown; mode?: unknown };
		  }
		| undefined;
	if (!node) {
		return [];
	}
	if (Array.isArray(node.anyOf)) {
		return node.anyOf;
	}
	return node.properties ? [node] : [];
}

function schemaForAction(
	schema: unknown,
	action: string,
): { properties?: { action?: unknown; operation?: unknown; mode?: unknown } } | undefined {
	return actionSchemas(schema).find((entry) => stringLiterals(entry.properties?.action).includes(action));
}

function exampleKey(example: Pick<AscetActionExample, "tool" | "action" | "variant">): string {
	return example.variant
		? `${example.tool}.${example.action}.${example.variant}`
		: `${example.tool}.${example.action}`;
}

function expectedExampleKeys(): Set<string> {
	const expected = new Set<string>();
	expected.add("ascet_status.status");
	for (const tool of allAscetToolNames) {
		const schemas = actionSchemas(schemaByTool[tool]);
		for (const schema of schemas) {
			const actionDiscriminators = stringLiterals(schema.properties?.action);
			const discriminators =
				actionDiscriminators.length > 0
					? actionDiscriminators
					: [...stringLiterals(schema.properties?.operation), ...stringLiterals(schema.properties?.mode)];
			for (const action of discriminators) {
				expected.add(`${tool}.${action}`);
			}
		}
	}
	expected.delete("ascet_edit.set_module_code");
	expected.delete("ascet_edit.set_state_machine_code");
	for (const operation of ["set-method", "set-header", "set-external-c-code"]) {
		expected.add(`ascet_edit.set_module_code.${operation}`);
	}
	const stateMachineSchema = schemaForAction(ascetEditParameters, "set_state_machine_code");
	for (const operation of stringLiterals(stateMachineSchema?.properties?.operation).filter(
		(operation) => !["set-header", "set-external-c-code"].includes(operation),
	)) {
		expected.add(`ascet_edit.set_state_machine_code.${operation}`);
	}
	return expected;
}

function catalogExampleKeys(options: { publicOnly?: boolean } = {}): Set<string> {
	const keys = new Set<string>();
	for (const descriptor of listActionDescriptors() as Array<{
		id: string;
		tool: string;
		action: string;
		visibility: string;
		prompt?: { fewShots?: Array<{ variant?: string }> };
	}>) {
		if (options.publicOnly && descriptor.visibility !== "public") {
			continue;
		}
		for (const fewShot of descriptor.prompt?.fewShots ?? []) {
			keys.add(fewShot.variant ? `${descriptor.tool}.${descriptor.action}.${fewShot.variant}` : descriptor.id);
		}
	}
	return keys;
}

describe("ASCET action few-shot examples", () => {
	it("stores every action few-shot in the action catalog", () => {
		const expected = expectedExampleKeys();
		const catalogKeys = catalogExampleKeys();
		const projectedKeys = new Set(ascetActionExamples.map(exampleKey));

		expect(catalogKeys).toEqual(expected);
		expect(projectedKeys).toEqual(catalogKeys);
	});

	it("covers every model-facing action and operation variant exactly once", () => {
		const expected = expectedExampleKeys();
		const actual = new Set(ascetActionExamples.map(exampleKey));

		expect(actual).toEqual(expected);
		expect(ascetActionExamples).toHaveLength(expected.size);
		expect(actual.has("ascet_edit.set_class_method_code")).toBe(false);
	});

	it("keeps every example schema-valid and compact", () => {
		const seen = new Set<string>();
		for (const example of ascetActionExamples) {
			const key = exampleKey(example);
			expect(allAscetToolNames, key).toContain(example.tool as (typeof allAscetToolNames)[number]);
			expect(seen.has(key), key).toBe(false);
			seen.add(key);
			expect(example.intent.trim(), key).toBe(example.intent);
			expect(example.intent.length, key).toBeGreaterThan(0);
			expect(example.intent.length, key).toBeLessThanOrEqual(36);
			const maxCallLength =
				example.tool === "configure_parameter_dependency_chain"
					? 1_200
					: example.tool === "ascet_edit" && example.action === "apply_element_spec"
						? 500
						: 160;
			expect(example.call.length, key).toBeLessThanOrEqual(maxCallLength);
			expect(example.call, key).not.toContain("\n");
			expect(example.call, key).toContain(`${example.tool}(`);
			const schema = schemaByTool[example.tool as keyof typeof schemaByTool];
			expect(Value.Check(schema, example.args), key).toBe(true);
			if (example.tool !== "ascet_status" && example.tool !== "ascet_capabilities") {
				if (example.tool === "ascet_batch_write") {
					expect((example.args as { operation?: string }).operation, key).toBe(example.action);
				} else if (example.tool === "configure_parameter_dependency_chain") {
					expect((example.args as { mode?: string }).mode, key).toBe(example.action);
				} else if (
					example.tool === "ascet_edit" &&
					((example.args as { mode?: string }).mode === "check" ||
						(example.args as { mode?: string }).mode === "set")
				) {
					expect((example.args as { mode?: string }).mode, key).toBe(example.action);
				} else {
					expect((example.args as { action?: string }).action, key).toBe(example.action);
				}
			}
		}
	});

	it("formats examples for prompt injection within budget", () => {
		const allGuidelines = canonicalAscetToolNames.flatMap((tool) => compactExamplesForTool(tool));
		const totalCharacters = allGuidelines.reduce((sum, guideline) => sum + guideline.length + 1, 0);

		expect(allGuidelines).toHaveLength(catalogExampleKeys({ publicOnly: true }).size);
		expect(totalCharacters).toBeLessThanOrEqual(11_000);
		for (const guideline of allGuidelines) {
			const maxGuidelineLength = guideline.startsWith("configure_parameter_dependency_chain(")
				? 1_200
				: guideline.startsWith('ascet_edit({action:"apply_element_spec"')
					? 500
					: 180;
			expect(guideline.length, guideline).toBeLessThanOrEqual(maxGuidelineLength);
		}
	});

	it("does not expose the redundant class-specific method body write action", () => {
		expect(Value.Check(ascetEditParameters, { action: "set_class_method_code", classPath: "DEMO\\PID" })).toBe(false);
		expect(compactExamplesForTool("ascet_edit").join("\n")).not.toContain("set_class_method_code");
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
				example.tool === "ascet_edit" &&
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
