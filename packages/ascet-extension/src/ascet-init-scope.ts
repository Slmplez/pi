export type AscetInitScope =
	| { ok: true; kind: "auto-detect" }
	| { ok: true; kind: "database" }
	| { ok: true; kind: "folder"; value: string }
	| { ok: true; kind: "project"; value: string }
	| { ok: false; usage: string; reason: string };

export type AscetInitIndexMode = "all" | "core" | "none";

export type AscetInitArgs =
	| {
			ok: true;
			scope: Exclude<AscetInitScope, { ok: false }>;
			indexMode: AscetInitIndexMode;
			forceRefresh: boolean;
			writeSummary: boolean;
	  }
	| { ok: false; usage: string; reason: string };

export const ASCET_INIT_USAGE =
	"Usage: /ascet-init [database|folder <path>|project <name-or-path>] [--index all|core|none] [--force] [--write-summary|--no-write-summary]";

export function parseAscetInitScopeArgs(args: string): AscetInitScope {
	const trimmed = args.trim();
	if (!trimmed) {
		return { ok: true, kind: "auto-detect" };
	}

	const [head, ...tail] = trimmed.split(/\s+/);
	const value = tail.join(" ").trim();

	if (head === "database") {
		if (value) {
			return { ok: false, usage: ASCET_INIT_USAGE, reason: "database scope does not accept extra args" };
		}
		return { ok: true, kind: "database" };
	}

	if (head === "folder") {
		if (!value) {
			return { ok: false, usage: ASCET_INIT_USAGE, reason: "folder scope requires a path" };
		}
		return { ok: true, kind: "folder", value };
	}

	if (head === "project") {
		if (!value) {
			return { ok: false, usage: ASCET_INIT_USAGE, reason: "project scope requires a name or path" };
		}
		return { ok: true, kind: "project", value };
	}

	return { ok: false, usage: ASCET_INIT_USAGE, reason: `unknown scope '${head}'` };
}

export function parseAscetInitArgs(args: string): AscetInitArgs {
	const tokens = args.trim().split(/\s+/).filter(Boolean);
	const scopeTokens: string[] = [];
	let indexMode: AscetInitIndexMode = "core";
	let forceRefresh = false;
	let writeSummary = true;

	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index];
		if (token === "--force") {
			forceRefresh = true;
			continue;
		}
		if (token === "--write-summary") {
			writeSummary = true;
			continue;
		}
		if (token === "--no-write-summary") {
			writeSummary = false;
			continue;
		}
		if (token === "--index") {
			const value = tokens[index + 1];
			if (value !== "all" && value !== "core" && value !== "none") {
				return { ok: false, usage: ASCET_INIT_USAGE, reason: "--index requires all, core, or none" };
			}
			indexMode = value;
			index += 1;
			continue;
		}
		if (token.startsWith("--index=")) {
			const value = token.slice("--index=".length);
			if (value !== "all" && value !== "core" && value !== "none") {
				return { ok: false, usage: ASCET_INIT_USAGE, reason: "--index requires all, core, or none" };
			}
			indexMode = value;
			continue;
		}
		if (token.startsWith("--")) {
			return { ok: false, usage: ASCET_INIT_USAGE, reason: `unknown option '${token}'` };
		}
		scopeTokens.push(token);
	}

	const scope = parseAscetInitScopeArgs(scopeTokens.join(" "));
	if (scope.ok === false) {
		return scope;
	}
	return { ok: true, scope, indexMode, forceRefresh, writeSummary };
}
