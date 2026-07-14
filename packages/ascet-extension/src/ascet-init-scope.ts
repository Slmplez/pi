export type AscetInitScope =
	| { ok: true; kind: "auto-detect" }
	| { ok: true; kind: "database" }
	| { ok: true; kind: "folder"; value: string }
	| { ok: true; kind: "project"; value: string }
	| { ok: false; usage: string; reason: string };

export const ASCET_INIT_USAGE = "Usage: /ascet-init [database|folder <path>|project <name-or-path>]";

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
