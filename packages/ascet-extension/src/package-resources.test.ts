import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as {
	files?: string[];
	scripts?: Record<string, string>;
	pi?: { skills?: string[] };
};
const skillRoot = join(packageRoot, "skills", "ascet-engineering");
const projectRulesRoot = join(packageRoot, "templates", "ascet-project", "rules");
const playbooksRoot = join(packageRoot, "ascet-cli", "contracts", "playbooks");

const skillReferences = [
	"scope-resolution-and-ownership.md",
	"database-root-discovery.md",
	"cnms-cust-routing-and-ownership.md",
	"customer-integration-workflow.md",
	"feature-package-workflow.md",
	"class-path-project-context.md",
	"project-to-esdl-signal-flow.md",
	"esdl-fast-path.md",
	"elements-fast-path.md",
	"parameter-naming.md",
	"parameter-provider-placement.md",
	"dependency-advanced-path.md",
	"bde-and-surface-routing.md",
	"task-planning-and-implementation-plan.md",
	"esdl-design-and-signal-reuse.md",
	"esdl-literals-and-configuration-values.md",
	"tool-recipes.md",
	"write-execution.md",
] as const;

describe("ASCET package resources", () => {
	test("declares and contains the engineering Skill", () => {
		assert.deepEqual(manifest.pi?.skills, ["skills/ascet-engineering"]);
		assert.ok(manifest.files?.includes("skills/ascet-engineering"));
		assert.ok(existsSync(join(skillRoot, "SKILL.md")));
		assert.ok(existsSync(join(skillRoot, "agents", "openai.yaml")));
		for (const reference of skillReferences) {
			assert.ok(existsSync(join(skillRoot, "references", reference)), reference);
		}
	});

	test("provides an isolated-install verifier", () => {
		assert.equal(manifest.scripts?.["verify-isolated-install"], "tsx scripts/verify-isolated-install.ts");
		assert.ok(existsSync(join(packageRoot, "scripts", "verify-isolated-install.ts")));
	});
	test("does not contain the removed implementation Agent", () => {
		assert.equal(existsSync(join(packageRoot, "agents", "ascet-implementation.md")), false);
		assert.equal(manifest.files?.includes("agents/ascet-implementation.md"), false);
	});

	test("does not scaffold a standalone verification Tool", () => {
		assert.equal(existsSync(join(projectRulesRoot, "tools", "verify.md")), false);
		const manifestText = readFileSync(join(projectRulesRoot, "manifest.yaml"), "utf8");
		assert.doesNotMatch(manifestText, /ascet\.tool\.verify|tools\/verify\.md/);
		for (const path of [
			join(projectRulesRoot, "index.md"),
			join(projectRulesRoot, "core", "workflow.md"),
			join(projectRulesRoot, "core", "routing.md"),
			join(projectRulesRoot, "core", "execution-modes.md"),
			join(projectRulesRoot, "core", "verification.md"),
			join(projectRulesRoot, "tools", "index.md"),
		]) {
			assert.doesNotMatch(readFileSync(path, "utf8"), /AscetVerifyTool|ascet_verify/);
		}
	});

	test("keeps packaged write playbooks on Runtime automatic verification", () => {
		const writeMethod = JSON.parse(readFileSync(join(playbooksRoot, "write-method.json"), "utf8")) as {
			steps?: Array<{ kind?: string; commandId?: string }>;
			requiredRules?: string[];
		};
		assert.deepEqual(
			writeMethod.steps?.map((step) => step.commandId),
			["AscetGetTree", "AscetGetElements", "AscetReadMethodCode", "AscetSetMethodCode"],
		);
		assert.equal(writeMethod.requiredRules?.includes("write_then_readback"), false);
		assert.equal(writeMethod.requiredRules?.includes("automatic_action_readback"), true);
		assert.equal(writeMethod.requiredRules?.includes("inspect_verification_feedback"), true);

		const reviewApplyVerify = readFileSync(join(playbooksRoot, "review-apply-verify.json"), "utf8");
		assert.doesNotMatch(reviewApplyVerify, /AscetVerifyTool|ascet_verify/u);
		assert.match(reviewApplyVerify, /apply_with_automatic_verification/u);
	});
});
