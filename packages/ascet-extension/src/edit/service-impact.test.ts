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
	writeFileSync(join(root, "AscetCli.exe"), "", "utf8");
	writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
	return {
		root,
		env: {
			ASCET_CLI_PATH: join(root, "AscetCli.exe"),
			ASCET_CONTRACTS_PATH: contractsRoot,
			PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
		},
		cleanup: () => rmSync(root, { recursive: true, force: true }),
	};
}

function createExecution(request: AscetCliRequest, ok: boolean): AscetCliExecutionResult {
	return {
		exitCode: ok ? 0 : 1,
		stdout: JSON.stringify({
			ok,
			result: ok ? { componentPath: "DEMO\\Controller", writeSucceeded: true } : null,
			error: ok ? null : { code: "ascet_edit_failed", message: "write failed" },
			meta: { mode: "exec", operation: request.args[1] },
		}),
		stderr: ok ? "" : "write failed",
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
					executeWrite: true,
				},
				{
					cwd: environment.root,
					env: environment.env,
					executeCli: async (request) => createExecution(request, true),
				},
				approvingContext,
			);
			assert.equal(result.details.outcome.status, "ok");
			assert.deepEqual(result.details.observations, { invalidated: ["obs-success"] });
			if (result.details.outcome.status === "ok") {
				assert.deepEqual(
					(result.details.outcome.data as { observations: { invalidated: string[] } }).observations,
					{
						invalidated: ["obs-success"],
					},
				);
			}
		} finally {
			environment.cleanup();
		}
	});

	test("does not invalidate observations for failed or dry-run writes", async () => {
		const environment = createEnvironment();
		try {
			createStoredObservation(environment.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT ?? "", "obs-unchanged");
			const failed = await runAscetEdit(
				{
					action: "set_method_code",
					componentPath: "DEMO/Controller",
					methodName: "Main",
					code: "return;",
					executeWrite: true,
				},
				{
					cwd: environment.root,
					env: environment.env,
					executeCli: async (request) => createExecution(request, false),
				},
				approvingContext,
			);
			assert.equal(failed.details.outcome.status, "error");

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
					executeWrite: true,
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
			assert.deepEqual(stillStored, ["obs-unchanged"]);
		} finally {
			environment.cleanup();
		}
	});
});
