export type PaginationInput = {
  page: number;
  pageSize: number;
  offset: number;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

const defaultPage = 1;
const defaultPageSize = 12;
const maxPageSize = 50;

export const getPaginationInput = (
  pageValue: unknown,
  pageSizeValue: unknown,
  fallbackPageSize = defaultPageSize
): PaginationInput | null => {
  const parsedPage =
    typeof pageValue === "string" && pageValue.trim().length > 0
      ? Number(pageValue)
      : defaultPage;
  const parsedPageSize =
    typeof pageSizeValue === "string" && pageSizeValue.trim().length > 0
      ? Number(pageSizeValue)
      : fallbackPageSize;

  if (
    !Number.isInteger(parsedPage) ||
    !Number.isInteger(parsedPageSize) ||
    parsedPage <= 0 ||
    parsedPageSize <= 0 ||
    parsedPageSize > maxPageSize
  ) {
    return null;
  }

  return {
    page: parsedPage,
    pageSize: parsedPageSize,
    offset: (parsedPage - 1) * parsedPageSize
  };
};

export const toPaginationMeta = (
  input: PaginationInput,
  total: number
): PaginationMeta => {
  const totalPages = Math.max(1, Math.ceil(total / input.pageSize));

  return {
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages,
    hasPreviousPage: input.page > 1,
    hasNextPage: input.page < totalPages
  };
};
