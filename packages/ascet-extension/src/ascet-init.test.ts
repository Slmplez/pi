import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { buildAscetInitPrompt, executeAscetInitCommand } from "./ascet-init.ts";

function createTempProject(): { cwd: string; cleanup: () => void } {
	const cwd = mkdtempSync(join(tmpdir(), "pi-ascet-init-command-"));
	return {
		cwd,
		cleanup: () => rmSync(cwd, { recursive: true, force: true }),
	};
}

describe("buildAscetInitPrompt", () => {
	test("guides the agent to use status, native search, exact reads, and writes", () => {
		const prompt = buildAscetInitPrompt({
			scope: { ok: true, kind: "database" },
			projectRulesPrompt: "ASCET project rules loaded.",
			repoContextPrompt: "<repo-file: AGENTS.md>\nUse the local controlled workflow.",
		});

		assert.match(prompt, /ASCET project rules loaded/);
		assert.match(prompt, /<repo-file: AGENTS\.md>/);
		assert.match(prompt, /This initialization uses native ascet_search for discovery/);
		assert.match(prompt, /First run ascet_status/);
		assert.match(prompt, /Use one ascet_search call to find components/);
		assert.match(prompt, /Use ascet_get after resolution/);
		assert.match(prompt, /Pi find\/grep\/read/);
		assert.match(prompt, /Use ascet_read only after the target is located/);
		assert.match(prompt, /Use ascet_edit for all ASCET writes/);
		assert.ok(prompt.includes("Do not perform ad hoc full-database live scans"));
		assert.doesNotMatch(prompt, /\.ascet\/index\/manifest\.json/);
		assert.doesNotMatch(prompt, /Deterministic ASCET initialization has already run/);
		assert.doesNotMatch(prompt, /warm/i);
	});
});

describe("executeAscetInitCommand", () => {
	test("scaffolds rules, reads repo context, and sends an init prompt", async () => {
		const fixture = createTempProject();
		const messages: string[] = [];
		const notifications: string[] = [];
		try {
			writeFileSync(join(fixture.cwd, "AGENTS.md"), "Use AGENTS constraints.", "utf8");
			writeFileSync(join(fixture.cwd, "agent.md"), "Use agent guidance.", "utf8");
			writeFileSync(join(fixture.cwd, "README.md"), "Project readme.", "utf8");

			await executeAscetInitCommand("database", {
				cwd: fixture.cwd,
				isIdle: () => true,
				sendUserMessage(content) {
					messages.push(content);
				},
				ui: {
					notify(message) {
						notifications.push(message);
					},
				},
			});

			assert.equal(messages.length, 1);
			assert.match(messages[0] ?? "", /Explicit scope from command args: database/);
			assert.match(messages[0] ?? "", /ASCET project rules loaded for this command only/);
			assert.match(messages[0] ?? "", /<repo-file: AGENTS\.md>/);
			assert.match(messages[0] ?? "", /<repo-file: agent\.md>/);
			assert.match(messages[0] ?? "", /<repo-file: README\.md>/);
			assert.match(messages[0] ?? "", /First run ascet_status/);
			assert.match(messages[0] ?? "", /Use one ascet_search call to find components/);
			assert.match(messages[0] ?? "", /Use ascet_get after resolution/);
			assert.match(messages[0] ?? "", /Pi find\/grep\/read/);
			assert.match(messages[0] ?? "", /Use ascet_read/);
			assert.match(messages[0] ?? "", /Use ascet_edit/);
			assert.match(notifications.join("\n"), /ASCET init prompt sent/);
			assert.doesNotMatch(notifications.join("\n"), /index/i);
			assert.equal(existsSync(join(fixture.cwd, ".ascet", "rules", "manifest.yaml")), true);
		} finally {
			fixture.cleanup();
		}
	});

	test("queues the init prompt as a follow-up when the agent is busy", async () => {
		const fixture = createTempProject();
		const messages: Array<{ content: string; options?: { deliverAs?: "steer" | "followUp" } }> = [];
		const notifications: string[] = [];
		try {
			await executeAscetInitCommand("project AEB", {
				cwd: fixture.cwd,
				isIdle: () => false,
				sendUserMessage(content, options) {
					messages.push({ content, options });
				},
				ui: {
					notify(message) {
						notifications.push(message);
					},
				},
			});

			assert.equal(messages.length, 1);
			assert.match(messages[0]?.content ?? "", /Explicit scope from command args: project AEB/);
			assert.deepEqual(messages[0]?.options, { deliverAs: "followUp" });
			assert.match(notifications.join("\n"), /Queued ASCET init prompt as a follow-up/);
		} finally {
			fixture.cleanup();
		}
	});

	test("rejects malformed args before scaffolding or sending a prompt", async () => {
		const fixture = createTempProject();
		const messages: string[] = [];
		const notifications: Array<{ message: string; level?: "info" | "warning" | "error" }> = [];
		try {
			await executeAscetInitCommand("folder", {
				cwd: fixture.cwd,
				isIdle: () => true,
				sendUserMessage(content) {
					messages.push(content);
				},
				ui: {
					notify(message, level) {
						notifications.push({ message, level });
					},
				},
			});

			assert.deepEqual(messages, []);
			assert.deepEqual(notifications, [
				{
					message:
						"Usage: /ascet-init [database|folder <path>|project <name-or-path>]\nfolder scope requires a path",
					level: "warning",
				},
			]);
			assert.equal(existsSync(join(fixture.cwd, ".ascet", "rules", "manifest.yaml")), false);
		} finally {
			fixture.cleanup();
		}
	});
});
