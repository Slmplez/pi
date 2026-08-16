import { type TProperties, Type } from "typebox";
import { ascetWriteControlProperties } from "../../../edit/write-control-contract.ts";
import { ascetApplyElementSpecPlanSchema } from "../../../element-spec-contract.ts";
import { ASCET_WRITE_PROFILES } from "./profiles.ts";
import { ascetPublicErrorResultSchema } from "./shared-results.ts";
import { defineAscetAction } from "./types.ts";

function strictObject<T extends TProperties>(properties: T) {
	return Type.Object(properties, { additionalProperties: false });
}

const codeSourceSchema = {
	code: Type.Optional(Type.String()),
	codeFile: Type.Optional(Type.String()),
};
const primitiveSignatureTypeSchema = Type.Union([
	Type.Literal("cont"),
	Type.Literal("sdisc"),
	Type.Literal("udisc"),
	Type.Literal("log"),
]);
const methodSignatureArgumentSchema = strictObject({
	name: Type.String({ minLength: 1 }),
	type: primitiveSignatureTypeSchema,
	ifExists: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("keep"), Type.Literal("replace")])),
});
const componentKindSchema = Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")]);
const writeComponentKindSchema = Type.Union([
	Type.Literal("class"),
	Type.Literal("module"),
	Type.Literal("statemachine"),
	Type.Literal("enumeration"),
]);
const methodKindSchema = Type.Union([
	Type.Literal("abstract"),
	Type.Literal("process"),
	Type.Literal("action"),
	Type.Literal("condition"),
	Type.Literal("trigger"),
]);
const stateMachineOperationSchema = Type.Union([
	Type.Literal("set-method"),
	Type.Literal("set-state-entry-esdl"),
	Type.Literal("set-state-exit-esdl"),
	Type.Literal("set-state-static-esdl"),
	Type.Literal("bind-state-entry-method"),
	Type.Literal("bind-state-exit-method"),
	Type.Literal("bind-state-static-method"),
	Type.Literal("set-transition-condition-esdl"),
	Type.Literal("set-transition-action-esdl"),
	Type.Literal("bind-transition-condition-method"),
	Type.Literal("bind-transition-action-method"),
	Type.Literal("set-start-state"),
]);
const moduleCodeOperationSchema = Type.Union([
	Type.Literal("set-method"),
	Type.Literal("set-header"),
	Type.Literal("set-external-c-code"),
]);

export const ascetCreateFolderActionSchema = strictObject({
	action: Type.Literal("create_folder"),
	folderPath: Type.String({ minLength: 1 }),
	...ascetWriteControlProperties,
});
export const ascetCreateComponentActionSchema = strictObject({
	action: Type.Literal("create_component"),
	componentPath: Type.String({ minLength: 1 }),
	kind: writeComponentKindSchema,
	language: Type.Optional(Type.Union([Type.Literal("ESDL"), Type.Literal("BDE"), Type.Literal("C")])),
	ifExists: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("return-existing")])),
	rollbackOnFailure: Type.Optional(Type.Boolean()),
	...ascetWriteControlProperties,
});
export const ascetCreateMethodActionSchema = strictObject({
	action: Type.Literal("create_method"),
	componentPath: Type.String({ minLength: 1 }),
	componentKind: Type.Optional(componentKindSchema),
	methodName: Type.String({ minLength: 1 }),
	methodKind: methodKindSchema,
	diagram: Type.Optional(Type.String({ minLength: 1 })),
	ifExists: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("return-existing")])),
	...ascetWriteControlProperties,
});
export const ascetSetMethodSignatureActionSchema = strictObject({
	action: Type.Literal("set_method_signature"),
	componentPath: Type.String({ minLength: 1 }),
	methodName: Type.String({ minLength: 1 }),
	returnType: Type.Optional(primitiveSignatureTypeSchema),
	arguments: Type.Optional(Type.Array(methodSignatureArgumentSchema)),
	ifReturnExists: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("keep"), Type.Literal("replace")])),
	...ascetWriteControlProperties,
});
export const ascetDeleteComponentActionSchema = strictObject({
	action: Type.Literal("delete_component"),
	componentPath: Type.String({ minLength: 1 }),
	ifMissing: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("ignore")])),
	...ascetWriteControlProperties,
});
export const ascetDeleteMethodActionSchema = strictObject({
	action: Type.Literal("delete_method"),
	componentPath: Type.String({ minLength: 1 }),
	methodName: Type.String({ minLength: 1 }),
	ifMissing: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("ignore")])),
	...ascetWriteControlProperties,
});
export const ascetDeleteFolderActionSchema = strictObject({
	action: Type.Literal("delete_folder"),
	folderPath: Type.String({ minLength: 1 }),
	ifMissing: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("ignore")])),
	...ascetWriteControlProperties,
});
export const ascetSetMethodCodeActionSchema = strictObject({
	action: Type.Literal("set_method_code"),
	componentPath: Type.String({ minLength: 1 }),
	methodName: Type.String({ minLength: 1 }),
	...codeSourceSchema,
	...ascetWriteControlProperties,
});
export const ascetSetModuleCodeActionSchema = strictObject({
	action: Type.Literal("set_module_code"),
	modulePath: Type.String({ minLength: 1 }),
	operation: Type.Optional(moduleCodeOperationSchema),
	section: Type.Optional(moduleCodeOperationSchema),
	methodName: Type.Optional(Type.String({ minLength: 1 })),
	...codeSourceSchema,
	...ascetWriteControlProperties,
});
export const ascetSetStateMachineCodeActionSchema = strictObject({
	action: Type.Literal("set_state_machine_code"),
	stateMachinePath: Type.String({ minLength: 1 }),
	operation: stateMachineOperationSchema,
	stateName: Type.Optional(Type.String()),
	sourceState: Type.Optional(Type.String()),
	targetState: Type.Optional(Type.String()),
	priority: Type.Optional(Type.Number()),
	methodName: Type.Optional(Type.String({ minLength: 1 })),
	...codeSourceSchema,
	...ascetWriteControlProperties,
});
export const ascetSetEnumeratorsActionSchema = strictObject({
	action: Type.Literal("set_enumerators"),
	componentPath: Type.String({ minLength: 1 }),
	enumerators: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
	...ascetWriteControlProperties,
});
export const ascetApplyProjectFormulaActionSchema = strictObject({
	action: Type.Literal("apply_project_formula"),
	projectPath: Type.String({ minLength: 1 }),
	specFile: Type.String({ minLength: 1 }),
	mode: Type.Optional(Type.Literal("restore")),
	deleteMissing: Type.Optional(Type.Boolean()),
	...ascetWriteControlProperties,
});
export const ascetSetElementDependencyInternalSchema = strictObject({
	action: Type.Literal("set_element_dependency"),
	targetPath: Type.Optional(Type.String({ minLength: 1 })),
	componentPath: Type.Optional(Type.String({ minLength: 1 })),
	elementName: Type.String({ minLength: 1 }),
	dependency: Type.Union([Type.Literal("dependent"), Type.Literal("independent")]),
	dependencyFormula: Type.Optional(Type.String({ minLength: 1 })),
	dependencyFormals: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1, uniqueItems: true })),
	bindingPolicy: Type.Optional(Type.Union([Type.Literal("explicit"), Type.Literal("autoExactName")])),
	dependencyMappings: Type.Optional(
		Type.Record(
			Type.String({ minLength: 1 }),
			Type.Union([
				Type.String({ minLength: 1 }),
				strictObject({
					kind: Type.Union([Type.Literal("parameter"), Type.Literal("constant"), Type.Literal("systemConstant")]),
					name: Type.String({ minLength: 1 }),
				}),
			]),
		),
	),
	variantMappings: Type.Optional(
		Type.Record(
			Type.String({ minLength: 1 }),
			Type.Record(
				Type.String({ minLength: 1 }),
				Type.Union([
					Type.String({ minLength: 1 }),
					strictObject({
						kind: Type.Union([
							Type.Literal("parameter"),
							Type.Literal("constant"),
							Type.Literal("systemConstant"),
						]),
						name: Type.String({ minLength: 1 }),
					}),
				]),
			),
		),
	),
	variantPolicy: Type.Optional(Type.Union([Type.Literal("default"), Type.Literal("selected"), Type.Literal("all")])),
	variants: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1, uniqueItems: true })),
	valueRestoration: Type.Optional(
		strictObject({
			policy: Type.Union([Type.Literal("fromSnapshot"), Type.Literal("explicit"), Type.Literal("ascetDefault")]),
			valuesByVariant: Type.Optional(
				Type.Record(Type.String({ minLength: 1 }), Type.Union([Type.String(), Type.Number(), Type.Boolean()])),
			),
		}),
	),
	clearDependencyFormula: Type.Optional(Type.Boolean()),
	targetKind: Type.Optional(Type.Union([Type.Literal("auto"), Type.Literal("component"), Type.Literal("folder")])),
	match: Type.Optional(Type.Union([Type.Literal("exact"), Type.Literal("all")])),
	...ascetWriteControlProperties,
});

export const ascetPublicMutationActionSchemas = [
	ascetCreateFolderActionSchema,
	ascetCreateComponentActionSchema,
	ascetCreateMethodActionSchema,
	ascetSetMethodSignatureActionSchema,
	ascetDeleteComponentActionSchema,
	ascetDeleteMethodActionSchema,
	ascetDeleteFolderActionSchema,
	ascetSetMethodCodeActionSchema,
	ascetSetModuleCodeActionSchema,
	ascetSetStateMachineCodeActionSchema,
	ascetSetEnumeratorsActionSchema,
	ascetApplyElementSpecPlanSchema,
	ascetApplyProjectFormulaActionSchema,
] as const;

export const ascetMutationActionSchemas = [
	...ascetPublicMutationActionSchemas,
	ascetSetElementDependencyInternalSchema,
] as const;

export const ascetEditabilityActionSchemas = [
	Type.Object(
		{
			mode: Type.Literal("check"),
			componentPath: Type.String({ minLength: 1, description: "ASCET component path." }),
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			mode: Type.Literal("set"),
			componentPath: Type.String({ minLength: 1, description: "ASCET component path." }),
			intent: Type.Union([Type.Literal("preview"), Type.Literal("apply")]),
		},
		{ additionalProperties: false },
	),
] as const;

const writeResultSchema = Type.Union([Type.Object({}, { additionalProperties: true }), ascetPublicErrorResultSchema]);
const COMPONENT_EDIT_PROFILES = ["component-edit"] as const;
const writePreflightRules = [
	"By default this tool returns a non-error preflight outcome and does not write.",
	"Use intent=apply when the user explicitly asked for the exact write; runtime permission handling performs any required confirmation in the same call. Use intent=preview only for a non-mutating preview.",
	"Preflight and dry-run remain available when a Component is not editable.",
	"Runtime performs a fresh same-session editable=true check immediately before each real mutation.",
	"Do not call mode=check merely to authorize a write, and never call mode=set without explicit user intent.",
	"Executed writes always perform mandatory action-specific readback verification.",
	"Do not request or disable verification through ascet_edit parameters.",
] as const;
const methodEditRules = [
	"Before create_method, determine the target component kind.",
	"Class methods must use methodKind=abstract; module methods use process; state-machine methods use action, condition, or trigger.",
] as const;
const codeEditRules = [
	"Write code through the matching surface: set_method_code, set_module_code, or set_state_machine_code.",
	"Use codeFile for larger text payloads.",
] as const;
const elementSpecRules = [
	"For model-facing apply_element_spec calls, use inline elements; specFile is internal and must not be supplied by the agent.",
	"Start from the element's code role and explicit requirements: determine whether it is a parameter, variable, array, state, or enumeration, how the code reads or writes it, its domain, lifecycle, and initialization intent. That semantic intent drives the target spec; do not let a similarly named element or a read result replace the code-level meaning.",
	"For new elements, use ascet_search when the exact target is not known, then validate existing candidates with ascet_read.read_element. Use ascet_read.read_code for complete code and ascet_read.read_dependent_chain when dependency context matters. Treat live reads as ASCET compatibility and preservation evidence, not as the semantic source. For existing elements, preserve unchanged live fields and emit only the requested patch; do not copy a sibling's values without semantic equivalence.",
	"Do not guess modelType, scope, range, implementation type, formula, calibration, or dependency.",
	"For Provider Exported Parameter creation, explicitly provide unit, comment, calibration, range, data, and implementation decision groups. Use range.mode=none|physical|implementation, data.mode=explicit|ascetDefault, and implementation.mode=explicit|ascetDefault; omission is invalid and the agent must not guess values.",
	"For Local Dependent Parameter creation, explicitly provide unit, comment, calibration, range, and implementation decision groups. Local dependent data is forbidden because the value comes from Dependency binding. Imported Parameters are the exception and carry structural compatibility metadata only; do not invent local data, implementation, range, or calibration.",
	"For explicit implementations, provide valueType, memoryLocation, formula, and limitAssignments. Use an empty formula only to explicitly select no conversion formula, and use limitAssignments=null when the option is not applicable. Ranged discrete Parameters require limitAssignments=true.",
	"For a new enumeration, include enumerationPath and scalar data.value; do not add physicalRange. Existing-element patches may omit unchanged fields.",
	"If any required create field is unknown, stop at preflight and resolve exact live metadata with ascet_read.read_element or ask for the value.",
	"For an existing local dependent Parameter, omit data.value: its DataVariant stores the Dependency binding, not a ScalarType value. apply_element_spec rejects data.value for this state.",
	"Dependency is not part of apply_element_spec JSON; use create_dependent_chain to create or verify the complete Provider/Imported/Local chain.",
] as const;

export const ascetEditActionContracts = [
	defineAscetAction({
		tool: "ascet_edit",
		action: "create_folder",
		selector: "action",
		visibility: "public",
		profiles: ASCET_WRITE_PROFILES,
		parameters: ascetCreateFolderActionSchema,
		result: writeResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetCreateFolder", operation: "create_folder" },
		guidance: {
			summary: "Create one ASCET folder with guarded preflight/readback behavior.",
			rules: writePreflightRules,
			fewShots: [
				{
					intent: "apply folder creation",
					args: { action: "create_folder", folderPath: "DEMO/New", intent: "apply" },
				},
			],
			tags: ["write", "folder", "preflight"],
		},
	}),
	defineAscetAction({
		tool: "ascet_edit",
		action: "create_component",
		selector: "action",
		visibility: "public",
		profiles: ASCET_WRITE_PROFILES,
		parameters: ascetCreateComponentActionSchema,
		result: writeResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetCreateComponent", operation: "create_component" },
		guidance: {
			summary: "Create one component target with kind-specific defaults and readback.",
			rules: [
				...writePreflightRules,
				"After create_component, inspect expectedDefaultScaffold.defaultEntryMethod as an unverified hint for the likely initial method.",
				"For class and module targets, omitted language defaults to ESDL.",
			],
			fewShots: [
				{
					intent: "preflight component",
					args: {
						action: "create_component",
						intent: "apply",
						componentPath: "DEMO/C",
						kind: "class",
						language: "ESDL",
					},
				},
			],
			tags: ["write", "component", "preflight"],
		},
	}),
	defineAscetAction({
		tool: "ascet_edit",
		action: "create_method",
		selector: "action",
		visibility: "public",
		profiles: ASCET_WRITE_PROFILES,
		parameters: ascetCreateMethodActionSchema,
		result: writeResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetCreateMethod", operation: "create_method" },
		guidance: {
			summary: "Create one method/process/action shell compatible with the component kind.",
			rules: [...writePreflightRules, ...methodEditRules],
			fewShots: [
				{
					intent: "preflight method",
					args: {
						action: "create_method",
						intent: "apply",
						componentPath: "DEMO/PID",
						componentKind: "class",
						methodName: "calc2",
						methodKind: "abstract",
					},
				},
			],
			tags: ["write", "method", "preflight"],
		},
	}),
	defineAscetAction({
		tool: "ascet_edit",
		action: "set_method_signature",
		selector: "action",
		visibility: "public",
		profiles: ASCET_WRITE_PROFILES,
		parameters: ascetSetMethodSignatureActionSchema,
		result: writeResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetSetMethodSignature", operation: "set_method_signature" },
		guidance: {
			summary: "Patch a method signature before writing code that depends on return values or arguments.",
			rules: [
				...writePreflightRules,
				"Use set_method_signature after create_method and before method body writes when code returns a value or reads method arguments.",
				"Do not use apply_element_spec for method return or argument declarations.",
			],
			fewShots: [
				{
					intent: "patch signature",
					args: {
						action: "set_method_signature",
						intent: "apply",
						componentPath: "DEMO/PID",
						methodName: "calc",
						returnType: "cont",
						arguments: [{ name: "u", type: "cont", ifExists: "replace" }],
					},
				},
			],
			tags: ["write", "method", "signature"],
		},
	}),
	defineAscetAction({
		tool: "ascet_edit",
		action: "delete_component",
		selector: "action",
		visibility: "public",
		profiles: ASCET_WRITE_PROFILES,
		parameters: ascetDeleteComponentActionSchema,
		result: writeResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetDeleteComponent", operation: "delete_component" },
		guidance: {
			summary: "Delete one component through guarded write flow.",
			rules: writePreflightRules,
			fewShots: [
				{
					intent: "delete component",
					args: { action: "delete_component", intent: "apply", componentPath: "DEMO/Old", ifMissing: "fail" },
				},
			],
			tags: ["write", "component", "delete"],
		},
	}),
	defineAscetAction({
		tool: "ascet_edit",
		action: "delete_method",
		selector: "action",
		visibility: "public",
		profiles: ASCET_WRITE_PROFILES,
		parameters: ascetDeleteMethodActionSchema,
		result: writeResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetDeleteMethod", operation: "delete_method" },
		guidance: {
			summary: "Delete one method through guarded write flow.",
			rules: writePreflightRules,
			fewShots: [
				{
					intent: "delete method",
					args: {
						action: "delete_method",
						intent: "apply",
						componentPath: "DEMO/PID",
						methodName: "old",
						ifMissing: "fail",
					},
				},
			],
			tags: ["write", "method", "delete"],
		},
	}),
	defineAscetAction({
		tool: "ascet_edit",
		action: "delete_folder",
		selector: "action",
		visibility: "public",
		profiles: ASCET_WRITE_PROFILES,
		parameters: ascetDeleteFolderActionSchema,
		result: writeResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetDeleteFolder", operation: "delete_folder" },
		guidance: {
			summary: "Delete one folder through guarded write flow.",
			rules: writePreflightRules,
			fewShots: [
				{
					intent: "delete folder",
					args: { action: "delete_folder", intent: "apply", folderPath: "DEMO/Old", ifMissing: "fail" },
				},
			],
			tags: ["write", "folder", "delete"],
		},
	}),
	defineAscetAction({
		tool: "ascet_edit",
		action: "set_method_code",
		selector: "action",
		visibility: "public",
		profiles: ASCET_WRITE_PROFILES,
		parameters: ascetSetMethodCodeActionSchema,
		result: writeResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetSetMethodCode", operation: "set_method_code" },
		guidance: {
			aliases: ["write method code", "set method body", "update method code", "modify code"],
			nextActions: ["ascet_read.read_code"],
			result: { shape: "writePreflightOrResult", fields: ["status", "changed", "verification", "observations"] },
			summary: "Set one class/module method body.",
			rules: [...writePreflightRules, ...codeEditRules],
			fewShots: [
				{
					intent: "set method body",
					args: {
						action: "set_method_code",
						intent: "apply",
						componentPath: "DEMO/PID",
						methodName: "calc",
						codeFile: "calc.esdl",
					},
				},
			],
			tags: ["write", "code", "method"],
		},
	}),
	defineAscetAction({
		tool: "ascet_edit",
		action: "set_module_code",
		selector: "action",
		visibility: "public",
		profiles: ASCET_WRITE_PROFILES,
		parameters: ascetSetModuleCodeActionSchema,
		result: writeResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetSetModuleCode", operation: "set_module_code" },
		guidance: {
			summary: "Set module method, header, or external C code surfaces.",
			rules: [
				...writePreflightRules,
				...codeEditRules,
				"Provide operation as set-method, set-header, or set-external-c-code.",
			],
			fewShots: [
				{
					variant: "set-method",
					intent: "set module method",
					args: {
						action: "set_module_code",
						intent: "apply",
						modulePath: "DEMO/M",
						operation: "set-method",
						methodName: "calc",
						codeFile: "calc.c",
					},
				},
				{
					variant: "set-header",
					intent: "set module header",
					args: {
						action: "set_module_code",
						intent: "apply",
						modulePath: "DEMO/M",
						operation: "set-header",
						codeFile: "header.c",
					},
				},
				{
					variant: "set-external-c-code",
					intent: "set external C",
					args: {
						action: "set_module_code",
						intent: "apply",
						modulePath: "DEMO/M",
						operation: "set-external-c-code",
						codeFile: "ext.c",
					},
				},
			],
			tags: ["write", "code", "module"],
		},
	}),
	defineAscetAction({
		tool: "ascet_edit",
		action: "set_state_machine_code",
		selector: "action",
		visibility: "public",
		profiles: ASCET_WRITE_PROFILES,
		parameters: ascetSetStateMachineCodeActionSchema,
		result: writeResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetSetStateMachineCode", operation: "set_state_machine_code" },
		guidance: {
			summary: "Set state-machine method, state, transition, binding, or start-state code.",
			rules: [
				...writePreflightRules,
				...codeEditRules,
				"Use the exact state-machine operation variant required by the target.",
			],
			fewShots: [
				{
					variant: "set-method",
					intent: "set SM method",
					args: {
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "D/SM",
						operation: "set-method",
						methodName: "tick",
						codeFile: "tick.esdl",
					},
				},
				{
					variant: "set-state-entry-esdl",
					intent: "set entry ESDL",
					args: {
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "D/SM",
						operation: "set-state-entry-esdl",
						stateName: "Idle",
						codeFile: "entry.esdl",
					},
				},
				{
					variant: "set-state-exit-esdl",
					intent: "set exit ESDL",
					args: {
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "D/SM",
						operation: "set-state-exit-esdl",
						stateName: "Idle",
						codeFile: "exit.esdl",
					},
				},
				{
					variant: "set-state-static-esdl",
					intent: "set static ESDL",
					args: {
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "D/SM",
						operation: "set-state-static-esdl",
						stateName: "Idle",
						codeFile: "static.esdl",
					},
				},
				{
					variant: "bind-state-entry-method",
					intent: "bind entry",
					args: {
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "D/SM",
						operation: "bind-state-entry-method",
						stateName: "Idle",
						methodName: "onEntry",
					},
				},
				{
					variant: "bind-state-exit-method",
					intent: "bind exit",
					args: {
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "D/SM",
						operation: "bind-state-exit-method",
						stateName: "Idle",
						methodName: "onExit",
					},
				},
				{
					variant: "bind-state-static-method",
					intent: "bind static",
					args: {
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "D/SM",
						operation: "bind-state-static-method",
						stateName: "Idle",
						methodName: "during",
					},
				},
				{
					variant: "set-transition-condition-esdl",
					intent: "set transition condition",
					args: {
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "S",
						operation: "set-transition-condition-esdl",
						sourceState: "A",
						targetState: "B",
						codeFile: "c",
					},
				},
				{
					variant: "set-transition-action-esdl",
					intent: "set transition action",
					args: {
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "S",
						operation: "set-transition-action-esdl",
						sourceState: "A",
						targetState: "B",
						codeFile: "a",
					},
				},
				{
					variant: "bind-transition-condition-method",
					intent: "bind transition cond",
					args: {
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "S",
						operation: "bind-transition-condition-method",
						sourceState: "A",
						targetState: "B",
						methodName: "c",
					},
				},
				{
					variant: "bind-transition-action-method",
					intent: "bind transition action",
					args: {
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "S",
						operation: "bind-transition-action-method",
						sourceState: "A",
						targetState: "B",
						methodName: "onRun",
					},
				},
				{
					variant: "set-start-state",
					intent: "set start state",
					args: {
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "D/SM",
						operation: "set-start-state",
						stateName: "Idle",
					},
				},
			],
			tags: ["write", "code", "state-machine"],
		},
	}),
	defineAscetAction({
		tool: "ascet_edit",
		action: "set_enumerators",
		selector: "action",
		visibility: "public",
		profiles: ASCET_WRITE_PROFILES,
		supportedObjectKinds: ["enumeration"],
		parameters: ascetSetEnumeratorsActionSchema,
		result: writeResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetSetEnumerators", operation: "set_enumerators" },
		guidance: {
			summary: "Set enumeration values for an ASCET enumeration component.",
			rules: writePreflightRules,
			fewShots: [
				{
					intent: "set enum values",
					args: {
						action: "set_enumerators",
						intent: "apply",
						componentPath: "D/E",
						enumerators: ["E_OFF", "E_ON"],
					},
				},
			],
			tags: ["write", "enumeration"],
		},
	}),
	defineAscetAction({
		tool: "ascet_edit",
		action: "apply_element_spec",
		selector: "action",
		visibility: "public",
		profiles: ASCET_WRITE_PROFILES,
		supportedObjectKinds: ["class", "module", "statemachine"],
		parameters: ascetApplyElementSpecPlanSchema,
		result: writeResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetApplyElementSpec", operation: "apply_element_spec" },
		guidance: {
			summary: "Apply structured primitive element specs from evidence, not guesses.",
			rules: [...writePreflightRules, ...elementSpecRules],
			fewShots: [
				{
					intent: "plan element creation",
					args: {
						action: "apply_element_spec",
						componentPath: "F/C",
						intent: "apply",
						elementIntent: "create",
						elements: [
							{
								role: "providerExportedParameter",
								name: "P",
								modelType: "cont",
								unit: "",
								comment: "Provider output",
								calibration: false,
								range: { mode: "none" },
								data: { mode: "ascetDefault" },
								implementation: { mode: "ascetDefault" },
							},
						],
					},
				},
			],
			tags: ["write", "element"],
		},
	}),
	defineAscetAction({
		tool: "ascet_edit",
		action: "apply_project_formula",
		selector: "action",
		visibility: "public",
		profiles: ASCET_WRITE_PROFILES,
		parameters: ascetApplyProjectFormulaActionSchema,
		result: writeResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetApplyProjectFormula", operation: "apply_project_formula" },
		guidance: {
			summary: "Apply structured project formula specs through guarded write flow.",
			rules: [
				...writePreflightRules,
				"Use apply_project_formula only for Project targets and formula-spec JSON artifacts.",
			],
			fewShots: [
				{
					intent: "apply formulas",
					args: {
						action: "apply_project_formula",
						intent: "apply",
						projectPath: "D/P",
						specFile: "formula.json",
						mode: "restore",
					},
				},
			],
			tags: ["write", "project", "formula"],
		},
	}),
	defineAscetAction({
		tool: "ascet_edit",
		action: "check",
		selector: "mode",
		visibility: "public",
		profiles: COMPONENT_EDIT_PROFILES,
		parameters: ascetEditabilityActionSchemas[0],
		result: writeResultSchema,
		execution: {
			kind: "bridge",
			logicalCommandId: "AscetComponentEditableCheck",
			operation: "component_editable_check",
		},
		guidance: {
			summary: "Check whether a source-controlled ASCET component is editable.",
			rules: [
				"Use mode=check only to inspect current SCM state; write authorization is enforced independently by a fresh runtime same-session check.",
			],
			fewShots: [{ intent: "check editable", args: { mode: "check", componentPath: "DEMO/PID" } }],
			tags: ["write", "scm", "preflight"],
		},
	}),
	defineAscetAction({
		tool: "ascet_edit",
		action: "set",
		selector: "mode",
		visibility: "public",
		profiles: COMPONENT_EDIT_PROFILES,
		parameters: ascetEditabilityActionSchemas[1],
		result: writeResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetComponentEditableSet", operation: "component_editable_set" },
		guidance: {
			summary: "Request an ASCET SCM lock through guarded write flow.",
			rules: [
				"Use mode=set only when the user intends to make the component editable.",
				"Use intent=apply when the user explicitly asks to request editability; use intent=preview to inspect the current state without writing.",
			],
			fewShots: [{ intent: "lock component", args: { mode: "set", componentPath: "DEMO/PID", intent: "apply" } }],
			tags: ["write", "scm"],
		},
	}),
] as const;
