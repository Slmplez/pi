import assert from "node:assert/strict";
import { test } from "node:test";
import type { AscetCliRequest } from "../cli.ts";
import { checkAscetDatabaseIdentityForWrite } from "./common.ts";

function execution(request: AscetCliRequest, database: Record<string, unknown>) {
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result: { database } }),
		stderr: "",
		timedOut: false,
		request,
	};
}

test("write identity gate accepts a consistent database binding", async () => {
	const check = await checkAscetDatabaseIdentityForWrite({
		cwd: process.cwd(),
		executeCli: async (request) => execution(request, { name: "DB", path: "C:/Repo/DB" }),
	});
	assert.equal(check.result, undefined);
	assert.equal(check.identity?.status, "consistent");
});

test("write identity gate blocks a mixed database binding", async () => {
	const check = await checkAscetDatabaseIdentityForWrite({
		cwd: process.cwd(),
		executeCli: async (request) =>
			execution(request, {
				name: "C:/Repo/PackageA/ASW/Db/AscetDb_1",
				path: "C:/Repo/PackageB/ASW/Db",
			}),
	});
	assert.equal(check.identity?.status, "inconsistent");
	assert.equal(check.result?.error?.code, "database_identity_inconsistent");
});
