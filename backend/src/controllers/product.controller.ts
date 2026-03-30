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

const productPayloadSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().min(8),
  price: z.union([z.string(), z.number()]),
  stock: z.union([z.string(), z.number()]),
  categoryId: z.string().uuid(),
  sellerId: z.string().uuid().optional()
});

const productUpdateSchema = productPayloadSchema.partial();

export const indexProducts = asyncHandler(async (req, res) => {
  const response = await listProducts({
    page: req.query.page,
    limit: req.query.limit ?? req.query.pageSize,
    categoryId:
      typeof req.query.categoryId === "string"
        ? req.query.categoryId
        : typeof req.query.category === "string"
          ? req.query.category
          : undefined,
    sellerId: typeof req.query.sellerId === "string" ? req.query.sellerId : undefined,
    search: typeof req.query.search === "string" ? req.query.search : undefined,
    sort: typeof req.query.sort === "string" ? req.query.sort : undefined,
    includeDeleted: req.actor?.role === "admin" && req.query.includeDeleted === "true"
  });
  res.status(200).json(response);
});

export const showProduct = asyncHandler(async (req, res) => {
  const product = await getProductById(String(req.params.id), req.actor?.role === "admin");
  res.status(200).json({ product });
});

export const sellerProducts = asyncHandler(async (req, res) => {
  const sellerId =
    req.actor?.role === "admin" && typeof req.query.sellerId === "string"
      ? req.query.sellerId
      : req.actor!.userId!;
  const products = await listProductsBySeller(sellerId);
  res.status(200).json({ products });
});

export const storeProduct = asyncHandler(async (req, res) => {
  const payload = productPayloadSchema.parse(req.body);
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
});

export const updateManagedProduct = asyncHandler(async (req, res) => {
  const payload = productUpdateSchema.parse(req.body);
  const product = await updateProduct(
    {
      role: req.actor!.role!,
      userId: req.actor!.userId!
    },
    String(req.params.id),
    {
      ...payload,
      uploadedFiles: Array.isArray(req.files) ? req.files : [],
      imageUrls: parseImageUrls(req.body.imageUrls ?? req.body.imageUrl)
    }
  );
  res.status(200).json({ product });
});

export const destroyProduct = asyncHandler(async (req, res) => {
  await softDeleteProduct(
    {
      role: req.actor!.role!,
      userId: req.actor!.userId!
    },
    String(req.params.id)
  );
  res.status(200).json({ message: "Product deleted successfully." });
});
