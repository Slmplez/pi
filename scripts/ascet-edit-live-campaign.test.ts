import { createHash } from "node:crypto";
import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import {
	ACTION_MATRIX,
	REQUIRED_SCENARIOS,
	REQUIRED_RUN_FILES,
	REQUIRED_VARIANT_MATRIX,
	acquireAscetLiveWriter,
	loadCampaignPlan,
	runCampaign,
	validateCampaignPlan,
	type ActionPlan,
	type ActionScenario,
	type ActionVariant,
	type CampaignInvoker,
	type CampaignPlan,
    type ReadbackSpec,
} from "./ascet-edit-live-campaign.ts";

function expectedRunCount(): number {
	return ACTION_MATRIX.reduce((total, action) => total + REQUIRED_VARIANT_MATRIX[action].length * REQUIRED_SCENARIOS.length, 0);
}

function planFor(channel: "source" | "packaged" = "source"): CampaignPlan {
	const bridgePath = channel === "source" ? "ascetcli/output/ascet-csharp/bin/AscetBridge.exe" : "packages/ascet-extension/ascet-cli/bin/AscetBridge.exe";
const bridgeSha256 = createHash("sha256").update(readFileSync(resolve(process.cwd(), bridgePath))).digest("hex").toUpperCase();
	return {
		schemaVersion: 1,
		campaignId: `fixture-${channel}-${Date.now()}`,
		channel,
		mode: "evidence-preserved",
		database: { path: "C:\\fixture-db", fingerprint: "fixture-db-fingerprint" },
		bridge: { path: bridgePath, sha256: bridgeSha256 },
		source: { revision: "fixture-revision", worktreeStatusDigest: "fixture-worktree" },
		scheduler: { requiredHostState: "healthy", requiredActiveCount: 0, requiredQueuedCount: 0, requiredCliLock: false },
		actions: ACTION_MATRIX.map((action, actionIndex) => ({
			id: `${String(actionIndex + 1).padStart(2, "0")}-${action}`,
			action,
			runIndex: actionIndex + 1,
			variants: REQUIRED_VARIANT_MATRIX[action].map((variant, variantIndex) => ({
				id: `${action}-${variant}`,
				variant,
				scenarios: REQUIRED_SCENARIOS.map((scenario) => ({
					id: `${action}-${variant}-${scenario}`,
					scenario,
					request: { action, variant, scenario, fixtureRoot: `PI_LIVE_EVIDENCE_fixture_${actionIndex + 1}_${variantIndex + 1}_${scenario}`, targetPath: `PI_LIVE_EVIDENCE_fixture_${actionIndex + 1}_${variantIndex + 1}_${scenario}\\Target` },
                    readback: action === "mode=set" && scenario === "changed-success" ? [{ id: "before-editable", tool: "fixture_readback", params: { action, variant, scenario, checkpoint: "before" }, phase: "precondition" }, { id: "after-editable", tool: "fixture_readback", params: { action, variant, scenario, checkpoint: "after" }, phase: "postcondition" }] : { id: "independent", tool: "fixture_readback", params: { action, variant, scenario }, phase: "independent" },
					objectManifest: { root: `PI_LIVE_EVIDENCE_fixture_${actionIndex + 1}_${variantIndex + 1}_${scenario}`, parent: "PI_LIVE_EVIDENCE_fixture_parent", siblingMarkers: ["sibling-marker"] },
					expectedOutcome: scenario,
                    execution: "ready",
				})),
			})),
		})),
	};
}

function completeInvoker(failure?: { action: string; variant: string; scenario: string }, missingBridge?: { action: string; variant: string; scenario: string }, failedReadback?: { action: string; variant: string; scenario: string }): CampaignInvoker {
	return {
		async invoke(action: ActionPlan, variant: ActionVariant, scenario: ActionScenario) {
			if (failure?.action === action.action && failure.variant === variant.variant && failure.scenario === scenario.scenario) {
				throw new Error(`fixture failure for ${action.action}/${variant.variant}/${scenario.scenario}`);
			}
			const bridgeMissing = missingBridge?.action === action.action && missingBridge.variant === variant.variant && missingBridge.scenario === scenario.scenario;
			const bridgeFailure = scenario.scenario === "bridge-failure";
			const invalidSelector = scenario.scenario === "invalid-selector";
			return {
				response: invalidSelector || bridgeFailure ? { status: "error", error: { code: bridgeFailure ? "bridge_failure" : "invalid_selector" } } : { ok: true, action: action.action, variant: variant.variant, scenario: scenario.scenario },
				bridge: bridgeMissing ? { stdout: { ok: true }, exitCode: 0 } : { request: scenario.request, stdout: { ok: true }, stderr: bridgeFailure ? "bridge failure" : "", exitCode: bridgeFailure ? 17 : 0 },
				telemetry: { action: action.action, variant: variant.variant, scenario: scenario.scenario, sessionCount: 1, saveCount: scenario.scenario === "changed-success" ? 1 : 0 },
				normalizedResult: scenario.scenario === "changed-success" ? { changed: true, mutationStatus: "applied", saveAttempted: true, saveSucceeded: true, saveState: "saved", verified: true, verificationStatus: "passed", verificationMode: "same_session", sessionCount: 1, saveCount: 1, editableRetryCount: 0, nativeMutationAttemptCount: 1 } : scenario.scenario === "confirmed-no-op" ? { changed: false, mutationStatus: "no_op", saveAttempted: false, saveSucceeded: false, saveState: "not_required", verified: true, verificationStatus: "passed", verificationMode: "same_session", sessionCount: 1, saveCount: 0, editableRetryCount: 0, nativeMutationAttemptCount: 0 } : { changed: false, mutationStatus: bridgeFailure ? "failed" : "rejected", verified: false, sessionCount: 1, saveCount: 0, nativeMutationAttemptCount: 0 },
			};
		},
        async readback(action: ActionPlan, variant: ActionVariant, scenario: ActionScenario, readback: ReadbackSpec) {
            if (failedReadback?.action === action.action && failedReadback.variant === variant.variant && failedReadback.scenario === scenario.scenario) return { publicResult: { status: "error", error: { code: "target_not_found" } }, bridgeEvidence: { request: readback, stdout: { error: "target_not_found" }, stderr: "target_not_found", exitCode: 2 } };
            return { publicResult: { ok: true, variant: variant.variant, scenario: scenario.scenario, readbackId: readback.id, phase: readback.phase }, bridgeEvidence: { request: readback, stdout: { ok: true }, stderr: "", exitCode: 0 } };
		},
	};
}

function outputFiles(root: string): string[] {
	const files: string[] = [];
	function walk(path: string): void {
		for (const entry of readdirSync(path, { withFileTypes: true })) {
			const child = join(path, entry.name);
			if (entry.isDirectory()) walk(child);
			else files.push(child);
		}
	}
	walk(root);
	return files;
}

test("required variant matrix freezes spec minimums and StateMachine has 48 scenario runs", () => {
	assert.deepEqual(REQUIRED_VARIANT_MATRIX, {
		create_folder: ["folder"],
		create_component: ["class", "module", "statemachine", "enumeration"],
		create_method: ["class-abstract", "module-process", "statemachine-action", "statemachine-condition", "statemachine-trigger"],
		create_dependent_chain: ["exported-endpoint", "imported-endpoint", "local-dependent-endpoint"],
		set_method_signature: ["return-and-arguments-replace"],
		delete_component: ["component"],
		delete_method: ["method"],
		delete_folder: ["folder-subtree"],
		set_method_code: ["method-code-v1-v2"],
		set_module_code: ["set-method", "set-header", "set-external-c-code"],
		set_state_machine_code: [
			"set-method",
			"set-state-entry-esdl",
			"set-state-exit-esdl",
			"set-state-static-esdl",
			"bind-state-entry-method",
			"bind-state-exit-method",
			"bind-state-static-method",
			"set-transition-condition-esdl",
			"set-transition-action-esdl",
			"bind-transition-condition-method",
			"bind-transition-action-method",
			"set-start-state",
		],
		set_enumerators: ["ordered-replace"],
		apply_element_spec: [
			"class-create-standard-primitive",
			"module-create-exported",
			"class-patch-upsert-imported",
			"module-restore-local-dependent",
			"class-remove-array",
			"module-delete-missing-enumeration",
			"class-create-table",
			"module-create-component-reference",
		],
		apply_project_formula: ["identity", "multiple-formulas", "restore", "delete-missing"],
		set_element_dependency: ["dependent-exported-imported", "independent-local", "explicit-mapping", "auto-mapping", "restoration", "supported-variant-policy"],
		"mode=check": ["editable", "read-only"],
		"mode=set": ["read-only-to-editable"],
	});
	assert.deepEqual(REQUIRED_SCENARIOS, ["changed-success", "confirmed-no-op", "invalid-selector", "bridge-failure"]);
	assert.equal(REQUIRED_VARIANT_MATRIX.set_state_machine_code.length * REQUIRED_SCENARIOS.length, 48);
	assert.equal(expectedRunCount(), 220);
});

test("validation rejects missing and duplicate required variants and scenarios", () => {
	const plan = planFor();
	validateCampaignPlan(plan);
	const first = plan.actions[0]!;
	assert.throws(() => validateCampaignPlan({ ...plan, actions: [{ ...first, variants: [] }, ...plan.actions.slice(1)] }), /missing required variant/i);
	assert.throws(() => validateCampaignPlan({ ...plan, actions: [{ ...first, variants: [first.variants[0]!, first.variants[0]!] }, ...plan.actions.slice(1)] }), /duplicate variant/i);
	const firstVariant = first.variants[0]!;
	assert.throws(
		() => validateCampaignPlan({ ...plan, actions: [{ ...first, variants: [{ ...firstVariant, scenarios: firstVariant.scenarios.slice(0, 3) }] }, ...plan.actions.slice(1)] }),
		/missing required scenario/i,
	);
	assert.throws(
		() => validateCampaignPlan({ ...plan, actions: [{ ...first, variants: [{ ...firstVariant, scenarios: [firstVariant.scenarios[0]!, firstVariant.scenarios[0]!, ...firstVariant.scenarios.slice(2)] }] }, ...plan.actions.slice(1)] }),
		/duplicate scenario/i,
	);
});

test("campaign template contains every spec-required variant and scenario", () => {
	const template = loadCampaignPlan(join(process.cwd(), "artifacts", "ascet-edit-live", "campaign-plan.template.json"));
	template.bridge.sha256 = createHash("sha256").update(readFileSync(resolve(process.cwd(), template.bridge.path))).digest("hex").toUpperCase();
    for (const action of template.actions) {
        for (const variant of action.variants) {
            for (const scenario of variant.scenarios) scenario.execution = "ready";
        }
    }
	const modeSet = template.actions.find((action) => action.action === "mode=set");
	assert.ok(modeSet);
	const modeSetChanged = modeSet.variants.flatMap((variant) => variant.scenarios).find((scenario) => scenario.scenario === "changed-success");
	assert.ok(modeSetChanged);
	assert.ok(Array.isArray(modeSetChanged.readback));
	assert.ok(modeSetChanged.readback.some((readback) => readback.phase === "precondition"));
	assert.ok(modeSetChanged.readback.some((readback) => readback.phase === "postcondition"));
	validateCampaignPlan(template);
	const stateMachine = template.actions.find((action) => action.action === "set_state_machine_code");
	assert.ok(stateMachine);
	assert.equal(stateMachine.variants.flatMap((variant) => variant.scenarios).length, 48);
	assert.equal(template.actions.flatMap((action) => action.variants.flatMap((variant) => variant.scenarios)).length, expectedRunCount());
});

test("safety gates reject unknown execution and unsafe ready target paths", () => {
	const base = planFor();
	const missingExecution = structuredClone(base);
	delete (missingExecution.actions[0]!.variants[0]!.scenarios[0]! as unknown as Record<string, unknown>).execution;
	assert.throws(() => validateCampaignPlan(missingExecution), /invalid execution/i);
	const unknownExecution = structuredClone(base);
	(unknownExecution.actions[0]!.variants[0]!.scenarios[0]! as unknown as Record<string, unknown>).execution = "unknown";
	assert.throws(() => validateCampaignPlan(unknownExecution), /invalid execution/i);
	for (const targetPath of ["C:\\outside\\Target", "PI_LIVE_EVIDENCE_fixture_1_1_changed-success\\..\\OUTSIDE", "PI_LIVE_EVIDENCE_fixture_1_1_changed-success\\OUTSIDE\\Target"]) {
		const unsafe = structuredClone(base);
		unsafe.actions[0]!.variants[0]!.scenarios[0]!.request.targetPath = targetPath;
		assert.throws(() => validateCampaignPlan(unsafe), /unsafe target path/i);
	}
	const missingHash = structuredClone(base);
	delete (missingHash.bridge as unknown as Record<string, unknown>).sha256;
	assert.throws(() => validateCampaignPlan(missingHash), /sha-256/i);
});

test("Bridge hash gate records identity and stops before writer acquisition", async () => {
	const root = mkdtempSync(join(tmpdir(), "ascet-live-harness-hash-"));
	try {
		const plan = planFor();
		plan.bridge.sha256 = "0".repeat(64);
		let writerAcquired = false;
		await assert.rejects(
			() => runCampaign(plan, { outputRoot: join(root, "source-campaign"), invoker: completeInvoker(), acquireWriter: () => { writerAcquired = true; return () => undefined; } }),
			/Bridge SHA-256 mismatch/i,
		);
		assert.equal(writerAcquired, false);
		const manifest = JSON.parse(readFileSync(join(root, "source-campaign", "campaign-manifest.json"), "utf8")) as Record<string, unknown>;
		assert.equal(manifest.planHash, "0".repeat(64));
		assert.equal(typeof manifest.actualHash, "string");
		assert.equal(manifest.hashMatch, false);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("continues after failure and retains evidence for every required variant scenario", async () => {
	const root = mkdtempSync(join(tmpdir(), "ascet-live-harness-fixture-"));
	try {
		const expected = expectedRunCount();
		const summary = await runCampaign(planFor(), {
			outputRoot: join(root, "source-campaign"),
			invoker: completeInvoker({ action: "delete_component", variant: "component", scenario: "invalid-selector" }),
			acquireWriter: () => () => undefined,
		});
		assert.equal(summary.status, "FAIL");
		assert.equal(summary.actions.length, expected);
		assert.equal(summary.actions.filter((run) => run.action === "set_state_machine_code").length, 48);
		assert.equal(summary.counts.FAIL, 1);
		assert.equal(summary.actions.at(-1)?.action, "mode=set");
		assert.equal(readFileSync(join(root, "source-campaign", "retention-index.ndjson"), "utf8").trim().split("\n").length, expected);
		const files = outputFiles(join(root, "source-campaign"));
		assert.equal(files.filter((file) => file.endsWith("run-manifest.json")).length, expected);
        assert.ok(REQUIRED_RUN_FILES.includes("readback/request.json"));
        assert.ok(REQUIRED_RUN_FILES.includes("readback/result.json"));
        assert.ok(REQUIRED_RUN_FILES.includes("telemetry/run.ndjson"));
        const firstManifestPath = files.find((file) => file.endsWith("run-manifest.json"));
        assert.ok(firstManifestPath);
        const firstManifest = JSON.parse(readFileSync(firstManifestPath, "utf8")) as { evidencePaths: unknown; bridgeRequestDigest: unknown };
        assert.ok(Array.isArray(firstManifest.evidencePaths));
        assert.equal(typeof firstManifest.bridgeRequestDigest, "string");
        assert.ok((firstManifest.evidencePaths as string[]).some((path) => path.endsWith("readback/request.json")));
        assert.ok((firstManifest.evidencePaths as string[]).some((path) => path.endsWith("telemetry/run.ndjson")));
		assert.equal(files.some((file) => file.endsWith("cleanup/request.json")), false);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("contradictory no-op Save evidence cannot be promoted to PASS", async () => {
	const root = mkdtempSync(join(tmpdir(), "ascet-live-harness-no-op-save-"));
	try {
		const base = completeInvoker();
		const summary = await runCampaign(planFor(), {
			outputRoot: join(root, "source-campaign"),
			invoker: {
				...base,
				async invoke(action, variant, scenario) {
					const invocation = await base.invoke(action, variant, scenario);
					if (action.action === "create_component" && variant.variant === "class" && scenario.scenario === "confirmed-no-op") {
						return { ...invocation, normalizedResult: { ...(invocation.normalizedResult as Record<string, unknown>), saveSucceeded: true } };
					}
					return invocation;
				},
			},
			acquireWriter: () => () => undefined,
		});
		const row = summary.actions.find((run) => run.action === "create_component" && run.variant === "class" && run.scenario === "confirmed-no-op");
		assert.equal(row?.status, "BLOCKED");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("public partial outcome cannot be promoted to changed-write PASS", async () => {
	const root = mkdtempSync(join(tmpdir(), "ascet-live-harness-public-partial-"));
	try {
		const base = completeInvoker();
		const summary = await runCampaign(planFor(), {
			outputRoot: join(root, "source-campaign"),
			invoker: {
				...base,
				async invoke(action, variant, scenario) {
					const invocation = await base.invoke(action, variant, scenario);
					if (action.action === "set_method_code" && scenario.scenario === "changed-success") {
						return { ...invocation, response: { details: { outcome: { status: "partial" } } } };
					}
					return invocation;
				},
			},
			acquireWriter: () => () => undefined,
		});
		const row = summary.actions.find((run) => run.action === "set_method_code" && run.scenario === "changed-success");
		assert.equal(row?.status, "BLOCKED");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("failed readback cannot promote a canonical no-op to PASS", async () => {
	const root = mkdtempSync(join(tmpdir(), "ascet-live-harness-readback-"));
	try {
		const summary = await runCampaign(planFor(), {
			outputRoot: join(root, "source-campaign"),
			invoker: completeInvoker(undefined, undefined, { action: "delete_component", variant: "component", scenario: "confirmed-no-op" }),
			acquireWriter: () => () => undefined,
		});
		const row = summary.actions.find((run) => run.action === "delete_component" && run.variant === "component" && run.scenario === "confirmed-no-op");
		assert.equal(row?.status, "BLOCKED");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});


test("missing Bridge evidence is BLOCKED and never promoted to PASS", async () => {
	const root = mkdtempSync(join(tmpdir(), "ascet-live-harness-blocked-"));
	try {
		const summary = await runCampaign(planFor(), {
			outputRoot: join(root, "source-campaign"),
			invoker: completeInvoker(undefined, { action: "mode=check", variant: "editable", scenario: "changed-success" }),
			acquireWriter: () => () => undefined,
		});
		const row = summary.actions.find((run) => run.action === "mode=check" && run.variant === "editable" && run.scenario === "changed-success");
		assert.equal(row?.status, "BLOCKED");
		assert.equal(summary.status, "BLOCKED");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("targeted Edit actions capture independent and transition readbacks", async () => {
    const root = mkdtempSync(join(tmpdir(), "ascet-live-harness-targeted-readbacks-"));
    try {
        const summary = await runCampaign(planFor(), {
            outputRoot: join(root, "source-campaign"),
            invoker: completeInvoker(),
            acquireWriter: () => () => undefined,
        });
        for (const actionName of ["set_element_dependency", "create_dependent_chain"] as const) {
            for (const scenarioName of ["changed-success", "confirmed-no-op"] as const) {
                const row = summary.actions.find((run) => run.action === actionName && run.scenario === scenarioName);
                assert.equal(row?.status, "PASS");
                const readback = JSON.parse(readFileSync(join(row!.runPath, "readback", "result.json"), "utf8")) as { steps: Array<{ spec: { phase: string } }> };
                assert.deepEqual(readback.steps.map((step) => step.spec.phase), ["independent"]);
            }
        }
        const modeSet = summary.actions.find((run) => run.action === "mode=set" && run.scenario === "changed-success");
        assert.equal(modeSet?.status, "PASS");
        const modeReadback = JSON.parse(readFileSync(join(modeSet!.runPath, "readback", "result.json"), "utf8")) as { steps: Array<{ spec: { id: string; phase: string } }> };
        assert.deepEqual(modeReadback.steps.map((step) => [step.spec.id, step.spec.phase]), [["before-editable", "precondition"], ["after-editable", "postcondition"]]);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("writer lock is exclusive and requires the explicit live-writer opt-in", () => {
	const root = mkdtempSync(join(tmpdir(), "ascet-live-writer-"));
	const previous = process.env.ASCET_LIVE_WRITER;
	try {
		delete process.env.ASCET_LIVE_WRITER;
		assert.throws(() => acquireAscetLiveWriter(join(root, "campaign")), /ASCET_LIVE_WRITER=1/);
		process.env.ASCET_LIVE_WRITER = "1";
		const release = acquireAscetLiveWriter(join(root, "campaign"));
		assert.throws(() => acquireAscetLiveWriter(join(root, "other-campaign")), /already held/);
		release();
	} finally {
		if (previous === undefined) delete process.env.ASCET_LIVE_WRITER;
		else process.env.ASCET_LIVE_WRITER = previous;
		rmSync(root, { recursive: true, force: true });
	}
});

test("packaged campaigns use a separate artifact channel", async () => {
	const root = mkdtempSync(join(tmpdir(), "ascet-live-harness-package-"));
	try {
		const summary = await runCampaign(planFor("packaged"), { outputRoot: join(root, "packaged-campaign"), invoker: completeInvoker(), acquireWriter: () => () => undefined });
		assert.equal(summary.channel, "packaged");
		assert.equal(summary.status, "PASS");
		assert.equal(summary.counts.PASS, expectedRunCount());
		assert.equal(summary.actions.length, expectedRunCount());
		assert.equal(outputFiles(join(root, "packaged-campaign")).some((file) => file.includes("packaged-bridge")), true);
		assert.equal(outputFiles(join(root, "packaged-campaign")).some((file) => file.includes("source-bridge")), false);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
