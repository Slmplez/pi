import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

export interface InlineCodeFileParams {
	code?: string;
	codeFile?: string;
	prefix: string;
	tempRoot?: string;
}

function safePrefix(prefix: string): string {
	return prefix.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 48) || "ascet-code";
}

export async function withInlineCodeFile<T>(
	params: InlineCodeFileParams,
	run: (codeFile: string) => Promise<T>,
): Promise<T> {
	const hasCode = params.code !== undefined;
	const hasCodeFile = params.codeFile !== undefined;
	if (hasCode === hasCodeFile) {
		throw new Error("Provide exactly one of code or codeFile.");
	}

	if (params.codeFile) {
		return run(params.codeFile);
	}

	const root = params.tempRoot ?? resolve(tmpdir(), "pi-ascet-extension", "inline-code");
	await mkdir(root, { recursive: true });
	const codeFile = resolve(root, `${safePrefix(params.prefix)}-${process.pid}-${Date.now()}.txt`);

	try {
		await writeFile(codeFile, params.code ?? "", "utf8");
		return await run(codeFile);
	} finally {
		await rm(codeFile, { force: true });
	}
}
