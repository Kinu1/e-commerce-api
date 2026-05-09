export type PaginationQuery = {
  page?: number;
  perPage?: number;
};

export function getPagination(query: PaginationQuery) {
  const page = Math.max(Number(query.page ?? 1), 1);
  const perPage = Math.min(Math.max(Number(query.perPage ?? 20), 1), 100);
  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}

export function paginated<T>(data: T[], total: number, page: number, perPage: number, path: string) {
  const totalPages = Math.ceil(total / perPage) || 1;
  return {
    data,
    meta: { total, page, per_page: perPage, total_pages: totalPages },
    links: {
      self: `${path}?page=${page}&per_page=${perPage}`,
      next: page < totalPages ? `${path}?page=${page + 1}&per_page=${perPage}` : null,
      last: `${path}?page=${totalPages}&per_page=${perPage}`
    }
  };
}
