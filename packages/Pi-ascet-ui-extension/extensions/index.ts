import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import { AscetHeader } from "./AscetHeader.ts";
import { ensureBoschSystemCa } from "./bosch-system-ca.ts";

function configureBoschSystemCaAtStartup(): void {
	try {
		ensureBoschSystemCa();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`[ascet-copilot] ${message}`);
	}
}

configureBoschSystemCaAtStartup();

let quietStartupSynced = false;
const TERMINAL_TITLE = "ASCET COPILOT";
const TITLE_SPINNER_FRAMES = ["|", "/", "-", "\\"];
const TITLE_SETTLE_DELAYS_MS = [0, 50, 150, 350, 700];

let titleSpinnerTimer: ReturnType<typeof setInterval> | undefined;
let titleSettleTimers: ReturnType<typeof setTimeout>[] = [];
let titleSpinnerFrame = 0;

function setTerminalTitle(ctx: ExtensionContext, suffix?: string): void {
	if (!ctx.hasUI) return;
	ctx.ui.setTitle(suffix ? `${TERMINAL_TITLE} ${suffix}` : TERMINAL_TITLE);
}

function scheduleTerminalTitle(ctx: ExtensionContext, suffix?: string): void {
	if (!ctx.hasUI) return;
	clearScheduledTerminalTitles();
	titleSettleTimers = TITLE_SETTLE_DELAYS_MS.map((delay) =>
		setTimeout(() => {
			setTerminalTitle(ctx, suffix);
		}, delay),
	);
}

function clearScheduledTerminalTitles(): void {
	for (const timer of titleSettleTimers) clearTimeout(timer);
	titleSettleTimers = [];
}

function startTitleSpinner(ctx: ExtensionContext): void {
	if (!ctx.hasUI) return;
	if (titleSpinnerTimer) return;

	clearScheduledTerminalTitles();
	titleSpinnerFrame = 0;
	setTerminalTitle(ctx, TITLE_SPINNER_FRAMES[titleSpinnerFrame]);
	titleSpinnerTimer = setInterval(() => {
		titleSpinnerFrame = (titleSpinnerFrame + 1) % TITLE_SPINNER_FRAMES.length;
		setTerminalTitle(ctx, TITLE_SPINNER_FRAMES[titleSpinnerFrame]);
	}, 160);
}

function stopTitleSpinner(ctx?: ExtensionContext): void {
	if (titleSpinnerTimer) {
		clearInterval(titleSpinnerTimer);
		titleSpinnerTimer = undefined;
	}
	titleSpinnerFrame = 0;
	if (ctx) scheduleTerminalTitle(ctx);
}

function installHeader(ctx: ExtensionContext): void {
	if (!ctx.hasUI || ctx.mode !== "tui") return;
	ctx.ui.setHeader(
		(tui, theme) =>
			new AscetHeader(tui, theme, {
				model: ctx.model,
				session: {
					cwd: ctx.sessionManager.getCwd(),
					sessionDir: ctx.sessionManager.getSessionDir(),
					currentSessionFile: ctx.sessionManager.getSessionFile(),
				},
			}),
	);
}

function ensureQuietStartup(): void {
	if (quietStartupSynced) return;
	quietStartupSynced = true;

	const settingsPath = join(getAgentDir(), "settings.json");
	let settings: Record<string, unknown> = {};
	try {
		settings = JSON.parse(readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code !== "ENOENT") return;
	}

	if (settings.quietStartup === true) return;
	settings.quietStartup = true;

	try {
		mkdirSync(dirname(settingsPath), { recursive: true });
		writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
	} catch {
		// Startup visuals should not fail the session if settings are read-only.
	}
}

export default function vmStartupExtension(pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		ensureQuietStartup();
		setTerminalTitle(ctx);
		scheduleTerminalTitle(ctx);
		installHeader(ctx);
	});

	pi.on("session_info_changed", async (_event, ctx) => {
		if (!titleSpinnerTimer) scheduleTerminalTitle(ctx);
	});

	pi.on("agent_start", async (_event, ctx) => {
		startTitleSpinner(ctx);
	});

	pi.on("agent_end", async (_event, ctx) => {
		stopTitleSpinner(ctx);
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		stopTitleSpinner();
		clearScheduledTerminalTitles();
		if (ctx.hasUI && ctx.mode === "tui") {
			ctx.ui.setHeader(undefined);
		}
	});

	pi.registerCommand("vm-header-on", {
		description: "Enable the VM startup header",
		handler: async (_args, ctx) => {
			setTerminalTitle(ctx);
			scheduleTerminalTitle(ctx);
			installHeader(ctx);
			ctx.ui.notify("VM header enabled", "info");
		},
	});

	pi.registerCommand("vm-header-off", {
		description: "Restore Pi's built-in header",
		handler: async (_args, ctx) => {
			stopTitleSpinner();
			ctx.ui.setHeader(undefined);
			ctx.ui.notify("Built-in header restored", "info");
		},
	});

}
