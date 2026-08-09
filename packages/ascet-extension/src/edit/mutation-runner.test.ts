import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { AscetJob } from "../scheduler/types.ts";
import { runAscetSetEnumerators } from "../set-enumerators.ts";

describe("ASCET edit mutation runners", () => {
	test("submit mutations to the scheduler as ascet_edit", async () => {
		const submissions: Array<{ toolName: string; commandId: string; kind: string }> = [];
		const result = await runAscetSetEnumerators(
			{ componentPath: "DEMO/Enum", enumerators: ["OFF", "ON"] },
			{
				cwd: process.cwd(),
				scheduler: {
					async submit<T>(job: AscetJob<T>): Promise<T> {
						submissions.push(job);
						return job.run(new AbortController().signal);
					},
					getSnapshot(): never {
						throw new Error("getSnapshot is not used by this runner test.");
					},
				},
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: '{"ok":true,"data":{}}',
					stderr: "",
					timedOut: false,
					aborted: false,
					request,
				}),
			},
		);

		assert.equal(result.ok, true);
		assert.deepEqual(
			submissions.map(({ toolName, commandId, kind }) => ({ toolName, commandId, kind })),
			[{ toolName: "ascet_edit", commandId: "set_enumerators", kind: "write" }],
		);
	});
});
