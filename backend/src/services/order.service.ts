import { OrderStatus, type Prisma, type UserRole } from "@prisma/client";
import { prisma } from "./prisma.service";
import { clearCart } from "./cart.service";
import { reserveInventoryForOrderItem } from "./inventory.service";
import { enqueueOrderCreatedEmails, enqueueOrderStatusUpdatedEmail } from "./outbox.service";
import { AppError } from "../utils/errors";
import { getPagination, toPaginationMeta } from "../utils/pagination";
import { parsePrice, roundCurrency } from "../utils/money";
import { toOrderDto } from "../models/order.model";
import type { EmailOrderRecord } from "./notification.service";

type Actor = {
  type: "user" | "guest";
  userId?: string;
  role?: UserRole;
  guestSessionId?: string;
};

export const buildPersistedOrderSnapshot = (input: {
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string | null;
  shippingAddress?: string | null;
  shippingCost?: number | null;
  itemsSubtotal: number;
}) => {
  const shippingCost = roundCurrency(Math.max(0, input.shippingCost ?? 0));

  return {
    buyerName: input.buyerName.trim(),
    buyerEmail: input.buyerEmail.trim().toLowerCase(),
    buyerPhone: input.buyerPhone?.trim() || null,
    shippingAddress: input.shippingAddress?.trim()
      ? { formatted: input.shippingAddress.trim() }
      : null,
    shippingCost,
    paymentMethod: "cash_on_delivery" as const,
    orderTotal: roundCurrency(input.itemsSubtotal + shippingCost)
  };
};

const orderInclude = {
  items: {
    orderBy: { createdAt: "asc" as const }
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true
    }
  }
};

const getCartForCheckout = async (actor: Actor) => {
  const cart = await prisma.cart.findFirst({
    where:
      actor.type === "user"
        ? { userId: actor.userId }
        : { guestSessionId: actor.guestSessionId },
    include: {
      items: {
        include: {
          product: {
            include: {
              seller: true,
              images: {
                orderBy: { position: "asc" }
              }
            }
          }
        }
      }
    }
  });

  if (!cart || cart.items.length === 0) {
    throw new AppError(409, "EMPTY_CART", "Your cart is empty.");
  }

  return cart;
};

const validateCheckoutActor = async (
  actor: Actor,
  input: {
    buyerName?: string;
    buyerEmail?: string;
  }
) => {
  if (actor.type === "user" && actor.userId) {
    const user = await prisma.user.findUnique({ where: { id: actor.userId } });

    if (!user || user.deletedAt) {
      throw new AppError(401, "AUTH_REQUIRED", "Authentication user was not found.");
    }

    return {
      buyerName: user.name,
      buyerEmail: user.email,
      userId: user.id,
      guestSessionId: null
    };
  }

  if (!input.buyerName?.trim() || !input.buyerEmail?.trim()) {
    throw new AppError(
      400,
      "INVALID_GUEST_CHECKOUT",
      "Guest checkout requires buyer name and buyer email."
    );
  }

  return {
    buyerName: input.buyerName.trim(),
    buyerEmail: input.buyerEmail.trim().toLowerCase(),
    userId: null,
    guestSessionId: actor.guestSessionId ?? null
  };
};

const findOrderRecord = async (tx: Prisma.TransactionClient, orderId: string) => {
  return tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: orderInclude
  });
};

const toEmailOrder = (order: Awaited<ReturnType<typeof findOrderRecord>>): EmailOrderRecord =>
  toOrderDto(order) as EmailOrderRecord;

export const createOrderFromCart = async (
  actor: Actor,
  input: {
    buyerName?: string;
    buyerEmail?: string;
    buyerPhone?: string;
    shippingAddress?: string;
    shippingCost?: unknown;
  }
) => {
  const owner = await validateCheckoutActor(actor, input);
  const cart = await getCartForCheckout(actor);
  const itemsSubtotal = roundCurrency(
    cart.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0)
  );
  const snapshot = buildPersistedOrderSnapshot({
    buyerName: owner.buyerName,
    buyerEmail: owner.buyerEmail,
    buyerPhone: input.buyerPhone,
    shippingAddress: input.shippingAddress,
    shippingCost:
      input.shippingCost === undefined ? 0 : parsePrice(input.shippingCost, "shippingCost"),
    itemsSubtotal
  });

  const order = await prisma.$transaction(async (tx) => {
    for (const cartItem of cart.items) {
      if (cartItem.quantity > cartItem.product.stock) {
        throw new AppError(
          409,
          "INSUFFICIENT_STOCK",
          "One or more products do not have enough stock for checkout."
        );
      }
    }

    const created = await tx.order.create({
      data: {
        userId: owner.userId,
        guestSessionId: owner.guestSessionId,
        buyerName: snapshot.buyerName,
        buyerEmail: snapshot.buyerEmail,
        buyerPhone: snapshot.buyerPhone,
        shippingAddress: snapshot.shippingAddress ?? undefined,
        shippingCost: snapshot.shippingCost,
        itemsSubtotal,
        total: snapshot.orderTotal,
        paymentMethod: snapshot.paymentMethod,
        status: OrderStatus.pending,
        items: {
          create: cart.items.map((cartItem) => ({
            productId: cartItem.product.id,
            sellerId: cartItem.product.sellerId,
            productName: cartItem.product.name,
            productDescription: cartItem.product.description,
            sellerName: cartItem.product.seller.name,
            sellerEmail: cartItem.product.seller.email,
            quantity: cartItem.quantity,
            price: Number(cartItem.product.price),
            subtotal: roundCurrency(Number(cartItem.product.price) * cartItem.quantity),
            images: cartItem.product.images.map((image) => image.url)
          }))
        }
      }
    });

    for (const cartItem of cart.items) {
      await reserveInventoryForOrderItem(tx, cartItem.product.id, cartItem.quantity);
    }

    await clearCart(tx, actor);
    return findOrderRecord(tx, created.id);
  });

  try {
    await enqueueOrderCreatedEmails(toEmailOrder(order));
  } catch {
    // Preserve order creation even if email enqueue fails.
  }

  return {
    message: "Order placed successfully. Payment will be collected on delivery.",
    order: toOrderDto(order)
  };
};

export const listOrders = async (
  actor: { role?: UserRole; userId?: string; guestSessionId?: string; type: "user" | "guest" },
  input: {
    page?: unknown;
    limit?: unknown;
    status?: string;
    sellerId?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) => {
  const pagination = getPagination(input.page, input.limit, 10);
  const status =
    typeof input.status === "string" &&
    ["pending", "paid", "shipped", "delivered"].includes(input.status)
      ? (input.status as OrderStatus)
      : undefined;

  const where: Prisma.OrderWhereInput =
    actor.type === "guest"
      ? {
          guestSessionId: actor.guestSessionId
        }
      : actor.role === "admin"
        ? {
            ...(status ? { status } : {}),
            ...(input.sellerId
              ? {
                  items: {
                    some: {
                      sellerId: input.sellerId
                    }
                  }
                }
              : {}),
            ...(input.dateFrom || input.dateTo
              ? {
                  createdAt: {
                    ...(input.dateFrom ? { gte: new Date(`${input.dateFrom}T00:00:00.000Z`) } : {}),
                    ...(input.dateTo ? { lte: new Date(`${input.dateTo}T23:59:59.999Z`) } : {})
                  }
                }
              : {})
          }
        : actor.role === "seller"
          ? {
              items: {
                some: {
                  sellerId: actor.userId
                }
              },
              ...(status ? { status } : {})
            }
          : {
              userId: actor.userId,
              ...(status ? { status } : {})
            };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.pageSize
    }),
    prisma.order.count({ where })
  ]);

  return {
    orders: orders.map(toOrderDto),
    pagination: toPaginationMeta(pagination, total)
  };
};

export const updateOrderStatus = async (
  actor: { role: UserRole; userId: string },
  orderId: string,
  status: OrderStatus
) => {
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  if (!existing) {
    throw new AppError(404, "ORDER_NOT_FOUND", "Order was not found.");
  }

  if (
    actor.role === "seller" &&
    !existing.items.some((item) => item.sellerId === actor.userId)
  ) {
    throw new AppError(403, "FORBIDDEN", "You do not have access to this order.");
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: orderInclude
  });

  if (existing.status !== updated.status) {
    try {
      await enqueueOrderStatusUpdatedEmail(
        toEmailOrder(updated),
        existing.status
      );
    } catch {
      // Preserve order status updates even if notifications fail.
    }
  }

  return toOrderDto(updated);
};
