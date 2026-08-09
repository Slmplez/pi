import type { AscetObservationCoverage, AscetObservationMetadata } from "../observation-store.ts";

export const databaseCatalogIncludes = ["parameter_class", "enumeration", "module", "message"] as const;

export type DatabaseCatalogInclude = (typeof databaseCatalogIncludes)[number];

export interface DatabaseCatalogRequest {
	action: "database_catalog";
	sourceTreeResultId: string;
	include: readonly DatabaseCatalogInclude[];
	messageDepth?: number;
	delivery?: "stored";
}

export interface DatabaseCatalogIdentity {
	path: string;
	oid: string;
}

export interface DatabaseCatalogModuleIdentity extends DatabaseCatalogIdentity {
	aliases: string[];
}

export interface DatabaseCatalogTreeCounts {
	sourceTreeRowCount: number;
	projectCount: number;
	moduleRowCount: number;
	uniqueModuleCount: number;
	moduleAliasCount: number;
	enumerationCount: number;
	classRowCount: number;
	invalidRowCount: number;
}

export interface DatabaseCatalogTreeSource {
	metadata: AscetObservationMetadata;
	dataPath: string;
	metaPath: string;
	projects: DatabaseCatalogIdentity[];
	modules: DatabaseCatalogModuleIdentity[];
	enumerations: DatabaseCatalogIdentity[];
	classes: DatabaseCatalogIdentity[];
	projectModuleEdges: JsonRecord[];
	counts: DatabaseCatalogTreeCounts;
	warnings: JsonRecord[];
}

export interface DatabaseCatalogLiveRequest {
	scanParameterClasses: boolean;
	scanParameterEnumerationUsage: boolean;
	scanMessages: boolean;
	scanMessageEnumerationUsage: boolean;
	messageDepth: number;
	projects: DatabaseCatalogIdentity[];
	modules: DatabaseCatalogIdentity[];
	classCandidates: DatabaseCatalogIdentity[];
}

export interface DatabaseCatalogArtifactEntry {
	dataPath: string;
	itemCount: number;
}

export interface DatabaseCatalogArtifacts {
	catalog: DatabaseCatalogArtifactEntry;
	parameterClasses?: DatabaseCatalogArtifactEntry;
	enumerations?: DatabaseCatalogArtifactEntry;
	modules?: DatabaseCatalogArtifactEntry;
	messages?: DatabaseCatalogArtifactEntry;
	relations: Record<string, DatabaseCatalogArtifactEntry | { notCreatedReason: string }>;
	summaryPath: string;
	metaPath: string;
}

export interface DatabaseCatalogResult {
	delivery: "stored";
	catalog: {
		resultId: string;
		sourceTreeResultId: string;
		include: DatabaseCatalogInclude[];
		artifacts: DatabaseCatalogArtifacts;
	};
	coverage: AscetObservationCoverage;
	timings: JsonRecord;
}

export type JsonRecord = Record<string, unknown>;

export class DatabaseCatalogError extends Error {
	public readonly code: string;
	public readonly details?: unknown;

	public constructor(code: string, message: string, details?: unknown) {
		super(message);
		this.name = "DatabaseCatalogError";
		this.code = code;
		this.details = details;
	}
}
