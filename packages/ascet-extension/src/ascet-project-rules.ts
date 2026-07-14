import { existsSync } from "node:fs";
import { cp, mkdir, readFile } from "node:fs/promises";
import { basename, isAbsolute, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface AscetInitEntrypoint {
	id: string;
	path: string;
	content: string;
}

interface AscetRulesManifestRule {
	id: string;
	path: string;
	layer?: string;
}

interface AscetRulesManifest {
	default_entrypoints: string[];
	init_bundle?: string[];
	rules: AscetRulesManifestRule[];
}

const TEMPLATE_RULES_DIR = normalize(fileURLToPath(new URL("../templates/ascet-project/rules", import.meta.url)));

function getRepoAscetRulesDir(projectRoot: string): string {
	return normalize(resolve(projectRoot, ".ascet", "rules"));
}

function getManifestPath(rulesDir: string): string {
	return join(rulesDir, "manifest.yaml");
}

function parseInlineString(value: string): string {
	return value.trim().replace(/^["']|["']$/g, "");
}

function parseAscetRulesManifest(content: string): AscetRulesManifest {
	const defaultEntrypoints: string[] = [];
	const initBundle: string[] = [];
	const rules: AscetRulesManifestRule[] = [];
	let section: "default_entrypoints" | "init_bundle" | "rules" | undefined;
	let currentRule: Partial<AscetRulesManifestRule> | undefined;

	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;

		if (line === "default_entrypoints:") {
			section = "default_entrypoints";
			continue;
		}
		if (line === "init_bundle:") {
			section = "init_bundle";
			continue;
		}
		if (line === "rules:") {
			section = "rules";
			continue;
		}
		if (line.endsWith(":") && !line.startsWith("-")) {
			section = undefined;
			continue;
		}

		if (section === "default_entrypoints" && line.startsWith("- ")) {
			defaultEntrypoints.push(parseInlineString(line.slice(2)));
			continue;
		}

		if (section === "init_bundle" && line.startsWith("- ")) {
			initBundle.push(parseInlineString(line.slice(2)));
			continue;
		}

		if (section === "rules" && line.startsWith("- ")) {
			if (currentRule?.id && currentRule.path) {
				rules.push({ id: currentRule.id, path: currentRule.path, layer: currentRule.layer });
			}
			currentRule = {};
			const inline = line.slice(2).trim();
			if (inline.startsWith("id:")) {
				currentRule.id = parseInlineString(inline.slice("id:".length));
			}
			continue;
		}

		if (section === "rules" && currentRule && line.includes(":")) {
			const [key, ...valueParts] = line.split(":");
			const value = parseInlineString(valueParts.join(":"));
			if (key === "id") currentRule.id = value;
			if (key === "path") currentRule.path = value;
			if (key === "layer") currentRule.layer = value;
		}
	}

	if (currentRule?.id && currentRule.path) {
		rules.push({ id: currentRule.id, path: currentRule.path, layer: currentRule.layer });
	}

	return { default_entrypoints: defaultEntrypoints, init_bundle: initBundle, rules };
}

function resolveEntrypointPathWithinRulesDir(rulesDir: string, entrypointPath: string): string {
	const resolvedPath = normalize(resolve(rulesDir, entrypointPath));
	const relativePath = relative(rulesDir, resolvedPath);
	if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
		throw new Error(`ASCET default entrypoint escapes rules directory: ${entrypointPath}`);
	}
	return resolvedPath;
}

export async function ensureRepoAscetRulesScaffold(projectRoot: string): Promise<{
	created: boolean;
	rulesDir: string;
}> {
	const rulesDir = getRepoAscetRulesDir(projectRoot);
	if (existsSync(getManifestPath(rulesDir))) {
		return { created: false, rulesDir };
	}

	if (!existsSync(getManifestPath(TEMPLATE_RULES_DIR))) {
		throw new Error(`ASCET project rules template not found: ${TEMPLATE_RULES_DIR}`);
	}

	await mkdir(resolve(projectRoot, ".ascet"), { recursive: true });
	await cp(TEMPLATE_RULES_DIR, rulesDir, { recursive: true, force: false, errorOnExist: false });
	return { created: true, rulesDir };
}

export async function loadAscetInitEntrypoints(rulesDir: string): Promise<AscetInitEntrypoint[]> {
	const manifestPath = getManifestPath(rulesDir);
	const manifest = parseAscetRulesManifest(await readFile(manifestPath, "utf8"));

	return loadRulesByIds(
		rulesDir,
		manifest,
		manifest.default_entrypoints,
		"ASCET default entrypoint is missing from manifest rules",
	);
}

export async function loadAscetInitRuleBundle(rulesDir: string): Promise<AscetInitEntrypoint[]> {
	const manifestPath = getManifestPath(rulesDir);
	const manifest = parseAscetRulesManifest(await readFile(manifestPath, "utf8"));
	const ids = manifest.init_bundle?.length ? manifest.init_bundle : manifest.default_entrypoints;

	return loadRulesByIds(rulesDir, manifest, ids, "ASCET init bundle entry is missing from manifest rules");
}

async function loadRulesByIds(
	rulesDir: string,
	manifest: AscetRulesManifest,
	ids: string[],
	missingMessage: string,
): Promise<AscetInitEntrypoint[]> {
	return Promise.all(
		ids.map(async (entrypointId) => {
			const rule = manifest.rules.find((candidate) => candidate.id === entrypointId);
			if (!rule) {
				throw new Error(`${missingMessage}: ${entrypointId}`);
			}
			const resolvedPath = resolveEntrypointPathWithinRulesDir(rulesDir, rule.path);
			return {
				id: rule.id,
				path: rule.path,
				content: await readFile(resolvedPath, "utf8"),
			};
		}),
	);
}

export function renderAscetInitRulesPrompt(entrypoints: AscetInitEntrypoint[]): string {
	const lines = [
		"ASCET project rules loaded for this command only.",
		"Source: <repo>/.ascet/rules",
		"Loaded entrypoints:",
		...entrypoints.map((entrypoint) => `- ${entrypoint.path}`),
		"",
	];

	for (const entrypoint of entrypoints) {
		lines.push(`<file: ${basename(entrypoint.path) === entrypoint.path ? entrypoint.path : entrypoint.path}>`);
		lines.push(entrypoint.content.trimEnd());
		lines.push("");
	}

	return lines.join("\n").trimEnd();
}
