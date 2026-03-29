import type { UserRole } from "./users";

export type ProductCacheKeyInput = {
  page: number;
  limit: number;
  categoryId?: string | null;
  search?: string | null;
  sort?: string | null;
};

const normalizeSearch = (search?: string | null): string => {
  return search?.trim().toLowerCase() ?? "";
};

export const cachePrefixes = {
  categories: "catalog:categories:",
  products: "catalog:products:",
  search: "catalog:search:",
  profile: "profile:user="
} as const;

export const getCategoriesCacheKey = (input: {
  page: number;
  limit: number;
}): string => {
  return `${cachePrefixes.categories}page=${input.page}:limit=${input.limit}`;
};

export const getProductsCacheKey = (input: ProductCacheKeyInput): string => {
  const normalizedSearch = normalizeSearch(input.search);
  const prefix = normalizedSearch ? cachePrefixes.search : cachePrefixes.products;

  return `${prefix}page=${input.page}:limit=${input.limit}:category=${input.categoryId ?? "all"}:search=${encodeURIComponent(normalizedSearch || "all")}:sort=${input.sort ?? "latest"}`;
};

export const getProfileCacheKey = (userId: string, role: UserRole): string => {
  return `${cachePrefixes.profile}${userId}:role=${role}`;
};

export const getProfileCachePrefix = (userId: string): string => {
  return `${cachePrefixes.profile}${userId}:`;
};
