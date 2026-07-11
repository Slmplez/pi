import assert from "node:assert/strict";
import { test } from "node:test";
import {
	createRecentSessionViews,
	formatSessionTime,
	loadRecentSessions,
	type SessionInfoLike,
} from "./recentSessions.ts";

const baseNow = new Date("2026-07-11T12:00:00");

test("formatSessionTime returns compact labels", () => {
	assert.equal(formatSessionTime(new Date("2026-07-11T09:05:00"), baseNow), "09:05");
	assert.equal(formatSessionTime(new Date("2026-07-10T18:30:00"), baseNow), "yesterday");
	assert.equal(formatSessionTime(new Date("2026-07-08T18:30:00"), baseNow), "3d ago");
	assert.equal(formatSessionTime(new Date("2026-02-03T18:30:00"), baseNow), "02/03");
	assert.equal(formatSessionTime(new Date("2025-12-31T18:30:00"), baseNow), "2025/12/31");
});

test("createRecentSessionViews excludes current session and sanitizes titles", () => {
	const sessions = createRecentSessionViews({
		sessions: [
			session({ path: "current.jsonl", name: "Current" }),
			session({ path: "one.jsonl", name: "Named\nSession" }),
			session({ path: "two.jsonl", firstMessage: "First\tmessage" }),
			session({ path: "three.jsonl", firstMessage: "" }),
			session({ path: "four.jsonl", name: "Fourth" }),
		],
		currentSessionFile: "current.jsonl",
		now: baseNow,
	});

	assert.deepEqual(
		sessions.map((item) => item.title),
		["Named Session", "First message", "Untitled"],
	);
	assert.equal(sessions.length, 3);
});

test("loadRecentSessions uses the provided session lister with cwd and sessionDir", async () => {
	const calls: Array<{ cwd: string; sessionDir: string | undefined }> = [];
	const result = await loadRecentSessions(
		{
			cwd: "C:/repo",
			sessionDir: "C:/sessions",
			currentSessionFile: "current.jsonl",
			limit: 1,
			now: baseNow,
		},
		async (cwd, sessionDir) => {
			calls.push({ cwd, sessionDir });
			return [session({ path: "current.jsonl", name: "Current" }), session({ path: "one.jsonl", name: "One" })];
		},
	);

	assert.deepEqual(calls, [{ cwd: "C:/repo", sessionDir: "C:/sessions" }]);
	assert.deepEqual(result, [{ title: "One", time: "09:00" }]);
});

function session(overrides: Partial<SessionInfoLike>): SessionInfoLike {
	return {
		path: "session.jsonl",
		id: "id",
		cwd: "C:/repo",
		created: new Date("2026-07-11T08:00:00"),
		modified: new Date("2026-07-11T09:00:00"),
		messageCount: 1,
		firstMessage: "Hello",
		allMessagesText: "Hello",
		...overrides,
	};
}
