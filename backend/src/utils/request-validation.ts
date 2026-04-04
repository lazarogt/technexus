import { OrderStatus, UserRole } from "@prisma/client";
import { z } from "zod";

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim().length === 0 ? undefined : value;

const optionalTrimmedString = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().optional()
);

const optionalPositiveInt = z.preprocess((value) => {
  const normalized = emptyStringToUndefined(value);
  if (normalized === undefined) {
    return undefined;
  }

  return typeof normalized === "string" ? Number(normalized) : normalized;
}, z.number().int().positive().optional());

const optionalBoolean = z.preprocess((value) => {
  const normalized = emptyStringToUndefined(value);
  if (normalized === undefined || typeof normalized === "boolean") {
    return normalized;
  }

  if (typeof normalized === "string") {
    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return normalized;
}, z.boolean().optional());

const optionalUuid = z.preprocess(emptyStringToUndefined, z.string().uuid().optional());
const optionalDate = z.preprocess(
  emptyStringToUndefined,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
);

export const paginationQuerySchema = z.object({
  page: optionalPositiveInt,
  limit: optionalPositiveInt,
  pageSize: optionalPositiveInt
});

export const idParamSchema = z.object({
  id: z.string().uuid()
});

export const productIdParamSchema = z.object({
  productId: z.string().uuid()
});

export const inventoryIdParamSchema = z.object({
  inventoryId: z.string().uuid()
});

export const categoryListQuerySchema = paginationQuerySchema;

export const userListQuerySchema = paginationQuerySchema.extend({
  role: z.preprocess(emptyStringToUndefined, z.nativeEnum(UserRole).optional())
});

export const productListQuerySchema = paginationQuerySchema.extend({
  categoryId: optionalUuid,
  category: optionalUuid,
  sellerId: optionalUuid,
  search: optionalTrimmedString,
  sort: z
    .preprocess(
      emptyStringToUndefined,
      z.enum(["latest", "price-asc", "price-desc", "name-asc", "name-desc"]).optional()
    ),
  includeDeleted: optionalBoolean
});

export const sellerProductsQuerySchema = z.object({
  sellerId: optionalUuid
});

export const orderListQuerySchema = paginationQuerySchema.extend({
  status: z.preprocess(emptyStringToUndefined, z.nativeEnum(OrderStatus).optional()),
  sellerId: optionalUuid,
  dateFrom: optionalDate,
  dateTo: optionalDate
});

export const metricsFormatQuerySchema = z.object({
  format: z.preprocess(emptyStringToUndefined, z.literal("json").optional())
});

export const outboxOverviewQuerySchema = paginationQuerySchema.extend({
  status: z.preprocess(
    emptyStringToUndefined,
    z.enum(["pending", "sent", "failed"]).optional()
  )
});
