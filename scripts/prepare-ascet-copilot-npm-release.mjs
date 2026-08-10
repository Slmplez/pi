import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ASCET_COPILOT_EXTERNAL_DEPENDENCIES = [
	"pi-subagents",
	"@juicesharp/rpiv-todo",
	"@juicesharp/rpiv-ask-user-question",
	"@narumitw/pi-goal",
	"pi-web-access",
];

export const DEFAULT_EXTERNAL_REGISTRY = "https://registry.npmjs.org/";

const packageFiles = {
	extension: "packages/ascet-extension/package.json",
	ui: "packages/Pi-ascet-ui-extension/package.json",
	aggregate: "release/ascet-copilot/package.json",
	releaseInfo: "packages/Pi-ascet-ui-extension/extensions/releaseInfo.ts",
};
const expectedNames = {
	extension: "@vaf-agentworks/ascet-copilot-extension",
	ui: "@vaf-agentworks/ascet-copilot-ui",
	aggregate: "@vaf-agentworks/ascet-copilot",
};
const stableVersionPattern = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;

export function assertStableVersion(version, label = "version") {
	if (!stableVersionPattern.test(version)) {
		throw new Error(`${label} must be an exact stable semantic version, received ${version}`);
	}
}

export function prepareReleaseState({
	extensionManifest,
	uiManifest,
	aggregateManifest,
	releaseInfoSource,
	targetVersion,
	externalVersions,
}) {
	assertManifestName(extensionManifest, expectedNames.extension, packageFiles.extension);
	assertManifestName(uiManifest, expectedNames.ui, packageFiles.ui);
	assertManifestName(aggregateManifest, expectedNames.aggregate, packageFiles.aggregate);
	assertStableVersion(targetVersion, "target version");

	const nextExtension = structuredClone(extensionManifest);
	const nextUi = structuredClone(uiManifest);
	const nextAggregate = structuredClone(aggregateManifest);
	const changes = [];

	setVersion(nextExtension, targetVersion, expectedNames.extension, changes);
	setVersion(nextUi, targetVersion, expectedNames.ui, changes);
	setVersion(nextAggregate, targetVersion, expectedNames.aggregate, changes);

	setDependency(nextAggregate, expectedNames.extension, targetVersion, changes);
	setDependency(nextAggregate, expectedNames.ui, targetVersion, changes);

	for (const dependency of ASCET_COPILOT_EXTERNAL_DEPENDENCIES) {
		const latestVersion = externalVersions[dependency];
		if (typeof latestVersion !== "string") {
			throw new Error(`Missing latest version for ${dependency}`);
		}
		assertStableVersion(latestVersion, dependency);
		setDependency(nextAggregate, dependency, latestVersion, changes);
	}

	const bundledDependencies = new Set(nextAggregate.bundledDependencies ?? []);
	for (const dependency of [
		expectedNames.extension,
		expectedNames.ui,
		...ASCET_COPILOT_EXTERNAL_DEPENDENCIES,
	]) {
		if (!bundledDependencies.has(dependency)) {
			throw new Error(`${dependency} must remain in bundledDependencies`);
		}
	}

	const nextReleaseInfo = updateReleaseInfoVersion(releaseInfoSource, targetVersion, changes);
	return {
		extensionManifest: nextExtension,
		uiManifest: nextUi,
		aggregateManifest: nextAggregate,
		releaseInfoSource: nextReleaseInfo,
		changes,
	};
}

export function updateReleaseInfoVersion(source, targetVersion, changes = []) {
	const releaseMarker = "export const ASCET_COPILOT_RELEASE";
	const releaseIndex = source.indexOf(releaseMarker);
	if (releaseIndex < 0) {
		throw new Error("ASCET_COPILOT_RELEASE marker was not found");
	}
	const versionPattern = /version:\s*"(\d+\.\d+\.\d+)"/;
	const releaseSource = source.slice(releaseIndex);
	const match = releaseSource.match(versionPattern);
	if (!match || match.index === undefined) {
		throw new Error("ASCET_COPILOT_RELEASE version was not found");
	}
	const currentVersion = match[1];
	if (currentVersion === targetVersion) return source;
	changes.push(`UI release metadata: ${currentVersion} -> ${targetVersion}`);
	const absoluteIndex = releaseIndex + match.index;
	return `${source.slice(0, absoluteIndex)}${match[0].replace(currentVersion, targetVersion)}${source.slice(
		absoluteIndex + match[0].length,
	)}`;
}

function assertManifestName(manifest, expectedName, path) {
	if (manifest.name !== expectedName) {
		throw new Error(`${path} must describe ${expectedName}, received ${manifest.name}`);
	}
}

function setVersion(manifest, targetVersion, packageName, changes) {
	if (manifest.version === targetVersion) return;
	changes.push(`${packageName}: ${manifest.version} -> ${targetVersion}`);
	manifest.version = targetVersion;
}

function setDependency(manifest, dependency, targetVersion, changes) {
	if (!manifest.dependencies || typeof manifest.dependencies[dependency] !== "string") {
		throw new Error(`${dependency} is missing from aggregate dependencies`);
	}
	const currentVersion = manifest.dependencies[dependency];
	if (currentVersion === targetVersion) return;
	changes.push(`${dependency}: ${currentVersion} -> ${targetVersion}`);
	manifest.dependencies[dependency] = targetVersion;
}

function parseArguments(args) {
	let targetVersion;
	let write = false;
	let allowBreakingDependencyUpdates = false;
	let registry = process.env.ASCET_COPILOT_DEPENDENCY_REGISTRY ?? DEFAULT_EXTERNAL_REGISTRY;

	for (let index = 0; index < args.length; index++) {
		const argument = args[index];
		if (argument === "--write") {
			write = true;
			continue;
		}
		if (argument === "--allow-breaking-dependency-updates") {
			allowBreakingDependencyUpdates = true;
			continue;
		}
		if (argument === "--version") {
			targetVersion = args[index + 1];
			index++;
			continue;
		}
		if (argument === "--registry") {
			registry = args[index + 1];
			index++;
			continue;
		}
		throw new Error(`Unknown argument: ${argument}`);
	}

	if (!targetVersion) {
		throw new Error("Usage: node scripts/prepare-ascet-copilot-npm-release.mjs --version X.Y.Z [--write]");
	}
	assertStableVersion(targetVersion, "target version");
	return { targetVersion, write, registry, allowBreakingDependencyUpdates };
}

export function selectHighestStableVersion(value, packageName) {
	const versions = Array.isArray(value) ? value : [value];
	const stableVersions = versions.filter(
		(version) => typeof version === "string" && stableVersionPattern.test(version),
	);
	if (stableVersions.length === 0) {
		throw new Error(`npm view returned no stable version for ${packageName}`);
	}
	return stableVersions.sort(compareStableVersions).at(-1);
}

function compareStableVersions(left, right) {
	const leftParts = left.split(".").map(Number);
	const rightParts = right.split(".").map(Number);
	for (let index = 0; index < 3; index++) {
		if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
	}
	return 0;
}

function queryLatestVersion(packageName, currentVersion, registry, allowBreakingDependencyUpdates) {
	assertStableVersion(currentVersion, `${packageName} current version`);
	const requestedVersion = allowBreakingDependencyUpdates ? "latest" : `^${currentVersion}`;
	const npmArguments = [
		"view",
		`${packageName}@${requestedVersion}`,
		"version",
		"--json",
		`--registry=${registry}`,
	];
	const configuredNpmCli = process.env.npm_execpath;
	const bundledNpmCli = resolve(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
	const useNodeNpmCli =
		typeof configuredNpmCli === "string" || (process.platform === "win32" && existsSync(bundledNpmCli));
	const executable = useNodeNpmCli ? process.execPath : "npm";
	const executableArguments = useNodeNpmCli
		? [configuredNpmCli ?? bundledNpmCli, ...npmArguments]
		: npmArguments;
	const output = execFileSync(executable, executableArguments, {
		encoding: "utf8",
		env: { ...process.env, npm_config_min_release_age: "0" },
		stdio: ["ignore", "pipe", "inherit"],
	}).trim();
	const version = selectHighestStableVersion(JSON.parse(output), packageName);
	assertStableVersion(version, packageName);
	return version;
}

function readJson(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value, indentation) {
	writeFileSync(path, `${JSON.stringify(value, null, indentation)}\n`, "utf8");
}

function run() {
	const { targetVersion, write, registry, allowBreakingDependencyUpdates } = parseArguments(
		process.argv.slice(2),
	);
	const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
	const resolvedPaths = Object.fromEntries(
		Object.entries(packageFiles).map(([key, path]) => [key, resolve(repoRoot, path)]),
	);
	const extensionManifest = readJson(resolvedPaths.extension);
	const uiManifest = readJson(resolvedPaths.ui);
	const aggregateManifest = readJson(resolvedPaths.aggregate);
	const externalVersions = Object.fromEntries(
		ASCET_COPILOT_EXTERNAL_DEPENDENCIES.map((dependency) => [
			dependency,
			queryLatestVersion(
				dependency,
				aggregateManifest.dependencies?.[dependency],
				registry,
				allowBreakingDependencyUpdates,
			),
		]),
	);
	const result = prepareReleaseState({
		extensionManifest,
		uiManifest,
		aggregateManifest,
		releaseInfoSource: readFileSync(resolvedPaths.releaseInfo, "utf8"),
		targetVersion,
		externalVersions,
	});

	console.log(`Target ASCET Copilot version: ${targetVersion}`);
	console.log(`External dependency registry: ${registry}`);
	console.log(
		`Dependency update policy: ${
			allowBreakingDependencyUpdates ? "latest, including breaking changes" : "compatible stable versions only"
		}`,
	);
	for (const dependency of ASCET_COPILOT_EXTERNAL_DEPENDENCIES) {
		console.log(`  ${dependency}: ${externalVersions[dependency]}`);
	}
	if (result.changes.length === 0) {
		console.log("No manifest or release metadata changes are required.");
	} else {
		console.log("Planned changes:");
		for (const change of result.changes) console.log(`  ${change}`);
	}

	if (!write) {
		console.log("Dry run only. Re-run with --write after reviewing the plan.");
		return;
	}

	writeJson(resolvedPaths.extension, result.extensionManifest, "\t");
	writeJson(resolvedPaths.ui, result.uiManifest, 2);
	writeJson(resolvedPaths.aggregate, result.aggregateManifest, 2);
	writeFileSync(resolvedPaths.releaseInfo, result.releaseInfoSource, "utf8");
	console.log("Updated ASCET Copilot manifests and UI release metadata.");
	console.log("Regenerate lockfiles and complete the release gates before publishing.");
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
	run();
}
