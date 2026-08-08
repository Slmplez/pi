import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { unwrapToolSuccessPayload } from "../tool-response-contract.ts";

export interface ElementSpecDocument {
	elements: Record<string, unknown>[];
	[key: string]: unknown;
}

export function findElementSpecDocument(value: unknown): ElementSpecDocument | undefined {
	const payload = unwrapToolSuccessPayload(value);
	if (!isRecord(payload)) {
		return undefined;
	}
	if (Array.isArray(payload.elements)) {
		if (!payload.elements.every(isRecord)) {
			return undefined;
		}
		return payload as ElementSpecDocument;
	}
	if (isRecord(payload.result)) {
		return findElementSpecDocument(payload.result);
	}
	return undefined;
}

export function writeTemporaryElementSpec(spec: ElementSpecDocument, artifactRoot: string): string {
	const directory = join(artifactRoot, "element-spec-plans");
	mkdirSync(directory, { recursive: true });
	const filePath = join(directory, `inline-${process.pid}-${Date.now()}-${randomUUID()}.json`);
	writeFileSync(filePath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
	return filePath;
}

export function removeTemporaryElementSpec(filePath: string): void {
	try {
		unlinkSync(filePath);
	} catch (error) {
		if (!isNodeError(error) || error.code !== "ENOENT") {
			throw error;
		}
	}
}

export function fingerprintJson(value: unknown): string {
	return createHash("sha256").update(canonicalize(value)).digest("hex");
}

function canonicalize(value: unknown): string {
	if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) {
		return `[${value.map(canonicalize).join(",")}]`;
	}
	if (!isRecord(value)) {
		throw new Error("Element spec fingerprint requires JSON-compatible values.");
	}
	return `{${Object.keys(value)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
		.join(",")}}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && "code" in error;
}
