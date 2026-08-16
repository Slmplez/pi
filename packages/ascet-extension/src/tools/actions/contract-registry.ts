import { ascetBatchActionContracts } from "./contracts/batch.ts";
import { ascetDependencyActionContracts } from "./contracts/dependency.ts";
import { ascetDiffActionContracts } from "./contracts/diff.ts";
import { ascetEditActionContracts } from "./contracts/edit.ts";
import { ascetGetActionContracts } from "./contracts/get.ts";
import { ascetOpsActionContracts } from "./contracts/ops.ts";
import { ascetReadActionContracts } from "./contracts/read.ts";
import { ascetSearchActionContracts } from "./contracts/search.ts";
import type { AscetActionContract } from "./contracts/types.ts";

const ascetActionContracts = [
	...ascetSearchActionContracts,
	...ascetGetActionContracts,
	...ascetDependencyActionContracts,
	...ascetReadActionContracts,
	...ascetDiffActionContracts,
	...ascetEditActionContracts,
	...ascetOpsActionContracts,
	...ascetBatchActionContracts,
] as const;
const contractById = new Map<string, AscetActionContract>();
const contractsByTool = new Map<string, AscetActionContract[]>();

for (const contract of ascetActionContracts) {
	if (contractById.has(contract.id)) {
		throw new Error(`Duplicate ASCET action contract: ${contract.id}`);
	}
	contractById.set(contract.id, contract);
	const toolContracts = contractsByTool.get(contract.tool) ?? [];
	toolContracts.push(contract);
	contractsByTool.set(contract.tool, toolContracts);
}

export function listAscetActionContracts(): readonly AscetActionContract[] {
	return ascetActionContracts;
}

export function listAscetActionContractsForTool(tool: string): readonly AscetActionContract[] {
	return contractsByTool.get(tool) ?? [];
}

export function getAscetActionContract(tool: string, action: string): AscetActionContract | undefined {
	return contractById.get(`${tool}.${action}`);
}
