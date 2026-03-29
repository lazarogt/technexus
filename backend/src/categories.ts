import pool from "./db";
import type { PaginationInput, PaginationMeta } from "./pagination";
import { toPaginationMeta } from "./pagination";

export type CategoryRecord = {
  id: string;
  name: string;
};

type CategoryRow = CategoryRecord & {
  totalCount: number;
};

export type PaginatedCategories = {
  categories: CategoryRecord[];
  pagination: PaginationMeta;
};

const normalizeCategoryName = (name: string): string => {
  return name.trim();
};

export const listCategories = async (
  pagination: PaginationInput
): Promise<PaginatedCategories> => {
  const result = await pool.query<CategoryRow>(
    `
      SELECT
        id,
        name,
        COUNT(*) OVER()::int AS "totalCount"
      FROM technexus.categories
      ORDER BY name ASC
      LIMIT $1
      OFFSET $2
    `
    ,
    [pagination.pageSize, pagination.offset]
  );

  const total = result.rows[0]?.totalCount ?? 0;

  return {
    categories: result.rows.map(({ totalCount: _totalCount, ...category }) => category),
    pagination: toPaginationMeta(pagination, total)
  };
};

export const createCategory = async (name: string): Promise<CategoryRecord> => {
  const result = await pool.query<CategoryRecord>(
    `
      INSERT INTO technexus.categories (name)
      VALUES ($1)
      RETURNING id, name
    `,
    [normalizeCategoryName(name)]
  );

  return result.rows[0];
};

export const updateCategory = async (
  id: string,
  name: string
): Promise<CategoryRecord | null> => {
  const result = await pool.query<CategoryRecord>(
    `
      UPDATE technexus.categories
      SET name = $2
      WHERE id = $1
      RETURNING id, name
    `,
    [id, normalizeCategoryName(name)]
  );

  return result.rows[0] ?? null;
};

export const deleteCategory = async (id: string): Promise<boolean> => {
  const result = await pool.query(
    `
      DELETE FROM technexus.categories
      WHERE id = $1
    `,
    [id]
  );

  return (result.rowCount ?? 0) > 0;
};
