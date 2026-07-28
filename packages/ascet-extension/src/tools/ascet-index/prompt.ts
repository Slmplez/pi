export const ascetIndexPrompt = {
	promptSnippet: "Maintain the ASCET SQLite search index lifecycle and footer status.",
	promptGuidelines: [
		"Use ascet_index only for SQLite index status, refresh, stale marking, status-file repair, and index health checks.",
		"Use ascet_search for component, element, method, reference, message, and code-text search.",
		"Use ascet_read for exact live ASCET reads and ascet_edit for writes.",
		"Use action=status before repair_status_file when the footer state looks wrong.",
		"Use action=mark_stale when the user confirms manual ASCET UI edits; use refresh when current indexed data is required.",
		"Live refreshes are serial scheduler jobs; local status, mark_stale, repair_status_file, and evaluate do not touch live ASCET.",
	],
} as const;
