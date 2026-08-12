import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import type { AscetCliJsonResult, AscetCliRequest } from "../cli.ts";
import { AscetMutationCoordinator, AscetMutationCoordinatorError } from "./mutation-coordinator.ts";
import { AscetMutationGuardStore } from "./mutation-guard-store.ts";

const request: AscetCliRequest = { cwd: "C:/Repo", cliPath: "AscetBridge.exe", args: [] };

function rawResult(input: Partial<AscetCliJsonResult>): AscetCliJsonResult {
	return {
		ok: false,
		data: null,
		request,
		stdout: "",
		stderr: "",
		exitCode: 1,
		timedOut: false,
		...input,
	};
}

function input(events: string[], dispatch: () => Promise<AscetCliJsonResult>) {
	return {
		action: "apply_element_spec",
		planId: "plan-1",
		planFingerprint: "a".repeat(64),
		databaseFingerprint: "db-1",
		targetOid: "oid-1",
		targetKind: "component",
		canonicalPath: "Package\\Demo\\C",
		targetImpactFingerprint: "sha256:impact-1",
		guardGeneration: 0,
		sessionId: "session-1",
		approvalTtlMs: 60_000,
		beginExecution: () => events.push("plan:executing"),
		completeExecution: () => events.push("plan:consumed"),
		dispatch,
	};
}

describe("ASCET mutation coordinator", () => {
	test("consumes approval and executes the guarded plan under one target lock", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-coordinator-"));
		try {
			const events: string[] = [];
			const coordinator = new AscetMutationCoordinator({ artifactRoot: root });
			const raw = await coordinator.execute(
				input(events, async () => {
					events.push("bridge:dispatch");
					return rawResult({
						ok: true,
						data: { result: { verifyReadbackRequested: true, readbackVerified: true } },
						exitCode: 0,
					});
				}),
			);
			assert.equal(raw.ok, true);
			assert.deepEqual(events, ["plan:executing", "bridge:dispatch", "plan:consumed"]);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("converts a stale target lock into process_interrupted quarantine", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-coordinator-stale-"));
		try {
			const coordinator = new AscetMutationCoordinator({ artifactRoot: root });
			const lockPath = coordinator.getTargetLockPath("db-1", "oid-1");
			mkdirSync(join(lockPath, ".."), { recursive: true });
			writeFileSync(
				lockPath,
				`${JSON.stringify({ databaseFingerprint: "db-1", targetOid: "oid-1", pid: 2147483647 })}\n`,
			);
			let dispatched = false;

			await assert.rejects(
				coordinator.execute(
					input([], async () => {
						dispatched = true;
						return rawResult({});
					}),
				),
				(error: unknown) => {
					assert.ok(error instanceof AscetMutationCoordinatorError);
					assert.equal(error.code, "mutation_target_quarantined");
					return true;
				},
			);
			assert.equal(dispatched, false);
			assert.equal(existsSync(lockPath), false);
			const guard = new AscetMutationGuardStore({ artifactRoot: root }).assertClear("db-1", "oid-1");
			assert.equal(guard.clear, false);
			assert.equal(guard.record?.reason, "process_interrupted");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("quarantines an unknown outcome and blocks every alias for the same OID", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-coordinator-"));
		try {
			const coordinator = new AscetMutationCoordinator({ artifactRoot: root });
			await coordinator.execute(
				input([], async () =>
					rawResult({ error: { code: "write_outcome_unknown", message: "unknown" }, operationId: "op-1" }),
				),
			);
			const guard = new AscetMutationGuardStore({ artifactRoot: root }).assertClear("db-1", "oid-1");
			assert.equal(guard.clear, false);
			assert.equal(guard.record?.reason, "unknown_outcome");

			await assert.rejects(
				coordinator.execute({ ...input([], async () => rawResult({})), canonicalPath: "Project\\P::C" }),
				(error: unknown) => {
					assert.ok(error instanceof AscetMutationCoordinatorError);
					assert.equal(error.code, "mutation_target_quarantined");
					return true;
				},
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
