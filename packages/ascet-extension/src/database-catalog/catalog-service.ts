import { performance } from "node:perf_hooks";
import { AscetObservationStore } from "../observation-store.ts";
import { writeDatabaseCatalogArtifacts } from "./artifact-writer.ts";
import { loadDatabaseCatalogTreeSource } from "./tree-source.ts";
import {
	DatabaseCatalogError,
	type DatabaseCatalogInclude,
	type DatabaseCatalogLiveRequest,
	type DatabaseCatalogRequest,
	type DatabaseCatalogResult,
	databaseCatalogIncludes,
	type JsonRecord,
} from "./types.ts";

export interface ExecuteDatabaseCatalogOptions {
	store?: AscetObservationStore;
	scanLive?: (request: DatabaseCatalogLiveRequest) => Promise<JsonRecord>;
}

export function isDatabaseCatalogParameterClassCandidate(path: string): boolean {
	const segments = path.toLowerCase().split("\\");
	const name = segments.at(-1) ?? "";
	const folders = segments.slice(0, -1);
	const parameterFolder = folders.some((segment) =>
		["parameter", "parameters", "calibration", "calibrations", "constant", "constants"].includes(segment),
	);
	const parameterName =
		name.includes("parameter") ||
		name.includes("calibration") ||
		name.includes("constant") ||
		/(?:^|[_-])(param|calib|const)(?:$|[_-])/u.test(name);
	const idFolder = folders.some((segment) => segment === "id" || segment === "ids");
	const enumerationSettings =
		folders.some((segment) => segment === "enumeration" || segment === "enumerations") && name.includes("settings");
	return parameterFolder || parameterName || idFolder || enumerationSettings;
}

function validateRequest(request: DatabaseCatalogRequest): DatabaseCatalogInclude[] {
	if (typeof request.sourceTreeResultId !== "string" || request.sourceTreeResultId.trim().length === 0) {
		throw new DatabaseCatalogError("source_tree_not_found", "database_catalog requires sourceTreeResultId.");
	}
	if (!Array.isArray(request.include) || request.include.length === 0) {
		throw new DatabaseCatalogError("include_required", "database_catalog requires a non-empty include array.");
	}
	const normalized = [...new Set(request.include)];
	if (normalized.length !== request.include.length) {
		throw new DatabaseCatalogError("invalid_argument", "database_catalog include values must be unique.");
	}
	for (const include of normalized) {
		if (!databaseCatalogIncludes.includes(include)) {
			throw new DatabaseCatalogError("invalid_argument", `Unsupported database_catalog include '${include}'.`);
		}
	}
	if (request.delivery !== undefined && request.delivery !== "stored") {
		throw new DatabaseCatalogError("invalid_argument", "database_catalog only supports delivery='stored'.");
	}
	if (request.messageDepth !== undefined && (!Number.isInteger(request.messageDepth) || request.messageDepth < 0)) {
		throw new DatabaseCatalogError("invalid_argument", "messageDepth must be a non-negative integer.");
	}
	return normalized;
}

export async function executeDatabaseCatalog(
	request: DatabaseCatalogRequest,
	options: ExecuteDatabaseCatalogOptions = {},
): Promise<DatabaseCatalogResult> {
	const include = validateRequest(request);
	const store = options.store ?? new AscetObservationStore();
	const sourceStartedAt = performance.now();
	const tree = await loadDatabaseCatalogTreeSource(store, request.sourceTreeResultId);
	const sourceTreeScanMs = performance.now() - sourceStartedAt;
	const scanParameterClasses = include.includes("parameter_class");
	const scanMessages = include.includes("message");
	if (scanParameterClasses && tree.projects.length === 0) {
		throw new DatabaseCatalogError(
			"project_identity_required",
			"Parameter Class catalog requires at least one Project identity in the database-scope Tree observation.",
			{ sourceTreeResultId: request.sourceTreeResultId },
		);
	}
	let livePayload: JsonRecord = {};
	let liveScanMs = 0;

	if (scanParameterClasses || scanMessages) {
		if (!options.scanLive) {
			throw new DatabaseCatalogError(
				"catalog_live_scan_failed",
				"database_catalog requires an ASCET live scanner for the requested include values.",
			);
		}
		const liveRequest: DatabaseCatalogLiveRequest = {
			databaseIdentity: tree.databaseIdentity,
			scanParameterClasses,
			scanParameterEnumerationUsage: scanParameterClasses && include.includes("enumeration"),
			scanMessages,
			scanMessageEnumerationUsage: scanMessages && include.includes("enumeration"),
			messageDepth: request.messageDepth ?? 0,
			projects: scanParameterClasses ? tree.projects : [],
			modules: scanMessages ? tree.modules.map(({ path, oid }) => ({ path, oid })) : [],
			classCandidates: scanParameterClasses
				? tree.classes.filter(({ path }) => isDatabaseCatalogParameterClassCandidate(path))
				: [],
		};
		const liveStartedAt = performance.now();
		try {
			livePayload = await options.scanLive(liveRequest);
		} catch (error) {
			if (error instanceof DatabaseCatalogError) {
				throw error;
			}
			throw new DatabaseCatalogError(
				"catalog_live_scan_failed",
				"ASCET live Database Catalog scan failed.",
				error instanceof Error ? error.message : String(error),
			);
		}
		liveScanMs = performance.now() - liveStartedAt;
	}

	const result = writeDatabaseCatalogArtifacts(store, {
		request: { ...request, include },
		tree,
		livePayload,
		timings: { sourceTreeScanMs, liveScanMs },
	});
	return result;
}
