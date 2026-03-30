import { prisma } from "./prisma.service";
import { cacheService } from "./cache.service";
import { env } from "../utils/config";
import { AppError } from "../utils/errors";
import { getPagination, toPaginationMeta } from "../utils/pagination";
import { toCategoryDto } from "../models/category.model";

const categoriesPrefix = "categories:";
const productsPrefix = "products:";

export const listCategories = async (input: { page?: unknown; limit?: unknown }) => {
  const pagination = getPagination(input.page, input.limit, 50);
  const cacheKey = `${categoriesPrefix}${pagination.page}:${pagination.pageSize}`;

  return cacheService.remember(cacheKey, env.CACHE_TTL_CATEGORIES, async () => {
    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        skip: pagination.skip,
        take: pagination.pageSize
      }),
      prisma.category.count({ where: { deletedAt: null } })
    ]);

    return {
      categories: categories.map(toCategoryDto),
      pagination: toPaginationMeta(pagination, total)
    };
  });
};

export const createCategory = async (name: string) => {
  const normalizedName = name.trim();

  const existing = await prisma.category.findFirst({
    where: {
      deletedAt: null,
      name: { equals: normalizedName, mode: "insensitive" }
    }
  });

  if (existing) {
    throw new AppError(409, "CATEGORY_EXISTS", "That category already exists.");
  }

  const category = await prisma.category.create({
    data: { name: normalizedName }
  });

  await Promise.all([
    cacheService.invalidatePrefix(categoriesPrefix),
    cacheService.invalidatePrefix(productsPrefix)
  ]);

  return toCategoryDto(category);
};

export const updateCategory = async (categoryId: string, name: string) => {
  const existing = await prisma.category.findUnique({ where: { id: categoryId } });

  if (!existing || existing.deletedAt) {
    throw new AppError(404, "CATEGORY_NOT_FOUND", "Category was not found.");
  }

  const category = await prisma.category.update({
    where: { id: categoryId },
    data: { name: name.trim() }
  });

  await Promise.all([
    cacheService.invalidatePrefix(categoriesPrefix),
    cacheService.invalidatePrefix(productsPrefix)
  ]);

  return toCategoryDto(category);
};

export const deleteCategory = async (categoryId: string) => {
  const existing = await prisma.category.findUnique({ where: { id: categoryId } });

  if (!existing || existing.deletedAt) {
    throw new AppError(404, "CATEGORY_NOT_FOUND", "Category was not found.");
  }

  const productCount = await prisma.product.count({
    where: {
      categoryId,
      deletedAt: null
    }
  });

  if (productCount > 0) {
    throw new AppError(
      409,
      "CATEGORY_IN_USE",
      "This category is still assigned to products and cannot be deleted."
    );
  }

  await prisma.category.update({
    where: { id: categoryId },
    data: { deletedAt: new Date() }
  });

  await Promise.all([
    cacheService.invalidatePrefix(categoriesPrefix),
    cacheService.invalidatePrefix(productsPrefix)
  ]);
};

