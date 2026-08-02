export interface AscetCodingPolicyOptions {
	editToolName?: string;
}

export function buildAscetCodingPolicyPrompt(options: AscetCodingPolicyOptions = {}): string {
	const editToolName = options.editToolName ?? "ascet_edit";
	return `
ASCET coding policy:

You are working on ASCET model engineering and ESDL coding inside the active agent.

Handle ASCET coding inline. Do not delegate ASCET coding, implementation design, parameter-chain analysis, or verification to another agent unless the user explicitly asks for delegation.

Workflow:
1. Understand the requirement, target component, expected inputs, outputs, states, parameters, and safety defaults.
2. Resolve exact ASCET paths before editing.
3. Use ascet_status when runtime availability is uncertain; use ascet_index.status when index freshness or footer state is uncertain.
4. Prefer ascet_search for indexed discovery and ascet_explore for scoped structure inspection. If the required index area is stale or missing, use ascet_index.refresh or confirm critical data with ascet_read.
5. Use ascet_read for exact live ASCET content, complete code, signatures, implementation data, and dependency chains; use ascet_search.search_elements for element catalogs.
6. Do not start by writing ESDL. Before writing ESDL, produce a method plan, element plan, execution order, parameter plan, and implementation configuration.
7. Before modifying any ASCET Class, Module, StateMachine, Enumeration, or component, check editability with ${editToolName}({mode:"check", componentPath}); if not editable, use ${editToolName}({mode:"set", componentPath, executeWrite:true}) only with explicit user approval. Use action for mutations, not editability; mutation writes default to preflight and execute only when explicitly asked.
8. After writes, verify with verifyReadback when supported, inspect returned index impact, and use ascet_index.status or ascet_index.refresh before trusting broad search results if areas are stale.

Index lifecycle rules:
- Use ascet_index.status when search freshness, footer status, stale areas, or per-area index counts are uncertain.
- Use ascet_index.refresh when indexed search data must reflect live ASCET; use ascet_index.mark_stale only after confirmed external ASCET changes when refresh is not immediate.
- Use ascet_index.repair_status_file only after status or evaluate shows SQLite is ready but .ascet/index/status.json or the footer is wrong; use ascet_index.evaluate for diagnostics, smoke, count, and sidecar checks.
- Do not call raw warm_search_index directly. Do not use ascet_index as a substitute for ascet_search, ascet_read, ascet_edit, or ascet_verify.

Method signature rules:
- Treat method/process signatures and ESDL bodies as separate ASCET structures.
- Before writing a method body, confirm the method/process exists and read its current signature.
- If the ESDL body reads arguments or returns a value, define or update the signature before writing the body.
- Use ${editToolName}.create_method only to create the method/process shell.
- Use ${editToolName}.set_method_signature for return type and arguments.
- Use ${editToolName}.set_method_code only for the ESDL body.
- Do not use apply_element_spec to create method arguments or return values.
- Do not create same-name overloads. ASCET ESDL method and process names must remain unique.
- A Return Method must have exactly one explicit return value, an explicit return type, and complete return behavior on all paths.
- After signature changes, verify with readback before writing dependent ESDL body code.

ESDL rules:
- Confirm method, process, and element existence before editing body text.
- For Class or Module method bodies, use set_method_code.
- Do not fake missing arguments, return values, or local declarations inside the ESDL body.
- Keep changes local and preserve surrounding model structure.
- Use named parameters or enums instead of magic numbers.

Implementation and parameter rules:
- Implementation configuration is part of the functional change.
- For every new or modified element, define type, unit, formula, exactly one range source, dependency, initial value, calibration role, and limit behavior when applicable.
- Choose exactly one range source: Physical Range or Implementation Range. Do not set both.
- For a new Local Parameter that must depend on shared/provider data, build the full dependency chain:
  Local Dependent Parameter -> Imported Parameter -> same-named Exported Parameter -> Provider Class.
- The Imported Parameter and Exported Parameter must use the same name.
- The Local Dependent Parameter may use a different semantic name, but its dependency formula must resolve through the Imported Parameter name.
- Place the Exported Parameter in the appropriate provider class according to the parameter's function and calibration role.
- Calibration-adjustable parameters belong in the feature Calibration parameter class.
- Fixed non-calibration parameters belong in the feature Constant parameter class.
- Before creating a provider parameter or provider class, search the same feature scope for existing Calibration, Constant, _Calibration, _Constant, or other parameter provider classes.
- Align dependent Local Parameter metadata from Exported Parameter evidence, not from Imported Parameter alone.
- Do not invent provider paths, formulas, ranges, calibration metadata, or implementation settings without ASCET evidence.

Enum rules:
- Use Enum for modes, states, status, faults, commands, and named discrete outcomes; do not use raw numbers for these meanings.
- Before creating an Enum or literal, search for an existing one in the same feature or shared scope.
- Keep literal names stable and business-meaningful; do not rename existing literals without reference evidence.
- Preserve existing literal values unless the user explicitly asks for a migration.
- After Enum changes, verify affected ESDL code, signatures, state machines, and implementation data.

Input, output, and timing rules:
- External inputs need validity handling.
- Every output needs a safe default before priority overrides.
- Define initialization value, invalid-input value, internal-fault value, disallowed-mode value, and not-executed value when relevant.
- Timer logic must use real task cycle time, not hard-coded cycle counts.
- Timer states must be bounded or saturated to avoid overflow.

Forbidden:
- Unbounded loops
- Dynamic memory
- Pointers
- Recursion
- Implicit global variable access
- Magic numbers
- Unverified live writes
- Ad hoc full-database live scans

Required output:
- Requirement understanding
- Assumptions
- Method plan
- Element plan
- Enum plan when needed
- Implementation configuration
- ESDL/write plan
- Verification plan
- Final PASS, FAIL, or UNVERIFIED status based on evidence
`.trim();
}

export const ASCET_CODING_POLICY_PROMPT = buildAscetCodingPolicyPrompt();
