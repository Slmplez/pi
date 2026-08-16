import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../cli.ts";
import { AscetObservationStore } from "../observation-store.ts";
import type { AscetEditApprovalContext } from "./approval.ts";
import { runAscetEdit } from "./service.ts";

const approvingContext: AscetEditApprovalContext = {
	hasUI: true,
	ui: { confirm: async () => true },
};

function createEnvironment(): { root: string; env: Record<string, string | undefined>; cleanup: () => void } {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-observation-"));
	const contractsRoot = join(root, "contracts");
	mkdirSync(contractsRoot, { recursive: true });
	writeFileSync(join(root, "AscetBridge.exe"), "", "utf8");
	writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
	return {
		root,
		env: {
			ASCET_BRIDGE_PATH: join(root, "AscetBridge.exe"),
			ASCET_CONTRACTS_PATH: contractsRoot,
			PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
		},
		cleanup: () => rmSync(root, { recursive: true, force: true }),
	};
}

function createExecution(request: AscetCliRequest, ok: boolean): AscetCliExecutionResult {
	const operation = request.args[1];
	const result =
		operation === "get_database_identity"
			? { database: { name: "DB", path: "C:/Repo/DB" } }
			: operation === "get_tree"
				? {
						items: [{ path: "DEMO\\Controller", oid: "C-1", kind: "class" }],
						coverage: { status: "complete_for_scope", completeness: "complete", collectorCompleted: true },
						truncated: false,
						database: { name: "DB", path: "C:/Repo/DB" },
					}
				: operation === "component_editable_check"
					? true
					: operation === "set_element_dependency"
						? {
								dryRun: request.args.includes("--dry-run"),
								validated: true,
								target: "DEMO/Controller",
								kind: "component",
								identity: { componentOID: "C-1", elementOID: "" },
								definitionHash: "definition-1",
								writeSucceeded: true,
								verifyReadbackRequested: true,
								readbackVerified: true,
							}
						: ok
							? {
									componentPath: "DEMO\\Controller",
									writeSucceeded: true,
									verifyReadbackRequested: true,
									readbackVerified: true,
								}
							: null;
	const isPrimaryFailure = operation === "set_method_code" && !ok;
	return {
		exitCode: isPrimaryFailure ? 1 : 0,
		stdout: JSON.stringify({
			ok: !isPrimaryFailure,
			result,
			error: isPrimaryFailure ? { code: "ascet_edit_failed", message: "write failed" } : null,
			meta: { mode: "exec", operation, mutationStarted: isPrimaryFailure },
		}),
		stderr: isPrimaryFailure ? "write failed" : "",
		timedOut: false,
		request,
	};
}

function createStoredObservation(root: string, resultId: string): void {
	new AscetObservationStore({ root, thresholdBytes: 1, generateResultId: () => resultId }).create({
		domain: "elements",
		target: { path: "DEMO\\Controller" },
		items: [{ name: "P" }],
		coverage: { status: "complete_for_scope" },
		delivery: "stored",
	});
}

describe("ASCET edit observation invalidation", () => {
	test("invalidates matching observations after a successful write", async () => {
		const environment = createEnvironment();
		try {
			createStoredObservation(environment.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT ?? "", "obs-success");
			const result = await runAscetEdit(
				{
					action: "set_method_code",
					componentPath: "DEMO/Controller",
					methodName: "Main",
					code: "return;",
					intent: "apply",
				},
				{
					cwd: environment.root,
					env: environment.env,
					executeCli: async (request) => {
						if (request.args[1] === "set_method_code") {
							assert.equal(request.args.includes("--verify-readback"), true);
						}
						return createExecution(request, true);
					},
				},
				approvingContext,
			);
			assert.equal(result.details.outcome.status, "ok", JSON.stringify(result.details));
			assert.deepEqual(result.details.observations, { invalidated: ["obs-success"] });
			if (result.details.outcome.status === "ok") {
				const data = result.details.outcome.data as {
					verification: { status: string };
					observations: { invalidated: string[] };
				};
				assert.equal(result.details.outcome.verified, true);
				assert.equal(data.verification.status, "passed");
				assert.deepEqual(data.observations, { invalidated: ["obs-success"] });
			}
			const content = JSON.parse(result.content[0]?.text ?? "{}") as {
				verification?: { status?: string };
			};
			assert.equal(content.verification?.status, "passed");
		} finally {
			environment.cleanup();
		}
	});

	test("invalidates observations for unknown failed writes but not dry-run plans", async () => {
		const environment = createEnvironment();
		try {
			createStoredObservation(environment.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT ?? "", "obs-unchanged");
			const failed = await runAscetEdit(
				{
					action: "set_method_code",
					componentPath: "DEMO/Controller",
					methodName: "Main",
					code: "return;",
					intent: "apply",
				},
				{
					cwd: environment.root,
					env: environment.env,
					executeCli: async (request) => createExecution(request, false),
				},
				approvingContext,
			);
			assert.equal(failed.details.outcome.status, "partial");
			assert.deepEqual(failed.details.observations, { invalidated: ["obs-unchanged"] });

			const dryRun = await runAscetEdit(
				{
					action: "set_element_dependency",
					targetPath: "DEMO/Controller",
					elementName: "P",
					dependency: "dependent",
					dependencyFormula: "P_Input",
					dependencyMappings: { P_Input: { kind: "parameter", name: "P_Input" } },
					variantPolicy: "default",
					dryRun: true,
					intent: "apply",
				},
				{
					cwd: environment.root,
					env: environment.env,
					executeCli: async (request) => createExecution(request, true),
				},
				approvingContext,
			);
			assert.equal(dryRun.details.observations, undefined);

			const stillStored = new AscetObservationStore({
				root: environment.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT,
			}).invalidate({ componentPath: "DEMO\\Controller" });
			assert.deepEqual(stillStored, []);
		} finally {
			environment.cleanup();
		}
	});
	test("does not invalidate observations when the write explicitly did not start", async () => {
		const environment = createEnvironment();
		try {
			createStoredObservation(environment.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT ?? "", "obs-not-started");
			const result = await runAscetEdit(
				{
					action: "set_method_code",
					componentPath: "DEMO/Controller",
					methodName: "Main",
					code: "return;",
					intent: "apply",
				},
				{
					cwd: environment.root,
					env: environment.env,
					executeCli: async (request) => {
						if (request.args[1] !== "set_method_code") return createExecution(request, true);
						return {
							exitCode: 1,
							stdout: JSON.stringify({
								ok: false,
								result: null,
								error: { code: "write_not_started", message: "write did not start" },
								meta: { mutationStarted: false },
							}),
							stderr: "write did not start",
							timedOut: false,
							request,
						};
					},
				},
				approvingContext,
			);
			assert.equal(result.details.outcome.status, "error");
			const stillStored = new AscetObservationStore({
				root: environment.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT,
			}).invalidate({ componentPath: "DEMO\\Controller" });
			assert.deepEqual(stillStored, ["obs-not-started"]);
		} finally {
			environment.cleanup();
		}
	});
});
