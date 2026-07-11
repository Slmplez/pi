import type { SessionInfo } from "@earendil-works/pi-coding-agent";

export type RecentSessionView = {
	title: string;
	time: string;
};

export type SessionInfoLike = Pick<
	SessionInfo,
	"path" | "id" | "cwd" | "name" | "created" | "modified" | "messageCount" | "firstMessage" | "allMessagesText"
>;

export type SessionLister = (cwd: string, sessionDir: string | undefined) => Promise<SessionInfoLike[]>;

export async function loadRecentSessions(
	input: {
		cwd: string;
		sessionDir?: string;
		currentSessionFile?: string;
		limit?: number;
		now?: Date;
	},
	listSessions: SessionLister = listPiSessions,
): Promise<RecentSessionView[]> {
	const sessions = await listSessions(input.cwd, input.sessionDir);
	return createRecentSessionViews({
		sessions,
		currentSessionFile: input.currentSessionFile,
		limit: input.limit,
		now: input.now,
	});
}

async function listPiSessions(cwd: string, sessionDir: string | undefined): Promise<SessionInfoLike[]> {
	const { SessionManager } = await import("@earendil-works/pi-coding-agent");
	return SessionManager.list(cwd, sessionDir);
}

export function createRecentSessionViews(input: {
	sessions: SessionInfoLike[];
	currentSessionFile?: string;
	limit?: number;
	now?: Date;
}): RecentSessionView[] {
	const limit = input.limit ?? 3;
	const now = input.now ?? new Date();
	return input.sessions
		.filter((session) => !input.currentSessionFile || session.path !== input.currentSessionFile)
		.slice(0, limit)
		.map((session) => ({
			title: sessionTitle(session),
			time: formatSessionTime(session.modified, now),
		}));
}

export function formatSessionTime(date: Date, now = new Date()): string {
	if (isSameLocalDay(date, now)) {
		return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
	}

	const startOfNow = startOfLocalDay(now).getTime();
	const startOfDate = startOfLocalDay(date).getTime();
	const dayDiff = Math.round((startOfNow - startOfDate) / 86_400_000);
	if (dayDiff === 1) return "yesterday";
	if (dayDiff >= 2 && dayDiff <= 6) return `${dayDiff}d ago`;
	if (date.getFullYear() === now.getFullYear()) {
		return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;
	}
	return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;
}

function sessionTitle(session: SessionInfoLike): string {
	const title = sanitizeOneLine(session.name || session.firstMessage || "");
	return title || "Untitled";
}

function sanitizeOneLine(text: string): string {
	return text
		.replace(/[\r\n\t]/g, " ")
		.replace(/ +/g, " ")
		.trim();
}

function isSameLocalDay(left: Date, right: Date): boolean {
	return (
		left.getFullYear() === right.getFullYear() &&
		left.getMonth() === right.getMonth() &&
		left.getDate() === right.getDate()
	);
}

function startOfLocalDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function pad2(value: number): string {
	return value.toString().padStart(2, "0");
}
