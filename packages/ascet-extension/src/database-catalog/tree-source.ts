import { existsSync } from "node:fs";
import { type AscetObservationStore, readAscetObservationItems } from "../observation-store.ts";
import {
	DatabaseCatalogError,
	type DatabaseCatalogIdentity,
	type DatabaseCatalogModuleIdentity,
	type DatabaseCatalogTreeSource,
	type JsonRecord,
} from "./types.ts";

function isRecord(value: unknown): value is JsonRecord {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function identityKey(identity: DatabaseCatalogIdentity): string {
	return identity.oid;
}

function chooseCanonicalIdentity(
	existing: DatabaseCatalogIdentity | undefined,
	candidate: DatabaseCatalogIdentity,
): DatabaseCatalogIdentity {
	if (!existing || (existing.path.includes("::") && !candidate.path.includes("::"))) {
		return candidate;
	}
	return existing;
}

function hasBoundedTreeInput(value: unknown): boolean {
	if (Array.isArray(value)) {
		return value.some(hasBoundedTreeInput);
	}
	if (!isRecord(value)) {
		return false;
	}
	for (const [key, entry] of Object.entries(value)) {
		if (
			["oid", "path", "targetPathPrefix", "maxFolders", "maxComponents"].includes(key) &&
			entry !== undefined &&
			entry !== null &&
			entry !== ""
		) {
			return true;
		}
		if (hasBoundedTreeInput(entry)) {
			return true;
		}
	}
	return false;
}

function validateFullTree(sourceTreeResultId: string, store: AscetObservationStore) {
	let descriptor: ReturnType<AscetObservationStore["readStoredMetadata"]>;
	try {
		descriptor = store.readStoredMetadata(sourceTreeResultId);
	} catch (error) {
		throw new DatabaseCatalogError(
			"source_tree_not_found",
			`Stored Tree observation '${sourceTreeResultId}' was not found.`,
			error instanceof Error ? error.message : String(error),
		);
	}
	const { metadata } = descriptor;
	if (metadata.domain !== "tree") {
		throw new DatabaseCatalogError(
			"source_tree_domain_invalid",
			`Observation '${sourceTreeResultId}' has domain '${metadata.domain}', but database_catalog requires a Tree observation.`,
		);
	}
	if (metadata.coverage.scopeKind !== "database" || metadata.coverage.completeness !== "complete") {
		throw new DatabaseCatalogError(
			"database_scope_required",
			`Tree observation '${sourceTreeResultId}' is not an explicit complete database-scope observation.`,
			{ coverage: metadata.coverage, target: metadata.target },
		);
	}
	if (
		metadata.coverage.status !== "complete_for_scope" ||
		metadata.truncated === true ||
		metadata.coverage.truncated === true ||
		hasBoundedTreeInput(metadata.target)
	) {
		throw new DatabaseCatalogError(
			"full_tree_required",
			`Tree observation '${sourceTreeResultId}' is bounded, partial, or truncated. A complete full Database Tree is required.`,
			{ coverage: metadata.coverage, target: metadata.target, truncated: metadata.truncated ?? false },
		);
	}
	const databaseIdentity = metadata.sourceIdentity?.database;
	if (
		!databaseIdentity ||
		databaseIdentity.path.trim().length === 0 ||
		databaseIdentity.fingerprint.trim().length === 0
	) {
		throw new DatabaseCatalogError(
			"database_identity_required",
			`Tree observation '${sourceTreeResultId}' does not contain a verified source database identity.`,
			{ sourceIdentity: metadata.sourceIdentity },
		);
	}
	if (!existsSync(descriptor.dataPath)) {
		throw new DatabaseCatalogError(
			"source_tree_data_missing",
			`Tree observation '${sourceTreeResultId}' is missing its NDJSON data artifact.`,
			{ dataPath: descriptor.dataPath },
		);
	}
	return { ...descriptor, databaseIdentity };
}

function sortedIdentities(values: Iterable<DatabaseCatalogIdentity>): DatabaseCatalogIdentity[] {
	return [...values].sort((left, right) => left.path.localeCompare(right.path));
}

export async function loadDatabaseCatalogTreeSource(
	store: AscetObservationStore,
	sourceTreeResultId: string,
): Promise<DatabaseCatalogTreeSource> {
	const descriptor = validateFullTree(sourceTreeResultId, store);
	const projects = new Map<string, DatabaseCatalogIdentity>();
	const enumerations = new Map<string, DatabaseCatalogIdentity>();
	const classes = new Map<string, DatabaseCatalogIdentity>();
	const modules = new Map<string, { canonical?: DatabaseCatalogIdentity; aliases: Map<string, string> }>();
	const warnings: JsonRecord[] = [];
	let sourceTreeRowCount = 0;
	let moduleRowCount = 0;
	let invalidRowCount = 0;

	try {
		for await (const item of readAscetObservationItems(descriptor.dataPath)) {
			sourceTreeRowCount++;
			if (!isRecord(item)) {
				invalidRowCount++;
				warnings.push({ code: "invalid_tree_row", row: sourceTreeRowCount, reason: "row_not_object" });
				continue;
			}
			const path = asNonEmptyString(item.path);
			const oid = asNonEmptyString(item.oid);
			const kind = asNonEmptyString(item.kind)?.toLowerCase();
			if (!path || !oid || !kind) {
				invalidRowCount++;
				warnings.push({
					code: "invalid_tree_row",
					row: sourceTreeRowCount,
					reason: !path ? "path_missing" : !oid ? "oid_missing" : "kind_missing",
					path: path ?? null,
					kind: kind ?? null,
				});
				continue;
			}
			const identity = { path, oid };
			switch (kind) {
				case "project":
					projects.set(identityKey(identity), chooseCanonicalIdentity(projects.get(oid), identity));
					break;
				case "enumeration":
					enumerations.set(identityKey(identity), chooseCanonicalIdentity(enumerations.get(oid), identity));
					break;
				case "class":
					classes.set(identityKey(identity), chooseCanonicalIdentity(classes.get(oid), identity));
					break;
				case "module": {
					moduleRowCount++;
					const entry = modules.get(oid) ?? { aliases: new Map<string, string>() };
					if (path.includes("::")) {
						entry.aliases.set(path.toLocaleLowerCase(), path);
					} else {
						entry.canonical = chooseCanonicalIdentity(entry.canonical, identity);
					}
					modules.set(oid, entry);
					break;
				}
			}
		}
	} catch (error) {
		if (error instanceof DatabaseCatalogError) {
			throw error;
		}
		throw new DatabaseCatalogError(
			"source_tree_data_missing",
			`Tree observation '${sourceTreeResultId}' could not be read as NDJSON.`,
			error instanceof Error ? error.message : String(error),
		);
	}

	const moduleIdentities: DatabaseCatalogModuleIdentity[] = [];
	let moduleAliasCount = 0;
	for (const [oid, entry] of modules) {
		const aliases = [...entry.aliases.values()].sort((left, right) => left.localeCompare(right));
		moduleAliasCount += aliases.length;
		const fallbackPath = aliases[0];
		if (!entry.canonical && fallbackPath) {
			warnings.push({ code: "canonical_module_missing", oid, aliasPath: fallbackPath });
		}
		const path = entry.canonical?.path ?? fallbackPath;
		if (!path) {
			continue;
		}
		moduleIdentities.push({ path, oid, aliases });
	}
	moduleIdentities.sort((left, right) => left.path.localeCompare(right.path));

	const projectsByPath = new Map(
		[...projects.values()].map((project) => [project.path.toLocaleLowerCase(), project] as const),
	);
	const projectModuleEdges: JsonRecord[] = [];
	const edgeKeys = new Set<string>();
	for (const module of moduleIdentities) {
		for (const aliasPath of module.aliases) {
			const separator = aliasPath.indexOf("::");
			if (separator <= 0) {
				continue;
			}
			const projectPath = aliasPath.slice(0, separator);
			const project = projectsByPath.get(projectPath.toLocaleLowerCase());
			const key = `${project?.oid ?? projectPath.toLocaleLowerCase()}\u0000${module.oid}`;
			if (edgeKeys.has(key)) {
				continue;
			}
			edgeKeys.add(key);
			projectModuleEdges.push({
				relationKind: "project_module",
				projectPath,
				projectOid: project?.oid ?? null,
				modulePath: module.path,
				moduleOid: module.oid,
			});
		}
	}

	return {
		metadata: descriptor.metadata,
		databaseIdentity: descriptor.databaseIdentity,
		dataPath: descriptor.dataPath,
		metaPath: descriptor.metaPath,
		projects: sortedIdentities(projects.values()),
		modules: moduleIdentities,
		enumerations: sortedIdentities(enumerations.values()),
		classes: sortedIdentities(classes.values()),
		projectModuleEdges,
		counts: {
			sourceTreeRowCount,
			projectCount: projects.size,
			moduleRowCount,
			uniqueModuleCount: moduleIdentities.length,
			moduleAliasCount,
			enumerationCount: enumerations.size,
			classRowCount: classes.size,
			invalidRowCount,
		},
		warnings,
	};
}
