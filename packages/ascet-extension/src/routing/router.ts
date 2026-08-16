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

function matchesRouteConditions(route: AscetRouteEntry, request: AscetRouteRequest): boolean {
	if (!route.when) {
		return true;
	}
	const values: Readonly<Record<string, string | undefined>> = {
		objectKind: request.objectKind,
	};
	return Object.entries(route.when).every(([field, expected]) => values[field] === expected);
}

export function routeAscetAction(request: AscetRouteRequest): AscetRouteResult {
	const route = ascetRouteEntries.find(
		(entry) =>
			entry.toolName === request.toolName &&
			entry.action === request.action &&
			matchesRouteConditions(entry, request),
	);
	if (!route) {
		throw new Error(`Unsupported ASCET route: ${request.toolName}/${request.action}`);
	}
	const condition = route.when
		? ` ${Object.entries(route.when)
				.map(([field, value]) => `${field}=${value}`)
				.join(" ")}`
		: "";
	return {
		...route,
		confidence: 0.98,
		reason: `Mapped ${request.toolName}.${request.action}${condition} to ${route.logicalCommandId}`,
	};
}

export function listAscetRoutes(): readonly AscetRouteEntry[] {
	return ascetRouteEntries;
}

export function listAscetRoutesForTool(toolName: string): readonly AscetRouteEntry[] {
	return ascetRouteEntries.filter((entry) => entry.toolName === toolName);
}
