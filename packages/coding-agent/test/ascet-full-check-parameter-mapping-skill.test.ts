import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { repoRoot } from "./ascet-extension-test-helpers.ts";

const skillRoot = join(repoRoot, "packages/ascet-extension/skills/ascet-full-check");
const checkerScript = join(skillRoot, "scripts/check-parameter-mapping.mjs");
const fixtureEvidence = join(skillRoot, "fixtures/parameter-mapping/evidence");

function readJsonl(path: string): Record<string, unknown>[] {
	return readFileSync(path, "utf8")
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe("ascet-full-check parameter mapping skill", () => {
	it("produces deterministic parameter mapping findings from evidence JSONL", async () => {
		const tempRoot = mkdtempSync(join(tmpdir(), "ascet-full-check-"));
		try {
			const evidenceDir = join(tempRoot, "evidence");
			const out = join(tempRoot, "findings/parameter-mapping.jsonl");
			await cp(fixtureEvidence, evidenceDir, { recursive: true });

			const stdout = execFileSync(process.execPath, [checkerScript, "--evidence-dir", evidenceDir, "--out", out], {
				cwd: repoRoot,
				encoding: "utf8",
			});
			const summary = JSON.parse(stdout) as { ok: boolean; findings: number };
			const findings = readJsonl(out);
			const ruleIds = findings.map((finding) => finding.rule_id);

			expect(summary.ok).toBe(true);
			expect(summary.findings).toBe(findings.length);
			expect(ruleIds).toEqual(
				expect.arrayContaining([
					"parameter.imported-local-attribute-mismatch",
					"parameter.mapping-missing-imported",
					"parameter.mapping-missing-local",
					"parameter.imported-unmapped-and-unused",
					"parameter.local-constant-unmapped",
					"parameter.multiple-dependency-local-parameter",
					"parameter.mapping-dt-business-crosswire",
					"semantic.parameter-name-consistency",
					"evidence.parameter-mapping-relation-gap",
				]),
			);

			const dtOrdinaryFindings = findings.filter(
				(finding) =>
					[
						"parameter.mapping-missing-imported",
						"parameter.mapping-missing-local",
						"parameter.imported-unmapped-and-unused",
						"parameter.local-constant-unmapped",
						"parameter.imported-local-attribute-mismatch",
						"semantic.parameter-name-consistency",
					].includes(String(finding.rule_id)) && String(finding.element_name).toLowerCase() === "dt",
			);
			expect(dtOrdinaryFindings).toEqual([]);

			const crosswire = findings.find((finding) => finding.rule_id === "parameter.mapping-dt-business-crosswire");
			const findingsWithoutToolEvidence = findings.filter(
				(finding) => !Array.isArray(finding.tool_evidence) || finding.tool_evidence.length === 0,
			);
			const unmapped = findings.find((finding) => finding.rule_id === "parameter.imported-unmapped-and-unused");
			expect(crosswire).toMatchObject({
				severity: "high",
				importer_component_path: "DEMO\\Importer",
				exporter_component_path: "DEMO\\Exporter",
			});
			expect(crosswire?.tool_evidence).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						tool: "ascet_read",
						action: "read_dependent_chain",
					}),
				]),
			);
			expect(findingsWithoutToolEvidence).toEqual([]);
			const unmappedToolEvidence = Array.isArray(unmapped?.tool_evidence) ? unmapped.tool_evidence : [];
			expect(unmappedToolEvidence).not.toEqual([]);
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	it("documents the read-only tool orchestration and report section", () => {
		const parameterMappingReference = readFileSync(join(skillRoot, "references/parameter-mapping.md"), "utf8");
		const reportContract = readFileSync(join(skillRoot, "references/report-contract.md"), "utf8");
		const workflow = readFileSync(join(skillRoot, "references/workflow.md"), "utf8");
		const toolMap = readFileSync(join(skillRoot, "references/tool-map.md"), "utf8");
		const agent = readFileSync(
			join(repoRoot, "packages/ascet-extension/agents/ascet-parameter-mapping-checker.md"),
			"utf8",
		);
		const evidenceAgent = readFileSync(join(repoRoot, "packages/ascet-extension/agents/ascet-evidence.md"), "utf8");

		expect(parameterMappingReference).toContain("read_dependent_chain");
		expect(parameterMappingReference).toContain("special.dt-parameter-exemption");
		expect(parameterMappingReference).toContain("Do not use `ascet_edit.set_element_dependency`");
		expect(workflow).toContain("empty BDE edge result");
		expect(workflow).toContain("not automatically a design defect");
		expect(toolMap).toContain("diff_component_snapshot");
		expect(toolMap).toContain("quick snapshot");
		expect(toolMap).toContain("ascet_diff` action `diff` with `objectKind`");
		expect(toolMap).toContain("Use `elements` to collect the consumer directory and explicit provider candidates.");
		expect(toolMap).toContain("import_binding");
		expect(evidenceAgent).toContain("Store empty BDE edge results");
		expect(evidenceAgent).toContain("diff_component_snapshot");
		expect(reportContract).toContain("Parameter Mapping Findings");
		expect(agent).toContain("check-parameter-mapping.mjs");
	});
});
