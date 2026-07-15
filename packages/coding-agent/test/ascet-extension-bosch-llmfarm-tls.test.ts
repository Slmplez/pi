import { describe, expect, it } from "vitest";
import { type BoschTlsApi, createBoschSystemCaEnsurer } from "../../ascet-extension/src/bosch-llmfarm-tls.ts";

function createTlsApi(
	defaultCertificates: string[],
	systemCertificates: string[],
): BoschTlsApi & { configured: string[][] } {
	const configured: string[][] = [];
	return {
		configured,
		getCACertificates: (type) => (type === "default" ? defaultCertificates : systemCertificates),
		setDefaultCACertificates: (certificates) => configured.push(certificates),
	};
}

describe("bosch-llmfarm TLS helper", () => {
	it("merges Node default CA with system CA before configuring TLS", () => {
		const tlsApi = createTlsApi(["default-a", "default-b"], ["system-a"]);
		const ensureSystemCa = createBoschSystemCaEnsurer(tlsApi);

		const result = ensureSystemCa();

		expect(result).toEqual({
			configured: true,
			defaultCertificateCount: 2,
			systemCertificateCount: 1,
		});
		expect(tlsApi.configured).toEqual([["default-a", "default-b", "system-a"]]);
	});

	it("does not configure TLS when the system CA store is empty", () => {
		const tlsApi = createTlsApi(["default-a"], []);
		const ensureSystemCa = createBoschSystemCaEnsurer(tlsApi);

		const result = ensureSystemCa();

		expect(result).toEqual({
			configured: false,
			defaultCertificateCount: 1,
			systemCertificateCount: 0,
		});
		expect(tlsApi.configured).toEqual([]);
	});

	it("configures TLS only once for repeated calls", () => {
		const tlsApi = createTlsApi(["default-a"], ["system-a"]);
		const ensureSystemCa = createBoschSystemCaEnsurer(tlsApi);

		ensureSystemCa();
		const secondResult = ensureSystemCa();

		expect(secondResult).toEqual({
			configured: true,
			defaultCertificateCount: 0,
			systemCertificateCount: 0,
		});
		expect(tlsApi.configured).toHaveLength(1);
	});

	it("does not leak PEM certificate content when TLS configuration fails", () => {
		const pem = "-----BEGIN CERTIFICATE-----secret-ca-----END CERTIFICATE-----";
		const tlsApi = createTlsApi(["default-a"], [pem]);
		tlsApi.setDefaultCACertificates = () => {
			throw new Error(`cannot configure ${pem}`);
		};
		const ensureSystemCa = createBoschSystemCaEnsurer(tlsApi);

		expect(() => ensureSystemCa()).toThrow("Failed to configure Bosch LLM Farm system CA");
		expect(() => ensureSystemCa()).not.toThrow(pem);
	});

	it("surfaces unsupported Node runtimes without leaking certificates", () => {
		const pem = "-----BEGIN CERTIFICATE-----secret-ca-----END CERTIFICATE-----";
		const tlsApi = createTlsApi(["default-a"], [pem]);
		tlsApi.setDefaultCACertificates = () => {
			throw new Error("Node runtime does not support tls.setDefaultCACertificates().");
		};
		const ensureSystemCa = createBoschSystemCaEnsurer(tlsApi);

		expect(() => ensureSystemCa()).toThrow(
			"Node runtime does not support tls.setDefaultCACertificates(). Use Node ^22.19.0 or >=24.5.0, or set NODE_OPTIONS=--use-system-ca as a temporary workaround.",
		);
		expect(() => ensureSystemCa()).not.toThrow(pem);
	});
});
