import type { AscetProfile } from "./profiles.ts";

export interface AscetExposureMetadata {
	profile: AscetProfile;
	activeTools: string[];
	batchWriteEnabled: boolean;
}
