import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import type { AscetEditParams, AscetEditResult } from "./edit/service.ts";
import { runAscetSetDependentChain } from "./set-dependent-chain.ts";

function execution(request: AscetCliRequest, result: Record<string, unknown>): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result, error: null }),
		stderr: "",
		timedOut: false,
		request,
	};
}

function identity(request: AscetCliRequest): AscetCliExecutionResult {
	return execution(request, { items: [], database: { name: "DB", path: "C:\\Repo\\DB" } });
}

function chain(request: AscetCliRequest, complete: boolean): AscetCliExecutionResult {
	return execution(request, {
		component: "FeatureA\\Consumer",
		exporter: complete ? "FeatureA\\Provider" : undefined,
		dependent: {
			name: "C_Threshold",
			kind: "parameter",
			scope: "local",
			dependency: complete ? "dependent" : "independent",
		},
		dependencyFormula: complete
			? {
					exists: true,
					code: "P_Threshold",
					mappings: [{ formal: "P_Threshold", imported: "P_Threshold", importedScope: "imported" }],
				}
			: { exists: false, mappings: [] },
		inputs: complete
			? [
					{
						variant: "default",
						value: { name: "P_Threshold", scope: "imported", kind: "parameter", type: "ScalarElement" },
						export: {
							exists: true,
							name: "P_Threshold",
							scope: "exported",
							owner: "FeatureA\\Provider",
						},
					},
				]
			: [],
		complete,
		issues: complete ? [] : ["dependency_not_configured"],
	});
}

function element(request: AscetCliRequest): AscetCliExecutionResult {
	const componentPath = request.args[2];
	const elementName = request.args[1] === "read_element_catalog" ? undefined : request.args[3];
	if (componentPath === "FeatureA\\Provider") {
		return execution(request, {
			elements: [{ name: "P_Threshold", kind: "parameter", scope: "exported", modelType: "cont" }],
		});
	}
	return execution(request, {
		elements: [
			{ name: "C_Threshold", kind: "parameter", scope: "local", modelType: "cont" },
			{ name: "P_Threshold", kind: "parameter", scope: "imported", modelType: "cont" },
		].filter((entry) => elementName === undefined || entry.name === elementName),
	});
}

function preflightResult(): AscetEditResult {
	return {
		content: [{ type: "text", text: "{}" }],
		details: {
			outcome: {
				status: "preflight",
				plan: { action: "set_element_dependency" },
				nextStep: "Preview complete. No ASCET mutation was performed.",
			},
		},
	};
}

describe("set_dependent_chain", () => {
	test("rejects selected variant binding without variants before any ASCET call", async () => {
		let calls = 0;
		const result = await runAscetSetDependentChain(
			{
				action: "set_dependent_chain",
				componentPath: "FeatureA\\Consumer",
				dependentElement: "C_Threshold",
				binding: {
					importedElement: "P_Threshold",
					formula: "P_Threshold",
					formal: "P_Threshold",
					variantPolicy: "selected",
				},
				intent: "preview",
			},
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					calls++;
					return identity(request);
				},
			},
			{ cwd: process.cwd() },
		);
		assert.equal(calls, 0);
		assert.deepEqual(result.content, {
			changed: false,
			error: { code: "binding_invalid", message: 'binding.variants is required when variantPolicy="selected".' },
		});
	});

	test("maps one explicit binding to the existing set_element_dependency preview", async () => {
		let captured: AscetEditParams | undefined;
		const executeCli = async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
			if (request.args[1] === "get_database_identity") return identity(request);
			if (request.args[1] === "read_dependent_chain") return chain(request, false);
			if (request.args[1] === "read_element_catalog") return element(request);
			throw new Error(`Unexpected call: ${request.args.join(" ")}`);
		};
		const result = await runAscetSetDependentChain(
			{
				action: "set_dependent_chain",
				componentPath: "FeatureA\\Consumer",
				dependentElement: "C_Threshold",
				exporterComponentPath: "FeatureA\\Provider",
				exportedElement: "P_Threshold",
				binding: {
					importedElement: "P_Threshold",
					formula: "P_Threshold",
					formal: "P_Threshold",
					variantPolicy: "default",
				},
				intent: "preview",
			},
			{ cwd: process.cwd(), executeCli },
			{ cwd: process.cwd() },
			async (params) => {
				captured = params as AscetEditParams;
				return preflightResult();
			},
		);
		assert.deepEqual(captured, {
			action: "set_element_dependency",
			targetPath: "FeatureA\\Consumer",
			elementName: "C_Threshold",
			dependency: "dependent",
			dependencyFormula: "P_Threshold",
			bindingPolicy: "explicit",
			dependencyMappings: { P_Threshold: { kind: "parameter", name: "P_Threshold" } },
			variantPolicy: "default",
			intent: "preview",
		});
		assert.deepEqual(result.content, {
			changed: false,
			preview: {
				local: "FeatureA\\Consumer\\C_Threshold",
				imported: "FeatureA\\Consumer\\P_Threshold",
				exported: "FeatureA\\Provider\\P_Threshold",
			},
		});
	});

	test("returns changed false without writing when the exact chain already exists", async () => {
		let editCalls = 0;
		const result = await runAscetSetDependentChain(
			{
				action: "set_dependent_chain",
				componentPath: "FeatureA\\Consumer",
				dependentElement: "C_Threshold",
				exporterComponentPath: "FeatureA\\Provider",
				exportedElement: "P_Threshold",
				intent: "apply",
			},
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					if (request.args[1] === "get_database_identity") return identity(request);
					if (request.args[1] === "read_dependent_chain") return chain(request, true);
					if (request.args[1] === "read_element_catalog") return element(request);
					throw new Error(`Unexpected call: ${request.args.join(" ")}`);
				},
			},
			{ cwd: process.cwd() },
			async () => {
				editCalls++;
				return preflightResult();
			},
		);
		assert.equal(editCalls, 0);
		assert.equal(result.content.changed, false);
		assert.deepEqual((result.content.chain as { exported?: unknown }).exported, {
			componentPath: "FeatureA\\Provider",
			element: "P_Threshold",
		});
	});
});
