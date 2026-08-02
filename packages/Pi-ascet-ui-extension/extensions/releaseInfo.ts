import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";

export type ReleaseInfo = {
	packageName: string;
	version: string;
	highlights: string[];
	updateCommand: string;
};

export type CachedUpdateInfo = {
	checkedAt: number;
	latestVersion: string;
};

export type UpdateState =
	| { status: "checking" }
	| { status: "current"; latestVersion: string }
	| { status: "available"; latestVersion: string }
	| { status: "unavailable" };

export type UpdateCheckOptions = {
	currentVersion?: string;
	now?: Date;
	cacheTtlMs?: number;
	fetchLatestVersion?: () => Promise<string>;
	readCache?: () => Promise<CachedUpdateInfo | undefined>;
	writeCache?: (cache: CachedUpdateInfo) => Promise<void>;
};

const ONE_HOUR_MS = 60 * 60 * 1000;
const UPDATE_CACHE_PATH = join(getAgentDir(), "ascet-copilot", "update-cache.json");

export const ASCET_COPILOT_RELEASE: ReleaseInfo = {
	packageName: "@zeerke/ascet-copilot",
	version: "0.1.34",
	highlights: [
		"ASCET CLI 6.1.4 runtime DLL",
		"ASCET test apply and batch flow",
		"Test report diagnostics",
	],
	updateCommand: "pi update npm:@zeerke/ascet-copilot",
};

export async function checkAscetCopilotUpdate(options: UpdateCheckOptions = {}): Promise<UpdateState> {
	const currentVersion = options.currentVersion ?? ASCET_COPILOT_RELEASE.version;
	const now = options.now ?? new Date();
	const cacheTtlMs = options.cacheTtlMs ?? ONE_HOUR_MS;
	const readCache = options.readCache ?? readUpdateCache;
	const writeCache = options.writeCache ?? writeUpdateCache;
	const fetchLatestVersion = options.fetchLatestVersion ?? fetchNpmLatestVersion;

	try {
		const cached = await readCache();
		if (isFreshCache(cached, now, cacheTtlMs)) {
			return createUpdateState(currentVersion, cached.latestVersion);
		}

		const latestVersion = await fetchLatestVersion();
		await writeCache({ checkedAt: now.getTime(), latestVersion });
		return createUpdateState(currentVersion, latestVersion);
	} catch {
		return { status: "unavailable" };
	}
}

export function createReleaseRows(state: UpdateState, release: ReleaseInfo = ASCET_COPILOT_RELEASE): string[] {
	if (state.status === "available") {
		return ["Update available", `${release.version} -> ${state.latestVersion}`, release.updateCommand];
	}

	if (state.status === "current") {
		return ["Release", `${release.version} - Up to date`, ...release.highlights];
	}

	if (state.status === "unavailable") {
		return ["Release", `${release.version} - update check unavailable`, ...release.highlights];
	}

	return [
		"Release",
		`${release.version} - ${release.highlights[0] ?? "ASCET Copilot"}`,
		...release.highlights.slice(1),
		"Checking updates...",
	];
}

export function isVersionGreater(candidate: string, current: string): boolean {
	const candidateParts = parseStableVersion(candidate);
	const currentParts = parseStableVersion(current);
	if (!candidateParts || !currentParts) return false;

	for (let i = 0; i < 3; i++) {
		if (candidateParts[i] > currentParts[i]) return true;
		if (candidateParts[i] < currentParts[i]) return false;
	}
	return false;
}

function createUpdateState(currentVersion: string, latestVersion: string): UpdateState {
	if (isVersionGreater(latestVersion, currentVersion)) {
		return { status: "available", latestVersion };
	}
	return { status: "current", latestVersion };
}

function isFreshCache(
	cache: CachedUpdateInfo | undefined,
	now: Date,
	cacheTtlMs: number,
): cache is CachedUpdateInfo {
	return (
		typeof cache?.latestVersion === "string" &&
		Number.isFinite(cache.checkedAt) &&
		now.getTime() - cache.checkedAt >= 0 &&
		now.getTime() - cache.checkedAt < cacheTtlMs
	);
}

function parseStableVersion(version: string): [number, number, number] | undefined {
	if (!/^\d+\.\d+\.\d+$/.test(version)) return undefined;
	const parts = version.split(".").map((part) => Number.parseInt(part, 10));
	if (parts.some((part) => !Number.isFinite(part))) return undefined;
	return [parts[0], parts[1], parts[2]];
}

async function fetchNpmLatestVersion(): Promise<string> {
	const packagePath = ASCET_COPILOT_RELEASE.packageName.replace("/", "%2F");
	const response = await fetch(`https://registry.npmjs.org/${packagePath}/latest`);
	if (!response.ok) {
		throw new Error(`npm registry returned ${response.status}`);
	}
	const data = (await response.json()) as { version?: unknown };
	if (typeof data.version !== "string" || data.version.trim() === "") {
		throw new Error("npm registry response did not include a version");
	}
	return data.version;
}

async function readUpdateCache(): Promise<CachedUpdateInfo | undefined> {
	try {
		const cache = JSON.parse(await readFile(UPDATE_CACHE_PATH, "utf8")) as Partial<CachedUpdateInfo>;
		if (typeof cache.latestVersion !== "string" || typeof cache.checkedAt !== "number") {
			return undefined;
		}
		return { checkedAt: cache.checkedAt, latestVersion: cache.latestVersion };
	} catch {
		return undefined;
	}
}

async function writeUpdateCache(cache: CachedUpdateInfo): Promise<void> {
	await mkdir(dirname(UPDATE_CACHE_PATH), { recursive: true });
	await writeFile(UPDATE_CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}
