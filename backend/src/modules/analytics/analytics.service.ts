import type { Prisma } from "@prisma/client";
import { prisma } from "../../services/prisma.service";
import { env } from "../../utils/config";

export const analyticsEventNames = [
  "view_home",
  "view_product",
  "add_to_cart",
  "view_cart",
  "start_checkout",
  "complete_order"
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];
export const analyticsRanges = ["24h", "7d", "30d"] as const;
export type AnalyticsRange = (typeof analyticsRanges)[number];

export type CreateAnalyticsEventInput = {
  event: AnalyticsEventName;
  sessionId: string;
  userId: string | null;
  data?: Prisma.InputJsonValue;
};

export async function storeAnalyticsEvent(input: CreateAnalyticsEventInput) {
  await prisma.analyticsEvent.create({
    data: {
      event: input.event,
      sessionId: input.sessionId,
      userId: input.userId,
      data: input.data
    }
  });
}

type AnalyticsPayloadObject = Record<string, unknown>;

type AnalyticsProductMetric = {
  productId: string;
  productName: string;
  count: number;
};

type AnalyticsRecentEvent = {
  id: string;
  event: string;
  userId: string | null;
  sessionId: string;
  createdAt: string;
  data: Prisma.JsonValue | null;
};

export type AnalyticsOverview = {
  provider: typeof env.ANALYTICS_PROVIDER;
  range: AnalyticsRange;
  generatedAt: string;
  totalSessions: number;
  funnel: {
    viewHome: number;
    viewProduct: number;
    addToCart: number;
    viewCart: number;
    startCheckout: number;
    completeOrder: number;
    addToCartRate: number;
    checkoutCompletionRate: number;
    cartViewRate: number;
  };
  topProducts: {
    views: AnalyticsProductMetric[];
    carts: AnalyticsProductMetric[];
  };
  recentEvents: AnalyticsRecentEvent[];
};

function getRangeStart(range: AnalyticsRange) {
  const now = Date.now();

  switch (range) {
    case "24h":
      return new Date(now - 24 * 60 * 60 * 1_000);
    case "7d":
      return new Date(now - 7 * 24 * 60 * 60 * 1_000);
    case "30d":
      return new Date(now - 30 * 24 * 60 * 60 * 1_000);
  }
}

function roundRatio(value: number) {
  return Number(value.toFixed(2));
}

function getPayloadValue(data: Prisma.JsonValue | null, key: string) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  return (data as AnalyticsPayloadObject)[key] ?? null;
}

function toProductMetrics(
  counts: Map<string, number>,
  names: Map<string, string>,
  limit = 5
) {
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([productId, count]) => ({
      productId,
      productName: names.get(productId) ?? productId,
      count
    }));
}

export async function getAnalyticsOverview(range: AnalyticsRange): Promise<AnalyticsOverview> {
  if (env.ANALYTICS_PROVIDER !== "internal") {
    return {
      provider: env.ANALYTICS_PROVIDER,
      range,
      generatedAt: new Date().toISOString(),
      totalSessions: 0,
      funnel: {
        viewHome: 0,
        viewProduct: 0,
        addToCart: 0,
        viewCart: 0,
        startCheckout: 0,
        completeOrder: 0,
        addToCartRate: 0,
        checkoutCompletionRate: 0,
        cartViewRate: 0
      },
      topProducts: {
        views: [],
        carts: []
      },
      recentEvents: []
    };
  }

  const createdAt = {
    gte: getRangeStart(range)
  };

  const [events, recentEvents] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: { createdAt },
      orderBy: { createdAt: "desc" },
      take: 2_000
    }),
    prisma.analyticsEvent.findMany({
      where: { createdAt },
      orderBy: { createdAt: "desc" },
      take: 15
    })
  ]);

  const totalSessions = new Set(events.map((event) => event.sessionId)).size;
  const counters: Record<AnalyticsEventName, number> = {
    view_home: 0,
    view_product: 0,
    add_to_cart: 0,
    view_cart: 0,
    start_checkout: 0,
    complete_order: 0
  };
  const viewedProducts = new Map<string, number>();
  const cartedProducts = new Map<string, number>();

  for (const event of events) {
    if (event.event in counters) {
      counters[event.event as AnalyticsEventName] += 1;
    }

    const productId = getPayloadValue(event.data, "productId");

    if (typeof productId !== "string") {
      continue;
    }

    if (event.event === "view_product") {
      viewedProducts.set(productId, (viewedProducts.get(productId) ?? 0) + 1);
    }

    if (event.event === "add_to_cart") {
      cartedProducts.set(productId, (cartedProducts.get(productId) ?? 0) + 1);
    }
  }

  const productIds = [...new Set([...viewedProducts.keys(), ...cartedProducts.keys()])];
  const products = productIds.length
    ? await prisma.product.findMany({
        where: {
          id: {
            in: productIds
          }
        },
        select: {
          id: true,
          name: true
        }
      })
    : [];
  const productNames = new Map(products.map((product) => [product.id, product.name]));

  return {
    provider: env.ANALYTICS_PROVIDER,
    range,
    generatedAt: new Date().toISOString(),
    totalSessions,
    funnel: {
      viewHome: counters.view_home,
      viewProduct: counters.view_product,
      addToCart: counters.add_to_cart,
      viewCart: counters.view_cart,
      startCheckout: counters.start_checkout,
      completeOrder: counters.complete_order,
      addToCartRate: counters.view_product > 0 ? roundRatio((counters.add_to_cart / counters.view_product) * 100) : 0,
      checkoutCompletionRate:
        counters.start_checkout > 0
          ? roundRatio((counters.complete_order / counters.start_checkout) * 100)
          : 0,
      cartViewRate: counters.add_to_cart > 0 ? roundRatio((counters.view_cart / counters.add_to_cart) * 100) : 0
    },
    topProducts: {
      views: toProductMetrics(viewedProducts, productNames),
      carts: toProductMetrics(cartedProducts, productNames)
    },
    recentEvents: recentEvents.map((event) => ({
      id: event.id,
      event: event.event,
      userId: event.userId,
      sessionId: event.sessionId,
      createdAt: event.createdAt.toISOString(),
      data: event.data
    }))
  };
}
