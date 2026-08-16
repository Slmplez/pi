import { Type } from "typebox";

export const ascetPublicErrorResultSchema = Type.Object(
	{
		error: Type.Object(
			{
				code: Type.String({ minLength: 1 }),
				message: Type.String({ minLength: 1 }),
			},
			{ additionalProperties: true },
		),
	},
	{ additionalProperties: false },
);

export const ascetItemsSuccessResultSchema = Type.Object(
	{
		count: Type.Integer({ minimum: 0 }),
		items: Type.Array(Type.Unknown()),
		more: Type.Optional(Type.Literal(true)),
	},
	{ additionalProperties: false },
);

export const ascetItemsResultSchema = Type.Union([ascetItemsSuccessResultSchema, ascetPublicErrorResultSchema]);
