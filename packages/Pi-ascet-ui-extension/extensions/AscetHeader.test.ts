import assert from "node:assert/strict";
import { test } from "node:test";
import type { Theme } from "@earendil-works/pi-coding-agent";
import { visibleWidth } from "@earendil-works/pi-tui";
import type { TUI } from "@earendil-works/pi-tui";
import { AscetHeader, type AscetHeaderOptions } from "./AscetHeader.ts";
import { loadRecentSessions, type RecentSessionView } from "./recentSessions.ts";
import { checkAscetCopilotUpdate, type UpdateState } from "./releaseInfo.ts";
import { randomStartupTip, type StartupTip } from "./tips.ts";

const TEST_WIDTHS = [85, 86, 120];
const COMPACT_WIDTH = 85;
const INTRO_TICK_MS = 33;
const INTRO_MS = 3000;

const updateCases: readonly UpdateCase[] = [
	{
		label: "checking",
		assertText: "Checking updates...",
	},
	{
		label: "current",
		state: { status: "current", latestVersion: "0.1.43" },
		assertText: "0.1.43 - Up to date",
	},
	{
		label: "available",
		state: { status: "available", latestVersion: "0.1.44" },
		assertText: "0.1.43 -> 0.1.44",
	},
	{
		label: "unavailable",
		state: { status: "unavailable", reason: "network" },
		assertText: "update check unavailable (NETWORK)",
	},
];

const recentSessionCases: readonly RecentSessionCase[] = [
	{
		label: "loading",
		assertTexts: ["Loading..."],
	},
	{
		label: "error",
		assertTexts: ["Unavailable"],
		reject: true,
	},
	{
		label: "empty",
		assertTexts: ["No recent sessions"],
		sessions: [],
	},
	{
		label: "one session",
		assertTexts: ["One session", "10:00"],
		sessions: [{ title: "One session", time: "10:00" }],
	},
	{
		label: "two sessions",
		assertTexts: ["Two session", "yesterday"],
		sessions: [
			{ title: "One session", time: "10:00" },
			{ title: "Two session", time: "yesterday" },
		],
	},
	{
		label: "three sessions",
		assertTexts: ["Three session", "3d ago"],
		sessions: [
			{ title: "One session", time: "10:00" },
			{ title: "Two session", time: "yesterday" },
			{ title: "Three session", time: "3d ago" },
		],
	},
];

for (const updateCase of updateCases) {
	test(`dashboard renders the ${updateCase.label} update state`, async () => {
		await withHeader({}, async (setup) => {
			if (updateCase.state) {
				setup.resolveUpdate(updateCase.state);
			}
			await flushPromises();

			const text = renderText(setup.header, 120);
			assert.match(text, new RegExp(escapeRegExp(updateCase.assertText)));
		});
	});
}

for (const recentCase of recentSessionCases) {
	test(`dashboard renders the ${recentCase.label} recent-session state`, async () => {
		await withHeader({}, async (setup) => {
			if (recentCase.reject) {
				setup.rejectRecentSessions(new Error("session listing failed"));
			} else if (recentCase.sessions) {
				setup.resolveRecentSessions(recentCase.sessions);
			}
			await flushPromises();

			const text = renderText(setup.header, 120);
			for (const assertText of recentCase.assertTexts) {
				assert.match(text, new RegExp(escapeRegExp(assertText)));
			}
		});
	});
}

test("dashboard height remains stable while release and recent-session state changes", async () => {
	for (const updateCase of updateCases) {
		for (const recentCase of recentSessionCases) {
			await withHeader({}, async (setup) => {
				const before = setup.header.render(120).length;
				if (updateCase.state) {
					setup.resolveUpdate(updateCase.state);
				}
				if (recentCase.reject) {
					setup.rejectRecentSessions(new Error("session listing failed"));
				} else if (recentCase.sessions) {
					setup.resolveRecentSessions(recentCase.sessions);
				}
				await flushPromises();

				for (const width of [86, 120]) {
					const lines = setup.header.render(width);
					assert.equal(lines.length, before);
					for (const [index, line] of lines.entries()) {
						assert.ok(
							visibleWidth(line) <= width,
							`${updateCase.label}/${recentCase.label}: ${width}-column line ${index} is too wide: ${visibleWidth(line)}`,
						);
					}
				}
			});
		}
	}
});

test("compact mode remains compact at the 85/86 column boundary", async () => {
	await withHeader({}, (setup) => {
		const compact = setup.header.render(COMPACT_WIDTH);
		const dashboard = setup.header.render(86);

		assert.equal(compact.length, 10);
		assert.ok(dashboard.length > compact.length);
		assert.equal(compact.some((line) => line.includes("Recent sessions")), false);
		assert.equal(compact.some((line) => line.includes("Release")), false);
	});
});

test("intro frames keep a stable row count", (context) => {
	context.mock.timers.enable({ apis: ["setInterval", "Date"], now: 0 });
	try {
		const setup = createHeader();
		try {
			const initialRows = setup.header.render(120).length;
			context.mock.timers.tick(INTRO_TICK_MS * 10);
			const middleRows = setup.header.render(120).length;
			context.mock.timers.tick(INTRO_MS);
			const endingRows = setup.header.render(120).length;

			assert.equal(middleRows, initialRows);
			assert.equal(endingRows, initialRows);
			assert.ok(setup.tui.requestRenderCalls > 0);
		} finally {
			setup.header.dispose();
		}
	} finally {
		context.mock.timers.reset();
	}
});

test("intro timer stops naturally after 3000ms", (context) => {
	context.mock.timers.enable({ apis: ["setInterval", "Date"], now: 0 });
	try {
		const setup = createHeader();
		try {
			context.mock.timers.tick(1500);
			const callsDuringIntro = setup.tui.requestRenderCalls;
			assert.ok(callsDuringIntro > 0);

			context.mock.timers.tick(INTRO_MS - 1500 + INTRO_TICK_MS);
			const callsAfterIntro = setup.tui.requestRenderCalls;
			assert.ok(callsAfterIntro > callsDuringIntro);

			context.mock.timers.tick(INTRO_MS);
			assert.equal(setup.tui.requestRenderCalls, callsAfterIntro);
		} finally {
			setup.header.dispose();
		}
	} finally {
		context.mock.timers.reset();
	}
});

test("feedback frames keep a stable row count", (context) => {
	context.mock.timers.enable({ apis: ["setInterval", "Date"], now: 0 });
	try {
		const setup = createHeader({ startupTip: { kind: "feedback", text: "feedback" } });
		try {
			const initialRows = setup.header.render(120).length;
			context.mock.timers.tick(2500);
			const middleRows = setup.header.render(120).length;
			context.mock.timers.tick(2500);
			const endingRows = setup.header.render(120).length;

			assert.equal(middleRows, initialRows);
			assert.equal(endingRows, initialRows);
		} finally {
			setup.header.dispose();
		}
	} finally {
		context.mock.timers.reset();
	}
});

test("feedback timer stops naturally after 5000ms", (context) => {
	context.mock.timers.enable({ apis: ["setInterval", "Date"], now: 0 });
	try {
		const setup = createHeader({ startupTip: { kind: "feedback", text: "feedback" } });
		try {
			context.mock.timers.tick(INTRO_MS + INTRO_TICK_MS);
			const callsAfterIntro = setup.tui.requestRenderCalls;
			assert.ok(callsAfterIntro > 0);

			context.mock.timers.tick(1400);
			const callsDuringFeedback = setup.tui.requestRenderCalls;
			assert.ok(callsDuringFeedback > callsAfterIntro);

			context.mock.timers.tick(700);
			const callsAfterFeedback = setup.tui.requestRenderCalls;
			assert.ok(callsAfterFeedback > callsDuringFeedback);

			context.mock.timers.tick(1000);
			assert.equal(setup.tui.requestRenderCalls, callsAfterFeedback);
		} finally {
			setup.header.dispose();
		}
	} finally {
		context.mock.timers.reset();
	}
});

test("all lines fit at the 85, 86, and 120 column widths", async () => {
	await withHeader({}, (setup) => {
		for (const width of TEST_WIDTHS) {
			for (const [index, line] of setup.header.render(width).entries()) {
				assert.ok(
					visibleWidth(line) <= width,
					`${width}-column line ${index} is too wide: ${visibleWidth(line)}`,
				);
			}
		}
	});
});

test("dispose stops intro and feedback timers from requesting renders", (context) => {
	context.mock.timers.enable({ apis: ["setInterval", "Date"], now: 0 });
	try {
		const tui = createTui();
		const setup = createHeader({ tui, startupTip: { kind: "feedback", text: "feedback" } });
		try {
			setup.header.dispose();
			context.mock.timers.tick(INTRO_MS + 1000);
			assert.equal(tui.requestRenderCalls, 0);
		} finally {
			setup.header.dispose();
		}
	} finally {
		context.mock.timers.reset();
	}
});

test("dispose ignores completed recent sessions and update checks", async () => {
	const recent = deferred<RecentSessionView[]>();
	const update = deferred<UpdateState>();
	const tui = createTui();
	const setup = createHeader({
		tui,
		loadRecentSessions: () => recent.promise,
		checkForUpdates: () => update.promise,
	});
	try {
		setup.header.dispose();
		recent.resolve([{ title: "Old session", time: "10:00" }]);
		update.resolve({ status: "current", latestVersion: "0.1.43" });
		await flushPromises();

		assert.equal(tui.requestRenderCalls, 0);
	} finally {
		setup.header.dispose();
	}
});

test("dispose ignores failed recent sessions and update checks", async () => {
	const recent = deferred<RecentSessionView[]>();
	const update = deferred<UpdateState>();
	const tui = createTui();
	const setup = createHeader({
		tui,
		loadRecentSessions: () => recent.promise,
		checkForUpdates: () => update.promise,
	});
	try {
		setup.header.dispose();
		recent.reject(new Error("session listing failed"));
		update.reject(new Error("update check failed"));
		await flushPromises();

		assert.equal(tui.requestRenderCalls, 0);
	} finally {
		setup.header.dispose();
	}
});

type UpdateCase = {
	label: string;
	assertText: string;
	state?: UpdateState;
};

type RecentSessionCase = {
	label: string;
	assertTexts: readonly string[];
	sessions?: RecentSessionView[];
	reject?: boolean;
};

type Deferred<T> = {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (reason?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}

type HeaderTestDependencies = {
	loadRecentSessions: typeof loadRecentSessions;
	checkForUpdates: typeof checkAscetCopilotUpdate;
	randomStartupTip: typeof randomStartupTip;
};

type HeaderTestOverrides = {
	tui?: ReturnType<typeof createTui>;
	startupTip?: StartupTip;
	loadRecentSessions?: HeaderTestDependencies["loadRecentSessions"];
	checkForUpdates?: HeaderTestDependencies["checkForUpdates"];
};

type HeaderSetup = ReturnType<typeof createHeader>;

async function withHeader<T>(
	overrides: HeaderTestOverrides,
	callback: (setup: HeaderSetup) => T | PromiseLike<T>,
): Promise<T> {
	const setup = createHeader(overrides);
	try {
		return await callback(setup);
	} finally {
		setup.header.dispose();
	}
}

function createHeader(overrides: HeaderTestOverrides = {}) {
	const tui = overrides.tui ?? createTui();
	const recentSessions = deferred<RecentSessionView[]>();
	const update = deferred<UpdateState>();
	const header = new AscetHeader(
		tui as unknown as TUI,
		createTheme(),
		{
			session: { cwd: "C:/repo" },
			__testDependencies: {
				loadRecentSessions: overrides.loadRecentSessions ?? (() => recentSessions.promise),
				checkForUpdates: overrides.checkForUpdates ?? (() => update.promise),
				randomStartupTip: () => overrides.startupTip ?? { kind: "normal", text: "tip" },
			},
		} as AscetHeaderOptions,
	);

	return {
		header,
		tui,
		resolveRecentSessions: (sessions: RecentSessionView[]) => recentSessions.resolve(sessions),
		rejectRecentSessions: (reason: unknown) => recentSessions.reject(reason),
		resolveUpdate: (state: UpdateState) => update.resolve(state),
		rejectUpdate: (reason: unknown) => update.reject(reason),
	};
}

function createTui(): { requestRenderCalls: number; requestRender: () => void } {
	const tui = {
		requestRenderCalls: 0,
		requestRender() {
			tui.requestRenderCalls += 1;
		},
	};
	return tui;
}

function createTheme(): Theme {
	return {
		bold: (text: string) => text,
		fg: (_color: string, text: string) => text,
	} as unknown as Theme;
}

function renderText(header: AscetHeader, width: number): string {
	return header.render(width).join("\n");
}

async function flushPromises(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
	await Promise.resolve();
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
