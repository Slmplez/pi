import type { AscetExtensionAPI } from "../core/tool.ts";
import { type AscetPermissionController, getAscetPermissionModeLabel } from "./controller.ts";
import type { PermissionMode } from "./types.ts";

function parseMode(value: string): PermissionMode | undefined {
	if (value === "default") return "default";
	if (value === "accept-edits") return "acceptEdits";
	if (value === "auto") return "auto";
	return undefined;
}

export function registerAscetPermissionCommand(
	pi: Pick<AscetExtensionAPI, "registerCommand">,
	controller: AscetPermissionController,
): void {
	pi.registerCommand("ascet-permission", {
		description: "Show or change the ASCET write permission mode",
		handler: async (args, ctx) => {
			const value = args.trim();
			if (!value) {
				ctx.ui.notify(`ASCET permission: ${getAscetPermissionModeLabel(controller.getMode())}`, "info");
				return;
			}
			const mode = value === "cycle" ? controller.cycle(ctx.ui) : parseMode(value);
			if (!mode) {
				ctx.ui.notify("Usage: /ascet-permission [default|accept-edits|auto|cycle]", "error");
				return;
			}
			if (value !== "cycle") controller.setMode(mode, ctx.ui);
			ctx.ui.notify(`ASCET permission: ${getAscetPermissionModeLabel(mode)}`, "info");
		},
	});
}
