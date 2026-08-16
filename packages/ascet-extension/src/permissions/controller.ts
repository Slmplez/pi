import { loadAscetPermissionConfig } from "./config.ts";
import { persistAscetPermissionMode, restoreAscetPermissionMode } from "./persistence.ts";
import type { AscetPermissionProvider, AscetPermissionSnapshot, PermissionMode } from "./types.ts";

export interface AscetPermissionUI {
	notify(message: string, level?: "info" | "warning" | "error"): void;
	setStatus?(key: string, text: string | undefined): void;
}

export interface AscetPermissionSessionContext {
	cwd: string;
	sessionManager: { getEntries(): Array<{ type: string; customType?: string; data?: unknown }> };
	ui: AscetPermissionUI;
}

export interface AscetPermissionController extends AscetPermissionProvider {
	getMode(): PermissionMode;
	initialize(ctx: AscetPermissionSessionContext): void;
	setMode(mode: PermissionMode, ui?: AscetPermissionUI): void;
	cycle(ui?: AscetPermissionUI): PermissionMode;
}

const MODE_LABELS: Record<PermissionMode, string> = {
	default: "Default",
	acceptEdits: "Accept Edits",
	auto: "Auto",
};
const MODE_CYCLE: readonly PermissionMode[] = ["default", "acceptEdits", "auto"];

export function getAscetPermissionModeLabel(mode: PermissionMode): string {
	return MODE_LABELS[mode];
}

export function createAscetPermissionController(options: {
	appendEntry(customType: string, data?: unknown): void;
}): AscetPermissionController {
	let mode: PermissionMode = "default";
	let activeUi: AscetPermissionUI | undefined;

	const updateStatus = (ui: AscetPermissionUI | undefined): void => {
		ui?.setStatus?.("ascet-permission", `ASCET: ${getAscetPermissionModeLabel(mode)}`);
	};

	return {
		getMode: () => mode,
		getSnapshot(cwd: string): AscetPermissionSnapshot {
			const config = loadAscetPermissionConfig(cwd);
			return {
				mode,
				rules: config.rules,
				...(config.error ? { configError: config.error } : {}),
			};
		},
		initialize(ctx): void {
			activeUi = ctx.ui;
			const config = loadAscetPermissionConfig(ctx.cwd);
			mode = restoreAscetPermissionMode(ctx.sessionManager.getEntries()) ?? config.defaultMode;
			updateStatus(ctx.ui);
			if (config.error) ctx.ui.notify(config.error, "error");
		},
		setMode(nextMode, ui = activeUi): void {
			mode = nextMode;
			persistAscetPermissionMode(options.appendEntry, mode);
			updateStatus(ui);
		},
		cycle(ui = activeUi): PermissionMode {
			const currentIndex = MODE_CYCLE.indexOf(mode);
			mode = MODE_CYCLE[(currentIndex + 1) % MODE_CYCLE.length];
			persistAscetPermissionMode(options.appendEntry, mode);
			updateStatus(ui);
			return mode;
		},
	};
}
