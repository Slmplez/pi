import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyAscetCliCommand } from "../../ascet-extension/src/routing/coverage.ts";
import { repoRoot } from "./ascet-extension-test-helpers.ts";

interface AscetCatalogCommand {
	id: string;
	hiddenFromModel?: boolean;
}

interface AscetCatalog {
	commands: AscetCatalogCommand[];
}

function readCatalog(): AscetCatalog {
	return JSON.parse(
		readFileSync(join(repoRoot, "packages/ascet-extension/ascet-cli/contracts/cli-catalog.json"), "utf8").replace(
			/^\uFEFF/,
			"",
		),
	) as AscetCatalog;
}

describe("ASCET CLI catalog coverage", () => {
	it("classifies every visible CLI command without legacy_alias", () => {
		const visibleCommands = readCatalog().commands.filter((command) => command.hiddenFromModel !== true);

		for (const command of visibleCommands) {
			const coverage = classifyAscetCliCommand(command.id);
			expect(coverage.commandId).toBe(command.id);
			expect(["exposed_by_canonical_tool", "backend_alias", "internal_only", "unsupported_with_reason"]).toContain(
				coverage.category,
			);
			expect(coverage.category).not.toBe("legacy_alias");
			expect(coverage.reason.length).toBeGreaterThan(0);
		}
	});

	it("keeps AscetReadTextCode as a backend alias for logical AscetReadCode", () => {
		expect(classifyAscetCliCommand("AscetReadTextCode")).toMatchObject({
			category: "backend_alias",
			logicalCommandId: "AscetReadCode",
			toolName: "ascet_read",
			action: "read_code",
		});
	});
});
