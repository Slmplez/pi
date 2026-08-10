import * as tls from "node:tls";

export interface BoschSystemCaApi {
	getCACertificates(type: "default" | "system"): string[];
	setDefaultCACertificates(certificates: string[]): void;
}

export interface BoschSystemCaResult {
	configured: boolean;
	defaultCertificateCount: number;
	systemCertificateCount: number;
}

const UNSUPPORTED_SET_DEFAULT_CA_ERROR =
	"Node runtime does not support tls.setDefaultCACertificates(). Use Node ^22.19.0 or >=24.5.0, or set NODE_OPTIONS=--use-system-ca as a temporary workaround.";

const tlsModule = tls as typeof tls & {
	setDefaultCACertificates?: (certificates: string[]) => void;
};

const nodeTlsApi: BoschSystemCaApi = {
	getCACertificates: (type) => tlsModule.getCACertificates(type),
	setDefaultCACertificates: (certificates) => {
		if (typeof tlsModule.setDefaultCACertificates !== "function") {
			throw new Error(UNSUPPORTED_SET_DEFAULT_CA_ERROR);
		}
		tlsModule.setDefaultCACertificates(certificates);
	},
};

export function createBoschSystemCaEnsurer(api: BoschSystemCaApi): () => BoschSystemCaResult {
	let systemCaConfigured = false;

	return () => {
		if (systemCaConfigured) {
			return {
				configured: true,
				defaultCertificateCount: 0,
				systemCertificateCount: 0,
			};
		}

		const defaultCertificates = api.getCACertificates("default");
		const systemCertificates = api.getCACertificates("system");

		if (systemCertificates.length === 0) {
			return {
				configured: false,
				defaultCertificateCount: defaultCertificates.length,
				systemCertificateCount: 0,
			};
		}

		try {
			api.setDefaultCACertificates([...new Set([...defaultCertificates, ...systemCertificates])]);
		} catch (error) {
			if (
				error instanceof Error &&
				error.message.startsWith("Node runtime does not support tls.setDefaultCACertificates()")
			) {
				throw new Error(UNSUPPORTED_SET_DEFAULT_CA_ERROR);
			}
			throw new Error("Failed to configure Bosch system CA");
		}

		systemCaConfigured = true;
		return {
			configured: true,
			defaultCertificateCount: defaultCertificates.length,
			systemCertificateCount: systemCertificates.length,
		};
	};
}

export const ensureBoschSystemCa = createBoschSystemCaEnsurer(nodeTlsApi);