import { existsSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AscetObservationCoverage, AscetObservationStore } from "../observation-store.ts";
import {
	type DatabaseCatalogArtifactEntry,
	type DatabaseCatalogArtifacts,
	DatabaseCatalogError,
	type DatabaseCatalogInclude,
	type DatabaseCatalogRequest,
	type DatabaseCatalogResult,
	type DatabaseCatalogTreeSource,
	type JsonRecord,
} from "./types.ts";

interface ArtifactWriterOptions {
	generateResultId?: () => string;
	now?: () => Date;
	writeFile?: typeof writeFileSync;
	rename?: typeof renameSync;
	unlink?: typeof unlinkSync;
}

export interface WriteDatabaseCatalogInput {
	request: DatabaseCatalogRequest;
	tree: DatabaseCatalogTreeSource;
	livePayload?: JsonRecord;
	timings?: JsonRecord;
}

interface PendingArtifact {
	key: string;
	path: string;
	content: string;
	itemCount?: number;
}

let resultCounter = 0;

function isRecord(value: unknown): value is JsonRecord {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asRecordArray(value: unknown): JsonRecord[] {
	return Array.isArray(value) ? value.filter(isRecord) : [];
}

function asNonEmptyString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function hasInclude(include: readonly DatabaseCatalogInclude[], value: DatabaseCatalogInclude): boolean {
	return include.includes(value);
}

function defaultResultId(): string {
	return `obs-database-catalog-${process.pid}-${Date.now()}-${resultCounter++}`;
}

function serializeJson(value: unknown, description: string, pretty = false): string {
	let serialized: string | undefined;
	try {
		serialized = JSON.stringify(value, null, pretty ? 2 : undefined);
	} catch (error) {
		throw new DatabaseCatalogError(
			"catalog_artifact_write_failed",
			`${description} is not JSON serializable.`,
			error instanceof Error ? error.message : String(error),
		);
	}
	if (serialized === undefined) {
		throw new DatabaseCatalogError("catalog_artifact_write_failed", `${description} is not JSON serializable.`);
	}
	return serialized;
}

function toNdjson(rows: readonly JsonRecord[], description: string): string {
	return rows.length === 0
		? ""
		: `${rows.map((row, index) => serializeJson(row, `${description} row ${index}`)).join("\n")}\n`;
}

function catalogRows(kind: DatabaseCatalogInclude, rows: readonly JsonRecord[]): JsonRecord[] {
	return rows.map((row) => {
		const { catalogKind: _catalogKind, ...rest } = row;
		return { catalogKind: kind, ...rest };
	});
}

function relationRows(payload: JsonRecord, field: string): JsonRecord[] {
	return asRecordArray(payload[field]);
}

function usageByEnumeration(edges: readonly JsonRecord[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const edge of edges) {
		const oid = asNonEmptyString(edge.enumerationOid);
		if (oid) {
			counts.set(oid, (counts.get(oid) ?? 0) + 1);
		}
	}
	return counts;
}

function usageStatus(scanned: boolean, count: number): JsonRecord {
	if (!scanned) {
		return { status: "not_scanned" };
	}
	return count > 0 ? { status: "used", count } : { status: "scanned_not_used", count: 0 };
}

function buildEnumerationRows(
	tree: DatabaseCatalogTreeSource,
	include: readonly DatabaseCatalogInclude[],
	parameterEnumEdges: readonly JsonRecord[],
	messageEnumEdges: readonly JsonRecord[],
): JsonRecord[] {
	const parameterCounts = usageByEnumeration(parameterEnumEdges);
	const messageCounts = usageByEnumeration(messageEnumEdges);
	return tree.enumerations.map((enumeration) => ({
		catalogKind: "enumeration",
		path: enumeration.path,
		oid: enumeration.oid,
		parameterUsage: usageStatus(hasInclude(include, "parameter_class"), parameterCounts.get(enumeration.oid) ?? 0),
		messageUsage: usageStatus(hasInclude(include, "message"), messageCounts.get(enumeration.oid) ?? 0),
	}));
}

function messageCountsByModule(messages: readonly JsonRecord[]): Map<string, JsonRecord> {
	const counts = new Map<string, { send: number; receive: number; sendReceive: number; total: number }>();
	for (const message of messages) {
		const moduleOid = asNonEmptyString(message.moduleOid);
		if (!moduleOid) {
			continue;
		}
		const count = counts.get(moduleOid) ?? { send: 0, receive: 0, sendReceive: 0, total: 0 };
		switch (asNonEmptyString(message.messageKind)) {
			case "send_message":
				count.send++;
				break;
			case "receive_message":
				count.receive++;
				break;
			case "send_receive_message":
				count.sendReceive++;
				break;
		}
		count.total++;
		counts.set(moduleOid, count);
	}
	return new Map([...counts].map(([oid, count]) => [oid, { status: "scanned", ...count }]));
}

function buildModuleRows(
	tree: DatabaseCatalogTreeSource,
	include: readonly DatabaseCatalogInclude[],
	messages: readonly JsonRecord[],
): JsonRecord[] {
	const projectCounts = new Map<string, Set<string>>();
	for (const edge of tree.projectModuleEdges) {
		const moduleOid = asNonEmptyString(edge.moduleOid);
		const projectIdentity = asNonEmptyString(edge.projectOid) ?? asNonEmptyString(edge.projectPath);
		if (!moduleOid || !projectIdentity) {
			continue;
		}
		const projects = projectCounts.get(moduleOid) ?? new Set<string>();
		projects.add(projectIdentity);
		projectCounts.set(moduleOid, projects);
	}
	const messageCounts = messageCountsByModule(messages);
	return tree.modules.map((module) => ({
		catalogKind: "module",
		path: module.path,
		oid: module.oid,
		aliases: module.aliases,
		projectCount: projectCounts.get(module.oid)?.size ?? 0,
		messageCounts: hasInclude(include, "message")
			? (messageCounts.get(module.oid) ?? {
					status: "scanned",
					send: 0,
					receive: 0,
					sendReceive: 0,
					total: 0,
				})
			: { status: "not_scanned" },
	}));
}

function normalizeCoverage(payload: JsonRecord): AscetObservationCoverage {
	return isRecord(payload.coverage) && typeof payload.coverage.status === "string"
		? (payload.coverage as AscetObservationCoverage)
		: { status: "complete_for_scope" };
}

function mergeDiagnostics(
	tree: DatabaseCatalogTreeSource,
	payload: JsonRecord,
	field: "warnings" | "failures",
): unknown[] {
	const liveValues = Array.isArray(payload[field]) ? payload[field] : [];
	return field === "warnings" ? [...tree.warnings, ...liveValues] : liveValues;
}

function addNdjson(
	pending: PendingArtifact[],
	root: string,
	resultId: string,
	key: string,
	suffix: string,
	rows: readonly JsonRecord[],
): DatabaseCatalogArtifactEntry {
	const path = join(root, `${resultId}.${suffix}.ndjson`);
	pending.push({ key, path, content: toNdjson(rows, suffix), itemCount: rows.length });
	return { dataPath: path, itemCount: rows.length };
}

function addJson(
	pending: PendingArtifact[],
	root: string,
	resultId: string,
	key: string,
	suffix: string,
	value: unknown,
): string {
	const path = join(root, `${resultId}.${suffix}.json`);
	pending.push({ key, path, content: `${serializeJson(value, suffix, true)}\n` });
	return path;
}

function publishArtifacts(
	root: string,
	resultId: string,
	pending: readonly PendingArtifact[],
	options: ArtifactWriterOptions,
): void {
	const writeFile = options.writeFile ?? writeFileSync;
	const rename = options.rename ?? renameSync;
	const unlink = options.unlink ?? unlinkSync;
	const temporaryPaths: string[] = [];
	const publishedPaths: string[] = [];
	try {
		mkdirSync(root, { recursive: true });
		for (const [index, artifact] of pending.entries()) {
			const temporaryPath = `${artifact.path}.tmp-${process.pid}-${resultId}-${index}`;
			writeFile(temporaryPath, artifact.content, "utf8");
			temporaryPaths.push(temporaryPath);
		}
		for (let index = 0; index < pending.length; index++) {
			rename(temporaryPaths[index] as string, pending[index]?.path as string);
			publishedPaths.push(pending[index]?.path as string);
		}
	} catch (error) {
		for (const path of [...temporaryPaths, ...publishedPaths]) {
			if (existsSync(path)) {
				try {
					unlink(path);
				} catch {
					// Preserve the original artifact write failure.
				}
			}
		}
		throw new DatabaseCatalogError(
			"catalog_artifact_write_failed",
			`Database Catalog '${resultId}' artifacts could not be published.`,
			error instanceof Error ? error.message : String(error),
		);
	}
}

export function writeDatabaseCatalogArtifacts(
	store: AscetObservationStore,
	input: WriteDatabaseCatalogInput,
	options: ArtifactWriterOptions = {},
): DatabaseCatalogResult {
	const root = store.getRoot();
	const resultId = (options.generateResultId ?? defaultResultId)();
	const capturedAt = (options.now ?? (() => new Date()))().toISOString();
	const include = [...input.request.include];
	const payload = input.livePayload ?? {};
	const parameterClasses = hasInclude(include, "parameter_class")
		? catalogRows("parameter_class", asRecordArray(payload.parameterClasses))
		: [];
	const messages = hasInclude(include, "message") ? catalogRows("message", asRecordArray(payload.messages)) : [];
	const parameterEnumEdges = relationRows(payload, "parameterEnumEdges");
	const messageEnumEdges = relationRows(payload, "messageEnumEdges");
	const enumerations = hasInclude(include, "enumeration")
		? buildEnumerationRows(input.tree, include, parameterEnumEdges, messageEnumEdges)
		: [];
	const modules = hasInclude(include, "module") ? buildModuleRows(input.tree, include, messages) : [];
	const allRows = [...parameterClasses, ...enumerations, ...modules, ...messages];
	const pending: PendingArtifact[] = [];
	const artifacts: DatabaseCatalogArtifacts = {
		catalog: addNdjson(pending, root, resultId, "catalog", "database-model-catalog", allRows),
		relations: {},
		summaryPath: "",
		metaPath: "",
	};

	if (hasInclude(include, "parameter_class")) {
		artifacts.parameterClasses = addNdjson(
			pending,
			root,
			resultId,
			"parameterClasses",
			"parameter-classes",
			parameterClasses,
		);
	}
	if (hasInclude(include, "enumeration")) {
		artifacts.enumerations = addNdjson(pending, root, resultId, "enumerations", "enumerations", enumerations);
	}
	if (hasInclude(include, "module")) {
		artifacts.modules = addNdjson(pending, root, resultId, "modules", "modules", modules);
	}
	if (hasInclude(include, "message")) {
		artifacts.messages = addNdjson(pending, root, resultId, "messages", "messages", messages);
	}

	const relationDefinitions: Array<{ enabled: boolean; key: string; suffix: string; rows: JsonRecord[] }> = [
		{
			enabled: hasInclude(include, "parameter_class"),
			key: "projectComplexEdges",
			suffix: "project-complex-edges",
			rows: relationRows(payload, "projectComplexEdges"),
		},
		{
			enabled: hasInclude(include, "parameter_class"),
			key: "parameterClassEdges",
			suffix: "parameter-class-edges",
			rows: relationRows(payload, "parameterClassEdges"),
		},
		{
			enabled: hasInclude(include, "parameter_class") && hasInclude(include, "enumeration"),
			key: "parameterEnumEdges",
			suffix: "parameter-enum-edges",
			rows: parameterEnumEdges,
		},
		{
			enabled: hasInclude(include, "module"),
			key: "projectModuleEdges",
			suffix: "project-module-edges",
			rows: input.tree.projectModuleEdges,
		},
		{
			enabled: hasInclude(include, "message"),
			key: "moduleMessageEdges",
			suffix: "module-message-edges",
			rows: relationRows(payload, "moduleMessageEdges"),
		},
		{
			enabled: hasInclude(include, "message") && hasInclude(include, "enumeration"),
			key: "messageEnumEdges",
			suffix: "message-enum-edges",
			rows: messageEnumEdges,
		},
	];
	const perRelationCounts: Record<string, number> = {};
	for (const relation of relationDefinitions) {
		if (!relation.enabled) {
			artifacts.relations[relation.key] = { notCreatedReason: "scan_not_requested" };
			continue;
		}
		perRelationCounts[relation.key] = relation.rows.length;
		artifacts.relations[relation.key] =
			relation.rows.length > 0
				? addNdjson(pending, root, resultId, relation.key, relation.suffix, relation.rows)
				: { notCreatedReason: "no_relations_found" };
	}

	const coverage = normalizeCoverage(payload);
	const timings = { ...(isRecord(payload.timings) ? payload.timings : {}), ...(input.timings ?? {}) };
	const summary = {
		catalogResultId: resultId,
		sourceTreeResultId: input.request.sourceTreeResultId,
		include,
		messageDepth: input.request.messageDepth ?? 0,
		capturedAt,
		coverage,
		sourceTreeCounts: input.tree.counts,
		perTypeCounts: {
			parameterClasses: parameterClasses.length,
			enumerations: enumerations.length,
			modules: modules.length,
			messages: messages.length,
		},
		perRelationCounts,
		liveCounts: isRecord(payload.counts) ? payload.counts : {},
		perStageTimings: timings,
		warnings: mergeDiagnostics(input.tree, payload, "warnings"),
		failures: mergeDiagnostics(input.tree, payload, "failures"),
		diagnostics: isRecord(payload.diagnostics) ? payload.diagnostics : {},
	};
	artifacts.summaryPath = addJson(pending, root, resultId, "summary", "database-model-summary", summary);
	artifacts.metaPath = join(root, `${resultId}.database-model.meta.json`);
	pending.push({
		key: "meta",
		path: artifacts.metaPath,
		content: `${serializeJson(
			{
				...summary,
				lineage: {
					sourceTreeResultId: input.request.sourceTreeResultId,
					sourceTreeDataPath: input.tree.dataPath,
					sourceTreeMetaPath: input.tree.metaPath,
				},
				artifacts,
			},
			"database-model.meta",
			true,
		)}\n`,
	});
	publishArtifacts(root, resultId, pending, options);

	return {
		delivery: "stored",
		catalog: {
			resultId,
			sourceTreeResultId: input.request.sourceTreeResultId,
			include,
			artifacts,
		},
		coverage,
		timings,
	};
}
