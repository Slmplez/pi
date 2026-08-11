import { Type } from "typebox";

export interface AscetPublicWriteControl {
	executeWrite?: boolean;
}

export const ascetWriteControlProperties = {
	executeWrite: Type.Optional(Type.Boolean()),
};
