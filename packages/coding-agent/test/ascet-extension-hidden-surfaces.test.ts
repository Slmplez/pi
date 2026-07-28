import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { repoRoot } from "./ascet-extension-test-helpers.ts";

const FULL_CHECK_AGENT_PATHS = [
	"agents/ascet-bde-signal-checker.md",
	"agents/ascet-discovery.md",
	"agents/ascet-evidence.md",
	"agents/ascet-parameter-mapping-checker.md",
	"agents/ascet-reference-checker.md",
	"agents/ascet-report-merge.md",
	"agents/ascet-rule-checker.md",
	"agents/ascet-semantic-checker.md",
	"agents/ascet-verify-checker.md",
] as const;

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

describe("ASCET extension hidden full-check surfaces", () => {
	it("does not expose the ascet-full-check skill through package resources", () => {
		const manifest = readAscetExtensionPackageJson();

		expect(manifest.pi?.skills ?? []).not.toContain("skills");
		expect(manifest.pi?.skills ?? []).not.toContain("skills/ascet-full-check");
		expect(manifest.files ?? []).not.toContain("skills");
		expect(manifest.files ?? []).not.toContain("skills/ascet-full-check");
	});

	it("does not expose ASCET subagents through package resources", () => {
		const manifest = readAscetExtensionPackageJson();
		const exposedAgents = manifest.pi?.subagents?.agents ?? [];
		const packagedFiles = manifest.files ?? [];

		expect(exposedAgents).toEqual([]);
		expect(packagedFiles).not.toContain("agents/ascet-implementation.md");
		expect(packagedFiles).not.toContain("agents");
		for (const agentPath of FULL_CHECK_AGENT_PATHS) {
			expect(exposedAgents).not.toContain(agentPath);
			expect(packagedFiles).not.toContain(agentPath);
		}
	});
});
