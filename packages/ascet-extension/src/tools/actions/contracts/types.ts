import type { TSchema } from "typebox";
import type { AscetProfile } from "../../exposure/profiles.ts";

export type AscetActionVisibility = "public" | "internal" | "hidden";
export type AscetActionSelector = "action" | "mode" | "operation" | "fixed";
export type AscetObjectKind = "database" | "project" | "folder" | "class" | "module" | "statemachine" | "enumeration";

export interface AscetActionFewShot {
	variant?: string;
	intent: string;
	args: Record<string, unknown>;
}

export interface AscetActionGuidance {
	summary: string;
	compact?: string;
	intent?: string;
	result?: { shape: string; fields: readonly string[] };
	rules?: readonly string[];
	fewShots?: readonly AscetActionFewShot[];
	tags?: readonly string[];
	aliases?: readonly string[];
	useWhen?: readonly string[];
	avoidWhen?: readonly string[];
	nextActions?: readonly string[];
	hidden?: boolean;
}

export interface AscetBridgeRouteVariant {
	when?: Readonly<Record<string, string>>;
	logicalCommandId: string;
	operation: string;
}

export type AscetActionExecution =
	| {
			kind: "bridge";
			logicalCommandId: string;
			operation: string;
			variants?: readonly AscetBridgeRouteVariant[];
	  }
	| { kind: "native-search" }
	| { kind: "local"; logicalCommandId: string; operation: string; category: "ops" | "domain" };

export interface AscetActionContract {
	id: string;
	tool: string;
	action: string;
	selector: AscetActionSelector;
	visibility: AscetActionVisibility;
	profiles: readonly AscetProfile[];
	featureFlag?: string;
	deprecatedBy?: string;
	supportedObjectKinds?: readonly AscetObjectKind[];
	parameters: TSchema;
	result: TSchema;
	execution: AscetActionExecution;
	guidance?: AscetActionGuidance;
}

export function defineAscetAction<const T extends Omit<AscetActionContract, "id">>(
	contract: T,
): T & { id: `${T["tool"]}.${T["action"]}` } {
	return {
		...contract,
		id: `${contract.tool}.${contract.action}`,
	} as T & { id: `${T["tool"]}.${T["action"]}` };
}
