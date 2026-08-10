import { spawnSync } from "node:child_process";

const npmCli = process.env.npm_execpath;
if (!npmCli) {
	throw new Error("npm_execpath is unavailable; run this verifier through npm run verify-assets.");
}
const packed = spawnSync(process.execPath, [npmCli, "pack", "--dry-run", "--json", "--ignore-scripts"], {
	cwd: new URL("..", import.meta.url),
	encoding: "utf8",
	windowsHide: true,
});
if (packed.status !== 0) {
	throw new Error(
		`npm pack --dry-run failed: ${packed.error?.message ?? `exit ${packed.status}`}\n${packed.stdout ?? ""}\n${packed.stderr ?? ""}`,
	);
}
const reports = JSON.parse(packed.stdout);
if (!Array.isArray(reports) || reports.length !== 1 || !Array.isArray(reports[0].files)) {
	throw new Error("npm pack --dry-run returned an unexpected report shape.");
}
const paths = reports[0].files.map((file) => file.path.replaceAll("\\", "/"));
const expectedSkillFiles = [
	"skills/ascet-engineering/SKILL.md",
	"skills/ascet-engineering/agents/openai.yaml",
	"skills/ascet-engineering/references/scope-resolution-and-ownership.md",
	"skills/ascet-engineering/references/database-root-discovery.md",
	"skills/ascet-engineering/references/customer-integration-workflow.md",
	"skills/ascet-engineering/references/feature-package-workflow.md",
	"skills/ascet-engineering/references/class-path-project-context.md",
	"skills/ascet-engineering/references/project-to-esdl-signal-flow.md",
	"skills/ascet-engineering/references/esdl-fast-path.md",
	"skills/ascet-engineering/references/elements-fast-path.md",
	"skills/ascet-engineering/references/parameter-naming.md",
	"skills/ascet-engineering/references/parameter-provider-placement.md",
	"skills/ascet-engineering/references/dependency-advanced-path.md",
	"skills/ascet-engineering/references/bde-and-surface-routing.md",
	"skills/ascet-engineering/references/task-planning-and-implementation-plan.md",
	"skills/ascet-engineering/references/esdl-design-and-signal-reuse.md",
	"skills/ascet-engineering/references/esdl-literals-and-configuration-values.md",
	"skills/ascet-engineering/references/tool-recipes.md",
	"skills/ascet-engineering/references/write-execution.md",
];
const missingSkillFiles = expectedSkillFiles.filter((path) => !paths.includes(path));
if (missingSkillFiles.length > 0) {
	throw new Error(`Packed ASCET extension is missing Skill files: [${missingSkillFiles.join(", ")}]`);
}
if (paths.includes("agents/ascet-implementation.md")) {
	throw new Error("Packed ASCET extension contains removed agents/ascet-implementation.md.");
}
if (paths.includes("templates/ascet-project/rules/tools/verify.md")) {
	throw new Error("Packed ASCET extension contains the removed standalone verification workflow.");
}
const binaryPaths = paths.filter((path) => path.startsWith("ascet-cli/bin/"));
const expectedBinaryPaths = ["ascet-cli/bin/AscetBridge.exe", "ascet-cli/bin/Ascetapidll/Etas.AscetNET.dll"];
const missing = expectedBinaryPaths.filter((path) => !binaryPaths.includes(path));
const unexpected = binaryPaths.filter((path) => !expectedBinaryPaths.includes(path));
if (binaryPaths.length !== 2 || missing.length > 0 || unexpected.length > 0) {
	throw new Error(`Packed ASCET Bridge allowlist mismatch. Missing: [${missing.join(", ")}]. Unexpected: [${unexpected.join(", ")}].`);
}
if (!paths.includes("ascet-cli/contracts/cli-catalog.json")) {
	throw new Error("Packed extension is missing ascet-cli/contracts/cli-catalog.json.");
}
console.log("Packed ASCET extension contains exactly 1 Bridge EXE and 1 ToolAPI DLL.");
