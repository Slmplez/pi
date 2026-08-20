import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type ReleaseInfo = {
	packageName: string;
	version: string;
	highlights: string[];
	updateCommand: string;
};

export type CachedUpdateInfo = {
	checkedAt: number;
	latestVersion: string;
	registryUrl: string;
};

export type UpdateUnavailableReason = "tls" | "network" | "registry" | "unknown";

export type UpdateState =
	| { status: "checking" }
	| { status: "current"; latestVersion: string }
	| { status: "available"; latestVersion: string }
	| { status: "unavailable"; reason?: UpdateUnavailableReason };

export type RegistryFetch = (url: URL) => Promise<Pick<Response, "ok" | "status" | "json">>;

export type UpdateCheckOptions = {
	currentVersion?: string;
	now?: Date;
	cacheTtlMs?: number;
	registryUrl?: string;
	fetchLatestVersion?: () => Promise<string>;
	registryFetch?: RegistryFetch;
	readCache?: () => Promise<CachedUpdateInfo | undefined>;
	writeCache?: (cache: CachedUpdateInfo) => Promise<void>;
};

const ONE_HOUR_MS = 60 * 60 * 1000;
const UPDATE_CACHE_PATH = join(
	process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent"),
	"ascet-copilot",
	"update-cache.json",
);

export const ASCET_COPILOT_NPM_REGISTRY =
	"https://szh6-v-000cy.szh.apac.bosch.com/nexus/repository/ascet-copilot-npm/";

export const ASCET_COPILOT_RELEASE: ReleaseInfo = {
	packageName: "@vaf-agentworks/ascet-copilot",
	version: "0.1.43",
	highlights: [
		"Single-session parameter dependency execution",
		"Canonical ASCET get, read, diff, and edit tools",
		"ASCET engineering Skill and guarded writes",
	],
	updateCommand: "pi update npm:@vaf-agentworks/ascet-copilot",
};

export async function checkAscetCopilotUpdate(options: UpdateCheckOptions = {}): Promise<UpdateState> {
	const currentVersion = options.currentVersion ?? ASCET_COPILOT_RELEASE.version;
	const now = options.now ?? new Date();
	const cacheTtlMs = options.cacheTtlMs ?? ONE_HOUR_MS;
	const registryUrl = normalizeRegistryUrl(
		options.registryUrl ?? process.env.ASCET_COPILOT_NPM_REGISTRY ?? ASCET_COPILOT_NPM_REGISTRY,
	);
	const readCache = options.readCache ?? readUpdateCache;
	const writeCache = options.writeCache ?? writeUpdateCache;
	const fetchLatestVersion =
		options.fetchLatestVersion ??
		(() => fetchAscetCopilotLatestVersion(registryUrl, options.registryFetch));

	try {
		const cached = await readCache();
		if (isFreshCache(cached, now, cacheTtlMs, registryUrl)) {
			return createUpdateState(currentVersion, cached.latestVersion);
		}

		const latestVersion = await fetchLatestVersion();
		await writeCache({ checkedAt: now.getTime(), latestVersion, registryUrl });
		return createUpdateState(currentVersion, latestVersion);
	} catch (error) {
		return { status: "unavailable", reason: classifyUpdateFailure(error) };
	}
}

export async function fetchAscetCopilotLatestVersion(
	registryUrl: string,
	registryFetch: RegistryFetch = fetch,
): Promise<string> {
	const packagePath = ASCET_COPILOT_RELEASE.packageName.replace("/", "%2F");
	const url = new URL(packagePath, normalizeRegistryUrl(registryUrl));
	const response = await registryFetch(url);
	if (!response.ok) {
		throw new Error(`npm registry returned ${response.status}`);
	}
	const data = (await response.json()) as {
		"dist-tags"?: { latest?: unknown };
	};
	const latestVersion = data["dist-tags"]?.latest;
	if (typeof latestVersion !== "string" || latestVersion.trim() === "") {
		throw new Error("npm registry response did not include dist-tags.latest");
	}
	return latestVersion;
}

export function createReleaseRows(state: UpdateState, release: ReleaseInfo = ASCET_COPILOT_RELEASE): string[] {
	if (state.status === "available") {
		return ["Update available", `${release.version} -> ${state.latestVersion}`, release.updateCommand];
	}

	if (state.status === "current") {
		return ["Release", `${release.version} - Up to date`, ...release.highlights];
	}

	if (state.status === "unavailable") {
		const reason = state.reason ? ` (${state.reason.toUpperCase()})` : "";
		return ["Release", `${release.version} - update check unavailable${reason}`, ...release.highlights];
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

const TLS_ERROR_CODES = new Set([
	"CERT_HAS_EXPIRED",
	"CERT_NOT_YET_VALID",
	"DEPTH_ZERO_SELF_SIGNED_CERT",
	"ERR_TLS_CERT_ALTNAME_INVALID",
	"UNABLE_TO_GET_ISSUER_CERT",
	"UNABLE_TO_VERIFY_LEAF_SIGNATURE",
]);

const NETWORK_ERROR_CODES = new Set([
	"ECONNREFUSED",
	"ECONNRESET",
	"ENETUNREACH",
	"ENOTFOUND",
	"ETIMEDOUT",
]);

function classifyUpdateFailure(error: unknown): UpdateUnavailableReason {
	const errorRecord = toRecord(error);
	const causeRecord = toRecord(errorRecord?.cause);
	const code =
		(typeof errorRecord?.code === "string" ? errorRecord.code : undefined) ??
		(typeof causeRecord?.code === "string" ? causeRecord.code : undefined);
	const message = [
		typeof errorRecord?.message === "string" ? errorRecord.message : String(error),
		typeof causeRecord?.message === "string" ? causeRecord.message : "",
	].join(" ");

	if (TLS_ERROR_CODES.has(code ?? "") || /certificate|tls|ssl|unable to verify|self-signed/i.test(message)) {
		return "tls";
	}
	if (NETWORK_ERROR_CODES.has(code ?? "") || /fetch failed|offline|network|timeout|timed out|socket/i.test(message)) {
		return "network";
	}
	if (/npm registry returned|registry response|dist-tags\.latest/i.test(message)) {
		return "registry";
	}
	return "unknown";
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
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
	registryUrl: string,
): cache is CachedUpdateInfo {
	return (
		typeof cache?.latestVersion === "string" &&
		cache.registryUrl === registryUrl &&
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

function normalizeRegistryUrl(registryUrl: string): string {
	return registryUrl.endsWith("/") ? registryUrl : `${registryUrl}/`;
}

async function readUpdateCache(): Promise<CachedUpdateInfo | undefined> {
	try {
		const cache = JSON.parse(await readFile(UPDATE_CACHE_PATH, "utf8")) as Partial<CachedUpdateInfo>;
		if (
			typeof cache.latestVersion !== "string" ||
			typeof cache.checkedAt !== "number" ||
			typeof cache.registryUrl !== "string"
		) {
			return undefined;
		}
		return {
			checkedAt: cache.checkedAt,
			latestVersion: cache.latestVersion,
			registryUrl: normalizeRegistryUrl(cache.registryUrl),
		};
	} catch {
		return undefined;
	}
}

async function writeUpdateCache(cache: CachedUpdateInfo): Promise<void> {
	await mkdir(dirname(UPDATE_CACHE_PATH), { recursive: true });
	await writeFile(UPDATE_CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}
