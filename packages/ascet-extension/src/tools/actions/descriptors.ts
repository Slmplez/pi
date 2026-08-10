import type { AscetProfile } from "../exposure/profiles.ts";

export type AscetActionVisibility = "public" | "internal" | "hidden";
export type AscetActionActivationState = "active" | "inactive" | "hidden" | "feature_disabled";

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
	"Set executeWrite=true only when the user explicitly asks to apply the write; PI still requires confirmation.",
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
	"For new elements, use bounded ascet_get.tree discovery only when the exact target is not known, then use ascet_get.elements for the resolved Component or bounded Folder. Use Pi grep/read for stored observations and ascet_read.read_code for complete code. Use ascet_read.read_dependent_chain when dependency context matters. Treat live reads as ASCET compatibility and preservation evidence, not as the semantic source. For existing elements, preserve unchanged live fields and emit only the requested patch; do not copy a sibling's values without semantic equivalence.",
	"Do not guess modelType, scope, range, implementation type, formula, calibration, or dependency.",
	"For Provider Exported Parameter creation, explicitly provide unit, comment, calibration, range, data, and implementation decision groups. Use range.mode=none|physical|implementation, data.mode=explicit|ascetDefault, and implementation.mode=explicit|ascetDefault; omission is invalid and the agent must not guess values.",
	"For Local Dependent Parameter creation, explicitly provide unit, comment, calibration, range, and implementation decision groups. Local dependent data is forbidden because the value comes from Dependency binding. Imported Parameters are the exception and carry structural compatibility metadata only; do not invent local data, implementation, range, or calibration.",
	"For explicit implementations, provide valueType, memoryLocation, formula, and limitAssignments. Use an empty formula only to explicitly select no conversion formula, and use limitAssignments=null when the option is not applicable. Ranged discrete Parameters require limitAssignments=true.",
	"For a new enumeration, include enumerationPath and scalar data.value; do not add physicalRange. Existing-element patches may omit unchanged fields.",
	"If any required create field is unknown, stop at preflight and resolve live metadata with ascet_get.elements or ask for the value.",
	"For an existing local dependent Parameter, omit data.value: its DataVariant stores the Dependency binding, not a ScalarType value. apply_element_spec rejects data.value for this state.",
	"Dependency is not part of apply_element_spec JSON; use set_element_dependency after the target parameter exists.",
] as const;

const dependencyRules = [
	"Dependency mappings may target an existing Parameter, Constant, or System Constant. Resolve every target's live kind, scope, name, and OID before writing; do not assume that a mapping target is Imported.",
	"If a mapping target is an Imported Parameter, additionally resolve the authoritative same-named Exported Parameter provider and verify the Imported/Exported compatibility. Do not apply this provider-chain requirement to Constant or System Constant targets.",
	"When creating a dependent Local Parameter from an exported provider, align metadata from the authoritative provider, not from the bridge Imported Parameter.",
	"When dependencyFormula is provided, dependencyMappings is mandatory unless bindingPolicy=autoExactName is paired with explicit dependencyFormals. autoExactName maps only a uniquely resolvable same-named Parameter, Constant, or System Constant; never infer mappings from formula text, never infer formals by tokenizing it, and never use fuzzy matching.",
	"Select the affected DataVariant set explicitly. Never treat an omitted or ambiguous variant selection as all variants; if the operation cannot express the requested variant scope, stop at preflight rather than write.",
	"When changing dependent to independent, provide an explicit restoration source for every affected DataVariant: a snapshot, an explicit value, or an explicit ASCET default. Do not silently clear the formula, restore zero, or choose an implicit default.",
	"Use set_element_dependency only for an existing local parameter; executed writes use automatic internal verification.",
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
	descriptor("ascet_get", "tree", "public", READ_PROFILES, {
		prompt: prompt("Read a bounded live Folder/Component tree when structural discovery is required.", {
			rules: [
				"Use tree for bounded structural discovery when the exact target is not yet known. targetPathPrefix accepts a bounded folder scope such as PlatformLibrary\\Package\\SCM_SecondaryCollisionMitigation. If an exact path or OID is already validated, call the matching exact Get or Read action directly.",
				"Tree returns metadata only; it does not load Elements, references, methods, implementations, or code.",
			],
			fewShots: [
				shot("expand package", { action: "tree", target: { targetPathPrefix: "PlatformLibrary\\Package" } }),
			],
			tags: ["navigation", "tree", "live-read"],
		}),
	}),
	descriptor("ascet_get", "database_catalog", "public", READ_PROFILES, {
		prompt: prompt("Build stored full-database catalogs from a complete Tree observation.", {
			rules: [
				"Create a complete unbounded stored tree first, then pass its resultId as sourceTreeResultId.",
				"Use include to select required object types; Parameter Class and Message requests perform one combined live scan.",
			],
			fewShots: [
				shot("build database catalog", {
					action: "database_catalog",
					sourceTreeResultId: "obs-tree-full",
					include: ["module", "enumeration"],
					delivery: "stored",
				}),
			],
			tags: ["catalog", "database", "stored-read"],
		}),
	}),
	descriptor("ascet_get", "elements", "public", READ_PROFILES, {
		prompt: prompt("Read complete Element directory entries for an exact Component or bounded Folder selection.", {
			rules: [
				"Use elements after an exact Component or bounded Folder target is resolved from user input, tree discovery, or validated stored evidence. Filter by name or scope only; do not use a result-count limit.",
				"Element output is concise identity/scope metadata. Use ascet_read only for a precise deep read.",
			],
			fewShots: [shot("list component elements", { action: "elements", target: { path: "DEMO\\PID" } })],
			tags: ["element", "signal", "live-read"],
		}),
	}),
	descriptor("ascet_get", "formulas", "public", READ_PROFILES, {
		prompt: prompt("Read complete Project Formula definitions for one exact Project.", {
			rules: [
				"Formula contents and parameter details are returned by formulas. Use Pi grep/read for large stored formula observations.",
				"Do not use formulas to locate an unknown project; navigate with tree first.",
			],
			fewShots: [shot("read project formulas", { action: "formulas", target: { path: "DEMO\\Project" } })],
			tags: ["project", "formula", "live-read"],
		}),
	}),
	descriptor("ascet_get", "component_refs", "public", READ_PROFILES, {
		prompt: prompt("Read outgoing Component references without loading source code.", {
			rules: [
				"component_refs returns outgoing Component references only. It is not a reverse-reference or Project-discovery API. Call it after resolving an exact Component by path or OID.",
			],
			fewShots: [shot("read component refs", { action: "component_refs", target: { path: "DEMO\\Consumer" } })],
			tags: ["reference", "component", "live-read"],
		}),
	}),
	descriptor("ascet_get", "bde_edges", "public", READ_PROFILES, {
		prompt: prompt("Read BDE signal edges for one resolved component/diagram.", {
			rules: [
				"Use bde_edges to understand signal flow; use ascet_read.read_block_diagram for deeper diagram details. A zero-edge result does not prove that the Component has no Diagram.",
			],
			fewShots: [
				shot("read BDE edges", { action: "bde_edges", target: { path: "DEMO\\Controller" }, diagramName: "Main" }),
			],
			tags: ["reference", "diagram", "signal-flow"],
		}),
	}),
	descriptor("ascet_get", "import_binding", "public", READ_PROFILES, {
		prompt: prompt("Verify one Imported Element binding against an explicit provider Component.", {
			rules: [
				"Use import_binding only after elements identifies the consumer Imported Element and provider Exported Element.",
				"Provider identity must be exact path or OID; this action does not perform global provider search.",
			],
			fewShots: [
				shot("verify import binding", {
					action: "import_binding",
					target: { path: "DEMO\\Consumer" },
					elementName: "P_Request",
					provider: { path: "DEMO\\Provider" },
				}),
			],
			tags: ["reference", "imported", "exported"],
		}),
	}),
	descriptor("ascet_get", "dbitem_refs", "public", READ_PROFILES, {
		prompt: prompt("Read outgoing database-item references for one exact object.", {
			rules: [
				"dbitem_refs returns outgoing database-item references only. It is not a reverse-reference API and cannot prove all consumers or owners. Use it for precise object-level relationships not covered by component_refs.",
			],
			fewShots: [shot("read database refs", { action: "dbitem_refs", target: { path: "DEMO\\Consumer" } })],
			tags: ["reference", "database-item", "live-read"],
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
				"Use read_element after ascet_get.elements identifies one Component and Element name.",
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
		prompt: prompt("Read implementation metadata for a resolved component.", {
			rules: ["Use read_implementation when implementation metadata matters more than code text."],
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
					"Resolve the exact consumer Component and use ascet_get.elements to identify the Imported Element and candidate Exported provider before calling read_dependent_chain. Use bounded tree discovery only when those targets are not already known.",
					"Pass exporterComponentPath only when the provider path is already known exactly.",
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
				"Use read_element_dependency before set_element_dependency when you need the current dependency flag or formula.",
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
			fewShots: [shot("preflight folder", { action: "create_folder", folderPath: "DEMO/New" })],
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
		prompt: prompt("Set enumeration values for an ASCET enumeration component.", {
			rules: writePreflightRules,
			fewShots: [
				shot("set enum values", {
					action: "set_enumerators",
					componentPath: "D/E",
					enumerators: ["E_OFF", "E_ON"],
				}),
			],
			tags: ["write", "enumeration"],
		}),
	}),
	descriptor("ascet_edit", "apply_element_spec", "public", WRITE_PROFILES, {
		prompt: prompt("Apply structured primitive element specs from evidence, not guesses.", {
			rules: [...writePreflightRules, ...elementSpecRules],
			fewShots: [
				shot("plan element creation", {
					action: "apply_element_spec",
					componentPath: "F/C",
					intent: "create",
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
					projectPath: "D/P",
					specFile: "formula.json",
					mode: "restore",
				}),
			],
			tags: ["write", "project", "formula"],
		}),
	}),
	descriptor("ascet_edit", "set_element_dependency", "public", WRITE_PROFILES, {
		prompt: prompt("Set or clear dependency state for an existing element.", {
			rules: [
				...writePreflightRules,
				...dependencyRules,
				"set_element_dependency does not create local, imported, or exported elements; use apply_element_spec first for new elements.",
				"Successful executed writes invalidate matching on-demand observations; dry runs and failed writes do not invalidate observations.",
			],
			fewShots: [
				shot("plan dependency", {
					action: "set_element_dependency",
					targetPath: "F/C",
					elementName: "K",
					dependency: "dependent",
					variantPolicy: "default",
				}),
			],
			tags: ["write", "dependency", "provider-discovery"],
		}),
	}),
	descriptor("configure_parameter_dependency_chain", "plan", "public", WRITE_PROFILES, {
		prompt: prompt("Plan one complete inline Provider/Consumer/Local dependency chain.", {
			rules: [
				"Use mode=plan before commit. Do not create or pass specFile artifacts; provide one role-specific inline element for provider, consumer, and local.",
				"Provider and Local must include every applicable decision group. Imported Parameter is the only lightweight exception and must not contain data, implementation, range, or calibration.",
				"Provider Exported and Consumer Imported names must be the same P_<Name>; the Consumer Local name must be C_<Name>. Provide dependency.formals, bindingPolicy=explicit, mappings, and variantPolicy. The formals list and mapping keys must match exactly; executed stages and rollback writes use automatic internal verification.",
			],
			fewShots: [
				shot("plan inline dependency chain", {
					mode: "plan",
					provider: {
						componentPath: "F/Provider",
						element: {
							role: "providerExportedParameter",
							name: "P_Threshold",
							modelType: "cont",
							unit: "",
							comment: "Provider output",
							calibration: false,
							range: { mode: "none" },
							data: { mode: "ascetDefault" },
							implementation: { mode: "ascetDefault" },
						},
					},
					consumer: {
						componentPath: "F/Consumer",
						element: { role: "consumerImportedParameter", name: "P_Threshold", modelType: "cont" },
					},
					local: {
						componentPath: "F/Consumer",
						element: {
							role: "localDependentParameter",
							name: "C_Threshold",
							modelType: "cont",
							unit: "",
							comment: "Dependent local",
							calibration: false,
							range: { mode: "none" },
							implementation: { mode: "ascetDefault" },
						},
					},
					dependency: {
						formula: "P_Threshold",
						formals: ["P_Threshold"],
						bindingPolicy: "explicit",
						mappings: { P_Threshold: { kind: "parameter", name: "P_Threshold" } },
						variantPolicy: "default",
					},
				}),
			],
			tags: ["write", "dependency", "inline-element", "provider-discovery"],
		}),
	}),
	descriptor("configure_parameter_dependency_chain", "commit", "public", WRITE_PROFILES, {
		prompt: prompt("Commit a previously planned dependency chain by planId only.", {
			rules: ["Pass only mode=commit and the unchanged planId returned by plan."],
			fewShots: [shot("commit dependency chain", { mode: "commit", planId: "plan-id" })],
			tags: ["write", "dependency", "commit"],
		}),
	}),
	descriptor("ascet_edit", "check", "public", ["component-edit"], {
		prompt: prompt("Check whether a source-controlled ASCET component is editable.", {
			rules: ["Use mode=check before editing a source-controlled ASCET component when editability is uncertain."],
			fewShots: [shot("check editable", { mode: "check", componentPath: "DEMO/PID" })],
			tags: ["write", "scm", "preflight"],
		}),
	}),
	descriptor("ascet_edit", "set", "public", ["component-edit"], {
		prompt: prompt("Request an ASCET SCM lock through guarded write flow.", {
			rules: [
				"Use mode=set only when the user intends to make the component editable.",
				"Set executeWrite=true only when the user explicitly asks to apply the lock request.",
			],
			fewShots: [shot("lock component", { mode: "set", componentPath: "DEMO/PID", executeWrite: true })],
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
