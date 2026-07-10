import { type AscetRouteEntry, ascetRouteEntries } from "./route-manifests.ts";

export interface AscetRouteRequest {
	toolName: string;
	action: string;
	objectKind?: string;
}

export interface AscetRouteResult extends AscetRouteEntry {
	confidence: number;
	reason: string;
}

export function routeAscetAction(request: AscetRouteRequest): AscetRouteResult {
	if (request.toolName === "ascet_diff" && request.action === "diff") {
		const objectKindRoute = routeAscetDiffObjectKind(request.objectKind);
		if (objectKindRoute) {
			return objectKindRoute;
		}
	}
	const route = ascetRouteEntries.find(
		(entry) => entry.toolName === request.toolName && entry.action === request.action,
	);
	if (!route) {
		throw new Error(`Unsupported ASCET route: ${request.toolName}/${request.action}`);
	}
	return {
		...route,
		confidence: 0.98,
		reason: `Mapped ${request.toolName}.${request.action} to ${route.logicalCommandId}`,
	};
}

function routeAscetDiffObjectKind(objectKind: string | undefined): AscetRouteResult | undefined {
	const byKind: Record<string, { logicalCommandId: string; operation: string }> = {
		class: { logicalCommandId: "AscetDiffClass", operation: "diff_class" },
		module: { logicalCommandId: "AscetDiffModule", operation: "diff_module" },
		statemachine: { logicalCommandId: "AscetDiffStateMachine", operation: "diff_state_machine" },
	};
	const route = objectKind ? byKind[objectKind] : undefined;
	if (!route) {
		return undefined;
	}
	return {
		toolName: "ascet_diff",
		action: "diff",
		category: "domain",
		backendCommandId: route.logicalCommandId,
		...route,
		confidence: 0.98,
		reason: `Mapped ascet_diff.diff objectKind=${objectKind} to ${route.logicalCommandId}`,
	};
}

export function listAscetRoutes(): readonly AscetRouteEntry[] {
	return ascetRouteEntries;
}

export function listAscetRoutesForTool(toolName: string): readonly AscetRouteEntry[] {
	return ascetRouteEntries.filter((entry) => entry.toolName === toolName);
}
