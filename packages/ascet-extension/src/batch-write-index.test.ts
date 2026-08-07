import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { invalidateBatchWriteObservations, runApprovedAscetBatchWrite } from "./batch-write.ts";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import type { AscetEditApprovalContext } from "./edit/approval.ts";
import { AscetObservationStore } from "./observation-store.ts";

const approvingContext: AscetEditApprovalContext = {
	hasUI: true,
	ui: { confirm: async () => true },
};

function createEnvironment(): { root: string; env: Record<string, string | undefined>; cleanup: () => void } {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-batch-observation-"));
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

function createObservation(root: string, componentPath: string, resultId: string): void {
	new AscetObservationStore({ root, thresholdBytes: 1, generateResultId: () => resultId }).create({
		domain: "elements",
		target: { path: componentPath },
		items: [{ name: "P" }],
		coverage: { status: "complete_for_scope" },
		delivery: "stored",
	});
}

function createExecution(request: AscetCliRequest, exitCode: number): AscetCliExecutionResult {
	const ok = exitCode === 0 || exitCode === 2;
	return {
		exitCode,
		stdout: JSON.stringify({
			ok,
			result: { results: exitCode === 2 ? [{ ok: false, error: { code: "failed" } }] : [{ ok: true }] },
			error: null,
			meta: { mode: "batch", operation: "set_method_code" },
		}),
		stderr: "",
		timedOut: false,
		request,
	};
}

describe("ASCET batch write observation invalidation", () => {
	test("invalidates observations for all successful batch targets", () => {
		const environment = createEnvironment();
		try {
			createObservation(environment.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT ?? "", "DEMO\\A", "obs-a");
			createObservation(environment.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT ?? "", "DEMO\\B", "obs-b");
			assert.deepEqual(
				invalidateBatchWriteObservations(
					{
						operation: "batch_set_method_code",
						requests: [{ componentPath: "DEMO/A" }, { componentPath: "DEMO/B" }],
					},
					{ env: environment.env },
				),
				{ invalidated: ["obs-a", "obs-b"] },
			);
		} finally {
			environment.cleanup();
		}
	});

	test("does not invalidate observations for partially failed batch writes", async () => {
		const environment = createEnvironment();
		const codeFile = join(environment.root, "Main.esdl");
		writeFileSync(codeFile, "return;", "utf8");
		try {
			createObservation(environment.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT ?? "", "DEMO\\A", "obs-partial");
			const result = await runApprovedAscetBatchWrite(
				{
					operation: "batch_set_method_code",
					requests: [{ componentPath: "DEMO/A", methodName: "Main", codeFile }],
					executeWrite: true,
				},
				{ cwd: environment.root, env: environment.env, executeCli: async (request) => createExecution(request, 2) },
				approvingContext,
			);
			assert.equal(result.exitCode, 2);
			const remaining = new AscetObservationStore({
				root: environment.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT,
			}).invalidate({ componentPath: "DEMO\\A" });
			assert.deepEqual(remaining, ["obs-partial"]);
		} finally {
			environment.cleanup();
		}
	});
});
