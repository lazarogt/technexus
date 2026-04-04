import fs from "node:fs/promises";
import path from "node:path";
import type { ProductImageKind, Prisma, UserRole } from "@prisma/client";
import { prisma } from "./prisma.service";
import { cacheService } from "./cache.service";
import { ensureDefaultLocationForSeller } from "./location.service";
import { syncProductStock, upsertPrimaryInventory } from "./inventory.service";
import { env } from "../utils/config";
import { AppError } from "../utils/errors";
import { getPagination, toPaginationMeta } from "../utils/pagination";
import { parseNonNegativeInt, parsePrice } from "../utils/money";
import { toProductDto } from "../models/product.model";

type ProductSort = "latest" | "price-asc" | "price-desc" | "name-asc" | "name-desc";

const productsPrefix = "products:";
const searchPrefix = "search:";

const productInclude = {
  category: true,
  seller: true,
  images: {
    orderBy: { position: "asc" as const }
  }
};

const productDetailInclude = {
  ...productInclude,
  reviews: {
    orderBy: { createdAt: "desc" as const },
    include: {
      user: {
        select: {
          id: true,
          name: true
        }
      }
    }
  }
};

const getReviewSummaryByProductId = async (productIds: string[]) => {
  if (productIds.length === 0) {
    return new Map<string, { averageRating: number; reviewCount: number }>();
  }

  const grouped = await prisma.review.groupBy({
    by: ["productId"],
    where: {
      productId: {
        in: productIds
      }
    },
    _avg: {
      rating: true
    },
    _count: {
      _all: true
    }
  });

  return new Map(
    grouped.map((entry) => [
      entry.productId,
      {
        averageRating: Number((entry._avg.rating ?? 0).toFixed(1)),
        reviewCount: entry._count._all
      }
    ])
  );
};

const normalizeImageInputs = (input: {
  uploadedFiles?: Express.Multer.File[];
  imageUrls?: string[];
}) => {
  const fileImages = (input.uploadedFiles ?? []).map((file, index) => ({
    url: `/uploads/${file.filename}`,
    kind: "upload" as ProductImageKind,
    position: index
  }));

  const urlImages = (input.imageUrls ?? []).map((imageUrl, index) => ({
    url: imageUrl,
    kind: "url" as ProductImageKind,
    position: fileImages.length + index
  }));

  return [...fileImages, ...urlImages];
};

const cleanupFiles = async (imagePaths: string[]) => {
  await Promise.all(
    imagePaths
      .filter((imagePath) => imagePath.startsWith("/uploads/"))
      .map(async (imagePath) => {
        const absolutePath = path.resolve(env.uploadsDir, path.basename(imagePath));
        await fs.unlink(absolutePath).catch(() => undefined);
      })
  );
};

const invalidateProductCache = async () => {
  await Promise.all([
    cacheService.invalidatePrefix(productsPrefix),
    cacheService.invalidatePrefix(searchPrefix)
  ]);
};

export const listProducts = async (input: {
  page?: unknown;
  limit?: unknown;
  categoryId?: unknown;
  sellerId?: unknown;
  search?: unknown;
  sort?: unknown;
  includeDeleted?: boolean;
}) => {
  const pagination = getPagination(input.page, input.limit, 12);
  const search = typeof input.search === "string" ? input.search.trim() : "";
  const sort = (typeof input.sort === "string" ? input.sort : "latest") as ProductSort;
  const categoryId = typeof input.categoryId === "string" ? input.categoryId : undefined;
  const sellerId = typeof input.sellerId === "string" ? input.sellerId : undefined;
  const cacheKey = `${search.length > 0 ? searchPrefix : productsPrefix}${JSON.stringify({
    page: pagination.page,
    pageSize: pagination.pageSize,
    categoryId,
    sellerId,
    search,
    sort,
    includeDeleted: Boolean(input.includeDeleted)
  })}`;

  return cacheService.remember(
    cacheKey,
    search.length > 0 ? env.CACHE_TTL_SEARCH : env.CACHE_TTL_PRODUCTS,
    async () => {
      const where: Prisma.ProductWhereInput = {
        ...(input.includeDeleted ? {} : { deletedAt: null }),
        category: {
          is: {
            deletedAt: null
          }
        },
        seller: {
          is: {
            deletedAt: null,
            isBlocked: false
          }
        },
        ...(categoryId ? { categoryId } : {}),
        ...(sellerId ? { sellerId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } }
              ]
            }
          : {})
      };

      const orderByMap: Record<ProductSort, Prisma.ProductOrderByWithRelationInput[]> = {
        latest: [{ createdAt: "desc" }],
        "price-asc": [{ price: "asc" }, { createdAt: "desc" }],
        "price-desc": [{ price: "desc" }, { createdAt: "desc" }],
        "name-asc": [{ name: "asc" }, { createdAt: "desc" }],
        "name-desc": [{ name: "desc" }, { createdAt: "desc" }]
      };

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: productInclude,
          orderBy: orderByMap[sort] ?? orderByMap.latest,
          skip: pagination.skip,
          take: pagination.pageSize
        }),
        prisma.product.count({ where })
      ]);
      const reviewSummaryByProductId = await getReviewSummaryByProductId(
        products.map((product) => product.id)
      );

      return {
        products: products.map((product) =>
          toProductDto(product, reviewSummaryByProductId.get(product.id))
        ),
        pagination: toPaginationMeta(pagination, total)
      };
    }
  );
};

export const getProductById = async (productId: string, includeDeleted = false) => {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      ...(includeDeleted ? {} : { deletedAt: null })
    },
    include: productDetailInclude
  });

  if (!product) {
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Product was not found.");
  }

  const reviewSummary = await getReviewSummaryByProductId([product.id]);
  return toProductDto(product, reviewSummary.get(product.id));
};

const assertProductOwnership = (
  actor: { role: UserRole; userId: string },
  sellerId: string
) => {
  if (actor.role !== "admin" && actor.userId !== sellerId) {
    throw new AppError(403, "FORBIDDEN", "You do not have access to this product.");
  }
};

export const listProductsBySeller = async (sellerId: string) => {
  const products = await prisma.product.findMany({
    where: {
      sellerId,
      deletedAt: null,
      category: {
        is: {
          deletedAt: null
        }
      }
    },
    include: productInclude,
    orderBy: { createdAt: "desc" }
  });
  const reviewSummaryByProductId = await getReviewSummaryByProductId(
    products.map((product) => product.id)
  );

  return products.map((product) => toProductDto(product, reviewSummaryByProductId.get(product.id)));
};

export const createProduct = async (
  actor: { role: UserRole; userId: string },
  input: {
    name: string;
    description: string;
    price: unknown;
    stock: unknown;
    categoryId: string;
    sellerId?: string;
    uploadedFiles?: Express.Multer.File[];
    imageUrls?: string[];
  }
) => {
  const sellerId = actor.role === "admin" ? input.sellerId ?? actor.userId : actor.userId;
  const images = normalizeImageInputs({
    uploadedFiles: input.uploadedFiles,
    imageUrls: input.imageUrls
  });

  if (images.length === 0) {
    throw new AppError(400, "MISSING_IMAGES", "At least one product image is required.");
  }

  const category = await prisma.category.findFirst({
    where: {
      id: input.categoryId,
      deletedAt: null
    }
  });

  if (!category) {
    await cleanupFiles(images.map((image) => image.url));
    throw new AppError(400, "CATEGORY_NOT_FOUND", "The selected category does not exist.");
  }

  const seller = await prisma.user.findFirst({
    where: {
      id: sellerId,
      deletedAt: null,
      isBlocked: false,
      role: {
        in: ["seller", "admin"]
      }
    },
    select: {
      id: true
    }
  });

  if (!seller) {
    await cleanupFiles(images.map((image) => image.url));
    throw new AppError(400, "SELLER_NOT_FOUND", "The selected seller does not exist.");
  }

  try {
    const product = await prisma.$transaction(async (tx) => {
      const location = await ensureDefaultLocationForSeller(sellerId, tx);
      const created = await tx.product.create({
        data: {
          name: input.name.trim(),
          description: input.description.trim(),
          price: parsePrice(input.price, "price"),
          stock: 0,
          categoryId: input.categoryId,
          sellerId,
          images: {
            create: images
          }
        },
        include: productInclude
      });

      await upsertPrimaryInventory(tx, {
        productId: created.id,
        locationId: location.id,
        quantity: parseNonNegativeInt(input.stock, "stock")
      });
      await syncProductStock(tx, created.id);

      return tx.product.findUniqueOrThrow({
        where: { id: created.id },
        include: productInclude
      });
    });

    await invalidateProductCache();
    return toProductDto(product);
  } catch (error) {
    await cleanupFiles(images.map((image) => image.url));
    throw error;
  }
};

export const updateProduct = async (
  actor: { role: UserRole; userId: string },
  productId: string,
  input: {
    name?: string;
    description?: string;
    price?: unknown;
    stock?: unknown;
    categoryId?: string;
    uploadedFiles?: Express.Multer.File[];
    imageUrls?: string[];
  }
) => {
  const existing = await prisma.product.findFirst({
    where: {
      id: productId,
      deletedAt: null
    },
    include: {
      ...productInclude,
      inventories: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!existing) {
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Product was not found.");
  }

  assertProductOwnership(actor, existing.sellerId);

  if (input.categoryId && input.categoryId !== existing.categoryId) {
    const category = await prisma.category.findFirst({
      where: {
        id: input.categoryId,
        deletedAt: null
      }
    });

    if (!category) {
      throw new AppError(400, "CATEGORY_NOT_FOUND", "The selected category does not exist.");
    }
  }

  const nextImages = normalizeImageInputs({
    uploadedFiles: input.uploadedFiles,
    imageUrls: input.imageUrls
  });
  const shouldReplaceImages = nextImages.length > 0;

  try {
    const product = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          name: input.name?.trim() ?? existing.name,
          description: input.description?.trim() ?? existing.description,
          price:
            input.price === undefined
              ? existing.price
              : parsePrice(input.price, "price"),
          categoryId: input.categoryId ?? existing.categoryId,
          images: shouldReplaceImages
            ? {
                deleteMany: {},
                create: nextImages
              }
            : undefined
        },
        include: productInclude
      });

      if (input.stock !== undefined) {
        const totalRequested = parseNonNegativeInt(input.stock, "stock");
        const otherInventoryTotal = existing.inventories.slice(1).reduce((sum, inventory) => {
          return sum + inventory.quantity;
        }, 0);

        if (totalRequested < otherInventoryTotal) {
          throw new AppError(
            400,
            "INVALID_STOCK",
            "Stock cannot be lower than allocated inventory in secondary locations."
          );
        }

        const primaryInventory = existing.inventories[0];

        if (!primaryInventory) {
          const location = await ensureDefaultLocationForSeller(existing.sellerId, tx);
          await upsertPrimaryInventory(tx, {
            productId,
            locationId: location.id,
            quantity: totalRequested
          });
        } else {
          await tx.inventory.update({
            where: { id: primaryInventory.id },
            data: {
              quantity: totalRequested - otherInventoryTotal
            }
          });
        }

        await syncProductStock(tx, productId);
      }

      return tx.product.findUniqueOrThrow({
        where: { id: productId },
        include: productInclude
      });
    });

    if (shouldReplaceImages) {
      await cleanupFiles(existing.images.map((image) => image.url));
    }

    await invalidateProductCache();
    return toProductDto(product);
  } catch (error) {
    await cleanupFiles(nextImages.map((image) => image.url));
    throw error;
  }
};

export const softDeleteProduct = async (
  actor: { role: UserRole; userId: string },
  productId: string
) => {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      deletedAt: null
    },
    include: { images: true }
  });

  if (!product) {
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Product was not found.");
  }

  assertProductOwnership(actor, product.sellerId);

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        deletedAt: new Date()
      }
    });

    await tx.inventory.updateMany({
      where: { productId, deletedAt: null },
      data: {
        deletedAt: new Date(),
        quantity: 0
      }
    });

    await syncProductStock(tx, productId);
  });

  await invalidateProductCache();
};
