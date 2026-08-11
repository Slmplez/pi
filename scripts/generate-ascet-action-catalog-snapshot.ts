import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createActionCatalogSnapshot } from "../packages/ascet-extension/src/tools/actions/catalog.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = resolve(repositoryRoot, "packages/ascet-extension/contracts/catalog-snapshot.json");
const content = `${JSON.stringify(createActionCatalogSnapshot({ includeHidden: true }), null, 2)}\n`;

if (process.argv.includes("--check")) {
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
