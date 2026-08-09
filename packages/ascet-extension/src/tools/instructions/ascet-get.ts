import type { AscetActionInstruction } from "./types.ts";

export const ascetGetInstructions = [
	{
		id: "ascet_get.tree",
		tool: "ascet_get",
		action: "tree",
		profiles: ["base", "advanced-read", "reference", "write-preflight"],
		summary:
			"Navigate a bounded ASCET folder, Project, and Component tree without element, reference, or code payloads.",
		rules: [
			"Use tree first for discovery. Supply target.path, target.oid, or target.targetPathPrefix and a traversal.depth that is only as broad as the task needs.",
			"Keep a returned OID with its path. Prefer the OID for a later exact identity; retain the path for user-visible scope and diagnostics.",
		],
		fewShots: [
			'ascet_get({action:"tree",target:{targetPathPrefix:"PlatformLibrary\\Package\\SCM_SecondaryCollisionMitigation"},traversal:{depth:2}})',
		],
		tags: ["navigation", "tree", "live-read"],
	},
	{
		id: "ascet_get.database_catalog",
		tool: "ascet_get",
		action: "database_catalog",
		profiles: ["base", "advanced-read", "reference", "write-preflight"],
		summary:
			"Build a stored full-database Catalog for selected Parameter Class, Enumeration, Module, and Message object types.",
		rules: [
			"First create a complete unbounded tree with delivery='stored', then pass its resultId as sourceTreeResultId. Bounded, partial, or truncated Tree observations are rejected.",
			"The required include array controls both scanning and output types. Enumeration and Module-only requests use the stored Tree locally; Parameter Class and Message requests perform one combined live scan.",
			"Use Pi find, grep, and read against returned NDJSON artifacts. Use an exact path or OID from the Catalog with ascet_read only when deeper live evidence is required.",
		],
		fewShots: [
			'ascet_get({action:"database_catalog",sourceTreeResultId:"obs-tree-...",include:["module","enumeration"],delivery:"stored"})',
		],
		tags: ["catalog", "database", "stored-read"],
	},
	{
		id: "ascet_get.elements",
		tool: "ascet_get",
		action: "elements",
		profiles: ["base", "advanced-read", "reference", "write-preflight"],
		summary: "Read the complete Element directory for a selected Component or bounded Folder scope.",
		rules: [
			"Use elements only after tree resolves the target. Filter by elementName or filters.name/scope when known; do not request an artificial item limit.",
			"For stored observations, use Pi grep/read to locate a matching name and scope before an exact deep read or write preflight.",
		],
		fewShots: [
			'ascet_get({action:"elements",target:{path:"Feature\\Consumer"},filters:{scope:["imported","exported"]}})',
		],
		tags: ["element", "directory", "live-read"],
	},
	{
		id: "ascet_get.formulas",
		tool: "ascet_get",
		action: "formulas",
		profiles: ["base", "advanced-read", "reference", "write-preflight"],
		summary: "Read complete Project formula definitions and parameter metadata for one selected Project.",
		rules: [
			"Resolve the Project with tree, then call formulas with its exact path or OID. Do not use a separate project-formula read action.",
			"Formula content may be stored as an observation; use Pi find/grep/read to inspect only the relevant definition.",
		],
		fewShots: ['ascet_get({action:"formulas",target:{path:"Feature\\Project"}})'],
		tags: ["project", "formula", "live-read"],
	},
	{
		id: "ascet_get.component_refs",
		tool: "ascet_get",
		action: "component_refs",
		profiles: ["base", "advanced-read", "reference"],
		summary: "Read outgoing Component references without loading code or implementation payloads.",
		rules: [
			"Use component_refs for a selected Component and treat it as outgoing-only evidence.",
			"Use returned paths/OIDs to make the next bounded tree or elements request; do not infer an exhaustive reverse-reference search.",
		],
		fewShots: ['ascet_get({action:"component_refs",target:{path:"Feature\\Consumer"}})'],
		tags: ["reference", "component", "live-read"],
	},
	{
		id: "ascet_get.bde_edges",
		tool: "ascet_get",
		action: "bde_edges",
		profiles: ["advanced-read", "reference"],
		summary: "Read BDE/block-diagram signal edges for a selected Class or Module and optional diagram name.",
		rules: [
			"Use bde_edges after tree resolves the Class/Module. Use diagramName only when the desired diagram is known.",
			"Use ascet_read only when BDE edges do not provide the precise diagram detail the task requires.",
		],
		fewShots: ['ascet_get({action:"bde_edges",target:{path:"Feature\\Controller"}})'],
		tags: ["bde", "diagram", "live-read"],
	},
	{
		id: "ascet_get.import_binding",
		tool: "ascet_get",
		action: "import_binding",
		profiles: ["base", "advanced-read", "reference", "write-preflight"],
		summary: "Validate one exact Imported Element binding against an explicitly identified provider.",
		rules: [
			"Call import_binding only after tree/elements observations identify the consumer, Imported Element, and provider path or OID.",
			"This action validates a candidate; it does not discover or rank provider candidates.",
		],
		fewShots: [
			'ascet_get({action:"import_binding",target:{path:"Feature\\Consumer"},elementName:"K_Input",provider:{path:"Feature\\Calibration"}})',
		],
		tags: ["reference", "binding", "provider", "live-read"],
	},
	{
		id: "ascet_get.dbitem_refs",
		tool: "ascet_get",
		action: "dbitem_refs",
		profiles: ["base", "advanced-read", "reference"],
		summary: "Read outgoing DataBaseItem references for one exact ASCET object.",
		rules: [
			"Use dbitem_refs for an exact Component, Element, or other DataBaseItem selected from prior Get output.",
			"Treat the response as outgoing-only reference evidence and retain the target OID in the evidence record.",
		],
		fewShots: ['ascet_get({action:"dbitem_refs",target:{oid:"component-or-element-oid"}})'],
		tags: ["reference", "database-item", "live-read"],
	},
] as const satisfies readonly AscetActionInstruction[];
