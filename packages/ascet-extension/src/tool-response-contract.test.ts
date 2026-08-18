import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	compactObject,
	createHashSummary,
	createPagedResult,
	createToolError,
	normalizeApiPath,
	toToolSuccessPayload,
} from "./tool-response-contract.ts";

describe("tool response contract", () => {
	test("normalizes API paths to forward slashes", () => {
		assert.equal(normalizeApiPath("AEB\\Private\\Controller"), "AEB/Private/Controller");
		assert.deepEqual(compactObject({ componentPath: "AEB\\Private\\Controller" }), {
			component: "AEB/Private/Controller",
		});
		assert.deepEqual(compactObject({ projectPath: "AEB\\Private\\Project" }), {
			project: "AEB/Private/Project",
		});
	});

	test("compacts successful CLI envelopes into business JSON", () => {
		const payload = toToolSuccessPayload({
			ok: true,
			result: {
				componentPath: "AEB\\Core",
				totalMatches: 1,
				matches: [
					{
						elementName: "P_AEB_IB_MaxVelocityDrop_Curve",
						displayName: "P_AEB_IB_MaxVelocityDrop_Curve",
						displayType: "cont",
						displayScope: "exported",
						componentPath: "AEB\\Core",
					},
				],
			},
			error: null,
			meta: { mode: "exec", operation: "get_elements" },
		});

		assert.deepEqual(payload, {
			component: "AEB/Core",
			total: 1,
			items: [
				{
					name: "P_AEB_IB_MaxVelocityDrop_Curve",
					type: "cont",
					scope: "exported",
					component: "AEB/Core",
				},
			],
		});
		assert.doesNotMatch(JSON.stringify(payload), /"ok"|error|null|"meta"|"mode"|"operation"/);
	});

	test("normalizes PascalCase C# payload keys before compacting", () => {
		const payload = compactObject({
			ComponentPath: "TEST\\TestClassESDL",
			ComponentKind: "Class",
			LanguageKind: "ESDL",
			MethodName: "calc",
			MethodKind: "AbstractMethod",
			PreviousCodeLength: 42,
			NewCodeLength: 42,
			WriteSucceeded: true,
			VerifyReadbackRequested: true,
			ReadbackVerified: true,
		});

		assert.deepEqual(payload, {
			component: "TEST/TestClassESDL",
			kind: "Class",
			language: "ESDL",
			name: "calc",
			type: "AbstractMethod",
			previousCodeLength: 42,
			newCodeLength: 42,
			writeSucceeded: true,
			verifyReadbackRequested: true,
			readbackVerified: true,
		});
	});

	test("preserves empty semantic arrays and empty code text", () => {
		assert.deepEqual(compactObject({ text: "", elements: [], implementations: [], states: [], transitions: [] }), {
			text: "",
			elements: [],
			implementations: [],
			states: [],
			transitions: [],
		});
	});

	test("keeps empty result shape stable", () => {
		assert.deepEqual(createPagedResult([]), {
			total: 0,
			items: [],
		});
		assert.deepEqual(toToolSuccessPayload({ ok: true, result: {}, error: null, meta: {} }), {
			total: 0,
			items: [],
		});
	});

	test("creates structured tool errors", () => {
		assert.deepEqual(
			createToolError({
				code: "ascet_cli_failed",
				message: "ASCET command failed.",
				recover: ["Run ascet_status."],
				details: { componentPath: "AEB\\Core", ignored: "" },
			}),
			{
				error: {
					code: "ascet_cli_failed",
					message: "ASCET command failed.",
					recover: ["Run ascet_status."],
					details: { component: "AEB/Core" },
				},
			},
		);
	});

	test("creates code hash summaries without returning full text", () => {
		assert.deepEqual(createHashSummary({ text: "a = 1;\nreturn a;", language: "ESDL" }), {
			hash: "79a8cbda55b80fd00ec6d87ce486b433f196a9c221317fa816ea118bfd48b4ea",
			lineCount: 2,
			byteCount: 16,
			language: "ESDL",
		});
	});
});
