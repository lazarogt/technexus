import { Prisma } from "@prisma/client";
import { z } from "zod";
import { asyncHandler } from "../utils/async-handler";
import {
  createProduct,
  getProductById,
  listProducts,
  listProductsBySeller,
  softDeleteProduct,
  updateProduct
} from "../services/product.service";
import { isAppError } from "../utils/errors";
import { logger } from "../utils/logger";
import { idParamSchema, productListQuerySchema, sellerProductsQuerySchema } from "../utils/request-validation";

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim().length === 0 ? undefined : value;

const parseImageUrls = (value: unknown): string[] => {
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
      return parseImageUrls(parsed);
    } catch {
      return value
        .split(",")
        .map((candidate) => candidate.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const isZodValidationError = (
  error: unknown
): error is z.ZodError<Record<string, unknown>> =>
  error instanceof z.ZodError ||
  (error instanceof Error &&
    error.name === "ZodError" &&
    Array.isArray((error as { issues?: unknown }).issues));

const productPayloadSchema = z.object({
  name: z.string().trim().min(2, "name must contain at least 2 characters."),
  description: z.string().trim().min(8, "description must contain at least 8 characters."),
  price: z.union([z.string(), z.number()]),
  stock: z.union([z.string(), z.number()]),
  categoryId: z.string().uuid("categoryId must be a valid UUID."),
  sellerId: z.preprocess(
    emptyStringToUndefined,
    z.string().uuid("sellerId must be a valid UUID.").optional()
  )
});

const productUpdateSchema = productPayloadSchema.partial();

export const indexProducts = asyncHandler(async (req, res) => {
  const query = productListQuerySchema.parse(req.query);
  const response = await listProducts({
    page: query.page,
    limit: query.limit ?? query.pageSize,
    categoryId: query.categoryId ?? query.category,
    sellerId: query.sellerId,
    search: query.search,
    sort: query.sort,
    includeDeleted: req.actor?.role === "admin" && query.includeDeleted === true
  });
  res.status(200).json(response);
});

export const showProduct = asyncHandler(async (req, res) => {
  const params = idParamSchema.parse(req.params);
  const product = await getProductById(params.id, req.actor?.role === "admin");
  res.status(200).json({ product });
});

export const sellerProducts = asyncHandler(async (req, res) => {
  const query = sellerProductsQuerySchema.parse(req.query);
  const sellerId =
    req.actor?.role === "admin" && query.sellerId
      ? query.sellerId
      : req.actor!.userId!;
  const products = await listProductsBySeller(sellerId);
  res.status(200).json({ products });
});

export const storeProduct = asyncHandler(async (req, res) => {
  logger.debug(
    {
      requestId: req.requestId,
      route: req.originalUrl,
      body: req.body,
      actor: req.actor
    },
    "Received product creation request"
  );

  try {
    const payload = productPayloadSchema.parse({
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      stock: req.body.stock,
      categoryId: req.body.categoryId,
      sellerId: req.body.sellerId
    });
    const product = await createProduct(
      {
        role: req.actor!.role!,
        userId: req.actor!.userId!
      },
      {
        ...payload,
        uploadedFiles: Array.isArray(req.files) ? req.files : [],
        imageUrls: parseImageUrls(req.body.imageUrls ?? req.body.imageUrl)
      }
    );

    res.status(201).json({ product });
  } catch (error) {
    logger.error(
      {
        requestId: req.requestId,
        route: req.originalUrl,
        body: req.body,
        actor: req.actor,
        prismaError:
          error instanceof Prisma.PrismaClientKnownRequestError
            ? {
                code: error.code,
                meta: error.meta
              }
            : undefined,
        error: error instanceof Error ? error.message : "Unknown product creation error"
      },
      "Product creation failed"
    );

    if (isZodValidationError(error)) {
      res.status(400).json({
        success: false,
        message: error.issues[0]?.message ?? "Validation failed.",
        details: error.flatten()
      });
      return;
    }

    if (isAppError(error)) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details })
      });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        res.status(409).json({
          success: false,
          message: "A product conflict was detected while saving the record.",
          details: error.meta
        });
        return;
      }

      if (error.code === "P2003" || error.code === "P2025") {
        res.status(400).json({
          success: false,
          message: "One or more related records are invalid for this product request.",
          details: error.meta
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Could not create product."
    });
  }
});

export const updateManagedProduct = asyncHandler(async (req, res) => {
  const params = idParamSchema.parse(req.params);
  const payload = productUpdateSchema.parse(req.body);
  const product = await updateProduct(
    {
      role: req.actor!.role!,
      userId: req.actor!.userId!
    },
    params.id,
    {
      ...payload,
      uploadedFiles: Array.isArray(req.files) ? req.files : [],
      imageUrls: parseImageUrls(req.body.imageUrls ?? req.body.imageUrl)
    }
  );
  res.status(200).json({ product });
});

export const destroyProduct = asyncHandler(async (req, res) => {
  const params = idParamSchema.parse(req.params);
  await softDeleteProduct(
    {
      role: req.actor!.role!,
      userId: req.actor!.userId!
    },
    params.id
  );
  res.status(200).json({ message: "Product deleted successfully." });
});
