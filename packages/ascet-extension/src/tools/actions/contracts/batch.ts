import { type TSchema, Type } from "typebox";
import type { AscetBatchWriteParams } from "../../../batch-write.ts";
import {
	applyElementSpecRequest,
	applyProjectFormulaRequest,
	createComponentRequest,
	createFolderRequest,
	createMethodRequest,
	deleteComponentRequest,
	deleteFolderRequest,
	deleteMethodRequest,
	setMethodCodeRequest,
} from "../../../batch-write.ts";
import { openAiObjectUnionSchema } from "../../_shared/openai-schema.ts";
import { ascetPublicErrorResultSchema } from "./shared-results.ts";
import { defineAscetAction } from "./types.ts";

const batchProfiles = ["batch-write"] as const;
const batchRules = ["Batch write is hidden by default and must not be injected into public prompts."] as const;
const batchResultSchema = Type.Union([Type.Object({}, { additionalProperties: true }), ascetPublicErrorResultSchema]);
function batchActionSchema(operation: string, request: TSchema) {
	return Type.Object(
		{
			operation: Type.Literal(operation),
			requests: Type.Array(request, { minItems: 1, maxItems: 50 }),
			intent: Type.Union([Type.Literal("preview"), Type.Literal("apply")]),
		},
		{ additionalProperties: false },
	);
}

export const ascetBatchActionContracts = [
	defineAscetAction({
		tool: "ascet_batch_write",
		action: "batch_set_method_code",
		selector: "operation",
		visibility: "hidden",
		profiles: batchProfiles,
		featureFlag: "PI_ASCET_ENABLE_BATCH_WRITE",
		parameters: batchActionSchema("batch_set_method_code", setMethodCodeRequest),
		result: batchResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetBatchSetMethodCode", operation: "batch_set_method_code" },
		guidance: {
			summary: "Hidden batch set_method_code action.",
			rules: batchRules,
			fewShots: [
				{
					intent: "batch method code",
					args: {
						operation: "batch_set_method_code",
						intent: "apply",
						requests: [{ componentPath: "DEMO/PID", methodName: "calc", codeFile: "calc.esdl" }],
					},
				},
			],
			tags: ["hidden", "batch", "write"],
			hidden: true,
		},
	}),
	defineAscetAction({
		tool: "ascet_batch_write",
		action: "batch_set_element_spec",
		selector: "operation",
		visibility: "hidden",
		profiles: batchProfiles,
		featureFlag: "PI_ASCET_ENABLE_BATCH_WRITE",
		parameters: batchActionSchema("batch_set_element_spec", applyElementSpecRequest),
		result: batchResultSchema,
		execution: {
			kind: "bridge",
			logicalCommandId: "AscetBatchApplyElementSpec",
			operation: "batch_set_element_spec",
		},
		guidance: {
			summary: "Hidden batch apply_element_spec action.",
			rules: batchRules,
			fewShots: [
				{
					intent: "batch specs",
					args: {
						operation: "batch_set_element_spec",
						intent: "apply",
						requests: [{ componentPath: "DEMO/PID", specFile: "spec.json", mode: "restore" }],
					},
				},
			],
			tags: ["hidden", "batch", "write"],
			hidden: true,
		},
	}),
	defineAscetAction({
		tool: "ascet_batch_write",
		action: "batch_create_component",
		selector: "operation",
		visibility: "hidden",
		profiles: batchProfiles,
		featureFlag: "PI_ASCET_ENABLE_BATCH_WRITE",
		parameters: batchActionSchema("batch_create_component", createComponentRequest),
		result: batchResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetBatchCreateComponent", operation: "batch_create_component" },
		guidance: {
			summary: "Hidden batch create_component action.",
			rules: batchRules,
			fewShots: [
				{
					intent: "batch components",
					args: {
						operation: "batch_create_component",
						intent: "apply",
						requests: [{ componentPath: "DEMO/C", kind: "class", language: "ESDL" }],
					},
				},
			],
			tags: ["hidden", "batch", "write"],
			hidden: true,
		},
	}),
	defineAscetAction({
		tool: "ascet_batch_write",
		action: "batch_create_method",
		selector: "operation",
		visibility: "hidden",
		profiles: batchProfiles,
		featureFlag: "PI_ASCET_ENABLE_BATCH_WRITE",
		parameters: batchActionSchema("batch_create_method", createMethodRequest),
		result: batchResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetBatchCreateMethod", operation: "batch_create_method" },
		guidance: {
			summary: "Hidden batch create_method action.",
			rules: batchRules,
			fewShots: [
				{
					intent: "batch methods",
					args: {
						operation: "batch_create_method",
						intent: "apply",
						requests: [
							{ componentPath: "DEMO/C", methodName: "calc", componentKind: "class", methodKind: "abstract" },
						],
					},
				},
			],
			tags: ["hidden", "batch", "write"],
			hidden: true,
		},
	}),
	defineAscetAction({
		tool: "ascet_batch_write",
		action: "batch_set_project_formula",
		selector: "operation",
		visibility: "hidden",
		profiles: batchProfiles,
		featureFlag: "PI_ASCET_ENABLE_BATCH_WRITE",
		parameters: batchActionSchema("batch_set_project_formula", applyProjectFormulaRequest),
		result: batchResultSchema,
		execution: {
			kind: "bridge",
			logicalCommandId: "AscetBatchApplyProjectFormula",
			operation: "batch_set_project_formula",
		},
		guidance: {
			summary: "Hidden batch apply_project_formula action.",
			rules: batchRules,
			fewShots: [
				{
					intent: "batch formulas",
					args: {
						operation: "batch_set_project_formula",
						intent: "apply",
						requests: [{ projectPath: "DEMO/P", specFile: "formula.json", mode: "restore" }],
					},
				},
			],
			tags: ["hidden", "batch", "write"],
			hidden: true,
		},
	}),
	defineAscetAction({
		tool: "ascet_batch_write",
		action: "batch_delete_component",
		selector: "operation",
		visibility: "hidden",
		profiles: batchProfiles,
		featureFlag: "PI_ASCET_ENABLE_BATCH_WRITE",
		parameters: batchActionSchema("batch_delete_component", deleteComponentRequest),
		result: batchResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetBatchDeleteComponent", operation: "batch_delete_component" },
		guidance: {
			summary: "Hidden batch delete_component action.",
			rules: batchRules,
			fewShots: [
				{
					intent: "batch delete components",
					args: {
						operation: "batch_delete_component",
						intent: "apply",
						requests: [{ componentPath: "DEMO/Old", ifMissing: "fail" }],
					},
				},
			],
			tags: ["hidden", "batch", "write"],
			hidden: true,
		},
	}),
	defineAscetAction({
		tool: "ascet_batch_write",
		action: "batch_delete_method",
		selector: "operation",
		visibility: "hidden",
		profiles: batchProfiles,
		featureFlag: "PI_ASCET_ENABLE_BATCH_WRITE",
		parameters: batchActionSchema("batch_delete_method", deleteMethodRequest),
		result: batchResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetBatchDeleteMethod", operation: "batch_delete_method" },
		guidance: {
			summary: "Hidden batch delete_method action.",
			rules: batchRules,
			fewShots: [
				{
					intent: "batch delete methods",
					args: {
						operation: "batch_delete_method",
						intent: "apply",
						requests: [{ componentPath: "DEMO/C", methodName: "old", ifMissing: "fail" }],
					},
				},
			],
			tags: ["hidden", "batch", "write"],
			hidden: true,
		},
	}),
	defineAscetAction({
		tool: "ascet_batch_write",
		action: "batch_create_folder",
		selector: "operation",
		visibility: "hidden",
		profiles: batchProfiles,
		featureFlag: "PI_ASCET_ENABLE_BATCH_WRITE",
		parameters: batchActionSchema("batch_create_folder", createFolderRequest),
		result: batchResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetBatchCreateFolder", operation: "batch_create_folder" },
		guidance: {
			summary: "Hidden batch create_folder action.",
			rules: batchRules,
			fewShots: [
				{
					intent: "batch folders",
					args: {
						operation: "batch_create_folder",
						intent: "apply",
						requests: [{ folderPath: "DEMO/New", ifExists: "fail" }],
					},
				},
			],
			tags: ["hidden", "batch", "write"],
			hidden: true,
		},
	}),
	defineAscetAction({
		tool: "ascet_batch_write",
		action: "batch_delete_folder",
		selector: "operation",
		visibility: "hidden",
		profiles: batchProfiles,
		featureFlag: "PI_ASCET_ENABLE_BATCH_WRITE",
		parameters: batchActionSchema("batch_delete_folder", deleteFolderRequest),
		result: batchResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetBatchDeleteFolder", operation: "batch_delete_folder" },
		guidance: {
			summary: "Hidden batch delete_folder action.",
			rules: batchRules,
			fewShots: [
				{
					intent: "batch delete folders",
					args: {
						operation: "batch_delete_folder",
						intent: "apply",
						requests: [{ folderPath: "DEMO/Old", ifMissing: "fail" }],
					},
				},
			],
			tags: ["hidden", "batch", "write"],
			hidden: true,
		},
	}),
] as const;
export const ascetBatchWriteParameters = openAiObjectUnionSchema<AscetBatchWriteParams>(
	ascetBatchActionContracts.map((contract) => contract.parameters),
);
