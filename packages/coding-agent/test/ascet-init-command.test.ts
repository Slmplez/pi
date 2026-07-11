import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	ASCET_AGENT_SECTION_TITLE,
	buildAscetInitPrompt,
	executeAscetInitCommand,
} from "../../ascet-extension/src/ascet-init.ts";
import {
	ensureRepoAscetRulesScaffold,
	loadAscetInitEntrypoints,
	renderAscetInitRulesPrompt,
} from "../../ascet-extension/src/ascet-project-rules.ts";
import { loadAscetExtension } from "./ascet-extension-test-helpers.ts";

function createTempProject(): string {
	return mkdtempSync(join(tmpdir(), "pi-ascet-init-"));
}

function removeTempProject(projectRoot: string): void {
	rmSync(projectRoot, { recursive: true, force: true });
}

describe("ASCET init prompt", () => {
	it("describes the bounded PI ASCET onboarding workflow", () => {
		const prompt = buildAscetInitPrompt({ args: "", projectRulesPrompt: "ASCET project rules loaded." });

		expect(prompt).toContain("ASCET project rules loaded.");
		expect(prompt).toContain("current database");
		expect(prompt).toContain("folder <path>");
		expect(prompt).toContain("project <path-or-name>");
		expect(prompt).toContain("ascet_status");
		expect(prompt).toContain("ascet_scheduler_status");
		expect(prompt).toContain("ascet_explore");
		expect(prompt).toContain("ascet_search");
		expect(prompt).toContain("ascet_read");
		expect(prompt).toContain(ASCET_AGENT_SECTION_TITLE);
		expect(prompt).toContain("bounded");
		expect(prompt).toContain("sampled");
		expect(prompt).not.toContain("AscetExploreTool");
		expect(prompt).not.toContain("AscetSearchTool");
		expect(prompt).not.toContain("AscetReadTool");
	});

	it("preserves explicit scope arguments in the generated prompt", () => {
		expect(buildAscetInitPrompt({ args: "folder DEMO" })).toContain("Requested scope from command args: folder DEMO");
		expect(buildAscetInitPrompt({ args: "project PID" })).toContain("Requested scope from command args: project PID");
		expect(buildAscetInitPrompt({ args: "database" })).toContain("Requested scope from command args: database");
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
});

describe("ASCET init command", () => {
	it("loads as an ASCET extension command", async () => {
		const ascetExtension = await loadAscetExtension();

		expect(ascetExtension?.commands.has("ascet-init")).toBe(true);
	});

	it("sends the init prompt immediately when the agent is idle", async () => {
		const projectRoot = createTempProject();
		try {
			const sentMessages: Array<{ content: string; options?: { deliverAs?: "steer" | "followUp" } }> = [];
			const notifications: string[] = [];

			await executeAscetInitCommand(
				"folder DEMO",
				{
					cwd: projectRoot,
					isIdle: () => true,
					ui: { notify: (message: string) => notifications.push(message) },
				},
				{
					sendUserMessage: (content, options) => sentMessages.push({ content, options }),
				},
			);

			expect(sentMessages).toHaveLength(1);
			expect(sentMessages[0].content).toContain("Requested scope from command args: folder DEMO");
			expect(sentMessages[0].options).toBeUndefined();
			expect(notifications).toEqual([]);
		} finally {
			removeTempProject(projectRoot);
		}
	});

	it("queues the init prompt as a follow-up when the agent is busy", async () => {
		const projectRoot = createTempProject();
		try {
			const sentMessages: Array<{ content: string; options?: { deliverAs?: "steer" | "followUp" } }> = [];
			const notifications: Array<{ message: string; level?: "info" | "warning" | "error" }> = [];

			await executeAscetInitCommand(
				"project PID",
				{
					cwd: projectRoot,
					isIdle: () => false,
					ui: {
						notify: (message: string, level?: "info" | "warning" | "error") =>
							notifications.push({ message, level }),
					},
				},
				{
					sendUserMessage: (content, options) => sentMessages.push({ content, options }),
				},
			);

			expect(sentMessages).toHaveLength(1);
			expect(sentMessages[0].content).toContain("Requested scope from command args: project PID");
			expect(sentMessages[0].options).toEqual({ deliverAs: "followUp" });
			expect(notifications).toEqual([{ message: "Queued ASCET init as a follow-up.", level: "info" }]);
		} finally {
			removeTempProject(projectRoot);
		}
	});
});
