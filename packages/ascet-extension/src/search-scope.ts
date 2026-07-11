export interface AscetScopedSearchParams {
	componentPath?: string;
	scopePath?: string;
	match?: "exact" | "glob" | "contains";
}

export function inferComponentPathFromScope(params: AscetScopedSearchParams): string | undefined {
	if (params.componentPath || !params.scopePath) {
		return params.componentPath;
	}
	if (params.match === "exact" && /[\\/]/.test(params.scopePath)) {
		return params.scopePath;
	}
	return undefined;
}
