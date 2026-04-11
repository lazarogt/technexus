import { OrderStatus, UserRole } from "@prisma/client";
import { z } from "zod";

const MAX_PAGE_SIZE = 100;
const htmlTagPattern = /<\s*\/?\s*[a-z!][^>]*>/i;
const scriptProtocolPattern = /javascript:/i;
const controlCharacterPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const uploadPathPattern = /^\/uploads\/[A-Za-z0-9._-]+$/;

export const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim().length === 0 ? undefined : value;

const trimString = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    return value.trim();
  }, schema);

const normalizedEmailSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim().toLowerCase();
}, z.string().email("email must be a valid email address."));

const makePlainTextSchema = (options: {
  fieldName: string;
  min?: number;
  max?: number;
}) => {
  let schema = z.string().trim();

  if (options.min !== undefined) {
    schema = schema.min(
      options.min,
      `${options.fieldName} must contain at least ${options.min} characters.`
    );
  }

  if (options.max !== undefined) {
    schema = schema.max(
      options.max,
      `${options.fieldName} must contain at most ${options.max} characters.`
    );
  }

  return schema
    .refine((value) => !controlCharacterPattern.test(value), {
      message: `${options.fieldName} contains unsupported control characters.`
    })
    .refine((value) => !htmlTagPattern.test(value), {
      message: `${options.fieldName} must not include HTML tags.`
    })
    .refine((value) => !scriptProtocolPattern.test(value), {
      message: `${options.fieldName} contains a blocked script pattern.`
    });
};

const optionalPlainTextSchema = (options: {
  fieldName: string;
  min?: number;
  max?: number;
}) => z.preprocess(emptyStringToUndefined, makePlainTextSchema(options).optional());

const optionalPositiveInt = z.preprocess((value) => {
  const normalized = emptyStringToUndefined(value);
  if (normalized === undefined) {
    return undefined;
  }

  return typeof normalized === "string" ? Number(normalized) : normalized;
}, z.number().int().positive().max(MAX_PAGE_SIZE).optional());

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

export const registerSchema = z.object({
  name: makePlainTextSchema({
    fieldName: "name",
    min: 2,
    max: 120
  }),
  email: normalizedEmailSchema,
  password: z.string().min(8).max(128),
  role: z
    .nativeEnum(UserRole)
    .refine((value) => value === UserRole.customer || value === UserRole.seller, {
      message: "Public registration is available only for customer and seller roles."
    })
    .default(UserRole.customer)
});

export const loginSchema = z.object({
  email: normalizedEmailSchema,
  password: z.string().min(1).max(128)
});

export const demoSessionSchema = z.object({
  role: z.nativeEnum(UserRole)
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
  search: optionalPlainTextSchema({
    fieldName: "search",
    max: 120
  }),
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

export const categorySchema = z.object({
  name: makePlainTextSchema({
    fieldName: "name",
    min: 2,
    max: 80
  })
});

const productNumberInputSchema = z.union([trimString(z.string().min(1)), z.number()]);

export const parseImageUrlsInput = (value: unknown): string[] => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .filter((candidate): candidate is string => typeof candidate === "string")
      .map((candidate) => candidate.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parseImageUrlsInput(parsed);
    } catch {
      return value
        .split(",")
        .map((candidate) => candidate.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const productImageUrlSchema = trimString(z.string().min(1)).refine((value) => {
  if (uploadPathPattern.test(value)) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}, "imageUrls must contain only http(s) URLs or existing /uploads paths.");

export const productPayloadSchema = z.object({
  name: makePlainTextSchema({
    fieldName: "name",
    min: 2,
    max: 160
  }),
  description: makePlainTextSchema({
    fieldName: "description",
    min: 8,
    max: 4000
  }),
  price: productNumberInputSchema,
  stock: productNumberInputSchema,
  categoryId: z.string().uuid("categoryId must be a valid UUID."),
  sellerId: z.preprocess(
    emptyStringToUndefined,
    z.string().uuid("sellerId must be a valid UUID.").optional()
  ),
  imageUrls: z.preprocess(parseImageUrlsInput, z.array(productImageUrlSchema).max(10)).default([])
});

export const productUpdateSchema = productPayloadSchema.partial();

export const orderListQuerySchema = paginationQuerySchema.extend({
  status: z.preprocess(emptyStringToUndefined, z.nativeEnum(OrderStatus).optional()),
  sellerId: optionalUuid,
  dateFrom: optionalDate,
  dateTo: optionalDate
});

export const createOrderSchema = z.object({
  buyerName: optionalPlainTextSchema({
    fieldName: "buyerName",
    min: 2,
    max: 120
  }),
  buyerEmail: z.preprocess(emptyStringToUndefined, normalizedEmailSchema.optional()),
  buyerPhone: optionalPlainTextSchema({
    fieldName: "buyerPhone",
    min: 7,
    max: 40
  }),
  shippingAddress: optionalPlainTextSchema({
    fieldName: "shippingAddress",
    min: 5,
    max: 300
  }),
  shippingCost: productNumberInputSchema.optional()
});

export const updateStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus)
});

export const addCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive()
});

export const removeCartSchema = z.object({
  productId: z.string().uuid()
});

export const createUserSchema = z.object({
  name: makePlainTextSchema({
    fieldName: "name",
    min: 2,
    max: 120
  }),
  email: normalizedEmailSchema,
  password: z.string().min(8).max(128),
  role: z.nativeEnum(UserRole)
});

export const updateUserSchema = z.object({
  name: optionalPlainTextSchema({
    fieldName: "name",
    min: 2,
    max: 120
  }),
  email: z.preprocess(emptyStringToUndefined, normalizedEmailSchema.optional()),
  role: z.nativeEnum(UserRole).optional(),
  isBlocked: z.boolean().optional()
});

export const updateInventorySchema = z.object({
  quantity: z.coerce.number().int().nonnegative().optional(),
  lowStockThreshold: z.coerce.number().int().nonnegative().optional()
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
