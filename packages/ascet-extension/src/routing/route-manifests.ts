import { ascetBatchActionContracts } from "../tools/actions/contracts/batch.ts";
import { ascetDependencyActionContracts } from "../tools/actions/contracts/dependency.ts";
import { ascetDiffActionContracts } from "../tools/actions/contracts/diff.ts";
import { ascetEditActionContracts } from "../tools/actions/contracts/edit.ts";
import { ascetGetActionContracts } from "../tools/actions/contracts/get.ts";
import { ascetOpsActionContracts } from "../tools/actions/contracts/ops.ts";
import { ascetReadActionContracts } from "../tools/actions/contracts/read.ts";
import type { AscetActionContract } from "../tools/actions/contracts/types.ts";
import { resolveAscetBackendCommandId } from "./command-aliases.ts";

export type AscetRouteCategory = "domain" | "ops";

export interface AscetRouteManifestEntry {
	toolName: string;
	action: string;
	logicalCommandId: string;
	operation: string;
	category: AscetRouteCategory;
	when?: Readonly<Record<string, string>>;
}

export interface AscetRouteEntry extends AscetRouteManifestEntry {
	backendCommandId: string;
}

function toRouteManifestEntries(contracts: readonly AscetActionContract[]): AscetRouteManifestEntry[] {
	return contracts.flatMap((contract) => {
		if (contract.execution.kind === "native-search") return [];
		const base = {
			toolName: contract.tool,
			action: contract.action,
			category: contract.execution.kind === "local" ? contract.execution.category : ("domain" as const),
		};
		return [
			...(contract.execution.kind === "bridge" ? (contract.execution.variants ?? []) : []).map((variant) => ({
				...base,
				logicalCommandId: variant.logicalCommandId,
				operation: variant.operation,
				when: variant.when,
			})),
			{
				...base,
				logicalCommandId: contract.execution.logicalCommandId,
				operation: contract.execution.operation,
			},
		];
	});
}

const ascetBatchRouteManifestEntries = toRouteManifestEntries(ascetBatchActionContracts);
const ascetOpsRouteManifestEntries = toRouteManifestEntries(ascetOpsActionContracts);
const ascetGetRouteManifestEntries = toRouteManifestEntries(ascetGetActionContracts);
const ascetDiffRouteManifestEntries = toRouteManifestEntries(ascetDiffActionContracts);
const ascetEditRouteManifestEntries = toRouteManifestEntries(ascetEditActionContracts);
const ascetReadRouteManifestEntries = toRouteManifestEntries([
	...ascetReadActionContracts,
	...ascetDependencyActionContracts.filter((contract) => contract.tool === "ascet_read"),
]);
const ascetDependencyEditRouteManifestEntries = toRouteManifestEntries(
	ascetDependencyActionContracts.filter((contract) => contract.tool === "ascet_edit"),
);

export const ascetRouteManifestEntries = [
	...ascetOpsRouteManifestEntries,
	...ascetBatchRouteManifestEntries,

	...ascetGetRouteManifestEntries,

	...ascetReadRouteManifestEntries,

	...ascetDiffRouteManifestEntries,

	...ascetEditRouteManifestEntries,

	...ascetDependencyEditRouteManifestEntries,
] as const satisfies readonly AscetRouteManifestEntry[];

export const ascetRouteEntries = ascetRouteManifestEntries.map((entry) => ({
	...entry,
	backendCommandId: resolveAscetBackendCommandId(entry.logicalCommandId),
})) as readonly AscetRouteEntry[];
