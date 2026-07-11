import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import type { AscetScheduler } from "./scheduler/scheduler.ts";

export interface AscetReadImportExportMatchParams {
	importerComponentPath: string;
	exporterComponentPath: string;
	elementName: string;
}

export interface AscetReadImportExportMatchesParams {
	importerComponentPath: string;
	exporterComponentPath: string;
}

export interface RunAscetImportExportMatchOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
	scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
}

export type AscetReadImportExportMatchResult = AscetCliJsonResult;
export type AscetReadImportExportMatchesResult = AscetCliJsonResult;

export const ascetReadImportExportMatchParameters = Type.Object({
	importerComponentPath: Type.String({ description: "ASCET importer component path.", minLength: 1 }),
	exporterComponentPath: Type.String({ description: "ASCET exporter component path.", minLength: 1 }),
	elementName: Type.String({ description: "Imported element name to resolve.", minLength: 1 }),
});

export const ascetReadImportExportMatchesParameters = Type.Object({
	importerComponentPath: Type.String({ description: "ASCET importer component path.", minLength: 1 }),
	exporterComponentPath: Type.String({ description: "ASCET exporter component path.", minLength: 1 }),
});

export function buildReadImportExportMatchArgs(params: AscetReadImportExportMatchParams): string[] {
	return [
		"exec",
		"read_import_export_match",
		normalizeAscetPath(params.importerComponentPath),
		"--exporter",
		normalizeAscetPath(params.exporterComponentPath),
		params.elementName,
		"--json",
	];
}

export function buildReadImportExportMatchesArgs(params: AscetReadImportExportMatchesParams): string[] {
	return [
		"exec",
		"read_import_export_matches",
		normalizeAscetPath(params.importerComponentPath),
		"--exporter",
		normalizeAscetPath(params.exporterComponentPath),
		"--json",
	];
}

export async function runAscetReadImportExportMatch(
	params: AscetReadImportExportMatchParams,
	options: RunAscetImportExportMatchOptions,
): Promise<AscetReadImportExportMatchResult> {
	return runAscetCliJson(buildReadImportExportMatchArgs(params), {
		...options,
		toolName: "ascet_read",
		commandId: "read_import_export_match",
		jobKind: "read",
	});
}

export async function runAscetReadImportExportMatches(
	params: AscetReadImportExportMatchesParams,
	options: RunAscetImportExportMatchOptions,
): Promise<AscetReadImportExportMatchesResult> {
	return runAscetCliJson(buildReadImportExportMatchesArgs(params), {
		...options,
		toolName: "ascet_read",
		commandId: "read_import_export_matches",
		jobKind: "read",
	});
}

export function formatReadImportExportMatchResult(result: AscetReadImportExportMatchResult): string {
	return formatAscetCliJsonResult("read_import_export_match", result);
}

export function formatReadImportExportMatchesResult(result: AscetReadImportExportMatchesResult): string {
	return formatAscetCliJsonResult("read_import_export_matches", result);
}
