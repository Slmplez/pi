import { ascetBatchWriteTool } from "./batch-write/index.ts";
import { ascetCapabilitiesTool } from "./capabilities/index.ts";
import { ascetDiffTool } from "./diff/index.ts";
import { ascetEditTool } from "./edit/index.ts";
import { ascetGetTool } from "./get/index.ts";
import { ascetReadTool } from "./read/index.ts";
import { ascetRecoverTool } from "./recover/index.ts";
import { ascetSchedulerStatusTool } from "./scheduler-status/index.ts";
import { ascetSearchTool } from "./search/index.ts";
import { ascetStatusTool } from "./status/index.ts";

function registryKeys<const T extends Readonly<Record<string, unknown>>>(registry: T): Array<keyof T & string> {
	return Object.keys(registry) as Array<keyof T & string>;
}

const canonicalOpsToolRegistry = {
	ascet_status: ascetStatusTool,
	ascet_capabilities: ascetCapabilitiesTool,
	ascet_recover: ascetRecoverTool,
	ascet_scheduler_status: ascetSchedulerStatusTool,
} as const;

const canonicalDomainToolRegistry = {
	ascet_search: ascetSearchTool,
	ascet_get: ascetGetTool,
	ascet_read: ascetReadTool,
	ascet_diff: ascetDiffTool,
	ascet_edit: ascetEditTool,
} as const;

const hiddenAscetToolRegistry = {
	ascet_batch_write: ascetBatchWriteTool,
} as const;

const canonicalAscetToolRegistry = {
	...canonicalOpsToolRegistry,
	...canonicalDomainToolRegistry,
} as const;
const allAscetToolRegistry = {
	...canonicalAscetToolRegistry,
	...hiddenAscetToolRegistry,
} as const;

for (const [name, tool] of Object.entries(allAscetToolRegistry)) {
	if (tool.name !== name) {
		throw new Error(`ASCET tool registry name mismatch: ${name} != ${tool.name}`);
	}
}

export const canonicalOpsTools = Object.values(canonicalOpsToolRegistry);
export const canonicalDomainTools = Object.values(canonicalDomainToolRegistry);
export const canonicalAscetTools = Object.values(canonicalAscetToolRegistry);
export const hiddenAscetTools = Object.values(hiddenAscetToolRegistry);
export const allAscetTools = Object.values(allAscetToolRegistry);

export const canonicalAscetToolNames = registryKeys(canonicalAscetToolRegistry);
export const allAscetToolNames = registryKeys(allAscetToolRegistry);
export const allAscetToolNameSet = new Set<string>(allAscetToolNames);
