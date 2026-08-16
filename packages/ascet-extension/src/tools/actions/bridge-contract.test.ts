import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, test } from "node:test";
import { resolveAscetBackendCommandId } from "../../routing/command-aliases.ts";
import { listAscetActionContracts } from "./contract-registry.ts";

type CliCatalog = {
	commands?: Array<{
		id?: string;
		operation?: string;
		execution?: { operation?: string };
	}>;
};

const repositoryRoot = resolve(import.meta.dirname, "../../../../..");
const operationRegistrySource = readFileSync(
	resolve(repositoryRoot, "ascetcli/src/AscetCli/Routing/OperationRegistry.cs"),
	"utf8",
);
const registeredOperations = new Set(
	[...operationRegistrySource.matchAll(/Register(?:Typed|Legacy)\(descriptors, "([^"]+)"/g)].map((match) => match[1]),
);

function readCatalog(path: string): CliCatalog {
	return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, "")) as CliCatalog;
}

function commandsById(catalog: CliCatalog) {
	return new Map((catalog.commands ?? []).map((command) => [command.id, command]));
}

describe("ASCET Bridge action contracts", () => {
	test("reference matching CLI commands or registered direct Bridge operations", () => {
		const source = commandsById(readCatalog(resolve(repositoryRoot, "ascetcli/contracts/cli-catalog.json")));
		const packaged = commandsById(
			readCatalog(resolve(repositoryRoot, "packages/ascet-extension/ascet-cli/contracts/cli-catalog.json")),
		);

		for (const contract of listAscetActionContracts()) {
			if (contract.execution.kind !== "bridge") {
				continue;
			}
			const backendCommandId = resolveAscetBackendCommandId(contract.execution.logicalCommandId);
			const sourceCommand = source.get(backendCommandId);
			const packagedCommand = packaged.get(backendCommandId);
			if (sourceCommand || packagedCommand) {
				assert.ok(sourceCommand, `${contract.id}: missing source command ${backendCommandId}`);
				assert.ok(packagedCommand, `${contract.id}: missing packaged command ${backendCommandId}`);
				assert.equal(sourceCommand.operation ?? sourceCommand.execution?.operation, contract.execution.operation);
				assert.equal(
					packagedCommand.operation ?? packagedCommand.execution?.operation,
					contract.execution.operation,
				);
				continue;
			}
			assert.equal(
				registeredOperations.has(contract.execution.operation),
				true,
				`${contract.id}: missing Bridge operation ${contract.execution.operation}`,
			);
		}
	});
});
