import { buildToolPromptGuidelines } from "../instructions/registry.ts";

export const ascetReadPrompt = {
	promptSnippet: "Use ascet_read after resolving the ASCET component path.",
	promptGuidelines: buildToolPromptGuidelines({
		tool: "ascet_read",
		extraGuidelines: [
			"Use read_method_signature to verify a method's primitive return type and arguments after create_method or set_method_signature.",
			'Use read_code when the user explicitly needs live code; it returns complete live text by default. Use detailLevel="summary" only when a hash/count summary is enough.',
			"Use read_dependent_chain to inspect the dependency flag, dependency formula, formula references, imported-parameter mappings, and exported-provider chain for a local dependent parameter.",
			"read_dependent_chain trusts live dependency mappings and explicit export owners first, then uses the warm element_decls index as a bounded fallback and returns full provider element data from the live element catalog when available.",
			"Use read_project_formulas for Project formula readback after resolving projectPath with ascet_search.search_projects.",
			"Use read_dependent_chain before set_element_dependency when you need to know the current provider chain.",
			"When search_elements supports scope filtering, constrain provider searches to scope=Exported. If not, post-filter results and keep only elements whose scope is Exported.",
			"Common exported parameter providers are feature-scoped parameter classes such as _Calibration ... parameter, _Constant ... parameter, Calibration ... Parameter, Constant ... Parameter, or other feature-specific ... parameter classes.",
			"Imported Parameters are binding bridge elements and normally keep default/generated implementation. The authoritative metadata source is the same-named Exported Parameter.",
			"Use read_dependent_chain as evidence when designing an analogous Local Parameter -> Imported Parameter -> Exported Parameter chain.",
		],
	}),
} as const;
