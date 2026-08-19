import { VERSION } from "@earendil-works/pi-coding-agent";
import type { Theme } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, type Component, type TUI } from "@earendil-works/pi-tui";
import {
	BRAND_LOGO,
	BRAND_NAME,
	COMPACT_BRAND_LOGO,
	centerLine,
	gradientLogo,
	INTRO_MS,
	INTRO_TICK_MS,
	introLogoFrame,
	nextLogoColorScheme,
	restingLogoFrame,
	visibleWidth,
} from "./logo.ts";
import { loadRecentSessions, type RecentSessionView } from "./recentSessions.ts";
import {
	checkAscetCopilotUpdate,
	createReleaseRows,
	type UpdateState,
} from "./releaseInfo.ts";
import { randomStartupTip, type StartupTip } from "./tips.ts";

export interface HeaderModelInfo {
	id?: string;
	name?: string;
	provider?: string;
}

export interface HeaderSessionInfo {
	cwd: string;
	sessionDir?: string;
	currentSessionFile?: string;
}

type HeaderDependencies = {
	loadRecentSessions: typeof loadRecentSessions;
	checkForUpdates: typeof checkAscetCopilotUpdate;
	randomStartupTip: typeof randomStartupTip;
};

type InternalAscetHeaderOptions = AscetHeaderOptions & {
	__testDependencies?: Partial<HeaderDependencies>;
};

export interface AscetHeaderOptions {
	model?: HeaderModelInfo;
	session?: HeaderSessionInfo;
}

type RecentSessionsState =
	| { status: "loading" }
	| { status: "ready"; sessions: RecentSessionView[] }
	| { status: "error" };

const MIN_DASHBOARD_WIDTH = 86;
const LEFT_WIDTH = 28;
const FEEDBACK_ANIMATION_MS = 5000;
const FEEDBACK_TICK_MS = 50;
const RELEASE_ROW_COUNT = 5;
const RECENT_SESSION_ROW_COUNT = 4;

export class AscetHeader implements Component {
	private readonly tui: TUI;
	private readonly theme: Theme;
	private readonly options: AscetHeaderOptions;
	private readonly dependencies: HeaderDependencies;
	private readonly start = Date.now();
	private readonly colorScheme = nextLogoColorScheme();
	private readonly startupTip: StartupTip;
	private introTimer: ReturnType<typeof setInterval> | undefined;
	private feedbackTimer: ReturnType<typeof setInterval> | undefined;
	private animating = true;
	private disposed = false;
	private recentSessionsState: RecentSessionsState = { status: "loading" };
	private updateState: UpdateState = { status: "checking" };

	constructor(tui: TUI, theme: Theme, options: AscetHeaderOptions = {}) {
		this.tui = tui;
		this.theme = theme;
		this.options = options;
		const internalOptions = options as InternalAscetHeaderOptions;
		this.dependencies = {
			loadRecentSessions,
			checkForUpdates: checkAscetCopilotUpdate,
			randomStartupTip,
			...internalOptions.__testDependencies,
		};
		this.startupTip = this.dependencies.randomStartupTip();
		this.introTimer = setInterval(() => {
			if (Date.now() - this.start >= INTRO_MS) {
				this.animating = false;
				this.stopIntroTimer();
			}
			if (this.disposed) return;
			this.tui.requestRender();
		}, INTRO_TICK_MS);
		if (this.startupTip.kind === "feedback") {
			this.feedbackTimer = setInterval(() => {
				if (Date.now() - this.start >= FEEDBACK_ANIMATION_MS) {
					this.stopFeedbackTimer();
				}
				if (this.disposed) return;
				this.tui.requestRender();
			}, FEEDBACK_TICK_MS);
		}
		void this.loadRecentSessions();
		void this.checkForUpdates();
	}

	invalidate(): void {}

	dispose(): void {
		this.disposed = true;
		this.stopIntroTimer();
		this.stopFeedbackTimer();
	}

	private stopIntroTimer(): void {
		if (!this.introTimer) return;
		clearInterval(this.introTimer);
		this.introTimer = undefined;
	}

	private stopFeedbackTimer(): void {
		if (!this.feedbackTimer) return;
		clearInterval(this.feedbackTimer);
		this.feedbackTimer = undefined;
	}

	render(width: number): string[] {
		const safeWidth = Math.max(1, width);
		const progress = Math.min(1, (Date.now() - this.start) / INTRO_MS);
		if (safeWidth < MIN_DASHBOARD_WIDTH) {
			return this.renderCompact(safeWidth, progress);
		}
		return this.renderDashboard(safeWidth, progress);
	}

	private renderDashboard(width: number, progress: number): string[] {
		const innerWidth = width - 2;
		const rightWidth = Math.max(20, innerWidth - LEFT_WIDTH - 1);
		const logo = this.animating ? introLogoFrame(progress, this.colorScheme) : restingLogoFrame(this.colorScheme);
		const modelName = this.options.model?.name || this.options.model?.id || "Model not selected";
		const provider = this.options.model?.provider || "";
		const rightRule = this.rule(Math.max(0, rightWidth - 2));

		const leftRows = [
			"",
			this.theme.bold("Welcome back!"),
			"",
			...logo,
			"",
			this.theme.bold(modelName),
			provider ? this.theme.fg("dim", provider) : "",
			"",
		];

		const rightRows = [
			this.theme.bold("Tips"),
			"/ for commands",
			"! to run bash",
			"Ctrl+C interrupt / clear",
			"Ctrl+T toggle thinking",
			rightRule,
			...this.renderReleaseRows(rightWidth),
			"",
			rightRule,
			...this.renderRecentSessionRows(rightWidth),
			"",
		];

		const rowCount = Math.max(leftRows.length, rightRows.length);
		const rows: string[] = [this.renderTopBorder(innerWidth)];
		for (let i = 0; i < rowCount; i++) {
			const left = centerCell(leftRows[i] ?? "", LEFT_WIDTH);
			const right = padCell(rightRows[i] ?? "", rightWidth);
			rows.push(`${this.border("│")}${left}${this.border("│")}${right}${this.border("│")}`);
		}
		rows.push(this.renderBottomBorder(LEFT_WIDTH, rightWidth));
		rows.push(padCell(this.renderStartupTip(width), width));
		return rows;
	}

	private renderCompact(width: number, progress: number): string[] {
		const title = `${this.theme.bold(this.theme.fg("accent", BRAND_NAME))}${this.theme.fg("dim", ` v${VERSION}`)}`;
		const logo =
			visibleWidth(BRAND_LOGO[0] ?? "") <= width
				? this.animating
					? introLogoFrame(progress, this.colorScheme)
					: restingLogoFrame(this.colorScheme)
				: gradientLogo(COMPACT_BRAND_LOGO, this.colorScheme, this.animating ? (1 - progress) * 0.5 : 0, {
						strength: this.animating ? (1 - progress) ** 1.5 : 0,
						pos: progress,
					});
		const rule = this.rule(width);
		return [
			...logo.map((line) => centerLine(line, width)),
			centerLine(title, width),
			centerLine("/ commands  ! bash  Ctrl+C interrupt  Ctrl+T more", width),
			centerLine(rule, width),
			padCell(this.renderStartupTip(width), width),
		];
	}

	private renderTopBorder(innerWidth: number): string {
		const title = ` ASCET COPILOT v${VERSION} `;
		const prefix = "───";
		const label = `${prefix}${title}`;
		const ruleWidth = Math.max(0, innerWidth - visibleWidth(label));
		return `${this.border("╭")}${this.border(prefix)}${this.theme.bold(this.theme.fg("accent", title))}${this.rule(
			ruleWidth,
		)}${this.border("╮")}`;
	}

	private renderBottomBorder(leftWidth: number, rightWidth: number): string {
		return `${this.border("╰")}${this.rule(leftWidth)}${this.border("┴")}${this.rule(rightWidth)}${this.border("╯")}`;
	}

	private renderStartupTip(width: number): string {
		const label = italic(this.theme.fg("accent", "TIPS"));
		const tipText = this.startupTip.kind === "feedback" ? this.renderFeedbackTip() : this.startupTip.text;
		const text = `${label}: ${tipText}`;
		return truncateToWidth(text, Math.max(1, width), "", false);
	}

	private renderFeedbackTip(): string {
		const elapsed = Math.min(FEEDBACK_ANIMATION_MS, Date.now() - this.start);
		const phase = elapsed / FEEDBACK_ANIMATION_MS;
		return rainbowText(this.startupTip.text, phase);
	}

	private async loadRecentSessions(): Promise<void> {
		const session = this.options.session;
		if (!session) {
			this.recentSessionsState = { status: "ready", sessions: [] };
			return;
		}
		try {
			const sessions = await this.dependencies.loadRecentSessions({
				cwd: session.cwd,
				sessionDir: session.sessionDir,
				currentSessionFile: session.currentSessionFile,
			});
			if (this.disposed) return;
			this.recentSessionsState = { status: "ready", sessions };
		} catch {
			if (this.disposed) return;
			this.recentSessionsState = { status: "error" };
		}
		this.tui.requestRender();
	}

	private async checkForUpdates(): Promise<void> {
		let updateState: UpdateState;
		try {
			updateState = await this.dependencies.checkForUpdates();
		} catch {
			updateState = { status: "unavailable", reason: "unknown" };
		}
		if (this.disposed) return;
		this.updateState = updateState;
		this.tui.requestRender();
	}

	private renderReleaseRows(width: number): string[] {
		const rows = createReleaseRows(this.updateState);
		const renderedRows = rows.map((row, index) => {
			const text = truncateToWidth(row, Math.max(1, width), "", false);
			if (index === 0) return this.theme.bold(text);
			return index === rows.length - 1 && this.updateState.status !== "available"
				? this.theme.fg("dim", text)
				: text;
		});
		return padRows(renderedRows, RELEASE_ROW_COUNT);
	}

	private renderRecentSessionRows(width: number): string[] {
		const rows = [this.theme.bold("Recent sessions")];
		let contentRows: string[];
		if (this.recentSessionsState.status === "loading") {
			contentRows = [this.theme.fg("dim", "Loading...")];
		} else if (this.recentSessionsState.status === "error") {
			contentRows = [this.theme.fg("dim", "Unavailable")];
		} else if (this.recentSessionsState.sessions.length === 0) {
			contentRows = [this.theme.fg("dim", "No recent sessions")];
		} else {
			contentRows = this.recentSessionsState.sessions.slice(0, 3).map((session) => {
				const text = `• ${session.title} · ${session.time}`;
				return truncateToWidth(text, Math.max(1, width), "", false);
			});
		}
		return padRows([...rows, ...contentRows], RECENT_SESSION_ROW_COUNT);
	}

	private rule(width: number): string {
		return this.border("─".repeat(Math.max(0, width)));
	}

	private border(text: string): string {
		return this.theme.fg("borderMuted", text);
	}
}

function fitCell(text: string, width: number): string {
	return truncateToWidth(text, Math.max(0, width), "", false);
}

function padCell(text: string, width: number): string {
	const fitted = fitCell(text, width);
	return fitted + " ".repeat(Math.max(0, width - visibleWidth(fitted)));
}

function centerCell(text: string, width: number): string {
	const fitted = fitCell(text, width);
	const remaining = Math.max(0, width - visibleWidth(fitted));
	const left = Math.floor(remaining / 2);
	return " ".repeat(left) + fitted + " ".repeat(remaining - left);
}

function padRows(rows: string[], rowCount: number): string[] {
	const boundedRows = rows.slice(0, rowCount);
	return boundedRows.concat(Array.from({ length: rowCount - boundedRows.length }, () => ""));
}

function italic(text: string): string {
	return `\x1b[3m${text}\x1b[23m`;
}

function rainbowText(text: string, phase: number): string {
	let result = "";
	const width = Math.max(1, visibleWidth(text));
	let x = 0;
	for (const char of text) {
		if (char === " ") {
			result += char;
			x += 1;
			continue;
		}
		const hue = (((x / width + phase) % 1) + 1) % 1;
		const [red, green, blue] = hslToRgb(hue, 0.9, 0.6);
		result += `\x1b[38;2;${red};${green};${blue}m${char}\x1b[0m`;
		x += visibleWidth(char);
	}
	return result;
}

function hslToRgb(hue: number, saturation: number, lightness: number): [number, number, number] {
	const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
	const segment = hue * 6;
	const x = chroma * (1 - Math.abs((segment % 2) - 1));
	const [red1, green1, blue1] =
		segment < 1
			? [chroma, x, 0]
			: segment < 2
				? [x, chroma, 0]
				: segment < 3
					? [0, chroma, x]
					: segment < 4
						? [0, x, chroma]
						: segment < 5
							? [x, 0, chroma]
							: [chroma, 0, x];
	const match = lightness - chroma / 2;
	return [
		Math.round((red1 + match) * 255),
		Math.round((green1 + match) * 255),
		Math.round((blue1 + match) * 255),
	];
}
