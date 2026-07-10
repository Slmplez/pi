import {
	type AscetContractCatalogParams,
	ascetContractCatalogParameters,
	formatContractCatalogResult,
	runAscetContractCatalog,
} from "./contract-catalog.ts";
import { type AscetExtensionAPI, type AscetToolContext, defineSequentialAscetTool } from "./core/tool.ts";
import {
	type AscetCreateComponentParams,
	ascetCreateComponentParameters,
	formatCreateComponentResult,
	runApprovedAscetCreateComponent,
} from "./create-component.ts";
import {
	type AscetCreateFolderParams,
	ascetCreateFolderParameters,
	formatCreateFolderResult,
	runApprovedAscetCreateFolder,
} from "./create-folder.ts";
import {
	type AscetCreateMethodParams,
	ascetCreateMethodParameters,
	formatCreateMethodResult,
	runApprovedAscetCreateMethod,
} from "./create-method.ts";
import {
	type AscetDiffComponentSnapshotParams,
	ascetDiffComponentSnapshotParameters,
	formatDiffComponentSnapshotResult,
	runAscetDiffComponentSnapshot,
} from "./diff-component-snapshot.ts";
import {
	type AscetListComponentsParams,
	ascetListComponentsParameters,
	formatListComponentsResult,
	runAscetListComponents,
} from "./list-components.ts";
import {
	type AscetListDiagramsParams,
	ascetListDiagramsParameters,
	formatListDiagramsResult,
	runAscetListDiagrams,
} from "./list-diagrams.ts";
import {
	type AscetListFoldersParams,
	ascetListFoldersParameters,
	formatListFoldersResult,
	runAscetListFolders,
} from "./list-folders.ts";
import {
	type AscetListMethodsParams,
	ascetListMethodsParameters,
	formatListMethodsResult,
	runAscetListMethods,
} from "./list-methods.ts";
import {
	type AscetReadBlockDiagramParams,
	ascetReadBlockDiagramParameters,
	formatReadBlockDiagramResult,
	runAscetReadBlockDiagram,
} from "./read-block-diagram.ts";
import {
	type AscetReadComponentChildrenParams,
	ascetReadComponentChildrenParameters,
	formatReadComponentChildrenResult,
	runAscetReadComponentChildren,
} from "./read-component-children.ts";
import {
	type AscetReadComponentSummaryParams,
	ascetReadComponentSummaryParameters,
	formatReadComponentSummaryResult,
	runAscetReadComponentSummary,
} from "./read-component-summary.ts";
import {
	type AscetReadElementRefsParams,
	ascetReadElementRefsParameters,
	formatReadElementRefsResult,
	runAscetReadElementRefs,
} from "./read-element-refs.ts";
import {
	type AscetReadMethodCodeParams,
	ascetReadMethodCodeParameters,
	formatReadMethodCodeResult,
	runAscetReadMethodCode,
} from "./read-method-code.ts";
import {
	type AscetReadProjectFormulasParams,
	ascetReadProjectFormulasParameters,
	formatReadProjectFormulasResult,
	runAscetReadProjectFormulas,
} from "./read-project-formulas.ts";
import {
	type AscetResolveComponentParams,
	ascetResolveComponentParameters,
	formatResolveComponentResult,
	runAscetResolveComponent,
} from "./resolve-component.ts";
import {
	type AscetSearchComponentsParams,
	ascetSearchComponentsParameters,
	formatSearchComponentsResult,
	runAscetSearchComponents,
} from "./search-components.ts";
import {
	type AscetSearchElementsParams,
	ascetSearchElementsParameters,
	formatSearchElementsResult,
	runAscetSearchElements,
} from "./search-elements.ts";
import {
	type AscetSearchOccurrencesParams,
	ascetSearchOccurrencesParameters,
	formatSearchOccurrencesResult,
	runAscetSearchOccurrences,
} from "./search-occurrences.ts";
import {
	type AscetSetClassMethodCodeParams,
	ascetSetClassMethodCodeParameters,
	formatSetClassMethodCodeResult,
	runApprovedAscetSetClassMethodCode,
} from "./set-class-method-code.ts";
import { type AscetStatusReport, createAscetStatusReport } from "./status.ts";
import { canonicalAscetTools } from "./tools/index.ts";
import {
	type AscetVerifyReadbackParams,
	ascetVerifyReadbackParameters,
	formatVerifyReadbackResult,
	runAscetVerifyReadback,
} from "./verify-readback.ts";

const listComponentsTool = {
	name: "ascet_list_components",
	label: "ASCET list components",
	description: "List ASCET components in a folder through the local ASCET CLI.",
	promptSnippet: "List ASCET components from a folder path such as DEMO.",
	promptGuidelines: [
		"Use ascet_list_components for read-only folder inventory before reading component details.",
		"Keep limit small unless the user explicitly asks for a broad inventory.",
		"ASCET tools are sequential because the ToolAPI backend is sensitive to concurrent access.",
	],
	parameters: ascetListComponentsParameters,
	executionMode: "sequential",
	async execute(
		_toolCallId: string,
		params: AscetListComponentsParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetListComponents(params, { cwd: ctx.cwd, signal, timeoutMs: 60_000 });
		return {
			content: [{ type: "text", text: formatListComponentsResult(result) }],
			details: result,
		};
	},
};

const listFoldersTool = {
	name: "ascet_list_folders",
	label: "ASCET list folders",
	description: "List ASCET folder tree entries through the local ASCET CLI.",
	promptSnippet: "List ASCET folders under a known root such as DEMO.",
	promptGuidelines: [
		"Use rootPath when possible; broad root listing can be less stable in some ASCET workspaces.",
		"Keep depth small unless the user asks for a broad folder tree.",
		"ASCET tools are sequential because the ToolAPI backend is sensitive to concurrent access.",
	],
	parameters: ascetListFoldersParameters,
	executionMode: "sequential",
	async execute(
		_toolCallId: string,
		params: AscetListFoldersParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetListFolders(params, { cwd: ctx.cwd, signal, timeoutMs: 60_000 });
		return {
			content: [{ type: "text", text: formatListFoldersResult(result) }],
			details: result,
		};
	},
};

const contractCatalogTool = {
	name: "ascet_contract_catalog",
	label: "ASCET contract catalog",
	description: "Load and summarize the local ASCET CLI contract catalog.",
	promptSnippet: "Inspect ASCET CLI contract catalog availability and counts.",
	promptGuidelines: [
		"Use ascet_contract_catalog when checking whether packaged ASCET contracts are present and parseable.",
		"This tool is filesystem-only; it does not touch the live ASCET ToolAPI backend.",
	],
	parameters: ascetContractCatalogParameters,
	executionMode: "sequential",
	async execute(
		_toolCallId: string,
		params: AscetContractCatalogParams,
		_signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = runAscetContractCatalog(params, { cwd: ctx.cwd });
		return {
			content: [{ type: "text", text: formatContractCatalogResult(result) }],
			details: result,
		};
	},
};

const searchElementsTool = {
	name: "ascet_search_elements",
	label: "ASCET search elements",
	description: "Search ASCET elements by name through the local ASCET CLI.",
	promptSnippet: "Search ASCET elements, preferably with a known componentPath.",
	promptGuidelines: [
		"Use componentPath when the target component is known; it is more precise than a broad scope search.",
		"Use match='exact' for exact element names and match='glob' for wildcard patterns.",
		"Keep limit bounded and use cursor for paging when more results are needed.",
	],
	parameters: ascetSearchElementsParameters,
	executionMode: "sequential",
	async execute(
		_toolCallId: string,
		params: AscetSearchElementsParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetSearchElements(params, { cwd: ctx.cwd, signal, timeoutMs: 35_000 });
		return {
			content: [{ type: "text", text: formatSearchElementsResult(result) }],
			details: result,
		};
	},
};

const searchComponentsTool = {
	name: "ascet_search_components",
	label: "ASCET search components",
	description: "Search ASCET components by name through the local ASCET CLI.",
	promptSnippet: "Search ASCET component candidates within a bounded folder scope.",
	promptGuidelines: [
		"Use ascet_search_components when the user gives a component name but not a full path.",
		"Prefer scopePath and match='exact' when possible to keep searches bounded.",
		"Use cursor for paging instead of increasing limit aggressively.",
	],
	parameters: ascetSearchComponentsParameters,
	executionMode: "sequential",
	async execute(
		_toolCallId: string,
		params: AscetSearchComponentsParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetSearchComponents(params, { cwd: ctx.cwd, signal, timeoutMs: 35_000 });
		return {
			content: [{ type: "text", text: formatSearchComponentsResult(result) }],
			details: result,
		};
	},
};

const searchOccurrencesTool = {
	name: "ascet_search_occurrences",
	label: "ASCET search occurrences",
	description: "Search bounded ASCET component or element occurrences through the local ASCET CLI.",
	promptSnippet: "Search component or element occurrences under a folder scope.",
	promptGuidelines: [
		"Use target='component' or target='element' to avoid broad mixed scans.",
		"Use scopePath and a small limit; continue with cursor when more results are needed.",
		"target='code' is reserved by the backend and may return unsupported_target.",
	],
	parameters: ascetSearchOccurrencesParameters,
	executionMode: "sequential",
	async execute(
		_toolCallId: string,
		params: AscetSearchOccurrencesParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetSearchOccurrences(params, { cwd: ctx.cwd, signal, timeoutMs: 60_000 });
		return {
			content: [{ type: "text", text: formatSearchOccurrencesResult(result) }],
			details: result,
		};
	},
};

const resolveComponentTool = {
	name: "ascet_resolve_component",
	label: "ASCET resolve component",
	description: "Resolve a component query to a unique ASCET component candidate.",
	promptSnippet: "Resolve an ASCET component path before reading or writing it.",
	promptGuidelines: [
		"Use ascet_resolve_component when the user gives a component name but not a full path.",
		"Prefer match='exact' when the name is exact; use match='glob' for wildcard searches.",
	],
	parameters: ascetResolveComponentParameters,
	executionMode: "sequential",
	async execute(
		_toolCallId: string,
		params: AscetResolveComponentParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetResolveComponent(params, { cwd: ctx.cwd, signal, timeoutMs: 35_000 });
		return {
			content: [{ type: "text", text: formatResolveComponentResult(result) }],
			details: result,
		};
	},
};

const readComponentSummaryTool = {
	name: "ascet_read_component_summary",
	label: "ASCET read component summary",
	description: "Read a compact summary for an ASCET component through the local ASCET CLI.",
	promptSnippet: "Read a compact summary for a resolved ASCET component path.",
	promptGuidelines: [
		"Use ascet_read_component_summary after resolving the component path.",
		"Use this before deeper code or diagram reads when a quick inventory is enough.",
	],
	parameters: ascetReadComponentSummaryParameters,
	executionMode: "sequential",
	async execute(
		_toolCallId: string,
		params: AscetReadComponentSummaryParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetReadComponentSummary(params, { cwd: ctx.cwd, signal, timeoutMs: 35_000 });
		return {
			content: [{ type: "text", text: formatReadComponentSummaryResult(result) }],
			details: result,
		};
	},
};

const readComponentChildrenTool = {
	name: "ascet_read_component_children",
	label: "ASCET read component children",
	description: "Read grouped ASCET component internals through the local ASCET CLI.",
	promptSnippet: "Read grouped component children such as methods, elements, variables, or diagrams.",
	promptGuidelines: [
		"Use group='methods' before method reads when names are uncertain.",
		"Use group='elements' for element inventory before reference searches.",
		"Use group='all' only when the user needs a broad component inventory.",
	],
	parameters: ascetReadComponentChildrenParameters,
	executionMode: "sequential",
	async execute(
		_toolCallId: string,
		params: AscetReadComponentChildrenParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetReadComponentChildren(params, { cwd: ctx.cwd, signal, timeoutMs: 60_000 });
		return {
			content: [{ type: "text", text: formatReadComponentChildrenResult(result) }],
			details: result,
		};
	},
};

const readMethodCodeTool = {
	name: "ascet_read_method_code",
	label: "ASCET read method code",
	description: "Read one ASCET method body through the local ASCET CLI.",
	promptSnippet: "Read a single method body from a resolved ASCET component.",
	promptGuidelines: [
		"Use ascet_read_component_summary or list methods before reading a method if the method name is uncertain.",
		"Prefer method-level reads over broad component code reads for smaller, safer outputs.",
	],
	parameters: ascetReadMethodCodeParameters,
	executionMode: "sequential",
	async execute(
		_toolCallId: string,
		params: AscetReadMethodCodeParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetReadMethodCode(params, { cwd: ctx.cwd, signal, timeoutMs: 35_000 });
		return {
			content: [{ type: "text", text: formatReadMethodCodeResult(result) }],
			details: result,
		};
	},
};

const readProjectFormulasTool = {
	name: "ascet_read_project_formulas",
	label: "ASCET read project formulas",
	description: "Read formulas from an ASCET project through the local ASCET CLI.",
	promptSnippet: "Read project conversion formulas from a resolved ASCET project path.",
	promptGuidelines: [
		"Use ascet_read_project_formulas for project targets instead of component summary reads.",
		"This can be more expensive than component-level reads, so keep it targeted.",
	],
	parameters: ascetReadProjectFormulasParameters,
	executionMode: "sequential",
	async execute(
		_toolCallId: string,
		params: AscetReadProjectFormulasParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetReadProjectFormulas(params, { cwd: ctx.cwd, signal, timeoutMs: 90_000 });
		return {
			content: [{ type: "text", text: formatReadProjectFormulasResult(result) }],
			details: result,
		};
	},
};

const listMethodsTool = {
	name: "ascet_list_methods",
	label: "ASCET list methods",
	description: "List methods for an ASCET component through the local ASCET CLI.",
	promptSnippet: "List methods before reading method code when method names are uncertain.",
	promptGuidelines: [
		"Use ascet_list_methods before ascet_read_method_code if the method name is not known.",
		"This is read-only, but still sequential because it touches the ASCET ToolAPI backend.",
	],
	parameters: ascetListMethodsParameters,
	executionMode: "sequential",
	async execute(
		_toolCallId: string,
		params: AscetListMethodsParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetListMethods(params, { cwd: ctx.cwd, signal, timeoutMs: 35_000 });
		return {
			content: [{ type: "text", text: formatListMethodsResult(result) }],
			details: result,
		};
	},
};

const listDiagramsTool = {
	name: "ascet_list_diagrams",
	label: "ASCET list diagrams",
	description: "List diagrams for an ASCET component through the local ASCET CLI.",
	promptSnippet: "List available diagrams before reading a named block diagram.",
	promptGuidelines: [
		"Use ascet_list_diagrams before ascet_read_block_diagram when diagram names are uncertain.",
		"Prefer diagramKind='block_diagram' when looking for block diagrams.",
	],
	parameters: ascetListDiagramsParameters,
	executionMode: "sequential",
	async execute(
		_toolCallId: string,
		params: AscetListDiagramsParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetListDiagrams(params, { cwd: ctx.cwd, signal, timeoutMs: 35_000 });
		return {
			content: [{ type: "text", text: formatListDiagramsResult(result) }],
			details: result,
		};
	},
};

const readBlockDiagramTool = {
	name: "ascet_read_block_diagram",
	label: "ASCET read block diagram",
	description: "Read a named ASCET block diagram through the local ASCET CLI.",
	promptSnippet: "Read a named block diagram from a class or module.",
	promptGuidelines: [
		"Use ascet_list_diagrams first if the diagram name is uncertain.",
		"Keep block-diagram reads narrow because they can be larger than method-level reads.",
	],
	parameters: ascetReadBlockDiagramParameters,
	executionMode: "sequential",
	async execute(
		_toolCallId: string,
		params: AscetReadBlockDiagramParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetReadBlockDiagram(params, { cwd: ctx.cwd, signal, timeoutMs: 60_000 });
		return {
			content: [{ type: "text", text: formatReadBlockDiagramResult(result) }],
			details: result,
		};
	},
};

const readElementRefsTool = {
	name: "ascet_read_element_refs",
	label: "ASCET read element refs",
	description: "Read references for one ASCET element through the local ASCET CLI.",
	promptSnippet: "Read references for a known ASCET element in a component.",
	promptGuidelines: [
		"Use ascet_search_elements first when the element name or component path is uncertain.",
		"Prefer element refs over broad component refs until the broader refs path is stabilized.",
	],
	parameters: ascetReadElementRefsParameters,
	executionMode: "sequential",
	async execute(
		_toolCallId: string,
		params: AscetReadElementRefsParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetReadElementRefs(params, { cwd: ctx.cwd, signal, timeoutMs: 60_000 });
		return {
			content: [{ type: "text", text: formatReadElementRefsResult(result) }],
			details: result,
		};
	},
};

const diffComponentSnapshotTool = {
	name: "ascet_diff_component_snapshot",
	label: "ASCET diff component snapshot",
	description: "Diff two ASCET component snapshots through the local ASCET CLI.",
	promptSnippet: "Compare two ASCET component snapshots.",
	promptGuidelines: [
		"Use this for read-only component comparison; it must still run sequentially because it touches ASCET ToolAPI.",
		"Use changesOnly=true for compact output when the full unchanged sections are not needed.",
	],
	parameters: ascetDiffComponentSnapshotParameters,
	executionMode: "sequential",
	async execute(
		_toolCallId: string,
		params: AscetDiffComponentSnapshotParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetDiffComponentSnapshot(params, { cwd: ctx.cwd, signal, timeoutMs: 60_000 });
		return {
			content: [{ type: "text", text: formatDiffComponentSnapshotResult(result) }],
			details: result,
		};
	},
};

const verifyReadbackTool = {
	name: "ascet_verify_readback",
	label: "ASCET verify readback",
	description: "Verify ASCET state by performing a read-only readback of a component or project.",
	promptSnippet: "Run a readback verification after an ASCET write or when checking current live state.",
	promptGuidelines: [
		"Use componentPath for class, module, or state-machine readback.",
		"Use projectPath only when objectKind is project.",
		"This is read-only, but still sequential because it touches the ASCET ToolAPI backend.",
	],
	parameters: ascetVerifyReadbackParameters,
	executionMode: "sequential",
	async execute(
		_toolCallId: string,
		params: AscetVerifyReadbackParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetVerifyReadback(params, { cwd: ctx.cwd, signal, timeoutMs: 60_000 });
		return {
			content: [{ type: "text", text: formatVerifyReadbackResult(result) }],
			details: result,
		};
	},
};

const createFolderTool = {
	name: "ascet_create_folder",
	label: "ASCET create folder",
	description: "Create an ASCET folder path after explicit interactive confirmation.",
	promptSnippet: "Prepare or confirm a guarded ASCET folder creation.",
	promptGuidelines: [
		"By default this tool returns a preflight summary and does not write.",
		"Set executeWrite=true only when the user explicitly requests the folder creation.",
		"Use verifyReadback=true for disposable smoke and normal write workflows.",
	],
	parameters: ascetCreateFolderParameters,
	executionMode: "sequential",
	async execute(
		_toolCallId: string,
		params: AscetCreateFolderParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: AscetToolContext,
	) {
		const result = await runApprovedAscetCreateFolder(params, { cwd: ctx.cwd, signal, timeoutMs: 90_000 }, ctx);
		return {
			content: [{ type: "text", text: formatCreateFolderResult(result) }],
			details: result,
		};
	},
};

const createComponentTool = {
	name: "ascet_create_component",
	label: "ASCET create component",
	description: "Create an ASCET component shell after explicit interactive confirmation.",
	promptSnippet: "Prepare or confirm a guarded ASCET component creation.",
	promptGuidelines: [
		"By default this tool returns a preflight summary and does not write.",
		"Set executeWrite=true only after the user approves creating the component.",
		"Use ifExists='return-existing' for idempotent disposable smoke setup.",
	],
	parameters: ascetCreateComponentParameters,
	executionMode: "sequential",
	async execute(
		_toolCallId: string,
		params: AscetCreateComponentParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: AscetToolContext,
	) {
		const result = await runApprovedAscetCreateComponent(params, { cwd: ctx.cwd, signal, timeoutMs: 90_000 }, ctx);
		return {
			content: [{ type: "text", text: formatCreateComponentResult(result) }],
			details: result,
		};
	},
};

const createMethodTool = {
	name: "ascet_create_method",
	label: "ASCET create method",
	description: "Create an ASCET method after explicit interactive confirmation.",
	promptSnippet: "Prepare or confirm a guarded ASCET method creation.",
	promptGuidelines: [
		"By default this tool returns a preflight summary and does not write.",
		"Class targets support abstract methods; process/action/condition/trigger are module or state-machine surfaces.",
		"Use ifExists='return-existing' for idempotent disposable smoke setup.",
	],
	parameters: ascetCreateMethodParameters,
	executionMode: "sequential",
	async execute(
		_toolCallId: string,
		params: AscetCreateMethodParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: AscetToolContext,
	) {
		const result = await runApprovedAscetCreateMethod(params, { cwd: ctx.cwd, signal, timeoutMs: 90_000 }, ctx);
		return {
			content: [{ type: "text", text: formatCreateMethodResult(result) }],
			details: result,
		};
	},
};

const setClassMethodCodeTool = {
	name: "ascet_set_class_method_code",
	label: "ASCET set class method code",
	description: "Write one ASCET class method body from a code file after explicit interactive confirmation.",
	promptSnippet: "Prepare or confirm a guarded ASCET class method write.",
	promptGuidelines: [
		"By default this tool returns a preflight summary and does not write.",
		"Set executeWrite=true only when the user explicitly requests the write; PI will still ask for interactive confirmation.",
		"Use verifyReadback=true for every write unless the user explicitly asks to skip readback.",
	],
	parameters: ascetSetClassMethodCodeParameters,
	executionMode: "sequential",
	async execute(
		_toolCallId: string,
		params: AscetSetClassMethodCodeParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: AscetToolContext,
	) {
		const result = await runApprovedAscetSetClassMethodCode(params, { cwd: ctx.cwd, signal, timeoutMs: 90_000 }, ctx);
		return {
			content: [{ type: "text", text: formatSetClassMethodCodeResult(result) }],
			details: result,
		};
	},
};

const legacyAscetTools = [
	contractCatalogTool,
	listFoldersTool,
	listComponentsTool,
	searchComponentsTool,
	searchElementsTool,
	searchOccurrencesTool,
	resolveComponentTool,
	readComponentSummaryTool,
	readComponentChildrenTool,
	listMethodsTool,
	readMethodCodeTool,
	readProjectFormulasTool,
	listDiagramsTool,
	readBlockDiagramTool,
	readElementRefsTool,
	diffComponentSnapshotTool,
	verifyReadbackTool,
	createFolderTool,
	createComponentTool,
	createMethodTool,
	setClassMethodCodeTool,
] as const;

export default function ascetExtension(pi: AscetExtensionAPI) {
	for (const tool of canonicalAscetTools) {
		pi.registerTool(tool);
	}
	for (const tool of legacyAscetTools) {
		pi.registerTool(defineSequentialAscetTool(tool));
	}

	pi.registerCommand("ascet-status", {
		description: "Show ASCET CLI and contract path diagnostics",
		handler: async (_args, ctx) => {
			const report: AscetStatusReport = createAscetStatusReport({ cwd: ctx.cwd });
			ctx.ui.notify(report.summary, report.ok ? "info" : "error");
		},
	});
}
