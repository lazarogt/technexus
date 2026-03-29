import pool from "./db";
import type { PaginationInput, PaginationMeta } from "./pagination";
import { toPaginationMeta } from "./pagination";

export type ProductRecord = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  categoryName: string;
  sellerId: string;
  sellerName: string;
  images: string[];
};

export const productSorts = [
  "latest",
  "price-asc",
  "price-desc",
  "name-asc",
  "name-desc"
] as const;

export type ProductSort = (typeof productSorts)[number];

export const isProductSort = (value: string): value is ProductSort => {
  return productSorts.includes(value as ProductSort);
};

type ProductMutationInput = {
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  images: string[];
};

type ProductListFilters = {
  categoryId?: string | null;
  search?: string | null;
  sellerId?: string | null;
  sort?: ProductSort | null;
};

type ProductRow = ProductRecord & {
  totalCount: number;
};

export type PaginatedProducts = {
  products: ProductRecord[];
  pagination: PaginationMeta;
};

const productSelection = `
  p.id,
  p.name,
  p.description,
  p.price::float8 AS price,
  p.stock,
  p.category_id AS "categoryId",
  c.name AS "categoryName",
  p.seller_id AS "sellerId",
  u.name AS "sellerName",
  p.images
`;

export const listProducts = async (
  filters: ProductListFilters,
  pagination: PaginationInput
): Promise<PaginatedProducts> => {
  const orderByMap: Record<ProductSort, string> = {
    latest: "p.created_at DESC",
    "price-asc": "p.price ASC, p.created_at DESC",
    "price-desc": "p.price DESC, p.created_at DESC",
    "name-asc": "p.name ASC, p.created_at DESC",
    "name-desc": "p.name DESC, p.created_at DESC"
  };
  const orderByClause = orderByMap[filters.sort ?? "latest"];

  const result = await pool.query<ProductRow>(
    `
      SELECT
        ${productSelection},
        COUNT(*) OVER()::int AS "totalCount"
      FROM technexus.products p
      INNER JOIN technexus.categories c ON c.id = p.category_id
      INNER JOIN technexus.users u ON u.id = p.seller_id
      WHERE ($1::uuid IS NULL OR p.category_id = $1)
        AND (
          $2::text IS NULL
          OR p.name ILIKE '%' || $2 || '%'
          OR p.description ILIKE '%' || $2 || '%'
        )
        AND ($3::uuid IS NULL OR p.seller_id = $3)
      ORDER BY ${orderByClause}
      LIMIT $4
      OFFSET $5
    `,
    [
      filters.categoryId ?? null,
      filters.search ?? null,
      filters.sellerId ?? null,
      pagination.pageSize,
      pagination.offset
    ]
  );

  const total = result.rows[0]?.totalCount ?? 0;

  return {
    products: result.rows.map(({ totalCount: _totalCount, ...product }) => product),
    pagination: toPaginationMeta(pagination, total)
  };
};

export const listProductsBySeller = async (
  sellerId: string
): Promise<ProductRecord[]> => {
  const result = await pool.query<ProductRecord>(
    `
      SELECT ${productSelection}
      FROM technexus.products p
      INNER JOIN technexus.categories c ON c.id = p.category_id
      INNER JOIN technexus.users u ON u.id = p.seller_id
      WHERE p.seller_id = $1
      ORDER BY p.created_at DESC
    `,
    [sellerId]
  );

  return result.rows;
};

export const findProductById = async (
  productId: string
): Promise<ProductRecord | null> => {
  const result = await pool.query<ProductRecord>(
    `
      SELECT ${productSelection}
      FROM technexus.products p
      INNER JOIN technexus.categories c ON c.id = p.category_id
      INNER JOIN technexus.users u ON u.id = p.seller_id
      WHERE p.id = $1
      LIMIT 1
    `,
    [productId]
  );

  return result.rows[0] ?? null;
};

export const createProduct = async (
  input: ProductMutationInput & { sellerId: string }
): Promise<ProductRecord> => {
  const result = await pool.query<{ id: string }>(
    `
      INSERT INTO technexus.products (
        name,
        description,
        price,
        stock,
        category_id,
        seller_id,
        images
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `,
    [
      input.name.trim(),
      input.description.trim(),
      input.price,
      input.stock,
      input.categoryId,
      input.sellerId,
      input.images
    ]
  );

  return (await findProductById(result.rows[0].id)) as ProductRecord;
};

export const updateProduct = async (
  productId: string,
  input: ProductMutationInput
): Promise<ProductRecord | null> => {
  const result = await pool.query<{ id: string }>(
    `
      UPDATE technexus.products
      SET
        name = $2,
        description = $3,
        price = $4,
        stock = $5,
        category_id = $6,
        images = $7,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [
      productId,
      input.name.trim(),
      input.description.trim(),
      input.price,
      input.stock,
      input.categoryId,
      input.images
    ]
  );

  if (!result.rows[0]) {
    return null;
  }

  return findProductById(result.rows[0].id);
};

export const deleteProduct = async (productId: string): Promise<boolean> => {
  const result = await pool.query(
    `
      DELETE FROM technexus.products
      WHERE id = $1
    `,
    [productId]
  );

  return (result.rowCount ?? 0) > 0;
};
