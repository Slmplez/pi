import { ascetBatchWriteTool } from "./batch-write/index.ts";
import { ascetBrowseTool } from "./browse/index.ts";
import { ascetCapabilitiesTool } from "./capabilities/index.ts";
import { ascetCompareTool } from "./compare/index.ts";
import { ascetInspectTool } from "./inspect/index.ts";
import { ascetReadCodeTool } from "./read-code/index.ts";
import { ascetRecoverTool } from "./recover/index.ts";
import { ascetReferencesTool } from "./references/index.ts";
import { ascetResolveTool } from "./resolve/index.ts";
import { ascetSchedulerStatusTool } from "./scheduler-status/index.ts";
import { ascetSearchTool } from "./search/index.ts";
import { ascetStatusTool } from "./status/index.ts";
import { ascetVerifyTool } from "./verify/index.ts";
import { ascetWriteTool } from "./write/index.ts";

export const canonicalAscetToolNames = [
	"ascet_status",
	"ascet_capabilities",
	"ascet_recover",
	"ascet_scheduler_status",
	"ascet_browse",
	"ascet_search",
	"ascet_resolve",
	"ascet_inspect",
	"ascet_read_code",
	"ascet_references",
	"ascet_compare",
	"ascet_write",
	"ascet_verify",
	"ascet_batch_write",
] as const;

export const canonicalAscetTools = [
	ascetStatusTool,
	ascetCapabilitiesTool,
	ascetRecoverTool,
	ascetSchedulerStatusTool,
	ascetBrowseTool,
	ascetSearchTool,
	ascetResolveTool,
	ascetInspectTool,
	ascetReadCodeTool,
	ascetReferencesTool,
	ascetCompareTool,
	ascetWriteTool,
	ascetVerifyTool,
	ascetBatchWriteTool,
] as const;

for (const [index, tool] of canonicalAscetTools.entries()) {
	if (tool.name !== canonicalAscetToolNames[index]) {
		throw new Error(`ASCET canonical tool order mismatch: ${tool.name}`);
	}
}
