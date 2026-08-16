export const ascetBackendCommandAliases = {
	AscetReadCode: "AscetReadTextCode",
	AscetCreateDependentChain: "AscetConfigureParameterDependencyChainExecute",
} as const;

export type AscetLogicalCommandId = keyof typeof ascetBackendCommandAliases | string;

export function resolveAscetBackendCommandId(logicalCommandId: string): string {
	return ascetBackendCommandAliases[logicalCommandId as keyof typeof ascetBackendCommandAliases] ?? logicalCommandId;
}
