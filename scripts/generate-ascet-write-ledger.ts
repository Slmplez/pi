import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createAscetWriteLedger } from "../packages/ascet-extension/src/edit/write-ledger.ts";

const [inputArg, ledgerArg, summaryArg] = process.argv.slice(2);
if (!inputArg || !ledgerArg || !summaryArg) {
	console.error("Usage: tsx scripts/generate-ascet-write-ledger.ts <raw-jsonl> <ledger-json> <summary-json>");
	process.exitCode = 1;
} else {
	const inputPath = resolve(inputArg);
	const ledgerPath = resolve(ledgerArg);
	const summaryPath = resolve(summaryArg);
	const result = createAscetWriteLedger(readFileSync(inputPath, "utf8"));
	mkdirSync(dirname(ledgerPath), { recursive: true });
	mkdirSync(dirname(summaryPath), { recursive: true });
	writeFileSync(ledgerPath, `${JSON.stringify(result.ledger, null, 2)}\n`, "utf8");
	writeFileSync(summaryPath, `${JSON.stringify(result.summary, null, 2)}\n`, "utf8");
	console.log(`Generated ${result.ledger.eventCount} ASCET write ledger events.`);
}