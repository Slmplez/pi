export const ascetWritePrompt = {
	promptSnippet: "Prepare or confirm one ASCET write action such as create, delete, set code, or apply spec.",
	promptGuidelines: [
		"By default this tool returns a non-error preflight outcome and does not write.",
		"Set executeWrite=true only when the user explicitly asks to apply the write; PI still requires confirmation.",
		"After create_component, inspect expectedDefaultScaffold.defaultEntryMethod as an unverified hint for the likely initial method.",
		"For set_module_code, provide section/operation as one of set-method, set-header, or set-external-c-code.",
		"For set_state_machine_code, use one of: set-method, set-state-entry-esdl, set-state-exit-esdl, set-state-static-esdl, bind-state-entry-method, bind-state-exit-method, bind-state-static-method, set-transition-condition-esdl, set-transition-action-esdl, bind-transition-condition-method, bind-transition-action-method, set-start-state.",
		"Use verifyReadback=true unless the user explicitly asks to skip readback.",
	],
} as const;
