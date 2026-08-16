import type {
	AscetPermissionBehavior,
	AscetPermissionRule,
	AscetPermissionRuleAction,
	AscetPermissionRuleMatch,
} from "./types.ts";

const BEHAVIOR_PRIORITY: Record<AscetPermissionBehavior, number> = {
	allow: 1,
	ask: 2,
	deny: 3,
};

export function normalizeAscetPermissionPath(path: string): string {
	return path
		.replace(/\//g, "\\")
		.replace(/\\+/g, "\\")
		.replace(/^\\|\\$/g, "");
}

function escapeRegExp(value: string): string {
	return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

export function matchesAscetPermissionPath(pattern: string, path: string): boolean {
	const normalizedPattern = normalizeAscetPermissionPath(pattern);
	const normalizedPath = normalizeAscetPermissionPath(path);
	const expression = `^${escapeRegExp(normalizedPattern).replace(/\*/g, ".*")}$`;
	return new RegExp(expression, "i").test(normalizedPath);
}

function actionMatches(ruleAction: AscetPermissionRuleAction, action: AscetPermissionRuleAction): boolean {
	return ruleAction === "*" || ruleAction === action;
}

export function findAscetPermissionRule(input: {
	rules: readonly AscetPermissionRule[];
	action: AscetPermissionRuleAction;
	path?: string;
	databaseFingerprint?: string;
}): AscetPermissionRuleMatch | undefined {
	let selected: AscetPermissionRuleMatch | undefined;
	for (const [index, rule] of input.rules.entries()) {
		if (!actionMatches(rule.action, input.action)) continue;
		if (rule.path !== undefined && (input.path === undefined || !matchesAscetPermissionPath(rule.path, input.path))) {
			continue;
		}
		if (rule.databaseFingerprint !== undefined && rule.databaseFingerprint !== input.databaseFingerprint) {
			continue;
		}

		const match: AscetPermissionRuleMatch = {
			index,
			behavior: rule.behavior,
			action: rule.action,
			path: rule.path,
			databaseFingerprint: rule.databaseFingerprint,
			reason: `Matched .ascet/permissions.json rules[${index}] (${rule.behavior}).`,
		};
		if (!selected || BEHAVIOR_PRIORITY[match.behavior] > BEHAVIOR_PRIORITY[selected.behavior]) {
			selected = match;
		}
	}
	return selected;
}
