import { existsSync } from "node:fs";
import { join } from "node:path";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import type { AscetCliExecutionResult, AscetCliRequest } from "../../ascet-extension/src/cli.ts";
import { classifyAscetCliCommand } from "../../ascet-extension/src/routing/coverage.ts";
import { listAscetRoutes, routeAscetAction } from "../../ascet-extension/src/routing/router.ts";
import { compactExamplesForTool } from "../../ascet-extension/src/tools/_shared/action-examples.ts";
import { formatAscetCapabilitiesResult, runAscetCapabilities } from "../../ascet-extension/src/tools/capabilities.ts";
import { ascetDiffTool } from "../../ascet-extension/src/tools/diff/index.ts";
import { ascetExploreTool } from "../../ascet-extension/src/tools/explore/index.ts";
import { ascetExploreParameters } from "../../ascet-extension/src/tools/explore/schema.ts";
import { ascetReadTool } from "../../ascet-extension/src/tools/read/index.ts";
import { runAscetRecover } from "../../ascet-extension/src/tools/recover.ts";
import { ascetReferenceTool } from "../../ascet-extension/src/tools/reference/index.ts";
import { ascetSearchTool } from "../../ascet-extension/src/tools/search/index.ts";
import { ascetSearchParameters } from "../../ascet-extension/src/tools/search/schema.ts";
import { loadAscetExtension, repoRoot } from "./ascet-extension-test-helpers.ts";

const CANONICAL_ASCET_TOOLS = [
	"ascet_status",
	"ascet_capabilities",
	"ascet_recover",
	"ascet_scheduler_status",
	"ascet_explore",
	"ascet_search",
	"ascet_read",
	"ascet_reference",
	"ascet_diff",
	"ascet_write",
	"ascet_batch_write",
	"ascet_component_editable",
	"ascet_verify",
] as const;

const CANONICAL_ASCET_TOOL_MODULES = [
	["ascet_status", "status"],
	["ascet_capabilities", "capabilities"],
	["ascet_recover", "recover"],
	["ascet_scheduler_status", "scheduler-status"],
	["ascet_explore", "explore"],
	["ascet_search", "search"],
	["ascet_read", "read"],
	["ascet_reference", "reference"],
	["ascet_diff", "diff"],
	["ascet_write", "write"],
	["ascet_batch_write", "batch-write"],
	["ascet_component_editable", "component-editable"],
	["ascet_verify", "verify"],
] as const;

const REMOVED_FINE_GRAINED_TOOLS = [
	"ascet_requirements",
	"ascet_list_components",
	"ascet_list_folders",
	"ascet_contract_catalog",
	"ascet_search_elements",
	"ascet_search_components",
	"ascet_search_occurrences",
	"ascet_resolve_component",
	"ascet_read_component_summary",
	"ascet_read_component_children",
	"ascet_read_method_code",
	"ascet_read_method_signature",
	"ascet_read_project_formulas",
	"ascet_list_methods",
	"ascet_list_diagrams",
	"ascet_read_block_diagram",
	"ascet_read_element_refs",
	"ascet_diff_component_snapshot",
	"ascet_verify_readback",
	"ascet_create_folder",
	"ascet_create_component",
	"ascet_create_method",
	"ascet_set_class_method_code",
] as const;

describe("ASCET canonical PI tools", () => {
	it("registers the Copilot-aligned ASCET tool surface as sequential", async () => {
		const ascetExtension = await loadAscetExtension();

		for (const toolName of ascetExtension?.tools.keys() ?? []) {
			if (toolName.startsWith("ascet_")) {
				expect(CANONICAL_ASCET_TOOLS).toContain(toolName as (typeof CANONICAL_ASCET_TOOLS)[number]);
			}
		}
		for (const name of CANONICAL_ASCET_TOOLS) {
			expect(ascetExtension?.tools.get(name)?.definition).toMatchObject({
				name,
				executionMode: "sequential",
			});
			const definition = ascetExtension?.tools.get(name)?.definition;
			expect(definition?.promptSnippet).toBeTruthy();
			expect(definition?.promptGuidelines?.length).toBeGreaterThan(0);
			expect(definition?.promptGuidelines).toEqual(expect.arrayContaining(compactExamplesForTool(name)));
			expect(definition?.renderCall).toEqual(expect.any(Function));
			expect(definition?.renderResult).toEqual(expect.any(Function));
		}
	});

	it("exposes OpenAI-compatible object schemas for every canonical tool", async () => {
		const ascetExtension = await loadAscetExtension();

		for (const name of CANONICAL_ASCET_TOOLS) {
			const definition = ascetExtension?.tools.get(name)?.definition as
				| { parameters?: { type?: unknown } }
				| undefined;
			expect(definition?.parameters?.type, name).toBe("object");
		}
	});

	it("documents ASCET read/diff decision boundaries in prompt guidelines", async () => {
		const ascetExtension = await loadAscetExtension();
		const readGuidelines = ascetExtension?.tools.get("ascet_read")?.definition.promptGuidelines?.join("\n") ?? "";
		const diffGuidelines = ascetExtension?.tools.get("ascet_diff")?.definition.promptGuidelines?.join("\n") ?? "";

		expect(readGuidelines).toContain("read_block_diagram");
		expect(readGuidelines).toContain("BDE");
		expect(readGuidelines).toContain("ESDL");
		expect(readGuidelines).toContain("read_state_machine_flow");
		expect(readGuidelines).toContain("StateMachine");
		expect(readGuidelines).toContain("header");
		expect(readGuidelines).toContain("C module");

		expect(diffGuidelines).toContain("diff_component_snapshot");
		expect(diffGuidelines).toContain("quick");
		expect(diffGuidelines).toContain("objectKind");
		expect(diffGuidelines).toContain("Project");
		expect(diffGuidelines).toContain("StateMachine");
	});

	it("does not register old fine-grained ASCET tools as legacy aliases", async () => {
		const ascetExtension = await loadAscetExtension();

		for (const name of REMOVED_FINE_GRAINED_TOOLS) {
			expect(ascetExtension?.tools.has(name)).toBe(false);
		}
	});

	it("keeps canonical tool prompt and UI modules colocated with each tool", () => {
		for (const [_name, moduleName] of CANONICAL_ASCET_TOOL_MODULES) {
			const toolDir = join(repoRoot, "packages/ascet-extension/src/tools", moduleName);
			expect(existsSync(join(toolDir, "index.ts"))).toBe(true);
		}
	});

	it("routes Copilot-aligned actions through logical and backend command ids", () => {
		expect(routeAscetAction({ toolName: "ascet_read", action: "read_code" })).toMatchObject({
			toolName: "ascet_read",
			action: "read_code",
			logicalCommandId: "AscetReadCode",
			backendCommandId: "AscetReadTextCode",
			operation: "read_code",
		});
		expect(routeAscetAction({ toolName: "ascet_read", action: "read_method_signature" })).toMatchObject({
			toolName: "ascet_read",
			action: "read_method_signature",
			logicalCommandId: "AscetReadMethodSignature",
			backendCommandId: "AscetReadMethodSignature",
			operation: "read_method_signature",
		});
		expect(routeAscetAction({ toolName: "ascet_search", action: "resolve_component" })).toMatchObject({
			logicalCommandId: "AscetResolveComponent",
			backendCommandId: "AscetResolveComponent",
			operation: "resolve_component",
		});
		expect(routeAscetAction({ toolName: "ascet_component_editable", action: "check" })).toMatchObject({
			logicalCommandId: "AscetComponentEditableCheck",
			backendCommandId: "AscetComponentEditableCheck",
			operation: "component_editable_check",
		});
		expect(routeAscetAction({ toolName: "ascet_component_editable", action: "set" })).toMatchObject({
			logicalCommandId: "AscetComponentEditableSet",
			backendCommandId: "AscetComponentEditableSet",
			operation: "component_editable_set",
		});
		expect(() => routeAscetAction({ toolName: "ascet_explore", action: "resolve_target" })).toThrow(
			"Unsupported ASCET route: ascet_explore/resolve_target",
		);
		expect(listAscetRoutes().some((route) => route.toolName === "ascet_scheduler_status")).toBe(true);
	});

	it("keeps explore/search public schemas aligned with model-facing semantics", () => {
		const exploreGuidelines = ascetExploreTool.promptGuidelines?.join("\n") ?? "";
		const searchSnippet = ascetSearchTool.promptSnippet ?? "";
		const searchGuidelines = ascetSearchTool.promptGuidelines?.join("\n") ?? "";

		expect(Value.Check(ascetExploreParameters, { action: "resolve_target", query: "PID" })).toBe(false);
		expect(Value.Check(ascetExploreParameters, { action: "list_components", folderPath: "", limit: 2 })).toBe(true);
		expect(
			Value.Check(ascetExploreParameters, {
				action: "preview_children",
				componentPath: "DEMO\\PID",
				group: "parameters",
			}),
		).toBe(true);
		expect(exploreGuidelines).not.toContain("resolve_target");
		expect(exploreGuidelines).toContain("ascet_search.resolve_component");

		expect(searchSnippet).toContain("resolve_component");
		expect(searchGuidelines).toContain("Use resolve_component");
		expect(searchGuidelines).toContain("truncated=true");
		expect(searchGuidelines).toContain("nextCursor");
		expect(searchGuidelines).toContain("searchComplete=true");
		expect(searchGuidelines).toContain("not exhaustive");
		expect(searchGuidelines).toContain("Do not claim");
		expect(
			Value.Check(ascetSearchParameters, {
				action: "search_occurrences",
				query: "pid_kp",
				target: "code",
			}),
		).toBe(false);
		expect(
			Value.Check(ascetSearchParameters, {
				action: "search_elements",
				query: "pid_kp",
				kind: "CalibrationParameter",
				match: "exact",
			}),
		).toBe(true);
		expect(searchGuidelines).not.toContain("target=code");
	});

	it("classifies backend aliases without exposing backend implementation names as model concepts", () => {
		expect(classifyAscetCliCommand("AscetReadTextCode")).toMatchObject({
			category: "backend_alias",
			toolName: "ascet_read",
			action: "read_code",
			logicalCommandId: "AscetReadCode",
		});
	});

	it("dispatches canonical read-only actions through canonical tools", async () => {
		const executeCli = async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => ({
			exitCode: 0,
			stdout: JSON.stringify({ ok: true, result: { request } }),
			stderr: "",
			timedOut: false,
			request,
		});
		const signal = new AbortController().signal;
		const ctx = { cwd: repoRoot, executeCli };

		await expect(
			ascetExploreTool.execute(
				"tool-call",
				{ action: "list_components", folderPath: "DEMO", limit: 2 },
				signal,
				undefined,
				ctx,
			),
		).resolves.toMatchObject({
			details: { request: { args: ["exec", "list_components", "DEMO", "--limit", "2", "--json"] } },
		});
		await expect(
			ascetSearchTool.execute(
				"tool-call",
				{ action: "search_elements", query: "pid_kp", componentPath: "DEMO\\PID", match: "exact", limit: 5 },
				signal,
				undefined,
				ctx,
			),
		).resolves.toMatchObject({
			details: {
				request: {
					args: [
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
					],
				},
			},
		});
		await expect(
			ascetSearchTool.execute(
				"tool-call",
				{ action: "resolve_component", query: "PID", scopePath: "DEMO", match: "exact" },
				signal,
				undefined,
				ctx,
			),
		).resolves.toMatchObject({
			details: {
				request: { args: ["exec", "resolve_component", "PID", "--scope", "DEMO", "--match", "exact", "--json"] },
			},
		});
		await expect(
			ascetExploreTool.execute(
				"tool-call",
				{ action: "inspect_target", componentPath: "DEMO\\PID" },
				signal,
				undefined,
				ctx,
			),
		).resolves.toMatchObject({
			details: { request: { args: ["exec", "read_component_summary", "DEMO\\PID", "--json"] } },
		});
		await expect(
			ascetReadTool.execute(
				"tool-call",
				{ action: "read_state_machine_flow", componentPath: "DEMO/SM", traceDepth: 2 },
				signal,
				undefined,
				ctx,
			),
		).resolves.toMatchObject({
			details: {
				request: { args: ["exec", "read_state_machine_flow", "DEMO\\SM", "--trace-depth", "2", "--json"] },
			},
		});
		await expect(
			ascetReadTool.execute(
				"tool-call",
				{ action: "read_code", componentPath: "DEMO/PID", methodName: "calc", section: "body" },
				signal,
				undefined,
				ctx,
			),
		).resolves.toMatchObject({
			details: {
				request: {
					args: ["exec", "read_text_code", "DEMO\\PID", "--method-name", "calc", "--section", "body", "--json"],
				},
			},
		});
		await expect(
			ascetReadTool.execute(
				"tool-call",
				{ action: "read_method_signature", componentPath: "DEMO\\PID", methodName: "calc" },
				signal,
				undefined,
				ctx,
			),
		).resolves.toMatchObject({
			details: {
				request: {
					args: ["exec", "read_method_signature", "DEMO\\PID", "calc", "--json"],
				},
			},
		});
		await expect(
			ascetReferenceTool.execute(
				"tool-call",
				{ action: "component_refs", componentPath: "DEMO/PID", direction: "out", depth: 1 },
				signal,
				undefined,
				ctx,
			),
		).resolves.toMatchObject({
			details: {
				request: {
					args: ["exec", "read_component_refs", "DEMO\\PID", "--direction", "out", "--depth", "1", "--json"],
				},
			},
		});
		await expect(
			ascetDiffTool.execute(
				"tool-call",
				{ action: "diff_method", leftPath: "DEMO\\PID", rightPath: "DEMO\\PID2", methodName: "calc" },
				signal,
				undefined,
				ctx,
			),
		).resolves.toMatchObject({
			details: { request: { args: ["exec", "diff_method_code", "DEMO\\PID", "DEMO\\PID2", "calc", "--json"] } },
		});
	});

	it("rejects invalid ascet_diff inputs before path normalization", async () => {
		const executeCli = async (): Promise<AscetCliExecutionResult> => {
			throw new Error("executeCli should not be called for invalid diff parameters");
		};
		const signal = new AbortController().signal;
		const ctx = { cwd: repoRoot, executeCli };

		await expect(
			ascetDiffTool.execute(
				"tool-call",
				{ action: "diff_method", componentPath: "DEMO\\PID", methodName: "calc" } as never,
				signal,
				undefined,
				ctx,
			),
		).rejects.toThrow("leftPath is required for ascet_diff.diff_method.");
		await expect(
			ascetDiffTool.execute(
				"tool-call",
				{ action: "diff_state_machine_domain", componentPath: "DEMO\\TEST_SM" } as never,
				signal,
				undefined,
				ctx,
			),
		).rejects.toThrow("leftPath is required for ascet_diff.diff_state_machine_domain.");
		await expect(
			ascetDiffTool.execute(
				"tool-call",
				{ action: "diff_project_formulas", componentPath: "DEMO", specFile: "formulas.spec" } as never,
				signal,
				undefined,
				ctx,
			),
		).rejects.toThrow("leftPath is required for ascet_diff.diff_project_formulas.");
	});

	it("routes canonical ascet_diff.diff to object-kind specific CLI operations", async () => {
		const executeCli = async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => ({
			exitCode: 0,
			stdout: "{}",
			stderr: "",
			timedOut: false,
			request,
		});
		const signal = new AbortController().signal;

		await expect(
			ascetDiffTool.execute(
				"tool-call",
				{ action: "diff", objectKind: "class", leftPath: "DEMO/ClassA", rightPath: "DEMO/ClassB" },
				signal,
				undefined,
				{ cwd: repoRoot, executeCli },
			),
		).resolves.toMatchObject({
			details: { request: { args: ["exec", "diff_class", "DEMO\\ClassA", "DEMO\\ClassB", "--json"] } },
		});

		await expect(
			ascetDiffTool.execute(
				"tool-call",
				{ action: "diff", objectKind: "module", leftPath: "DEMO/ModuleA", rightPath: "DEMO/ModuleB" },
				signal,
				undefined,
				{ cwd: repoRoot, executeCli },
			),
		).resolves.toMatchObject({
			details: { request: { args: ["exec", "diff_module", "DEMO\\ModuleA", "DEMO\\ModuleB", "--json"] } },
		});

		await expect(
			ascetDiffTool.execute(
				"tool-call",
				{ action: "diff", objectKind: "statemachine", leftPath: "DEMO/SMA", rightPath: "DEMO/SMB" },
				signal,
				undefined,
				{ cwd: repoRoot, executeCli },
			),
		).resolves.toMatchObject({
			details: { request: { args: ["exec", "diff_state_machine", "DEMO\\SMA", "DEMO\\SMB", "--json"] } },
		});
	});

	it("searches ASCET capabilities from the bundled catalog", () => {
		const result = runAscetCapabilities({ family: "read", operationQuery: "component_code" }, { cwd: repoRoot });
		const stateMachineResult = runAscetCapabilities(
			{ family: "write", operationQuery: "state_machine", includeHidden: true },
			{ cwd: repoRoot },
		);

		expect(result.ok).toBe(true);
		expect(result.data.matches.some((match) => match.operation === "read_component_code")).toBe(true);
		expect(result.data.matches.find((match) => match.operation === "read_component_code")).toMatchObject({
			coverageCategory: "unsupported_with_reason",
			canonicalTool: undefined,
			canonicalAction: undefined,
		});
		expect(stateMachineResult.ok).toBe(true);
		const formattedStateMachineCapabilities = formatAscetCapabilitiesResult(stateMachineResult);
		expect(
			stateMachineResult.data.matches.find((match) => match.operation === "set_state_machine_code"),
		).toMatchObject({
			argumentEnums: {
				operation: expect.arrayContaining(["set-method", "set-state-entry-esdl", "set-start-state"]),
			},
			canonicalTool: "ascet_write",
			canonicalAction: "set_state_machine_code",
		});
		expect(formattedStateMachineCapabilities).toContain("operation=set-method|set-state-entry-esdl");
	});

	it("formats ASCET capabilities defensively when enum metadata is malformed", () => {
		expect(() =>
			formatAscetCapabilitiesResult({
				ok: true,
				data: {
					mode: "test",
					catalogPath: "cli-catalog.json",
					totalMatches: 1,
					matches: [
						{
							operation: "set_state_machine_code",
							summary: "Write state machine behavior",
							canonicalTool: "ascet_write",
							canonicalAction: "set_state_machine_code",
							argumentEnums: { operation: {} as never },
						},
					],
				},
			}),
		).not.toThrow();
	});

	it("reports create_method method-kind compatibility by component kind", () => {
		const result = runAscetCapabilities({ family: "write", operationQuery: "create_method" }, { cwd: repoRoot });
		const createMethod = result.data.matches.find((match) => match.operation === "create_method");

		expect(result.ok).toBe(true);
		expect(createMethod).toMatchObject({
			canonicalTool: "ascet_write",
			canonicalAction: "create_method",
			methodKindCompatibility: {
				class: ["abstract"],
				module: ["process"],
				statemachine: ["action", "condition", "trigger"],
			},
		});
		expect(formatAscetCapabilitiesResult(result)).toContain("method kinds: class=abstract");
	});

	it("limits recover to extension-owned safe actions", async () => {
		const status = await runAscetRecover(
			{ action: "status" },
			{
				cwd: repoRoot,
				createStatusReport: async () =>
					({
						ok: true,
						installationOk: true,
						runtimeOk: true,
						paths: {
							mode: "bundle",
							extensionRoot: repoRoot,
							cliPath: "AscetCli.exe",
							contractsRoot: "contracts",
							catalogPath: "contracts/cli-catalog.json",
						},
						checks: {
							cliExists: true,
							contractsRootExists: true,
							catalogExists: true,
						},
						runtime: {
							ok: true,
							commandId: "warm_search_index",
							description: "probe",
							databaseName: "DemoDb",
							databasePath: "C:\\ASCET\\DemoDb",
							entryCount: 2,
							elapsedMs: 7,
							scanComplete: true,
							fromCache: false,
							exitCode: 0,
							timedOut: false,
							stdout: "{}",
							stderr: "",
						},
						summary: "ASCET status: ready",
					}) as Awaited<ReturnType<NonNullable<Parameters<typeof runAscetRecover>[1]["createStatusReport"]>>>,
			},
		);
		const cleanup = await runAscetRecover({ action: "clear_extension_temp" }, { cwd: repoRoot });
		const schedulerStatus = await runAscetRecover({ action: "scheduler_status" }, { cwd: repoRoot });

		expect(status.ok).toBe(true);
		expect(status.action).toBe("status");
		expect(cleanup.ok).toBe(true);
		expect(cleanup.action).toBe("clear_extension_temp");
		expect(schedulerStatus.ok).toBe(true);
		expect(schedulerStatus.action).toBe("scheduler_status");
	});
});
