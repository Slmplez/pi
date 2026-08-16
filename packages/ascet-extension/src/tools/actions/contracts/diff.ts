import { Type } from "typebox";
import { ascetPublicErrorResultSchema } from "./shared-results.ts";
import { defineAscetAction } from "./types.ts";

export type AscetDiffParams =
	| {
			action: "diff";
			objectKind?: "class" | "module" | "statemachine";
			leftPath: string;
			rightPath: string;
			changesOnly?: boolean;
			timeoutMs?: number;
	  }
	| {
			action: "diff_method";
			leftPath: string;
			rightPath: string;
			methodName: string;
			changesOnly?: boolean;
			timeoutMs?: number;
	  }
	| {
			action: "diff_component_snapshot";
			leftPath: string;
			rightPath: string;
			changesOnly?: boolean;
			timeoutMs?: number;
	  }
	| {
			action: "diff_state_machine_domain";
			leftPath: string;
			rightPath: string;
			changesOnly?: boolean;
			timeoutMs?: number;
	  }
	| { action: "diff_element_spec"; componentPath: string; specFile: string; changesOnly?: boolean; timeoutMs?: number }
	| {
			action: "diff_project_formulas";
			leftPath: string;
			rightPath: string;
			changesOnly?: boolean;
			timeoutMs?: number;
	  };

const changesOnlySchema = Type.Optional(Type.Boolean());
const timeoutSchema = Type.Optional(Type.Integer({ minimum: 1, maximum: 300_000 }));
const pathSchema = Type.String({ minLength: 1 });
const commonPathProperties = {
	leftPath: pathSchema,
	rightPath: pathSchema,
	changesOnly: changesOnlySchema,
	timeoutMs: timeoutSchema,
};
const diffResultSchema = Type.Union([Type.Object({}, { additionalProperties: true }), ascetPublicErrorResultSchema]);
const DIFF_PROFILES = ["diff"] as const;

const diffParameters = Type.Object(
	{
		action: Type.Literal("diff"),
		objectKind: Type.Optional(
			Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")]),
		),
		...commonPathProperties,
	},
	{ additionalProperties: false },
);
const diffMethodParameters = Type.Object(
	{
		action: Type.Literal("diff_method"),
		...commonPathProperties,
		methodName: Type.String({ minLength: 1 }),
	},
	{ additionalProperties: false },
);
const diffComponentSnapshotParameters = Type.Object(
	{ action: Type.Literal("diff_component_snapshot"), ...commonPathProperties },
	{ additionalProperties: false },
);
const diffStateMachineDomainParameters = Type.Object(
	{ action: Type.Literal("diff_state_machine_domain"), ...commonPathProperties },
	{ additionalProperties: false },
);
const diffElementSpecParameters = Type.Object(
	{
		action: Type.Literal("diff_element_spec"),
		componentPath: pathSchema,
		specFile: pathSchema,
		changesOnly: changesOnlySchema,
		timeoutMs: timeoutSchema,
	},
	{ additionalProperties: false },
);
const diffProjectFormulasParameters = Type.Object(
	{ action: Type.Literal("diff_project_formulas"), ...commonPathProperties },
	{ additionalProperties: false },
);

export const ascetDiffActionContracts = [
	defineAscetAction({
		tool: "ascet_diff",
		action: "diff",
		selector: "action",
		visibility: "public",
		profiles: DIFF_PROFILES,
		parameters: diffParameters,
		result: diffResultSchema,
		execution: {
			kind: "bridge",
			logicalCommandId: "AscetDiffComponentSnapshot",
			operation: "diff_component_snapshot",
			variants: [
				{ when: { objectKind: "class" }, logicalCommandId: "AscetDiffClass", operation: "diff_class" },
				{ when: { objectKind: "module" }, logicalCommandId: "AscetDiffModule", operation: "diff_module" },
				{
					when: { objectKind: "statemachine" },
					logicalCommandId: "AscetDiffStateMachine",
					operation: "diff_state_machine",
				},
			],
		},
		guidance: {
			summary: "Compare two ASCET targets with the generic diff route.",
			rules: ["Use objectKind=class/module/statemachine for detailed semantic diffs when known."],
			fewShots: [
				{
					intent: "compare targets",
					args: { action: "diff", objectKind: "class", leftPath: "D/A", rightPath: "D/B", changesOnly: true },
				},
			],
			tags: ["diff"],
		},
	}),
	defineAscetAction({
		tool: "ascet_diff",
		action: "diff_method",
		selector: "action",
		visibility: "public",
		profiles: DIFF_PROFILES,
		parameters: diffMethodParameters,
		result: diffResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetDiffMethodCode", operation: "diff_method_code" },
		guidance: {
			summary: "Compare one method body between two components.",
			rules: ["Use diff_method when only one method body is needed."],
			fewShots: [
				{
					intent: "compare method",
					args: {
						action: "diff_method",
						leftPath: "D/A",
						rightPath: "D/B",
						methodName: "calc",
						changesOnly: true,
					},
				},
			],
			tags: ["diff", "method"],
		},
	}),
	defineAscetAction({
		tool: "ascet_diff",
		action: "diff_component_snapshot",
		selector: "action",
		visibility: "public",
		profiles: DIFF_PROFILES,
		parameters: diffComponentSnapshotParameters,
		result: diffResultSchema,
		execution: {
			kind: "bridge",
			logicalCommandId: "AscetDiffComponentSnapshot",
			operation: "diff_component_snapshot",
		},
		guidance: {
			summary: "Compare quick child snapshots for two components.",
			rules: ["Use diff_component_snapshot only when method code or element signatures are not required."],
			fewShots: [
				{
					intent: "compare snapshots",
					args: { action: "diff_component_snapshot", leftPath: "D/A", rightPath: "D/B", changesOnly: true },
				},
			],
			tags: ["diff", "snapshot"],
		},
	}),
	defineAscetAction({
		tool: "ascet_diff",
		action: "diff_state_machine_domain",
		selector: "action",
		visibility: "public",
		profiles: DIFF_PROFILES,
		parameters: diffStateMachineDomainParameters,
		result: diffResultSchema,
		execution: {
			kind: "bridge",
			logicalCommandId: "AscetDiffStateMachineDomain",
			operation: "diff_state_machine_domain",
		},
		guidance: {
			summary: "Compare state-machine domain structure.",
			rules: ["Use diff_state_machine_domain only for StateMachine targets."],
			fewShots: [
				{
					intent: "compare SM",
					args: { action: "diff_state_machine_domain", leftPath: "D/A", rightPath: "D/B", changesOnly: true },
				},
			],
			tags: ["diff", "state-machine"],
		},
	}),
	defineAscetAction({
		tool: "ascet_diff",
		action: "diff_element_spec",
		selector: "action",
		visibility: "public",
		profiles: DIFF_PROFILES,
		parameters: diffElementSpecParameters,
		result: diffResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetDiffElementSpec", operation: "diff_element_spec" },
		guidance: {
			summary: "Compare an element spec artifact with a live component.",
			rules: ["Use diff_element_spec when validating an element-spec JSON artifact against a component."],
			fewShots: [
				{
					intent: "compare spec",
					args: {
						action: "diff_element_spec",
						componentPath: "DEMO/PID",
						specFile: "spec.json",
						changesOnly: true,
					},
				},
			],
			tags: ["diff", "element"],
		},
	}),
	defineAscetAction({
		tool: "ascet_diff",
		action: "diff_project_formulas",
		selector: "action",
		visibility: "public",
		profiles: DIFF_PROFILES,
		parameters: diffProjectFormulasParameters,
		result: diffResultSchema,
		execution: {
			kind: "bridge",
			logicalCommandId: "AscetDiffProjectFormulas",
			operation: "diff_project_formulas",
		},
		guidance: {
			summary: "Compare project formulas between two Project targets.",
			rules: ["Use diff_project_formulas only for Project targets."],
			fewShots: [
				{
					intent: "compare formulas",
					args: { action: "diff_project_formulas", leftPath: "D/P1", rightPath: "D/P2", changesOnly: true },
				},
			],
			tags: ["diff", "project"],
		},
	}),
] as const;
