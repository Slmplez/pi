import type { TSchema } from "typebox";
import { Value } from "typebox/value";
import {
	type AscetSchemaVariantSelection,
	describeAscetPublicSchemaVariant,
	selectAscetPublicSchemaVariants,
} from "../actions/schema-registry.ts";

export interface AscetInvalidParameterDetail {
	keyword: string;
	path: string;
	message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deduplicateErrors(errors: readonly AscetInvalidParameterDetail[]): AscetInvalidParameterDetail[] {
	const seen = new Set<string>();
	return errors.filter((error) => {
		const key = JSON.stringify([error.keyword, error.path, error.message]);
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
}

export function createInvalidParametersToolResult(
	tool: string,
	schema: TSchema,
	params: unknown,
): ReturnType<typeof buildToolErrorResult> | undefined {
	const selection = selectAscetPublicSchemaVariants(schema, params);
	if (selection.status !== "selected") {
		return buildDiscriminatorErrorResult(tool, selection, params);
	}
	if (selection.variants.some((variant) => Value.Check(variant.schema, params))) {
		return undefined;
	}
	const errors = deduplicateErrors(
		selection.variants.flatMap((variant) =>
			Value.Errors(variant.schema, params).map((error) => ({
				keyword: error.keyword,
				path: error.instancePath,
				message: error.message,
			})),
		),
	);
	const action = isRecord(params) && typeof params.action === "string" ? params.action : undefined;
	const variant =
		selection.variants.length === 1 ? describeAscetPublicSchemaVariant(selection.variants[0]) : undefined;
	return buildToolErrorResult(
		tool,
		{
			code: "ascet_invalid_parameters",
			message: action ? `Invalid parameters for ${tool} action '${action}'.` : `Invalid parameters for ${tool}.`,
			details: { ...(action ? { action } : {}), ...(variant ? { variant } : {}), errors },
		},
		params,
	);
}

function buildDiscriminatorErrorResult(
	tool: string,
	selection: Exclude<AscetSchemaVariantSelection, { status: "selected" }>,
	params: unknown,
): ReturnType<typeof buildToolErrorResult> {
	const action = isRecord(params) && typeof params.action === "string" ? params.action : undefined;
	if (selection.status === "unknown_discriminator") {
		const code = selection.field === "action" ? "unknown_action" : "unknown_mode";
		return buildToolErrorResult(
			tool,
			{
				code,
				message: `Unknown ${tool} ${selection.field} '${selection.value}'.`,
				details: {
					...(selection.field === "action" ? { action: selection.value } : { mode: selection.value }),
					field: selection.field,
					expected: selection.expected,
				},
			},
			params,
		);
	}
	return buildToolErrorResult(
		tool,
		{
			code: "invalid_variant",
			message: `Invalid ${selection.field} '${selection.value}' for ${tool}${action ? ` action '${action}'` : ""}.`,
			details: {
				...(action ? { action } : {}),
				field: selection.field,
				value: selection.value,
				expected: selection.expected,
			},
		},
		params,
	);
}

function buildToolErrorResult(
	tool: string,
	error: { code: string; message: string; details: Record<string, unknown> },
	params: unknown,
) {
	const action = isRecord(params) && typeof params.action === "string" ? params.action : undefined;
	const recover = {
		tool: "ascet_capabilities",
		action: "search_actions",
		query: action ? `${tool}.${action}` : tool,
	};
	return {
		content: [{ type: "text", text: JSON.stringify({ error, recover }) }],
		details: {
			ok: false,
			tool,
			error,
			recover,
		},
	};
}
