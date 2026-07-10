import { ascetRouteEntries } from "./route-manifests.ts";

export type AscetCliCoverageCategory =
	| "exposed_by_canonical_tool"
	| "backend_alias"
	| "internal_only"
	| "unsupported_with_reason";

export interface AscetCliCoverageEntry {
	commandId: string;
	category: AscetCliCoverageCategory;
	reason: string;
	toolName?: string;
	action?: string;
	logicalCommandId?: string;
}

const backendAliasCoverage: Record<string, Omit<AscetCliCoverageEntry, "commandId">> = {
	AscetReadTextCode: {
		category: "backend_alias",
		reason: "Backend implementation for model-facing logical command AscetReadCode.",
		toolName: "ascet_read",
		action: "read_code",
		logicalCommandId: "AscetReadCode",
	},
};

const parameterizedCanonicalCoverage: Record<string, Omit<AscetCliCoverageEntry, "commandId">> = {
	AscetDiffClass: {
		category: "exposed_by_canonical_tool",
		reason: "Covered by ascet_diff action=diff with objectKind=class.",
		toolName: "ascet_diff",
		action: "diff",
	},
	AscetDiffModule: {
		category: "exposed_by_canonical_tool",
		reason: "Covered by ascet_diff action=diff with objectKind=module.",
		toolName: "ascet_diff",
		action: "diff",
	},
	AscetDiffStateMachine: {
		category: "exposed_by_canonical_tool",
		reason: "Covered by ascet_diff action=diff with objectKind=statemachine.",
		toolName: "ascet_diff",
		action: "diff",
	},
	AscetReadClassSummary: {
		category: "exposed_by_canonical_tool",
		reason: "Covered by ascet_verify readback and ascet_read summary routing for class targets.",
		toolName: "ascet_verify",
		action: "readback",
	},
	AscetReadModuleSummary: {
		category: "exposed_by_canonical_tool",
		reason: "Covered by ascet_verify readback and ascet_read summary routing for module targets.",
		toolName: "ascet_verify",
		action: "readback",
	},
	AscetReadStateMachineSummary: {
		category: "exposed_by_canonical_tool",
		reason: "Covered by ascet_verify readback and ascet_read summary routing for state-machine targets.",
		toolName: "ascet_verify",
		action: "readback",
	},
	AscetReadMethodCode: {
		category: "exposed_by_canonical_tool",
		reason: "Covered by ascet_read action=read with methodName.",
		toolName: "ascet_read",
		action: "read",
	},
};

const unsupportedCoverage: Record<string, Omit<AscetCliCoverageEntry, "commandId">> = {
	AscetFindElements: {
		category: "unsupported_with_reason",
		reason: "Search-facing flows use AscetSearchElements; find_elements is not exposed as a canonical model action.",
	},
	AscetListFolders: {
		category: "unsupported_with_reason",
		reason: "Copilot-aligned AscetExploreTool intentionally omits list_folders from the model-facing action matrix.",
	},
	AscetListMethods: {
		category: "unsupported_with_reason",
		reason: "Method discovery is covered through ascet_explore preview_children and ascet_read flows.",
	},
	AscetReadClassSnapshot: {
		category: "unsupported_with_reason",
		reason: "Snapshot-specific reads are not part of the canonical Copilot action matrix.",
	},
	AscetReadComponentCode: {
		category: "unsupported_with_reason",
		reason: "Model-facing code reads use AscetReadCode backed by AscetReadTextCode.",
	},
	AscetReadComponentSnapshot: {
		category: "unsupported_with_reason",
		reason: "Snapshot-specific reads are not part of the canonical Copilot action matrix.",
	},
	AscetReadElementCatalog: {
		category: "unsupported_with_reason",
		reason: "Element inventory is covered through ascet_explore preview_children or ascet_search search_elements.",
	},
	AscetReadModuleClosure: {
		category: "unsupported_with_reason",
		reason: "Closure reads are not part of the canonical Copilot action matrix.",
	},
	AscetReadModuleSnapshot: {
		category: "unsupported_with_reason",
		reason: "Snapshot-specific reads are not part of the canonical Copilot action matrix.",
	},
	AscetReadProjectFormulas: {
		category: "exposed_by_canonical_tool",
		reason: "Covered by ascet_verify readback for project targets.",
		toolName: "ascet_verify",
		action: "readback",
	},
	AscetReadReferences: {
		category: "unsupported_with_reason",
		reason: "Reference flows use ascet_reference component_refs, used_by, and element_refs actions.",
	},
	AscetReadStateMachine: {
		category: "unsupported_with_reason",
		reason: "State-machine details are covered through ascet_read read_state_machine_flow.",
	},
	AscetReadStateMachineSnapshot: {
		category: "unsupported_with_reason",
		reason: "Snapshot-specific reads are not part of the canonical Copilot action matrix.",
	},
	AscetShowOccurrences: {
		category: "unsupported_with_reason",
		reason: "Occurrence flows use ascet_search search_occurrences.",
	},
};

const internalCoverage: Record<string, Omit<AscetCliCoverageEntry, "commandId">> = {
	AscetBenchmark: {
		category: "internal_only",
		reason: "Operational benchmark command; not model-facing.",
	},
	AscetSelfTest: {
		category: "internal_only",
		reason: "Operational self-test command; not model-facing.",
	},
	AscetOrchestrator: {
		category: "internal_only",
		reason: "ASCET runtime orchestration command; not model-facing.",
	},
	AscetThreadHarness: {
		category: "internal_only",
		reason: "ASCET runtime thread harness command; not model-facing.",
	},
	AscetWorker: {
		category: "internal_only",
		reason: "ASCET worker process command; not model-facing.",
	},
	AscetReadHost: {
		category: "internal_only",
		reason: "ASCET host process command; not model-facing.",
	},
	AscetBackendPoolDemo: {
		category: "internal_only",
		reason: "ASCET backend pool diagnostic demo; not model-facing.",
	},
	AscetReadDomainDeepCheck: {
		category: "internal_only",
		reason: "ASCET domain diagnostic command; not model-facing.",
	},
	AscetReadDomainQuickCheck: {
		category: "internal_only",
		reason: "ASCET domain diagnostic command; not model-facing.",
	},
	AscetReadDomainSmoke: {
		category: "internal_only",
		reason: "ASCET domain smoke command; not model-facing.",
	},
	AscetReadOnlyExample: {
		category: "internal_only",
		reason: "ASCET example command; not model-facing.",
	},
};

const directRouteCoverage = new Map(
	ascetRouteEntries
		.filter((route) => !route.logicalCommandId.startsWith("PiAscet"))
		.map((route) => [
			route.backendCommandId,
			{
				category: "exposed_by_canonical_tool" as const,
				reason: `Covered by ${route.toolName} action=${route.action}.`,
				toolName: route.toolName,
				action: route.action,
				logicalCommandId: route.logicalCommandId,
			},
		]),
);

export function classifyAscetCliCommand(commandId: string): AscetCliCoverageEntry {
	const coverage =
		backendAliasCoverage[commandId] ??
		parameterizedCanonicalCoverage[commandId] ??
		directRouteCoverage.get(commandId) ??
		internalCoverage[commandId] ??
		unsupportedCoverage[commandId];
	if (!coverage) {
		return {
			commandId,
			category: "unsupported_with_reason",
			reason: "No canonical PI tool route is currently defined for this ASCET CLI command.",
		};
	}
	return { commandId, ...coverage };
}
