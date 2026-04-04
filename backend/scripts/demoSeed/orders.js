const { weightedPick } = require("./utils");
const {
  assert,
  createSessionId,
  pickDistinctWeighted,
  pickOne,
  randomDateBetween,
  randomFloat,
  randomInt,
  roundCurrency,
  toMoneyString
} = require("./utils");

const ORDER_STATUS_WEIGHTS = [
  { value: "delivered", weight: 70 },
  { value: "shipped", weight: 20 },
  { value: "pending", weight: 10 }
];

function pickOrderStatus(rng) {
  return weightedPick(rng, ORDER_STATUS_WEIGHTS);
}

function calculateOrderTotals(items, shippingCost) {
  const itemsSubtotal = roundCurrency(items.reduce((sum, item) => sum + item.subtotal, 0));
  const normalizedShipping = roundCurrency(shippingCost);

  return {
    itemsSubtotal,
    shippingCost: normalizedShipping,
    total: roundCurrency(itemsSubtotal + normalizedShipping)
  };
}

function buildBuyerPool(users, selectedSellerIds) {
  const primaryBuyers = users.filter(
    (user) =>
      !user.deletedAt &&
      !user.isBlocked &&
      user.role !== "admin" &&
      !selectedSellerIds.has(user.id)
  );

  if (primaryBuyers.length > 0) {
    return primaryBuyers;
  }

  return users.filter(
    (user) => !user.deletedAt && !user.isBlocked && user.role !== "admin"
  );
}

function buildProductPopularityWeights(products) {
  return new Map(
    products.map((product, index) => [
      product.id,
      Math.max(2, Math.floor((products.length - index) / 3) + 1)
    ])
  );
}

function groupSellerItems(items) {
  const grouped = new Map();

  for (const item of items) {
    const existing = grouped.get(item.sellerId);

    if (existing) {
      existing.items.push(item);
      continue;
    }

    grouped.set(item.sellerId, {
      sellerId: item.sellerId,
      sellerEmail: item.sellerEmail,
      items: [item]
    });
  }

  return [...grouped.values()];
}

function buildOrderAnalyticsEvents(order, items, productLookup, sessionId, rng) {
  const events = [];
  const start = new Date(order.createdAt.getTime() - randomInt(rng, 20, 180) * 60 * 1000);
  let cursor = start.getTime();

  events.push({
    event: "view_home",
    userId: order.userId,
    sessionId,
    data: {
      source: "demo_seed"
    },
    createdAt: new Date(cursor)
  });

  for (const item of items) {
    const product = productLookup.get(item.productId);

    cursor += randomInt(rng, 2, 9) * 60 * 1000;
    events.push({
      event: "view_product",
      userId: order.userId,
      sessionId,
      data: {
        productId: item.productId,
        productName: item.productName,
        categoryId: product?.categoryId ?? null,
        sellerId: item.sellerId
      },
      createdAt: new Date(cursor)
    });

    cursor += randomInt(rng, 1, 7) * 60 * 1000;
    events.push({
      event: "add_to_cart",
      userId: order.userId,
      sessionId,
      data: {
        productId: item.productId,
        productName: item.productName,
        categoryId: product?.categoryId ?? null,
        sellerId: item.sellerId,
        quantity: item.quantity
      },
      createdAt: new Date(cursor)
    });
  }

  cursor += randomInt(rng, 1, 8) * 60 * 1000;
  events.push({
    event: "view_cart",
    userId: order.userId,
    sessionId,
    data: {
      itemCount: items.length
    },
    createdAt: new Date(cursor)
  });

  cursor += randomInt(rng, 1, 8) * 60 * 1000;
  events.push({
    event: "start_checkout",
    userId: order.userId,
    sessionId,
    data: {
      itemCount: items.length,
      orderId: order.id
    },
    createdAt: new Date(cursor)
  });

  events.push({
    event: "complete_order",
    userId: order.userId,
    sessionId,
    data: {
      orderId: order.id,
      total: order.total
    },
    createdAt: order.createdAt
  });

  return events.map((event) => ({
    ...event,
    createdAt: event.createdAt,
    data: event.data
  }));
}

function buildCatalogAnalyticsEvents(products, buyers, rng, startingIndex) {
  const events = [];
  let eventIndex = startingIndex;

  for (const product of products) {
    const viewCount = randomInt(rng, 3, 12);

    for (let index = 0; index < viewCount; index += 1) {
      const buyer = pickOne(rng, buyers);
      const sessionId = createSessionId("catalog", eventIndex);
      const viewedAt = randomDateBetween(
        rng,
        new Date("2026-03-03T09:00:00.000Z"),
        new Date("2026-04-01T22:00:00.000Z")
      );

      events.push({
        event: "view_home",
        userId: buyer.id,
        sessionId,
        data: {
          source: "catalog-browse"
        },
        createdAt: new Date(viewedAt.getTime() - 5 * 60 * 1000)
      });
      events.push({
        event: "view_product",
        userId: buyer.id,
        sessionId,
        data: {
          productId: product.id,
          productName: product.name,
          categoryId: product.categoryId,
          sellerId: product.sellerId
        },
        createdAt: viewedAt
      });

      if (rng() > 0.45) {
        events.push({
          event: "add_to_cart",
          userId: buyer.id,
          sessionId,
          data: {
            productId: product.id,
            productName: product.name,
            categoryId: product.categoryId,
            sellerId: product.sellerId,
            quantity: 1
          },
          createdAt: new Date(viewedAt.getTime() + 3 * 60 * 1000)
        });
      }

      eventIndex += 1;
    }
  }

  return events;
}

async function seedOrders(tx, { users, selectedSellers, products, rng }) {
  const selectedSellerIds = new Set(selectedSellers.map((seller) => seller.id));
  const buyers = buildBuyerPool(users, selectedSellerIds);
  assert(buyers.length > 0, "Demo mode requires at least one active non-admin buyer.");

  const productLookup = new Map(products.map((product) => [product.id, product]));
  const productWeights = buildProductPopularityWeights(products);
  const inventoryState = new Map(
    products.map((product) => [
      product.id,
      {
        inventoryId: product.inventoryId,
        productId: product.id,
        remainingStock: product.stock,
        threshold: product.lowStockThreshold,
        initialStock: product.stock
      }
    ])
  );

  const orderTargetCount = Math.min(80, Math.max(30, products.length + 12));
  const createdOrders = [];
  const outboxRows = [];
  const analyticsRows = [];

  for (let index = 0; index < orderTargetCount; index += 1) {
    const availableProducts = products.filter(
      (product) => inventoryState.get(product.id)?.remainingStock > 0
    );

    if (availableProducts.length === 0) {
      break;
    }

    const buyer = pickOne(rng, buyers);
    const desiredItemCount = randomInt(rng, 1, Math.min(5, availableProducts.length));
    const pickedProducts = pickDistinctWeighted(
      rng,
      availableProducts,
      desiredItemCount,
      (product) => productWeights.get(product.id) ?? 1
    );

    const items = [];

    for (const product of pickedProducts) {
      const state = inventoryState.get(product.id);

      if (!state || state.remainingStock <= 0) {
        continue;
      }

      const quantity = randomInt(rng, 1, Math.min(3, state.remainingStock));
      state.remainingStock -= quantity;

      items.push({
        productId: product.id,
        sellerId: product.sellerId,
        productName: product.name,
        productDescription: product.description,
        sellerName: product.sellerName,
        sellerEmail: product.sellerEmail,
        quantity,
        price: product.price,
        subtotal: roundCurrency(product.price * quantity),
        images: [product.imageUrl]
      });
    }

    if (items.length === 0) {
      continue;
    }

    const shippingCost = roundCurrency(
      items.length >= 3
        ? randomFloat(rng, 6.5, 18.5)
        : randomFloat(rng, 4.5, 14.5)
    );
    const totals = calculateOrderTotals(items, shippingCost);
    const status = pickOrderStatus(rng);
    const createdAt = randomDateBetween(
      rng,
      new Date("2026-03-03T10:00:00.000Z"),
      new Date("2026-04-01T20:00:00.000Z")
    );
    const updatedAt = new Date(
      createdAt.getTime() +
        (status === "pending" ? randomInt(rng, 1, 12) : randomInt(rng, 18, 160)) * 60 * 60 * 1000
    );

    const order = await tx.order.create({
      data: {
        userId: buyer.id,
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        buyerPhone: `+1 555 ${String(1000 + index).padStart(4, "0")}`,
        shippingAddress: {
          formatted: `${100 + index} Demo Commerce Ave, Suite ${randomInt(rng, 100, 999)}`
        },
        shippingCost: toMoneyString(totals.shippingCost),
        itemsSubtotal: toMoneyString(totals.itemsSubtotal),
        total: toMoneyString(totals.total),
        status,
        createdAt,
        updatedAt,
        items: {
          create: items.map((item) => ({
            ...item,
            price: toMoneyString(item.price),
            subtotal: toMoneyString(item.subtotal),
            createdAt
          }))
        }
      },
      include: {
        items: true
      }
    });

    createdOrders.push(order);

    const sellerGroups = groupSellerItems(items);
    const buyerRowStatus = status === "pending" ? "pending" : "sent";
    outboxRows.push({
      orderId: order.id,
      recipientType: "buyer",
      recipientEmail: buyer.email,
      sellerId: null,
      subject: `TechNexus order confirmed #${order.id.slice(0, 8)}`,
      html: `<p>Demo order ${order.id}</p>`,
      text: `Demo order ${order.id}`,
      status: buyerRowStatus,
      attempts: buyerRowStatus === "sent" ? 1 : 0,
      lastError: null,
      nextAttemptAt: buyerRowStatus === "pending" ? createdAt : null,
      createdAt,
      updatedAt
    });

    for (const group of sellerGroups) {
      const sellerRowStatus = status === "delivered" ? "sent" : "pending";
      outboxRows.push({
        orderId: order.id,
        recipientType: "seller",
        recipientEmail: group.sellerEmail,
        sellerId: group.sellerId,
        subject: `TechNexus new order #${order.id.slice(0, 8)}`,
        html: `<p>Demo seller notification for order ${order.id}</p>`,
        text: `Demo seller notification for order ${order.id}`,
        status: sellerRowStatus,
        attempts: sellerRowStatus === "sent" ? 1 : 0,
        lastError: null,
        nextAttemptAt: sellerRowStatus === "pending" ? createdAt : null,
        createdAt,
        updatedAt
      });
    }

    analyticsRows.push(
      ...buildOrderAnalyticsEvents(
        {
          id: order.id,
          userId: buyer.id,
          createdAt,
          total: totals.total
        },
        items,
        productLookup,
        createSessionId("order", index),
        rng
      )
    );
  }

  const catalogEvents = buildCatalogAnalyticsEvents(products, buyers, rng, createdOrders.length);
  analyticsRows.push(...catalogEvents);

  for (const state of inventoryState.values()) {
    await tx.inventory.update({
      where: {
        id: state.inventoryId
      },
      data: {
        quantity: state.remainingStock
      }
    });

    await tx.product.update({
      where: {
        id: state.productId
      },
      data: {
        stock: state.remainingStock
      }
    });

    if (state.remainingStock <= state.threshold) {
      await tx.lowStockAlert.create({
        data: {
          inventoryId: state.inventoryId,
          productId: state.productId,
          triggeredQty: state.remainingStock,
          threshold: state.threshold
        }
      });
    }
  }

  if (outboxRows.length > 0) {
    await tx.emailOutbox.createMany({
      data: outboxRows
    });
  }

  if (analyticsRows.length > 0) {
    await tx.analyticsEvent.createMany({
      data: analyticsRows
    });
  }

  return {
    orders: createdOrders,
    count: createdOrders.length
  };
}

module.exports = {
  ORDER_STATUS_WEIGHTS,
  calculateOrderTotals,
  pickOrderStatus,
  seedOrders
};
