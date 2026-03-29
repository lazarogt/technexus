import type { PoolClient } from "pg";
import pool from "./db";
import { enqueueOrderCreatedEmailsInTransaction } from "./email-outbox";
import type { PaginationInput, PaginationMeta } from "./pagination";
import { toPaginationMeta } from "./pagination";

export const orderStatuses = ["pending", "paid", "shipped", "delivered"] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export type OrderItemRecord = {
  id: string;
  productId: string;
  productName: string;
  productDescription: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  quantity: number;
  price: number;
  subtotal: number;
  images: string[];
};

export type OrderRecord = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string | null;
  shippingAddress?: string | null;
  shippingCost?: number | null;
  paymentMethod?: string | null;
  total: number;
  status: OrderStatus;
  createdAt: string;
  items: OrderItemRecord[];
};

export type CheckoutInput = {
  buyerPhone?: string | null;
  shippingAddress?: string | null;
  shippingCost?: number | null;
};

export type PersistedOrderSnapshot = {
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  shippingAddress: Record<string, unknown> | null;
  shippingCost: number;
  paymentMethod: "cash_on_delivery";
  orderTotal: number;
};

type OrderListFilters = {
  status?: OrderStatus | null;
  sellerId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

type FlatOrderRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string | null;
  shippingAddress?: string | null;
  shippingCost?: number | null;
  paymentMethod?: string | null;
  total: number;
  status: OrderStatus;
  createdAt: string;
  itemId: string;
  productId: string;
  productName: string;
  productDescription: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  quantity: number;
  price: number;
  subtotal: number;
  images: string[];
  totalCount?: number;
};

export type PaginatedOrders = {
  orders: OrderRecord[];
  pagination: PaginationMeta;
};

const flatOrderSelection = `
  o.id,
  o.user_id AS "userId",
  COALESCE(NULLIF(o.buyer_name, ''), customer.name) AS "userName",
  COALESCE(NULLIF(o.buyer_email, ''), customer.email) AS "userEmail",
  o.buyer_phone AS "userPhone",
  CASE
    WHEN o.shipping_address IS NULL THEN NULL
    WHEN jsonb_typeof(o.shipping_address) = 'string'
      THEN trim(BOTH '"' FROM o.shipping_address::text)
    WHEN jsonb_typeof(o.shipping_address) = 'object'
      AND o.shipping_address ? 'formatted'
      THEN o.shipping_address->>'formatted'
    ELSE o.shipping_address::text
  END AS "shippingAddress",
  COALESCE(o.shipping_cost, 0)::float8 AS "shippingCost",
  COALESCE(o.payment_method, 'cash_on_delivery') AS "paymentMethod",
  COALESCE(NULLIF(o.order_total, 0), o.total)::float8 AS total,
  o.status,
  o.created_at AS "createdAt",
  oi.id AS "itemId",
  p.id AS "productId",
  p.name AS "productName",
  p.description AS "productDescription",
  seller.id AS "sellerId",
  seller.name AS "sellerName",
  seller.email AS "sellerEmail",
  oi.quantity,
  oi.price::float8 AS price,
  ROUND((oi.price * oi.quantity)::numeric, 2)::float8 AS subtotal,
  p.images
`;

const toOrderRecords = (rows: FlatOrderRow[]): OrderRecord[] => {
  const ordersMap = new Map<string, OrderRecord>();

  rows.forEach((row) => {
    const existingOrder = ordersMap.get(row.id);

    if (existingOrder) {
      existingOrder.items.push({
        id: row.itemId,
        productId: row.productId,
        productName: row.productName,
        productDescription: row.productDescription,
        sellerId: row.sellerId,
        sellerName: row.sellerName,
        sellerEmail: row.sellerEmail,
        quantity: row.quantity,
        price: row.price,
        subtotal: row.subtotal,
        images: row.images
      });
      return;
    }

    ordersMap.set(row.id, {
      id: row.id,
      userId: row.userId,
      userName: row.userName,
      userEmail: row.userEmail,
      userPhone: row.userPhone ?? null,
      shippingAddress: row.shippingAddress ?? null,
      shippingCost: row.shippingCost ?? null,
      paymentMethod: row.paymentMethod ?? "cash_on_delivery",
      total: row.total,
      status: row.status,
      createdAt: row.createdAt,
      items: [
        {
          id: row.itemId,
          productId: row.productId,
          productName: row.productName,
          productDescription: row.productDescription,
          sellerId: row.sellerId,
          sellerName: row.sellerName,
          sellerEmail: row.sellerEmail,
          quantity: row.quantity,
          price: row.price,
          subtotal: row.subtotal,
          images: row.images
        }
      ]
    });
  });

  return Array.from(ordersMap.values());
};

const toPaginatedOrders = (
  rows: FlatOrderRow[],
  pagination: PaginationInput
): PaginatedOrders => {
  const total = rows[0]?.totalCount ?? 0;

  return {
    orders: toOrderRecords(rows),
    pagination: toPaginationMeta(pagination, total)
  };
};

const basePaginatedOrdersQuery = `
  SELECT
    ${flatOrderSelection},
    paginated_orders."totalCount"
  FROM technexus.orders o
  INNER JOIN paginated_orders ON paginated_orders.id = o.id
  INNER JOIN technexus.users customer ON customer.id = o.user_id
  INNER JOIN technexus.order_items oi ON oi.order_id = o.id
  INNER JOIN technexus.products p ON p.id = oi.product_id
  INNER JOIN technexus.users seller ON seller.id = p.seller_id
  ORDER BY o.created_at DESC, oi.id ASC
`;

type Queryable = Pick<PoolClient, "query">;

const normalizeShippingAddressForStorage = (
  shippingAddress?: string | null
): Record<string, unknown> | null => {
  if (!shippingAddress?.trim()) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(shippingAddress);

    if (parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue)) {
      return parsedValue as Record<string, unknown>;
    }
  } catch {
    return { formatted: shippingAddress };
  }

  return { formatted: shippingAddress };
};

export const buildPersistedOrderSnapshot = (input: {
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string | null;
  shippingAddress?: string | null;
  shippingCost?: number | null;
  itemsSubtotal: number;
}): PersistedOrderSnapshot => {
  const normalizedShippingCost =
    typeof input.shippingCost === "number" && Number.isFinite(input.shippingCost)
      ? Math.max(0, Math.round(input.shippingCost * 100) / 100)
      : 0;

  return {
    buyerName: input.buyerName,
    buyerEmail: input.buyerEmail,
    buyerPhone: input.buyerPhone?.trim() || null,
    shippingAddress: normalizeShippingAddressForStorage(input.shippingAddress),
    shippingCost: normalizedShippingCost,
    paymentMethod: "cash_on_delivery",
    orderTotal: Math.round((input.itemsSubtotal + normalizedShippingCost) * 100) / 100
  };
};

const findOrderByIdWithClient = async (
  client: Queryable,
  orderId: string
): Promise<OrderRecord | null> => {
  const result = await client.query<FlatOrderRow>(
    `
      SELECT ${flatOrderSelection}
      FROM technexus.orders o
      INNER JOIN technexus.users customer ON customer.id = o.user_id
      INNER JOIN technexus.order_items oi ON oi.order_id = o.id
      INNER JOIN technexus.products p ON p.id = oi.product_id
      INNER JOIN technexus.users seller ON seller.id = p.seller_id
      WHERE o.id = $1
      ORDER BY o.created_at DESC, oi.id ASC
    `,
    [orderId]
  );

  return toOrderRecords(result.rows)[0] ?? null;
};

export const enqueueOrderNotificationsSafely = async (
  client: Queryable,
  order: OrderRecord,
  enqueuer: (client: Queryable, order: OrderRecord) => Promise<void> = enqueueOrderCreatedEmailsInTransaction
): Promise<void> => {
  await client.query("SAVEPOINT order_email_outbox");

  try {
    await enqueuer(client, order);
  } catch (error) {
    await client.query("ROLLBACK TO SAVEPOINT order_email_outbox");
    console.error("Unable to persist order email notifications:", {
      orderId: order.id,
      message: error instanceof Error ? error.message : "Unknown outbox error"
    });
  } finally {
    await client.query("RELEASE SAVEPOINT order_email_outbox");
  }
};

export const checkoutCart = async (
  userId: string,
  input: CheckoutInput = {}
): Promise<OrderRecord> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const customerResult = await client.query<{
      name: string;
      email: string;
    }>(
      `
        SELECT name, email
        FROM technexus.users
        WHERE id = $1
        LIMIT 1
      `,
      [userId]
    );

    if (customerResult.rows.length === 0) {
      throw new Error("CUSTOMER_NOT_FOUND");
    }

    const cartItemsResult = await client.query<{
      productId: string;
      quantity: number;
      productPrice: number;
      productStock: number;
    }>(
      `
        SELECT
          p.id AS "productId",
          ci.quantity,
          p.price::float8 AS "productPrice",
          p.stock AS "productStock"
        FROM technexus.cart_items ci
        INNER JOIN technexus.products p ON p.id = ci.product_id
        WHERE ci.user_id = $1
        FOR UPDATE OF p, ci
      `,
      [userId]
    );

    if (cartItemsResult.rows.length === 0) {
      throw new Error("EMPTY_CART");
    }

    for (const item of cartItemsResult.rows) {
      if (item.quantity > item.productStock) {
        throw new Error("INSUFFICIENT_STOCK");
      }
    }

    const total = cartItemsResult.rows.reduce(
      (sum, item) => sum + item.productPrice * item.quantity,
      0
    );

    const customer = customerResult.rows[0];
    const orderSnapshot = buildPersistedOrderSnapshot({
      buyerName: customer.name,
      buyerEmail: customer.email,
      buyerPhone: input.buyerPhone,
      shippingAddress: input.shippingAddress,
      shippingCost: input.shippingCost,
      itemsSubtotal: total
    });

    const orderResult = await client.query<{ id: string }>(
      `
        INSERT INTO technexus.orders (
          user_id,
          total,
          buyer_name,
          buyer_email,
          buyer_phone,
          shipping_address,
          shipping_cost,
          payment_method,
          order_total,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
        RETURNING id
      `,
      [
        userId,
        orderSnapshot.orderTotal,
        orderSnapshot.buyerName,
        orderSnapshot.buyerEmail,
        orderSnapshot.buyerPhone,
        orderSnapshot.shippingAddress,
        orderSnapshot.shippingCost,
        orderSnapshot.paymentMethod,
        orderSnapshot.orderTotal
      ]
    );

    const orderId = orderResult.rows[0].id;

    for (const item of cartItemsResult.rows) {
      await client.query(
        `
          INSERT INTO technexus.order_items (order_id, product_id, quantity, price)
          VALUES ($1, $2, $3, $4)
        `,
        [orderId, item.productId, item.quantity, item.productPrice]
      );

      await client.query(
        `
          UPDATE technexus.products
          SET
            stock = stock - $2,
            updated_at = NOW()
          WHERE id = $1
        `,
        [item.productId, item.quantity]
      );
    }

    await client.query(
      `
        DELETE FROM technexus.cart_items
        WHERE user_id = $1
      `,
      [userId]
    );

    const order = await findOrderByIdWithClient(client, orderId);

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    await enqueueOrderNotificationsSafely(client, order);

    await client.query("COMMIT");

    return order;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const listOrdersByCustomer = async (
  userId: string,
  pagination: PaginationInput
): Promise<PaginatedOrders> => {
  const result = await pool.query<FlatOrderRow>(
    `
      WITH paginated_orders AS (
        SELECT
          o.id,
          COUNT(*) OVER()::int AS "totalCount"
        FROM technexus.orders o
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC
        LIMIT $2
        OFFSET $3
      )
      ${basePaginatedOrdersQuery}
    `,
    [userId, pagination.pageSize, pagination.offset]
  );

  return toPaginatedOrders(result.rows, pagination);
};

export const listOrdersForSeller = async (
  sellerId: string,
  pagination: PaginationInput
): Promise<PaginatedOrders> => {
  const result = await pool.query<FlatOrderRow>(
    `
      WITH paginated_orders AS (
        SELECT
          o.id,
          COUNT(*) OVER()::int AS "totalCount"
        FROM technexus.orders o
        WHERE EXISTS (
          SELECT 1
          FROM technexus.order_items oi
          INNER JOIN technexus.products p ON p.id = oi.product_id
          WHERE oi.order_id = o.id
            AND p.seller_id = $1
        )
        ORDER BY o.created_at DESC
        LIMIT $2
        OFFSET $3
      )
      ${basePaginatedOrdersQuery}
    `,
    [sellerId, pagination.pageSize, pagination.offset]
  );

  return toPaginatedOrders(result.rows, pagination);
};

export const listAllOrders = async (
  filters: OrderListFilters,
  pagination: PaginationInput
): Promise<PaginatedOrders> => {
  const result = await pool.query<FlatOrderRow>(
    `
      WITH paginated_orders AS (
        SELECT
          o.id,
          COUNT(*) OVER()::int AS "totalCount"
        FROM technexus.orders o
        WHERE ($1::text IS NULL OR o.status = $1)
          AND (
            $2::uuid IS NULL OR EXISTS (
              SELECT 1
              FROM technexus.order_items oi
              INNER JOIN technexus.products p ON p.id = oi.product_id
              WHERE oi.order_id = o.id
                AND p.seller_id = $2
            )
          )
          AND ($3::date IS NULL OR o.created_at::date >= $3::date)
          AND ($4::date IS NULL OR o.created_at::date <= $4::date)
        ORDER BY o.created_at DESC
        LIMIT $5
        OFFSET $6
      )
      ${basePaginatedOrdersQuery}
    `,
    [
      filters.status ?? null,
      filters.sellerId ?? null,
      filters.dateFrom ?? null,
      filters.dateTo ?? null,
      pagination.pageSize,
      pagination.offset
    ]
  );

  return toPaginatedOrders(result.rows, pagination);
};

export const findOrderById = async (orderId: string): Promise<OrderRecord | null> => {
  return findOrderByIdWithClient(pool, orderId);
};

export const canSellerManageOrder = async (
  orderId: string,
  sellerId: string
): Promise<boolean> => {
  const result = await pool.query(
    `
      SELECT 1
      FROM technexus.order_items oi
      INNER JOIN technexus.products p ON p.id = oi.product_id
      WHERE oi.order_id = $1
        AND p.seller_id = $2
      LIMIT 1
    `,
    [orderId, sellerId]
  );

  return (result.rowCount ?? 0) > 0;
};

export const updateOrderStatus = async (
  orderId: string,
  status: OrderStatus
): Promise<OrderRecord | null> => {
  const result = await pool.query(
    `
      UPDATE technexus.orders
      SET
        status = $2,
        updated_at = NOW()
      WHERE id = $1
    `,
    [orderId, status]
  );

  if ((result.rowCount ?? 0) === 0) {
    return null;
  }

  return findOrderById(orderId);
};
