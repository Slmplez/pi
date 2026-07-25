import type { AscetProfile } from "./profiles.ts";
import { DEFAULT_ASCET_PROFILE, isBatchWriteEnabled, resolveProfileTools } from "./profiles.ts";

export interface AscetExposureMetadata {
	profile: AscetProfile;
	activeTools: string[];
	batchWriteEnabled: boolean;
}

type ProfileActivator = (profile: AscetProfile) => AscetExposureMetadata;

let currentMetadata: AscetExposureMetadata = {
	profile: DEFAULT_ASCET_PROFILE,
	activeTools: resolveProfileTools(DEFAULT_ASCET_PROFILE),
	batchWriteEnabled: isBatchWriteEnabled(),
};
let activateProfileHandler: ProfileActivator | undefined;

function cloneMetadata(metadata: AscetExposureMetadata): AscetExposureMetadata {
	return {
		profile: metadata.profile,
		activeTools: [...metadata.activeTools],
		batchWriteEnabled: metadata.batchWriteEnabled,
	};
}

export function setAscetExposureRuntime(metadata: AscetExposureMetadata, activator: ProfileActivator): void {
	currentMetadata = cloneMetadata(metadata);
	activateProfileHandler = activator;
}

export function updateAscetExposureMetadata(metadata: AscetExposureMetadata): void {
	currentMetadata = cloneMetadata(metadata);
}

export function getAscetExposureMetadata(): AscetExposureMetadata {
	return cloneMetadata(currentMetadata);
}

export function activateAscetExposureProfile(profile: AscetProfile): AscetExposureMetadata | undefined {
	return activateProfileHandler?.(profile);
}
