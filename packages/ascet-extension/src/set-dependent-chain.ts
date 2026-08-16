import { Type } from "typebox";
import type { AscetCliJsonResult } from "./cli.ts";
import type { AscetToolContext } from "./core/tool.ts";
import type { RunAscetEditOperationOptions } from "./edit/common.ts";
import { type AscetEditResult, type AscetEditParams as LegacyAscetEditParams, runAscetEdit } from "./edit/service.ts";
import {
	createDependentChainOutput,
	readAscetDatabaseFingerprint,
	resolveExportedParameter,
	runAscetReadDependentChain,
	runAscetReadDependentChainMetadata,
} from "./read-dependent-chain.ts";
import { runAscetReadElement } from "./read-element.ts";
import { unwrapToolSuccessPayload } from "./tool-response-contract.ts";

export interface AscetDependentChainBinding {
	importedElement: string;
	formula: string;
	formal: string;
	variantPolicy: "default" | "selected" | "all";
	variants?: string[];
}

export interface AscetSetDependentChainParams {
	action: "set_dependent_chain";
	componentPath: string;
	dependentElement: string;
	exporterComponentPath?: string;
	exportedElement?: string;
	binding?: AscetDependentChainBinding;
	intent: "preview" | "apply";
}

export interface AscetSetDependentChainResult {
	content: Record<string, unknown>;
	details: Record<string, unknown>;
}

const bindingSchema = Type.Object(
	{
		importedElement: Type.String({ minLength: 1 }),
		formula: Type.String({ minLength: 1 }),
		formal: Type.String({ minLength: 1 }),
		variantPolicy: Type.Union([Type.Literal("default"), Type.Literal("selected"), Type.Literal("all")]),
		variants: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1, uniqueItems: true })),
	},
	{ additionalProperties: false },
);

export const ascetSetDependentChainActionSchema = Type.Object(
	{
		action: Type.Literal("set_dependent_chain"),
		componentPath: Type.String({ minLength: 1 }),
		dependentElement: Type.String({ minLength: 1 }),
		exporterComponentPath: Type.Optional(Type.String({ minLength: 1 })),
		exportedElement: Type.Optional(Type.String({ minLength: 1 })),
		binding: Type.Optional(bindingSchema),
		intent: Type.Union([Type.Literal("preview"), Type.Literal("apply")]),
	},
	{ additionalProperties: false },
);

type JsonRecord = Record<string, unknown>;
type DependencyMutation = Extract<LegacyAscetEditParams, { action: "set_element_dependency" }>;
type ExecuteAscetEdit = typeof runAscetEdit;

export async function runAscetSetDependentChain(
	params: AscetSetDependentChainParams,
	options: RunAscetEditOperationOptions,
	ctx: AscetToolContext,
	executeEdit: ExecuteAscetEdit = runAscetEdit,
): Promise<AscetSetDependentChainResult> {
	const bindingValidation = validateBinding(params.binding);
	if (bindingValidation) return errorResult("binding_invalid", bindingValidation);

	const beforeIdentity = await readAscetDatabaseFingerprint(options);
	if (!beforeIdentity.ok) return cliErrorResult(beforeIdentity.result);

	const current = await runAscetReadDependentChainMetadata(
		{
			componentPath: params.componentPath,
			dependentElement: params.dependentElement,
			...(params.exporterComponentPath ? { exporterComponentPath: params.exporterComponentPath } : {}),
		},
		options,
	);
	if (!current.ok && !params.binding) return cliErrorResult(current);

	const binding = params.binding ?? extractBinding(current);
	if (!binding) {
		return errorResult(
			"binding_metadata_required",
			"Existing Formula, Formal, Imported Parameter, and DataVariant metadata are incomplete; provide binding explicitly.",
		);
	}
	const exportedElement = params.exportedElement ?? binding.importedElement;
	if (exportedElement !== binding.importedElement) {
		return errorResult(
			"binding_invalid",
			"Version 1 requires the Imported and Exported Parameter names to match exactly.",
		);
	}

	const localRead = await runAscetReadElement(
		{ componentPath: params.componentPath, elementName: params.dependentElement },
		options,
	);
	const local = exactElement(localRead);
	if (!isParameterWithScope(local, "local")) {
		return errorResult(
			"dependent_element_not_found",
			`Local Parameter '${params.dependentElement}' was not found in '${params.componentPath}'.`,
			{ raw: localRead },
		);
	}

	const provider = await resolveExportedParameter(
		{
			consumerComponentPath: params.componentPath,
			importedElement: binding.importedElement,
			...(params.exporterComponentPath ? { exporterComponentPath: params.exporterComponentPath } : {}),
			exportedElement,
		},
		options,
	);
	if (!provider.ok) return cliErrorResult(provider.result);

	const preview = {
		local: `${params.componentPath}\\${params.dependentElement}`,
		imported: `${params.componentPath}\\${binding.importedElement}`,
		exported: `${provider.componentPath}\\${provider.elementName}`,
	};
	const resolvedCurrent =
		params.intent === "apply" && !params.exporterComponentPath
			? await runAscetReadDependentChainMetadata(
					{ ...params, exporterComponentPath: provider.componentPath },
					options,
				)
			: current;
	if (!resolvedCurrent.ok) return cliErrorResult(resolvedCurrent);
	const alreadyConfigured = chainMatches(resolvedCurrent, params, binding, provider.componentPath);
	if (params.intent === "apply" && alreadyConfigured) {
		const afterIdentity = await readAscetDatabaseFingerprint(options);
		if (!afterIdentity.ok) return cliErrorResult(afterIdentity.result);
		if (beforeIdentity.fingerprint !== afterIdentity.fingerprint) {
			return errorResult("database_changed", "ASCET database changed during dependency-chain validation.");
		}
		return {
			content: { changed: false, chain: createDependentChainOutput(resolvedCurrent).chain },
			details: { provider, binding, idempotent: true },
		};
	}

	const mutation = {
		action: "set_element_dependency",
		targetPath: params.componentPath,
		elementName: params.dependentElement,
		dependency: "dependent",
		dependencyFormula: binding.formula,
		bindingPolicy: "explicit",
		dependencyMappings: {
			[binding.formal]: { kind: "parameter", name: binding.importedElement },
		},
		variantPolicy: binding.variantPolicy,
		...(binding.variants ? { variants: binding.variants } : {}),
		intent: params.intent,
	} satisfies DependencyMutation;
	const edit = await executeEdit(mutation, options, ctx);
	const editError = getEditError(edit);
	if (editError) {
		return errorResult(editError.code, editError.message, { edit: edit.details });
	}

	const afterIdentity = await readAscetDatabaseFingerprint(options);
	if (!afterIdentity.ok) return cliErrorResult(afterIdentity.result);
	if (beforeIdentity.fingerprint !== afterIdentity.fingerprint) {
		return errorResult("database_changed", "ASCET database changed during dependency-chain write.", {
			edit: edit.details,
		});
	}

	if (params.intent === "preview") {
		return {
			content: { changed: false, preview },
			details: { provider, binding, edit: edit.details },
		};
	}

	const readback = await runAscetReadDependentChain(
		{
			componentPath: params.componentPath,
			dependentElement: params.dependentElement,
			exporterComponentPath: provider.componentPath,
		},
		options,
	);
	const chain = createDependentChainOutput(readback);
	if (chain.found !== true || !chainMatches(readback, params, binding, provider.componentPath)) {
		return errorResult(
			"write_verification_failed",
			"Dependency-chain write did not match the exact requested chain.",
			{
				edit: edit.details,
				readback,
			},
		);
	}
	return {
		content: { changed: true, chain: chain.chain },
		details: { provider, binding, edit: edit.details },
	};
}

function validateBinding(binding: AscetDependentChainBinding | undefined): string | undefined {
	if (!binding) return undefined;
	if (binding.variantPolicy === "selected" && (!binding.variants || binding.variants.length === 0)) {
		return 'binding.variants is required when variantPolicy="selected".';
	}
	if (binding.variantPolicy !== "selected" && binding.variants) {
		return 'binding.variants is only valid when variantPolicy="selected".';
	}
	return undefined;
}

function extractBinding(result: AscetCliJsonResult): AscetDependentChainBinding | undefined {
	if (!result.ok) return undefined;
	const payload = getPayload(result.data);
	const dependencyFormula = isRecord(payload?.dependencyFormula) ? payload.dependencyFormula : undefined;
	const formula = readString(dependencyFormula, "code");
	const mappings = Array.isArray(dependencyFormula?.mappings) ? dependencyFormula.mappings : [];
	const unique = new Map<string, { formal: string; imported: string }>();
	for (const mapping of mappings) {
		if (!isRecord(mapping)) continue;
		const formal = readString(mapping, "formal");
		const imported = readString(mapping, "imported");
		if (formal && imported) unique.set(`${formal}\u0000${imported}`, { formal, imported });
	}
	if (!formula || unique.size !== 1) return undefined;
	const mapping = [...unique.values()][0];
	const inputs = Array.isArray(payload?.inputs) ? payload.inputs : [];
	const variants = [
		...new Set(
			inputs.flatMap((input) => {
				if (!isRecord(input)) return [];
				const variant = readString(input, "variant");
				return variant ? [variant] : [];
			}),
		),
	];
	const nonDefaultVariants = variants.filter((variant) => variant.toLowerCase() !== "default");
	return {
		importedElement: mapping.imported,
		formula,
		formal: mapping.formal,
		variantPolicy: nonDefaultVariants.length === 0 ? "default" : "selected",
		...(nonDefaultVariants.length > 0 ? { variants: nonDefaultVariants } : {}),
	};
}

function chainMatches(
	result: AscetCliJsonResult,
	params: AscetSetDependentChainParams,
	binding: AscetDependentChainBinding,
	providerComponentPath: string,
): boolean {
	const output = createDependentChainOutput(result);
	if (output.found !== true || !isRecord(output.chain)) return false;
	const local = isRecord(output.chain.local) ? output.chain.local : undefined;
	const imported = isRecord(output.chain.imported) ? output.chain.imported : undefined;
	const exported = isRecord(output.chain.exported) ? output.chain.exported : undefined;
	if (
		readString(local, "componentPath") !== params.componentPath ||
		readString(local, "element") !== params.dependentElement ||
		readString(imported, "componentPath") !== params.componentPath ||
		readString(imported, "element") !== binding.importedElement ||
		readString(exported, "componentPath") !== providerComponentPath ||
		readString(exported, "element") !== binding.importedElement
	) {
		return false;
	}
	const existing = extractBinding(result);
	return existing !== undefined && JSON.stringify(existing) === JSON.stringify(binding);
}

function getEditError(edit: AscetEditResult): { code: string; message: string } | undefined {
	const outcome = edit.details.outcome;
	if (outcome.status === "ok" || outcome.status === "preflight") return undefined;
	if (outcome.status === "error") return outcome.error;
	if (outcome.status === "blocked") return { code: outcome.code, message: outcome.message };
	const failure = outcome.failures[0];
	return {
		code: typeof failure?.code === "string" ? failure.code : "write_rejected",
		message:
			typeof failure?.message === "string" ? failure.message : "Dependency-chain write was only partially applied.",
	};
}

function cliErrorResult(result: AscetCliJsonResult): AscetSetDependentChainResult {
	return errorResult(
		result.error?.code ?? "set_dependent_chain_failed",
		result.error?.message ?? "ASCET dependency-chain operation failed.",
		{ raw: result },
	);
}

function errorResult(
	code: string,
	message: string,
	details: Record<string, unknown> = {},
): AscetSetDependentChainResult {
	return { content: { changed: false, error: { code, message } }, details };
}

function exactElement(result: AscetCliJsonResult): JsonRecord | undefined {
	if (!result.ok) return undefined;
	const payload = getPayload(result.data);
	return isRecord(payload?.element) ? payload.element : undefined;
}

function isParameterWithScope(element: JsonRecord | undefined, scope: string): boolean {
	return (
		readString(element, "kind")?.toLowerCase() === "parameter" &&
		readString(element, "scope")?.toLowerCase() === scope
	);
}

function getPayload(data: unknown): JsonRecord | undefined {
	const payload = unwrapToolSuccessPayload(data);
	return isRecord(payload) ? payload : undefined;
}

function isRecord(value: unknown): value is JsonRecord {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readString(record: JsonRecord | undefined, key: string): string | undefined {
	const value = record?.[key];
	return typeof value === "string" && value.length > 0 ? value : undefined;
}
