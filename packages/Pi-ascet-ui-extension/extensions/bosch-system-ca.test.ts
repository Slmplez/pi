import assert from "node:assert/strict";
import { test } from "node:test";
import { createBoschSystemCaEnsurer } from "./bosch-system-ca.ts";

test("createBoschSystemCaEnsurer merges default and system certificates once", () => {
	const setCalls: string[][] = [];
	const ensure = createBoschSystemCaEnsurer({
		getCACertificates: (type) => (type === "default" ? ["default-1", "shared"] : ["shared", "system-1"]),
		setDefaultCACertificates: (certificates) => {
			setCalls.push(certificates);
		},
	});

	assert.deepEqual(ensure(), {
		configured: true,
		defaultCertificateCount: 2,
		systemCertificateCount: 2,
	});
	assert.deepEqual(setCalls, [["default-1", "shared", "system-1"]]);
	assert.deepEqual(ensure(), {
		configured: true,
		defaultCertificateCount: 0,
		systemCertificateCount: 0,
	});
	assert.equal(setCalls.length, 1);
});

test("createBoschSystemCaEnsurer reports missing system certificates without changing defaults", () => {
	let setCalled = false;
	const ensure = createBoschSystemCaEnsurer({
		getCACertificates: (type) => (type === "default" ? ["default-1"] : []),
		setDefaultCACertificates: () => {
			setCalled = true;
		},
	});

	assert.deepEqual(ensure(), {
		configured: false,
		defaultCertificateCount: 1,
		systemCertificateCount: 0,
	});
	assert.equal(setCalled, false);
});