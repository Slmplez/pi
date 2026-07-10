import { type AscetScheduler, createAscetScheduler } from "./scheduler.ts";

let globalScheduler: AscetScheduler | null = null;

export function getGlobalAscetScheduler(): AscetScheduler {
	if (!globalScheduler) {
		globalScheduler = createAscetScheduler();
	}
	return globalScheduler;
}

export function resetGlobalAscetSchedulerForTests(): void {
	globalScheduler = null;
}
