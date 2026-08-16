import { findAscetPermissionRule } from "./rules.ts";
import type {
	AscetPermissionDecision,
	AscetPermissionEvaluationInput,
	AscetPermissionRuleMatch,
	AscetWriteRisk,
} from "./types.ts";

function classifyRisk(input: AscetPermissionEvaluationInput): AscetWriteRisk {
	if (input.minimumRisk === "high" || input.descriptor.baseRisk === "high" || input.sharedObject) return "high";
	if (
		input.minimumRisk === "medium" ||
		input.descriptor.baseRisk === "medium" ||
		input.editableAcquisitionRequired ||
		(input.targetCount ?? 1) > 1 ||
		(input.variantCount ?? 1) > 1
	) {
		return "medium";
	}
	return "safe";
}

function mediumRiskRequiresPrimaryAllow(input: AscetPermissionEvaluationInput): boolean {
	return (
		input.minimumRisk === "medium" ||
		input.descriptor.baseRisk === "medium" ||
		(input.targetCount ?? 1) > 1 ||
		(input.variantCount ?? 1) > 1
	);
}

function decision(
	input: AscetPermissionEvaluationInput,
	behavior: AscetPermissionDecision["behavior"],
	risk: AscetWriteRisk,
	reason: string,
	rule?: AscetPermissionRuleMatch,
): AscetPermissionDecision {
	return { behavior, mode: input.mode, risk, reason, rule };
}

export function evaluateAscetPermission(input: AscetPermissionEvaluationInput): AscetPermissionDecision {
	const risk = classifyRisk(input);
	if (!input.hardGatesPassed) {
		return decision(input, "deny", risk, input.hardGateReason ?? "A mandatory ASCET safety gate failed.");
	}
	if (!input.evidenceComplete) {
		return decision(input, "deny", risk, "Required ASCET safety evidence is incomplete.");
	}
	if (input.noOp) {
		return decision(input, "allow", risk, "Authoritative preflight proved this operation is a no-op.");
	}

	const rules = input.rules ?? [];
	const primaryRule = findAscetPermissionRule({
		rules,
		action: input.action,
		path: input.path,
		databaseFingerprint: input.databaseFingerprint,
	});
	const editabilityRule = input.editableAcquisitionRequired
		? findAscetPermissionRule({
				rules,
				action: "request_editability",
				path: input.path,
				databaseFingerprint: input.databaseFingerprint,
			})
		: undefined;

	const denyRule = [primaryRule, editabilityRule].find((rule) => rule?.behavior === "deny");
	if (denyRule) return decision(input, "deny", risk, denyRule.reason, denyRule);

	if (input.mode === "default") {
		return decision(input, "ask", risk, "Default mode requires confirmation for every actual ASCET write.");
	}

	if (risk === "high") {
		return decision(input, "ask", risk, "High-risk ASCET writes always require confirmation.", primaryRule);
	}

	if (input.mode === "acceptEdits") {
		if (risk === "safe") {
			return decision(input, "allow", risk, "Accept Edits allows safe, single-target, verified edits.");
		}
		return decision(input, "ask", risk, "Accept Edits requires confirmation for medium-risk writes.");
	}

	const askRule = [primaryRule, editabilityRule].find((rule) => rule?.behavior === "ask");
	if (askRule) return decision(input, "ask", risk, askRule.reason, askRule);

	if (input.editableAcquisitionRequired && editabilityRule?.behavior !== "allow") {
		return decision(input, "ask", risk, "Auto mode requires a scoped allow rule to request editability.");
	}

	if (risk === "medium") {
		const primaryAllowRequired = mediumRiskRequiresPrimaryAllow(input);
		if (primaryAllowRequired && primaryRule?.behavior !== "allow") {
			return decision(
				input,
				"ask",
				risk,
				"Auto mode requires a scoped allow rule for the primary medium-risk write.",
			);
		}
		const coveringRule = primaryAllowRequired ? primaryRule : (editabilityRule ?? primaryRule);
		return input.descriptor.autoApprovable
			? decision(input, "allow", risk, "Scoped allow rules cover this auto-approvable write.", coveringRule)
			: decision(input, "ask", risk, "This operation is not auto-approvable.", coveringRule);
	}

	if (primaryRule?.behavior === "allow") {
		return input.descriptor.autoApprovable
			? decision(input, "allow", risk, primaryRule.reason, primaryRule)
			: decision(input, "ask", risk, "This operation is not auto-approvable.", primaryRule);
	}
	return decision(input, "allow", risk, "Auto mode allows safe, fully evidenced ASCET writes.");
}
