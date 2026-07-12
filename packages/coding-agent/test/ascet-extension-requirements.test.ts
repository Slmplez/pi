import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { collectXlsxFiles } from "../../ascet-extension/src/tools/requirements/discovery.ts";
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
		"6731279: Wheel speed quality defect propagated to wheel slip consumers.",
		"SWIM-1093525: Vehicle speed QF invalid shall reset wheel slip fallback.",
		"LL-42: Verify quality propagation before reusing vehicle speed.",
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
		"6731279: Wheel position mapping defect reused across slip state.",
		"",
		"LL-43: Confirm rear wheel mapping before reuse.",
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

	it("skips inaccessible directories during automatic workbook discovery", () => {
		const protectedDir = join(tempDir, "protected");
		const safeDir = join(tempDir, "safe");
		const workbook = join(safeDir, "requirements-risk.xlsx");
		const output: string[] = [];
		const readDirectory = (root: string) => {
			if (root === protectedDir) {
				throw Object.assign(new Error("EPERM: operation not permitted, scandir"), { code: "EPERM" });
			}
			if (root === tempDir) {
				return [
					{ name: "protected", isDirectory: () => true, isFile: () => false },
					{ name: "safe", isDirectory: () => true, isFile: () => false },
				];
			}
			if (root === safeDir) {
				return [{ name: "requirements-risk.xlsx", isDirectory: () => false, isFile: () => true }];
			}
			return [];
		};

		collectXlsxFiles(tempDir, output, 0, readDirectory as never);

		expect(output).toEqual([workbook]);
	});

	it("does not scan for workbooks unless workspaceSearch is explicitly enabled", async () => {
		const passiveStatus = await runAscetRequirements({ action: "status" }, { cwd: tempDir });
		const explicitSearchStatus = await runAscetRequirements(
			{ action: "status", workspaceSearch: true },
			{ cwd: tempDir },
		);
		const missingSource = await runAscetRequirements({ action: "risk_context", query: "907829" }, { cwd: tempDir });

		expect(passiveStatus).toMatchObject({
			ok: true,
			summary: "ASCET requirements tool is available; no workbook selected.",
			data: {
				rowCount: 0,
			},
		});
		expect(explicitSearchStatus).toMatchObject({
			ok: true,
			summary: "Indexed 4 requirement rows from Sheet1.",
			data: {
				sourceFile: workbookPath,
				rowCount: 4,
			},
		});
		expect(missingSource).toMatchObject({
			ok: false,
			error: {
				code: "REQUIREMENTS_EXCEL_NOT_FOUND",
				recoveryActions: expect.arrayContaining([
					"Find the requirements .xlsx with the agent file search tools, then pass sourceFile.",
				]),
			},
		});
	});

	it("returns risk_context as a design gate summary without expanded risk detail content", async () => {
		const result = await runAscetRequirements(
			{ action: "risk_context", query: "907829", sourceFile: workbookPath },
			{ cwd: tempDir },
		);

		expect(result.ok).toBe(true);
		expect(result.action).toBe("risk_context");
		expect(result.data.riskContextStage).toBe("summary_only");
		expect(result.data.evidenceStatus).toBe("partial");
		expect(result.data.readiness).toBe("not_ready");
		expect(result.data.designGateReady).toBe(false);
		expect(result.data.design_gate_ready).toBe(false);
		expect(result.data.stateValid).toBe(true);
		expect(result.data.blockingReasons).toEqual(expect.arrayContaining(["summary_only", "evidence_partial"]));
		expect(result.data.targets[0]).toMatchObject({
			requirementId: "907829",
			title: "Wheel slip state quality handling",
		});
		expect(result.data.relationLeadCount).toBeGreaterThan(0);
		expect(result.data.riskSummaryByType.bosch_defect).toBeGreaterThan(0);
		expect(result.data.nextAction).toMatchObject({
			tool: "ascet_requirements",
			action: "risk_details",
			requirementId: "907829",
			offset: 0,
		});
		expect(JSON.stringify(result.data)).not.toContain("riskContentRaw");
		expect(JSON.stringify(result.data)).not.toContain("ascetImpactHint");
		expect(JSON.stringify(result.data)).not.toContain("Wheel speed quality defect propagated");
	});

	it("returns relation_leads separately from risk details", async () => {
		const result = await runAscetRequirements(
			{ action: "relation_leads", query: "907829", sourceFile: workbookPath },
			{ cwd: tempDir },
		);

		expect(result.ok).toBe(true);
		expect(result.action).toBe("relation_leads");
		expect(result.data.relationLeads.some((lead) => lead.relatedRequirementId === "76797")).toBe(true);
		expect(result.data.relationLeads.some((lead) => lead.relationType === "signal_family")).toBe(true);
		expect(result.data.relationLeads[0]).toMatchObject({
			leadId: expect.any(String),
			relationEvidence: expect.objectContaining({
				value: expect.any(String),
			}),
		});
		expect(JSON.stringify(result.data.relationLeads)).not.toContain("riskContentRaw");
	});

	it("returns paginated risk_details with raw evidence, deduplication, and completion state", async () => {
		const firstPage = await runAscetRequirements(
			{
				action: "risk_details",
				query: "907829",
				sourceFile: workbookPath,
				scope: "related",
				riskTypes: ["bosch_defect"],
				limit: 2,
				offset: 0,
			},
			{ cwd: tempDir },
		);
		const secondPage = await runAscetRequirements(
			{
				action: "risk_details",
				query: "907829",
				sourceFile: workbookPath,
				scope: "related",
				riskTypes: ["bosch_defect"],
				limit: 2,
				offset: 2,
			},
			{ cwd: tempDir },
		);

		expect(firstPage.ok).toBe(true);
		expect(firstPage.action).toBe("risk_details");
		expect(firstPage.data.totalCount).toBeGreaterThan(2);
		expect(firstPage.data.returnedCount).toBe(2);
		expect(firstPage.data.offset).toBe(0);
		expect(firstPage.data.limit).toBe(2);
		expect(firstPage.data.hasMore).toBe(true);
		expect(firstPage.data.nextOffset).toBe(2);
		expect(firstPage.data.detailCompletion).toMatchObject({
			allPagesRetrieved: false,
			evidenceComplete: true,
			truncated: false,
		});
		expect(firstPage.data.blockingReasons).toContain("pagination_incomplete");
		expect(firstPage.data.designGateReady).toBe(false);
		expect(firstPage.data.design_gate_ready).toBe(false);
		expect(firstPage.data.risks[0]).toMatchObject({
			riskId: expect.any(String),
			riskContentRaw: expect.stringContaining("Wheel speed quality defect"),
			riskIdentifiers: expect.arrayContaining(["6731279"]),
			evidence: expect.objectContaining({
				sheetName: "Sheet1",
				cellAddress: expect.any(String),
			}),
			impactBasis: expect.any(String),
		});

		const combinedIds = [...firstPage.data.risks, ...secondPage.data.risks].map((risk) => risk.riskId);
		expect(new Set(combinedIds).size).toBe(combinedIds.length);
	});

	it("marks illegal gate state combinations as invalid", async () => {
		const result = await runAscetRequirements(
			{
				action: "risk_context",
				query: "907829",
				sourceFile: workbookPath,
				debugForceGateState: {
					riskContextStage: "summary_only",
					evidenceStatus: "complete",
					readiness: "ready",
					designGateReady: true,
				},
			},
			{ cwd: tempDir },
		);

		expect(result.ok).toBe(true);
		expect(result.data.stateValid).toBe(false);
		expect(result.data.stateErrors).toContain(
			"design_gate_ready cannot be true when risk_context_stage is summary_only",
		);
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
		expect(result.data.blockingClarifications[0]?.question).toContain(
			"Which requirement should drive the ASCET design?",
		);
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
