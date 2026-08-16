import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AscetEditActionId } from "../edit/contract.ts";
import { getAscetEditAction } from "../edit/contract.ts";
import {
	type AscetPermissionBehavior,
	type AscetPermissionRule,
	type AscetPermissionRuleAction,
	isPermissionMode,
	type PermissionMode,
} from "./types.ts";

export const ASCET_PERMISSION_CONFIG_PATH = ".ascet/permissions.json";

export interface AscetPermissionConfig {
	defaultMode: PermissionMode;
	rules: readonly AscetPermissionRule[];
}

export interface LoadedAscetPermissionConfig extends AscetPermissionConfig {
	path: string;
	error?: string;
}

const RULE_BEHAVIORS = new Set<AscetPermissionBehavior>(["allow", "ask", "deny"]);
const ROOT_KEYS = new Set(["defaultMode", "rules"]);
const RULE_KEYS = new Set(["behavior", "action", "path", "databaseFingerprint"]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseAction(value: unknown): AscetPermissionRuleAction | undefined {
	if (value === "*" || value === "request_editability") return value;
	if (typeof value !== "string") return undefined;
	return getAscetEditAction(value as AscetEditActionId)?.id;
}

function parseRule(value: unknown, index: number): AscetPermissionRule {
	if (!isRecord(value)) throw new Error(`rules[${index}] must be an object.`);
	const unknownKey = Object.keys(value).find((key) => !RULE_KEYS.has(key));
	if (unknownKey) throw new Error(`rules[${index}] contains unknown field "${unknownKey}".`);
	if (!RULE_BEHAVIORS.has(value.behavior as AscetPermissionBehavior)) {
		throw new Error(`rules[${index}].behavior must be allow, ask, or deny.`);
	}
	const action = parseAction(value.action);
	if (!action) throw new Error(`rules[${index}].action is not supported.`);
	if (value.path !== undefined && (typeof value.path !== "string" || value.path.length === 0)) {
		throw new Error(`rules[${index}].path must be a non-empty string.`);
	}
	if (
		value.databaseFingerprint !== undefined &&
		(typeof value.databaseFingerprint !== "string" || value.databaseFingerprint.length === 0)
	) {
		throw new Error(`rules[${index}].databaseFingerprint must be a non-empty string.`);
	}
	return {
		behavior: value.behavior as AscetPermissionBehavior,
		action,
		...(typeof value.path === "string" ? { path: value.path } : {}),
		...(typeof value.databaseFingerprint === "string" ? { databaseFingerprint: value.databaseFingerprint } : {}),
	};
}

export function parseAscetPermissionConfig(value: unknown): AscetPermissionConfig {
	if (!isRecord(value)) throw new Error("ASCET permission config must be an object.");
	const unknownKey = Object.keys(value).find((key) => !ROOT_KEYS.has(key));
	if (unknownKey) throw new Error(`ASCET permission config contains unknown field "${unknownKey}".`);
	if (value.defaultMode !== undefined && !isPermissionMode(value.defaultMode)) {
		throw new Error("defaultMode must be default, acceptEdits, or auto.");
	}
	if (value.rules !== undefined && !Array.isArray(value.rules)) throw new Error("rules must be an array.");
	return {
		defaultMode: value.defaultMode ?? "default",
		rules: (value.rules ?? []).map(parseRule),
	};
}

export function loadAscetPermissionConfig(cwd: string): LoadedAscetPermissionConfig {
	const path = resolve(cwd, ASCET_PERMISSION_CONFIG_PATH);
	try {
		const config = parseAscetPermissionConfig(JSON.parse(readFileSync(path, "utf8")) as unknown);
		return { ...config, path };
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return { defaultMode: "default", rules: [], path };
		}
		const message = error instanceof Error ? error.message : String(error);
		return {
			defaultMode: "default",
			rules: [{ behavior: "deny", action: "*" }],
			path,
			error: `Invalid ASCET permission config: ${message}`,
		};
	}
}
