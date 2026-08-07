import { ascetBatchWriteTool } from "./batch-write/index.ts";
import { ascetCapabilitiesTool } from "./capabilities/index.ts";
import { ascetDiffTool } from "./diff/index.ts";
import { ascetEditTool } from "./edit/index.ts";
import { ascetGetTool } from "./get/index.ts";
import { ascetReadTool } from "./read/index.ts";
import { ascetRecoverTool } from "./recover/index.ts";
import { ascetSchedulerStatusTool } from "./scheduler-status/index.ts";
import { ascetStatusTool } from "./status/index.ts";
import { ascetVerifyTool } from "./verify/index.ts";

export const canonicalOpsTools = [
	ascetStatusTool,
	ascetCapabilitiesTool,
	ascetRecoverTool,
	ascetSchedulerStatusTool,
] as const;

export const canonicalDomainTools = [
	ascetGetTool,
	ascetReadTool,
	ascetDiffTool,
	ascetEditTool,
	ascetVerifyTool,
] as const;

export const canonicalAscetToolNames = [
	"ascet_status",
	"ascet_capabilities",
	"ascet_recover",
	"ascet_scheduler_status",
	"ascet_get",
	"ascet_read",
	"ascet_diff",
	"ascet_edit",
	"ascet_verify",
] as const;

export const canonicalAscetTools = [...canonicalOpsTools, ...canonicalDomainTools] as const;
export const hiddenAscetTools = [ascetBatchWriteTool] as const;
export const allAscetTools = [...canonicalAscetTools, ...hiddenAscetTools] as const;
export const allAscetToolNames = [...canonicalAscetToolNames, "ascet_batch_write"] as const;
export const allAscetToolNameSet = new Set<string>(allAscetToolNames);

for (const [index, tool] of canonicalAscetTools.entries()) {
	if (tool.name !== canonicalAscetToolNames[index]) {
		throw new Error(`ASCET canonical tool order mismatch: ${tool.name}`);
	}
}
