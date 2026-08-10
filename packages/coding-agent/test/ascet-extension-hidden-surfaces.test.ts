import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { repoRoot } from "./ascet-extension-test-helpers.ts";

type AscetExtensionPackageJson = {
	files?: string[];
	pi?: {
		skills?: string[];
		subagents?: {
			agents?: string[];
		};
	};
};

function readAscetExtensionPackageJson(): AscetExtensionPackageJson {
	return JSON.parse(
		readFileSync(join(repoRoot, "packages/ascet-extension/package.json"), "utf8"),
	) as AscetExtensionPackageJson;
}

describe("ASCET extension removed full-check surfaces", () => {
	it("does not contain or expose the ascet-full-check skill", () => {
		const manifest = readAscetExtensionPackageJson();

		expect(existsSync(join(repoRoot, "packages/ascet-extension/skills/ascet-full-check"))).toBe(false);
		expect(manifest.pi?.skills ?? []).not.toContain("skills");
		expect(manifest.pi?.skills ?? []).not.toContain("skills/ascet-full-check");
		expect(manifest.files ?? []).not.toContain("skills");
		expect(manifest.files ?? []).not.toContain("skills/ascet-full-check");
	});

	it("does not contain or expose ASCET checker agents", () => {
		const manifest = readAscetExtensionPackageJson();

		expect(existsSync(join(repoRoot, "packages/ascet-extension/agents"))).toBe(false);
		expect(manifest.pi?.subagents?.agents ?? []).toEqual([]);
		expect(manifest.files ?? []).not.toContain("agents");
	});
});
