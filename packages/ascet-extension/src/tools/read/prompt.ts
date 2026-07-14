import { compactExamplesForTool } from "../_shared/action-examples.ts";

export const ascetReadPrompt = {
	promptSnippet: "Use ascet_read after resolving the ASCET component path.",
	promptGuidelines: [
		"Use read for lean summaries, or read with methodName for one method body.",
		"Use read_method_signature to verify a method's primitive return type and arguments after create_method or set_method_signature.",
		"Use read_code when the user explicitly needs code text; this maps to logical AscetReadCode.",
		"Use read_block_diagram only for resolved class/module targets with a BDE/block-diagram surface; for ESDL text components prefer read_code or read_implementation.",
		"Treat an empty block-diagram payload as an empty diagram, not evidence that the component is missing.",
		"Use read_state_machine_flow only for resolved StateMachine targets; for classes/modules use read, read_code, or read_implementation.",
		"Use read_code section=header or external-c only for C module targets; for ESDL class/module method code pass methodName with section=body or all.",
		"read_block_diagram accepts timeoutMs in milliseconds and defaults to 60000.",
		"Use read_import_export_match for one imported element's exported counterpart between importer/exporter components.",
		"Use read_import_export_matches to inspect all imported elements between an importer and exporter component.",
		"Use plan_element_dependency before dependency writes when the target scope is broad or uncertain.",
		...compactExamplesForTool("ascet_read"),
	],
} as const;
