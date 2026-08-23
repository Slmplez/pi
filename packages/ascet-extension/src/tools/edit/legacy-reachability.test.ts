import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../../../../..");

function readRepositoryFile(path: string): string {
	return readFileSync(resolve(repositoryRoot, path), "utf8");
}

test("normal create_dependent_chain route cannot reach legacy preview orchestration", () => {
	const serviceSource = readRepositoryFile("packages/ascet-extension/src/edit/service.ts");
	assert.match(serviceSource, /runAscetCreateDependentChain\(/u);
	assert.doesNotMatch(serviceSource, /runLegacyAscetCreateDependentChain/u);

	const source = readRepositoryFile("packages/ascet-extension/src/create-dependent-chain.ts");
	const publicStart = source.indexOf("export async function runAscetCreateDependentChain(");
	const legacyStart = source.indexOf("export async function runLegacyAscetCreateDependentChain(");
	assert.ok(publicStart >= 0 && legacyStart > publicStart);
	const publicRoute = source.slice(publicStart, legacyStart);
	assert.doesNotMatch(
		publicRoute,
		/collectCreateDependentChainPreflight|runGuardedAscetMutation|runAscetSearch|runAscetGet|runAscetReadElement/u,
	);
	assert.match(publicRoute, /intent: "apply"/u);
});

test("retained dependency preview is explicitly isolated and allowlisted as legacy-only", () => {
	const source = readRepositoryFile("packages/ascet-extension/src/create-dependent-chain.ts");
	assert.match(source, /@internal Legacy\/recovery-only orchestration/u);
	assert.match(source, /@internal Legacy\/recovery-only preview/u);

	const allowlist = readRepositoryFile("ascetcli/tests/allowlists/legacy.operations.txt");
	assert.match(allowlist, /^configure_parameter_dependency_chain_execute intent=preview$/mu);
});
