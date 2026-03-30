import { type Prisma, type UserRole } from "@prisma/client";
import { prisma } from "./prisma.service";
import { env } from "../utils/config";
import { AppError } from "../utils/errors";

type InventoryRecord = {
  id: string;
  quantity: number;
};

export const allocateInventoryQuantities = (
  inventories: InventoryRecord[],
  requestedQuantity: number
) => {
  let remaining = requestedQuantity;
  const allocations: Array<{ inventoryId: string; quantity: number }> = [];

  for (const inventory of inventories) {
    if (remaining <= 0) {
      break;
    }

    const allocatedQuantity = Math.min(remaining, inventory.quantity);

    if (allocatedQuantity > 0) {
      allocations.push({
        inventoryId: inventory.id,
        quantity: allocatedQuantity
      });
      remaining -= allocatedQuantity;
    }
  }

  if (remaining > 0) {
    throw new AppError(
      409,
      "INSUFFICIENT_STOCK",
      "One or more products do not have enough stock for checkout."
    );
  }

  return allocations;
};

export const syncProductStock = async (
  tx: Prisma.TransactionClient,
  productId: string
): Promise<number> => {
  const aggregate = await tx.inventory.aggregate({
    where: {
      productId,
      deletedAt: null
    },
    _sum: {
      quantity: true
    }
  });

  const stock = aggregate._sum.quantity ?? 0;

  await tx.product.update({
    where: { id: productId },
    data: { stock }
  });

  return stock;
};

export const upsertPrimaryInventory = async (
  tx: Prisma.TransactionClient,
  input: {
    productId: string;
    locationId: string;
    quantity: number;
    lowStockThreshold?: number;
  }
) => {
  await tx.inventory.upsert({
    where: {
      productId_locationId: {
        productId: input.productId,
        locationId: input.locationId
      }
    },
    create: {
      productId: input.productId,
      locationId: input.locationId,
      quantity: input.quantity,
      lowStockThreshold: input.lowStockThreshold ?? env.lowStockDefaultThreshold
    },
    update: {
      deletedAt: null,
      quantity: input.quantity,
      lowStockThreshold: input.lowStockThreshold ?? env.lowStockDefaultThreshold
    }
  });
};

export const reserveInventoryForOrderItem = async (
  tx: Prisma.TransactionClient,
  productId: string,
  requestedQuantity: number
) => {
  const inventories = await tx.inventory.findMany({
    where: {
      productId,
      deletedAt: null,
      location: {
        is: {
          deletedAt: null
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  const allocations = allocateInventoryQuantities(inventories, requestedQuantity);

  for (const allocation of allocations) {
    const inventory = inventories.find((candidate) => candidate.id === allocation.inventoryId)!;
    const nextQuantity = inventory.quantity - allocation.quantity;

    await tx.inventory.update({
      where: { id: allocation.inventoryId },
      data: { quantity: nextQuantity }
    });

    if (nextQuantity <= inventory.lowStockThreshold) {
      await tx.lowStockAlert.create({
        data: {
          inventoryId: inventory.id,
          productId,
          triggeredQty: nextQuantity,
          threshold: inventory.lowStockThreshold
        }
      });
    }
  }

  await syncProductStock(tx, productId);
};

export const getAvailableStock = async (productId: string) => {
  const aggregate = await prisma.inventory.aggregate({
    where: {
      productId,
      deletedAt: null,
      location: {
        is: {
          deletedAt: null
        }
      }
    },
    _sum: { quantity: true }
  });

  return aggregate._sum.quantity ?? 0;
};

const assertInventoryOwnership = async (
  actor: { role: UserRole; userId: string },
  productId: string
) => {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      deletedAt: null
    },
    select: {
      sellerId: true
    }
  });

  if (!product) {
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Product was not found.");
  }

  if (actor.role !== "admin" && product.sellerId !== actor.userId) {
    throw new AppError(403, "FORBIDDEN", "You do not have access to this inventory.");
  }
};

export const listInventoryByProduct = async (
  actor: { role: UserRole; userId: string },
  productId: string
) => {
  await assertInventoryOwnership(actor, productId);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      stock: true,
      inventories: {
        where: {
          deletedAt: null,
          location: {
            is: {
              deletedAt: null
            }
          }
        },
        orderBy: { createdAt: "asc" },
        include: {
          location: true
        }
      }
    }
  });

  if (!product) {
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Product was not found.");
  }

  return {
    productId: product.id,
    stock: product.stock,
    inventories: product.inventories.map((inventory) => ({
      id: inventory.id,
      productId: inventory.productId,
      locationId: inventory.locationId,
      locationName: inventory.location.name,
      quantity: inventory.quantity,
      lowStockThreshold: inventory.lowStockThreshold,
      updatedAt: inventory.updatedAt.toISOString()
    }))
  };
};

export const updateInventoryRecord = async (
  actor: { role: UserRole; userId: string },
  inventoryId: string,
  input: {
    quantity?: number;
    lowStockThreshold?: number;
  }
) => {
  const inventory = await prisma.inventory.findUnique({
    where: { id: inventoryId },
    include: {
      location: true,
      product: {
        select: {
          id: true,
          sellerId: true
        }
      }
    }
  });

  if (!inventory || inventory.deletedAt || inventory.location.deletedAt) {
    throw new AppError(404, "INVENTORY_NOT_FOUND", "Inventory record was not found.");
  }

  if (actor.role !== "admin" && inventory.product.sellerId !== actor.userId) {
    throw new AppError(403, "FORBIDDEN", "You do not have access to this inventory.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.inventory.update({
      where: { id: inventoryId },
      data: {
        quantity: input.quantity ?? inventory.quantity,
        lowStockThreshold: input.lowStockThreshold ?? inventory.lowStockThreshold
      }
    });

    await syncProductStock(tx, inventory.productId);
    return record;
  });

  return {
    id: updated.id,
    productId: updated.productId,
    locationId: updated.locationId,
    quantity: updated.quantity,
    lowStockThreshold: updated.lowStockThreshold,
    updatedAt: updated.updatedAt.toISOString()
  };
};

export const listInventoryAlerts = async (actor: { role: UserRole; userId: string }) => {
  const alerts = await prisma.lowStockAlert.findMany({
    where: {
      resolvedAt: null,
      ...(actor.role === "admin"
        ? {}
        : {
            product: {
              sellerId: actor.userId
            }
          })
    },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sellerId: true
        }
      },
      inventory: {
        include: {
          location: true
        }
      }
    }
  });

  return alerts.map((alert) => ({
    id: alert.id,
    productId: alert.productId,
    productName: alert.product.name,
    sellerId: alert.product.sellerId,
    inventoryId: alert.inventoryId,
    locationId: alert.inventory.locationId,
    locationName: alert.inventory.location.name,
    triggeredQty: alert.triggeredQty,
    threshold: alert.threshold,
    createdAt: alert.createdAt.toISOString()
  }));
};
