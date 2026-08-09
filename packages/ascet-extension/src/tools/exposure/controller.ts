import type { AscetExtensionAPI } from "../../core/tool.ts";
import { allAscetToolNameSet } from "../registry.ts";
import { buildProfiledAscetTools } from "./profiled-tools.ts";
import {
	type AscetProfile,
	DEFAULT_ASCET_PROFILE,
	isAscetProfile,
	isBatchWriteEnabled,
	resolveProfileTools,
} from "./profiles.ts";
import type { AscetExposureMetadata } from "./state.ts";

export interface AscetExposureController {
	getProfile(): AscetProfile;
	getMetadata(): AscetExposureMetadata;
	registerProfileTools(profile?: AscetProfile): void;
	activateProfile(profile: AscetProfile): void;
}

export function resolveInitialProfile(env: Record<string, string | undefined> = process.env): AscetProfile {
	const configured = env.PI_ASCET_PROFILE;
	return isAscetProfile(configured) ? configured : DEFAULT_ASCET_PROFILE;
}

export function createAscetExposureController(
	pi: Pick<AscetExtensionAPI, "registerTool" | "getActiveTools" | "setActiveTools">,
	options: { env?: Record<string, string | undefined>; initialProfile?: AscetProfile } = {},
): AscetExposureController {
	const env = options.env ?? process.env;
	let activeProfile = options.initialProfile ?? resolveInitialProfile(env);
	let registeredProfile: AscetProfile | undefined;

	function createMetadata(profile: AscetProfile, activeAscetTools: string[]): AscetExposureMetadata {
		return {
			profile,
			activeTools: [...activeAscetTools],
			batchWriteEnabled: isBatchWriteEnabled(env),
		};
	}

	function registerProfileTools(profile: AscetProfile = activeProfile): void {
		if (registeredProfile === profile) {
			return;
		}
		const activeAscetTools = resolveProfileTools(profile, env);
		for (const tool of buildProfiledAscetTools(profile, activeAscetTools, env)) {
			pi.registerTool(tool);
		}
		registeredProfile = profile;
	}

	function activateProfile(profile: AscetProfile): void {
		activeProfile = profile;
		const activeAscetTools = resolveProfileTools(profile, env);
		registerProfileTools(profile);
		if (!pi.setActiveTools) {
			return;
		}
		const current = pi.getActiveTools?.() ?? [];
		const nonAscet = current.filter((name) => !allAscetToolNameSet.has(name));
		pi.setActiveTools([...new Set([...nonAscet, ...activeAscetTools])]);
	}

	return {
		getProfile: () => activeProfile,
		getMetadata: () => createMetadata(activeProfile, resolveProfileTools(activeProfile, env)),
		registerProfileTools,
		activateProfile,
	};
}
