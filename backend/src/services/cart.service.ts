import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.service";
import { toCartSummaryDto } from "../models/cart.model";
import { AppError } from "../utils/errors";

type Actor = {
  type: "user" | "guest";
  userId?: string;
  guestSessionId?: string;
};

const cartInclude = {
  items: {
    orderBy: { createdAt: "desc" as const },
    include: {
      product: {
        include: {
          category: true,
          seller: true,
          images: {
            orderBy: { position: "asc" as const }
          }
        }
      }
    }
  }
};

const buildCartOwnerClause = (actor: Actor): Prisma.CartWhereUniqueInput => {
  if (actor.type === "user" && actor.userId) {
    return { userId: actor.userId };
  }

  if (actor.type === "guest" && actor.guestSessionId) {
    return { guestSessionId: actor.guestSessionId };
  }

  throw new AppError(401, "AUTH_REQUIRED", "Authentication is required.");
};

const ensureCart = async (actor: Actor) => {
  const where = buildCartOwnerClause(actor);
  const existing = await prisma.cart.findUnique({
    where,
    include: cartInclude
  });

  if (existing) {
    return existing;
  }

  try {
    return await prisma.cart.create({
      data:
        actor.type === "user"
          ? { userId: actor.userId! }
          : { guestSessionId: actor.guestSessionId! },
      include: cartInclude
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const concurrentCart = await prisma.cart.findUnique({
        where,
        include: cartInclude
      });

      if (concurrentCart) {
        return concurrentCart;
      }
    }

    throw error;
  }
};

export const getCart = async (actor: Actor) => {
  const cart = await ensureCart(actor);
  return toCartSummaryDto(
    cart.items.filter((item) => item.product.deletedAt === null && item.product.category.deletedAt === null)
  );
};

export const addToCart = async (
  actor: Actor,
  input: { productId: string; quantity: number }
) => {
  if (input.quantity <= 0) {
    throw new AppError(400, "INVALID_QUANTITY", "Quantity must be greater than zero.");
  }

  const cart = await ensureCart(actor);
  const product = await prisma.product.findFirst({
    where: {
      id: input.productId,
      deletedAt: null,
      category: {
        is: {
          deletedAt: null
        }
      },
      seller: {
        is: {
          deletedAt: null
        }
      }
    }
  });

  if (!product) {
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Product was not found.");
  }

  const current = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId: input.productId
      }
    }
  });
  const nextQuantity = (current?.quantity ?? 0) + input.quantity;

  if (nextQuantity > product.stock) {
    throw new AppError(
      409,
      "INSUFFICIENT_STOCK",
      "Requested quantity exceeds the available stock."
    );
  }

  await prisma.cartItem.upsert({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId: input.productId
      }
    },
    create: {
      cartId: cart.id,
      productId: input.productId,
      quantity: nextQuantity
    },
    update: {
      quantity: nextQuantity
    }
  });

  return getCart(actor);
};

export const removeFromCart = async (actor: Actor, productId: string) => {
  const cart = await ensureCart(actor);

  await prisma.cartItem.deleteMany({
    where: {
      cartId: cart.id,
      productId
    }
  });

  return getCart(actor);
};

export const clearCart = async (tx: Prisma.TransactionClient, actor: Actor) => {
  if (actor.type === "user" && actor.userId) {
    const cart = await tx.cart.findUnique({ where: { userId: actor.userId } });
    if (cart) {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return;
  }

  if (actor.type === "guest" && actor.guestSessionId) {
    const cart = await tx.cart.findUnique({ where: { guestSessionId: actor.guestSessionId } });
    if (cart) {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  }
};
