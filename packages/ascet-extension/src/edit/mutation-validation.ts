import { accessSync, constants, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { normalizeAscetPath } from "../core/path.ts";
import { requiresExplicitProjectContext } from "../element-spec-contract.ts";
import { validateCreateMethodKindCompatibility } from "../method-kind-compatibility.ts";
import { resolveSetElementDependencyMappings } from "../set-element-dependency.ts";
import { inspectAiGeneratedMarkers } from "./ai-generated-marker.ts";
import type { AscetMutationParams } from "./service.ts";

export interface AscetMutationValidationError {
	code: string;
	message: string;
}

const STATE_CODE_OPERATIONS = new Set([
	"set-method",
	"set-state-entry-esdl",
	"set-state-exit-esdl",
	"set-state-static-esdl",
	"set-transition-condition-esdl",
	"set-transition-action-esdl",
]);
const STATE_BIND_OPERATIONS = new Set([
	"bind-state-entry-method",
	"bind-state-exit-method",
	"bind-state-static-method",
	"bind-transition-condition-method",
	"bind-transition-action-method",
]);
const STATE_STATE_OPERATIONS = new Set([
	"set-state-entry-esdl",
	"set-state-exit-esdl",
	"set-state-static-esdl",
	"bind-state-entry-method",
	"bind-state-exit-method",
	"bind-state-static-method",
]);
const STATE_TRANSITION_OPERATIONS = new Set([
	"set-transition-condition-esdl",
	"set-transition-action-esdl",
	"bind-transition-condition-method",
	"bind-transition-action-method",
]);
const VALID_STATE_MACHINE_OPERATIONS = new Set([...STATE_CODE_OPERATIONS, ...STATE_BIND_OPERATIONS, "set-start-state"]);

function error(message: string, code = "ascet_edit_invalid_parameter"): AscetMutationValidationError {
	return { code, message };
}

function canonicalPath(value: string): string {
	return normalizeAscetPath(value.trim())
		.replace(/\\+/gu, "\\")
		.replace(/^\\+|\\+$/gu, "");
}

function hasText(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function hasExactlyOneCodeSource(params: { code?: string; codeFile?: string }): boolean {
	if (params.codeFile !== undefined && !hasText(params.codeFile)) return false;
	return Number(params.code !== undefined) + Number(params.codeFile !== undefined) === 1;
}

function validateAiCodeMarkers(
	params: AscetMutationParams,
	options: { cwd: string },
): AscetMutationValidationError | undefined {
	if (
		params.action !== "set_method_code" &&
		params.action !== "set_module_code" &&
		params.action !== "set_state_machine_code"
	) {
		return undefined;
	}
	let code = params.code;
	if (code === undefined && params.codeFile !== undefined) {
		const codePath = isAbsolute(params.codeFile) ? params.codeFile : resolve(options.cwd, params.codeFile);
		try {
			code = readFileSync(codePath, "utf8");
		} catch {
			return error(`Code file is not readable: ${params.codeFile}`, "ascet_edit_code_file_unreadable");
		}
	}
	if (code === undefined) return undefined;
	const inspection = inspectAiGeneratedMarkers(code);
	return inspection.issue ? error(inspection.issue.message, inspection.issue.code) : undefined;
}

function formulaReferencesFormal(formula: string, formal: string): boolean {
	const escaped = formal.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
	return new RegExp(`(^|[^A-Za-z0-9_])${escaped}([^A-Za-z0-9_]|$)`, "u").test(formula);
}

function normalizePathField<T extends AscetMutationParams, K extends keyof T>(params: T, field: K): T {
	const value = params[field];
	return typeof value === "string" ? { ...params, [field]: canonicalPath(value) } : params;
}

export function normalizeAscetMutationParams(input: AscetMutationParams): AscetMutationParams {
	let params = input;
	switch (params.action) {
		case "create_folder":
		case "delete_folder":
			params = normalizePathField(params, "folderPath");
			break;
		case "create_component":
		case "delete_component":
			params = normalizePathField(params, "componentPath");
			break;
		case "create_method":
		case "set_method_signature":
		case "delete_method":
		case "set_method_code":
			params = normalizePathField(params, "componentPath");
			params = { ...params, methodName: params.methodName.trim() };
			if (params.action === "set_method_signature" && params.arguments) {
				params = {
					...params,
					arguments: params.arguments.map((argument) => ({ ...argument, name: argument.name.trim() })),
				};
			}
			break;
		case "set_enumerators":
			params = normalizePathField(params, "componentPath");
			params = { ...params, enumerators: params.enumerators.map((name) => name.trim()) };
			break;
		case "set_module_code":
			params = normalizePathField(params, "modulePath");
			if (params.methodName !== undefined) params = { ...params, methodName: params.methodName.trim() };
			break;
		case "set_state_machine_code":
			params = normalizePathField(params, "stateMachinePath");
			params = {
				...params,
				...(params.stateName === undefined ? {} : { stateName: params.stateName.trim() }),
				...(params.sourceState === undefined ? {} : { sourceState: params.sourceState.trim() }),
				...(params.targetState === undefined ? {} : { targetState: params.targetState.trim() }),
				...(params.methodName === undefined ? {} : { methodName: params.methodName.trim() }),
			};
			break;
		case "apply_element_spec":
			params = normalizePathField(params, "componentPath");
			if (params.projectPath) params = normalizePathField(params, "projectPath");
			break;
		case "apply_project_formula":
			params = normalizePathField(params, "projectPath");
			break;
		case "set_element_dependency": {
			const targetPath = params.targetPath ? canonicalPath(params.targetPath) : undefined;
			const componentPath = params.componentPath ? canonicalPath(params.componentPath) : undefined;
			params = {
				...params,
				...(targetPath ? { targetPath } : {}),
				...(componentPath ? { componentPath } : {}),
			};
			const resolvedTarget = targetPath ?? componentPath;
			if (resolvedTarget) {
				params = {
					...params,
					targetPath: resolvedTarget,
					dependencyMappings: resolveSetElementDependencyMappings(params),
				};
			}
			break;
		}
	}
	if (
		params.action === "create_component" &&
		!params.language &&
		(params.kind === "class" || params.kind === "module")
	) {
		return { ...params, language: "ESDL" };
	}
	if (params.action === "set_module_code" && !params.operation && params.section) {
		return { ...params, operation: params.section };
	}
	return params;
}

export function validateAscetMutationParams(
	params: AscetMutationParams,
	options: { cwd: string },
): AscetMutationValidationError | undefined {
	if (params.intent !== "apply") {
		return error(
			"intent=apply is required for ascet_edit writes; use mode=check for read-only editability inspection.",
		);
	}

	const path = (() => {
		switch (params.action) {
			case "create_folder":
			case "delete_folder":
				return params.folderPath;
			case "create_component":
			case "create_method":
			case "set_method_signature":
			case "delete_component":
			case "delete_method":
			case "set_method_code":
			case "set_enumerators":
			case "apply_element_spec":
				return params.componentPath;
			case "set_module_code":
				return params.modulePath;
			case "set_state_machine_code":
				return params.stateMachinePath;
			case "apply_project_formula":
				return params.projectPath;
			case "set_element_dependency":
				return params.targetPath ?? params.componentPath;
		}
	})();
	if (!hasText(path))
		return error(`${params.action} requires a non-empty target path.`, "ascet_edit_missing_parameter");

	if (
		(params.action === "create_method" ||
			params.action === "set_method_signature" ||
			params.action === "delete_method" ||
			params.action === "set_method_code") &&
		!hasText(params.methodName)
	) {
		return error(`${params.action} requires a non-empty methodName.`, "ascet_edit_missing_parameter");
	}

	if (params.action === "create_component") {
		if (params.kind === "enumeration" && params.language !== undefined) {
			return error("create_component does not accept language for enumeration components.");
		}
		if (params.kind === "statemachine" && params.language === "C") {
			return error("create_component does not support language=C for state-machine components.");
		}
	}

	if (params.action === "create_method" && params.componentKind) {
		const compatibility = validateCreateMethodKindCompatibility(params);
		if (compatibility) return compatibility;
	}

	if (
		params.action === "set_method_signature" &&
		!params.returnType &&
		(!params.arguments || params.arguments.length === 0)
	) {
		return error(
			"set_method_signature requires returnType or at least one argument.",
			"ascet_edit_missing_parameter",
		);
	}

	if (params.action === "set_method_signature") {
		if (params.ifReturnExists && !params.returnType) {
			return error("set_method_signature ifReturnExists is only valid when returnType is provided.");
		}
		const argumentNames = (params.arguments ?? []).map((argument) => argument.name.trim());
		if (argumentNames.some((name) => name.length === 0)) {
			return error("set_method_signature argument names must not be empty.");
		}
		if (new Set(argumentNames).size !== argumentNames.length) {
			return error("set_method_signature argument names must be unique.");
		}
	}

	if (params.action === "set_method_code" && !hasExactlyOneCodeSource(params)) {
		return error("set_method_code requires exactly one of code or codeFile.");
	}

	if (params.action === "set_module_code") {
		if (params.operation && params.section && params.operation !== params.section) {
			return error(
				"set_module_code operation and section must agree when both are provided.",
				"ascet_edit_conflicting_parameter",
			);
		}
		if (!params.operation) return error("operation is required for set_module_code.", "ascet_edit_missing_parameter");
		if (!hasExactlyOneCodeSource(params)) return error("set_module_code requires exactly one of code or codeFile.");
		if (params.operation === "set-method" && !hasText(params.methodName)) {
			return error("set_module_code operation=set-method requires methodName.", "ascet_edit_missing_parameter");
		}
		if (params.operation !== "set-method" && params.methodName !== undefined) {
			return error("set_module_code methodName is only valid for operation=set-method.");
		}
	}

	if (params.action === "set_state_machine_code") {
		const operation = params.operation;
		if (!VALID_STATE_MACHINE_OPERATIONS.has(operation)) return error("Unknown state-machine write operation.");
		const hasCode = params.code !== undefined || params.codeFile !== undefined;
		const hasState = params.stateName !== undefined;
		const hasTransition =
			params.sourceState !== undefined || params.targetState !== undefined || params.priority !== undefined;
		const hasMethod = params.methodName !== undefined;
		if (STATE_CODE_OPERATIONS.has(operation) && !hasExactlyOneCodeSource(params)) {
			return error(`${operation} requires exactly one of code or codeFile.`);
		}
		if (!STATE_CODE_OPERATIONS.has(operation) && hasCode)
			return error(`${operation} does not accept code or codeFile.`);
		if (operation === "set-method") {
			if (!hasText(params.methodName))
				return error("set-method requires methodName.", "ascet_edit_missing_parameter");
			if (hasState || hasTransition) return error("set-method does not accept state or transition fields.");
		} else if (STATE_STATE_OPERATIONS.has(operation)) {
			if (!hasText(params.stateName))
				return error(`${operation} requires stateName.`, "ascet_edit_missing_parameter");
			if (hasTransition) return error(`${operation} does not accept transition fields.`);
			if (STATE_BIND_OPERATIONS.has(operation) && !hasText(params.methodName)) {
				return error(`${operation} requires methodName.`, "ascet_edit_missing_parameter");
			}
			if (!STATE_BIND_OPERATIONS.has(operation) && hasMethod)
				return error(`${operation} does not accept methodName.`);
		} else if (STATE_TRANSITION_OPERATIONS.has(operation)) {
			if (!hasText(params.sourceState) || !hasText(params.targetState) || params.priority === undefined) {
				return error(
					`${operation} requires sourceState, targetState, and priority.`,
					"ascet_edit_missing_parameter",
				);
			}
			if (!Number.isInteger(params.priority)) return error(`${operation} priority must be an integer.`);
			if (hasState) return error(`${operation} does not accept stateName.`);
			if (STATE_BIND_OPERATIONS.has(operation) && !hasText(params.methodName)) {
				return error(`${operation} requires methodName.`, "ascet_edit_missing_parameter");
			}
			if (!STATE_BIND_OPERATIONS.has(operation) && hasMethod)
				return error(`${operation} does not accept methodName.`);
		} else if (operation === "set-start-state") {
			if (!hasText(params.stateName))
				return error("set-start-state requires stateName.", "ascet_edit_missing_parameter");
			if (hasTransition || hasMethod) return error("set-start-state does not accept method or transition fields.");
		}
	}

	const codeMarkerError = validateAiCodeMarkers(params, options);
	if (codeMarkerError) return codeMarkerError;

	if (params.action === "set_enumerators") {
		if (params.enumerators.length === 0)
			return error("set_enumerators requires at least one enumerator.", "ascet_edit_missing_parameter");
		if (params.enumerators.some((name) => !hasText(name) || name.includes(",") || /[\r\n]/u.test(name))) {
			return error("Enumerator names must be non-empty and must not contain comma or newline transport delimiters.");
		}
		if (new Set(params.enumerators).size !== params.enumerators.length)
			return error("Enumerator names must be unique.");
	}

	if (params.action === "apply_element_spec") {
		if (params.elements.length === 0)
			return error("apply_element_spec requires at least one element.", "ascet_edit_missing_parameter");
		if (!params.projectPath && requiresExplicitProjectContext(params.elements)) {
			return error(
				"projectPath is required when apply_element_spec uses a non-ident implementation formula.",
				"ascet_edit_project_context_required",
			);
		}
	}

	if (params.action === "apply_project_formula") {
		const specPath = isAbsolute(params.specFile) ? params.specFile : resolve(options.cwd, params.specFile);
		try {
			accessSync(specPath, constants.R_OK);
		} catch {
			return error(
				`apply_project_formula specFile is not readable: ${params.specFile}`,
				"ascet_edit_spec_file_unreadable",
			);
		}
	}

	if (params.action === "set_element_dependency") return validateDependency(params);
	return undefined;
}

function validateDependency(
	params: Extract<AscetMutationParams, { action: "set_element_dependency" }>,
): AscetMutationValidationError | undefined {
	if (
		params.targetPath &&
		params.componentPath &&
		canonicalPath(params.targetPath).toLowerCase() !== canonicalPath(params.componentPath).toLowerCase()
	) {
		return error(
			"set_element_dependency targetPath and componentPath must identify the same target when both are provided.",
			"ascet_edit_conflicting_parameter",
		);
	}
	if (!params.targetPath && !params.componentPath)
		return error("set_element_dependency requires targetPath or componentPath.", "ascet_edit_missing_parameter");
	if (!hasText(params.elementName))
		return error("set_element_dependency requires elementName.", "ascet_edit_missing_parameter");
	if (!params.dependency) return error("set_element_dependency requires dependency.", "ascet_edit_missing_parameter");
	if (params.dependency === "dependent" && !hasText(params.dependencyFormula)) {
		return error("Dependent conversion requires dependencyFormula.", "dependency_formula_required");
	}
	if (params.dependency === "independent" && params.dependencyFormula) {
		return error('dependencyFormula is only valid with dependency="dependent".');
	}
	if (params.dependencyMappings && Object.keys(params.dependencyMappings).length === 0) {
		return error("dependencyMappings must contain at least one formal binding.", "dependency_mappings_required");
	}
	if (params.variantMappings && Object.keys(params.variantMappings).length === 0) {
		return error("variantMappings must contain at least one DataVariant mapping.", "dependency_mappings_required");
	}
	if (params.dependencyFormula && params.clearDependencyFormula) {
		return error("dependencyFormula and clearDependencyFormula cannot be used together.");
	}
	if (params.bindingPolicy === "autoExactName") {
		if (!params.dependencyFormula || !params.dependencyFormals?.length) {
			return error(
				"bindingPolicy=autoExactName requires dependencyFormula and explicit dependencyFormals.",
				"dependency_formals_required",
			);
		}
		if (params.variantMappings) return error("autoExactName does not combine with per-variant explicit mappings.");
	}
	if (
		params.dependencyFormula &&
		params.bindingPolicy !== "autoExactName" &&
		!params.dependencyMappings &&
		!params.variantMappings
	) {
		return error(
			"dependencyFormula requires explicit dependencyMappings, or autoExactName with explicit dependencyFormals; formula token inference is disabled.",
			"dependency_mappings_required",
		);
	}
	if (params.dependencyFormals && params.bindingPolicy !== "autoExactName") {
		return error("dependencyFormals is only valid with bindingPolicy=autoExactName.");
	}
	if ((params.dependencyMappings || params.variantMappings) && !params.dependencyFormula) {
		return error("dependency mappings require dependencyFormula.");
	}
	const mappingEntries = [
		...Object.entries(params.dependencyMappings ?? {}),
		...Object.values(params.variantMappings ?? {}).flatMap((mapping) => Object.entries(mapping)),
	];
	if (
		mappingEntries.some(
			([formal, target]) => !hasText(formal) || !hasText(typeof target === "string" ? target : target.name),
		)
	) {
		return error("Dependency mapping formals and target names must not be empty.", "dependency_mapping_mismatch");
	}
	if (params.dependencyFormula) {
		const mappingKeys = new Set([
			...Object.keys(params.dependencyMappings ?? {}),
			...Object.values(params.variantMappings ?? {}).flatMap((mapping) => Object.keys(mapping)),
		]);
		if ([...mappingKeys].some((formal) => !formulaReferencesFormal(params.dependencyFormula!, formal))) {
			return error(
				"Every dependency mapping formal must be referenced by dependencyFormula.",
				"dependency_mapping_mismatch",
			);
		}
	}
	const writesData = params.dependency === "independent" || params.dependencyFormula !== undefined;
	if (writesData && !params.variantPolicy)
		return error("Data writes require explicit variantPolicy.", "data_variant_selection_required");
	if (params.variantPolicy === "selected" && !params.variants?.length)
		return error('variantPolicy="selected" requires variants.', "data_variant_selection_required");
	if (params.variantPolicy !== "selected" && params.variants !== undefined)
		return error("variants is only valid with variantPolicy=selected.");
	if (params.variantMappings && params.variantPolicy !== "selected")
		return error("variantMappings requires variantPolicy=selected.");
	if (params.variants) {
		const normalizedVariants = params.variants.map((variant) => variant.trim());
		if (
			normalizedVariants.some((variant) => variant.length === 0) ||
			new Set(normalizedVariants).size !== normalizedVariants.length
		) {
			return error("variants must contain unique, non-empty DataVariant names.", "data_variant_selection_required");
		}
	}
	if (
		params.variantMappings &&
		Object.values(params.variantMappings).some((mapping) => Object.keys(mapping).length === 0)
	) {
		return error(
			"Every variantMappings entry must contain at least one formal binding.",
			"dependency_mappings_required",
		);
	}
	if (params.variantMappings && params.variants) {
		const selected = new Set(params.variants);
		const mapped = Object.keys(params.variantMappings);
		if (mapped.length !== selected.size || mapped.some((variant) => !selected.has(variant))) {
			return error(
				"variantMappings must define exactly every selected DataVariant.",
				"data_variant_mapping_mismatch",
			);
		}
	}
	if (params.dependency === "independent" && !params.valueRestoration) {
		return error("Independent conversion requires valueRestoration.", "independent_value_restoration_required");
	}
	if (
		params.valueRestoration?.policy === "explicit" &&
		!Object.keys(params.valueRestoration.valuesByVariant ?? {}).length
	) {
		return error(
			"Explicit independent restoration requires valuesByVariant.",
			"independent_value_restoration_required",
		);
	}
	if (params.match === "all" && params.targetKind !== "folder") {
		return error('match="all" requires targetKind="folder".', "ascet_edit_invalid_scope");
	}
	if (params.targetKind === "folder" && params.match !== "all") {
		return error('Folder writes require targetKind="folder" and match="all".', "ascet_edit_invalid_scope");
	}
	return undefined;
}

export function getAscetMutationPermissionEvidence(params: AscetMutationParams): {
	targetCount?: number;
	variantCount?: number;
	evidenceComplete: boolean;
	impactUnknown: boolean;
} {
	if (params.action === "apply_element_spec") {
		const impactUnknown = params.deleteMissing === true;
		return {
			targetCount: impactUnknown ? undefined : params.elements.length,
			variantCount: 1,
			evidenceComplete: !impactUnknown,
			impactUnknown,
		};
	}
	if (params.action === "delete_folder" || params.action === "apply_project_formula") {
		return { targetCount: undefined, variantCount: 1, evidenceComplete: false, impactUnknown: true };
	}
	if (params.action === "set_element_dependency") {
		const variantCount =
			params.variantPolicy === "selected" ? params.variants?.length : params.variantPolicy === "all" ? undefined : 1;
		const targetCount = params.targetKind === "folder" || params.match === "all" ? undefined : 1;
		const impactUnknown = targetCount === undefined || variantCount === undefined;
		return {
			targetCount,
			variantCount,
			evidenceComplete: !impactUnknown,
			impactUnknown,
		};
	}
	return { targetCount: 1, variantCount: 1, evidenceComplete: true, impactUnknown: false };
}
