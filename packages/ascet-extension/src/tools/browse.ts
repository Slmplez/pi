import { Type } from "typebox";
import type { AscetCliExecutionResult, AscetCliJsonResult, AscetCliRequest } from "../cli.ts";
import { formatListComponentsResult, runAscetListComponents } from "../list-components.ts";
import { formatListDiagramsResult, runAscetListDiagrams } from "../list-diagrams.ts";
import { formatListFoldersResult, runAscetListFolders } from "../list-folders.ts";
import { formatListMethodsResult, runAscetListMethods } from "../list-methods.ts";
import { formatReadComponentChildrenResult, runAscetReadComponentChildren } from "../read-component-children.ts";

export type AscetBrowseParams =
	| { action: "folders"; rootPath?: string; depth?: number }
	| {
			action: "components";
			folderPath: string;
			kind?: "class" | "module" | "statemachine";
			query?: string;
			limit?: number;
			recursive?: boolean;
	  }
	| { action: "children"; componentPath: string; group?: "methods" | "elements" | "variables" | "diagrams" | "all" }
	| { action: "methods"; componentPath: string }
	| { action: "diagrams"; componentPath: string; diagramKind?: string };

export interface RunAscetBrowseOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export const ascetBrowseParameters = Type.Union([
	Type.Object({
		action: Type.Literal("folders"),
		rootPath: Type.Optional(Type.String({ minLength: 1 })),
		depth: Type.Optional(Type.Number({ minimum: 0, maximum: 20 })),
	}),
	Type.Object({
		action: Type.Literal("components"),
		folderPath: Type.String({ minLength: 1 }),
		kind: Type.Optional(Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")])),
		query: Type.Optional(Type.String()),
		limit: Type.Optional(Type.Number({ minimum: 1, maximum: 500 })),
		recursive: Type.Optional(Type.Boolean()),
	}),
	Type.Object({
		action: Type.Literal("children"),
		componentPath: Type.String({ minLength: 1 }),
		group: Type.Optional(
			Type.Union([
				Type.Literal("methods"),
				Type.Literal("elements"),
				Type.Literal("variables"),
				Type.Literal("diagrams"),
				Type.Literal("all"),
			]),
		),
	}),
	Type.Object({
		action: Type.Literal("methods"),
		componentPath: Type.String({ minLength: 1 }),
	}),
	Type.Object({
		action: Type.Literal("diagrams"),
		componentPath: Type.String({ minLength: 1 }),
		diagramKind: Type.Optional(Type.String()),
	}),
]);

export async function runAscetBrowse(
	params: AscetBrowseParams,
	options: RunAscetBrowseOptions,
): Promise<AscetCliJsonResult> {
	switch (params.action) {
		case "folders":
			return runAscetListFolders(params, options);
		case "components":
			return runAscetListComponents(params, options);
		case "children":
			return runAscetReadComponentChildren(params, options);
		case "methods":
			return runAscetListMethods(params, options);
		case "diagrams":
			return runAscetListDiagrams(params, options);
	}
}

export function formatAscetBrowseResult(params: AscetBrowseParams, result: AscetCliJsonResult): string {
	switch (params.action) {
		case "folders":
			return formatListFoldersResult(result);
		case "components":
			return formatListComponentsResult(result);
		case "children":
			return formatReadComponentChildrenResult(result);
		case "methods":
			return formatListMethodsResult(result);
		case "diagrams":
			return formatListDiagramsResult(result);
	}
}
