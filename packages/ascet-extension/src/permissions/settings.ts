import type { AscetEditActionId } from "../edit/contract.ts";
import { getAscetEditAction } from "../edit/contract.ts";
import type { AscetPermissionBehavior, AscetPermissionRule, AscetPermissionRuleAction } from "./types.ts";

const RULE_BEHAVIORS = new Set<AscetPermissionBehavior>(["allow", "ask", "deny"]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseAction(value: unknown): AscetPermissionRuleAction | undefined {
	if (value === "*" || value === "request_editability") return value;
	if (typeof value !== "string") return undefined;
	return getAscetEditAction(value as AscetEditActionId)?.id;
}

export function parseAscetPermissionRules(
	settings: Readonly<Record<string, unknown>> | undefined,
): AscetPermissionRule[] {
	if (!settings) return [];
	const permissions = settings.ascetPermissions;
	if (!isRecord(permissions) || !Array.isArray(permissions.rules)) return [];

	const rules: AscetPermissionRule[] = [];
	for (const value of permissions.rules) {
		if (!isRecord(value) || !RULE_BEHAVIORS.has(value.behavior as AscetPermissionBehavior)) continue;
		const action = parseAction(value.action);
		if (!action) continue;
		if (value.path !== undefined && typeof value.path !== "string") continue;
		if (value.databaseFingerprint !== undefined && typeof value.databaseFingerprint !== "string") continue;
		rules.push({
			behavior: value.behavior as AscetPermissionBehavior,
			action,
			...(typeof value.path === "string" ? { path: value.path } : {}),
			...(typeof value.databaseFingerprint === "string" ? { databaseFingerprint: value.databaseFingerprint } : {}),
		});
	}
	return rules;
}
