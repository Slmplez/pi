import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	ASCET_AGENT_SECTION_TITLE,
	buildAscetInitPrompt,
	executeAscetInitCommand,
} from "../../ascet-extension/src/ascet-init.ts";
import { parseAscetInitScopeArgs } from "../../ascet-extension/src/ascet-init-scope.ts";
import {
	ensureRepoAscetRulesScaffold,
	loadAscetInitEntrypoints,
	loadAscetInitRuleBundle,
	renderAscetInitRulesPrompt,
} from "../../ascet-extension/src/ascet-project-rules.ts";
import ascetExtension from "../../ascet-extension/src/index.ts";
import { loadAscetExtension } from "./ascet-extension-test-helpers.ts";

function createTempProject(): string {
	return mkdtempSync(join(tmpdir(), "pi-ascet-init-"));
}

function removeTempProject(projectRoot: string): void {
	rmSync(projectRoot, { recursive: true, force: true });
}

describe("ASCET init prompt", () => {
	it("describes the bounded PI ASCET onboarding workflow", () => {
		const prompt = buildAscetInitPrompt({
			scope: { ok: true, kind: "auto-detect" },
			projectRulesPrompt: "ASCET project rules loaded.",
		});

		expect(prompt).toContain("ASCET project rules loaded.");
		expect(prompt).toContain("No explicit scope was provided. Start with ASCET engineering layout detection.");
		expect(prompt).toContain("ascet_status");
		expect(prompt).toContain("ascet_get");
		expect(prompt).toContain("find");
		expect(prompt).toContain("grep");
		expect(prompt).toContain("ascet_read");
		expect(prompt).toContain("ascet_edit");
		expect(prompt).toContain(ASCET_AGENT_SECTION_TITLE);
		expect(prompt).toContain("engineering layout");
		expect(prompt).toContain("assembly entry points");
		expect(prompt).toContain("signal and interface paths");
		expect(prompt).toContain("parameter and data semantics");
		expect(prompt).toContain("scheduling and execution notes");
		expect(prompt).toContain("Do not perform ad hoc full-database live scans");
		expect(prompt).not.toContain(".ascet/index/manifest.json");
		expect(prompt).not.toMatch(/\bAscet[A-Za-z]+Tool\b/);
	});

	it("preserves explicit scope arguments in the generated prompt", () => {
		expect(buildAscetInitPrompt({ scope: { ok: true, kind: "folder", value: "DEMO" } })).toContain(
			"Explicit scope from command args: folder DEMO",
		);
		expect(buildAscetInitPrompt({ scope: { ok: true, kind: "project", value: "PID" } })).toContain(
			"Explicit scope from command args: project PID",
		);
		expect(buildAscetInitPrompt({ scope: { ok: true, kind: "database" } })).toContain(
			"Explicit scope from command args: database",
		);
	});
});

describe("ASCET init scope args", () => {
	it("parses no-arg, database, folder, and project scopes", () => {
		expect(parseAscetInitScopeArgs("")).toEqual({ ok: true, kind: "auto-detect" });
		expect(parseAscetInitScopeArgs("database")).toEqual({ ok: true, kind: "database" });
		expect(parseAscetInitScopeArgs("folder DEMO\\components")).toEqual({
			ok: true,
			kind: "folder",
			value: "DEMO\\components",
		});
		expect(parseAscetInitScopeArgs("project IdleCon")).toEqual({
			ok: true,
			kind: "project",
			value: "IdleCon",
		});
	});

	it("rejects malformed init scope args", () => {
		expect(parseAscetInitScopeArgs("database extra")).toMatchObject({ ok: false });
		expect(parseAscetInitScopeArgs("folder")).toMatchObject({ ok: false });
		expect(parseAscetInitScopeArgs("project")).toMatchObject({ ok: false });
		expect(parseAscetInitScopeArgs("unknown DEMO")).toMatchObject({ ok: false });
	});
});

describe("ASCET init project rules scaffold", () => {
	it("creates default project rules and loads manifest entrypoints", async () => {
		const projectRoot = createTempProject();
		try {
			const result = await ensureRepoAscetRulesScaffold(projectRoot);

			expect(result.created).toBe(true);
			expect(result.rulesDir).toBe(resolve(projectRoot, ".ascet/rules"));
			expect(existsSync(join(result.rulesDir, "manifest.yaml"))).toBe(true);

			const entrypoints = await loadAscetInitEntrypoints(result.rulesDir);
			expect(entrypoints.map((entrypoint) => entrypoint.id)).toEqual(["ascet.init.workflow", "ascet.tools.pi"]);

			const bundle = await loadAscetInitRuleBundle(result.rulesDir);
			expect(bundle.map((entrypoint) => entrypoint.id)).toEqual(["ascet.init.workflow", "ascet.tools.pi"]);

			const rendered = renderAscetInitRulesPrompt(entrypoints);
			expect(rendered).toContain("ASCET project rules loaded for this command only.");
			expect(rendered).toContain("tasks/init.md");
			expect(rendered).toContain("tools/pi-ascet-tools.md");
		} finally {
			removeTempProject(projectRoot);
		}
	});

	it("does not overwrite an existing project rules manifest", async () => {
		const projectRoot = createTempProject();
		try {
			const rulesDir = join(projectRoot, ".ascet", "rules");
			mkdirSync(rulesDir, { recursive: true });
			const manifestPath = join(rulesDir, "manifest.yaml");
			writeFileSync(manifestPath, "version: 1\ncustom: true\n", "utf8");

			const result = await ensureRepoAscetRulesScaffold(projectRoot);

			expect(result.created).toBe(false);
			expect(readFileSync(manifestPath, "utf8")).toBe("version: 1\ncustom: true\n");
		} finally {
			removeTempProject(projectRoot);
		}
	});

	it("rejects manifest entrypoints that escape the rules directory", async () => {
		const projectRoot = createTempProject();
		try {
			const rulesDir = join(projectRoot, ".ascet", "rules");
			mkdirSync(rulesDir, { recursive: true });
			writeFileSync(
				join(rulesDir, "manifest.yaml"),
				[
					"version: 1",
					"default_entrypoints:",
					"  - ascet.bad",
					"rules:",
					"  - id: ascet.bad",
					"    path: ../outside.md",
					"",
				].join("\n"),
				"utf8",
			);

			await expect(loadAscetInitEntrypoints(rulesDir)).rejects.toThrow(
				"ASCET default entrypoint escapes rules directory",
			);
		} finally {
			removeTempProject(projectRoot);
		}
	});

	it("rejects init bundle entries missing from manifest rules", async () => {
		const projectRoot = createTempProject();
		try {
			const rulesDir = join(projectRoot, ".ascet", "rules");
			mkdirSync(rulesDir, { recursive: true });
			writeFileSync(
				join(rulesDir, "manifest.yaml"),
				[
					"version: 2",
					"init_bundle:",
					"  - ascet.missing",
					"rules:",
					"  - id: ascet.init.workflow",
					"    path: tasks/init.md",
					"",
				].join("\n"),
				"utf8",
			);

			await expect(loadAscetInitRuleBundle(rulesDir)).rejects.toThrow(
				"ASCET init bundle entry is missing from manifest rules",
			);
		} finally {
			removeTempProject(projectRoot);
		}
	});
});

describe("ASCET init command", () => {
	it("loads as an ASCET extension command", async () => {
		const ascetExtension = await loadAscetExtension();

		expect(ascetExtension?.commands.has("ascet-init")).toBe(true);
	});

	it("uses the extension message bridge instead of requiring sendUserMessage on command ctx", async () => {
		const projectRoot = createTempProject();
		try {
			const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
			const sentMessages: Array<{ content: string; options?: { deliverAs?: "steer" | "followUp" } }> = [];
			ascetExtension({
				registerTool() {},
				registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) {
					commands.set(name, command);
				},
				sendUserMessage(content: string, options?: { deliverAs?: "steer" | "followUp" }) {
					sentMessages.push({ content, options });
				},
			} as never);

			await commands.get("ascet-init")?.handler("", {
				cwd: projectRoot,
				isIdle: () => true,
				ui: { notify() {} },
			});

			expect(sentMessages).toHaveLength(1);
			expect(sentMessages[0].content).toContain("You are working in an ASCET Copilot workspace");
			expect(sentMessages[0].content).toContain("First run ascet_status");
			expect(sentMessages[0].content).toContain("Use ascet_get to navigate and retrieve live data on demand:");
			expect(sentMessages[0].options).toBeUndefined();
		} finally {
			removeTempProject(projectRoot);
		}
	});

	it("rejects malformed args before scaffolding or sending a prompt", async () => {
		const projectRoot = createTempProject();
		try {
			const sentMessages: Array<{ content: string; options?: { deliverAs?: "steer" | "followUp" } }> = [];
			const notifications: Array<{ message: string; level?: "info" | "warning" | "error" }> = [];

			await executeAscetInitCommand("folder", {
				cwd: projectRoot,
				isIdle: () => true,
				sendUserMessage: (content, options) => {
					sentMessages.push({ content, options });
				},
				ui: {
					notify: (message: string, level?: "info" | "warning" | "error") =>
						notifications.push({ message, level }),
				},
			});

			expect(sentMessages).toEqual([]);
			expect(notifications).toEqual([
				{
					message:
						"Usage: /ascet-init [database|folder <path>|project <name-or-path>]\nfolder scope requires a path",
					level: "warning",
				},
			]);
			expect(existsSync(join(projectRoot, ".ascet", "rules", "manifest.yaml"))).toBe(false);
		} finally {
			removeTempProject(projectRoot);
		}
	});

	it("sends the init prompt immediately when the agent is idle", async () => {
		const projectRoot = createTempProject();
		try {
			const sentMessages: Array<{ content: string; options?: { deliverAs?: "steer" | "followUp" } }> = [];
			const notifications: string[] = [];

			await executeAscetInitCommand("folder DEMO", {
				cwd: projectRoot,
				isIdle: () => true,
				sendUserMessage: (content, options) => {
					sentMessages.push({ content, options });
				},
				ui: { notify: (message: string) => notifications.push(message) },
			});

			expect(sentMessages).toHaveLength(1);
			expect(sentMessages[0].content).toContain("Explicit scope from command args: folder DEMO");
			expect(sentMessages[0].content).toContain("ASCET project rules loaded for this command only.");
			expect(sentMessages[0].content).toContain("tasks/init.md");
			expect(sentMessages[0].content).toContain("tools/pi-ascet-tools.md");
			expect(sentMessages[0].options).toBeUndefined();
			expect(notifications).toEqual(["ASCET init prompt sent."]);
		} finally {
			removeTempProject(projectRoot);
		}
	});

	it("queues the init prompt as a follow-up when the agent is busy", async () => {
		const projectRoot = createTempProject();
		try {
			const sentMessages: Array<{ content: string; options?: { deliverAs?: "steer" | "followUp" } }> = [];
			const notifications: Array<{ message: string; level?: "info" | "warning" | "error" }> = [];

			await executeAscetInitCommand("project PID", {
				cwd: projectRoot,
				isIdle: () => false,
				sendUserMessage: (content, options) => {
					sentMessages.push({ content, options });
				},
				ui: {
					notify: (message: string, level?: "info" | "warning" | "error") =>
						notifications.push({ message, level }),
				},
			});

			expect(sentMessages).toHaveLength(1);
			expect(sentMessages[0].content).toContain("Explicit scope from command args: project PID");
			expect(sentMessages[0].content).toContain("ASCET project rules loaded for this command only.");
			expect(sentMessages[0].content).toContain("tasks/init.md");
			expect(sentMessages[0].content).toContain("tools/pi-ascet-tools.md");
			expect(sentMessages[0].options).toEqual({ deliverAs: "followUp" });
			expect(notifications).toEqual([{ message: "Queued ASCET init prompt as a follow-up.", level: "info" }]);
		} finally {
			removeTempProject(projectRoot);
		}
	});
});
