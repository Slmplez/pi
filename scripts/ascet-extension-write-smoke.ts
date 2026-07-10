import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadExtensions } from "../packages/coding-agent/src/core/extensions/loader.ts";

const repoRoot = resolve(process.cwd());
const enabled = process.env.ASCET_WRITE_SMOKE === "1";
const componentPath = process.env.ASCET_WRITE_SMOKE_COMPONENT ?? "DEMO\\__pi_write_smoke__\\PiSmoke";
const folderPath = componentPath.split("\\").slice(0, -1).join("\\");
const methodName = process.env.ASCET_WRITE_SMOKE_METHOD ?? "calc";

if (!enabled) {
	console.log(
		JSON.stringify(
			{
				ok: true,
				skipped: true,
				reason: "Set ASCET_WRITE_SMOKE=1 to run the disposable ASCET write smoke.",
				componentPath,
				methodName,
			},
			null,
			2,
		),
	);
	process.exit(0);
}

const tempDir = mkdtempSync(join(tmpdir(), "pi-ascet-write-smoke-"));
const codeFile = join(tempDir, `${methodName}.esdl`);
writeFileSync(codeFile, "// PI ASCET write smoke\nreturn;\n", "utf8");

async function withStage<T>(stage: string, fn: () => Promise<T>): Promise<T> {
	try {
		return await fn();
	} catch (error) {
		console.error(
			JSON.stringify(
				{
					ok: false,
					stage,
					componentPath,
					methodName,
					error: error instanceof Error ? error.message : String(error),
				},
				null,
				2,
			),
		);
		process.exit(1);
	}
}

const extensionPath = resolve(repoRoot, ".pi/extensions/ascet/index.ts");
const loadResult = await withStage("load_extension", async () => {
	const result = await loadExtensions([extensionPath], repoRoot);
	if (result.errors.length > 0) {
		throw new Error(`ASCET extension failed to load: ${JSON.stringify(result.errors)}`);
	}
	return result;
});

const extension = loadResult.extensions.find((entry) => entry.path.replaceAll("\\", "/").endsWith("ascet/index.ts"));
const writeTool = extension?.tools.get("ascet_write")?.definition;
const readTool = extension?.tools.get("ascet_read_code")?.definition;
const verifyTool = extension?.tools.get("ascet_verify")?.definition;
if (!writeTool || !readTool || !verifyTool) {
	throw new Error("ASCET write/read/verify tools are not registered");
}

const signal = new AbortController().signal;
const writeContext = {
	cwd: repoRoot,
	hasUI: true,
	ui: {
		confirm: async () => true,
	},
};

async function executeTool(toolName: string, params: Record<string, unknown>, ctx: Record<string, unknown>) {
	const tool = extension?.tools.get(toolName)?.definition;
	if (!tool) {
		throw new Error(`ASCET tool is not registered: ${toolName}`);
	}
	const response = await tool.execute(`ascet-write-smoke-${toolName}`, params, signal, undefined, ctx);
	const outcome = response.details?.outcome;
	if (outcome) {
		if (outcome.status !== "ok") {
			throw new Error(`${toolName} failed: ${outcome.error?.message ?? outcome.message ?? outcome.status}`);
		}
		return response;
	}
	if (!response.details.ok) {
		throw new Error(`${toolName} failed: ${response.details.error?.message ?? "unknown"}`);
	}
	return response;
}

const createFolderResponse = await withStage("create_folder", () => executeTool(
	"ascet_write",
	{ action: "create_folder", folderPath, verifyReadback: true, executeWrite: true },
	writeContext,
));
const createComponentResponse = await withStage("create_component", () => executeTool(
	"ascet_write",
	{
		action: "create_component",
		componentPath,
		kind: "class",
		language: "ESDL",
		ifExists: "return-existing",
		verifyReadback: true,
		executeWrite: true,
	},
	writeContext,
));
const createMethodResponse = await withStage("create_method", () => executeTool(
	"ascet_write",
	{
		action: "create_method",
		componentPath,
		methodName,
		methodKind: "abstract",
		ifExists: "return-existing",
		verifyReadback: true,
		executeWrite: true,
	},
	writeContext,
));

const writeResponse = await withStage("set_class_method_code", () => executeTool(
	"ascet_write",
	{ action: "set_class_method_code", classPath: componentPath, methodName, codeFile, verifyReadback: true, executeWrite: true },
	writeContext,
));

const readResponse = await withStage("read_method_code", () => readTool.execute(
	"ascet-write-smoke-read-method-code",
	{ action: "method", componentPath, methodName },
	signal,
	undefined,
	{ cwd: repoRoot },
));

if (!readResponse.details.ok) {
	throw new Error(`ascet_read_method_code failed: ${readResponse.details.error?.message ?? "unknown"}`);
}

const verifyResponse = await withStage("verify_readback", () => verifyTool.execute(
	"ascet-write-smoke-verify-readback",
	{ action: "readback", objectKind: "class", componentPath },
	signal,
	undefined,
	{ cwd: repoRoot },
));

if (!verifyResponse.details.ok) {
	throw new Error(`ascet_verify_readback failed: ${verifyResponse.details.error?.message ?? "unknown"}`);
}

console.log(
	JSON.stringify(
		{
			ok: true,
			componentPath,
			methodName,
			codeFile,
			setup: {
				folder: createFolderResponse.details.outcome,
				component: createComponentResponse.details.outcome,
				method: createMethodResponse.details.outcome,
			},
			write: writeResponse.details.outcome,
			readback: {
				methodName: readResponse.details.data?.result?.methodName,
				code: readResponse.details.data?.result?.code,
			},
			verify: verifyResponse.details.data?.result,
		},
		null,
		2,
	),
);
