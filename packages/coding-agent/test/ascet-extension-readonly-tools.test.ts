import { describe, expect, it } from "vitest";
import { getProcessTreeKillCommand } from "../../ascet-extension/src/cli.ts";
import { buildDiffComponentSnapshotArgs } from "../../ascet-extension/src/diff-component-snapshot.ts";
import { buildDiffElementSpecArgs } from "../../ascet-extension/src/diff-element-spec.ts";
import { buildDiffMethodCodeArgs } from "../../ascet-extension/src/diff-method-code.ts";
import { buildDiffProjectFormulasArgs } from "../../ascet-extension/src/diff-project-formulas.ts";
import { buildDiffStateMachineDomainArgs } from "../../ascet-extension/src/diff-state-machine-domain.ts";
import { buildListComponentsArgs, runAscetListComponents } from "../../ascet-extension/src/list-components.ts";
import { buildListDiagramsArgs, runAscetListDiagrams } from "../../ascet-extension/src/list-diagrams.ts";
import { buildListFoldersArgs, runAscetListFolders } from "../../ascet-extension/src/list-folders.ts";
import { buildListMethodsArgs, runAscetListMethods } from "../../ascet-extension/src/list-methods.ts";
import { buildReadBlockDiagramArgs, runAscetReadBlockDiagram } from "../../ascet-extension/src/read-block-diagram.ts";
import {
	buildReadComponentChildrenArgs,
	runAscetReadComponentChildren,
} from "../../ascet-extension/src/read-component-children.ts";
import {
	buildReadComponentCodeArgs,
	runAscetReadComponentCode,
} from "../../ascet-extension/src/read-component-code.ts";
import {
	buildReadComponentRefsArgs,
	runAscetReadComponentRefs,
} from "../../ascet-extension/src/read-component-refs.ts";
import { buildReadComponentSummaryArgs } from "../../ascet-extension/src/read-component-summary.ts";
import {
	buildReadComponentUsedByArgs,
	runAscetReadComponentUsedBy,
} from "../../ascet-extension/src/read-component-used-by.ts";
import { buildReadElementRefsArgs, runAscetReadElementRefs } from "../../ascet-extension/src/read-element-refs.ts";
import { buildReadImplementationArgs } from "../../ascet-extension/src/read-implementation.ts";
import { buildReadMethodCodeArgs, runAscetReadMethodCode } from "../../ascet-extension/src/read-method-code.ts";
import {
	buildReadProjectFormulasArgs,
	runAscetReadProjectFormulas,
} from "../../ascet-extension/src/read-project-formulas.ts";
import { buildReadReferencesArgs } from "../../ascet-extension/src/read-references.ts";
import { buildReadStateMachineFlowArgs } from "../../ascet-extension/src/read-state-machine-flow.ts";
import { buildReadTextCodeArgs, runAscetReadTextCode } from "../../ascet-extension/src/read-text-code.ts";
import { buildResolveComponentArgs } from "../../ascet-extension/src/resolve-component.ts";
import { buildSearchComponentsArgs, runAscetSearchComponents } from "../../ascet-extension/src/search-components.ts";
import { buildSearchElementsArgs, runAscetSearchElements } from "../../ascet-extension/src/search-elements.ts";
import { buildSearchOccurrencesArgs, runAscetSearchOccurrences } from "../../ascet-extension/src/search-occurrences.ts";
import { buildVerifyReadbackArgs, runAscetVerifyReadback } from "../../ascet-extension/src/verify-readback.ts";
import { loadAscetExtension, repoRoot } from "./ascet-extension-test-helpers.ts";

describe("ASCET read-only PI tools", () => {
	it("uses Windows process-tree termination for ASCET CLI timeouts", () => {
		expect(getProcessTreeKillCommand(1234, "win32")).toEqual({
			command: "taskkill",
			args: ["/PID", "1234", "/T", "/F"],
		});
		expect(getProcessTreeKillCommand(1234, "linux")).toBeUndefined();
		expect(getProcessTreeKillCommand(0, "win32")).toBeUndefined();
	});

	it("does not register old fine-grained read-only tools as PI tools", async () => {
		const ascetExtension = await loadAscetExtension();
		const removedTools = [
			"ascet_list_components",
			"ascet_search_elements",
			"ascet_search_components",
			"ascet_search_occurrences",
			"ascet_list_folders",
			"ascet_resolve_component",
			"ascet_read_component_summary",
			"ascet_read_component_children",
			"ascet_list_methods",
			"ascet_read_method_code",
			"ascet_read_project_formulas",
			"ascet_list_diagrams",
			"ascet_read_block_diagram",
			"ascet_read_element_refs",
			"ascet_diff_component_snapshot",
			"ascet_verify_readback",
		];

		for (const name of removedTools) {
			expect(ascetExtension?.tools.has(name)).toBe(false);
		}
	});

	it("registers every ASCET extension tool as sequential", async () => {
		const ascetExtension = await loadAscetExtension();
		const nonSequentialTools = [...(ascetExtension?.tools.values() ?? [])]
			.map((entry) => entry.definition)
			.filter((tool) => typeof tool.name === "string" && tool.name.startsWith("ascet_"))
			.filter((tool) => tool.executionMode !== "sequential")
			.map((tool) => tool.name);

		expect(nonSequentialTools).toEqual([]);
	});

	it("registers compact ASCET renderers for tool calls and results", async () => {
		const ascetExtension = await loadAscetExtension();
		const tool = ascetExtension?.tools.get("ascet_read")?.definition;
		const theme = {
			bold: (text: string) => text,
			fg: (_role: string, text: string) => text,
		};

		expect(tool?.renderCall).toBeTypeOf("function");
		expect(tool?.renderResult).toBeTypeOf("function");

		const callLines = tool?.renderCall?.({ componentPath: "DEMO\\PID" }, theme as never, {} as never).render(80);
		const resultLines = tool
			?.renderResult?.(
				{
					content: [{ type: "text", text: "{}" }],
					details: {
						ok: true,
						data: { result: { summary: "Class PID has 0 references and 1 diagram" } },
					},
				},
				{ expanded: false, isPartial: false },
				theme as never,
				{} as never,
			)
			.render(80);

		expect(callLines?.[0]).toContain("DEMO\\PID");
		expect(resultLines?.[0]).toContain("ASCET ok");
		expect(resultLines?.[0]).toContain("Class PID has 0 references and 1 diagram");
	});

	it("uses a 60s default timeout and accepts timeoutMs for read_block_diagram", async () => {
		const ascetExtension = await loadAscetExtension();
		const tool = ascetExtension?.tools.get("ascet_read")?.definition;
		const executeReadBlockDiagram = async (params: Record<string, unknown>) =>
			tool?.execute("test-read-block-diagram-timeout", params, new AbortController().signal, undefined, {
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({
						ok: true,
						result: { DiagramName: "Main", Elements: [{ id: "1" }], Connections: [] },
					}),
					stderr: "",
					timedOut: false,
					request,
				}),
			});

		const defaultResult = await executeReadBlockDiagram({
			action: "read_block_diagram",
			componentPath: "DEMO\\BD",
			diagramName: "Main",
		});
		const customResult = await executeReadBlockDiagram({
			action: "read_block_diagram",
			componentPath: "DEMO\\BD",
			diagramName: "Main",
			timeoutMs: 12_345,
		});

		expect(defaultResult?.details.diagnostics.request.timeoutMs).toBe(60_000);
		expect(customResult?.details.diagnostics.request.timeoutMs).toBe(12_345);
	});

	it("builds JSON list_components CLI invocation", () => {
		expect(buildListFoldersArgs({ rootPath: "DEMO", depth: 1 })).toEqual([
			"exec",
			"list_folders",
			"--root",
			"DEMO",
			"--depth",
			"1",
			"--json",
		]);
		expect(
			buildListComponentsArgs({
				folderPath: "DEMO",
				kind: "module",
				query: "PID",
				limit: 10,
				recursive: true,
			}),
		).toEqual([
			"exec",
			"list_components",
			"DEMO",
			"--kind",
			"module",
			"--query",
			"PID",
			"--limit",
			"10",
			"--recursive",
			"--json",
		]);
	});

	it("runs ascet_list_components through an injected CLI executor", async () => {
		const result = await runAscetListComponents(
			{ folderPath: "DEMO", limit: 2 },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result: [{ path: "DEMO\\PID", kind: "module" }] }),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);

		expect(result.ok).toBe(true);
		expect(result.request.args).toEqual(["exec", "list_components", "DEMO", "--limit", "2", "--json"]);
		expect(result.data).toMatchObject({ ok: true, result: [{ path: "DEMO\\PID" }] });
	});

	it("classifies successful process output with invalid JSON as a tool failure", async () => {
		const result = await runAscetListComponents(
			{ folderPath: "DEMO", limit: 2 },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: "not json",
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);

		expect(result.ok).toBe(false);
		expect(result.error?.code).toBe("ascet_cli_invalid_json");
		expect(result.data).toBeNull();
	});

	it("reports missing ASCET CLI path before attempting execution", async () => {
		let executeCalls = 0;
		const missingCliPath = "Z:\\definitely-missing\\AscetCli.exe";
		const result = await runAscetListComponents(
			{ folderPath: "DEMO", limit: 2 },
			{
				cwd: repoRoot,
				env: { ASCET_CLI_PATH: missingCliPath },
				executeCli: async (request) => {
					executeCalls++;
					return {
						exitCode: 0,
						stdout: "{}",
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
		);

		expect(executeCalls).toBe(0);
		expect(result.ok).toBe(false);
		expect(result.request.cliPath).toContain("definitely-missing");
		expect(result.error?.code).toBe("ascet_cli_missing");
	});

	it("classifies timeout and aborted CLI execution distinctly", async () => {
		const timeoutResult = await runAscetListComponents(
			{ folderPath: "DEMO", limit: 2 },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: null,
					stdout: "",
					stderr: "",
					timedOut: true,
					request,
				}),
			},
		);
		const abortController = new AbortController();
		abortController.abort();
		const abortedResult = await runAscetListComponents(
			{ folderPath: "DEMO", limit: 2 },
			{
				cwd: repoRoot,
				signal: abortController.signal,
				executeCli: async () => {
					throw new Error("aborted request should not execute the CLI");
				},
			},
		);

		expect(timeoutResult.ok).toBe(false);
		expect(timeoutResult.error?.code).toBe("ascet_cli_timeout");
		expect(abortedResult.ok).toBe(false);
		expect(abortedResult.error?.code).toBe("ascet_cli_aborted");
		expect(abortedResult.request.args).toEqual(["exec", "list_components", "DEMO", "--limit", "2", "--json"]);
	});

	it("builds JSON search_elements CLI invocation", () => {
		expect(
			buildSearchComponentsArgs({
				query: "PID",
				scopePath: "DEMO",
				kind: "class",
				match: "exact",
				limit: 5,
				cursor: "next",
			}),
		).toEqual([
			"exec",
			"search_components",
			"PID",
			"--scope",
			"DEMO",
			"--kind",
			"class",
			"--match",
			"exact",
			"--limit",
			"5",
			"--cursor",
			"next",
			"--json",
		]);
		expect(
			buildSearchElementsArgs({
				query: "pid_kp",
				componentPath: "DEMO\\PID",
				group: "primitive",
				match: "exact",
				limit: 5,
				cursor: "next",
			}),
		).toEqual([
			"exec",
			"search_elements",
			"pid_kp",
			"--component",
			"DEMO\\PID",
			"--group",
			"primitive",
			"--match",
			"exact",
			"--limit",
			"5",
			"--cursor",
			"next",
			"--json",
		]);
		expect(
			buildSearchElementsArgs({
				query: "pid_kp",
				scopePath: "DEMO\\PID",
				match: "exact",
				limit: 5,
			}),
		).toEqual([
			"exec",
			"search_elements",
			"pid_kp",
			"--component",
			"DEMO\\PID",
			"--match",
			"exact",
			"--limit",
			"5",
			"--json",
		]);
		expect(
			buildSearchOccurrencesArgs({
				query: "pid_kp",
				target: "element",
				scopePath: "DEMO",
				match: "exact",
				limit: 5,
				cursor: "30",
			}),
		).toEqual([
			"exec",
			"search_occurrences",
			"pid_kp",
			"--target",
			"element",
			"--scope",
			"DEMO",
			"--match",
			"exact",
			"--limit",
			"5",
			"--cursor",
			"30",
			"--json",
		]);
		expect(
			buildSearchOccurrencesArgs({
				query: "pid_kp",
				target: "element",
				scopePath: "DEMO\\PID",
				match: "exact",
				limit: 5,
			}),
		).toEqual([
			"exec",
			"search_occurrences",
			"pid_kp",
			"--target",
			"element",
			"--component",
			"DEMO\\PID",
			"--match",
			"exact",
			"--limit",
			"5",
			"--json",
		]);
	});

	it("runs ascet_search_elements through an injected CLI executor", async () => {
		const componentsResult = await runAscetSearchComponents(
			{ query: "PID", scopePath: "DEMO", match: "exact", limit: 5 },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result: { matches: [{ path: "DEMO\\PID" }] } }),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);
		const result = await runAscetSearchElements(
			{ query: "pid_kp", componentPath: "DEMO\\PID", match: "exact", limit: 5 },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result: { matches: [{ path: "DEMO\\PID::pid_kp" }] } }),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);
		const occurrencesResult = await runAscetSearchOccurrences(
			{ query: "pid_kp", target: "element", scopePath: "DEMO", match: "exact", limit: 5 },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result: { occurrences: [{ path: "DEMO\\PID::pid_kp" }] } }),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);

		expect(componentsResult.ok).toBe(true);
		expect(componentsResult.request.args).toEqual([
			"exec",
			"search_components",
			"PID",
			"--scope",
			"DEMO",
			"--match",
			"exact",
			"--limit",
			"5",
			"--json",
		]);
		expect(result.ok).toBe(true);
		expect(result.request.args).toEqual([
			"exec",
			"search_elements",
			"pid_kp",
			"--component",
			"DEMO\\PID",
			"--match",
			"exact",
			"--limit",
			"5",
			"--json",
		]);
		expect(result.data).toMatchObject({ ok: true, result: { matches: [{ path: "DEMO\\PID::pid_kp" }] } });
		const scopedComponentResult = await runAscetSearchElements(
			{ query: "pid_kp", scopePath: "DEMO\\PID", match: "exact", limit: 5 },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result: { matches: [{ path: "DEMO\\PID::pid_kp" }] } }),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);
		expect(scopedComponentResult.ok).toBe(true);
		expect(scopedComponentResult.request.args).toContain("--component");
		expect(scopedComponentResult.request.args).not.toContain("--scope");
		const scopedOccurrenceResult = await runAscetSearchOccurrences(
			{ query: "pid_kp", target: "element", scopePath: "DEMO\\PID", match: "exact", limit: 5 },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result: { occurrences: [{ path: "DEMO\\PID::pid_kp" }] } }),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);
		expect(scopedOccurrenceResult.ok).toBe(true);
		expect(scopedOccurrenceResult.request.args).toContain("--component");
		expect(scopedOccurrenceResult.request.args).not.toContain("--scope");
		expect(occurrencesResult.ok).toBe(true);
		expect(occurrencesResult.request.args).toEqual([
			"exec",
			"search_occurrences",
			"pid_kp",
			"--target",
			"element",
			"--scope",
			"DEMO",
			"--match",
			"exact",
			"--limit",
			"5",
			"--json",
		]);
	});

	it("builds JSON resolve_component and read_component_summary invocations", () => {
		expect(
			buildResolveComponentArgs({
				query: "PID",
				scopePath: "DEMO",
				match: "exact",
				limit: 10,
			}),
		).toEqual(["exec", "resolve_component", "PID", "--scope", "DEMO", "--match", "exact", "--limit", "10", "--json"]);

		expect(buildReadComponentSummaryArgs({ componentPath: "DEMO\\PID" })).toEqual([
			"exec",
			"read_component_summary",
			"DEMO\\PID",
			"--json",
		]);
		expect(buildReadComponentChildrenArgs({ componentPath: "DEMO\\PID", group: "methods" })).toEqual([
			"exec",
			"read_component_children",
			"DEMO\\PID",
			"--group",
			"methods",
			"--json",
		]);
		expect(buildReadProjectFormulasArgs({ projectPath: "DEMO\\Project" })).toEqual([
			"exec",
			"read_project_formulas",
			"DEMO\\Project",
			"--json",
		]);
		expect(buildReadImplementationArgs({ componentPath: "DEMO/PID", mode: "list" })).toEqual([
			"exec",
			"read_implementation",
			"DEMO\\PID",
			"--list",
			"--json",
		]);
		expect(
			buildReadImplementationArgs({ componentPath: "DEMO/PID", mode: "impl", implementationName: "Impl" }),
		).toEqual(["exec", "read_implementation", "DEMO\\PID", "--impl", "Impl", "--json"]);
		expect(buildReadStateMachineFlowArgs({ componentPath: "DEMO/SM", traceDepth: 2 })).toEqual([
			"exec",
			"read_state_machine_flow",
			"DEMO\\SM",
			"--trace-depth",
			"2",
			"--json",
		]);
	});

	it("builds JSON read_method_code, read_element_refs, and diff invocations", () => {
		expect(buildListMethodsArgs({ componentPath: "DEMO\\PID" })).toEqual([
			"exec",
			"list_methods",
			"DEMO\\PID",
			"--json",
		]);
		expect(buildReadMethodCodeArgs({ componentPath: "DEMO\\PID", methodName: "calc" })).toEqual([
			"exec",
			"read_method_code",
			"DEMO\\PID",
			"calc",
			"--json",
		]);
		expect(buildReadComponentCodeArgs({ componentPath: "DEMO/PID" })).toEqual([
			"exec",
			"read_component_code",
			"DEMO\\PID",
			"--json",
		]);
		expect(
			buildReadTextCodeArgs({
				componentPath: "DEMO/PID",
				methodName: "calc",
				section: "body",
			}),
		).toEqual(["exec", "read_text_code", "DEMO\\PID", "--method-name", "calc", "--section", "body", "--json"]);
		expect(buildListDiagramsArgs({ componentPath: "DEMO\\PID", diagramKind: "block_diagram" })).toEqual([
			"exec",
			"list_diagrams",
			"DEMO\\PID",
			"--diagram-kind",
			"block_diagram",
			"--json",
		]);
		expect(buildReadBlockDiagramArgs({ componentPath: "DEMO\\PID", diagramName: "Main" })).toEqual([
			"exec",
			"read_block_diagram",
			"DEMO\\PID",
			"Main",
			"--json",
		]);
		expect(buildReadElementRefsArgs({ componentPath: "DEMO\\PID", elementName: "pid_kp" })).toEqual([
			"exec",
			"read_element_refs",
			"DEMO\\PID",
			"pid_kp",
			"--json",
		]);
		expect(buildReadReferencesArgs({ componentPath: "DEMO/PID" })).toEqual([
			"exec",
			"read_references",
			"DEMO\\PID",
			"--json",
		]);
		expect(buildReadComponentRefsArgs({ componentPath: "DEMO/PID", direction: "out", depth: 1 })).toEqual([
			"exec",
			"read_component_refs",
			"DEMO\\PID",
			"--direction",
			"out",
			"--depth",
			"1",
			"--json",
		]);
		expect(
			buildReadComponentUsedByArgs({
				componentPath: "DEMO/PID",
				scopePath: "DEMO",
				kind: "class",
				limit: 10,
			}),
		).toEqual([
			"exec",
			"read_component_used_by",
			"DEMO\\PID",
			"--scope",
			"DEMO",
			"--kind",
			"class",
			"--limit",
			"10",
			"--json",
		]);
		expect(
			buildDiffComponentSnapshotArgs({
				leftComponentPath: "DEMO\\PID",
				rightComponentPath: "DEMO\\PID",
				changesOnly: true,
			}),
		).toEqual(["exec", "diff_component_snapshot", "DEMO\\PID", "DEMO\\PID", "--changes-only", "--json"]);
		expect(
			buildDiffMethodCodeArgs({
				leftComponentPath: "DEMO\\PID",
				rightComponentPath: "DEMO\\PID2",
				methodName: "calc",
				changesOnly: true,
			}),
		).toEqual(["exec", "diff_method_code", "DEMO\\PID", "DEMO\\PID2", "calc", "--changes-only", "--json"]);
		expect(
			buildDiffElementSpecArgs({
				componentPath: "DEMO/PID",
				specFile: "C:\\tmp\\pid.spec.json",
				changesOnly: true,
			}),
		).toEqual(["exec", "diff_element_spec", "DEMO\\PID", "C:\\tmp\\pid.spec.json", "--changes-only", "--json"]);
		expect(
			buildDiffProjectFormulasArgs({
				leftProjectPath: "DEMO/ProjectA",
				rightProjectPath: "DEMO/ProjectB",
				changesOnly: true,
			}),
		).toEqual(["exec", "diff_project_formulas", "DEMO\\ProjectA", "DEMO\\ProjectB", "--changes-only", "--json"]);
		expect(
			buildDiffStateMachineDomainArgs({
				leftStateMachinePath: "DEMO/SM_A",
				rightStateMachinePath: "DEMO/SM_B",
				changesOnly: true,
			}),
		).toEqual(["exec", "diff_state_machine_domain", "DEMO\\SM_A", "DEMO\\SM_B", "--changes-only", "--json"]);
	});

	it("builds verify readback invocations and validates target shape", async () => {
		expect(buildVerifyReadbackArgs({ action: "readback", objectKind: "class", componentPath: "DEMO\\PID" })).toEqual([
			"exec",
			"read_component_summary",
			"DEMO\\PID",
			"--json",
		]);
		expect(
			buildVerifyReadbackArgs({ action: "readback", objectKind: "project", projectPath: "DEMO\\Project" }),
		).toEqual(["exec", "read_project_formulas", "DEMO\\Project", "--json"]);

		const invalid = await runAscetVerifyReadback(
			{ action: "readback", objectKind: "project", componentPath: "DEMO\\PID" },
			{ cwd: repoRoot },
		);
		expect(invalid.ok).toBe(false);
		expect(invalid.error?.code).toBe("ascet_verify_invalid_target");
	});

	it("runs read method and element refs through injected CLI executors", async () => {
		const listFoldersResult = await runAscetListFolders(
			{ rootPath: "DEMO", depth: 1 },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result: { rootPath: "DEMO", counts: { folders: 1 } } }),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);
		const componentChildrenResult = await runAscetReadComponentChildren(
			{ componentPath: "DEMO\\PID", group: "methods" },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result: { selectedGroup: "methods", items: [{ name: "calc" }] } }),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);
		const listMethodsResult = await runAscetListMethods(
			{ componentPath: "DEMO\\PID" },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result: { methods: [{ name: "calc" }] } }),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);
		const methodResult = await runAscetReadMethodCode(
			{ componentPath: "DEMO\\PID", methodName: "calc" },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result: { methodName: "calc", code: "pid_output = 0;" } }),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);
		const componentCodeResult = await runAscetReadComponentCode(
			{ componentPath: "DEMO/PID" },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result: { componentPath: "DEMO\\PID", code: "pid_output = 0;" } }),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);
		const textCodeResult = await runAscetReadTextCode(
			{ componentPath: "DEMO/PID", methodName: "calc", section: "body" },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result: { componentPath: "DEMO\\PID", section: "body" } }),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);
		const unsupportedTextCodeResult = await runAscetReadTextCode(
			{ componentPath: "DEMO/TestModule", section: "all" },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 1,
					stdout: "",
					stderr: "ESDL code view is not available for this target.",
					timedOut: false,
					request,
				}),
			},
		);
		const formulasResult = await runAscetReadProjectFormulas(
			{ projectPath: "DEMO\\Project" },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({
						ok: true,
						result: { ProjectPath: "DEMO\\Project", Formulas: [{ Name: "ident" }] },
					}),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);
		const componentRefsResult = await runAscetReadComponentRefs(
			{ componentPath: "DEMO/PID", direction: "out", depth: 1 },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result: { componentPath: "DEMO\\PID", references: [] } }),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);
		const usedByResult = await runAscetReadComponentUsedBy(
			{ componentPath: "DEMO/PID", scopePath: "DEMO", kind: "class", limit: 10 },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result: { componentPath: "DEMO\\PID", usedBy: [] } }),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);
		const diagramsResult = await runAscetListDiagrams(
			{ componentPath: "DEMO\\PID" },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result: { items: [{ name: "Main" }] } }),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);
		const blockDiagramResult = await runAscetReadBlockDiagram(
			{ componentPath: "DEMO\\PID", diagramName: "Main" },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result: { DiagramName: "Main", Elements: [], Connections: [] } }),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);
		const refsResult = await runAscetReadElementRefs(
			{ componentPath: "DEMO\\PID", elementName: "pid_kp" },
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result: { summary: "Element 'pid_kp' has 0 outgoing references." } }),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);

		expect(listFoldersResult.ok).toBe(true);
		expect(listFoldersResult.request.args).toEqual([
			"exec",
			"list_folders",
			"--root",
			"DEMO",
			"--depth",
			"1",
			"--json",
		]);
		expect(componentChildrenResult.ok).toBe(true);
		expect(componentChildrenResult.request.args).toEqual([
			"exec",
			"read_component_children",
			"DEMO\\PID",
			"--group",
			"methods",
			"--json",
		]);
		expect(listMethodsResult.ok).toBe(true);
		expect(listMethodsResult.request.args).toEqual(["exec", "list_methods", "DEMO\\PID", "--json"]);
		expect(methodResult.ok).toBe(true);
		expect(methodResult.request.args).toEqual(["exec", "read_method_code", "DEMO\\PID", "calc", "--json"]);
		expect(componentCodeResult.ok).toBe(true);
		expect(componentCodeResult.request.args).toEqual(["exec", "read_component_code", "DEMO\\PID", "--json"]);
		expect(textCodeResult.ok).toBe(true);
		expect(textCodeResult.request.args).toEqual([
			"exec",
			"read_text_code",
			"DEMO\\PID",
			"--method-name",
			"calc",
			"--section",
			"body",
			"--json",
		]);
		expect(unsupportedTextCodeResult.ok).toBe(false);
		expect(unsupportedTextCodeResult.error?.message).toContain("ESDL module does not support text code sections");
		expect(formulasResult.ok).toBe(true);
		expect(formulasResult.request.args).toEqual(["exec", "read_project_formulas", "DEMO\\Project", "--json"]);
		expect(diagramsResult.ok).toBe(true);
		expect(diagramsResult.request.args).toEqual(["exec", "list_diagrams", "DEMO\\PID", "--json"]);
		expect(blockDiagramResult.ok).toBe(false);
		expect(blockDiagramResult.error?.code).toBe("ascet_block_diagram_surface_not_supported");
		expect(blockDiagramResult.request.args).toEqual(["exec", "read_block_diagram", "DEMO\\PID", "Main", "--json"]);
		expect(refsResult.ok).toBe(true);
		expect(refsResult.request.args).toEqual(["exec", "read_element_refs", "DEMO\\PID", "pid_kp", "--json"]);
		expect(componentRefsResult.ok).toBe(true);
		expect(componentRefsResult.request.args).toEqual([
			"exec",
			"read_component_refs",
			"DEMO\\PID",
			"--direction",
			"out",
			"--depth",
			"1",
			"--json",
		]);
		expect(usedByResult.ok).toBe(true);
		expect(usedByResult.request.args).toEqual([
			"exec",
			"read_component_used_by",
			"DEMO\\PID",
			"--scope",
			"DEMO",
			"--kind",
			"class",
			"--limit",
			"10",
			"--json",
		]);
	});
});
