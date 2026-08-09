import type { AscetActionInstruction } from "./types.ts";

export const ascetReadInstructions = [
	{
		id: "ascet_read.read",
		tool: "ascet_read",
		action: "read",
		profiles: ["base", "advanced-read", "write-preflight"],
		summary: "Read a live component summary for one exact Class, Module, or StateMachine target.",
		rules: [
			"Use read after ascet_get.tree resolves the exact component path.",
			"Use this action for an independent component-state check; use ascet_get.formulas for Project formula checks.",
		],
		fewShots: ['read: ascet_read({action:"read",componentPath:"DEMO\\PID"})'],
		tags: ["component", "summary", "live-read", "verify"],
	},
	{
		id: "ascet_read.read_code",
		tool: "ascet_read",
		action: "read_code",
		profiles: ["base", "advanced-read"],
		summary: "Read complete code live from ASCET for one exact resolved target.",
		rules: [
			'Use read_code only after ascet_get.tree/elements or Pi observation search resolves the target. It returns complete live text; use detailLevel="summary" only when a hash/count summary is enough.',
			"Use read_code section=header or external-c only for C module targets; for ESDL class/module method code pass methodName with section=body or all.",
			"read_code is an exact deep read, not a discovery or text-search action.",
		],
		fewShots: [
			'read_code: ascet_read({action:"read_code",componentPath:"DEMO\\PID",methodName:"calc",section:"body"})',
		],
		tags: ["code", "live-read"],
	},
	{
		id: "ascet_read.read_method_signature",
		tool: "ascet_read",
		action: "read_method_signature",
		profiles: ["base", "advanced-read", "write-preflight"],
		summary: "Verify primitive method return type and arguments for one exact method.",
		rules: ["Use read_method_signature after tree resolves the Component and before or after a signature write."],
		fewShots: [
			'read_method_signature: ascet_read({action:"read_method_signature",componentPath:"DEMO\\PID",methodName:"calc"})',
		],
		tags: ["method", "live-read", "verify"],
	},
	{
		id: "ascet_read.read_block_diagram",
		tool: "ascet_read",
		action: "read_block_diagram",
		profiles: ["advanced-read"],
		summary: "Read exact BDE/block-diagram detail for a resolved class or module when bde_edges is insufficient.",
		rules: [
			"Use ascet_get.bde_edges first for structural graph evidence; use read_block_diagram only for additional exact diagram detail.",
			"Treat an empty block-diagram payload as an empty diagram, not evidence that the component is missing.",
		],
		fewShots: [
			'read_block_diagram: ascet_read({action:"read_block_diagram",componentPath:"DEMO\\PID",detailLevel:"summary"})',
		],
		tags: ["diagram", "live-read"],
	},
	{
		id: "ascet_read.read_state_machine_flow",
		tool: "ascet_read",
		action: "read_state_machine_flow",
		profiles: ["advanced-read"],
		summary: "Read exact state-machine flow for one resolved StateMachine target.",
		rules: [
			"Use read_state_machine_flow only after tree resolves a StateMachine target; for classes/modules use read_code or read_implementation.",
		],
		fewShots: [
			'read_state_machine_flow: ascet_read({action:"read_state_machine_flow",componentPath:"DEMO\\SM",detailLevel:"summary"})',
		],
		tags: ["state-machine", "live-read"],
	},
	{
		id: "ascet_read.read_dependent_chain",
		tool: "ascet_read",
		action: "read_dependent_chain",
		profiles: ["base", "advanced-read", "write-preflight"],
		summary:
			"Read exact Local Parameter, Imported Parameter, and Exported Parameter dependency detail for one resolved chain.",
		rules: [
			"Use ascet_get.tree, elements, component_refs, and Pi grep/read to establish the bounded consumer/provider context first.",
			"Use read_dependent_chain only for precise live dependency/formula detail that is absent from Get observations; do not use it as provider discovery.",
			"If XML export is unavailable, read_dependent_chain returns partial direct-read evidence. It does not claim that the dependency expression or provider binding was verified.",
			"The formula reported by read_dependent_chain is the local dependent parameter expression. It is not an implementation conversion formula or a project formula.",
			"If an exact provider cannot be established from bounded Get evidence, report ambiguity instead of inventing a provider path.",
		],
		fewShots: [
			'read_dependent_chain: ascet_read({action:"read_dependent_chain",componentPath:"FeatureA\\Consumer",dependentElement:"C_K_Effective"})',
		],
		tags: ["dependency", "live-read"],
	},
	{
		id: "ascet_read.read_element_dependency",
		tool: "ascet_read",
		action: "read_element_dependency",
		profiles: ["base", "advanced-read", "write-preflight"],
		summary: "Read dependency flag and stored formula for one exact existing Element.",
		rules: [
			"Use read_element_dependency before set_element_dependency when the current dependency flag or formula is required.",
			"Use it after a write to verify the local dependency state; use bounded Get observations for structure and binding context.",
		],
		fewShots: [
			'read_element_dependency: ascet_read({action:"read_element_dependency",componentPath:"FeatureA\\Consumer",elementName:"C_K_Effective",targetKind:"component"})',
		],
		tags: ["dependency", "live-read", "verify"],
	},
	{
		id: "ascet_read.read_element",
		tool: "ascet_read",
		action: "read_element",
		profiles: ["base", "advanced-read", "write-preflight"],
		summary: "Read complete live metadata for one exact Element in one resolved Component.",
		rules: [
			"Use read_element after Get resolves the Component and Element name. It is the authoritative deep read for kind, model type, scope, value, calibration, ranges, and implementation metadata.",
			"Do not use read_implementation to inspect one Element. Do not use read_element for discovery across folders.",
		],
		fewShots: [
			'read_element: ascet_read({action:"read_element",componentPath:"FeatureA\\Consumer",elementName:"C_K_Effective"})',
		],
		tags: ["element", "implementation", "live-read", "verify"],
	},
	{
		id: "ascet_read.read_implementation",
		tool: "ascet_read",
		action: "read_implementation",
		profiles: ["base", "advanced-read"],
		summary: "Read implementation metadata for one resolved Component.",
		rules: [
			"Use read_implementation when exact implementation metadata matters more than the Element directory or code text.",
		],
		fewShots: [
			'read_implementation: ascet_read({action:"read_implementation",componentPath:"DEMO\\PID",implementationMode:"default"})',
		],
		tags: ["implementation", "live-read"],
	},
] as const satisfies readonly AscetActionInstruction[];
