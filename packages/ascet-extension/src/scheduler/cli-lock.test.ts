import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import {
	AscetCliLockTimeoutError,
	acquireAscetCliLock,
	clearStaleAscetCliLock,
	getAscetCliLockSnapshot,
} from "./cli-lock.ts";

const metadata = {
	agentId: "agent-test",
	commandId: "read_tree",
	toolName: "ascet_read",
	processName: "AscetBridge.exe",
};

function createLockFile(token: string): string {
	return JSON.stringify({
		token,
		ownerToken: token,
		pid: 1234,
		ownerNodePid: 1234,
		bridgePid: null,
		agentId: "agent-test",
		commandId: "read_tree",
		toolName: "ascet_read",
		processName: "AscetBridge.exe",
		acquiredAt: "2026-01-01T00:00:00.000Z",
		heartbeatAt: "2026-01-01T00:00:00.000Z",
	});
}

async function withLockPath(run: (lockPath: string) => Promise<void>): Promise<void> {
	const root = await mkdtemp(join(tmpdir(), "pi-ascet-cli-lock-"));
	const lockPath = join(root, "ascet-toolapi.lock");
	try {
		await run(lockPath);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
}

function assertCorruptSnapshot(
	snapshot: Awaited<ReturnType<typeof getAscetCliLockSnapshot>>,
): asserts snapshot is Extract<Awaited<ReturnType<typeof getAscetCliLockSnapshot>>, { corrupt: true }> {
	assert.equal(snapshot.locked, true);
	assert.ok("corrupt" in snapshot);
	assert.equal(snapshot.corrupt, true);
}

describe("ASCET CLI lock", () => {
	test("treats empty and malformed files as corrupt locks and clears them once stale", async () => {
		for (const content of ["", '{"token":']) {
			await withLockPath(async (lockPath) => {
				const staleAt = new Date(Date.now() - 10_000);
				await writeFile(lockPath, content, "utf8");
				await utimes(lockPath, staleAt, staleAt);

				const snapshot = await getAscetCliLockSnapshot({ lockPath, staleMs: 100 });
				assertCorruptSnapshot(snapshot);
				assert.equal(snapshot.stale, true);
				assert.equal(await clearStaleAscetCliLock({ lockPath, staleMs: 100 }), true);

				const lock = await acquireAscetCliLock(metadata, {
					lockPath,
					heartbeatIntervalMs: 60_000,
				});
				await lock.release();
			});
		}
	});

	test("keeps a fresh corrupt file locked while its creator may still be writing it", async () => {
		await withLockPath(async (lockPath) => {
			await writeFile(lockPath, "{", "utf8");

			const snapshot = await getAscetCliLockSnapshot({ lockPath, staleMs: 60_000 });
			assertCorruptSnapshot(snapshot);
			assert.equal(snapshot.stale, false);
			assert.equal(await clearStaleAscetCliLock({ lockPath, staleMs: 60_000 }), false);
			await assert.rejects(
				acquireAscetCliLock(metadata, {
					lockPath,
					acquireTimeoutMs: 0,
					retryDelayMs: 1,
				}),
				AscetCliLockTimeoutError,
			);
		});
	});

	test("records the spawned Bridge PID before releasing the lock", async () => {
		await withLockPath(async (lockPath) => {
			const lock = await acquireAscetCliLock(metadata, { lockPath, heartbeatIntervalMs: 60_000 });
			try {
				await lock.setBridgePid(4321);
				const snapshot = await getAscetCliLockSnapshot({ lockPath });
				assert.equal(snapshot.locked, true);
				assert.equal("corrupt" in snapshot, false);
				if (snapshot.locked && !("corrupt" in snapshot)) {
					assert.equal(snapshot.owner.ownerNodePid, process.pid);
					assert.equal(snapshot.owner.bridgePid, 4321);
					assert.equal(snapshot.owner.ownerToken, lock.token);
				}
			} finally {
				await lock.release();
			}
		});
	});
	test("does not expose invalid JSON while heartbeats refresh the lock", async () => {
		await withLockPath(async (lockPath) => {
			const lock = await acquireAscetCliLock(metadata, {
				lockPath,
				heartbeatIntervalMs: 1,
			});
			try {
				const deadline = Date.now() + 50;
				while (Date.now() < deadline) {
					const raw = await readFile(lockPath, "utf8");
					assert.doesNotThrow(() => JSON.parse(raw));
				}
				const snapshot = await getAscetCliLockSnapshot({ lockPath, staleMs: 1_000 });
				assert.equal(snapshot.locked, true);
				assert.equal("corrupt" in snapshot, false);
			} finally {
				await lock.release();
			}
		});
	});

	test("does not delete a replacement lock when the previous owner releases", async () => {
		await withLockPath(async (lockPath) => {
			const lock = await acquireAscetCliLock(metadata, {
				lockPath,
				tokenFactory: () => "owner-token",
				heartbeatIntervalMs: 60_000,
			});
			const replacement = createLockFile("replacement-token");
			await writeFile(lockPath, replacement, "utf8");

			await lock.release();

			assert.equal(await readFile(lockPath, "utf8"), replacement);
		});
	});

	test("clears a stale valid lock but leaves a live valid lock in place", async () => {
		await withLockPath(async (lockPath) => {
			const staleAt = new Date(Date.now() - 10_000);
			await writeFile(lockPath, createLockFile("stale-token"), "utf8");
			await utimes(lockPath, staleAt, staleAt);
			assert.equal(
				await clearStaleAscetCliLock({
					lockPath,
					staleMs: 100,
					isPidAlive: () => true,
				}),
				true,
			);

			const live = createLockFile("live-token");
			await writeFile(lockPath, live, "utf8");
			assert.equal(
				await clearStaleAscetCliLock({
					lockPath,
					staleMs: 60_000,
					isPidAlive: () => true,
				}),
				false,
			);
			assert.equal(await readFile(lockPath, "utf8"), live);
		});
	});

	test("stops waiting for a lock when acquisition is aborted", async () => {
		await withLockPath(async (lockPath) => {
			await writeFile(lockPath, createLockFile("blocking-token"), "utf8");
			const controller = new AbortController();
			const reason = new Error("cancel lock wait");
			const acquisition = acquireAscetCliLock(metadata, {
				lockPath,
				acquireTimeoutMs: 60_000,
				retryDelayMs: 60_000,
				staleMs: 60_000,
				isPidAlive: () => true,
				signal: controller.signal,
			});
			controller.abort(reason);

			await assert.rejects(acquisition, (error) => error === reason);
			assert.equal(await readFile(lockPath, "utf8"), createLockFile("blocking-token"));
		});
	});
});
