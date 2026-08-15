import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runGuardedAscetMutation } from "./guarded-mutation.ts";
import { createAscetApprovalMaterialFingerprint } from "./preflight/fingerprint.ts";
import type { AscetMutationPreflightEvidence } from "./preflight/types.ts";

function evidence(overrides: Partial<AscetMutationPreflightEvidence> = {}): AscetMutationPreflightEvidence {
	const material = {
		version: 1 as const,
		action: "create_folder" as const,
		paramsFingerprint: "params",
		database: { path: "db", fingerprint: "db" },
		target: { path: "A", oid: "oid", kind: "Folder" },
		impact: { complete: true, sharedObject: false, ownerPath: "A", affectedProjects: [], fingerprint: "impact" },
		capability: { status: "supported" as const, operation: "AddFolder", evidence: {} },
		editability: { applicable: false, status: "not_applicable" as const, canRequestEditable: false },
		effects: [{ kind: "create_folder", target: "A\\B", description: "Create A\\B" }],
		verification: { available: true, operation: "read_folder", target: { path: "A\\B" } },
		riskModifiers: [],
		noOp: false,
		...overrides,
	};
	const {
		generatedAt: _generatedAt,
		approvalMaterialFingerprint: _fingerprint,
		...fingerprintInput
	} = material as typeof material & {
		generatedAt?: string;
		approvalMaterialFingerprint?: string;
	};
	return {
		...material,
		generatedAt: overrides.generatedAt ?? new Date().toISOString(),
		approvalMaterialFingerprint: createAscetApprovalMaterialFingerprint(fingerprintInput),
	};
}

describe("guarded ASCET mutation", () => {
	it("keeps preview non-mutating and non-interactive", async () => {
		let executed = false;
		let confirmed = false;
		const result = await runGuardedAscetMutation({
			action: "create_folder",
			intent: "preview",
			permissionMode: "default",
			rules: [],
			ctx: {
				hasUI: true,
				ui: {
					confirm: async () => {
						confirmed = true;
						return true;
					},
				},
			},
			preflight: async () => ({ status: "passed", evidence: evidence() }),
			execute: async () => {
				executed = true;
				return { mutationStatus: "applied", verificationStatus: "passed" };
			},
		});
		assert.equal(result.status, "ok");
		assert.equal(result.mutation.status, "not_started");
		assert.equal(confirmed, false);
		assert.equal(executed, false);
	});

	it("executes safe writes without UI in acceptEdits after revalidation", async () => {
		let preflights = 0;
		const result = await runGuardedAscetMutation({
			action: "create_folder",
			intent: "apply",
			permissionMode: "acceptEdits",
			rules: [],
			ctx: { hasUI: false },
			preflight: async () => {
				preflights += 1;
				return { status: "passed", evidence: evidence() };
			},
			execute: async () => ({ mutationStatus: "applied", verificationStatus: "passed" }),
		});
		assert.equal(result.status, "ok");
		assert.equal(result.permission.decision, "allow");
		assert.equal(preflights, 2);
	});

	it("returns approval_required headlessly for ask decisions", async () => {
		const result = await runGuardedAscetMutation({
			action: "create_folder",
			intent: "apply",
			permissionMode: "default",
			rules: [],
			ctx: { hasUI: false },
			preflight: async () => ({ status: "passed", evidence: evidence() }),
			execute: async () => ({ mutationStatus: "applied", verificationStatus: "passed" }),
		});
		assert.equal(result.status, "blocked");
		assert.equal(result.error?.code, "ascet_edit_approval_required");
	});

	it("re-prompts in one call when approved material changes", async () => {
		let confirmations = 0;
		let preflights = 0;
		const titles: string[] = [];
		const messages: string[] = [];
		const first = evidence();
		const changed = evidence({ effects: [{ kind: "create_folder", target: "A\\C", description: "Create A\\C" }] });
		const result = await runGuardedAscetMutation({
			action: "create_folder",
			intent: "apply",
			permissionMode: "default",
			rules: [],
			ctx: {
				hasUI: true,
				ui: {
					confirm: async (title, message) => {
						confirmations += 1;
						titles.push(title);
						messages.push(message);
						return true;
					},
				},
			},
			preflight: async () => {
				preflights += 1;
				return { status: "passed", evidence: preflights === 1 ? first : changed };
			},
			execute: async () => ({ mutationStatus: "applied", verificationStatus: "passed" }),
		});
		assert.equal(result.status, "ok");
		assert.equal(confirmations, 2);
		assert.deepEqual(titles, ["Confirm ASCET create folder", "Confirm ASCET create folder"]);
		assert.equal(
			messages[0],
			["Target: A\\B", "", "Changes:", "- Create A\\B", "", "Verification: Automatic readback"].join("\n"),
		);
		assert.equal(
			messages[1],
			["Target: A\\C", "", "Changes:", "- Create A\\C", "", "Verification: Automatic readback"].join("\n"),
		);
		assert.equal(
			messages.some((message) => /Mode:|Risk:|Target OID:|Owner path:/u.test(message)),
			false,
		);
	});

	it("stops repeated material instability safely", async () => {
		let generation = 0;
		const result = await runGuardedAscetMutation({
			action: "create_folder",
			intent: "apply",
			permissionMode: "default",
			rules: [],
			maxMaterialChanges: 1,
			ctx: { hasUI: true, ui: { confirm: async () => true } },
			preflight: async () => {
				generation += 1;
				return {
					status: "passed",
					evidence: evidence({
						effects: [{ kind: "create_folder", target: `A\\${generation}`, description: `Create ${generation}` }],
					}),
				};
			},
			execute: async () => ({ mutationStatus: "applied", verificationStatus: "passed" }),
		});
		assert.equal(result.status, "blocked");
		assert.equal(result.error?.code, "ascet_edit_target_unstable");
	});

	it("raises missing-Diagram create_method evidence to medium risk", async () => {
		const result = await runGuardedAscetMutation({
			action: "create_method",
			intent: "apply",
			permissionMode: "auto",
			rules: [],
			ctx: { hasUI: false },
			preflight: async () => ({
				status: "passed",
				evidence: evidence({
					action: "create_method",
					riskModifiers: ["minimum_risk:medium", "missing_diagram_creation"],
				}),
			}),
			execute: async () => ({ mutationStatus: "applied", verificationStatus: "passed" }),
		});

		assert.equal(result.permission.risk, "medium");
		assert.equal(result.permission.decision, "ask");
		assert.equal(result.error?.code, "ascet_edit_approval_required");
	});
	it("matches scoped rules against the planned mutation target instead of the existing safety anchor", async () => {
		let confirmed = false;
		let executed = false;
		const result = await runGuardedAscetMutation({
			action: "create_folder",
			intent: "apply",
			permissionMode: "auto",
			rules: [{ behavior: "deny", action: "create_folder", path: "A\\B" }],
			ctx: {
				hasUI: true,
				ui: {
					confirm: async () => {
						confirmed = true;
						return true;
					},
				},
			},
			preflight: async () => ({ status: "passed", evidence: evidence() }),
			execute: async () => {
				executed = true;
				return { mutationStatus: "applied", verificationStatus: "passed" };
			},
		});

		assert.equal(result.status, "blocked");
		assert.equal(result.permission.decision, "deny");
		assert.equal(result.permission.rule?.path, "A\\B");
		assert.equal(result.error?.code, "ascet_edit_permission_denied");
		assert.equal(confirmed, false);
		assert.equal(executed, false);
	});

	it("blocks hard-gate failures before confirmation", async () => {
		let confirmed = false;
		const result = await runGuardedAscetMutation({
			action: "create_folder",
			intent: "apply",
			permissionMode: "auto",
			rules: [{ behavior: "allow", action: "create_folder" }],
			ctx: {
				hasUI: true,
				ui: {
					confirm: async () => {
						confirmed = true;
						return true;
					},
				},
			},
			preflight: async () => ({
				status: "passed",
				evidence: evidence({ capability: { status: "unsupported", operation: "AddFolder", evidence: {} } }),
			}),
			execute: async () => ({ mutationStatus: "applied", verificationStatus: "passed" }),
		});
		assert.equal(result.status, "blocked");
		assert.equal(result.permission.decision, "deny");
		assert.equal(confirmed, false);
	});
});
