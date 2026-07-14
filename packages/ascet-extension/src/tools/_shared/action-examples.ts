export interface AscetActionExample {
	tool: string;
	action: string;
	variant?: string;
	intent: string;
	args: Record<string, unknown>;
	call: string;
}

type AscetActionExampleInput = Omit<AscetActionExample, "call">;

function renderValue(value: unknown): string {
	if (typeof value === "string") {
		return JSON.stringify(value);
	}
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	if (Array.isArray(value)) {
		return `[${value.map(renderValue).join(",")}]`;
	}
	if (value && typeof value === "object") {
		return renderArgs(value as Record<string, unknown>);
	}
	return "null";
}

function renderArgs(args: Record<string, unknown>): string {
	return `{${Object.entries(args)
		.filter(([, value]) => value !== undefined)
		.map(([key, value]) => `${key}:${renderValue(value)}`)
		.join(",")}}`;
}

function renderToolCall(tool: string, args: Record<string, unknown>): string {
	return `${tool}(${renderArgs(args)})`;
}

function defineExample(example: AscetActionExampleInput): AscetActionExample {
	return { ...example, call: renderToolCall(example.tool, example.args) };
}

export const ascetActionExamples = [
	defineExample({ tool: "ascet_status", action: "status", intent: "check setup", args: {} }),
	defineExample({
		tool: "ascet_capabilities",
		action: "search",
		intent: "find read ops",
		args: { family: "read", operationQuery: "code", limit: 5 },
	}),
	defineExample({ tool: "ascet_recover", action: "status", intent: "diagnose runtime", args: { action: "status" } }),
	defineExample({
		tool: "ascet_recover",
		action: "clear_extension_temp",
		intent: "clear temp",
		args: { action: "clear_extension_temp" },
	}),
	defineExample({
		tool: "ascet_recover",
		action: "scheduler_status",
		intent: "check queue",
		args: { action: "scheduler_status" },
	}),
	defineExample({
		tool: "ascet_recover",
		action: "scheduler_recover",
		intent: "safe scheduler recover",
		args: { action: "scheduler_recover" },
	}),
	defineExample({
		tool: "ascet_recover",
		action: "clear_stale_cli_lock",
		intent: "clear stale lock",
		args: { action: "clear_stale_cli_lock" },
	}),
	defineExample({
		tool: "ascet_scheduler_status",
		action: "status",
		intent: "inspect lock",
		args: { action: "status", format: "text" },
	}),
	defineExample({
		tool: "ascet_scheduler_status",
		action: "recover",
		intent: "recover scheduler",
		args: { action: "recover", format: "text" },
	}),
	defineExample({
		tool: "ascet_requirements",
		action: "status",
		intent: "requirements ready",
		args: { action: "status", sourceFile: "req.xlsx" },
	}),
	defineExample({
		tool: "ascet_requirements",
		action: "index",
		intent: "index workbook",
		args: { action: "index", sourceFile: "req.xlsx" },
	}),
	defineExample({
		tool: "ascet_requirements",
		action: "search",
		intent: "search req",
		args: { action: "search", query: "wheel speed", sourceFile: "req.xlsx", limit: 5 },
	}),
	defineExample({
		tool: "ascet_requirements",
		action: "get_record",
		intent: "get req",
		args: { action: "get_record", requirementId: "REQ-1", sourceFile: "req.xlsx" },
	}),
	defineExample({
		tool: "ascet_requirements",
		action: "relation_leads",
		intent: "find related",
		args: { action: "relation_leads", requirementId: "REQ-1", sourceFile: "req.xlsx" },
	}),
	defineExample({
		tool: "ascet_requirements",
		action: "risk_context",
		intent: "design gate",
		args: { action: "risk_context", query: "pid control", sourceFile: "req.xlsx" },
	}),
	defineExample({
		tool: "ascet_requirements",
		action: "risk_details",
		intent: "risk page",
		args: { action: "risk_details", requirementId: "REQ-1", sourceFile: "req.xlsx", offset: 0, limit: 10 },
	}),
	defineExample({
		tool: "ascet_explore",
		action: "list_components",
		intent: "browse folder",
		args: { action: "list_components", folderPath: "DEMO", kind: "all", limit: 20 },
	}),
	defineExample({
		tool: "ascet_explore",
		action: "list_diagrams",
		intent: "list diagrams",
		args: { action: "list_diagrams", componentPath: "DEMO\\PID", diagramKind: "all" },
	}),
	defineExample({
		tool: "ascet_explore",
		action: "inspect_target",
		intent: "inspect target",
		args: { action: "inspect_target", componentPath: "DEMO\\PID", detailLevel: "summary" },
	}),
	defineExample({
		tool: "ascet_explore",
		action: "preview_children",
		intent: "preview methods",
		args: { action: "preview_children", componentPath: "DEMO\\PID", group: "methods" },
	}),
	defineExample({
		tool: "ascet_search",
		action: "search_components",
		intent: "search components",
		args: { action: "search_components", query: "PID", scopePath: "DEMO", match: "contains", limit: 10 },
	}),
	defineExample({
		tool: "ascet_search",
		action: "resolve_component",
		intent: "resolve component",
		args: { action: "resolve_component", query: "PID", scopePath: "DEMO", match: "exact", limit: 5 },
	}),
	defineExample({
		tool: "ascet_search",
		action: "search_elements",
		intent: "search element",
		args: { action: "search_elements", query: "pid_kp", componentPath: "DEMO\\PID", match: "exact", limit: 5 },
	}),
	defineExample({
		tool: "ascet_search",
		action: "search_occurrences",
		intent: "search element refs",
		args: { action: "search_occurrences", query: "pid_kp", target: "element", componentPath: "DEMO\\PID", limit: 10 },
	}),
	defineExample({
		tool: "ascet_read",
		action: "read",
		intent: "read summary",
		args: { action: "read", componentPath: "DEMO\\PID" },
	}),
	defineExample({
		tool: "ascet_read",
		action: "read_code",
		intent: "read code",
		args: { action: "read_code", componentPath: "DEMO\\PID", methodName: "calc", section: "body" },
	}),
	defineExample({
		tool: "ascet_read",
		action: "read_method_signature",
		intent: "read method signature",
		args: { action: "read_method_signature", componentPath: "DEMO\\PID", methodName: "calc" },
	}),
	defineExample({
		tool: "ascet_read",
		action: "read_implementation",
		intent: "read impl",
		args: { action: "read_implementation", componentPath: "DEMO\\PID", implementationMode: "default" },
	}),
	defineExample({
		tool: "ascet_read",
		action: "read_block_diagram",
		intent: "read BDE",
		args: { action: "read_block_diagram", componentPath: "DEMO\\PID", diagramName: "Main", detailLevel: "summary" },
	}),
	defineExample({
		tool: "ascet_read",
		action: "read_state_machine_flow",
		intent: "read SM flow",
		args: { action: "read_state_machine_flow", componentPath: "DEMO\\SM", detailLevel: "summary" },
	}),
	defineExample({
		tool: "ascet_read",
		action: "read_import_export_match",
		intent: "one import match",
		args: {
			action: "read_import_export_match",
			importerComponentPath: "D\\A",
			exporterComponentPath: "D\\B",
			elementName: "x",
		},
	}),
	defineExample({
		tool: "ascet_read",
		action: "read_import_export_matches",
		intent: "all import matches",
		args: { action: "read_import_export_matches", importerComponentPath: "D\\A", exporterComponentPath: "D\\B" },
	}),
	defineExample({
		tool: "ascet_read",
		action: "plan_element_dependency",
		intent: "plan dependency",
		args: {
			action: "plan_element_dependency",
			targetPath: "DEMO\\PID",
			elementName: "pid_kp",
			targetKind: "component",
		},
	}),
	defineExample({
		tool: "ascet_reference",
		action: "component_refs",
		intent: "outbound refs",
		args: { action: "component_refs", componentPath: "DEMO\\PID", direction: "out", depth: 1 },
	}),
	defineExample({
		tool: "ascet_reference",
		action: "used_by",
		intent: "reverse refs",
		args: { action: "used_by", componentPath: "DEMO\\PID", scopePath: "DEMO", limit: 20 },
	}),
	defineExample({
		tool: "ascet_reference",
		action: "element_refs",
		intent: "element refs",
		args: { action: "element_refs", componentPath: "DEMO\\PID", elementName: "pid_kp" },
	}),
	defineExample({
		tool: "ascet_diff",
		action: "diff",
		intent: "compare targets",
		args: { action: "diff", objectKind: "class", leftPath: "D\\A", rightPath: "D\\B", changesOnly: true },
	}),
	defineExample({
		tool: "ascet_diff",
		action: "diff_method",
		intent: "compare method",
		args: { action: "diff_method", leftPath: "D\\A", rightPath: "D\\B", methodName: "calc", changesOnly: true },
	}),
	defineExample({
		tool: "ascet_diff",
		action: "diff_component_snapshot",
		intent: "compare snapshots",
		args: { action: "diff_component_snapshot", leftPath: "D\\A", rightPath: "D\\B", changesOnly: true },
	}),
	defineExample({
		tool: "ascet_diff",
		action: "diff_state_machine_domain",
		intent: "compare SM",
		args: { action: "diff_state_machine_domain", leftPath: "D\\A", rightPath: "D\\B", changesOnly: true },
	}),
	defineExample({
		tool: "ascet_diff",
		action: "diff_element_spec",
		intent: "compare spec",
		args: { action: "diff_element_spec", componentPath: "DEMO\\PID", specFile: "spec.json", changesOnly: true },
	}),
	defineExample({
		tool: "ascet_diff",
		action: "diff_project_formulas",
		intent: "compare formulas",
		args: { action: "diff_project_formulas", leftPath: "D\\P1", rightPath: "D\\P2", changesOnly: true },
	}),
	defineExample({
		tool: "ascet_write",
		action: "create_folder",
		intent: "preflight folder",
		args: { action: "create_folder", folderPath: "DEMO\\New", verifyReadback: true },
	}),
	defineExample({
		tool: "ascet_write",
		action: "create_component",
		intent: "preflight component",
		args: {
			action: "create_component",
			componentPath: "DEMO\\C",
			kind: "class",
			language: "ESDL",
			verifyReadback: true,
		},
	}),
	defineExample({
		tool: "ascet_write",
		action: "create_method",
		intent: "preflight method",
		args: {
			action: "create_method",
			componentPath: "DEMO\\PID",
			componentKind: "class",
			methodName: "calc2",
			methodKind: "abstract",
			verifyReadback: true,
		},
	}),
	defineExample({
		tool: "ascet_write",
		action: "set_method_signature",
		intent: "patch method signature",
		args: {
			action: "set_method_signature",
			componentPath: "DEMO\\PID",
			methodName: "calc",
			returnType: "cont",
			arguments: [{ name: "u", type: "cont", ifExists: "replace" }],
		},
	}),
	defineExample({
		tool: "ascet_write",
		action: "delete_component",
		intent: "preflight delete component",
		args: { action: "delete_component", componentPath: "DEMO\\Old", ifMissing: "fail", verifyReadback: true },
	}),
	defineExample({
		tool: "ascet_write",
		action: "delete_method",
		intent: "preflight delete method",
		args: {
			action: "delete_method",
			componentPath: "DEMO\\PID",
			methodName: "old",
			ifMissing: "fail",
			verifyReadback: true,
		},
	}),
	defineExample({
		tool: "ascet_write",
		action: "delete_folder",
		intent: "preflight delete folder",
		args: { action: "delete_folder", folderPath: "DEMO\\Old", ifMissing: "fail", verifyReadback: true },
	}),
	defineExample({
		tool: "ascet_write",
		action: "set_method_code",
		intent: "preflight method code",
		args: {
			action: "set_method_code",
			componentPath: "DEMO\\PID",
			methodName: "calc",
			codeFile: "calc.esdl",
			verifyReadback: true,
		},
	}),
	defineExample({
		tool: "ascet_write",
		action: "set_module_code",
		variant: "set-method",
		intent: "set module method",
		args: {
			action: "set_module_code",
			modulePath: "DEMO\\M",
			operation: "set-method",
			methodName: "calc",
			codeFile: "calc.c",
		},
	}),
	defineExample({
		tool: "ascet_write",
		action: "set_module_code",
		variant: "set-header",
		intent: "set module header",
		args: { action: "set_module_code", modulePath: "DEMO\\M", operation: "set-header", codeFile: "header.c" },
	}),
	defineExample({
		tool: "ascet_write",
		action: "set_module_code",
		variant: "set-external-c-code",
		intent: "set external C",
		args: { action: "set_module_code", modulePath: "DEMO\\M", operation: "set-external-c-code", codeFile: "ext.c" },
	}),
	defineExample({
		tool: "ascet_write",
		action: "set_state_machine_code",
		variant: "set-method",
		intent: "set SM method",
		args: {
			action: "set_state_machine_code",
			stateMachinePath: "D\\SM",
			operation: "set-method",
			methodName: "tick",
			codeFile: "tick.esdl",
		},
	}),
	defineExample({
		tool: "ascet_write",
		action: "set_state_machine_code",
		variant: "set-state-entry-esdl",
		intent: "set entry ESDL",
		args: {
			action: "set_state_machine_code",
			stateMachinePath: "D\\SM",
			operation: "set-state-entry-esdl",
			stateName: "Idle",
			codeFile: "entry.esdl",
		},
	}),
	defineExample({
		tool: "ascet_write",
		action: "set_state_machine_code",
		variant: "set-state-exit-esdl",
		intent: "set exit ESDL",
		args: {
			action: "set_state_machine_code",
			stateMachinePath: "D\\SM",
			operation: "set-state-exit-esdl",
			stateName: "Idle",
			codeFile: "exit.esdl",
		},
	}),
	defineExample({
		tool: "ascet_write",
		action: "set_state_machine_code",
		variant: "set-state-static-esdl",
		intent: "set static ESDL",
		args: {
			action: "set_state_machine_code",
			stateMachinePath: "D\\SM",
			operation: "set-state-static-esdl",
			stateName: "Idle",
			codeFile: "static.esdl",
		},
	}),
	defineExample({
		tool: "ascet_write",
		action: "set_state_machine_code",
		variant: "bind-state-entry-method",
		intent: "bind entry",
		args: {
			action: "set_state_machine_code",
			stateMachinePath: "D\\SM",
			operation: "bind-state-entry-method",
			stateName: "Idle",
			methodName: "onEntry",
		},
	}),
	defineExample({
		tool: "ascet_write",
		action: "set_state_machine_code",
		variant: "bind-state-exit-method",
		intent: "bind exit",
		args: {
			action: "set_state_machine_code",
			stateMachinePath: "D\\SM",
			operation: "bind-state-exit-method",
			stateName: "Idle",
			methodName: "onExit",
		},
	}),
	defineExample({
		tool: "ascet_write",
		action: "set_state_machine_code",
		variant: "bind-state-static-method",
		intent: "bind static",
		args: {
			action: "set_state_machine_code",
			stateMachinePath: "D\\SM",
			operation: "bind-state-static-method",
			stateName: "Idle",
			methodName: "during",
		},
	}),
	defineExample({
		tool: "ascet_write",
		action: "set_state_machine_code",
		variant: "set-transition-condition-esdl",
		intent: "set transition condition",
		args: {
			action: "set_state_machine_code",
			stateMachinePath: "S",
			operation: "set-transition-condition-esdl",
			sourceState: "A",
			targetState: "B",
			codeFile: "c",
		},
	}),
	defineExample({
		tool: "ascet_write",
		action: "set_state_machine_code",
		variant: "set-transition-action-esdl",
		intent: "set transition action",
		args: {
			action: "set_state_machine_code",
			stateMachinePath: "S",
			operation: "set-transition-action-esdl",
			sourceState: "A",
			targetState: "B",
			codeFile: "a",
		},
	}),
	defineExample({
		tool: "ascet_write",
		action: "set_state_machine_code",
		variant: "bind-transition-condition-method",
		intent: "bind transition cond",
		args: {
			action: "set_state_machine_code",
			stateMachinePath: "S",
			operation: "bind-transition-condition-method",
			sourceState: "A",
			targetState: "B",
			methodName: "c",
		},
	}),
	defineExample({
		tool: "ascet_write",
		action: "set_state_machine_code",
		variant: "bind-transition-action-method",
		intent: "bind transition action",
		args: {
			action: "set_state_machine_code",
			stateMachinePath: "S",
			operation: "bind-transition-action-method",
			sourceState: "A",
			targetState: "B",
			methodName: "onRun",
		},
	}),
	defineExample({
		tool: "ascet_write",
		action: "set_state_machine_code",
		variant: "set-start-state",
		intent: "set start state",
		args: {
			action: "set_state_machine_code",
			stateMachinePath: "D\\SM",
			operation: "set-start-state",
			stateName: "Idle",
		},
	}),
	defineExample({
		tool: "ascet_write",
		action: "apply_element_spec",
		intent: "preflight spec",
		args: {
			action: "apply_element_spec",
			componentPath: "DEMO\\PID",
			specFile: "spec.json",
			mode: "restore",
			verifyReadback: true,
		},
	}),
	defineExample({
		tool: "ascet_write",
		action: "apply_project_formula",
		intent: "preflight formulas",
		args: { action: "apply_project_formula", projectPath: "D\\P", specFile: "formula.json", mode: "restore" },
	}),
	defineExample({
		tool: "ascet_write",
		action: "set_element_dependency",
		intent: "preflight dependency",
		args: {
			action: "set_element_dependency",
			targetPath: "D\\P",
			elementName: "kp",
			dependency: "dependent",
			match: "exact",
		},
	}),
	defineExample({
		tool: "ascet_batch_write",
		action: "batch_set_method_code",
		intent: "batch methods",
		args: {
			operation: "batch_set_method_code",
			requests: [{ componentPath: "D\\P", methodName: "calc", codeFile: "calc.esdl" }],
		},
	}),
	defineExample({
		tool: "ascet_batch_write",
		action: "batch_set_element_spec",
		intent: "batch specs",
		args: { operation: "batch_set_element_spec", requests: [{ componentPath: "D\\P", specFile: "spec.json" }] },
	}),
	defineExample({
		tool: "ascet_batch_write",
		action: "batch_create_component",
		intent: "batch components",
		args: { operation: "batch_create_component", requests: [{ componentPath: "D\\C1", kind: "class" }] },
	}),
	defineExample({
		tool: "ascet_batch_write",
		action: "batch_create_method",
		intent: "batch methods",
		args: { operation: "batch_create_method", requests: [{ componentPath: "D\\P", methodName: "calc2" }] },
	}),
	defineExample({
		tool: "ascet_batch_write",
		action: "batch_set_project_formula",
		intent: "batch formulas",
		args: {
			operation: "batch_set_project_formula",
			requests: [{ projectPath: "D\\Project", specFile: "formula.json" }],
		},
	}),
	defineExample({
		tool: "ascet_batch_write",
		action: "batch_delete_component",
		intent: "batch delete components",
		args: { operation: "batch_delete_component", requests: [{ componentPath: "D\\Old" }] },
	}),
	defineExample({
		tool: "ascet_batch_write",
		action: "batch_delete_method",
		intent: "batch delete methods",
		args: { operation: "batch_delete_method", requests: [{ componentPath: "D\\P", methodName: "old" }] },
	}),
	defineExample({
		tool: "ascet_batch_write",
		action: "batch_create_folder",
		intent: "batch folders",
		args: { operation: "batch_create_folder", requests: [{ folderPath: "D\\New" }] },
	}),
	defineExample({
		tool: "ascet_batch_write",
		action: "batch_delete_folder",
		intent: "batch delete folders",
		args: { operation: "batch_delete_folder", requests: [{ folderPath: "D\\Old" }] },
	}),
	defineExample({
		tool: "ascet_verify",
		action: "readback",
		intent: "verify class",
		args: { action: "readback", objectKind: "class", componentPath: "DEMO\\PID" },
	}),
] as const satisfies readonly AscetActionExample[];

export function compactExamplesForTool(tool: string): string[] {
	return ascetActionExamples
		.filter((example) => example.tool === tool)
		.map((example) => {
			const key = example.variant ? `${example.action}.${example.variant}` : example.action;
			const guideline = `${key}:${example.intent}->${example.call}`;
			return guideline.length <= 180 ? guideline : example.call;
		});
}
