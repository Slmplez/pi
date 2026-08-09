import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ascetRouteManifestEntries } from "../packages/ascet-extension/src/routing/route-manifests.ts";

interface BridgeCapabilitiesEnvelope {
	ok: boolean;
	result?: {
		modes?: string[];
		operations?: string[];
	};
}

const scriptDirectory = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(scriptDirectory, "..");
const operationRegistryPath = resolve(repoRoot, "ascetcli/src/AscetCli/Routing/OperationRegistry.cs");
const operationRegistrySource = readFileSync(operationRegistryPath, "utf8");
const registeredOperations = new Set(
	[...operationRegistrySource.matchAll(/Register(?:Typed|Legacy)\(descriptors,\s*"([^"]+)"/gu)].map(
		(match) => match[1],
	),
);

const typescriptCompositeTools = new Set(["configure_parameter_dependency_chain", "ascet_batch_write"]);
const requiredToolOperations = new Set(
	ascetRouteManifestEntries
		.filter((entry) => entry.category === "domain" && !typescriptCompositeTools.has(entry.toolName))
		.map((entry) => entry.operation),
);

// ascet_diff(action="diff") selects these operations dynamically from objectKind.
for (const operation of ["diff_class", "diff_module", "diff_state_machine"]) {
	requiredToolOperations.add(operation);
}

const missingFromRegistry = [...requiredToolOperations].filter((operation) => !registeredOperations.has(operation)).sort();
if (missingFromRegistry.length > 0) {
	throw new Error(`ASCET tools reference operations missing from OperationRegistry: ${missingFromRegistry.join(", ")}`);
}

let binaryOperationCount: number | undefined;
if (process.platform === "win32") {
	const bridgePath = resolve(repoRoot, "packages/ascet-extension/ascet-cli/bin/AscetBridge.exe");
	if (!existsSync(bridgePath)) {
		throw new Error(`Packaged ASCET Bridge is missing: ${bridgePath}`);
	}
	const envelope = JSON.parse(
		execFileSync(bridgePath, ["capabilities", "--json"], { encoding: "utf8" }),
	) as BridgeCapabilitiesEnvelope;
	if (!envelope.ok || !envelope.result) {
		throw new Error("Packaged ASCET Bridge capabilities returned an invalid envelope.");
	}
	const bridgeOperations = new Set(envelope.result.operations ?? []);
	const missingFromBinary = [...requiredToolOperations].filter((operation) => !bridgeOperations.has(operation)).sort();
	if (missingFromBinary.length > 0) {
		throw new Error(`ASCET tools reference operations missing from packaged AscetBridge.exe: ${missingFromBinary.join(", ")}`);
	}
	for (const mode of ["exec", "batch", "capabilities", "selftest"]) {
		if (!envelope.result.modes?.includes(mode)) {
			throw new Error(`Packaged AscetBridge.exe is missing required mode '${mode}'.`);
		}
	}
	binaryOperationCount = bridgeOperations.size;
}

console.log(
	`ASCET tool/Bridge coverage passed: ${requiredToolOperations.size} required tool operations, ` +
		`${registeredOperations.size} registered operations` +
		(binaryOperationCount === undefined ? "." : `, ${binaryOperationCount} packaged Bridge operations.`),
);