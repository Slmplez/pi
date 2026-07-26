import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../../cli.ts";
import { resetAscetSearchIndexForTest } from "../../search-index.ts";
import { ingestAscetSearchIndexSqlite } from "../../search-index-sqlite/ingest.ts";
import type { AscetSearchIndexBuildInput } from "../../search-index-store.ts";
import { ascetSearchParameters, formatAscetSearchResult, runAscetSearch } from "../search.ts";

const originalSearchIndexStorage = process.env.PI_ASCET_SEARCH_INDEX_STORAGE;

beforeEach(() => {
	process.env.PI_ASCET_SEARCH_INDEX_STORAGE = "memory";
});

afterEach(() => {
	resetAscetSearchIndexForTest();
	if (originalSearchIndexStorage === undefined) {
		delete process.env.PI_ASCET_SEARCH_INDEX_STORAGE;
	} else {
		process.env.PI_ASCET_SEARCH_INDEX_STORAGE = originalSearchIndexStorage;
	}
});

describe("ascet_search public schema", () => {
	test("exposes UI-semantic quick-search actions without internal search actions", () => {
		const actions = getActionLiterals();

		assert.ok(actions.includes("search_components"));
		assert.ok(actions.includes("search_projects"));
		assert.ok(actions.includes("search_project_formulas"));
		assert.ok(actions.includes("resolve_component"));
		assert.ok(actions.includes("search_elements"));
		assert.ok(actions.includes("declarations_of_element"));
		assert.ok(actions.includes("declarations_of_method_process"));
		assert.ok(actions.includes("declarations_of_method_process_element"));
		assert.ok(actions.includes("references_to_component"));
		assert.ok(actions.includes("references_to_element"));
		assert.ok(actions.includes("senders_of_message"));
		assert.ok(actions.includes("receivers_of_message"));
		assert.ok(actions.includes("text_in_code"));
		assert.ok(!actions.includes("search_occurrences"));
		assert.ok(!actions.includes("search_text_code"));
	});

	test("uses action-specific schemas so unrelated parameters are not exposed", () => {
		const schemas = getActionSchemas();

		assert.ok(!schemaFor(schemas, "references_to_component")?.properties?.methodName);
		assert.ok(!schemaFor(schemas, "text_in_code")?.properties?.group);
		assert.ok(!schemaFor(schemas, "declarations_of_element")?.properties?.methodName);
		assert.ok(!schemaFor(schemas, "search_projects")?.properties?.kind);
		assert.ok(schemaFor(schemas, "search_project_formulas")?.properties?.projectPath);
		assert.ok(!schemaFor(schemas, "search_project_formulas")?.properties?.componentPath);
		assert.ok(schemaFor(schemas, "declarations_of_method_process_element")?.properties?.methodName);
	});

	test("serves P0 searches from SQLite without an in-memory warm state", async () => {
		const cwd = mkdtempSync(join(tmpdir(), "pi-ascet-search-formulas-"));
		try {
			const seed: AscetSearchIndexBuildInput = {
				databaseName: "DemoDb",
				databasePath: "C:\\ASCET\\DemoDb",
				generatedAtMs: Date.parse("2026-07-25T00:00:00.000Z"),
				elapsedMs: 3,
				scanComplete: true,
				textCodeIncluded: true,
				textCodeScanComplete: true,
				components: [
					{
						path: "PlatformLibrary\\Package\\AEB\\AEB_Controller",
						name: "AEB_Controller",
						kind: "class",
						languageKind: "ESDL",
						displayName: "AEB_Controller",
						parentPath: "PlatformLibrary\\Package\\AEB",
						ownerKind: "folder",
						targetKind: "component",
						objectKind: "class",
					},
				],
				folders: [],
				folderItems: [],
				entries: [
					{
						group: "primitive",
						componentPath: "PlatformLibrary\\Package\\AEB\\AEB_Controller",
						componentKind: "class",
						componentLanguageKind: "ESDL",
						elementName: "P_AEB_IB_MaxVelocityDrop_Curve",
						elementKind: "cont",
						displayType: "OneDTableElement",
						displayScope: "exported",
						referencedComponentPath: "",
						path: "PlatformLibrary\\Package\\AEB\\AEB_Controller::P_AEB_IB_MaxVelocityDrop_Curve",
					},
				],
				methodDeclarations: [],
				componentRefs: [
					{
						sourceComponentPath: "PlatformLibrary\\Package\\AEB\\AEB_Controller",
						sourceElementName: "HoldReq",
						sourceElementKind: "ScalarElement",
						sourceElementScope: "local",
						targetComponentPath: "PlatformLibrary\\Package\\CSM_HoldReq",
						targetComponentName: "CSM_HoldReq",
						targetComponentKind: "enumeration",
						targetLanguageKind: "",
						resolved: true,
						path: "PlatformLibrary\\Package\\AEB\\AEB_Controller::HoldReq->PlatformLibrary\\Package\\CSM_HoldReq",
					},
				],
				elementRefs: [],
				dbItemDependencies: [],
				projectFormulas: [
					{
						projectPath: "PlatformLibrary\\Package\\AEB\\AEB_Project",
						name: "RPM",
						runtimeType: "Formula",
					},
				],
				projectItems: [],
				textCodeEntries: [
					{
						componentPath: "PlatformLibrary\\Package\\AEB\\AEB_Controller",
						componentKind: "class",
						componentLanguageKind: "ESDL",
						section: "body",
						methodName: "calc",
						methodKind: "AbstractMethod",
						text: "C_AEB_IB_MaxVelocityDrop_Curve.getAt(AEB_v_Init);",
						path: "PlatformLibrary\\Package\\AEB\\AEB_Controller::calc#body",
					},
				],
				messages: [],
				diagramMetadata: [],
			};
			ingestAscetSearchIndexSqlite(cwd, seed);
			process.env.PI_ASCET_SEARCH_INDEX_STORAGE = "sqlite";
			const executeCli = async (request: AscetCliRequest) => {
				throw new Error(`Unexpected live CLI call: ${request.args.join(" ")}`);
			};

			const result = await runAscetSearch(
				{
					action: "search_project_formulas",
					query: "RPM",
					projectPath: "PlatformLibrary/Package/AEB/AEB_Project",
					match: "exact",
					limit: 10,
				},
				{
					cwd,
					executeCli,
				},
			);
			const data = result.data as { result?: { matches?: Array<{ name?: string; projectPath?: string }> } };

			assert.equal(result.ok, true);
			assert.equal(data.result?.matches?.[0]?.name, "RPM");
			assert.equal(data.result?.matches?.[0]?.projectPath, "PlatformLibrary/Package/AEB/AEB_Project");
			for (const params of [
				{
					action: "declarations_of_element" as const,
					query: "P_AEB_IB_MaxVelocityDrop_Curve",
					match: "exact" as const,
				},
				{ action: "text_in_code" as const, query: "getAt", match: "contains" as const },
				{ action: "references_to_component" as const, query: "CSM_HoldReq", match: "contains" as const },
			]) {
				const indexed = await runAscetSearch(params, { cwd, executeCli });
				const payload = indexed.data as { result?: { matches?: unknown[] } };
				assert.equal(indexed.ok, true);
				assert.ok((payload.result?.matches?.length ?? 0) > 0);
			}
			const concurrentParams = Array.from({ length: 20 }, (_, index) => {
				const actionIndex = index % 4;
				if (actionIndex === 0) {
					return {
						action: "declarations_of_element" as const,
						query: "P_AEB_IB_MaxVelocityDrop_Curve",
						match: "exact" as const,
					};
				}
				if (actionIndex === 1) {
					return { action: "search_project_formulas" as const, query: "RPM", match: "contains" as const };
				}
				if (actionIndex === 2) {
					return { action: "text_in_code" as const, query: "getAt", match: "contains" as const };
				}
				return { action: "references_to_component" as const, query: "CSM_HoldReq", match: "contains" as const };
			});
			const concurrentResults = await Promise.all(
				concurrentParams.map((params) => runAscetSearch(params, { cwd, executeCli })),
			);
			assert.equal(
				concurrentResults.every((indexed) => indexed.ok),
				true,
			);
		} finally {
			rmSync(cwd, { recursive: true, force: true });
		}
	});

	test("serves search_projects from the components object index", async () => {
		resetAscetSearchIndexForTest({
			databaseName: "DemoDb",
			databasePath: "C:\\ASCET\\DemoDb",
			generatedAtMs: Date.parse("2026-07-25T00:00:00.000Z"),
			elapsedMs: 3,
			scanComplete: true,
			entries: [],
			components: [
				{
					path: "PlatformLibrary\\Package\\AEB\\AEB_Project",
					name: "AEB_Project",
					kind: "project",
					languageKind: "",
					displayName: "AEB_Project",
					parentPath: "PlatformLibrary\\Package\\AEB",
					ownerKind: "",
					targetKind: "project",
					objectKind: "project",
				},
				{
					path: "PlatformLibrary\\Package\\AEB\\AEB_Controller",
					name: "AEB_Controller",
					kind: "class",
					languageKind: "ESDL",
					displayName: "AEB_Controller",
					parentPath: "PlatformLibrary\\Package\\AEB",
					ownerKind: "",
					targetKind: "component",
					objectKind: "class",
				},
			],
		});

		const result = await runAscetSearch(
			{
				action: "search_projects",
				query: "AEB",
				scopePath: "PlatformLibrary/Package",
				match: "contains",
				limit: 10,
			},
			{ cwd: process.cwd() },
		);
		const formatted = formatAscetSearchResult({ action: "search_projects", query: "AEB" }, result);
		const parsed = JSON.parse(formatted);

		assert.equal(parsed.total, 1);
		assert.equal(parsed.items[0].path, "PlatformLibrary/Package/AEB/AEB_Project");
		assert.equal(parsed.items[0].name, "AEB_Project");
		assert.equal(parsed.items[0].kind, "project");
		assert.equal(parsed.items[0].language, undefined);
	});

	test("maps search_projects to project-kind component fallback when index is disabled", async () => {
		const requests: AscetCliRequest[] = [];

		await runAscetSearch(
			{
				action: "search_projects",
				query: "AEB",
				scopePath: "PlatformLibrary",
				match: "contains",
				limit: 10,
			},
			{ cwd: process.cwd(), env: { PI_ASCET_SEARCH_INDEX: "0" }, executeCli: captureOk(requests) },
		);

		assert.deepEqual(requests[0]?.args, [
			"exec",
			"search_components",
			"AEB",
			"--kind",
			"project",
			"--scope",
			"PlatformLibrary",
			"--match",
			"contains",
			"--limit",
			"10",
			"--json",
		]);
	});

	test("maps declarations_of_element to indexed element declaration search", async () => {
		const requests: AscetCliRequest[] = [];

		await runAscetSearch(
			{
				action: "declarations_of_element",
				query: "P_AEB_IB_MaxVelocityDrop_Curve",
				scopePath: "AEB",
				match: "exact",
				limit: 5,
			},
			{ cwd: process.cwd(), env: { PI_ASCET_SEARCH_INDEX: "0" }, executeCli: captureOk(requests) },
		);

		assert.deepEqual(requests[0]?.args, [
			"exec",
			"search_elements",
			"P_AEB_IB_MaxVelocityDrop_Curve",
			"--scope",
			"AEB",
			"--match",
			"exact",
			"--limit",
			"5",
			"--json",
		]);
	});

	test("maps method/process declaration actions to element declaration search with semantic filters", async () => {
		const methodRequests: AscetCliRequest[] = [];
		await runAscetSearch(
			{ action: "declarations_of_method_process", query: "calc", componentPath: "AEB\\Controller" },
			{ cwd: process.cwd(), env: { PI_ASCET_SEARCH_INDEX: "0" }, executeCli: captureOk(methodRequests) },
		);
		assert.deepEqual(methodRequests[0]?.args, [
			"exec",
			"search_elements",
			"calc",
			"--component",
			"AEB\\Controller",
			"--group",
			"complex",
			"--json",
		]);

		const elementRequests: AscetCliRequest[] = [];
		await runAscetSearch(
			{
				action: "declarations_of_method_process_element",
				query: "speed",
				componentPath: "AEB\\Controller",
				methodName: "calc",
				limit: 10,
			},
			{ cwd: process.cwd(), env: { PI_ASCET_SEARCH_INDEX: "0" }, executeCli: captureOk(elementRequests) },
		);
		assert.deepEqual(elementRequests[0]?.args, [
			"exec",
			"search_elements",
			"speed",
			"--component",
			"AEB\\Controller",
			"--group",
			"primitive",
			"--kind",
			"calc",
			"--limit",
			"10",
			"--json",
		]);
	});

	test("serves semantic quick-search actions from dedicated index partitions", async () => {
		const requests: AscetCliRequest[] = [];

		const methodResult = await runAscetSearch(
			{ action: "declarations_of_method_process", query: "calc", componentPath: "AEB\\Controller" },
			{ cwd: process.cwd(), executeCli: capturePartitionPayloads(requests) },
		);
		const methodEnvelope = methodResult.data as { result?: { matches?: Array<{ methodName?: string }> } };
		assert.equal(methodEnvelope.result?.matches?.[0]?.methodName, "calc");

		const componentRefResult = await runAscetSearch(
			{ action: "references_to_component", query: "Curve1D" },
			{ cwd: process.cwd(), executeCli: capturePartitionPayloads(requests) },
		);
		const componentRefEnvelope = componentRefResult.data as {
			result?: { matches?: Array<{ target?: { name?: string } }> };
		};
		assert.equal(componentRefEnvelope.result?.matches?.[0]?.target?.name, "Curve1D");

		const elementRefResult = await runAscetSearch(
			{ action: "references_to_element", query: "pidKp", componentPath: "AEB\\Controller" },
			{ cwd: process.cwd(), executeCli: capturePartitionPayloads(requests) },
		);
		const elementRefEnvelope = elementRefResult.data as { result?: { matches?: Array<{ name?: string }> } };
		assert.equal(elementRefEnvelope.result?.matches?.[0]?.name, "pidKp");

		const messageResult = await runAscetSearch(
			{ action: "senders_of_message", query: "Msg_Brake" },
			{ cwd: process.cwd(), executeCli: capturePartitionPayloads(requests) },
		);
		const messageEnvelope = messageResult.data as { result?: { matches?: Array<{ direction?: string }> } };
		assert.equal(messageEnvelope.result?.matches?.[0]?.direction, "sender");

		assert.deepEqual(
			requests.map((request) => request.args[request.args.indexOf("--partition") + 1]),
			["method_decls", "component_refs", "element_refs", "messages"],
		);
	});

	test("maps references_to_component through component_refs before occurrence fallback", async () => {
		const requests: AscetCliRequest[] = [];

		await runAscetSearch(
			{
				action: "references_to_component",
				query: "DEMO\\PID",
				scopePath: "DEMO",
				match: "exact",
				limit: 10,
			},
			{ cwd: process.cwd(), executeCli: captureOk(requests) },
		);

		assert.deepEqual(requests[0]?.args, [
			"exec",
			"warm_search_index",
			"--partition",
			"component_refs",
			"--json",
			"--max-components",
			"50",
			"--timeout-ms",
			"15000",
		]);
		assert.deepEqual(requests[1]?.args, [
			"exec",
			"search_occurrences",
			"DEMO\\PID",
			"--target",
			"component",
			"--scope",
			"DEMO",
			"--match",
			"exact",
			"--limit",
			"10",
			"--json",
		]);
	});

	test("maps references_to_element through element_refs before occurrence fallback", async () => {
		const requests: AscetCliRequest[] = [];

		await runAscetSearch(
			{ action: "references_to_element", query: "pid_kp", componentPath: "DEMO\\PID" },
			{ cwd: process.cwd(), executeCli: captureOk(requests) },
		);

		assert.deepEqual(requests[0]?.args.slice(0, 5), [
			"exec",
			"warm_search_index",
			"--partition",
			"element_refs",
			"--force",
		]);
		assert.deepEqual(requests[0]?.args.slice(5, 8), ["--component", "DEMO\\PID", "--json"]);
		assert.deepEqual(requests[1]?.args.slice(0, 6), [
			"exec",
			"search_occurrences",
			"pid_kp",
			"--target",
			"element",
			"--component",
		]);
		assert.equal(requests[1]?.args[6], "DEMO\\PID");
	});

	test("maps message sender and receiver actions through messages before occurrence fallback", async () => {
		const requests: AscetCliRequest[] = [];

		await runAscetSearch(
			{ action: "senders_of_message", query: "Msg_Brake", scopePath: "AEB", limit: 3 },
			{ cwd: process.cwd(), executeCli: captureOk(requests) },
		);
		await runAscetSearch(
			{ action: "receivers_of_message", query: "Msg_Brake", componentPath: "AEB\\Controller" },
			{ cwd: process.cwd(), executeCli: captureOk(requests) },
		);

		assert.deepEqual(requests[0]?.args.slice(0, 5), [
			"exec",
			"warm_search_index",
			"--partition",
			"messages",
			"--json",
		]);
		assert.deepEqual(requests[1]?.args, [
			"exec",
			"search_occurrences",
			"Msg_Brake",
			"--target",
			"element",
			"--scope",
			"AEB",
			"--limit",
			"3",
			"--json",
		]);
		assert.deepEqual(requests[2]?.args.slice(0, 5), [
			"exec",
			"warm_search_index",
			"--partition",
			"messages",
			"--force",
		]);
		assert.deepEqual(requests[2]?.args.slice(5, 8), ["--component", "AEB\\Controller", "--json"]);
		assert.deepEqual(requests[3]?.args.slice(0, 6), [
			"exec",
			"search_occurrences",
			"Msg_Brake",
			"--target",
			"element",
			"--component",
		]);
	});

	test("maps text_in_code to text-code index and scoped fallback", async () => {
		const requests: AscetCliRequest[] = [];

		await runAscetSearch(
			{
				action: "text_in_code",
				query: "speed - drop",
				componentPath: "AEB/Controller",
				match: "contains",
			},
			{
				cwd: process.cwd(),
				env: { PI_ASCET_SEARCH_INDEX: "0" },
				executeCli: async (request) => {
					requests.push(request);
					return okExecution(request, {
						componentPath: "AEB\\Controller",
						componentKind: "Module",
						languageKind: "ESDL",
						section: "body",
						text: "P_AEB_IB_MaxVelocityDrop_Curve = speed - drop;",
					});
				},
			},
		);

		assert.deepEqual(requests[0]?.args, ["exec", "read_text_code", "AEB\\Controller", "--json"]);
	});

	test("formats search results with compact pagination fields", () => {
		const formatted = formatAscetSearchResult(
			{ action: "declarations_of_element", query: "speed" },
			{
				ok: true,
				data: {
					ok: true,
					result: {
						query: "speed",
						cursor: "0",
						nextCursor: "1",
						searchComplete: false,
						counts: { matches: 1, totalCandidates: 2 },
						matches: [{ componentPath: "AEB\\Controller", elementName: "speed", elementKind: "cont" }],
					},
					error: null,
					meta: { mode: "index", operation: "search_elements" },
				},
				request: { cwd: process.cwd(), cliPath: "quick_search_index", args: [] },
				stdout: "",
				stderr: "",
				exitCode: 0,
				timedOut: false,
			},
		);

		const parsed = JSON.parse(formatted);
		assert.equal(parsed.nextCursor, "1");
		assert.equal(parsed.searchComplete, false);
		assert.equal(parsed.items[0].component, "AEB/Controller");
		assert.equal(parsed.items[0].name, "speed");
		assert.equal(parsed.matches, undefined);
	});

	test("formats occurrence fallback results with compact pagination items", () => {
		const formatted = formatAscetSearchResult(
			{ action: "senders_of_message", query: "Msg_Brake" },
			{
				ok: true,
				data: {
					ok: true,
					result: {
						query: "Msg_Brake",
						target: "element",
						nextCursor: "2",
						searchComplete: false,
						occurrences: [{ componentPath: "AEB\\Controller", elementName: "Msg_Brake", elementKind: "Message" }],
					},
					error: null,
					meta: { mode: "exec", operation: "search_occurrences" },
				},
				request: { cwd: process.cwd(), cliPath: "AscetCli.exe", args: [] },
				stdout: "",
				stderr: "",
				exitCode: 0,
				timedOut: false,
			},
		);

		const parsed = JSON.parse(formatted);
		assert.equal(parsed.items[0].component, "AEB/Controller");
		assert.equal(parsed.items[0].name, "Msg_Brake");
		assert.equal(parsed.occurrences, undefined);
	});
});

function getActionLiterals(): string[] {
	return getActionSchemas()
		.map(actionConst)
		.filter((value): value is string => typeof value === "string");
}

type JsonSchema = { properties?: Record<string, unknown> };
type ActionConstSchema = { const?: string; enum?: unknown[] };

function actionConst(schema: JsonSchema): string | undefined {
	const action = schema.properties?.action;
	if (action === null || typeof action !== "object") {
		return undefined;
	}
	const actionSchema = action as ActionConstSchema;
	if (typeof actionSchema.const === "string") {
		return actionSchema.const;
	}
	return Array.isArray(actionSchema.enum) && typeof actionSchema.enum[0] === "string"
		? actionSchema.enum[0]
		: undefined;
}

function getActionSchemas(): JsonSchema[] {
	const schema = ascetSearchParameters as {
		anyOf?: JsonSchema[];
		properties?: { action?: { anyOf?: Array<{ const?: string }> } };
	};
	if (schema.anyOf) {
		return schema.anyOf;
	}
	return (
		schema.properties?.action?.anyOf?.map((entry) => ({
			properties: { action: entry },
		})) ?? []
	);
}

function schemaFor(schemas: JsonSchema[], action: string): JsonSchema | undefined {
	return schemas.find((schema) => actionConst(schema) === action);
}

function captureOk(requests: AscetCliRequest[]) {
	return async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
		requests.push(request);
		return okExecution(request, {});
	};
}

function capturePartitionPayloads(requests: AscetCliRequest[]) {
	return async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
		requests.push(request);
		const partition = request.args[request.args.indexOf("--partition") + 1];
		const base = {
			operation: "warm_search_index",
			database: { name: "DemoDb", path: "C:\\ASCET\\DemoDb" },
			generatedAtUtc: "2026-07-25T00:00:00.000Z",
			elapsedMs: 3,
			scanComplete: true,
			components: [],
			entries: [],
		};
		if (partition === "method_decls") {
			return okExecution(request, {
				...base,
				methodDeclarations: [
					{
						group: "method",
						componentPath: "AEB\\Controller",
						componentKind: "module",
						componentLanguageKind: "ESDL",
						methodName: "calc",
						methodKind: "Process",
						path: "AEB\\Controller::calc",
					},
				],
			});
		}
		if (partition === "component_refs") {
			return okExecution(request, {
				...base,
				componentRefs: [
					{
						sourceComponentPath: "AEB\\Controller",
						sourceElementName: "speedCurve",
						sourceElementKind: "OneDTableElement",
						sourceElementScope: "local",
						targetComponentPath: "Common\\Curve1D",
						targetComponentName: "Curve1D",
						targetComponentKind: "class",
						targetLanguageKind: "ESDL",
						resolved: true,
						path: "AEB\\Controller::speedCurve->Common\\Curve1D",
					},
				],
			});
		}
		if (partition === "element_refs") {
			return okExecution(request, {
				...base,
				elementRefs: [
					{
						sourceComponentPath: "AEB\\Controller",
						sourceElementName: "pidKp",
						sourceElementKind: "ScalarElement",
						sourceElementScope: "local",
						targetComponentPath: "",
						targetComponentName: "",
						targetComponentKind: "",
						targetLanguageKind: "",
						resolved: false,
						referenceKind: "referenced_model_element",
						elementName: "pidKp",
						path: "AEB\\Controller::pidKp",
					},
				],
			});
		}
		if (partition === "messages") {
			return okExecution(request, {
				...base,
				messages: [
					{
						group: "primitive",
						componentPath: "AEB\\Controller",
						componentKind: "module",
						componentLanguageKind: "ESDL",
						elementName: "Msg_Brake",
						elementKind: "SendMessageElement",
						displayType: "message",
						displayScope: "local",
						referencedComponentPath: "",
						messageDirection: "sender",
						path: "AEB\\Controller::Msg_Brake",
					},
				],
			});
		}
		return okExecution(request, base);
	};
}

function okExecution(request: AscetCliRequest, payload: unknown): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result: payload, error: null, meta: { mode: "exec" } }),
		stderr: "",
		timedOut: false,
		request,
	};
}
