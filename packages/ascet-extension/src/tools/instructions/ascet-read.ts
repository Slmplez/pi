import type { AscetActionInstruction } from "./types.ts";

export const ascetReadInstructions = [
	{
		id: "ascet_read.read_code",
		tool: "ascet_read",
		action: "read_code",
		profiles: ["base", "advanced-read"],
		summary: "Read complete code live from ASCET only after resolving the target.",
		rules: [
			'Use read_code when the user explicitly needs live code; it returns complete live text by default. Use detailLevel="summary" only when a hash/count summary is enough.',
			"Use read_code section=header or external-c only for C module targets; for ESDL class/module method code pass methodName with section=body or all.",
			"read_code is a live ToolAPI read, not a search-index text lookup.",
		],
		fewShots: [
			'read_code: ascet_read({action:"read_code",componentPath:"DEMO/PID",methodName:"calc",section:"body"})',
		],
		tags: ["code", "live-read"],
	},
	{
		id: "ascet_read.read_method_signature",
		tool: "ascet_read",
		action: "read_method_signature",
		profiles: ["base", "advanced-read", "write-preflight"],
		summary: "Verify primitive method return type and arguments.",
		rules: [
			"Use read_method_signature to verify a method's primitive return type and arguments after create_method or set_method_signature.",
		],
		fewShots: [
			'read_method_signature: ascet_read({action:"read_method_signature",componentPath:"DEMO/PID",methodName:"calc"})',
		],
		tags: ["method", "live-read", "verify"],
	},
	{
		id: "ascet_read.read_block_diagram",
		tool: "ascet_read",
		action: "read_block_diagram",
		profiles: ["advanced-read"],
		summary: "Read a BDE/block-diagram surface for resolved class or module targets.",
		rules: [
			"Use read_block_diagram only for resolved class/module targets with a BDE/block-diagram surface; for ESDL text components prefer read_code or read_implementation.",
			"Treat an empty block-diagram payload as an empty diagram, not evidence that the component is missing.",
			"read_block_diagram accepts timeoutMs in milliseconds and defaults to 60000.",
		],
		fewShots: [
			'read_block_diagram: ascet_read({action:"read_block_diagram",componentPath:"DEMO/PID",detailLevel:"summary"})',
		],
		tags: ["diagram", "live-read"],
	},
	{
		id: "ascet_read.read_project_formulas",
		tool: "ascet_read",
		action: "read_project_formulas",
		profiles: ["base", "advanced-read", "write-preflight"],
		summary: "Read project formulas live from ASCET for one resolved Project target.",
		rules: [
			"Use search_projects first when projectPath is unknown.",
			"Use read_project_formulas only for Project targets; it is not element dependency formula readback.",
		],
		fewShots: ['read_project_formulas: ascet_read({action:"read_project_formulas",projectPath:"DEMO/Project"})'],
		tags: ["project", "formula", "live-read"],
	},
	{
		id: "ascet_read.read_state_machine_flow",
		tool: "ascet_read",
		action: "read_state_machine_flow",
		profiles: ["advanced-read"],
		summary: "Read state-machine flow only for resolved StateMachine targets.",
		rules: [
			"Use read_state_machine_flow only for resolved StateMachine targets; for classes/modules use read_code or read_implementation.",
		],
		fewShots: [
			'read_state_machine_flow: ascet_read({action:"read_state_machine_flow",componentPath:"DEMO/SM",detailLevel:"summary"})',
		],
		tags: ["state-machine", "live-read"],
	},
	{
		id: "ascet_read.read_dependent_chain",
		tool: "ascet_read",
		action: "read_dependent_chain",
		profiles: ["base", "advanced-read", "write-preflight"],
		summary: "Analyze Local Parameter -> Imported Parameter -> Exported Parameter dependency chains.",
		rules: [
			"Use read_dependent_chain when the user asks which exported or global parameter a local dependent parameter depends on.",
			"Use read_dependent_chain to analyze a Local Parameter -> Imported Parameter -> Exported Parameter chain.",
			"read_dependent_chain is live-mapping-first: it trusts the live dependency formula/mapping and explicit export owner, then uses element_decls as a bounded fallback and returns full live element metadata for the exported provider.",
			"The formula reported by read_dependent_chain is the local dependent parameter expression. It is not an implementation conversion formula and is not a project formula.",
			"Dependent parameter provider discovery starts with read_dependent_chain using componentPath/dependentElement and a bounded providerScopePath when known; if provider discovery is incomplete or ambiguous, coordinate ascet_search and ascet_explore before concluding.",
			"The Imported Parameter in the consuming component and the Exported Parameter in the provider component must have the same name. Search provider candidates by the Imported Parameter name, not by the Local Dependent Parameter name unless they are identical.",
			"Only scope=Exported elements are valid provider candidates. Local or Imported same-name elements may be diagnostic clues, but they are not exported-provider evidence.",
			"If read_dependent_chain reports export_not_found, export_ambiguous, provider_candidate_limit_exceeded, or complete=false, treat that as evidence requiring scoped recursive provider discovery.",
			"After selecting a provider candidate, call read_dependent_chain again with exporterComponentPath as a verification constraint. Do not treat search_elements alone as complete dependency-chain proof.",
			"Do not require the user to know exporterComponentPath. Prefer calling read_dependent_chain with componentPath and dependentElement only, and let the tool discover the imported parameter, exported parameter, and provider component.",
			"If exporterComponentPath is known, pass it only as a verification constraint.",
			"If the user provides a provider scope, feature scope, or search scope, pass it as providerScopePath to constrain exported parameter/provider discovery.",
			"When read_dependent_chain returns complete=false and issues[], treat them as diagnostic evidence. Do not invent missing provider paths, exported parameters, or default parameter values.",
		],
		fewShots: [
			'read_dependent_chain: ascet_read({action:"read_dependent_chain",componentPath:"FeatureA/Consumer",dependentElement:"C_K_Effective"})',
		],
		tags: ["dependency", "provider-discovery", "live-read"],
	},
	{
		id: "ascet_read.read_element_dependency",
		tool: "ascet_read",
		action: "read_element_dependency",
		profiles: ["base", "advanced-read", "write-preflight"],
		summary: "Read dependency flag and formula for one existing element.",
		rules: [
			"Use read_element_dependency when the user asks for the current dependency flag, stored formula, or supported write plan for one element without provider discovery.",
			"Use read_element_dependency before set_element_dependency when you need the current dependency flag or formula for the target element.",
			"Use read_element_dependency after set_element_dependency to verify the local dependency flag and formula; use read_dependent_chain when provider-chain consistency also matters.",
		],
		fewShots: [
			'read_element_dependency: ascet_read({action:"read_element_dependency",componentPath:"FeatureA/Consumer",elementName:"C_K_Effective",targetKind:"component"})',
		],
		tags: ["dependency", "live-read", "verify"],
	},
	{
		id: "ascet_read.read_implementation",
		tool: "ascet_read",
		action: "read_implementation",
		profiles: ["base", "advanced-read"],
		summary: "Read implementation metadata for a resolved component.",
		rules: ["Use read_implementation when implementation metadata matters more than code text."],
		fewShots: [
			'read_implementation: ascet_read({action:"read_implementation",componentPath:"DEMO/PID",implementationMode:"default"})',
		],
		tags: ["implementation", "live-read"],
	},
] as const satisfies readonly AscetActionInstruction[];
