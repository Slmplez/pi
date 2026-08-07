import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const DEFAULT_ASCET_OUTPUT_THRESHOLD_BYTES = 4096;

export type AscetObservationDelivery = "auto" | "inline" | "stored";
export type AscetObservationCoverageStatus = "complete_for_scope" | "partial" | "failed";

export interface AscetObservationCoverage {
	status: AscetObservationCoverageStatus;
	[key: string]: unknown;
}

export interface AscetObservationMetadata {
	resultId: string;
	domain: string;
	target: unknown;
	itemCount: number;
	coverage: AscetObservationCoverage;
	source: string;
	capturedAt: string;
}

export interface StoredAscetObservation {
	metadata: AscetObservationMetadata;
	dataPath: string;
	metaPath: string;
}

export interface InlineAscetObservation {
	delivery: "inline";
	items: readonly unknown[];
	itemCount: number;
	thresholdBytes: number;
	coverage: AscetObservationCoverage;
	source: string;
	capturedAt: string;
}

export interface StoredAscetObservationResult {
	delivery: "stored";
	observation: StoredAscetObservation;
	thresholdBytes: number;
}

export type AscetObservationResult = InlineAscetObservation | StoredAscetObservationResult;

export interface CreateAscetObservationInput {
	domain: string;
	target: unknown;
	items: readonly unknown[];
	coverage: AscetObservationCoverage;
	source?: string;
	capturedAt?: string;
	delivery?: AscetObservationDelivery;
	resultId?: string;
}

export interface ObservationInvalidationCriteria {
	componentOid?: string;
	componentPath?: string;
	projectOid?: string;
	projectPath?: string;
	targetPathPrefix?: string;
}

export interface AscetObservationStoreOptions {
	root?: string;
	thresholdBytes?: number;
	now?: () => Date;
	generateResultId?: () => string;
}

let fileCounter = 0;

export function getAscetArtifactRoot(env: NodeJS.ProcessEnv = process.env): string {
	return env.PI_ASCET_EXTENSION_ARTIFACT_ROOT ?? join(tmpdir(), "pi-ascet-extension", "artifacts");
}

export function getAscetOutputThresholdBytes(env: NodeJS.ProcessEnv = process.env): number {
	const configured = Number(env.PI_ASCET_EXTENSION_OUTPUT_THRESHOLD_BYTES);
	return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_ASCET_OUTPUT_THRESHOLD_BYTES;
}

export function writeAscetFileAtomically(filePath: string, content: string): void {
	const temporaryPath = `${filePath}.tmp-${process.pid}-${fileCounter++}`;
	try {
		writeFileSync(temporaryPath, content, "utf8");
		renameSync(temporaryPath, filePath);
	} finally {
		if (existsSync(temporaryPath)) {
			unlinkSync(temporaryPath);
		}
	}
}

function safeToken(value: string, fallback: string): string {
	const token = value.replace(/[^A-Za-z0-9_.-]+/g, "_").replace(/^_+|_+$/g, "");
	return token.length > 0 ? token.slice(0, 120) : fallback;
}

function defaultResultId(domain: string): string {
	return `obs-${safeToken(domain, "ascet")}-${process.pid}-${Date.now()}-${fileCounter++}`;
}

function serializeJson(value: unknown, description: string): string {
	const serialized = JSON.stringify(value);
	if (serialized === undefined) {
		throw new TypeError(`${description} must be JSON serializable`);
	}
	return serialized;
}

function normalizePath(value: string): string {
	return value.replaceAll("/", "\\").replace(/\\+$/u, "").toLocaleLowerCase();
}

function collectIdentityValues(value: unknown, identities: { oids: string[]; paths: string[] }): void {
	if (Array.isArray(value)) {
		for (const entry of value) {
			collectIdentityValues(entry, identities);
		}
		return;
	}
	if (value === null || typeof value !== "object") {
		return;
	}
	for (const [key, entry] of Object.entries(value)) {
		const normalizedKey = key.toLocaleLowerCase();
		if (typeof entry === "string" && normalizedKey.endsWith("oid")) {
			identities.oids.push(entry);
		}
		if (typeof entry === "string" && (normalizedKey.endsWith("path") || normalizedKey === "targetpathprefix")) {
			identities.paths.push(entry);
		}
		collectIdentityValues(entry, identities);
	}
}

function pathMatches(observedPath: string, requestedPath: string): boolean {
	const observed = normalizePath(observedPath);
	const requested = normalizePath(requestedPath);
	return observed === requested || observed.startsWith(`${requested}\\`);
}

function matchesInvalidationCriteria(target: unknown, criteria: ObservationInvalidationCriteria): boolean {
	const requestedOids = [criteria.componentOid, criteria.projectOid].filter(
		(value): value is string => typeof value === "string" && value.length > 0,
	);
	const requestedPaths = [criteria.componentPath, criteria.projectPath, criteria.targetPathPrefix].filter(
		(value): value is string => typeof value === "string" && value.length > 0,
	);
	if (requestedOids.length === 0 && requestedPaths.length === 0) {
		return false;
	}

	const identities: { oids: string[]; paths: string[] } = { oids: [], paths: [] };
	collectIdentityValues(target, identities);
	return (
		requestedOids.some((requested) => identities.oids.includes(requested)) ||
		requestedPaths.some((requested) => identities.paths.some((observed) => pathMatches(observed, requested)))
	);
}

function observationFileNames(metadata: AscetObservationMetadata): { dataFileName: string; metaFileName: string } {
	const resultId = safeToken(metadata.resultId, "observation");
	const domain = safeToken(metadata.domain, "ascet");
	return {
		dataFileName: `${resultId}.${domain}.ndjson`,
		metaFileName: `${resultId}.meta.json`,
	};
}

export class AscetObservationStore {
	private readonly root: string;
	private readonly thresholdBytes: number;
	private readonly now: () => Date;
	private readonly generateResultId: (domain: string) => string;

	public constructor(options: AscetObservationStoreOptions = {}) {
		this.root = options.root ?? getAscetArtifactRoot();
		const configuredThreshold = options.thresholdBytes ?? getAscetOutputThresholdBytes();
		this.thresholdBytes =
			Number.isFinite(configuredThreshold) && configuredThreshold > 0
				? configuredThreshold
				: DEFAULT_ASCET_OUTPUT_THRESHOLD_BYTES;
		this.now = options.now ?? (() => new Date());
		this.generateResultId = options.generateResultId ?? defaultResultId;
	}

	public getRoot(): string {
		return this.root;
	}

	public getThresholdBytes(): number {
		return this.thresholdBytes;
	}

	public create(input: CreateAscetObservationInput): AscetObservationResult {
		const domain = safeToken(input.domain, "ascet");
		const source = input.source ?? "live";
		const capturedAt = input.capturedAt ?? this.now().toISOString();
		const resultId = safeToken(input.resultId ?? this.generateResultId(domain), "observation");
		const itemLines = input.items.map((item, index) => serializeJson(item, `Observation item ${index}`));
		const inlinePayload = serializeJson(input.items, "Observation items");
		const shouldStore =
			input.delivery === "stored" ||
			(input.delivery !== "inline" && Buffer.byteLength(inlinePayload, "utf8") > this.thresholdBytes);
		if (!shouldStore) {
			return {
				delivery: "inline",
				items: input.items,
				itemCount: input.items.length,
				thresholdBytes: this.thresholdBytes,
				coverage: input.coverage,
				source,
				capturedAt,
			};
		}

		const metadata: AscetObservationMetadata = {
			resultId,
			domain,
			target: input.target ?? null,
			itemCount: input.items.length,
			coverage: input.coverage,
			source,
			capturedAt,
		};
		const metadataContent = `${JSON.stringify(metadata, null, 2)}\n`;
		const dataContent = itemLines.length > 0 ? `${itemLines.join("\n")}\n` : "";
		const { dataFileName, metaFileName } = observationFileNames(metadata);
		const dataPath = join(this.root, dataFileName);
		const metaPath = join(this.root, metaFileName);

		mkdirSync(this.root, { recursive: true });
		writeAscetFileAtomically(dataPath, dataContent);
		writeAscetFileAtomically(metaPath, metadataContent);

		return {
			delivery: "stored",
			observation: {
				metadata,
				dataPath,
				metaPath,
			},
			thresholdBytes: this.thresholdBytes,
		};
	}

	public invalidate(criteria: ObservationInvalidationCriteria): string[] {
		if (!existsSync(this.root)) {
			return [];
		}

		const invalidated: string[] = [];
		for (const fileName of readdirSync(this.root)) {
			if (!fileName.endsWith(".meta.json")) {
				continue;
			}
			const metaPath = join(this.root, fileName);
			let metadata: AscetObservationMetadata;
			try {
				metadata = JSON.parse(readFileSync(metaPath, "utf8")) as AscetObservationMetadata;
			} catch {
				continue;
			}
			if (!matchesInvalidationCriteria(metadata.target, criteria)) {
				continue;
			}

			const { dataFileName } = observationFileNames(metadata);
			const dataPath = join(this.root, dataFileName);
			unlinkSync(metaPath);
			if (existsSync(dataPath)) {
				unlinkSync(dataPath);
			}
			invalidated.push(metadata.resultId);
		}
		return invalidated;
	}
}

export function createAscetObservationStore(options?: AscetObservationStoreOptions): AscetObservationStore {
	return new AscetObservationStore(options);
}

export function invalidateAscetObservations(
	criteria: ObservationInvalidationCriteria,
	options?: AscetObservationStoreOptions,
): string[] {
	return new AscetObservationStore(options).invalidate(criteria);
}
