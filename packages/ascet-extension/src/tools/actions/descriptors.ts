import type { AscetProfile } from "../exposure/profiles.ts";

export type AscetActionVisibility = "public" | "internal" | "hidden";
export type AscetActionActivationState = "active" | "inactive" | "hidden" | "feature_disabled";
export type AscetObjectKind = "database" | "project" | "folder" | "class" | "module" | "statemachine" | "enumeration";

export interface AscetActionFewShot {
	variant?: string;
	intent: string;
	args: Record<string, unknown>;
}

export interface AscetActionPrompt {
	summary: string;
	rules?: readonly string[];
	fewShots?: readonly AscetActionFewShot[];
	tags?: readonly string[];
	hidden?: boolean;
}

export interface AscetActionDescriptor {
	id: string;
	tool: string;
	action: string;
	visibility: AscetActionVisibility;
	profiles: readonly AscetProfile[];
	featureFlag?: string;
	deprecatedBy?: string;
	supportedObjectKinds?: readonly AscetObjectKind[];
	prompt?: AscetActionPrompt;
}

const CORE_PROFILES: readonly AscetProfile[] = [
	"base",
	"advanced-read",
	"reference",
	"diff",
	"write-preflight",
	"batch-write",
	"component-edit",
];
const ALL_PROFILES: readonly AscetProfile[] = [...CORE_PROFILES, "ops"];
const READ_PROFILES: readonly AscetProfile[] = CORE_PROFILES;
const WRITE_PROFILES: readonly AscetProfile[] = ["write-preflight", "batch-write"];
const OPS_PROFILES: readonly AscetProfile[] = ["ops"];

function descriptor(
	tool: string,
	action: string,
	visibility: AscetActionVisibility,
	profiles: readonly AscetProfile[],
	extra: Omit<AscetActionDescriptor, "id" | "tool" | "action" | "visibility" | "profiles"> = {},
): AscetActionDescriptor {
	return {
		id: `${tool}.${action}`,
		tool,
		action,
		visibility,
		profiles,
		...extra,
	};
}

function prompt(summary: string, extra: Omit<AscetActionPrompt, "summary"> = {}): AscetActionPrompt {
	return { summary, ...extra };
}

function shot(intent: string, args: Record<string, unknown>, variant?: string): AscetActionFewShot {
	return variant ? { variant, intent, args } : { intent, args };
}

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

export const ascetActionCatalog: readonly AscetActionDescriptor[] = [
	descriptor("ascet_status", "status", "public", ALL_PROFILES, {
		prompt: prompt("Connect ASCET and warm only the component partition.", {
			rules: [
				"Use ascet_status before calling other ASCET tools when runtime availability is uncertain.",
				"Treat missing ASCET CLI or contract catalog as setup evidence.",
			],
			fewShots: [shot("check setup", {})],
			tags: ["ops", "status", "runtime"],
		}),
	}),
	descriptor("ascet_capabilities", "search_actions", "public", ALL_PROFILES, {
		prompt: prompt("Search ASCET tool actions and return full schema, rules, fewShot, and result shape.", {
			rules: [
				"Use search_actions when action choice, parameters, result shape, or usage rules are unclear.",
				"search_actions searches ActionCatalog, not ASCET model contents or CLI backend commands.",
			],
			fewShots: [shot("find action schema", { action: "search_actions", query: "complete code", limit: 3 })],
			tags: ["ops", "capability", "action-search"],
		}),
	}),
	descriptor("ascet_search", "*", "public", READ_PROFILES, {
		prompt: prompt("Search the ten native ASCET Search modes with one compact tool.", {
			rules: [
				"Use mode=comp, comp-ref, method, method-ref, method-element, element, element-ref, sender, receiver, or text.",
				"Search results are live hints, not complete metadata. Resolve an exact path before ascet_get, ascet_read, or any edit.",
				"The extension hides and closes the native Search window after collecting results.",
			],
			fewShots: [
				shot("find element", { mode: "element", q: "PCA_Ctrl_slMin_RA", limit: 20 }),
				shot("find code text", { mode: "text", q: "VLC3IsInControl", limit: 20 }),
			],
			tags: ["search", "discovery", "native-ui"],
		}),
	}),
	descriptor("ascet_get", "tree", "public", READ_PROFILES, {
		supportedObjectKinds: ["database", "project", "folder", "class", "module", "statemachine", "enumeration"],
		prompt: prompt("Read a bounded live Folder/Component hierarchy from an exact scope.", {
			rules: [
				"Use tree only for bounded hierarchy expansion. It does not perform name search; use ascet_search for candidate discovery.",
				"Omit path for the database root. depth defaults to 1 and is limited to 1 through 5.",
				"Tree returns hierarchy metadata only; it does not load Elements, references, methods, implementations, or code.",
			],
			fewShots: [
				shot("expand package", { action: "tree", path: "PlatformLibrary\\Package", depth: 2 }),
				shot("read database root", { action: "tree", depth: 1 }),
			],
			tags: ["navigation", "tree", "live-read"],
		}),
	}),
	descriptor("ascet_get", "formulas", "public", READ_PROFILES, {
		prompt: prompt("Read complete Project Formula definitions for one exact Project.", {
			rules: [
				"Use formulas only with one exact Project path. name optionally filters one Formula.",
				"Do not use formulas to locate an unknown Project; use ascet_search or bounded tree discovery first.",
			],
			fewShots: [shot("read project formula", { action: "formulas", path: "DEMO\\Project", name: "VehicleMass" })],
			tags: ["project", "formula", "live-read"],
		}),
	}),
	descriptor("ascet_read", "read_code", "public", READ_PROFILES, {
		prompt: prompt("Read complete code live from ASCET only after resolving the target.", {
			rules: [
				'Use read_code when the user explicitly needs live code; it returns complete live text by default. Use detailLevel="summary" only when a hash/count summary is enough.',
				"Use read_code section=header or external-c only for C module targets; for ESDL class/module method code pass methodName with section=body or all.",
				"read_code is a live ToolAPI read for one exact target; use Pi grep on stored get observations for offline text filtering.",
			],
			fewShots: [
				shot("read code", {
					action: "read_code",
					componentPath: "DEMO/PID",
					methodName: "calc",
					section: "body",
				}),
			],
			tags: ["code", "live-read"],
		}),
	}),
	descriptor("ascet_read", "read_method_signature", "public", READ_PROFILES, {
		prompt: prompt("Verify primitive method return type and arguments.", {
			rules: [
				"Use read_method_signature to verify a method's primitive return type and arguments after create_method or set_method_signature.",
			],
			fewShots: [
				shot("read signature", {
					action: "read_method_signature",
					componentPath: "DEMO/PID",
					methodName: "calc",
				}),
			],
			tags: ["method", "live-read", "verify"],
		}),
	}),
	descriptor("ascet_read", "read_element", "public", READ_PROFILES, {
		prompt: prompt("Read complete metadata for one exact resolved Element.", {
			rules: [
				"Use read_element after ascet_search identifies a candidate Component and Element name; validate the exact path before relying on metadata.",
				"Use this action for exact kind, modelType, scope, value, calibration, range, and implementation metadata; do not use it for folder discovery.",
			],
			fewShots: [
				shot("read element", {
					action: "read_element",
					componentPath: "DEMO/PID",
					elementName: "pid_kp",
				}),
			],
			tags: ["element", "implementation", "live-read", "verify"],
		}),
	}),
	descriptor("ascet_read", "read_implementation", "public", READ_PROFILES, {
		supportedObjectKinds: ["class", "module", "statemachine", "enumeration"],
		prompt: prompt("Read implementation metadata for a resolved component or Enumeration.", {
			rules: [
				"Use read_implementation when implementation metadata matters more than code text.",
				"For Enumeration targets, inspect typeDefinition.enumerators; this is the supported exact enumerator readback path.",
			],
			fewShots: [
				shot("read impl", {
					action: "read_implementation",
					componentPath: "DEMO/PID",
					implementationMode: "default",
				}),
			],
			tags: ["implementation", "live-read"],
		}),
	}),
	descriptor("ascet_read", "read_block_diagram", "public", READ_PROFILES, {
		prompt: prompt("Read a BDE/block-diagram surface for resolved class or module targets.", {
			rules: [
				"Use read_block_diagram only for resolved class/module targets with a BDE/block-diagram surface; for ESDL text components prefer read_code or read_implementation.",
				"Treat an empty block-diagram payload as an empty diagram, not evidence that the component is missing.",
				"read_block_diagram accepts timeoutMs in milliseconds and defaults to 60000.",
			],
			fewShots: [
				shot("read BDE", {
					action: "read_block_diagram",
					componentPath: "DEMO/PID",
					diagramName: "Main",
				}),
			],
			tags: ["diagram", "live-read"],
		}),
	}),
	descriptor("ascet_read", "read_state_machine_flow", "public", READ_PROFILES, {
		prompt: prompt("Read state-machine flow only for resolved StateMachine targets.", {
			rules: [
				"Use read_state_machine_flow only for resolved StateMachine targets; for classes/modules use read_code or read_implementation.",
			],
			fewShots: [
				shot("read SM flow", {
					action: "read_state_machine_flow",
					componentPath: "DEMO/SM",
					detailLevel: "summary",
				}),
			],
			tags: ["state-machine", "live-read"],
		}),
	}),
	descriptor("ascet_read", "read_dependent_chain", "public", READ_PROFILES, {
		prompt: prompt(
			"Exact dependency-chain read for a Local Parameter with an optional explicit Exported provider constraint.",
			{
				rules: [
					"Resolve the exact Consumer Component and Local Parameter before calling read_dependent_chain.",
					"If exporterComponentPath is omitted, Runtime performs live native Element Search and accepts only one exact validated Exported Parameter. Never choose the first same-named result.",
					"The formula reported by read_dependent_chain is the local dependent parameter expression, not an implementation conversion formula or project formula.",
					"The Imported Parameter in the consuming component and the Exported Parameter in the provider component must have the same name.",
				],
				fewShots: [
					shot("dependent chain", {
						action: "read_dependent_chain",
						componentPath: "FeatureA/Consumer",
						dependentElement: "C_K_Effective",
					}),
				],
				tags: ["dependency", "provider-discovery", "live-read"],
			},
		),
	}),
	descriptor("ascet_read", "read_element_dependency", "public", READ_PROFILES, {
		prompt: prompt("Read dependency flag and formula for one existing element.", {
			rules: [
				"Use read_element_dependency only when you need the raw dependency flag or formula; use read_dependent_chain before create_dependent_chain when inspecting an existing chain.",
				"Use read_dependent_chain when provider-chain consistency also matters.",
			],
			fewShots: [
				shot("dependency state", {
					action: "read_element_dependency",
					componentPath: "FeatureA/Consumer",
					elementName: "C_K_Effective",
					targetKind: "component",
				}),
			],
			tags: ["dependency", "live-read", "verify"],
		}),
	}),
	descriptor("ascet_read", "read", "public", READ_PROFILES, {
		prompt: prompt("Read a live summary for one exact resolved Component.", {
			rules: [
				"Use read for independent Class, Module, or StateMachine checks after componentPath is resolved exactly; tree discovery is optional when an exact path or OID is already validated.",
				"Use ascet_get.formulas instead for Project formula checks.",
			],
			fewShots: [shot("read component summary", { action: "read", componentPath: "DEMO/PID" })],
			tags: ["component", "summary", "live-read", "verify"],
		}),
	}),
	descriptor("ascet_diff", "diff", "public", ["diff"], {
		prompt: prompt("Compare two ASCET targets with the generic diff route.", {
			rules: ["Use objectKind=class/module/statemachine for detailed semantic diffs when known."],
			fewShots: [
				shot("compare targets", {
					action: "diff",
					objectKind: "class",
					leftPath: "D/A",
					rightPath: "D/B",
					changesOnly: true,
				}),
			],
			tags: ["diff"],
		}),
	}),
	descriptor("ascet_diff", "diff_method", "public", ["diff"], {
		prompt: prompt("Compare one method body between two components.", {
			rules: ["Use diff_method when only one method body is needed."],
			fewShots: [
				shot("compare method", {
					action: "diff_method",
					leftPath: "D/A",
					rightPath: "D/B",
					methodName: "calc",
					changesOnly: true,
				}),
			],
			tags: ["diff", "method"],
		}),
	}),
	descriptor("ascet_diff", "diff_component_snapshot", "public", ["diff"], {
		prompt: prompt("Compare quick child snapshots for two components.", {
			rules: ["Use diff_component_snapshot only when method code or element signatures are not required."],
			fewShots: [
				shot("compare snapshots", {
					action: "diff_component_snapshot",
					leftPath: "D/A",
					rightPath: "D/B",
					changesOnly: true,
				}),
			],
			tags: ["diff", "snapshot"],
		}),
	}),
	descriptor("ascet_diff", "diff_state_machine_domain", "public", ["diff"], {
		prompt: prompt("Compare state-machine domain structure.", {
			rules: ["Use diff_state_machine_domain only for StateMachine targets."],
			fewShots: [
				shot("compare SM", {
					action: "diff_state_machine_domain",
					leftPath: "D/A",
					rightPath: "D/B",
					changesOnly: true,
				}),
			],
			tags: ["diff", "state-machine"],
		}),
	}),
	descriptor("ascet_diff", "diff_element_spec", "public", ["diff"], {
		prompt: prompt("Compare an element spec artifact with a live component.", {
			rules: ["Use diff_element_spec when validating an element-spec JSON artifact against a component."],
			fewShots: [
				shot("compare spec", {
					action: "diff_element_spec",
					componentPath: "DEMO/PID",
					specFile: "spec.json",
					changesOnly: true,
				}),
			],
			tags: ["diff", "element"],
		}),
	}),
	descriptor("ascet_diff", "diff_project_formulas", "public", ["diff"], {
		prompt: prompt("Compare project formulas between two Project targets.", {
			rules: ["Use diff_project_formulas only for Project targets."],
			fewShots: [
				shot("compare formulas", {
					action: "diff_project_formulas",
					leftPath: "D/P1",
					rightPath: "D/P2",
					changesOnly: true,
				}),
			],
			tags: ["diff", "project"],
		}),
	}),
	descriptor("ascet_edit", "create_folder", "public", WRITE_PROFILES, {
		prompt: prompt("Create one ASCET folder with guarded preflight/readback behavior.", {
			rules: writePreflightRules,
			fewShots: [
				shot("apply folder creation", { action: "create_folder", folderPath: "DEMO/New", intent: "apply" }),
			],
			tags: ["write", "folder", "preflight"],
		}),
	}),
	descriptor("ascet_edit", "create_component", "public", WRITE_PROFILES, {
		prompt: prompt("Create one component target with kind-specific defaults and readback.", {
			rules: [
				...writePreflightRules,
				"After create_component, inspect expectedDefaultScaffold.defaultEntryMethod as an unverified hint for the likely initial method.",
				"For class and module targets, omitted language defaults to ESDL.",
			],
			fewShots: [
				shot("preflight component", {
					action: "create_component",
					intent: "apply",
					componentPath: "DEMO/C",
					kind: "class",
					language: "ESDL",
				}),
			],
			tags: ["write", "component", "preflight"],
		}),
	}),
	descriptor("ascet_edit", "create_method", "public", WRITE_PROFILES, {
		prompt: prompt("Create one method/process/action shell compatible with the component kind.", {
			rules: [...writePreflightRules, ...methodEditRules],
			fewShots: [
				shot("preflight method", {
					action: "create_method",
					intent: "apply",
					componentPath: "DEMO/PID",
					componentKind: "class",
					methodName: "calc2",
					methodKind: "abstract",
				}),
			],
			tags: ["write", "method", "preflight"],
		}),
	}),
	descriptor("ascet_edit", "set_method_signature", "public", WRITE_PROFILES, {
		prompt: prompt("Patch a method signature before writing code that depends on return values or arguments.", {
			rules: [
				...writePreflightRules,
				"Use set_method_signature after create_method and before method body writes when code returns a value or reads method arguments.",
				"Do not use apply_element_spec for method return or argument declarations.",
			],
			fewShots: [
				shot("patch signature", {
					action: "set_method_signature",
					intent: "apply",
					componentPath: "DEMO/PID",
					methodName: "calc",
					returnType: "cont",
					arguments: [{ name: "u", type: "cont", ifExists: "replace" }],
				}),
			],
			tags: ["write", "method", "signature"],
		}),
	}),
	descriptor("ascet_edit", "delete_component", "public", WRITE_PROFILES, {
		prompt: prompt("Delete one component through guarded write flow.", {
			rules: writePreflightRules,
			fewShots: [
				shot("delete component", {
					action: "delete_component",
					intent: "apply",
					componentPath: "DEMO/Old",
					ifMissing: "fail",
				}),
			],
			tags: ["write", "component", "delete"],
		}),
	}),
	descriptor("ascet_edit", "delete_method", "public", WRITE_PROFILES, {
		prompt: prompt("Delete one method through guarded write flow.", {
			rules: writePreflightRules,
			fewShots: [
				shot("delete method", {
					action: "delete_method",
					intent: "apply",
					componentPath: "DEMO/PID",
					methodName: "old",
					ifMissing: "fail",
				}),
			],
			tags: ["write", "method", "delete"],
		}),
	}),
	descriptor("ascet_edit", "delete_folder", "public", WRITE_PROFILES, {
		prompt: prompt("Delete one folder through guarded write flow.", {
			rules: writePreflightRules,
			fewShots: [
				shot("delete folder", {
					action: "delete_folder",
					intent: "apply",
					folderPath: "DEMO/Old",
					ifMissing: "fail",
				}),
			],
			tags: ["write", "folder", "delete"],
		}),
	}),
	descriptor("ascet_edit", "set_method_code", "public", WRITE_PROFILES, {
		prompt: prompt("Set one class/module method body.", {
			rules: [...writePreflightRules, ...codeEditRules],
			fewShots: [
				shot("set method body", {
					action: "set_method_code",
					intent: "apply",
					componentPath: "DEMO/PID",
					methodName: "calc",
					codeFile: "calc.esdl",
				}),
			],
			tags: ["write", "code", "method"],
		}),
	}),
	descriptor("ascet_edit", "set_module_code", "public", WRITE_PROFILES, {
		prompt: prompt("Set module method, header, or external C code surfaces.", {
			rules: [
				...writePreflightRules,
				...codeEditRules,
				"Provide operation as set-method, set-header, or set-external-c-code.",
			],
			fewShots: [
				shot(
					"set module method",
					{
						action: "set_module_code",
						intent: "apply",
						modulePath: "DEMO/M",
						operation: "set-method",
						methodName: "calc",
						codeFile: "calc.c",
					},
					"set-method",
				),
				shot(
					"set module header",
					{ action: "set_module_code", modulePath: "DEMO/M", operation: "set-header", codeFile: "header.c" },
					"set-header",
				),
				shot(
					"set external C",
					{ action: "set_module_code", modulePath: "DEMO/M", operation: "set-external-c-code", codeFile: "ext.c" },
					"set-external-c-code",
				),
			],
			tags: ["write", "code", "module"],
		}),
	}),
	descriptor("ascet_edit", "set_state_machine_code", "public", WRITE_PROFILES, {
		prompt: prompt("Set state-machine method, state, transition, binding, or start-state code.", {
			rules: [
				...writePreflightRules,
				...codeEditRules,
				"Use the exact state-machine operation variant required by the target.",
			],
			fewShots: [
				shot(
					"set SM method",
					{
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "D/SM",
						operation: "set-method",
						methodName: "tick",
						codeFile: "tick.esdl",
					},
					"set-method",
				),
				shot(
					"set entry ESDL",
					{
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "D/SM",
						operation: "set-state-entry-esdl",
						stateName: "Idle",
						codeFile: "entry.esdl",
					},
					"set-state-entry-esdl",
				),
				shot(
					"set exit ESDL",
					{
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "D/SM",
						operation: "set-state-exit-esdl",
						stateName: "Idle",
						codeFile: "exit.esdl",
					},
					"set-state-exit-esdl",
				),
				shot(
					"set static ESDL",
					{
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "D/SM",
						operation: "set-state-static-esdl",
						stateName: "Idle",
						codeFile: "static.esdl",
					},
					"set-state-static-esdl",
				),
				shot(
					"bind entry",
					{
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "D/SM",
						operation: "bind-state-entry-method",
						stateName: "Idle",
						methodName: "onEntry",
					},
					"bind-state-entry-method",
				),
				shot(
					"bind exit",
					{
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "D/SM",
						operation: "bind-state-exit-method",
						stateName: "Idle",
						methodName: "onExit",
					},
					"bind-state-exit-method",
				),
				shot(
					"bind static",
					{
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "D/SM",
						operation: "bind-state-static-method",
						stateName: "Idle",
						methodName: "during",
					},
					"bind-state-static-method",
				),
				shot(
					"set transition condition",
					{
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "S",
						operation: "set-transition-condition-esdl",
						sourceState: "A",
						targetState: "B",
						codeFile: "c",
					},
					"set-transition-condition-esdl",
				),
				shot(
					"set transition action",
					{
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "S",
						operation: "set-transition-action-esdl",
						sourceState: "A",
						targetState: "B",
						codeFile: "a",
					},
					"set-transition-action-esdl",
				),
				shot(
					"bind transition cond",
					{
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "S",
						operation: "bind-transition-condition-method",
						sourceState: "A",
						targetState: "B",
						methodName: "c",
					},
					"bind-transition-condition-method",
				),
				shot(
					"bind transition action",
					{
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "S",
						operation: "bind-transition-action-method",
						sourceState: "A",
						targetState: "B",
						methodName: "onRun",
					},
					"bind-transition-action-method",
				),
				shot(
					"set start state",
					{
						action: "set_state_machine_code",
						intent: "apply",
						stateMachinePath: "D/SM",
						operation: "set-start-state",
						stateName: "Idle",
					},
					"set-start-state",
				),
			],
			tags: ["write", "code", "state-machine"],
		}),
	}),
	descriptor("ascet_edit", "set_enumerators", "public", WRITE_PROFILES, {
		supportedObjectKinds: ["enumeration"],
		prompt: prompt("Set enumeration values for an ASCET enumeration component.", {
			rules: writePreflightRules,
			fewShots: [
				shot("set enum values", {
					action: "set_enumerators",
					intent: "apply",
					componentPath: "D/E",
					enumerators: ["E_OFF", "E_ON"],
				}),
			],
			tags: ["write", "enumeration"],
		}),
	}),
	descriptor("ascet_edit", "apply_element_spec", "public", WRITE_PROFILES, {
		supportedObjectKinds: ["class", "module", "statemachine"],
		prompt: prompt("Apply structured primitive element specs from evidence, not guesses.", {
			rules: [...writePreflightRules, ...elementSpecRules],
			fewShots: [
				shot("plan element creation", {
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
				}),
			],
			tags: ["write", "element"],
		}),
	}),
	descriptor("ascet_edit", "apply_project_formula", "public", WRITE_PROFILES, {
		prompt: prompt("Apply structured project formula specs through guarded write flow.", {
			rules: [
				...writePreflightRules,
				"Use apply_project_formula only for Project targets and formula-spec JSON artifacts.",
			],
			fewShots: [
				shot("apply formulas", {
					action: "apply_project_formula",
					intent: "apply",
					projectPath: "D/P",
					specFile: "formula.json",
					mode: "restore",
				}),
			],
			tags: ["write", "project", "formula"],
		}),
	}),
	descriptor("ascet_edit", "create_dependent_chain", "public", WRITE_PROFILES, {
		supportedObjectKinds: ["class", "module", "statemachine"],
		prompt: prompt("Create or verify one Provider/Imported/Local Parameter dependency chain.", {
			rules: [
				...writePreflightRules,
				"Provide explicit Element definitions. Missing Elements are created; exact existing Elements are reused; conflicts are never overwritten.",
				"When provider.componentPath is omitted, Runtime uses live native Element Search and accepts only one exact validated Exported Parameter.",
				"Apply always performs automatic full readback. A successful apply is verified before it is returned.",
				"Use one explicit Formula/Formal/Imported binding only; never guess binding or DataVariant metadata.",
			],
			fewShots: [
				shot("preview dependency chain", {
					action: "create_dependent_chain",
					provider: {
						componentPath: "FeatureA/Provider",
						element: {
							name: "P_Threshold",
							modelType: "cont",
							unit: "",
							comment: "",
							calibration: false,
							range: { mode: "none" },
							data: { mode: "ascetDefault" },
							implementation: { mode: "ascetDefault" },
						},
					},
					consumer: {
						componentPath: "FeatureA/Consumer",
						importedElement: { name: "P_Threshold", modelType: "cont", unit: "" },
						localElement: {
							name: "C_Threshold",
							modelType: "cont",
							unit: "",
							comment: "",
							calibration: false,
							range: { mode: "none" },
							implementation: { mode: "ascetDefault" },
						},
					},
					binding: { formula: "P_Threshold", formal: "P_Threshold", variantPolicy: "default" },
					intent: "preview",
				}),
			],
			tags: ["write", "dependency", "create", "provider-discovery", "readback"],
		}),
	}),
	descriptor("ascet_edit", "check", "public", ["component-edit"], {
		prompt: prompt("Check whether a source-controlled ASCET component is editable.", {
			rules: [
				"Use mode=check only to inspect current SCM state; write authorization is enforced independently by a fresh runtime same-session check.",
			],
			fewShots: [shot("check editable", { mode: "check", componentPath: "DEMO/PID" })],
			tags: ["write", "scm", "preflight"],
		}),
	}),
	descriptor("ascet_edit", "set", "public", ["component-edit"], {
		prompt: prompt("Request an ASCET SCM lock through guarded write flow.", {
			rules: [
				"Use mode=set only when the user intends to make the component editable.",
				"Use intent=apply when the user explicitly asks to request editability; use intent=preview to inspect the current state without writing.",
			],
			fewShots: [shot("lock component", { mode: "set", componentPath: "DEMO/PID", intent: "apply" })],
			tags: ["write", "scm"],
		}),
	}),
	descriptor("ascet_recover", "status", "public", OPS_PROFILES, {
		prompt: prompt("Diagnose ASCET extension runtime state.", {
			rules: ["Use action=status before recovery if the failure mode is unclear."],
			fewShots: [shot("diagnose runtime", { action: "status" })],
			tags: ["ops", "recover"],
		}),
	}),
	descriptor("ascet_recover", "clear_extension_temp", "public", OPS_PROFILES, {
		prompt: prompt("Clear extension-owned temporary ASCET files.", {
			rules: ["Only clear extension-owned temp files; do not kill ASCET GUI or user-owned ToolAPI processes."],
			fewShots: [shot("clear temp", { action: "clear_extension_temp" })],
			tags: ["ops", "recover"],
		}),
	}),
	descriptor("ascet_recover", "scheduler_status", "public", OPS_PROFILES, {
		prompt: prompt("Inspect ASCET scheduler queue and CLI lock state.", {
			rules: ["Use scheduler_status for queue, lock, and operation-health diagnostics."],
			fewShots: [shot("check queue", { action: "scheduler_status" })],
			tags: ["ops", "scheduler"],
		}),
	}),
	descriptor("ascet_recover", "scheduler_recover", "public", OPS_PROFILES, {
		prompt: prompt("Run safe scheduler recovery.", {
			rules: [
				"Use scheduler_recover only for safe scheduler recovery; it does not kill user-owned ASCET GUI processes.",
			],
			fewShots: [shot("safe scheduler recover", { action: "scheduler_recover" })],
			tags: ["ops", "scheduler", "recover"],
		}),
	}),
	descriptor("ascet_recover", "clear_stale_cli_lock", "public", OPS_PROFILES, {
		prompt: prompt("Clear a stale PI-owned ASCET CLI lock.", {
			rules: ["Use clear_stale_cli_lock only when scheduler status shows a stale lock."],
			fewShots: [shot("clear stale lock", { action: "clear_stale_cli_lock" })],
			tags: ["ops", "scheduler", "recover"],
		}),
	}),
	descriptor(
		"ascet_recover",
		"reconcile_mutation",
		"public",
		["write-preflight", "batch-write", "component-edit", "ops"],
		{
			prompt: prompt("Inspect and reconcile a quarantined ASCET mutation target.", {
				rules: [
					"Start with mode=inspect. Inspect is read-only and never clears quarantine.",
					"Bind reconciliation to the exact database fingerprint, target OID, and guard generation.",
					"Do not attempt another mutation while the target remains quarantined.",
				],
				fewShots: [
					shot("inspect quarantined mutation", {
						action: "reconcile_mutation",
						mode: "inspect",
						databaseFingerprint: "sha256:database",
						targetOid: "040...",
						expectedGeneration: 1,
					}),
				],
				tags: ["ops", "mutation", "reconciliation"],
			}),
		},
	),
	descriptor("ascet_scheduler_status", "status", "public", ["write-preflight", "batch-write", "ops"], {
		prompt: prompt("Inspect ASCET runtime scheduler queue, PI CLI lock, and operation health.", {
			rules: ["Use ascet_scheduler_status when ASCET tools appear stuck, queued, degraded, or timing out."],
			fewShots: [shot("inspect lock", { action: "status", format: "text" })],
			tags: ["ops", "scheduler"],
		}),
	}),
	descriptor("ascet_scheduler_status", "recover", "public", ["ops"], {
		prompt: prompt("Run safe scheduler recovery from the scheduler tool.", {
			rules: [
				"Use action=recover only for safe scheduler recovery; it does not kill user-owned ASCET GUI processes.",
			],
			fewShots: [shot("recover scheduler", { action: "recover", format: "text" })],
			tags: ["ops", "scheduler", "recover"],
		}),
	}),
	descriptor("ascet_batch_write", "batch_set_method_code", "hidden", ["batch-write"], {
		featureFlag: "PI_ASCET_ENABLE_BATCH_WRITE",
		prompt: prompt("Hidden batch set_method_code action.", {
			rules: ["Batch write is hidden by default and must not be injected into public prompts."],
			fewShots: [
				shot("batch method code", {
					operation: "batch_set_method_code",
					intent: "apply",
					requests: [{ componentPath: "DEMO/PID", methodName: "calc", codeFile: "calc.esdl" }],
				}),
			],
			tags: ["hidden", "batch", "write"],
			hidden: true,
		}),
	}),
	descriptor("ascet_batch_write", "batch_set_element_spec", "hidden", ["batch-write"], {
		featureFlag: "PI_ASCET_ENABLE_BATCH_WRITE",
		prompt: prompt("Hidden batch apply_element_spec action.", {
			rules: ["Batch write is hidden by default and must not be injected into public prompts."],
			fewShots: [
				shot("batch specs", {
					operation: "batch_set_element_spec",
					intent: "apply",
					requests: [{ componentPath: "DEMO/PID", specFile: "spec.json", mode: "restore" }],
				}),
			],
			tags: ["hidden", "batch", "write"],
			hidden: true,
		}),
	}),
	descriptor("ascet_batch_write", "batch_create_component", "hidden", ["batch-write"], {
		featureFlag: "PI_ASCET_ENABLE_BATCH_WRITE",
		prompt: prompt("Hidden batch create_component action.", {
			rules: ["Batch write is hidden by default and must not be injected into public prompts."],
			fewShots: [
				shot("batch components", {
					operation: "batch_create_component",
					intent: "apply",
					requests: [{ componentPath: "DEMO/C", kind: "class", language: "ESDL" }],
				}),
			],
			tags: ["hidden", "batch", "write"],
			hidden: true,
		}),
	}),
	descriptor("ascet_batch_write", "batch_create_method", "hidden", ["batch-write"], {
		featureFlag: "PI_ASCET_ENABLE_BATCH_WRITE",
		prompt: prompt("Hidden batch create_method action.", {
			rules: ["Batch write is hidden by default and must not be injected into public prompts."],
			fewShots: [
				shot("batch methods", {
					operation: "batch_create_method",
					intent: "apply",
					requests: [
						{ componentPath: "DEMO/PID", methodName: "calc2", componentKind: "class", methodKind: "abstract" },
					],
				}),
			],
			tags: ["hidden", "batch", "write"],
			hidden: true,
		}),
	}),
	descriptor("ascet_batch_write", "batch_set_project_formula", "hidden", ["batch-write"], {
		featureFlag: "PI_ASCET_ENABLE_BATCH_WRITE",
		prompt: prompt("Hidden batch apply_project_formula action.", {
			rules: ["Batch write is hidden by default and must not be injected into public prompts."],
			fewShots: [
				shot("batch formulas", {
					operation: "batch_set_project_formula",
					intent: "apply",
					requests: [{ projectPath: "D/P", specFile: "formula.json", mode: "restore" }],
				}),
			],
			tags: ["hidden", "batch", "write"],
			hidden: true,
		}),
	}),
	descriptor("ascet_batch_write", "batch_delete_component", "hidden", ["batch-write"], {
		featureFlag: "PI_ASCET_ENABLE_BATCH_WRITE",
		prompt: prompt("Hidden batch delete_component action.", {
			rules: ["Batch write is hidden by default and must not be injected into public prompts."],
			fewShots: [
				shot("batch delete components", {
					operation: "batch_delete_component",
					intent: "apply",
					requests: [{ componentPath: "DEMO/Old", ifMissing: "fail" }],
				}),
			],
			tags: ["hidden", "batch", "write"],
			hidden: true,
		}),
	}),
	descriptor("ascet_batch_write", "batch_delete_method", "hidden", ["batch-write"], {
		featureFlag: "PI_ASCET_ENABLE_BATCH_WRITE",
		prompt: prompt("Hidden batch delete_method action.", {
			rules: ["Batch write is hidden by default and must not be injected into public prompts."],
			fewShots: [
				shot("batch delete methods", {
					operation: "batch_delete_method",
					intent: "apply",
					requests: [{ componentPath: "DEMO/PID", methodName: "old", ifMissing: "fail" }],
				}),
			],
			tags: ["hidden", "batch", "write"],
			hidden: true,
		}),
	}),
	descriptor("ascet_batch_write", "batch_create_folder", "hidden", ["batch-write"], {
		featureFlag: "PI_ASCET_ENABLE_BATCH_WRITE",
		prompt: prompt("Hidden batch create_folder action.", {
			rules: ["Batch write is hidden by default and must not be injected into public prompts."],
			fewShots: [
				shot("batch folders", {
					operation: "batch_create_folder",
					intent: "apply",
					requests: [{ folderPath: "DEMO/New" }],
				}),
			],
			tags: ["hidden", "batch", "write"],
			hidden: true,
		}),
	}),
	descriptor("ascet_batch_write", "batch_delete_folder", "hidden", ["batch-write"], {
		featureFlag: "PI_ASCET_ENABLE_BATCH_WRITE",
		prompt: prompt("Hidden batch delete_folder action.", {
			rules: ["Batch write is hidden by default and must not be injected into public prompts."],
			fewShots: [
				shot("batch delete folders", {
					operation: "batch_delete_folder",
					intent: "apply",
					requests: [{ folderPath: "DEMO/Old", ifMissing: "fail" }],
				}),
			],
			tags: ["hidden", "batch", "write"],
			hidden: true,
		}),
	}),
];

export const ascetActionDescriptors = ascetActionCatalog;

const descriptorById = new Map(ascetActionCatalog.map((item) => [item.id, item]));

export function getActionDescriptor(tool: string, action: string): AscetActionDescriptor | undefined {
	return descriptorById.get(`${tool}.${action}`) ?? descriptorById.get(`${tool}.*`);
}

export function listActionDescriptors(): AscetActionDescriptor[] {
	return ascetActionCatalog.map((item) => ({
		...item,
		profiles: [...item.profiles],
		prompt: item.prompt
			? {
					...item.prompt,
					rules: item.prompt.rules ? [...item.prompt.rules] : undefined,
					fewShots: item.prompt.fewShots ? item.prompt.fewShots.map((fewShot) => ({ ...fewShot })) : undefined,
					tags: item.prompt.tags ? [...item.prompt.tags] : undefined,
				}
			: undefined,
	}));
}
