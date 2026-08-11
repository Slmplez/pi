import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	type AscetActionCatalogSnapshot,
	createActionCatalogSnapshot,
	diffActionCatalogSnapshots,
} from "../packages/ascet-extension/src/tools/actions/catalog.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const snapshotRelativePath = "packages/ascet-extension/contracts/catalog-snapshot.json";
const snapshotPath = resolve(repositoryRoot, snapshotRelativePath);
const currentSnapshot = createActionCatalogSnapshot({ includeHidden: true });
const content = `${JSON.stringify(currentSnapshot, null, 2)}\n`;
const args = process.argv.slice(2);
const breakingIndex = args.indexOf("--check-breaking");

if (breakingIndex >= 0) {
	const baseRef = args[breakingIndex + 1];
	if (!baseRef) {
		console.error("ASCET Action Catalog breaking check requires a Git base ref.");
		process.exitCode = 1;
	} else {
		try {
			execFileSync("git", ["rev-parse", "--verify", baseRef], { cwd: repositoryRoot, stdio: "ignore" });
			let previousContent: string;
			try {
				previousContent = execFileSync("git", ["show", `${baseRef}:${snapshotRelativePath}`], {
					cwd: repositoryRoot,
					encoding: "utf8",
				});
			} catch {
				console.log(`No ASCET Action Catalog baseline exists at ${baseRef}; compatibility check is not required.`);
				process.exit(0);
			}
			const previousSnapshot = JSON.parse(previousContent) as AscetActionCatalogSnapshot;
			const diff = diffActionCatalogSnapshots(previousSnapshot, currentSnapshot);
			for (const change of diff.changes) {
				console.log(
					`${change.breaking ? "BREAKING" : "DRIFT"} ${change.id} ${change.classification}${change.reasons.length > 0 ? ` ${change.reasons.join(",")}` : ""}`,
				);
			}
			if (diff.breakingSchemaChange) {
				process.exitCode = 1;
			}
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	}
} else if (args.includes("--check")) {
	let existing = "";
	try {
		existing = readFileSync(snapshotPath, "utf8");
	} catch {
		console.error(`ASCET Action Catalog snapshot is missing: ${snapshotPath}`);
		process.exitCode = 1;
	}
	if (existing.length > 0 && existing !== content) {
		console.error("ASCET Action Catalog snapshot is stale. Run npm run generate:ascet-action-catalog.");
		process.exitCode = 1;
	}
} else {
	mkdirSync(dirname(snapshotPath), { recursive: true });
	writeFileSync(snapshotPath, content, "utf8");
	console.log(`Wrote ${snapshotPath}`);
}