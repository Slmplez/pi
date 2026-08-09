import type { TSchema } from "typebox";
import { Value } from "typebox/value";

export interface AscetInvalidParameterDetail {
	keyword: string;
	path: string;
	message: string;
}

export function createInvalidParametersToolResult(
	tool: string,
	schema: TSchema,
	params: unknown,
): ReturnType<typeof buildInvalidParametersToolResult> | undefined {
	if (Value.Check(schema, params)) {
		return undefined;
	}
	const errors = Value.Errors(schema, params).map((error) => ({
		keyword: error.keyword,
		path: error.instancePath,
		message: error.message,
	}));
	return buildInvalidParametersToolResult(tool, errors);
}

function buildInvalidParametersToolResult(tool: string, errors: AscetInvalidParameterDetail[]) {
	const error = {
		code: "ascet_invalid_parameters",
		message: `Invalid parameters for ${tool}.`,
		details: { errors },
	};
	const recover = {
		tool: "ascet_capabilities",
		action: "search_actions",
		query: tool,
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
