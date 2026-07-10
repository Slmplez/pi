import type { AscetJobContext, AscetSchedulerSnapshot } from "./types.ts";

function formatJob(
	job: Pick<
		AscetJobContext,
		"jobId" | "agentId" | "toolName" | "commandId" | "state" | "queueWaitMs" | "executionMs" | "errorCode"
	>,
): string {
	const timing = [
		job.queueWaitMs === undefined ? null : `queueWait=${job.queueWaitMs}ms`,
		job.executionMs === undefined ? null : `exec=${job.executionMs}ms`,
	].filter(Boolean);
	const error = job.errorCode ? ` error=${job.errorCode}` : "";
	const timingText = timing.length > 0 ? ` (${timing.join(", ")})` : "";
	return `${job.jobId} ${job.toolName}/${job.commandId} agent=${job.agentId} state=${job.state}${timingText}${error}`;
}

export function formatAscetSchedulerSnapshot(snapshot: AscetSchedulerSnapshot): string {
	const lines = [
		`Host: ${snapshot.hostState}`,
		`Active: ${snapshot.activeCount}`,
		`Resource: ${snapshot.resource.key} active=${snapshot.resource.active} queued=${snapshot.resource.queued} concurrency=${snapshot.resource.concurrency}`,
		`Pending: ${snapshot.queuedJobs.length}`,
		`Running: ${snapshot.runningJob ? formatJob(snapshot.runningJob) : "none"}`,
	];

	if (snapshot.queuedJobs.length > 0) {
		lines.push("", "Queue:");
		for (const job of snapshot.queuedJobs.slice(0, 10)) {
			lines.push(`- ${formatJob(job)}`);
		}
		if (snapshot.queuedJobs.length > 10) {
			lines.push(`- ... ${snapshot.queuedJobs.length - 10} more`);
		}
	}

	lines.push("", `Pending by agent: ${JSON.stringify(snapshot.pendingByAgent)}`);

	if (snapshot.recentJobs.length > 0) {
		lines.push("", "Recent:");
		for (const job of snapshot.recentJobs.slice(-10)) {
			lines.push(`- ${formatJob(job)}`);
		}
	}

	return lines.join("\n");
}
