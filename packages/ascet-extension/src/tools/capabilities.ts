import { toToolFailurePayload } from "../tool-response-contract.ts";
import {
	type SearchActionParams,
	type SearchActionResult,
	searchActionCatalog,
	toActionSearchPayload,
} from "./actions/search.ts";

export interface AscetCapabilitiesParams {
	action: "search_actions";
	query?: string;
	tool?: string;
	name?: string;
	limit?: number;
	includeHidden?: boolean;
	detailLevel?: "summary" | "full";
}

export interface RunAscetCapabilitiesOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
}

export interface AscetCapabilitiesResult {
	ok: boolean;
	actionSearch?: SearchActionResult;
	error?: {
		code: string;
		message: string;
	};
}

export function runAscetCapabilities(
	params: AscetCapabilitiesParams,
	options: RunAscetCapabilitiesOptions,
): AscetCapabilitiesResult {
	void options;
	if (params.action !== "search_actions") {
		return {
			ok: false,
			error: {
				code: "ascet_capabilities_invalid_action",
				message: "ascet_capabilities only supports action=search_actions.",
			},
		};
	}
	return {
		ok: true,
		actionSearch: searchActionCatalog(toSearchActionParams(params)),
	};
}

function toSearchActionParams(params: AscetCapabilitiesParams): SearchActionParams {
	return {
		query: params.query,
		tool: params.tool,
		name: params.name,
		limit: params.limit,
		includeHidden: params.includeHidden,
		detailLevel: params.detailLevel,
	};
}

export function toAscetCapabilitiesPayload(result: AscetCapabilitiesResult): unknown {
	if (!result.ok) {
		return toToolFailurePayload({
			code: result.error?.code ?? "ascet_capabilities_failed",
			message: result.error?.message ?? "ASCET capabilities failed.",
		});
	}
	return toActionSearchPayload(
		result.actionSearch ?? { total: 0, items: [], catalogFingerprint: "", catalogVersion: 1 },
	);
}

export function formatAscetCapabilitiesResult(result: AscetCapabilitiesResult): string {
	return JSON.stringify(toAscetCapabilitiesPayload(result), null, 2);
}
