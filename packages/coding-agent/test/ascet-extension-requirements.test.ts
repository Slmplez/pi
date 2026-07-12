import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runAscetRequirements } from "../../ascet-extension/src/tools/requirements/risk-context.ts";

const HEADER = [
	"Design requirements name",
	"Design requirement ID",
	"Description",
	"Supplier Comments",
	"RB_Top_FNID",
	"SWRT_Feature",
	"CCP",
	"Signal Group",
	"Signal",
	"Reused Signal",
	"Bosch Defect",
	"COEM SWIM",
	"LL",
] as const;

async function writeRequirementsWorkbook(path: string): Promise<void> {
	const workbook = new ExcelJS.Workbook();
	const sheet = workbook.addWorksheet("Sheet1");
	sheet.addRow([...HEADER]);
	sheet.addRow([
		"Wheel slip state quality handling",
		"907829",
		"Use WhlSlipSt.FrntLe quality fallback when the reused vehicle speed signal is invalid.",
		"2026-01-03 Accepted with deviation: monitor WhlSlipSt reused vehicle speed fallback before implementation.",
		"RB-1",
		"ABS",
		"Brake",
		"Wheel",
		"WhlSlipSt.FrntLe",
		"VehSpdLgt.VehSpdLgtQf: 76797",
		"6731279",
		"SWIM-1093525",
		"Fix defect 5478736; set P_SasPlausRobustFactor = 1.5",
	]);
	sheet.addRow([
		"Vehicle speed quality source",
		"76797",
		"Provides VehSpdLgt.VehSpdLgtQf for wheel slip fallback logic.",
		"Rejected risk if quality status is not propagated to consumers.",
		"RB-2",
		"ABS",
		"Brake",
		"Vehicle",
		"VehSpdLgt.VehSpdLgtQf",
		"",
		"",
		"",
		"",
	]);
	sheet.addRow([
		"Rear wheel slip state quality",
		"888001",
		"Same signal family for WhlSlipSt.ReLe quality handling.",
		"Accepted; confirm wheel-position mapping before reuse.",
		"RB-3",
		"ABS",
		"Brake",
		"Wheel",
		"WhlSlipSt.ReLe",
		"",
		"",
		"",
		"",
	]);
	sheet.addRow([
		"Steering angle quality monitor",
		"77196",
		"Steering wheel angle sensor quality information.",
		"Accepted with prior defect context.",
		"RB-4",
		"Steering",
		"VehicleDynamics",
		"Steering",
		"SasAngl.SasAnglQf",
		"",
		"6731279",
		"SWIM-1093525",
		"1. Change P_SasPlausRobustFactor = 1.5 2. Fix defect 5478736",
	]);
	await workbook.xlsx.writeFile(path);
}

describe("ascet_requirements", () => {
	let tempDir: string;
	let workbookPath: string;

	beforeEach(async () => {
		tempDir = join(tmpdir(), `ascet-req-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		mkdirSync(tempDir, { recursive: true });
		workbookPath = join(tempDir, "requirements-risk-sample.xlsx");
		await writeRequirementsWorkbook(workbookPath);
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("builds risk context with direct evidence, relation evidence, and default one-hop depth", async () => {
		const result = await runAscetRequirements(
			{ action: "risk_context", query: "907829", sourceFile: workbookPath },
			{ cwd: tempDir },
		);

		expect(result.ok).toBe(true);
		expect(result.action).toBe("risk_context");
		expect(result.data.relationDepth).toBe(1);
		expect(result.data.targets[0]).toMatchObject({
			requirementId: "907829",
			title: "Wheel slip state quality handling",
		});
		expect(result.data.selfRisks.some((risk) => risk.field === "supplier_comments")).toBe(true);
		expect(result.data.defectSignals.map((risk) => risk.value)).toContain("6731279");
		expect(result.data.swimSignals.map((risk) => risk.value)).toContain("SWIM-1093525");
		expect(result.data.lessonsLearned.some((risk) => risk.value.includes("5478736"))).toBe(true);
		expect(result.data.relationRisks.some((risk) => risk.relatedRequirementId === "76797")).toBe(true);
		expect(result.data.relationRisks.some((risk) => risk.relationType === "signal_family")).toBe(true);
		expect(result.data.selfRisks[0]?.evidence).toMatchObject({
			sheetName: "Sheet1",
			rowNumber: 2,
			evidenceKind: "direct",
		});
		expect(result.data.relationRisks.some((risk) => risk.evidence.evidenceKind === "inferred")).toBe(true);
	});

	it("returns actionable errors for unsupported or missing Excel sources", async () => {
		const xlsResult = await runAscetRequirements(
			{ action: "risk_context", query: "907829", sourceFile: join(tempDir, "legacy.xls") },
			{ cwd: tempDir },
		);
		const missingResult = await runAscetRequirements(
			{ action: "risk_context", query: "907829", sourceFile: join(tempDir, "missing.xlsx") },
			{ cwd: tempDir },
		);

		expect(xlsResult).toMatchObject({
			ok: false,
			error: {
				code: "UNSUPPORTED_EXCEL_FORMAT",
				message: "Unsupported Excel format: .xls. Convert the file to .xlsx and retry.",
			},
		});
		expect(missingResult).toMatchObject({
			ok: false,
			error: {
				code: "REQUIREMENTS_EXCEL_NOT_FOUND",
			},
		});
	});

	it("marks ambiguous searches as needing clarification", async () => {
		const result = await runAscetRequirements(
			{ action: "risk_context", query: "quality", sourceFile: workbookPath, limit: 3 },
			{ cwd: tempDir },
		);

		expect(result.ok).toBe(true);
		expect(result.data.needsClarification).toBe(true);
		expect(result.data.suggestedQuestions.join("\n")).toContain("Which requirement should drive the ASCET design?");
		expect(result.data.candidates.length).toBeGreaterThan(1);
	});

	it("refreshes workspace cache metadata when the source workbook changes", async () => {
		await runAscetRequirements({ action: "index", sourceFile: workbookPath }, { cwd: tempDir });
		const metaPath = join(tempDir, ".pi", "ascet-design", "requirements-meta.json");
		const firstMeta = JSON.parse(readFileSync(metaPath, "utf8")) as { rowCount: number; sourceFile: string };

		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.readFile(workbookPath);
		workbook
			.getWorksheet("Sheet1")
			?.addRow([
				"New quality ambiguity row",
				"900001",
				"Quality handling for an added requirement.",
				"Accepted after cache refresh test.",
				"RB-5",
				"ABS",
				"Brake",
				"Wheel",
				"WhlSlipSt.FrntRi",
				"",
				"",
				"",
				"",
			]);
		await workbook.xlsx.writeFile(workbookPath);

		await runAscetRequirements({ action: "index", sourceFile: workbookPath }, { cwd: tempDir });
		const secondMeta = JSON.parse(readFileSync(metaPath, "utf8")) as { rowCount: number; sourceFile: string };

		expect(firstMeta).toMatchObject({ rowCount: 4, sourceFile: workbookPath });
		expect(secondMeta).toMatchObject({ rowCount: 5, sourceFile: workbookPath });
	});
});
