import { asyncHandler } from "../utils/async-handler";
import {
  createProduct,
  getProductById,
  listProducts,
  listProductsBySeller,
  softDeleteProduct,
  updateProduct
} from "../services/product.service";
import { logger } from "../utils/logger";
import {
  idParamSchema,
  productListQuerySchema,
  productPayloadSchema,
  productUpdateSchema,
  sellerProductsQuerySchema
} from "../utils/request-validation";
import { env } from "../utils/config";

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

  const payload = productPayloadSchema.parse({
    ...req.body,
    imageUrls: req.body.imageUrls ?? req.body.imageUrl
  });
  const product = await createProduct(
    {
      role: req.actor!.role!,
      userId: req.actor!.userId!
    },
    {
      ...payload,
      uploadedFiles: Array.isArray(req.files) ? req.files : [],
      imageUrls: payload.imageUrls
    }
  );

  res.status(201).json({ product });
});

export const updateManagedProduct = asyncHandler(async (req, res) => {
  const params = idParamSchema.parse(req.params);
  const payload = productUpdateSchema.parse({
    ...req.body,
    imageUrls: req.body.imageUrls ?? req.body.imageUrl
  });
  const product = await updateProduct(
    {
      role: req.actor!.role!,
      userId: req.actor!.userId!
    },
    params.id,
    {
      ...payload,
      uploadedFiles: Array.isArray(req.files) ? req.files : [],
      imageUrls: payload.imageUrls
    }
  );
  res.status(200).json({ product });
});

export const destroyProduct = asyncHandler(async (req, res) => {
  if (env.demoMode) {
    res.status(403).json({ message: "Demo action disabled" });
    return;
  }

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
