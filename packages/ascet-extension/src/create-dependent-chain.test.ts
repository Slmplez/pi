import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { Value } from "typebox/value";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import {
	type AscetCreateDependentChainParams,
	ascetCreateDependentChainActionSchema,
	runAscetCreateDependentChain,
	runLegacyAscetCreateDependentChain,
} from "./create-dependent-chain.ts";
import { createAscetScheduler } from "./scheduler/scheduler.ts";
import { ascetEditParameters } from "./tools/edit/schema.ts";

function request(intent: "preview" | "apply" = "preview"): AscetCreateDependentChainParams {
	return {
		action: "create_dependent_chain",
		provider: {
			componentPath: "FeatureA\\Provider",
			element: {
				name: "P_Threshold",
				modelType: "cont",
				unit: "",
				comment: "Provider",
				calibration: false,
				range: { mode: "none" },
				data: { mode: "ascetDefault" },
				implementation: { mode: "ascetDefault" },
			},
		},
		consumer: {
			componentPath: "FeatureA\\Consumer",
			importedElement: { name: "P_Threshold", modelType: "cont", unit: "" },
			localElement: {
				name: "C_Threshold",
				modelType: "cont",
				unit: "",
				comment: "Dependent",
				calibration: false,
				range: { mode: "none" },
				implementation: { mode: "ascetDefault" },
			},
		},
		binding: { formula: "P_Threshold", formal: "P_Threshold", variantPolicy: "default" },
		intent,
	};
}

function execution(requestValue: AscetCliRequest, result: Record<string, unknown>): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result, error: null }),
		stderr: "",
		timedOut: false,
		request: requestValue,
	};
}

function identity(requestValue: AscetCliRequest): AscetCliExecutionResult {
	return execution(requestValue, {
		items: [],
		database: { name: "DB", path: "C:\\Repo\\DB", identityStatus: "consistent", identityIssues: [] },
	});
}

function previewResult(noOp = false, stateVersion = "before-a", editable = true): Record<string, unknown> {
	return {
		status: "preview",
		writesPerformed: false,
		mutationStarted: false,
		consistency: "compensating",
		beforeState: {
			providerComponentPath: "FeatureA\\Provider",
			consumerComponentPath: "FeatureA\\Consumer",
			provider: { version: stateVersion },
			imported: null,
			local: null,
			dependency: { dependency: "independent", formula: "", mappings: [], variants: [] },
		},
		noOp,
		targets: [
			{ path: "FeatureA\\Provider", oid: "provider-oid", editable },
			{ path: "FeatureA\\Consumer", oid: "consumer-oid", editable },
		],
		stages: noOp
			? [
					{ stage: "provider", status: "verified", readbackVerified: true },
					{ stage: "consumer", status: "verified", readbackVerified: true },
					{ stage: "local", status: "verified", readbackVerified: true },
					{ stage: "dependency", status: "verified", readbackVerified: true },
				]
			: [
					{ stage: "provider", status: "create", readbackVerified: false },
					{ stage: "consumer", status: "create", readbackVerified: false },
					{ stage: "local", status: "create", readbackVerified: false },
					{ stage: "dependency", status: "configure", readbackVerified: false },
				],
		verification: { status: "available", verified: noOp },
		rollback: { required: false, status: "not_required" },
	};
}

function committedResult(): Record<string, unknown> {
	return {
		status: "committed",
		writesPerformed: true,
		mutationStarted: true,
		consistency: "compensating",
		targets: [
			{ path: "FeatureA\\Provider", oid: "provider-oid", editable: true },
			{ path: "FeatureA\\Consumer", oid: "consumer-oid", editable: true },
		],
		stages: [
			{ stage: "provider", status: "created", readbackVerified: true },
			{ stage: "consumer", status: "created", readbackVerified: true },
			{ stage: "local", status: "created", readbackVerified: true },
			{ stage: "dependency", status: "configured", readbackVerified: true },
		],
		verification: { status: "passed", verified: true },
		rollback: { required: false, status: "not_required" },
	};
}

function bridgeRequest(requestValue: AscetCliRequest): Record<string, unknown> {
	return JSON.parse(readFileSync(requestValue.args[2], "utf8")) as Record<string, unknown>;
}

describe("create_dependent_chain public contract", () => {
	test("rejects invalid P_/C_ naming and provider/imported mismatch before approval or Bridge execution", async () => {
		const scenarios: Array<{
			name: string;
			mutate: (params: AscetCreateDependentChainParams) => void;
			errorCode: string;
		}> = [
			{
				name: "provider without P_ prefix",
				mutate: (params) => {
					params.provider.element.name = "Threshold";
				},
				errorCode: "provider_parameter_name_invalid",
			},
			{
				name: "imported without P_ prefix",
				mutate: (params) => {
					params.consumer.importedElement.name = "Threshold";
				},
				errorCode: "imported_parameter_name_invalid",
			},
			{
				name: "exported/imported name mismatch",
				mutate: (params) => {
					params.consumer.importedElement.name = "P_OtherThreshold";
				},
				errorCode: "provider_imported_parameter_name_mismatch",
			},
			{
				name: "local dependent without C_ prefix",
				mutate: (params) => {
					params.consumer.localElement.name = "Threshold";
				},
				errorCode: "local_parameter_name_invalid",
			},
		];
		for (const scenario of scenarios) {
			const params = request("apply");
			scenario.mutate(params);
			let confirmations = 0;
			let bridgeCalls = 0;
			const result = await runAscetCreateDependentChain(
				params,
				{
					cwd: process.cwd(),
					executeCli: async (requestValue) => {
						bridgeCalls++;
						return execution(requestValue, committedResult());
					},
				},
				{
					hasUI: true,
					ui: {
						confirm: async () => {
							confirmations++;
							return true;
						},
					},
				},
			);
			assert.equal(result.details.outcome.status, "error", scenario.name);
			assert.equal(result.details.error?.code, scenario.errorCode, scenario.name);
			assert.equal(confirmations, 0, scenario.name);
			assert.equal(bridgeCalls, 0, scenario.name);
		}
	});
});
describe("legacy create_dependent_chain recovery flow", () => {
	test("exposes only the compact create schema and rejects old set fields", () => {
		assert.equal(Value.Check(ascetCreateDependentChainActionSchema, request()), true);
		assert.equal(Value.Check(ascetEditParameters, request()), true);
		assert.equal(
			Value.Check(ascetEditParameters, {
				action: "set_dependent_chain",
				componentPath: "FeatureA\\Consumer",
				dependentElement: "C_Threshold",
				intent: "preview",
			}),
			false,
		);
		assert.equal(Value.Check(ascetCreateDependentChainActionSchema, { ...request(), formals: ["P"] }), false);
	});

	test("preview performs zero approval and sends only a non-mutating Bridge preview", async () => {
		let confirmations = 0;
		let applyCalls = 0;
		let previewCalls = 0;
		const result = await runLegacyAscetCreateDependentChain(
			request("preview"),
			{
				cwd: process.cwd(),
				executeCli: async (requestValue) => {
					if (requestValue.args[1] === "get_database_identity") return identity(requestValue);
					if (requestValue.args[1] === "configure_parameter_dependency_chain_execute") {
						const body = bridgeRequest(requestValue);
						if (body.intent === "apply") applyCalls++;
						else previewCalls++;
						return execution(requestValue, previewResult());
					}
					throw new Error(`Unexpected call: ${requestValue.args.join(" ")}`);
				},
			},
			{
				hasUI: true,
				ui: {
					confirm: async () => {
						confirmations++;
						return true;
					},
				},
			},
		);
		assert.equal(confirmations, 0);
		assert.equal(previewCalls, 1);
		assert.equal(applyCalls, 0);
		assert.deepEqual(JSON.parse(result.content[0].text), {
			ok: true,
			changed: true,
			effects: {
				create: ["provider", "consumer.imported", "local"],
				configure: ["dependency"],
			},
		});
	});

	test("apply confirms once, revalidates, binds the expected semantic state, and returns automatic readback", async () => {
		let confirmations = 0;
		let previewCalls = 0;
		let applyCalls = 0;
		let applyBody: Record<string, unknown> | undefined;
		const result = await runLegacyAscetCreateDependentChain(
			request("apply"),
			{
				cwd: process.cwd(),
				executeCli: async (requestValue) => {
					if (requestValue.args[1] === "get_database_identity") return identity(requestValue);
					if (requestValue.args[1] === "configure_parameter_dependency_chain_execute") {
						const body = bridgeRequest(requestValue);
						if (body.intent === "apply") {
							applyCalls++;
							applyBody = body;
							return execution(requestValue, committedResult());
						}
						previewCalls++;
						return execution(requestValue, previewResult());
					}
					throw new Error(`Unexpected call: ${requestValue.args.join(" ")}`);
				},
			},
			{
				hasUI: true,
				ui: {
					confirm: async () => {
						confirmations++;
						return true;
					},
				},
			},
		);
		assert.equal(confirmations, 1);
		assert.equal(previewCalls, 2);
		assert.equal(applyCalls, 1);
		assert.deepEqual(applyBody?.expectedBeforeState, previewResult().beforeState);
		assert.equal(applyBody?.acquireEditability, false);
		assert.deepEqual(JSON.parse(result.content[0].text), {
			ok: true,
			changed: true,
			verified: true,
			created: ["provider", "imported", "local"],
			configured: ["dependency"],
		});
	});

	test("idempotent apply performs preview verification and returns without approval or mutation", async () => {
		let confirmations = 0;
		let applyCalls = 0;
		const result = await runLegacyAscetCreateDependentChain(
			request("apply"),
			{
				cwd: process.cwd(),
				executeCli: async (requestValue) => {
					if (requestValue.args[1] === "get_database_identity") return identity(requestValue);
					if (requestValue.args[1] === "configure_parameter_dependency_chain_execute") {
						const body = bridgeRequest(requestValue);
						if (body.intent === "apply") applyCalls++;
						return execution(requestValue, previewResult(true));
					}
					throw new Error(`Unexpected call: ${requestValue.args.join(" ")}`);
				},
			},
			{
				hasUI: true,
				ui: {
					confirm: async () => {
						confirmations++;
						return true;
					},
				},
			},
		);
		assert.equal(confirmations, 0);
		assert.equal(applyCalls, 0);
		assert.deepEqual(JSON.parse(result.content[0].text), {
			ok: true,
			changed: false,
			idempotent: true,
			verified: true,
		});
	});

	test("headless apply returns the standard approval-required error without mutation", async () => {
		let applyCalls = 0;
		const result = await runLegacyAscetCreateDependentChain(
			request("apply"),
			{
				cwd: process.cwd(),
				executeCli: async (requestValue) => {
					if (requestValue.args[1] === "get_database_identity") return identity(requestValue);
					if (requestValue.args[1] === "configure_parameter_dependency_chain_execute") {
						const body = bridgeRequest(requestValue);
						if (body.intent === "apply") applyCalls++;
						return execution(requestValue, previewResult());
					}
					throw new Error(`Unexpected call: ${requestValue.args.join(" ")}`);
				},
			},
			{},
		);
		assert.equal(applyCalls, 0);
		assert.deepEqual(JSON.parse(result.content[0].text), {
			ok: false,
			code: "ascet_edit_approval_required",
		});
	});

	test("read-only targets authorize editability acquisition inside the apply Bridge session", async () => {
		let applyBody: Record<string, unknown> | undefined;
		const result = await runLegacyAscetCreateDependentChain(
			request("apply"),
			{
				cwd: process.cwd(),
				executeCli: async (requestValue) => {
					if (requestValue.args[1] === "get_database_identity") return identity(requestValue);
					if (requestValue.args[1] === "configure_parameter_dependency_chain_execute") {
						const body = bridgeRequest(requestValue);
						if (body.intent === "apply") {
							applyBody = body;
							return execution(requestValue, committedResult());
						}
						return execution(requestValue, previewResult(false, "before-a", false));
					}
					throw new Error(`Unexpected call: ${requestValue.args.join(" ")}`);
				},
			},
			{ hasUI: true, ui: { confirm: async () => true } },
		);
		assert.equal(applyBody?.acquireEditability, true);
		assert.equal(JSON.parse(result.content[0].text).verified, true);
	});

	test("state changes during approval are rejected after one confirmation", async () => {
		let confirmations = 0;
		let previews = 0;
		let applyCalls = 0;
		const result = await runLegacyAscetCreateDependentChain(
			request("apply"),
			{
				cwd: process.cwd(),
				executeCli: async (requestValue) => {
					if (requestValue.args[1] === "get_database_identity") return identity(requestValue);
					if (requestValue.args[1] === "configure_parameter_dependency_chain_execute") {
						const body = bridgeRequest(requestValue);
						if (body.intent === "apply") {
							applyCalls++;
							return execution(requestValue, committedResult());
						}
						previews++;
						return execution(requestValue, previewResult(false, previews === 1 ? "before-a" : "before-b"));
					}
					throw new Error(`Unexpected call: ${requestValue.args.join(" ")}`);
				},
			},
			{
				hasUI: true,
				ui: {
					confirm: async () => {
						confirmations++;
						return true;
					},
				},
			},
		);
		assert.equal(confirmations, 1);
		assert.equal(previews, 2);
		assert.equal(applyCalls, 0);
		assert.deepEqual(JSON.parse(result.content[0].text), { ok: false, code: "target_state_changed" });
	});

	test("conflicts and rolled-back writes produce compact failure results", async () => {
		const conflict = await runLegacyAscetCreateDependentChain(
			request("preview"),
			{
				cwd: process.cwd(),
				executeCli: async (requestValue) => {
					if (requestValue.args[1] === "get_database_identity") return identity(requestValue);
					return execution(requestValue, {
						status: "rejected",
						writesPerformed: false,
						mutationStarted: false,
						consistency: "compensating",
						conflicts: [{ stage: "local", target: "FeatureA\\Consumer\\C_Threshold", message: "conflict" }],
						stages: [],
					});
				},
			},
			{},
		);
		assert.deepEqual(JSON.parse(conflict.content[0].text), { ok: false, code: "element_conflict", target: "local" });

		const rolledBack = await runLegacyAscetCreateDependentChain(
			request("apply"),
			{
				cwd: process.cwd(),
				executeCli: async (requestValue) => {
					if (requestValue.args[1] === "get_database_identity") return identity(requestValue);
					const body = bridgeRequest(requestValue);
					return execution(
						requestValue,
						body.intent === "apply"
							? {
									status: "rolled_back",
									writesPerformed: true,
									mutationStarted: true,
									consistency: "compensating",
									originalError: { code: "injected", message: "failed" },
									rollback: { required: true, status: "passed", verified: true },
									stages: [],
								}
							: previewResult(),
					);
				},
			},
			{ hasUI: true, ui: { confirm: async () => true } },
		);
		assert.deepEqual(JSON.parse(rolledBack.content[0].text), { ok: false, code: "rolled_back" });
	});

	test("concurrent apply calls serialize every native ASCET operation without deadlock", async () => {
		const scheduler = createAscetScheduler({ maxPendingPerAgent: 50 });
		let active = 0;
		let maximumActive = 0;
		const executeCli = async (requestValue: AscetCliRequest): Promise<AscetCliExecutionResult> => {
			active++;
			maximumActive = Math.max(maximumActive, active);
			try {
				await new Promise((resolve) => setTimeout(resolve, 5));
				if (requestValue.args[1] === "get_database_identity") return identity(requestValue);
				if (requestValue.args[1] === "configure_parameter_dependency_chain_execute") {
					const body = bridgeRequest(requestValue);
					return execution(requestValue, body.intent === "apply" ? committedResult() : previewResult());
				}
				throw new Error(`Unexpected call: ${requestValue.args.join(" ")}`);
			} finally {
				active--;
			}
		};
		const [first, second] = await Promise.all([
			runLegacyAscetCreateDependentChain(
				request("apply"),
				{ cwd: process.cwd(), agentId: "agent-a", executeCli, scheduler },
				{ hasUI: true, ui: { confirm: async () => true } },
			),
			runLegacyAscetCreateDependentChain(
				request("apply"),
				{ cwd: process.cwd(), agentId: "agent-b", executeCli, scheduler },
				{ hasUI: true, ui: { confirm: async () => true } },
			),
		]);
		assert.equal(maximumActive, 1);
		assert.equal(JSON.parse(first.content[0].text).verified, true);
		assert.equal(JSON.parse(second.content[0].text).verified, true);
		assert.equal(scheduler.getSnapshot().activeCount, 0);
		assert.equal(scheduler.getSnapshot().queuedJobs.length, 0);
	});
});
