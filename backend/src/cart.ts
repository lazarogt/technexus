import pool from "./db";

export type CartItemRecord = {
  id: string;
  productId: string;
  quantity: number;
  productName: string;
  productDescription: string;
  productPrice: number;
  productStock: number;
  productImages: string[];
  categoryId: string;
  categoryName: string;
  sellerId: string;
  sellerName: string;
  subtotal: number;
};

export type CartSummary = {
  items: CartItemRecord[];
  total: number;
};

const cartSelection = `
  ci.id,
  p.id AS "productId",
  ci.quantity,
  p.name AS "productName",
  p.description AS "productDescription",
  p.price::float8 AS "productPrice",
  p.stock AS "productStock",
  p.images AS "productImages",
  c.id AS "categoryId",
  c.name AS "categoryName",
  u.id AS "sellerId",
  u.name AS "sellerName",
  ROUND((p.price * ci.quantity)::numeric, 2)::float8 AS subtotal
`;

const buildCartSummary = (items: CartItemRecord[]): CartSummary => {
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  return { items, total: Math.round(total * 100) / 100 };
};

export const getCart = async (userId: string): Promise<CartSummary> => {
  const result = await pool.query<CartItemRecord>(
    `
      SELECT ${cartSelection}
      FROM technexus.cart_items ci
      INNER JOIN technexus.products p ON p.id = ci.product_id
      INNER JOIN technexus.categories c ON c.id = p.category_id
      INNER JOIN technexus.users u ON u.id = p.seller_id
      WHERE ci.user_id = $1
      ORDER BY ci.created_at DESC
    `,
    [userId]
  );

  return buildCartSummary(result.rows);
};

export const addToCart = async (
  userId: string,
  productId: string,
  quantity: number
): Promise<CartSummary> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const productResult = await client.query<{ stock: number }>(
      `
        SELECT stock
        FROM technexus.products
        WHERE id = $1
        LIMIT 1
      `,
      [productId]
    );

    const product = productResult.rows[0];

    if (!product) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    const cartItemResult = await client.query<{ quantity: number }>(
      `
        SELECT quantity
        FROM technexus.cart_items
        WHERE user_id = $1 AND product_id = $2
        LIMIT 1
      `,
      [userId, productId]
    );

    const currentQuantity = cartItemResult.rows[0]?.quantity ?? 0;
    const nextQuantity = currentQuantity + quantity;

    if (nextQuantity > product.stock) {
      throw new Error("INSUFFICIENT_STOCK");
    }

    await client.query(
      `
        INSERT INTO technexus.cart_items (user_id, product_id, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, product_id)
        DO UPDATE SET
          quantity = EXCLUDED.quantity,
          updated_at = NOW()
      `,
      [userId, productId, nextQuantity]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return getCart(userId);
};

export const removeFromCart = async (
  userId: string,
  productId: string
): Promise<CartSummary> => {
  await pool.query(
    `
      DELETE FROM technexus.cart_items
      WHERE user_id = $1 AND product_id = $2
    `,
    [userId, productId]
  );

  return getCart(userId);
};
