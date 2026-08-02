import { createHash } from "node:crypto";
import type { AscetEsdlDraft, AscetEsdlDraftMethod, AscetInspection } from "./contracts.ts";

export interface AscetEsdlDraftInput {
	runId: string;
	componentPath: string;
	inspection: AscetInspection;
	methodDrafts?: Array<{
		methodName: string;
		code: string;
		operation?: "create" | "replace" | "review";
	}>;
}

export function generateEsdlDraft(input: AscetEsdlDraftInput): AscetEsdlDraft {
	const issues: AscetEsdlDraft["issues"] = [];
	const componentPath = input.componentPath.trim().replace(/\\/g, "/");
	if (!componentPath || componentPath.split("/").includes("..") || componentPath.startsWith("/")) {
		issues.push({
			code: "draft_target_mismatch",
			message: "componentPath must be a relative ASCET path without '..'.",
			path: "componentPath",
		});
	}
	if (!input.inspection || input.inspection.schemaVersion !== "ascet-inspection/v1") {
		issues.push({
			code: "inspection_incomplete",
			message: "A versioned inspection is required before generating an ESDL draft.",
			path: "inspection",
		});
	}
	if (input.inspection && input.inspection.componentPath.replace(/\\/g, "/") !== componentPath) {
		issues.push({
			code: "draft_target_mismatch",
			message: "Draft target does not match inspection.componentPath.",
			path: "componentPath",
		});
	}
	if (input.inspection && !input.inspection.complete) {
		issues.push({
			code: "inspection_incomplete",
			message: "The source inspection is incomplete; the draft is review-only until inspection succeeds.",
			path: "inspection.complete",
		});
	}

	const sourceDrafts = input.methodDrafts ?? [];
	const methods: AscetEsdlDraftMethod[] = sourceDrafts.map((draft) => ({
		methodName: draft.methodName.trim(),
		code: draft.code,
		language: "ESDL",
		operation: draft.operation ?? "review",
	}));
	if (methods.length === 0) {
		issues.push({
			code: "esdl_invalid",
			message:
				"At least one Agent-provided methodDraft is required; the tool does not invent executable ESDL semantics.",
			path: "methodDrafts",
		});
	}
	const names = new Set<string>();
	for (const [index, method] of methods.entries()) {
		if (!method.methodName)
			issues.push({
				code: "esdl_invalid",
				message: "methodName is required.",
				path: `methodDrafts[${index}].methodName`,
			});
		if (names.has(method.methodName))
			issues.push({
				code: "esdl_invalid",
				message: `Duplicate methodName '${method.methodName}'.`,
				path: `methodDrafts[${index}].methodName`,
			});
		names.add(method.methodName);
		if (!method.code.trim())
			issues.push({
				code: "esdl_invalid",
				message: "ESDL method code must not be empty.",
				path: `methodDrafts[${index}].code`,
			});
		if (!hasBalancedDelimiters(method.code))
			issues.push({
				code: "esdl_invalid",
				message: "ESDL method code has unbalanced delimiters.",
				path: `methodDrafts[${index}].code`,
			});
	}

	const text = renderEsdlText(componentPath, methods);
	if (!text.trim()) issues.push({ code: "esdl_invalid", message: "Generated ESDL draft is empty.", path: "text" });
	return {
		schemaVersion: "ascet-esdl-draft/v1",
		runId: input.runId.trim(),
		componentPath,
		sourceInspectionHash: input.inspection?.sourceHash ?? hashInspection(input.inspection),
		target: {
			objectKind: input.inspection?.objectKind ?? "unknown",
			methodNames: methods.map((method) => method.methodName),
		},
		methods,
		text,
		valid: issues.length === 0,
		issues,
		readbackRequired: true,
	};
}

export function renderEsdlText(componentPath: string, methods: AscetEsdlDraftMethod[]): string {
	const sections = [
		"/* ASCET ESDL draft v1 - review artifact; no live write performed. */",
		`/* target: ${componentPath} */`,
		...methods.map((method) =>
			[`/* method: ${method.methodName}; operation: ${method.operation} */`, method.code.trim()].join("\n"),
		),
	];
	return `${sections.join("\n\n")}\n`;
}

export function validateEsdlDraftTarget(draft: AscetEsdlDraft, inspection: AscetInspection): string[] {
	const issues: string[] = [];
	if (draft.componentPath.replace(/\\/g, "/") !== inspection.componentPath.replace(/\\/g, "/"))
		issues.push("draft_target_mismatch");
	if (draft.sourceInspectionHash !== (inspection.sourceHash ?? hashInspection(inspection)))
		issues.push("inspection_hash_mismatch");
	if (!draft.readbackRequired) issues.push("readback_required");
	return issues;
}

function hashInspection(inspection: AscetInspection | undefined): string {
	return createHash("sha256")
		.update(JSON.stringify(inspection ?? null), "utf8")
		.digest("hex");
}

function hasBalancedDelimiters(value: string): boolean {
	const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
	const stack: string[] = [];
	let inLineComment = false;
	let inBlockComment = false;
	let inString: string | undefined;
	let escaped = false;
	for (let index = 0; index < value.length; index += 1) {
		const current = value[index];
		const next = value[index + 1];
		if (inString) {
			if (escaped) {
				escaped = false;
				continue;
			}
			if (current === "\\") {
				escaped = true;
				continue;
			}
			if (current === inString) inString = undefined;
			continue;
		}
		if (inLineComment) {
			if (current === "\n") inLineComment = false;
			continue;
		}
		if (inBlockComment) {
			if (current === "*" && next === "/") {
				inBlockComment = false;
				index += 1;
			}
			continue;
		}
		if (current === "/" && next === "/") {
			inLineComment = true;
			index += 1;
			continue;
		}
		if (current === "/" && next === "*") {
			inBlockComment = true;
			index += 1;
			continue;
		}
		if (current === '"' || current === "'") {
			inString = current;
			continue;
		}
		if (current === "(" || current === "[" || current === "{") stack.push(current);
		if (current === ")" || current === "]" || current === "}") {
			if (stack.pop() !== pairs[current]) return false;
		}
	}
	return !inBlockComment && !inString && stack.length === 0;
}
