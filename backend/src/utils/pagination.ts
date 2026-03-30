import { AppError } from "./errors";

export type PaginationInput = {
  page: number;
  pageSize: number;
  skip: number;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export const getPagination = (
  pageValue: unknown,
  limitValue: unknown,
  fallback = 12
): PaginationInput => {
  const page = Number(pageValue ?? 1);
  const pageSize = Number(limitValue ?? fallback);

  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1) {
    throw new AppError(400, "INVALID_PAGINATION", "Pagination parameters are invalid.");
  }

  return {
    page,
    pageSize: Math.min(pageSize, 100),
    skip: (page - 1) * Math.min(pageSize, 100)
  };
};

export const toPaginationMeta = (
  pagination: PaginationInput,
  total: number
): PaginationMeta => ({
  page: pagination.page,
  pageSize: pagination.pageSize,
  total,
  totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
  hasPreviousPage: pagination.page > 1,
  hasNextPage: pagination.page * pagination.pageSize < total
});

