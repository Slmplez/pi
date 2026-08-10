import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { DefaultPackageManager } from "../../coding-agent/src/core/package-manager.ts";
import { SettingsManager } from "../../coding-agent/src/core/settings-manager.ts";

interface PackedReport {
	filename?: string;
}

interface ExtensionManifest {
	pi?: {
		skills?: string[];
	};
}

const expectedSkillFiles = [
	"SKILL.md",
	"agents/openai.yaml",
	"references/scope-resolution-and-ownership.md",
	"references/database-root-discovery.md",
	"references/customer-integration-workflow.md",
	"references/feature-package-workflow.md",
	"references/class-path-project-context.md",
	"references/project-to-esdl-signal-flow.md",
	"references/esdl-fast-path.md",
	"references/elements-fast-path.md",
	"references/parameter-naming.md",
	"references/parameter-provider-placement.md",
	"references/dependency-advanced-path.md",
	"references/bde-and-surface-routing.md",
	"references/task-planning-and-implementation-plan.md",
	"references/esdl-design-and-signal-reuse.md",
	"references/esdl-literals-and-configuration-values.md",
	"references/tool-recipes.md",
	"references/write-execution.md",
] as const;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const npmCli = process.env.npm_execpath;
if (!npmCli) {
	throw new Error("npm_execpath is unavailable; run this verifier through npm run verify-isolated-install.");
}

function runNpm(args: string[], cwd: string): string {
	const result = spawnSync(process.execPath, [npmCli, ...args], {
		cwd,
		encoding: "utf8",
		windowsHide: true,
	});
	if (result.status !== 0) {
		throw new Error(
			`npm ${args.join(" ")} failed: ${result.error?.message ?? `exit ${result.status}`}\n${result.stdout ?? ""}\n${result.stderr ?? ""}`,
		);
	}
	return result.stdout;
}

function assertCondition(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

const tempRoot = mkdtempSync(join(tmpdir(), "ascet-skill-install-"));
try {
	writeFileSync(
		join(tempRoot, "package.json"),
		`${JSON.stringify({ name: "ascet-skill-isolated-check", private: true, type: "module" }, null, 2)}\n`,
		"utf8",
	);
	const packedOutput = runNpm(["pack", "--json", "--ignore-scripts", "--pack-destination", tempRoot], packageRoot);
	const reports = JSON.parse(packedOutput) as PackedReport[];
	const reportedFilename = reports[0]?.filename;
	const tarballName =
		typeof reportedFilename === "string"
			? basename(reportedFilename)
			: readdirSync(tempRoot).find((entry) => entry.endsWith(".tgz"));
	assertCondition(tarballName, "npm pack did not produce an ASCET extension tarball.");
	const tarballPath = join(tempRoot, tarballName);

	runNpm(
		[
			"install",
			"--ignore-scripts",
			"--no-package-lock",
			"--omit=peer",
			"--workspaces=false",
			tarballPath,
		],
		tempRoot,
	);

	const installedRoot = join(tempRoot, "node_modules", "@vaf-agentworks", "ascet-copilot-extension");
	const manifestPath = join(installedRoot, "package.json");
	assertCondition(existsSync(manifestPath), `Installed package manifest is missing: ${manifestPath}`);
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as ExtensionManifest;
	assertCondition(
		manifest.pi?.skills?.includes("skills/ascet-engineering"),
		"Installed package manifest does not declare skills/ascet-engineering.",
	);
	const skillRoot = join(installedRoot, "skills", "ascet-engineering");
	for (const relativePath of expectedSkillFiles) {
		assertCondition(existsSync(join(skillRoot, relativePath)), `Installed Skill file is missing: ${relativePath}`);
	}
	assertCondition(!existsSync(join(installedRoot, "agents")), "Installed package contains removed ASCET checker agents.");
	assertCondition(
		!existsSync(join(installedRoot, "skills", "ascet-full-check")),
		"Installed package contains the removed ascet-full-check Skill.",
	);
	assertCondition(
		!existsSync(join(installedRoot, "templates", "ascet-project", "rules", "tools", "verify.md")),
		"Installed package contains the removed standalone verification workflow.",
	);

	const agentDir = join(tempRoot, "agent");
	mkdirSync(agentDir, { recursive: true });
	const packageManager = new DefaultPackageManager({
		cwd: tempRoot,
		agentDir,
		settingsManager: SettingsManager.inMemory(),
	});
	const resolved = await packageManager.resolveExtensionSources([installedRoot], { temporary: true });
	const normalizedSkillSuffix = ["skills", "ascet-engineering", "SKILL.md"].join("/");
	const discoveredSkill = resolved.skills.find(
		(resource) => resource.enabled && resource.path.replaceAll("\\", "/").endsWith(normalizedSkillSuffix),
	);
	assertCondition(discoveredSkill, "Pi package resource discovery did not find ascet-engineering/SKILL.md.");

	console.log(
		JSON.stringify(
			{
				installedOutsideRepository: !resolve(installedRoot).startsWith(`${resolve(packageRoot)}${sep}`),
				declaredSkill: manifest.pi?.skills,
				discoveredSkill: discoveredSkill.path,
				installedSkillFiles: expectedSkillFiles.length,
				removedAscetCheckerAgentsAbsent: true,
				removedFullCheckSkillAbsent: true,
				standaloneVerificationWorkflowAbsent: true,
			},
			null,
			2,
		),
	);
} finally {
	const resolvedTempRoot = resolve(tempRoot);
	const resolvedSystemTemp = resolve(tmpdir());
	if (
		!resolvedTempRoot.startsWith(`${resolvedSystemTemp}${sep}`) ||
		!basename(resolvedTempRoot).startsWith("ascet-skill-install-")
	) {
		throw new Error(`Refusing to remove unexpected isolated-install path: ${resolvedTempRoot}`);
	}
	rmSync(resolvedTempRoot, { recursive: true, force: true });
}