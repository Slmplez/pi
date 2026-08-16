import type { AscetProfile } from "../../exposure/profiles.ts";

export const ASCET_READ_PROFILES: readonly AscetProfile[] = [
	"base",
	"advanced-read",
	"reference",
	"diff",
	"write-preflight",
	"batch-write",
	"component-edit",
];

export const ASCET_WRITE_PROFILES: readonly AscetProfile[] = ["write-preflight", "batch-write"];
