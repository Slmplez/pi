import { isPermissionMode, type PermissionMode } from "./types.ts";

export const ASCET_PERMISSION_SESSION_ENTRY = "ascet.permission_mode";

interface SessionEntryLike {
	type: string;
	customType?: string;
	data?: unknown;
}

function readModeData(value: unknown): PermissionMode | undefined {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
	const mode = (value as { mode?: unknown }).mode;
	return isPermissionMode(mode) ? mode : undefined;
}

export function restoreAscetPermissionMode(entries: readonly SessionEntryLike[]): PermissionMode | undefined {
	for (let index = entries.length - 1; index >= 0; index -= 1) {
		const entry = entries[index];
		if (entry.type !== "custom" || entry.customType !== ASCET_PERMISSION_SESSION_ENTRY) continue;
		const mode = readModeData(entry.data);
		if (mode) return mode;
	}
	return undefined;
}

export function persistAscetPermissionMode(
	appendEntry: (customType: string, data?: unknown) => void,
	mode: PermissionMode,
): void {
	appendEntry(ASCET_PERMISSION_SESSION_ENTRY, { mode });
}
