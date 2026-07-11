const EASTER_EGG_CHANCE = 0.05;
const FEEDBACK_TIP_CHANCE = 0.08;

export type StartupTipKind = "normal" | "feedback" | "easter-egg";

export interface StartupTip {
	kind: StartupTipKind;
	text: string;
}

export const HOTKEY_TIPS = [
	"Press / to open slash commands when you need a shortcut to intent. 🧭",
	"Use ! for bash, and !! when the command should stay out of context. 🐚",
	"Shift+Enter or Ctrl+J starts a new line without sending. ↩️",
	"Ctrl+C clears first, exits second. Pi believes in second chances. ✌️",
	"Ctrl+L opens the model selector when your current model needs a teammate. 🔁",
	"Ctrl+O toggles tool output details. Peek when you must, fold when you can. 🧰",
	"Ctrl+T toggles thinking visibility. Sometimes the brain needs curtains. 🧠",
	"Alt+V pastes image or text from clipboard when visual context matters. 🖼️",
] as const;

export const SLASH_COMMAND_TIPS = [
	"Use /model to switch models without leaving the keyboard. 🎛️",
	"Use /theme to change the terminal look when your eyes file a complaint. 🎨",
	"Use /compact when the session gets too heavy. Smaller context, sharper answers. 🧳",
	"Use /resume to jump back into an older session. Time travel, but with logs. 🕰️",
	"Use /clear to reset the conversation and start fresh. 🧼",
	"Use /copy to copy the last assistant reply. Clipboard diplomacy. 📋",
	"Use /export to save the session as HTML for sharing or review. 🗂️",
] as const;

export const GENERAL_TIPS = [
	"Keep prompts small, sharp, and slightly caffeinated. ☕",
	"If the agent looks confused, add one concrete example and watch it remember its job. 🧠",
	"Good diffs are like good jokes: short setup, clear punchline. 😄",
	"Long context is powerful, but tidy context is faster. 🧹",
	"Create quick prompts as .md files in ~/.pi/agent/prompts or .pi/prompts, then run them as /name. ⚡",
	"Found a weird edge case? Congratulations, you discovered tomorrow's roadmap. 🛠️",
] as const;

export const FEEDBACK_TIP = "Feedback or feature ideas? Contact VM ESC41-Jiarui Zhang. Help us improve! 🚀";

export const EASTER_EGG_TIPS = [
	"👀👀👀👀👀👀👀👀👀👀👀",
] as const;

export const STARTUP_TIPS = [...HOTKEY_TIPS, ...SLASH_COMMAND_TIPS, ...GENERAL_TIPS] as const;

export function randomStartupTip(): StartupTip {
	const roll = Math.random();
	if (roll < EASTER_EGG_CHANCE) return { kind: "easter-egg", text: pick(EASTER_EGG_TIPS) };
	if (roll < EASTER_EGG_CHANCE + FEEDBACK_TIP_CHANCE) return { kind: "feedback", text: FEEDBACK_TIP };
	return { kind: "normal", text: pick(STARTUP_TIPS) };
}

function pick(items: readonly string[]): string {
	return items[Math.floor(Math.random() * items.length)] ?? items[0] ?? "";
}
