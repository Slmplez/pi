import type { AssistantMessage } from "@earendil-works/pi-ai";

const retryPendingMessages = new WeakSet<AssistantMessage>();

export function markRetryPendingMessage(message: AssistantMessage): void {
	retryPendingMessages.add(message);
}

export function isRetryPendingMessage(message: AssistantMessage): boolean {
	return retryPendingMessages.has(message);
}
