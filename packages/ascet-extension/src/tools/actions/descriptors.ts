import type { AscetProfile } from "../exposure/profiles.ts";

export type AscetActionVisibility = "public" | "internal" | "hidden";
export type AscetActionActivationState = "active" | "inactive" | "hidden" | "feature_disabled";

export type AscetIndexPartition =
	| "components"
	| "element_decls"
	| "method_decls"
	| "method_process_elements"
	| "component_refs"
	| "element_refs"
	| "messages"
	| "project_formulas"
	| "text_code"
	| "all";

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
	requiresPartitions?: readonly AscetIndexPartition[];
	prompt?: AscetActionPrompt;
}

const CORE_PROFILES: readonly AscetProfile[] = [
	"base",
	"advanced-read",
	"reference",
	"diff",
	"verify",
	"write-preflight",
	"batch-write",
	"component-edit",
];
const ALL_PROFILES: readonly AscetProfile[] = [...CORE_PROFILES, "ops"];
const READ_PROFILES: readonly AscetProfile[] = CORE_PROFILES;
const WRITE_PROFILES: readonly AscetProfile[] = ["write-preflight", "batch-write"];
const VERIFY_PROFILES: readonly AscetProfile[] = ["verify", "write-preflight", "batch-write", "component-edit"];
const OPS_PROFILES: readonly AscetProfile[] = ["ops"];
const ALL_SEARCH_PROFILES: readonly AscetProfile[] = READ_PROFILES;

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

const searchPagingRules = [
	"Prefer exact matches and bounded componentPath or scopePath filters.",
	"Use cursor paging instead of large limits for broad searches; repeat the same action and filters with nextCursor until searchComplete=true.",
] as const;

const writePreflightRules = [
	"By default this tool returns a non-error preflight outcome and does not write.",
	"Set executeWrite=true only when the user explicitly asks to apply the write; PI still requires confirmation.",
	"Use verifyReadback=true unless the user explicitly asks to skip readback.",
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
	"Treat specFile as a structured ASCET element-spec JSON artifact.",
	"Start from the element's code role and explicit requirements: determine whether it is a parameter, variable, array, state, or enumeration, how the code reads or writes it, its domain, lifecycle, and initialization intent. That semantic intent drives the target spec; do not let a similarly named element or a read result replace the code-level meaning.",
	"For new elements, use ascet_search.search_elements or ascet_search.text_in_code for discovery and ascet_read.read_code for complete code; use ascet_read.read_dependent_chain when dependency context matters. Treat live reads as ASCET compatibility and preservation evidence, not as the semantic source. For existing elements, preserve unchanged live fields and emit only the requested patch; Do not copy a sibling's values without semantic equivalence.",
	"Do not guess modelType, scope, range, implementation type, formula, calibration, or dependency.",
	"For a new variable, parameter, or array (except an Imported Parameter), include data.value and impl.valueType; for non-logical model types include exactly one range object with both min and max under physicalRange or impl.implementationRange. Ranged parameters with discrete implementations require impl.limitAssignments=true; real32/real64 implementations must omit that option because ASCET does not support it.",
	"For a new enumeration, include enumerationPath and scalar data.value; do not add physicalRange. Existing-element patches may omit unchanged fields.",
	"If any required create field is unknown, stop at preflight and resolve live metadata with ascet_search.search_elements or ask for the value.",
	"Dependency is not part of apply_element_spec JSON; use set_element_dependency after the target parameter exists.",
] as const;

const dependencyRules = [
	"Before creating or updating a dependent Local Parameter, resolve the authoritative same-named Exported Parameter provider with read_dependent_chain or the coordinated read/search/explore workflow.",
	"Do not bind to a provider candidate unless the matching element is scope=Exported.",
	"The Imported Parameter and Exported Parameter must have the same name.",
	"When creating a dependent Local Parameter from an Exported Parameter, align metadata from the Exported Parameter, not from the Imported Parameter.",
	"Use set_element_dependency only for an existing local parameter and verify readback.",
] as const;

export const ascetActionCatalog: readonly AscetActionDescriptor[] = [
	descriptor("ascet_status", "status", "public", ALL_PROFILES, {
		requiresPartitions: ["components"],
		prompt: prompt("Connect ASCET and warm only the component partition.", {
			rules: [
				"Use ascet_status before calling other ASCET tools when runtime availability is uncertain.",
				"Treat missing ASCET CLI or contract catalog as setup evidence.",
			],
			fewShots: [shot("check setup", {})],
			tags: ["ops", "status", "index"],
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
	descriptor("ascet_index", "status", "public", ALL_PROFILES, {
		prompt: prompt("Inspect ASCET SQLite index readiness, per-area counts, stale areas, and footer sync.", {
			rules: [
				"Use ascet_index.status when the footer index state looks wrong or when search freshness is uncertain.",
				"status is local SQLite/status-file inspection and does not call live ASCET ToolAPI.",
				"Use detailLevel=areas for per-area counts; use detailLevel=full with includeScheduler=true for diagnostics.",
			],
			fewShots: [shot("index status", { action: "status", detailLevel: "areas" })],
			tags: ["ops", "index", "sqlite", "status"],
		}),
	}),
	descriptor("ascet_index", "refresh", "public", ALL_PROFILES, {
		prompt: prompt("Refresh one or more ASCET SQLite index areas through the serial live scheduler.", {
			rules: [
				"Use refresh when indexed search data must reflect current live ASCET state.",
				"Live refreshes are serial scheduler jobs; do not call raw warm_search_index directly.",
				'Use areas=["elements"] for declarations of element, areas=["code"] for text_in_code, and areas=["p0"] for complete startup index rebuild.',
			],
			fewShots: [
				shot("refresh elements", { action: "refresh", areas: ["elements"], mode: "foreground", force: true }),
			],
			tags: ["ops", "index", "refresh", "scheduler"],
		}),
	}),
	descriptor("ascet_index", "mark_stale", "public", ALL_PROFILES, {
		prompt: prompt("Mark selected SQLite index areas stale after manual ASCET UI edits or external changes.", {
			rules: [
				"Use mark_stale when the user confirms data changed outside PI and a live refresh is not being run immediately.",
				"mark_stale is local SQLite/status-file mutation and does not call live ASCET ToolAPI.",
			],
			fewShots: [shot("manual code edit", { action: "mark_stale", areas: ["code"], reason: "external_edit" })],
			tags: ["ops", "index", "stale"],
		}),
	}),
	descriptor("ascet_index", "repair_status_file", "public", ALL_PROFILES, {
		prompt: prompt("Repair .ascet/index/status.json from the active SQLite generation.", {
			rules: [
				"Use repair_status_file when SQLite is ready but the footer status is stale, checking, failed, or has a wrong totalDocs count.",
				"repair_status_file is local and does not rebuild live ASCET data.",
			],
			fewShots: [shot("repair footer", { action: "repair_status_file" })],
			tags: ["ops", "index", "footer"],
		}),
	}),
	descriptor("ascet_index", "evaluate", "public", ALL_PROFILES, {
		prompt: prompt("Run local ASCET SQLite index health checks and optional search smoke checks.", {
			rules: [
				"Use evaluate for test and diagnostics of index state; local checks do not call live ASCET.",
				"Use ascet_index.refresh for live rebuilds after evaluate reports stale or missing data.",
			],
			fewShots: [shot("evaluate index", { action: "evaluate", checks: ["status", "counts", "sidecar"] })],
			tags: ["ops", "index", "test"],
		}),
	}),
	descriptor("ascet_search", "search_components", "public", ALL_SEARCH_PROFILES, {
		requiresPartitions: ["components"],
		prompt: prompt("Find component candidates by name or folder scope before exact reads or writes.", {
			rules: [
				...searchPagingRules,
				"Use scopePath only for folder scopes like DEMO; use componentPath only for concrete components like DEMO/PID.",
				"Search candidate provider components recursively using bounded queries such as _Calibration, _Constant, Calibration, Constant, and parameter.",
			],
			fewShots: [
				shot("search components", {
					action: "search_components",
					query: "PID",
					scopePath: "DEMO",
					match: "contains",
					limit: 10,
				}),
			],
			tags: ["component", "index", "provider-discovery"],
		}),
	}),
	descriptor("ascet_search", "search_projects", "public", ALL_SEARCH_PROFILES, {
		requiresPartitions: ["components"],
		prompt: prompt("Find Project targets by name or folder scope before project formula reads, diffs, or writes.", {
			rules: [
				...searchPagingRules,
				"Use search_projects when the user needs project formulas but did not provide a projectPath.",
				"Project paths are served from the components/object index and returned with kind=project.",
			],
			fewShots: [
				shot("search projects", {
					action: "search_projects",
					query: "AEB",
					scopePath: "PlatformLibrary/Package",
					match: "contains",
					limit: 10,
				}),
			],
			tags: ["project", "formula", "index"],
		}),
	}),
	descriptor("ascet_search", "search_project_formulas", "public", ALL_SEARCH_PROFILES, {
		requiresPartitions: ["project_formulas"],
		prompt: prompt("Find Project formula declarations from the SQLite P0 index.", {
			rules: [
				...searchPagingRules,
				"Use search_project_formulas when the user asks where a Project formula is declared or whether a formula exists.",
				"Use projectPath when already known; otherwise call search_projects first.",
				"Use ascet_read.read_project_formulas for complete live formula definitions after selecting a projectPath.",
			],
			fewShots: [
				shot("search project formula", {
					action: "search_project_formulas",
					query: "RPM",
					projectPath: "PlatformLibrary/Package/AEB/AEB_Project",
					match: "exact",
					limit: 10,
				}),
			],
			tags: ["project", "formula", "index"],
		}),
	}),
	descriptor("ascet_search", "resolve_component", "public", ALL_SEARCH_PROFILES, {
		requiresPartitions: ["components"],
		prompt: prompt("Resolve one concrete componentPath for later read, reference, diff, verify, or write actions.", {
			rules: [
				"Use resolve_component when a later action needs one concrete componentPath.",
				"Before broad reference searches, narrow with resolve_component, search_components, componentPath, or scopePath whenever the user gave any component or folder clue.",
			],
			fewShots: [
				shot("resolve component", {
					action: "resolve_component",
					query: "PID",
					scopePath: "DEMO",
					match: "exact",
					limit: 5,
				}),
			],
			tags: ["component", "routing"],
		}),
	}),
	descriptor("ascet_search", "search_elements", "public", ALL_SEARCH_PROFILES, {
		requiresPartitions: ["element_decls"],
		prompt: prompt("Find element declarations by exact name or bounded contains search.", {
			rules: [
				...searchPagingRules,
				'For each candidate provider component, search_elements with match="exact" using the Imported Parameter name. The Imported Parameter and Exported Parameter must be same-named.',
				"Only scope=Exported search_elements results are valid provider candidates.",
				"Do not resolve provider ambiguity by name similarity alone.",
			],
			fewShots: [
				shot("search element", {
					action: "search_elements",
					query: "pid_kp",
					componentPath: "DEMO/PID",
					match: "exact",
					limit: 5,
				}),
			],
			tags: ["element", "provider-discovery"],
		}),
	}),
	descriptor("ascet_search", "declarations_of_element", "public", ALL_SEARCH_PROFILES, {
		requiresPartitions: ["element_decls"],
		prompt: prompt("Find declarations of a model element.", {
			rules: [...searchPagingRules, "Use this for the ASCET UI 'Declarations of element' quick-search behavior."],
			fewShots: [
				shot("declare element", {
					action: "declarations_of_element",
					query: "P_AEB_IB_MaxVelocityDrop_Curve",
					match: "exact",
					limit: 10,
				}),
			],
			tags: ["element", "quick-search"],
		}),
	}),
	descriptor("ascet_search", "declarations_of_method_process", "public", ALL_SEARCH_PROFILES, {
		requiresPartitions: ["method_decls"],
		prompt: prompt("Find declarations of ASCET methods or processes.", {
			rules: [
				...searchPagingRules,
				"Use this for the ASCET UI 'Declarations of method/process' quick-search behavior.",
			],
			fewShots: [
				shot("declare method", {
					action: "declarations_of_method_process",
					query: "calc",
					componentPath: "DEMO/PID",
					match: "contains",
					limit: 10,
				}),
			],
			tags: ["method", "process", "quick-search"],
		}),
	}),
	descriptor("ascet_search", "declarations_of_method_process_element", "public", ALL_SEARCH_PROFILES, {
		requiresPartitions: ["method_process_elements"],
		prompt: prompt("Find method/process argument, return, and local element declarations.", {
			rules: [
				...searchPagingRules,
				"Use methodName when the target method/process is already known.",
				"Use this for the ASCET UI 'Declarations of method/process element' quick-search behavior.",
			],
			fewShots: [
				shot("declare local", {
					action: "declarations_of_method_process_element",
					query: "tmp",
					componentPath: "DEMO/PID",
					methodName: "calc",
					limit: 10,
				}),
			],
			tags: ["method", "process", "element", "quick-search"],
		}),
	}),
	descriptor("ascet_search", "references_to_component", "public", ALL_SEARCH_PROFILES, {
		requiresPartitions: ["component_refs"],
		prompt: prompt("Search callers or referencing components for one component target.", {
			rules: [
				...searchPagingRules,
				"Use references_to_component for callers of a component.",
				"Unscoped reference searches can scan only a partial component page; truncated=true or searchComplete=false means the result is not exhaustive.",
			],
			fewShots: [
				shot("component refs", {
					action: "references_to_component",
					query: "AEB_pDriverIBooster",
					match: "exact",
					limit: 20,
				}),
			],
			tags: ["reference", "component", "index", "quick-search"],
		}),
	}),
	descriptor("ascet_search", "references_to_element", "public", ALL_SEARCH_PROFILES, {
		requiresPartitions: ["element_refs", "text_code"],
		prompt: prompt("Search element references using text and diagram reference indexes.", {
			rules: [
				...searchPagingRules,
				"Use references_to_element for references to an element.",
				"Do not claim an element has no references unless the relevant search result has searchComplete=true for the requested scope.",
			],
			fewShots: [
				shot("element refs", {
					action: "references_to_element",
					query: "pid_kp",
					componentPath: "DEMO/PID",
					limit: 10,
				}),
			],
			tags: ["reference", "element", "index", "quick-search"],
		}),
	}),
	descriptor("ascet_search", "senders_of_message", "public", ALL_SEARCH_PROFILES, {
		requiresPartitions: ["messages"],
		prompt: prompt("Find message sender declarations or references.", {
			rules: [...searchPagingRules, "Use this for the ASCET UI 'Senders of message' quick-search behavior."],
			fewShots: [
				shot("message senders", {
					action: "senders_of_message",
					query: "M_Request",
					scopePath: "DEMO",
					limit: 10,
				}),
			],
			tags: ["message", "quick-search"],
		}),
	}),
	descriptor("ascet_search", "receivers_of_message", "public", ALL_SEARCH_PROFILES, {
		requiresPartitions: ["messages"],
		prompt: prompt("Find message receiver declarations or references.", {
			rules: [...searchPagingRules, "Use this for the ASCET UI 'Receivers of message' quick-search behavior."],
			fewShots: [
				shot("message receivers", {
					action: "receivers_of_message",
					query: "M_Request",
					scopePath: "DEMO",
					limit: 10,
				}),
			],
			tags: ["message", "quick-search"],
		}),
	}),
	descriptor("ascet_search", "text_in_code", "public", ALL_SEARCH_PROFILES, {
		requiresPartitions: ["text_code"],
		prompt: prompt("Search indexed ESDL/C snippets; this does not read complete code.", {
			rules: [
				...searchPagingRules,
				"Use text_in_code for ESDL or C text snippets and occurrence discovery.",
				"text_in_code returns matching snippets with component, section, line, and snippet evidence; use ascet_read.read_code for complete live code.",
				"Do not claim no text occurrences unless searchComplete=true for the requested scope.",
			],
			fewShots: [
				shot("search code text", {
					action: "text_in_code",
					query: "C_AEB.getAt",
					componentPath: "DEMO/PID",
					limit: 10,
				}),
			],
			tags: ["text", "code", "index", "quick-search"],
		}),
	}),
	descriptor("ascet_search", "search_occurrences", "internal", ALL_SEARCH_PROFILES, {
		deprecatedBy: "ascet_search.references_to_element",
		prompt: prompt("Legacy internal occurrence search route.", {
			rules: ["Hidden legacy action; use references_to_component, references_to_element, or text_in_code instead."],
			tags: ["hidden", "legacy"],
			hidden: true,
		}),
	}),
	descriptor("ascet_search", "search_text_code", "internal", ALL_SEARCH_PROFILES, {
		deprecatedBy: "ascet_search.text_in_code",
		prompt: prompt("Legacy internal text-code search route.", {
			rules: ["Hidden legacy action; use text_in_code instead."],
			tags: ["hidden", "legacy"],
			hidden: true,
		}),
	}),
	descriptor("ascet_read", "read_code", "public", READ_PROFILES, {
		prompt: prompt("Read complete code live from ASCET only after resolving the target.", {
			rules: [
				'Use read_code when the user explicitly needs live code; it returns complete live text by default. Use detailLevel="summary" only when a hash/count summary is enough.',
				"Use read_code section=header or external-c only for C module targets; for ESDL class/module method code pass methodName with section=body or all.",
				"read_code is a live ToolAPI read, not a search-index text lookup.",
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
	descriptor("ascet_read", "read_project_formulas", "public", READ_PROFILES, {
		prompt: prompt("Read project formulas live from ASCET for one resolved Project target.", {
			rules: [
				"Use search_projects first when projectPath is unknown.",
				"Use read_project_formulas only for Project targets; it is not element dependency formula readback.",
			],
			fewShots: [
				shot("read project formulas", {
					action: "read_project_formulas",
					projectPath: "DEMO/Project",
				}),
			],
			tags: ["project", "formula", "live-read"],
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
			"Live-mapping-first dependency provider resolver for Local Parameter -> Imported Parameter -> Exported Parameter chains.",
			{
				rules: [
					"Use read_dependent_chain when the user asks which exported or global parameter a local dependent parameter depends on.",
					"Provider discovery first trusts live dependency formula/mapping and explicit export owner; element_decls is the bounded fallback. scope=Exported is required for a valid provider.",
					"Returned element.data is full live element metadata for the exported provider when detailLevel=full.",
					"The formula reported by read_dependent_chain is the local dependent parameter expression, not an implementation conversion formula or project formula.",
					"Dependent parameter provider discovery is a coordinated workflow: call read_dependent_chain first, then coordinate ascet_search and ascet_explore if discovery is incomplete.",
					"The Imported Parameter in the consuming component and the Exported Parameter in the provider component must have the same name.",
					"Only scope=Exported elements are valid provider candidates.",
					"The Local Dependent Parameter may have a different name; use formula or mapping references to find imported parameter names.",
					"If provider discovery is incomplete or ambiguous, coordinate ascet_search and ascet_explore before concluding.",
					"After selecting a provider candidate, call read_dependent_chain again with exporterComponentPath as a verification constraint.",
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
	descriptor("ascet_read", "read", "internal", READ_PROFILES, {
		deprecatedBy: "ascet_read.read_code",
		prompt: prompt("Legacy internal summary read route.", {
			rules: ["Hidden legacy action; use read_code, explicit ascet_read actions, or verify readback instead."],
			tags: ["hidden", "legacy"],
			hidden: true,
		}),
	}),
	descriptor("ascet_explore", "list_components", "public", READ_PROFILES, {
		prompt: prompt("Browse ASCET folders and typed database items after a scope is known.", {
			rules: [
				"Use list_components to browse direct or recursive folder contents and filter by component kind or languageKind.",
				"For dependent-parameter provider discovery, use list_components recursively from the feature scope when parameter classes may be nested under _Calibration, _Constant, or other parameter folders.",
			],
			fewShots: [
				shot("browse folder", {
					action: "list_components",
					folderPath: "DEMO",
					kind: "all",
					limit: 20,
				}),
			],
			tags: ["navigation", "component"],
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
				shot("preflight folder", { action: "create_folder", folderPath: "DEMO/New", verifyReadback: true }),
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
					componentPath: "DEMO/C",
					kind: "class",
					language: "ESDL",
					verifyReadback: true,
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
					verifyReadback: true,
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
					verifyReadback: true,
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
					verifyReadback: true,
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
					verifyReadback: true,
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
					verifyReadback: true,
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
					verifyReadback: true,
				}),
			],
			tags: ["write", "enumeration"],
		}),
	}),
	descriptor("ascet_edit", "apply_element_spec", "public", WRITE_PROFILES, {
		prompt: prompt("Apply structured primitive element specs from evidence, not guesses.", {
			rules: [...writePreflightRules, ...elementSpecRules],
			fewShots: [
				shot("apply spec", {
					action: "apply_element_spec",
					componentPath: "DEMO/PID",
					specFile: "spec.json",
					mode: "restore",
					verifyReadback: true,
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
				"Successful executed writes refreshes element_decls and full_element_cache from live element-catalog readback.",
				"If index refresh fails after a successful write, follow index.issues; the write result can still be valid.",
			],
			fewShots: [
				shot("set dependency", {
					action: "set_element_dependency",
					targetPath: "F/C",
					elementName: "K",
					dependency: "dependent",
					verifyReadback: true,
					executeWrite: true,
				}),
			],
			tags: ["write", "dependency", "provider-discovery"],
		}),
	}),
	descriptor("ascet_verify", "readback", "public", VERIFY_PROFILES, {
		prompt: prompt("Verify ASCET readback after writes or when checking live state.", {
			rules: [
				"Use componentPath for class, module, or state-machine readback; use projectPath only when objectKind=project.",
			],
			fewShots: [
				shot("verify class", {
					action: "readback",
					objectKind: "class",
					componentPath: "DEMO/PID",
				}),
			],
			tags: ["verify", "readback"],
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
	descriptor("ascet_scheduler_status", "status", "public", ["verify", "write-preflight", "batch-write", "ops"], {
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
		requiresPartitions: item.requiresPartitions ? [...item.requiresPartitions] : undefined,
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
