import { describe, expect, it } from "vitest";
import { buildAscetGetArgs, formatAscetGetResult, runAscetGet } from "../../ascet-extension/src/get.ts";
import { buildReadDependentChainArgs } from "../../ascet-extension/src/read-dependent-chain.ts";
import { repoRoot } from "./ascet-extension-test-helpers.ts";

describe("ASCET on-demand read tools", () => {
	it("builds bounded get operations without element/formula count limits", () => {
		expect(
			buildAscetGetArgs({
				action: "tree",
				target: { targetPathPrefix: "PlatformLibrary\\Package\\SCM_SecondaryCollisionMitigation" },
			}),
		).toEqual([
			"exec",
			"get_tree",
			"--request-json",
			JSON.stringify({ targetPathPrefix: "PlatformLibrary\\Package\\SCM_SecondaryCollisionMitigation" }),
			"--json",
		]);
		expect(
			buildAscetGetArgs({
				action: "elements",
				target: { path: "IPBCustGeneral_ECU_CSW_BB88010::CM_SCM" },
				filters: { scope: ["imported", "exported"] },
			}),
		).toEqual([
			"exec",
			"get_elements",
			"--request-json",
			JSON.stringify({ path: "IPBCustGeneral_ECU_CSW_BB88010::CM_SCM", scopes: ["imported", "exported"] }),
			"--json",
		]);
	});

	it("returns inline get observations and keeps deep dependency reads exact", async () => {
		const result = await runAscetGet(
			{ action: "formulas", target: { path: "DEMO\\Project" }, delivery: "inline" },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({
						ok: true,
						result: {
							items: [
								{
									path: "DEMO\\Project::Formula",
									name: "Formula",
									contents: "x + y",
									parameters: [],
								},
							],
							coverage: { status: "complete_for_scope" },
							truncated: false,
							source: "live",
						},
					}),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);
		const formatted = JSON.parse(
			formatAscetGetResult({ action: "formulas", target: { path: "DEMO\\Project" } }, result),
		);
		expect(formatted).toMatchObject({
			delivery: "inline",
			coverage: { status: "complete_for_scope" },
			items: [expect.objectContaining({ name: "Formula", contents: "x + y" })],
		});
		expect(
			buildReadDependentChainArgs({
				componentPath: "FeatureA/Consumer",
				dependentElement: "C_K_Effective",
				exporterComponentPath: "FeatureA/ParameterProvider",
			}),
		).toEqual([
			"exec",
			"read_dependent_chain",
			"FeatureA\\Consumer",
			"C_K_Effective",
			"--exporter",
			"FeatureA\\ParameterProvider",
			"--json",
		]);
	});
});
