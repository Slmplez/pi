import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AscetInitIndexPartitionReport, AscetInitIndexResult } from "./ascet-init-index.ts";
import type { AscetInitScope } from "./ascet-init-scope.ts";

export interface AscetInitArtifactResult {
	manifest: string;
	summary: string;
}

type ValidAscetInitScope = Exclude<AscetInitScope, { ok: false }>;

function normalizeApiPath(value: string): string {
	return value.replace(/\\/g, "/");
}

function scopePayload(scope: ValidAscetInitScope): Record<string, unknown> {
	if (scope.kind === "folder" || scope.kind === "project") {
		return { kind: scope.kind, path: normalizeApiPath(scope.value) };
	}
	return { kind: scope.kind };
}

function countByPartition(partitions: readonly AscetInitIndexPartitionReport[] | undefined): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const partition of partitions ?? []) {
		if (partition.status === "ready" && partition.count !== undefined) {
			counts[partition.name] = partition.count;
		}
	}
	return counts;
}

function compactJson(value: unknown): string {
	return `${JSON.stringify(value, null, 2)}\n`;
}

export async function writeAscetInitArtifacts(options: {
	cwd: string;
	scope: ValidAscetInitScope;
	index: AscetInitIndexResult;
	now?: Date;
}): Promise<AscetInitArtifactResult> {
	const ascetDir = join(options.cwd, ".ascet");
	const indexDir = join(ascetDir, "index");
	await mkdir(indexDir, { recursive: true });

	const generatedAt = (options.now ?? new Date()).toISOString();
	const manifestPath = join(indexDir, "manifest.json");
	const summaryPath = join(ascetDir, "ascet-workspace-summary.json");
	const database = options.index.database
		? {
				name: options.index.database.name,
				path: normalizeApiPath(options.index.database.path),
			}
		: undefined;

	const manifest = {
		generatedAt,
		database,
		index: {
			status: options.index.index.status,
			mode: options.index.index.mode,
			fromCache: options.index.index.fromCache,
			elapsedMs: options.index.index.elapsedMs,
			partitions: Object.fromEntries(
				(options.index.index.partitions ?? []).map((partition) => [
					partition.name,
					{
						status: partition.status,
						count: partition.count,
						scanComplete: partition.scanComplete,
						fromCache: partition.fromCache,
						elapsedMs: partition.elapsedMs,
						error: partition.error,
					},
				]),
			),
		},
	};
	const summary = {
		generatedAt,
		scope: scopePayload(options.scope),
		database,
		counts: countByPartition(options.index.index.partitions),
		recommendedTools: [
			"ascet_search.declarations_of_element",
			"ascet_search.declarations_of_method_process",
			"ascet_search.references_to_component",
			"ascet_search.references_to_element",
			"ascet_search.text_in_code",
			"ascet_explore.list_diagrams",
			"ascet_read.read_code",
		],
	};

	await writeFile(manifestPath, compactJson(manifest), "utf8");
	await writeFile(summaryPath, compactJson(summary), "utf8");

	return {
		manifest: normalizeApiPath(".ascet/index/manifest.json"),
		summary: normalizeApiPath(".ascet/ascet-workspace-summary.json"),
	};
}
