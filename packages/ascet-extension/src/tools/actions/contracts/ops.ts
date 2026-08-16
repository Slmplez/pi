import { Type } from "typebox";
import { openAiObjectUnionSchema } from "../../_shared/openai-schema.ts";
import type { AscetRecoverParams } from "../../recover.ts";
import { ascetPublicErrorResultSchema } from "./shared-results.ts";
import { defineAscetAction } from "./types.ts";

const allProfiles = [
	"base",
	"advanced-read",
	"reference",
	"diff",
	"write-preflight",
	"batch-write",
	"component-edit",
	"ops",
] as const;
const opsProfiles = ["ops"] as const;
const schedulerStatusProfiles = ["write-preflight", "batch-write", "ops"] as const;
const reconciliationProfiles = ["write-preflight", "batch-write", "component-edit", "ops"] as const;
const localResultSchema = Type.Union([Type.Object({}, { additionalProperties: true }), ascetPublicErrorResultSchema]);
const statusResultSchema = Type.Union([Type.String({ minLength: 1 }), ascetPublicErrorResultSchema]);
const schedulerResultSchema = Type.Union([statusResultSchema, localResultSchema]);

export const ascetStatusActionSchema = Type.Object({}, { additionalProperties: false });
export const ascetCapabilitiesActionSchema = Type.Object(
	{
		action: Type.Literal("search_actions"),
		query: Type.Optional(Type.String()),
		tool: Type.Optional(Type.String()),
		name: Type.Optional(Type.String()),
		limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50 })),
		includeHidden: Type.Optional(Type.Boolean()),
		detailLevel: Type.Optional(Type.Union([Type.Literal("summary"), Type.Literal("full")])),
	},
	{ additionalProperties: false },
);

const simpleRecoverActions = [
	"status",
	"clear_extension_temp",
	"scheduler_status",
	"scheduler_recover",
	"clear_stale_cli_lock",
] as const;
const simpleRecoverSchemas = simpleRecoverActions.map((action) =>
	Type.Object({ action: Type.Literal(action) }, { additionalProperties: false }),
);
export const ascetReconcileMutationActionSchema = Type.Union([
	Type.Object(
		{
			action: Type.Literal("reconcile_mutation"),
			mode: Type.Literal("inspect"),
			databaseFingerprint: Type.String({ minLength: 1 }),
			targetOid: Type.String({ minLength: 1 }),
			expectedGeneration: Type.Integer({ minimum: 0 }),
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			action: Type.Literal("reconcile_mutation"),
			mode: Type.Union([
				Type.Literal("rollback_to_before"),
				Type.Literal("cleanup_created"),
				Type.Literal("accept_current"),
			]),
			databaseFingerprint: Type.String({ minLength: 1 }),
			targetOid: Type.String({ minLength: 1 }),
			expectedGeneration: Type.Integer({ minimum: 1 }),
			intent: Type.Literal("apply"),
		},
		{ additionalProperties: false },
	),
]);
export const ascetRecoverActionSchemas = [...simpleRecoverSchemas, ascetReconcileMutationActionSchema] as const;
export const ascetRecoverParameters = openAiObjectUnionSchema<AscetRecoverParams>(ascetRecoverActionSchemas);
export const ascetSchedulerStatusActionSchema = Type.Object(
	{
		action: Type.Optional(Type.Literal("status")),
		format: Type.Optional(Type.Union([Type.Literal("text"), Type.Literal("json")])),
	},
	{ additionalProperties: false },
);
export const ascetSchedulerRecoverActionSchema = Type.Object(
	{ action: Type.Literal("recover"), format: Type.Optional(Type.Union([Type.Literal("text"), Type.Literal("json")])) },
	{ additionalProperties: false },
);

function localExecution(logicalCommandId: string, operation: string) {
	return { kind: "local" as const, logicalCommandId, operation, category: "ops" as const };
}
function simpleRecoverContract(
	index: number,
	action: (typeof simpleRecoverActions)[number],
	summary: string,
	rule: string,
	intent: string,
	tags: readonly string[],
) {
	return defineAscetAction({
		tool: "ascet_recover",
		action,
		selector: "action",
		visibility: "public",
		profiles: opsProfiles,
		parameters: simpleRecoverSchemas[index],
		result: localResultSchema,
		execution: localExecution(
			`PiAscetRecover${action
				.split("_")
				.map((part) => part[0]?.toUpperCase() + part.slice(1))
				.join("")}`,
			action === "status" ? "recover_status" : action,
		),
		guidance: { summary, rules: [rule], fewShots: [{ intent, args: { action } }], tags },
	});
}

export const ascetOpsActionContracts = [
	defineAscetAction({
		tool: "ascet_status",
		action: "status",
		selector: "fixed",
		visibility: "public",
		profiles: allProfiles,
		parameters: ascetStatusActionSchema,
		result: statusResultSchema,
		execution: localExecution("PiAscetStatus", "status"),
		guidance: {
			summary: "Connect ASCET and warm only the component partition.",
			rules: [
				"Use ascet_status before calling other ASCET tools when runtime availability is uncertain.",
				"Treat missing ASCET CLI or contract catalog as setup evidence.",
			],
			fewShots: [{ intent: "check setup", args: {} }],
			tags: ["ops", "status", "runtime"],
		},
	}),
	defineAscetAction({
		tool: "ascet_capabilities",
		action: "search_actions",
		selector: "action",
		visibility: "public",
		profiles: allProfiles,
		parameters: ascetCapabilitiesActionSchema,
		result: localResultSchema,
		execution: localExecution("PiAscetCapabilities", "capabilities"),
		guidance: {
			compact: "search ASCET tool actions and return full schema/rules/fewShot",
			intent: "Find the correct ASCET tool action and retrieve precise calling details.",
			useWhen: ["Action choice, parameters, result shape, or usage rules are unclear."],
			avoidWhen: ["The exact action and required parameters are already known."],
			aliases: ["tool action search", "which ascet tool", "action schema", "few-shot", "capability action"],
			result: { shape: "actionMatches", fields: ["total", "items"] },
			summary: "Search ASCET tool actions and return full schema, rules, fewShot, and result shape.",
			rules: [
				"Use search_actions when action choice, parameters, result shape, or usage rules are unclear.",
				"search_actions searches ActionCatalog, not ASCET model contents or CLI backend commands.",
			],
			fewShots: [
				{ intent: "find action schema", args: { action: "search_actions", query: "complete code", limit: 3 } },
			],
			tags: ["ops", "capability", "action-search"],
		},
	}),
	simpleRecoverContract(
		0,
		"status",
		"Diagnose ASCET extension runtime state.",
		"Use action=status before recovery if the failure mode is unclear.",
		"diagnose runtime",
		["ops", "recover"],
	),
	simpleRecoverContract(
		1,
		"clear_extension_temp",
		"Clear extension-owned temporary ASCET files.",
		"Only clear extension-owned temp files; do not kill ASCET GUI or user-owned ToolAPI processes.",
		"clear temp",
		["ops", "recover"],
	),
	simpleRecoverContract(
		2,
		"scheduler_status",
		"Inspect ASCET scheduler queue and CLI lock state.",
		"Use scheduler_status for queue, lock, and operation-health diagnostics.",
		"check queue",
		["ops", "scheduler"],
	),
	simpleRecoverContract(
		3,
		"scheduler_recover",
		"Run safe scheduler recovery.",
		"Use scheduler_recover only for safe scheduler recovery; it does not kill user-owned ASCET GUI processes.",
		"safe scheduler recover",
		["ops", "scheduler", "recover"],
	),
	simpleRecoverContract(
		4,
		"clear_stale_cli_lock",
		"Clear a stale PI-owned ASCET CLI lock.",
		"Use clear_stale_cli_lock only when scheduler status shows a stale lock.",
		"clear stale lock",
		["ops", "scheduler", "recover"],
	),
	defineAscetAction({
		tool: "ascet_recover",
		action: "reconcile_mutation",
		selector: "action",
		visibility: "public",
		profiles: reconciliationProfiles,
		parameters: ascetReconcileMutationActionSchema,
		result: localResultSchema,
		execution: localExecution("PiAscetRecoverReconcileMutation", "reconcile_mutation"),
		guidance: {
			summary: "Inspect and reconcile a quarantined ASCET mutation target.",
			rules: [
				"Start with mode=inspect. Inspect is read-only and never clears quarantine.",
				"Bind reconciliation to the exact database fingerprint, target OID, and guard generation.",
				"Do not attempt another mutation while the target remains quarantined.",
			],
			fewShots: [
				{
					intent: "inspect quarantined mutation",
					args: {
						action: "reconcile_mutation",
						mode: "inspect",
						databaseFingerprint: "sha256:database",
						targetOid: "040...",
						expectedGeneration: 1,
					},
				},
			],
			tags: ["ops", "mutation", "reconciliation"],
		},
	}),
	defineAscetAction({
		tool: "ascet_scheduler_status",
		action: "status",
		selector: "action",
		visibility: "public",
		profiles: schedulerStatusProfiles,
		parameters: ascetSchedulerStatusActionSchema,
		result: schedulerResultSchema,
		execution: localExecution("PiAscetSchedulerStatus", "scheduler_status"),
		guidance: {
			summary: "Inspect ASCET runtime scheduler queue, PI CLI lock, and operation health.",
			rules: ["Use ascet_scheduler_status when ASCET tools appear stuck, queued, degraded, or timing out."],
			fewShots: [{ intent: "inspect lock", args: { action: "status", format: "text" } }],
			tags: ["ops", "scheduler"],
		},
	}),
	defineAscetAction({
		tool: "ascet_scheduler_status",
		action: "recover",
		selector: "action",
		visibility: "public",
		profiles: opsProfiles,
		parameters: ascetSchedulerRecoverActionSchema,
		result: schedulerResultSchema,
		execution: localExecution("PiAscetSchedulerRecover", "scheduler_recover"),
		guidance: {
			summary: "Run safe scheduler recovery from the scheduler tool.",
			rules: [
				"Use action=recover only for safe scheduler recovery; it does not kill user-owned ASCET GUI processes.",
			],
			fewShots: [{ intent: "recover scheduler", args: { action: "recover", format: "text" } }],
			tags: ["ops", "scheduler", "recover"],
		},
	}),
] as const;
