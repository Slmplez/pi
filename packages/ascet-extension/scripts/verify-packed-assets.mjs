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
