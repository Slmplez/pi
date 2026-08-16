import type { AscetProfile } from "../exposure/profiles.ts";
import { listAscetActionContracts } from "./contract-registry.ts";

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

function descriptorFromContract(contract: ReturnType<typeof listAscetActionContracts>[number]): AscetActionDescriptor {
	return {
		id: contract.id,
		tool: contract.tool,
		action: contract.action,
		visibility: contract.visibility,
		profiles: contract.profiles,
		featureFlag: contract.featureFlag,
		deprecatedBy: contract.deprecatedBy,
		supportedObjectKinds: contract.supportedObjectKinds,
		prompt: contract.guidance
			? {
					summary: contract.guidance.summary,
					rules: contract.guidance.rules,
					fewShots: contract.guidance.fewShots,
					tags: contract.guidance.tags,
					hidden: contract.guidance.hidden,
				}
			: undefined,
	};
}

export const ascetActionCatalog: readonly AscetActionDescriptor[] = [
	...listAscetActionContracts().map(descriptorFromContract),
];

export const ascetActionDescriptors = ascetActionCatalog;

const descriptorById = new Map(ascetActionCatalog.map((item) => [item.id, item]));

export function getActionDescriptor(tool: string, action: string): AscetActionDescriptor | undefined {
	return descriptorById.get(`${tool}.${action}`);
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
