import { createHash } from "node:crypto";
import type {
	AscetElementSpec,
	AscetEsdlApplyPlan,
	AscetEsdlDraft,
	AscetEsdlDraftMethod,
	AscetInspection,
} from "./contracts.ts";

export interface AscetEsdlDraftInput {
	runId: string;
	componentPath: string;
	inspection: AscetInspection;
	methodDrafts?: Array<{
		methodName: string;
		code: string;
		operation?: "create" | "replace" | "review";
	}>;
	elementSpec?: AscetElementSpec;
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
	const elementArtifacts = input.elementSpec
		? buildElementArtifacts(input.elementSpec, componentPath, input.inspection, issues)
		: undefined;
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
		elementSpec: elementArtifacts?.spec,
		applyPlan: elementArtifacts?.plan,
	};
}

function buildElementArtifacts(
	input: AscetElementSpec,
	componentPath: string,
	inspection: AscetInspection,
	issues: AscetEsdlDraft["issues"],
): { spec: AscetElementSpec; plan: AscetEsdlApplyPlan } {
	const localIssues: AscetEsdlDraft["issues"] = [];
	if (input.schemaVersion !== "ascet-element-spec/v1") {
		localIssues.push({
			code: "element_spec_invalid",
			message: "elementSpec schemaVersion must be ascet-element-spec/v1.",
			path: "elementSpec.schemaVersion",
		});
	}
	const elements = [...(input.elements ?? [])]
		.map((element) => ({
			...element,
			name: element.name.trim(),
			kind: element.kind,
			type: element.type.trim(),
			operation: element.operation ?? "create",
		}))
		.sort((left, right) => left.name.localeCompare(right.name) || left.kind.localeCompare(right.kind));
	const existing = new Map<string, { kind: string; type?: string }>();
	for (const [kind, ports] of [
		["parameter", inspection.interfaces.parameters],
		["variable", inspection.interfaces.variables],
		["input", inspection.interfaces.inputs],
		["output", inspection.interfaces.outputs],
	] as const) {
		for (const port of ports) existing.set(port.name, { kind, type: port.type });
	}
	const operations: AscetEsdlApplyPlan["operations"] = [];
	const conflicts: AscetEsdlApplyPlan["conflicts"] = [];
	const seen = new Set<string>();
	for (const [index, element] of elements.entries()) {
		const path = `elementSpec.elements[${index}]`;
		if (!element.name)
			localIssues.push({ code: "element_spec_invalid", message: "Element name is required.", path: `${path}.name` });
		if (!element.type)
			localIssues.push({ code: "element_spec_invalid", message: "Element type is required.", path: `${path}.type` });
		if (!seen.add(`${element.kind}:${element.name}`))
			localIssues.push({
				code: "element_duplicate",
				message: `Duplicate element declaration '${element.name}'.`,
				path,
			});
		if (!element.name || !element.type) continue;
		const previous = existing.get(element.name);
		let action: "create" | "update" | "conflict" = element.operation === "update" ? "update" : "create";
		let reason = "";
		if (element.operation === "upsert") action = previous ? "update" : "create";
		if (element.operation !== undefined && !["create", "update", "upsert"].includes(element.operation)) {
			localIssues.push({
				code: "element_spec_invalid",
				message: "operation must be create, update or upsert.",
				path: `${path}.operation`,
			});
		}
		if (previous && previous.kind !== element.kind && previous.kind !== "input" && previous.kind !== "output") {
			action = "conflict";
			reason = "existing_element_type_or_kind_mismatch";
		} else if (element.operation === "create" && previous) {
			action = "conflict";
			reason = "element_already_exists";
		} else if (element.operation === "update" && !previous) {
			action = "conflict";
			reason = "element_to_update_missing";
		}
		operations.push({ sequence: operations.length + 1, action, element, reason });
		if (action === "conflict") {
			conflicts.push({ name: element.name, kind: element.kind, type: element.type, reason });
			localIssues.push({
				code: "element_conflict",
				message: `Element '${element.name}' cannot be applied: ${reason}.`,
				path,
			});
		}
	}
	issues.push(...localIssues);
	const spec: AscetElementSpec = {
		schemaVersion: "ascet-element-spec/v1",
		componentPath,
		sourceDraftHash: inspection.sourceHash,
		elements,
		valid: localIssues.length === 0,
		issues: localIssues,
	};
	spec.hash = hashJson(spec);
	const plan: AscetEsdlApplyPlan = {
		schemaVersion: "ascet-esdl-apply-plan/v1",
		componentPath,
		sourceElementSpecHash: spec.hash,
		baselineFingerprint: inspection.sourceHash,
		operations,
		conflicts,
		ready: localIssues.length === 0 && conflicts.length === 0,
		liveWritePerformed: false,
		readbackRequired: true,
	};
	plan.hash = hashJson(plan);
	return { spec, plan };
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
	return hashJson(inspection ?? null);
}

function hashJson(value: unknown): string {
	return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
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
