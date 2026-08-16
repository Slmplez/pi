import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { AscetMutationPreflightRegistry, createAscetMutationPreflightEvidence } from "./service.ts";

const context = {
	params: { action: "create_folder", folderPath: "DEMO\\New", intent: "preview" } as const,
	options: { cwd: process.cwd() },
};

describe("ASCET mutation preflight registry", () => {
	test("dispatches the registered action handler", async () => {
		const registry = new AscetMutationPreflightRegistry(async () => "missing");
		registry.register("create_folder", async ({ params }) => params.action);

		assert.equal(await registry.run(context), "create_folder");
	});

	test("rejects duplicate handlers and uses the explicit missing-action policy", async () => {
		const registry = new AscetMutationPreflightRegistry(async ({ params }) => `missing:${params.action}`);
		registry.register("create_folder", async () => "registered");
		assert.throws(() => registry.register("create_folder", async () => "duplicate"), /already registered/u);

		assert.equal(
			await registry.run({
				params: {
					action: "create_component",
					componentPath: "DEMO\\C",
					kind: "class",
					intent: "preview",
				},
				options: context.options,
			}),
			"missing:create_component",
		);
	});
	test("builds normalized evidence with a timestamp-independent approval fingerprint", () => {
		const common = {
			action: "create_method" as const,
			params: { componentPath: "DEMO\\C", methodName: "run", methodKind: "abstract" },
			database: { path: "C:/Repo/DB", fingerprint: "db-fingerprint" },
			target: { path: "DEMO\\C", oid: "C-1", kind: "class" },
			impact: {
				complete: true,
				sharedObject: false,
				ownerPath: "DEMO\\C",
				affectedProjects: [],
				fingerprint: "impact-fingerprint",
			},
			capability: { status: "supported" as const, operation: "AddMethod", evidence: {} },
			editability: { applicable: true, status: "editable" as const, canRequestEditable: true },
			effects: [{ kind: "create_method", target: "DEMO\\C::run", description: "Create method run" }],
			verification: { available: true, operation: "read_method_signature", target: { methodName: "run" } },
		};
		const first = createAscetMutationPreflightEvidence({ ...common, generatedAt: "first" });
		const second = createAscetMutationPreflightEvidence({ ...common, generatedAt: "second" });

		assert.equal(first.version, 1);
		assert.equal(first.paramsFingerprint, second.paramsFingerprint);
		assert.equal(first.approvalMaterialFingerprint, second.approvalMaterialFingerprint);
	});
});
