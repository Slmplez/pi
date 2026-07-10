import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runAscetBrowse } from "../../ascet-extension/src/tools/browse.ts";
import { runAscetCapabilities } from "../../ascet-extension/src/tools/capabilities.ts";
import { runAscetCompare } from "../../ascet-extension/src/tools/compare.ts";
import { runAscetInspect } from "../../ascet-extension/src/tools/inspect.ts";
import { runAscetReadCode } from "../../ascet-extension/src/tools/read-code.ts";
import { runAscetRecover } from "../../ascet-extension/src/tools/recover.ts";
import { runAscetReferences } from "../../ascet-extension/src/tools/references.ts";
import { runAscetResolve } from "../../ascet-extension/src/tools/resolve.ts";
import { runAscetSearch } from "../../ascet-extension/src/tools/search.ts";
import { loadAscetExtension, repoRoot } from "./ascet-extension-test-helpers.ts";

const CANONICAL_ASCET_TOOLS = [
	"ascet_status",
	"ascet_capabilities",
	"ascet_recover",
	"ascet_scheduler_status",
	"ascet_browse",
	"ascet_search",
	"ascet_resolve",
	"ascet_inspect",
	"ascet_read_code",
	"ascet_references",
	"ascet_compare",
	"ascet_write",
	"ascet_verify",
	"ascet_batch_write",
] as const;

const CANONICAL_ASCET_TOOL_MODULES = [
	["ascet_status", "status"],
	["ascet_capabilities", "capabilities"],
	["ascet_recover", "recover"],
	["ascet_scheduler_status", "scheduler-status"],
	["ascet_browse", "browse"],
	["ascet_search", "search"],
	["ascet_resolve", "resolve"],
	["ascet_inspect", "inspect"],
	["ascet_read_code", "read-code"],
	["ascet_references", "references"],
	["ascet_compare", "compare"],
	["ascet_write", "write"],
	["ascet_verify", "verify"],
	["ascet_batch_write", "batch-write"],
] as const;

describe("ASCET canonical PI tools", () => {
	it("registers the Copilot-aligned ASCET tool surface as sequential", async () => {
		const ascetExtension = await loadAscetExtension();

		for (const name of CANONICAL_ASCET_TOOLS) {
			expect(ascetExtension?.tools.get(name)?.definition).toMatchObject({
				name,
				executionMode: "sequential",
			});
			const definition = ascetExtension?.tools.get(name)?.definition;
			expect(definition?.promptSnippet).toBeTruthy();
			expect(definition?.promptGuidelines?.length).toBeGreaterThan(0);
			expect(definition?.renderCall).toEqual(expect.any(Function));
			expect(definition?.renderResult).toEqual(expect.any(Function));
		}
	});

	it("keeps canonical tool prompt and UI modules colocated with each tool", () => {
		for (const [_name, moduleName] of CANONICAL_ASCET_TOOL_MODULES) {
			const toolDir = join(repoRoot, "packages/ascet-extension/src/tools", moduleName);
			expect(existsSync(join(toolDir, "index.ts"))).toBe(true);
			expect(existsSync(join(toolDir, "prompt.ts"))).toBe(true);
			expect(existsSync(join(toolDir, "ui.ts"))).toBe(true);
		}
	});

	it("dispatches canonical read-only actions through the existing CLI wrappers", async () => {
		const executeCli = async (request: never) => ({
			exitCode: 0,
			stdout: JSON.stringify({ ok: true, result: { request } }),
			stderr: "",
			timedOut: false,
			request,
		});
		const options = { cwd: repoRoot, executeCli };

		await expect(
			runAscetBrowse({ action: "components", folderPath: "DEMO", limit: 2 }, options),
		).resolves.toMatchObject({ request: { args: ["exec", "list_components", "DEMO", "--limit", "2", "--json"] } });
		await expect(
			runAscetSearch(
				{ action: "search_elements", query: "pid_kp", componentPath: "DEMO\\PID", match: "exact", limit: 5 },
				options,
			),
		).resolves.toMatchObject({
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
		});
		await expect(
			runAscetResolve({ action: "component", query: "PID", scopePath: "DEMO", match: "exact" }, options),
		).resolves.toMatchObject({
			request: { args: ["exec", "resolve_component", "PID", "--scope", "DEMO", "--match", "exact", "--json"] },
		});
		await expect(runAscetInspect({ action: "summary", componentPath: "DEMO\\PID" }, options)).resolves.toMatchObject({
			request: { args: ["exec", "read_component_summary", "DEMO\\PID", "--json"] },
		});
		await expect(
			runAscetInspect({ action: "state_machine_flow", componentPath: "DEMO/SM", traceDepth: 2 }, options),
		).resolves.toMatchObject({
			request: { args: ["exec", "read_state_machine_flow", "DEMO\\SM", "--trace-depth", "2", "--json"] },
		});
		await expect(
			runAscetReadCode({ action: "text", componentPath: "DEMO/PID", methodName: "calc", section: "body" }, options),
		).resolves.toMatchObject({
			request: {
				args: ["exec", "read_text_code", "DEMO\\PID", "--method-name", "calc", "--section", "body", "--json"],
			},
		});
		await expect(
			runAscetReferences(
				{ action: "component_refs", componentPath: "DEMO/PID", direction: "out", depth: 1 },
				options,
			),
		).resolves.toMatchObject({
			request: {
				args: ["exec", "read_component_refs", "DEMO\\PID", "--direction", "out", "--depth", "1", "--json"],
			},
		});
		await expect(
			runAscetReferences({ action: "references", componentPath: "DEMO/PID" }, options),
		).resolves.toMatchObject({
			request: { args: ["exec", "read_references", "DEMO\\PID", "--json"] },
		});
		await expect(
			runAscetCompare(
				{ action: "method", leftComponentPath: "DEMO\\PID", rightComponentPath: "DEMO\\PID2", methodName: "calc" },
				options,
			),
		).resolves.toMatchObject({
			request: { args: ["exec", "diff_method_code", "DEMO\\PID", "DEMO\\PID2", "calc", "--json"] },
		});
	});

	it("searches ASCET capabilities from the bundled catalog", () => {
		const result = runAscetCapabilities({ family: "read", operationQuery: "component_code" }, { cwd: repoRoot });

		expect(result.ok).toBe(true);
		expect(result.data.matches.some((match) => match.operation === "read_component_code")).toBe(true);
	});

	it("limits recover to extension-owned safe actions", async () => {
		const status = await runAscetRecover({ action: "status" }, { cwd: repoRoot });
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
