export interface PaginationParams {
	offset?: number;
	limit?: number;
}

export interface PaginationResult<T> {
	items: T[];
	totalCount: number;
	returnedCount: number;
	offset: number;
	limit: number;
	hasMore: boolean;
	nextOffset?: number;
}

export function paginate<T>(items: T[], params: PaginationParams): PaginationResult<T> {
	const offset = Math.max(0, params.offset ?? 0);
	const limit = Math.max(1, Math.min(50, params.limit ?? 10));
	const page = items.slice(offset, offset + limit);
	const nextOffset = offset + page.length;
	const hasMore = nextOffset < items.length;
	return {
		items: page,
		totalCount: items.length,
		returnedCount: page.length,
		offset,
		limit,
		hasMore,
		nextOffset: hasMore ? nextOffset : undefined,
	};
}
