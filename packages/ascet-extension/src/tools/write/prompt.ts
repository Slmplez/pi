import { compactExamplesForTool } from "../_shared/action-examples.ts";

export const ascetWritePrompt = {
	promptSnippet: "Prepare or confirm one ASCET write action such as create, delete, set code, or apply spec.",
	promptGuidelines: [
		"By default this tool returns a non-error preflight outcome and does not write.",
		"Set executeWrite=true only when the user explicitly asks to apply the write; PI still requires confirmation.",
		"After create_component, inspect expectedDefaultScaffold.defaultEntryMethod as an unverified hint for the likely initial method.",
		"Before create_method, determine the target component kind. In v1, methodKind is constrained by component kind: class supports only abstract; module supports only process; statemachine supports only action, condition, or trigger.",
		"When methodKind is omitted for create_method, componentKind=class defaults to abstract and componentKind=module defaults to process. For statemachine targets, choose action, condition, or trigger explicitly.",
		"Do not create class methods with methodKind=process/action/condition/trigger. For ESDL Class components, create abstract first, then use set_method_signature for return/arguments and set_method_code for the body. Do not claim the method is concrete unless readback proves MethodKind changed.",
		"When component kind is unknown, inspect the target before executeWrite=true. A preflight result without component kind is not proof that the requested methodKind can be applied.",
		"For method bodies on Class or Module components, use set_method_code. Use set_module_code only for module text-code surfaces such as set-method, set-header, or set-external-c-code. Use set_state_machine_code for state-machine triggers, state bodies, transition bodies, bindings, and start-state changes.",
		"Use set_method_signature after create_method and before method body writes when the method body returns a value or reads method arguments; do not use apply_element_spec for method return or argument declarations.",
		"Use set_method_signature.arguments for primitive method inputs such as p_CmpF_MC1 before writing ESDL code that references them, and verify readback. If set_method_signature reports unsupported_method_kind, stop and report that the current method cannot accept primitive signature edits through this path.",
		'For apply_element_spec, specFile JSON is {"elements":[{"name":"Speed","kind":"variable","modelType":"cont","scope":"exported","physicalRange":{"min":0,"max":8000},"unit":"rpm","calibration":true,"data":{"value":0},"impl":{"valueType":"uint16","implementationRange":{"min":0,"max":8000},"formula":"ident","limitAssignments":true}}]}; primitive elements require modelType and scope; primitive fields include calibration, physicalRange, data.value, and impl valueType/implementationRange/formula/limitAssignments.',
		"For apply_element_spec, never use legacy top-level min/max or impl.min/impl.max; use physicalRange and impl.implementationRange only.",
		"For apply_element_spec, mode=restore updates/restores the supplied spec but does not remove missing elements unless deleteMissing=true is set.",
		"For apply_element_spec, do not set impl.limitAssignments on parameter elements unless a capability/readback check proves the target supports it.",
		"Dependency is not part of apply_element_spec JSON; use plan_element_dependency then set_element_dependency for dependent/independent changes.",
		"Calibration is an apply_element_spec primitive field; use boolean calibration only for variable, parameter, array, enumeration, and table elements, and verify readback before claiming it.",
		"For apply_project_formula, linear formulas may read back normalized as offset + factor * phys; compare the semantic factor/offset, not the raw input string.",
		"For set_module_code, provide section/operation as one of set-method, set-header, or set-external-c-code.",
		"For set_state_machine_code, use one of: set-method, set-state-entry-esdl, set-state-exit-esdl, set-state-static-esdl, bind-state-entry-method, bind-state-exit-method, bind-state-static-method, set-transition-condition-esdl, set-transition-action-esdl, bind-transition-condition-method, bind-transition-action-method, set-start-state.",
		'Use set_element_dependency only after plan_element_dependency when the target scope is broad or uncertain; folder writes require match="all".',
		"Use verifyReadback=true unless the user explicitly asks to skip readback.",
		...compactExamplesForTool("ascet_write"),
	],
} as const;
