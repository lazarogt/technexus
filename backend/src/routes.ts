import type { Request, Response } from "express";
import multer from "multer";
import { Router } from "express";
import { recordAdminActivity } from "./admin-activity";
import { comparePassword, hashPassword, signAuthToken } from "./auth";
import {
  cacheTtls,
  getOrSetCachedJson,
  invalidateCachePrefix
} from "./cache";
import {
  cachePrefixes,
  getCategoriesCacheKey,
  getProductsCacheKey,
  getProfileCacheKey,
  getProfileCachePrefix
} from "./cache-keys";
import { addToCart, getCart, removeFromCart } from "./cart";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory
} from "./categories";
import { authorizeRoles, requireAuth } from "./middleware";
import {
  sendInternalMessageEmail,
  sendOrderStatusUpdatedEmail
} from "./email";
import {
  getMetricsSnapshot,
  getPrometheusMetrics,
  getEmailOutboxOverview,
  getEmailOutboxWorkerHealth,
  resetFailedEmailOutboxRow,
  retryEmailOutboxById,
  retryFailedEmailOutboxRows
} from "./email-outbox";
import { createLogger } from "./lib/logger";
import { createMessage, listMessagesForUser } from "./messages";
import {
  canSellerManageOrder,
  checkoutCart,
  findOrderById,
  listAllOrders,
  listOrdersByCustomer,
  listOrdersForSeller,
  orderStatuses,
  updateOrderStatus,
  type OrderStatus
} from "./orders";
import {
  createProduct,
  deleteProduct,
  findProductById,
  isProductSort,
  listProducts,
  listProductsBySeller,
  updateProduct,
  type ProductSort
} from "./products";
import {
  deleteStoredFiles,
  runProductImageUpload,
  toStoredImagePaths
} from "./uploads";
import { getPaginationInput } from "./pagination";
import {
  createUser,
  deleteUserById,
  findPublicUserById,
  findUserById,
  findUserByEmail,
  isUserRole,
  listAllUsers,
  listSellerUsers,
  toPublicUser,
  updateUserById,
  type UserRole
} from "./users";

const router = Router();
const logger = createLogger("api");

const validPublicRoles: UserRole[] = ["customer", "seller"];

const getValidatedPassword = (password: unknown): string | null => {
  if (typeof password !== "string" || password.length < 8) {
    return null;
  }

  return password;
};

const getValidatedName = (name: unknown): string | null => {
  if (typeof name !== "string" || name.trim().length < 2) {
    return null;
  }

  return name.trim();
};

const getValidatedEmail = (email: unknown): string | null => {
  if (typeof email !== "string") {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return null;
  }

  return normalizedEmail;
};

const getValidatedCategoryName = (name: unknown): string | null => {
  if (typeof name !== "string" || name.trim().length < 2) {
    return null;
  }

  return name.trim();
};

const getValidatedDescription = (description: unknown): string | null => {
  if (typeof description !== "string" || description.trim().length < 8) {
    return null;
  }

  return description.trim();
};

const getValidatedSubject = (subject: unknown): string | null => {
  if (typeof subject !== "string" || subject.trim().length < 3) {
    return null;
  }

  return subject.trim();
};

const getValidatedMessageBody = (body: unknown): string | null => {
  if (typeof body !== "string" || body.trim().length < 3) {
    return null;
  }

  return body.trim();
};

const getValidatedUuid = (value: unknown): string | null => {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  ) {
    return null;
  }

  return value;
};

const getValidatedPrice = (value: unknown): number | null => {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return null;
  }

  return Math.round(numericValue * 100) / 100;
};

const getValidatedStock = (value: unknown): number | null => {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(numericValue) || numericValue < 0) {
    return null;
  }

  return numericValue;
};

const getValidatedQuantity = (value: unknown): number | null => {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
};

const getValidatedBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
};

const getValidatedDate = (value: unknown): string | null => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return value;
};

const getValidatedOrderStatus = (value: unknown): OrderStatus | null => {
  if (typeof value !== "string") {
    return null;
  }

  return orderStatuses.includes(value as OrderStatus) ? (value as OrderStatus) : null;
};

const getValidatedProductSort = (value: unknown): ProductSort | null => {
  if (typeof value !== "string") {
    return null;
  }

  return isProductSort(value) ? value : null;
};

const getValidatedOptionalPhone = (value: unknown): string | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || value.trim().length < 7 || value.trim().length > 40) {
    return null;
  }

  return value.trim();
};

const getValidatedOptionalShippingAddress = (value: unknown): string | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "string") {
    const normalizedAddress = value.trim();

    if (normalizedAddress.length < 5 || normalizedAddress.length > 500) {
      return null;
    }

    return normalizedAddress;
  }

  if (typeof value === "object") {
    const serializedAddress = JSON.stringify(value);

    if (serializedAddress.length < 5 || serializedAddress.length > 500) {
      return null;
    }

    return serializedAddress;
  }

  return null;
};

const getValidatedOptionalShippingCost = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  return getValidatedPrice(value);
};

const getValidatedPagination = (
  req: Request,
  fallbackPageSize = 12
) => {
  const pageSizeValue =
    req.query.limit === undefined ? req.query.pageSize : req.query.limit;

  return getPaginationInput(req.query.page, pageSizeValue, fallbackPageSize);
};

const getValidatedCategoryFilter = (req: Request): string | null => {
  const rawCategoryId =
    typeof req.query.categoryId === "string"
      ? req.query.categoryId
      : typeof req.query.category === "string"
        ? req.query.category
        : null;

  return rawCategoryId ? getValidatedUuid(rawCategoryId) : null;
};

const getValidatedPositiveInteger = (value: unknown): number | null => {
  if (value === undefined) {
    return null;
  }

  const parsed = typeof value === "string" ? Number(value) : Number.NaN;

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const getValidatedNonNegativeInteger = (value: unknown): number | null => {
  if (value === undefined) {
    return null;
  }

  const parsed = typeof value === "string" ? Number(value) : Number.NaN;

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

const getValidatedEmailOutboxStatus = (value: unknown): "pending" | "sent" | "failed" | null => {
  if (value !== "pending" && value !== "sent" && value !== "failed") {
    return null;
  }

  return value;
};

const toStartOfDayIso = (value: string): string => `${value}T00:00:00.000Z`;
const toEndOfDayIso = (value: string): string => `${value}T23:59:59.999Z`;

const getUploadErrorMessage = (error: unknown): string => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return "Each image must be 5MB or smaller.";
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return "You can upload up to 5 images per product.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to process the uploaded images.";
};

const getUploadedFiles = (req: Request): Express.Multer.File[] => {
  return Array.isArray(req.files) ? req.files : [];
};

const isDatabaseError = (error: unknown): error is { code?: string } => {
  return typeof error === "object" && error !== null && "code" in error;
};

const ensureProductAccess = (
  sellerId: string,
  auth: { userId: string; role: UserRole }
): boolean => {
  return auth.role === "admin" || auth.userId === sellerId;
};

const canUsersExchangeMessages = (
  senderRole: UserRole,
  recipientRole: UserRole
): boolean => {
  if (senderRole === "admin" || recipientRole === "admin") {
    return true;
  }

  return (
    (senderRole === "customer" && recipientRole === "seller") ||
    (senderRole === "seller" && recipientRole === "customer")
  );
};

router.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

router.post("/register", async (req, res) => {
  const name = getValidatedName(req.body.name);
  const email = getValidatedEmail(req.body.email);
  const password = getValidatedPassword(req.body.password);
  const requestedRole =
    typeof req.body.role === "string" && isUserRole(req.body.role)
      ? req.body.role
      : "customer";

  if (!name || !email || !password) {
    res.status(400).json({
      message:
        "Name, email and password are required. Password must be at least 8 characters."
    });
    return;
  }

  if (!validPublicRoles.includes(requestedRole)) {
    res.status(403).json({
      message: "Public registration is available only for customer and seller roles."
    });
    return;
  }

  try {
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      res.status(409).json({ message: "A user with that email already exists." });
      return;
    }

    const hashedPassword = await hashPassword(password);
    const user = await createUser({
      name,
      email,
      password: hashedPassword,
      role: requestedRole
    });
    const publicUser = toPublicUser(user);
    const token = signAuthToken({ userId: user.id, role: user.role });

    res.status(201).json({ token, user: publicUser });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Unable to register user right now." });
  }
});

router.post("/login", async (req, res) => {
  const email = getValidatedEmail(req.body.email);
  const password =
    typeof req.body.password === "string" ? req.body.password : null;

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required." });
    return;
  }

  try {
    const user = await findUserByEmail(email);

    if (!user) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    if (user.isBlocked) {
      res.status(403).json({ message: "This account is blocked." });
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const token = signAuthToken({ userId: user.id, role: user.role });

    res.status(200).json({ token, user: toPublicUser(user) });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Unable to login right now." });
  }
});

router.get(
  "/profile",
  requireAuth,
  authorizeRoles("customer", "seller", "admin"),
  async (req, res) => {
    const cacheKey = getProfileCacheKey(req.auth!.userId, req.auth!.role);

    try {
      const user = await getOrSetCachedJson({
        key: cacheKey,
        ttlSeconds: cacheTtls.profile,
        loader: async () => {
          const profile = await findPublicUserById(req.auth!.userId);

          if (!profile) {
            throw new Error("PROFILE_NOT_FOUND");
          }

          return profile;
        }
      });

      if (!user) {
        res.status(404).json({ message: "User profile was not found." });
        return;
      }

      res.status(200).json({ user });
    } catch (error) {
      if (error instanceof Error && error.message === "PROFILE_NOT_FOUND") {
        res.status(404).json({ message: "User profile was not found." });
        return;
      }

      console.error("Profile error:", error);
      res.status(500).json({ message: "Unable to load profile right now." });
    }
  }
);

router.get("/categories", async (req, res) => {
  const pagination = getValidatedPagination(req, 50);

  if (!pagination) {
    res.status(400).json({ message: "Pagination parameters are invalid." });
    return;
  }

  const cacheKey = getCategoriesCacheKey({
    page: pagination.page,
    limit: pagination.pageSize
  });

  try {
    const categories = await getOrSetCachedJson({
      key: cacheKey,
      ttlSeconds: cacheTtls.categories,
      loader: () => listCategories(pagination)
    });

    res.status(200).json(categories);
  } catch (error) {
    console.error("Categories fetch error:", error);
    res.status(500).json({ message: "Unable to load categories right now." });
  }
});

router.post(
  "/categories",
  requireAuth,
  authorizeRoles("seller", "admin"),
  async (req, res) => {
    const name = getValidatedCategoryName(req.body.name);

    if (!name) {
      res.status(400).json({ message: "Category name must be at least 2 characters." });
      return;
    }

    try {
      const category = await createCategory(name);
      await invalidateCachePrefix(cachePrefixes.categories);
      await invalidateCachePrefix(cachePrefixes.products);
      await invalidateCachePrefix(cachePrefixes.search);

      if (req.auth?.role === "admin") {
        await recordAdminActivity({
          adminId: req.auth.userId,
          action: "create_category",
          entityType: "category",
          entityId: category.id,
          details: { name: category.name }
        });
      }

      res.status(201).json({ category });
    } catch (error) {
      if (isDatabaseError(error) && error.code === "23505") {
        res.status(409).json({ message: "That category already exists." });
        return;
      }

      console.error("Category create error:", error);
      res.status(500).json({ message: "Unable to create category right now." });
    }
  }
);

router.put(
  "/categories/:id",
  requireAuth,
  authorizeRoles("seller", "admin"),
  async (req, res) => {
    const categoryId = getValidatedUuid(req.params.id);
    const name = getValidatedCategoryName(req.body.name);

    if (!categoryId) {
      res.status(400).json({ message: "Category id is invalid." });
      return;
    }

    if (!name) {
      res.status(400).json({ message: "Category name must be at least 2 characters." });
      return;
    }

    try {
      const category = await updateCategory(categoryId, name);

      if (!category) {
        res.status(404).json({ message: "Category was not found." });
        return;
      }

      await invalidateCachePrefix(cachePrefixes.categories);
      await invalidateCachePrefix(cachePrefixes.products);
      await invalidateCachePrefix(cachePrefixes.search);

      if (req.auth?.role === "admin") {
        await recordAdminActivity({
          adminId: req.auth.userId,
          action: "update_category",
          entityType: "category",
          entityId: category.id,
          details: { name: category.name }
        });
      }

      res.status(200).json({ category });
    } catch (error) {
      if (isDatabaseError(error) && error.code === "23505") {
        res.status(409).json({ message: "That category already exists." });
        return;
      }

      console.error("Category update error:", error);
      res.status(500).json({ message: "Unable to update category right now." });
    }
  }
);

router.delete(
  "/categories/:id",
  requireAuth,
  authorizeRoles("seller", "admin"),
  async (req, res) => {
    const categoryId = getValidatedUuid(req.params.id);

    if (!categoryId) {
      res.status(400).json({ message: "Category id is invalid." });
      return;
    }

    try {
      const wasDeleted = await deleteCategory(categoryId);

      if (!wasDeleted) {
        res.status(404).json({ message: "Category was not found." });
        return;
      }

      await invalidateCachePrefix(cachePrefixes.categories);
      await invalidateCachePrefix(cachePrefixes.products);
      await invalidateCachePrefix(cachePrefixes.search);

      if (req.auth?.role === "admin") {
        await recordAdminActivity({
          adminId: req.auth.userId,
          action: "delete_category",
          entityType: "category",
          entityId: categoryId,
          details: {}
        });
      }

      res.status(200).json({ message: "Category deleted successfully." });
    } catch (error) {
      if (isDatabaseError(error) && error.code === "23503") {
        res.status(409).json({
          message: "This category is still assigned to products and cannot be deleted."
        });
        return;
      }

      console.error("Category delete error:", error);
      res.status(500).json({ message: "Unable to delete category right now." });
    }
  }
);

router.get("/products/mine", requireAuth, authorizeRoles("seller", "admin"), async (req, res) => {
  try {
    const products = await listProductsBySeller(req.auth!.userId);
    res.status(200).json({ products });
  } catch (error) {
    console.error("Mine products fetch error:", error);
    res.status(500).json({ message: "Unable to load your products right now." });
  }
});

router.get("/products", async (req, res) => {
  const pagination = getValidatedPagination(req, 12);
  const categoryId = getValidatedCategoryFilter(req);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const sort =
    req.query.sort === undefined ? "latest" : getValidatedProductSort(req.query.sort);

  if (!pagination) {
    res.status(400).json({ message: "Pagination parameters are invalid." });
    return;
  }

  if (
    (typeof req.query.categoryId === "string" || typeof req.query.category === "string") &&
    !categoryId
  ) {
    res.status(400).json({ message: "Category filter is invalid." });
    return;
  }

  if (req.query.sort !== undefined && !sort) {
    res.status(400).json({ message: "Sort filter is invalid." });
    return;
  }

  const cacheKey = getProductsCacheKey({
    page: pagination.page,
    limit: pagination.pageSize,
    categoryId,
    search,
    sort
  });

  try {
    const products = await getOrSetCachedJson({
      key: cacheKey,
      ttlSeconds: search.length > 0 ? cacheTtls.search : cacheTtls.products,
      loader: () =>
        listProducts(
          {
            categoryId,
            search: search.length > 0 ? search : null,
            sort
          },
          pagination
        )
    });
    res.status(200).json(products);
  } catch (error) {
    console.error("Products fetch error:", error);
    res.status(500).json({ message: "Unable to load products right now." });
  }
});

router.post(
  "/products",
  requireAuth,
  authorizeRoles("seller", "admin"),
  async (req, res) => {
    try {
      await runProductImageUpload(req, res);
    } catch (error) {
      res.status(400).json({ message: getUploadErrorMessage(error) });
      return;
    }

    const uploadedFiles = getUploadedFiles(req);
    const name = getValidatedName(req.body.name);
    const description = getValidatedDescription(req.body.description);
    const price = getValidatedPrice(req.body.price);
    const stock = getValidatedStock(req.body.stock);
    const categoryId = getValidatedUuid(req.body.categoryId);

    if (!name || !description || price === null || stock === null || !categoryId) {
      await deleteStoredFiles(toStoredImagePaths(uploadedFiles));
      res.status(400).json({
        message:
          "Name, description, price, stock and category are required. Description must be at least 8 characters."
      });
      return;
    }

    if (uploadedFiles.length === 0) {
      res.status(400).json({ message: "At least one product image is required." });
      return;
    }

    try {
      const product = await createProduct({
        name,
        description,
        price,
        stock,
        categoryId,
        sellerId: req.auth!.userId,
        images: toStoredImagePaths(uploadedFiles)
      });

      await invalidateCachePrefix(cachePrefixes.products);
      await invalidateCachePrefix(cachePrefixes.search);

      if (req.auth?.role === "admin") {
        await recordAdminActivity({
          adminId: req.auth.userId,
          action: "create_product",
          entityType: "product",
          entityId: product.id,
          details: {
            name: product.name,
            sellerId: product.sellerId,
            categoryId: product.categoryId,
            price: product.price,
            stock: product.stock
          }
        });
      }

      res.status(201).json({ product });
    } catch (error) {
      await deleteStoredFiles(toStoredImagePaths(uploadedFiles));

      if (isDatabaseError(error) && error.code === "23503") {
        res.status(400).json({ message: "The selected category does not exist." });
        return;
      }

      console.error("Product create error:", error);
      res.status(500).json({ message: "Unable to create product right now." });
    }
  }
);

router.put(
  "/products/:id",
  requireAuth,
  authorizeRoles("seller", "admin"),
  async (req, res) => {
    const productId = getValidatedUuid(req.params.id);

    if (!productId) {
      res.status(400).json({ message: "Product id is invalid." });
      return;
    }

    try {
      await runProductImageUpload(req, res);
    } catch (error) {
      res.status(400).json({ message: getUploadErrorMessage(error) });
      return;
    }

    const uploadedFiles = getUploadedFiles(req);

    try {
      const existingProduct = await findProductById(productId);

      if (!existingProduct) {
        await deleteStoredFiles(toStoredImagePaths(uploadedFiles));
        res.status(404).json({ message: "Product was not found." });
        return;
      }

      if (!ensureProductAccess(existingProduct.sellerId, req.auth!)) {
        await deleteStoredFiles(toStoredImagePaths(uploadedFiles));
        res.status(403).json({ message: "You do not have access to this product." });
        return;
      }

      const name =
        req.body.name === undefined ? existingProduct.name : getValidatedName(req.body.name);
      const description =
        req.body.description === undefined
          ? existingProduct.description
          : getValidatedDescription(req.body.description);
      const price =
        req.body.price === undefined ? existingProduct.price : getValidatedPrice(req.body.price);
      const stock =
        req.body.stock === undefined ? existingProduct.stock : getValidatedStock(req.body.stock);
      const categoryId =
        req.body.categoryId === undefined
          ? existingProduct.categoryId
          : getValidatedUuid(req.body.categoryId);

      if (!name || !description || price === null || stock === null || !categoryId) {
        await deleteStoredFiles(toStoredImagePaths(uploadedFiles));
        res.status(400).json({
          message:
            "If provided, name, description, price, stock and category must be valid."
        });
        return;
      }

      const images =
        uploadedFiles.length > 0
          ? toStoredImagePaths(uploadedFiles)
          : existingProduct.images;

      const updatedProduct = await updateProduct(productId, {
        name,
        description,
        price,
        stock,
        categoryId,
        images
      });

      if (!updatedProduct) {
        await deleteStoredFiles(toStoredImagePaths(uploadedFiles));
        res.status(404).json({ message: "Product was not found." });
        return;
      }

      if (uploadedFiles.length > 0) {
        await deleteStoredFiles(existingProduct.images);
      }

      await invalidateCachePrefix(cachePrefixes.products);
      await invalidateCachePrefix(cachePrefixes.search);

      if (req.auth?.role === "admin") {
        await recordAdminActivity({
          adminId: req.auth.userId,
          action: "update_product",
          entityType: "product",
          entityId: updatedProduct.id,
          details: {
            name: updatedProduct.name,
            sellerId: updatedProduct.sellerId,
            categoryId: updatedProduct.categoryId,
            price: updatedProduct.price,
            stock: updatedProduct.stock
          }
        });
      }

      res.status(200).json({ product: updatedProduct });
    } catch (error) {
      await deleteStoredFiles(toStoredImagePaths(uploadedFiles));

      if (isDatabaseError(error) && error.code === "23503") {
        res.status(400).json({ message: "The selected category does not exist." });
        return;
      }

      console.error("Product update error:", error);
      res.status(500).json({ message: "Unable to update product right now." });
    }
  }
);

router.delete(
  "/products/:id",
  requireAuth,
  authorizeRoles("seller", "admin"),
  async (req, res) => {
    const productId = getValidatedUuid(req.params.id);

    if (!productId) {
      res.status(400).json({ message: "Product id is invalid." });
      return;
    }

    try {
      const existingProduct = await findProductById(productId);

      if (!existingProduct) {
        res.status(404).json({ message: "Product was not found." });
        return;
      }

      if (!ensureProductAccess(existingProduct.sellerId, req.auth!)) {
        res.status(403).json({ message: "You do not have access to this product." });
        return;
      }

      const wasDeleted = await deleteProduct(productId);

      if (!wasDeleted) {
        res.status(404).json({ message: "Product was not found." });
        return;
      }

      await deleteStoredFiles(existingProduct.images);
      await invalidateCachePrefix(cachePrefixes.products);
      await invalidateCachePrefix(cachePrefixes.search);

      if (req.auth?.role === "admin") {
        await recordAdminActivity({
          adminId: req.auth.userId,
          action: "delete_product",
          entityType: "product",
          entityId: productId,
          details: {
            name: existingProduct.name,
            sellerId: existingProduct.sellerId
          }
        });
      }

      res.status(200).json({ message: "Product deleted successfully." });
    } catch (error) {
      if (isDatabaseError(error) && error.code === "23503") {
        res.status(409).json({
          message: "This product is part of an order history and cannot be deleted."
        });
        return;
      }

      console.error("Product delete error:", error);
      res.status(500).json({ message: "Unable to delete product right now." });
    }
  }
);

router.post(
  "/cart/add",
  requireAuth,
  authorizeRoles("customer", "seller", "admin"),
  async (req, res) => {
    const productId = getValidatedUuid(req.body.productId);
    const quantity = getValidatedQuantity(req.body.quantity ?? 1);

    if (!productId || quantity === null) {
      res.status(400).json({
        message: "Product id and a positive quantity are required."
      });
      return;
    }

    try {
      const cart = await addToCart(req.auth!.userId, productId, quantity);
      res.status(200).json(cart);
    } catch (error) {
      if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
        res.status(404).json({ message: "Product was not found." });
        return;
      }

      if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
        res.status(409).json({
          message: "There is not enough stock available for that quantity."
        });
        return;
      }

      console.error("Cart add error:", error);
      res.status(500).json({ message: "Unable to add the product to cart right now." });
    }
  }
);

router.get(
  "/cart",
  requireAuth,
  authorizeRoles("customer", "seller", "admin"),
  async (req, res) => {
    try {
      const cart = await getCart(req.auth!.userId);
      res.status(200).json(cart);
    } catch (error) {
      console.error("Cart fetch error:", error);
      res.status(500).json({ message: "Unable to load the cart right now." });
    }
  }
);

router.delete(
  "/cart/remove",
  requireAuth,
  authorizeRoles("customer", "seller", "admin"),
  async (req, res) => {
    const productId = getValidatedUuid(req.body.productId);

    if (!productId) {
      res.status(400).json({ message: "Product id is invalid." });
      return;
    }

    try {
      const cart = await removeFromCart(req.auth!.userId, productId);
      res.status(200).json(cart);
    } catch (error) {
      console.error("Cart remove error:", error);
      res.status(500).json({ message: "Unable to remove the product from cart." });
    }
  }
);

router.post(
  "/checkout",
  requireAuth,
  authorizeRoles("customer", "seller", "admin"),
  async (req, res) => {
    const buyerPhone = getValidatedOptionalPhone(req.body?.buyerPhone);
    const shippingAddress = getValidatedOptionalShippingAddress(req.body?.shippingAddress);
    const shippingCost = getValidatedOptionalShippingCost(req.body?.shippingCost);

    if (req.body?.buyerPhone !== undefined && buyerPhone === null) {
      res.status(400).json({ message: "Buyer phone is invalid." });
      return;
    }

    if (req.body?.shippingAddress !== undefined && shippingAddress === null) {
      res.status(400).json({ message: "Shipping address is invalid." });
      return;
    }

    if (req.body?.shippingCost !== undefined && shippingCost === null) {
      res.status(400).json({ message: "Shipping cost is invalid." });
      return;
    }

    try {
      const order = await checkoutCart(req.auth!.userId, {
        buyerPhone,
        shippingAddress,
        shippingCost
      });
      await invalidateCachePrefix(cachePrefixes.products);
      await invalidateCachePrefix(cachePrefixes.search);
      res.status(201).json({
        message: "Order placed successfully. Payment will be collected on delivery.",
        order
      });
    } catch (error) {
      if (error instanceof Error && error.message === "EMPTY_CART") {
        res.status(409).json({ message: "Your cart is empty." });
        return;
      }

      if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
        res.status(409).json({
          message: "One or more products do not have enough stock for checkout."
        });
        return;
      }

      console.error("Checkout error:", error);
      res.status(500).json({ message: "Unable to complete checkout right now." });
    }
  }
);

router.get(
  "/orders",
  requireAuth,
  authorizeRoles("customer", "seller", "admin"),
  async (req, res) => {
    const pagination = getValidatedPagination(req, 10);

    if (!pagination) {
      res.status(400).json({ message: "Pagination parameters are invalid." });
      return;
    }

    try {
      const orders = await listOrdersByCustomer(req.auth!.userId, pagination);
      res.status(200).json(orders);
    } catch (error) {
      console.error("Customer orders fetch error:", error);
      res.status(500).json({ message: "Unable to load your orders right now." });
    }
  }
);

router.get(
  "/orders/seller",
  requireAuth,
  authorizeRoles("seller", "admin"),
  async (req, res) => {
    const pagination = getValidatedPagination(req, 10);

    if (!pagination) {
      res.status(400).json({ message: "Pagination parameters are invalid." });
      return;
    }

    try {
      const orders = await listOrdersForSeller(req.auth!.userId, pagination);
      res.status(200).json(orders);
    } catch (error) {
      console.error("Seller orders fetch error:", error);
      res.status(500).json({ message: "Unable to load seller orders right now." });
    }
  }
);

router.put(
  "/orders/:id/status",
  requireAuth,
  authorizeRoles("seller", "admin"),
  async (req, res) => {
    const orderId = getValidatedUuid(req.params.id);
    const status = getValidatedOrderStatus(req.body.status);

    if (!orderId) {
      res.status(400).json({ message: "Order id is invalid." });
      return;
    }

    if (!status) {
      res.status(400).json({ message: "Order status is invalid." });
      return;
    }

    try {
      const existingOrder = await findOrderById(orderId);

      if (!existingOrder) {
        res.status(404).json({ message: "Order was not found." });
        return;
      }

      if (req.auth!.role === "seller") {
        const canManage = await canSellerManageOrder(orderId, req.auth!.userId);

        if (!canManage) {
          res.status(403).json({ message: "You do not have access to this order." });
          return;
        }
      }

      const updatedOrder = await updateOrderStatus(orderId, status);

      if (!updatedOrder) {
        res.status(404).json({ message: "Order was not found." });
        return;
      }

      if (existingOrder.status !== updatedOrder.status) {
        void sendOrderStatusUpdatedEmail(updatedOrder, existingOrder.status);

        if (req.auth!.role === "admin") {
          await recordAdminActivity({
            adminId: req.auth!.userId,
            action: "update_order_status",
            entityType: "order",
            entityId: orderId,
            details: {
              previousStatus: existingOrder.status,
              nextStatus: updatedOrder.status
            }
          });
        }
      }

      res.status(200).json({ order: updatedOrder });
    } catch (error) {
      console.error("Order status update error:", error);
      res.status(500).json({ message: "Unable to update the order status right now." });
    }
  }
);

router.post(
  "/messages",
  requireAuth,
  authorizeRoles("customer", "seller", "admin"),
  async (req, res) => {
    const recipientId = getValidatedUuid(req.body.recipientId);
    const orderId =
      req.body.orderId === undefined || req.body.orderId === null || req.body.orderId === ""
        ? null
        : getValidatedUuid(req.body.orderId);
    const subject = getValidatedSubject(req.body.subject);
    const body = getValidatedMessageBody(req.body.body);

    if (!recipientId) {
      res.status(400).json({ message: "Recipient id is invalid." });
      return;
    }

    if (req.body.orderId !== undefined && req.body.orderId !== null && req.body.orderId !== "" && !orderId) {
      res.status(400).json({ message: "Order id is invalid." });
      return;
    }

    if (!subject || !body) {
      res.status(400).json({
        message: "Subject and body are required and must be at least 3 characters."
      });
      return;
    }

    if (recipientId === req.auth!.userId) {
      res.status(400).json({ message: "You cannot send messages to yourself." });
      return;
    }

    try {
      const recipient = await findUserById(recipientId);

      if (!recipient) {
        res.status(404).json({ message: "Recipient was not found." });
        return;
      }

      if (!canUsersExchangeMessages(req.auth!.role, recipient.role)) {
        res.status(403).json({
          message: "Messages are currently available only between customers, sellers and admins."
        });
        return;
      }

      if (orderId) {
        const order = await findOrderById(orderId);

        if (!order) {
          res.status(404).json({ message: "Order was not found." });
          return;
        }

        if (req.auth!.role !== "admin") {
          const customerToSeller =
            req.auth!.role === "customer" &&
            order.userId === req.auth!.userId &&
            order.items.some((item) => item.sellerId === recipientId);
          const sellerToCustomer =
            req.auth!.role === "seller" &&
            order.userId === recipientId &&
            order.items.some((item) => item.sellerId === req.auth!.userId);

          if (!customerToSeller && !sellerToCustomer) {
            res.status(403).json({
              message: "That order does not allow a conversation between these users."
            });
            return;
          }
        }
      }

      const message = await createMessage({
        senderId: req.auth!.userId,
        recipientId,
        orderId,
        subject,
        body
      });

      void sendInternalMessageEmail(message);
      res.status(201).json({ message });
    } catch (error) {
      console.error("Message create error:", error);
      res.status(500).json({ message: "Unable to send the message right now." });
    }
  }
);

router.get(
  "/messages",
  requireAuth,
  authorizeRoles("customer", "seller", "admin"),
  async (req, res) => {
    const contactId =
      typeof req.query.contactId === "string" ? getValidatedUuid(req.query.contactId) : null;
    const markAsRead =
      req.query.markAsRead === undefined ? false : getValidatedBoolean(req.query.markAsRead);

    if (typeof req.query.contactId === "string" && !contactId) {
      res.status(400).json({ message: "Contact id is invalid." });
      return;
    }

    if (req.query.markAsRead !== undefined && markAsRead === null) {
      res.status(400).json({ message: "markAsRead must be true or false." });
      return;
    }

    try {
      const messages = await listMessagesForUser({
        userId: req.auth!.userId,
        contactId,
        markAsRead: Boolean(markAsRead)
      });
      res.status(200).json(messages);
    } catch (error) {
      console.error("Messages fetch error:", error);
      res.status(500).json({ message: "Unable to load messages right now." });
    }
  }
);

router.get(
  "/admin/users",
  requireAuth,
  authorizeRoles("admin"),
  async (_req, res) => {
    try {
      const users = await listAllUsers();
      res.status(200).json({ users });
    } catch (error) {
      console.error("Admin users fetch error:", error);
      res.status(500).json({ message: "Unable to load users right now." });
    }
  }
);

router.get(
  "/admin/sellers",
  requireAuth,
  authorizeRoles("admin"),
  async (_req, res) => {
    try {
      const sellers = await listSellerUsers();
      res.status(200).json({ sellers });
    } catch (error) {
      console.error("Admin sellers fetch error:", error);
      res.status(500).json({ message: "Unable to load sellers right now." });
    }
  }
);

router.put(
  "/admin/users/:id",
  requireAuth,
  authorizeRoles("admin"),
  async (req, res) => {
    const userId = getValidatedUuid(req.params.id);

    if (!userId) {
      res.status(400).json({ message: "User id is invalid." });
      return;
    }

    const currentUser = await findUserById(userId);

    if (!currentUser) {
      res.status(404).json({ message: "User was not found." });
      return;
    }

    const name =
      req.body.name === undefined ? currentUser.name : getValidatedName(req.body.name);
    const email =
      req.body.email === undefined ? currentUser.email : getValidatedEmail(req.body.email);
    const role =
      req.body.role === undefined
        ? currentUser.role
        : typeof req.body.role === "string" && isUserRole(req.body.role)
          ? req.body.role
          : null;
    const isBlocked =
      req.body.isBlocked === undefined
        ? currentUser.isBlocked
        : getValidatedBoolean(req.body.isBlocked);

    if (!name || !email || !role || isBlocked === null) {
      res.status(400).json({
        message: "If provided, name, email, role and isBlocked must be valid."
      });
      return;
    }

    if (req.auth!.userId === userId && (isBlocked || role !== "admin")) {
      res.status(400).json({
        message: "Admins cannot block themselves or remove their own admin role."
      });
      return;
    }

    try {
      const updatedUser = await updateUserById(userId, {
        name,
        email,
        role,
        isBlocked
      });

      if (!updatedUser) {
        res.status(404).json({ message: "User was not found." });
        return;
      }

      await recordAdminActivity({
        adminId: req.auth!.userId,
        action: "update_user",
        entityType: "user",
        entityId: userId,
        details: {
          before: {
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            isBlocked: currentUser.isBlocked
          },
          after: {
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            isBlocked: updatedUser.isBlocked
          }
        }
      });

      await invalidateCachePrefix(getProfileCachePrefix(userId));

      res.status(200).json({ user: updatedUser });
    } catch (error) {
      if (isDatabaseError(error) && error.code === "23505") {
        res.status(409).json({ message: "That email is already in use." });
        return;
      }

      console.error("Admin user update error:", error);
      res.status(500).json({ message: "Unable to update the user right now." });
    }
  }
);

router.delete(
  "/admin/users/:id",
  requireAuth,
  authorizeRoles("admin"),
  async (req, res) => {
    const userId = getValidatedUuid(req.params.id);

    if (!userId) {
      res.status(400).json({ message: "User id is invalid." });
      return;
    }

    if (req.auth!.userId === userId) {
      res.status(400).json({ message: "Admins cannot delete themselves." });
      return;
    }

    const user = await findUserById(userId);

    if (!user) {
      res.status(404).json({ message: "User was not found." });
      return;
    }

    try {
      const wasDeleted = await deleteUserById(userId);

      if (!wasDeleted) {
        res.status(404).json({ message: "User was not found." });
        return;
      }

      await recordAdminActivity({
        adminId: req.auth!.userId,
        action: "delete_user",
        entityType: "user",
        entityId: userId,
        details: {
          name: user.name,
          email: user.email,
          role: user.role,
          isBlocked: user.isBlocked
        }
      });

      await invalidateCachePrefix(getProfileCachePrefix(userId));

      res.status(200).json({ message: "User deleted successfully." });
    } catch (error) {
      if (isDatabaseError(error) && error.code === "23503") {
        res.status(409).json({
          message: "This user has historical records and cannot be deleted."
        });
        return;
      }

      console.error("Admin user delete error:", error);
      res.status(500).json({ message: "Unable to delete the user right now." });
    }
  }
);

router.get(
  "/admin/orders",
  requireAuth,
  authorizeRoles("admin"),
  async (req, res) => {
    const pagination = getValidatedPagination(req, 12);
    const status =
      req.query.status === undefined
        ? null
        : getValidatedOrderStatus(req.query.status);
    const sellerId =
      typeof req.query.sellerId === "string" ? getValidatedUuid(req.query.sellerId) : null;
    const dateFrom =
      typeof req.query.dateFrom === "string" ? getValidatedDate(req.query.dateFrom) : null;
    const dateTo =
      typeof req.query.dateTo === "string" ? getValidatedDate(req.query.dateTo) : null;

    if (req.query.status !== undefined && !status) {
      res.status(400).json({ message: "Order status filter is invalid." });
      return;
    }

    if (typeof req.query.sellerId === "string" && !sellerId) {
      res.status(400).json({ message: "Seller filter is invalid." });
      return;
    }

    if (typeof req.query.dateFrom === "string" && !dateFrom) {
      res.status(400).json({ message: "dateFrom filter is invalid." });
      return;
    }

    if (typeof req.query.dateTo === "string" && !dateTo) {
      res.status(400).json({ message: "dateTo filter is invalid." });
      return;
    }

    if (!pagination) {
      res.status(400).json({ message: "Pagination parameters are invalid." });
      return;
    }

    try {
      const orders = await listAllOrders({
        status,
        sellerId,
        dateFrom,
        dateTo
      }, pagination);
      res.status(200).json(orders);
    } catch (error) {
      console.error("Admin orders fetch error:", error);
      res.status(500).json({ message: "Unable to load orders right now." });
    }
  }
);

router.get(
  "/admin/products",
  requireAuth,
  authorizeRoles("admin"),
  async (req, res) => {
    const pagination = getValidatedPagination(req, 12);
    const sellerId =
      typeof req.query.sellerId === "string" ? getValidatedUuid(req.query.sellerId) : null;
    const categoryId = getValidatedCategoryFilter(req);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const sort =
      req.query.sort === undefined ? "latest" : getValidatedProductSort(req.query.sort);

    if (typeof req.query.sellerId === "string" && !sellerId) {
      res.status(400).json({ message: "Seller filter is invalid." });
      return;
    }

    if (
      (typeof req.query.categoryId === "string" || typeof req.query.category === "string") &&
      !categoryId
    ) {
      res.status(400).json({ message: "Category filter is invalid." });
      return;
    }

    if (req.query.sort !== undefined && !sort) {
      res.status(400).json({ message: "Sort filter is invalid." });
      return;
    }

    if (!pagination) {
      res.status(400).json({ message: "Pagination parameters are invalid." });
      return;
    }

    try {
      const products = await listProducts({
        categoryId,
        sellerId,
        search: search.length > 0 ? search : null,
        sort
      }, pagination);
      res.status(200).json(products);
    } catch (error) {
      console.error("Admin products fetch error:", error);
      res.status(500).json({ message: "Unable to load products right now." });
    }
  }
);

router.get(
  "/metrics",
  async (req, res) => {
    try {
      if (req.query.format === "json") {
        res.status(200).json(await getMetricsSnapshot());
        return;
      }

      res.type("text/plain").status(200).send(await getPrometheusMetrics());
    } catch (error) {
      logger.error("Metrics endpoint failed", {
        error: error instanceof Error ? error.message : "Unknown metrics error"
      });
      res.status(500).json({ message: "Unable to load metrics right now." });
    }
  }
);

router.get(
  "/admin/ops/email-outbox",
  requireAuth,
  authorizeRoles("admin"),
  async (req, res) => {
    const page = req.query.page === undefined ? 1 : getValidatedPositiveInteger(req.query.page);
    const limit =
      req.query.limit === undefined ? 50 : getValidatedPositiveInteger(req.query.limit);
    const status =
      req.query.status === undefined ? null : getValidatedEmailOutboxStatus(req.query.status);
    const from = req.query.from === undefined ? null : getValidatedDate(req.query.from);
    const to = req.query.to === undefined ? null : getValidatedDate(req.query.to);
    const retryCount =
      req.query.retryCount === undefined
        ? null
        : getValidatedNonNegativeInteger(req.query.retryCount);

    if (!page || !limit) {
      res.status(400).json({ message: "Pagination parameters are invalid." });
      return;
    }

    if (req.query.status !== undefined && !status) {
      res.status(400).json({ message: "Status filter is invalid." });
      return;
    }

    if (req.query.from !== undefined && !from) {
      res.status(400).json({ message: "From date filter is invalid." });
      return;
    }

    if (req.query.to !== undefined && !to) {
      res.status(400).json({ message: "To date filter is invalid." });
      return;
    }

    if (req.query.retryCount !== undefined && retryCount === null) {
      res.status(400).json({ message: "Retry count filter is invalid." });
      return;
    }

    try {
      const overview = await getEmailOutboxOverview({
        page,
        limit,
        filters: {
          status,
          from: from ? toStartOfDayIso(from) : null,
          to: to ? toEndOfDayIso(to) : null,
          retryCount
        }
      });
      res.status(200).json(overview);
    } catch (error) {
      logger.error("Admin email outbox ops fetch error", {
        error: error instanceof Error ? error.message : "Unknown outbox ops error"
      });
      res.status(500).json({ message: "Unable to load email outbox operations right now." });
    }
  }
);

router.get(
  "/admin/ops/worker-health",
  requireAuth,
  authorizeRoles("admin"),
  (_req, res) => {
    try {
      const worker = getEmailOutboxWorkerHealth();
      res.status(200).json({ worker });
    } catch (error) {
      logger.error("Admin worker health fetch error", {
        error: error instanceof Error ? error.message : "Unknown worker health error"
      });
      res.status(500).json({ message: "Unable to load worker health right now." });
    }
  }
);

router.post(
  "/admin/ops/email-outbox/:id/retry",
  requireAuth,
  authorizeRoles("admin"),
  async (req, res) => {
    const outboxId = getValidatedUuid(req.params.id);

    if (!outboxId) {
      res.status(400).json({ message: "Email outbox id is invalid." });
      return;
    }

    try {
      const response = await retryEmailOutboxById(outboxId);

      if (response.result === "not_found") {
        res.status(404).json({ message: "Email outbox row was not found." });
        return;
      }

      await recordAdminActivity({
        adminId: req.auth!.userId,
        action: "retry_email_outbox_row",
        entityType: "email_outbox",
        entityId: outboxId,
        details: {
          result: response.result,
          orderId: response.row?.orderId ?? null,
          recipientType: response.row?.recipientType ?? null,
          recipientEmail: response.row?.recipientEmail ?? null,
          sellerId: response.row?.sellerId ?? null
        }
      });

      res.status(200).json(response);
    } catch (error) {
      logger.error("Admin email outbox retry error", {
        outboxId,
        error: error instanceof Error ? error.message : "Unknown outbox retry error"
      });
      res.status(500).json({ message: "Unable to retry the email outbox row right now." });
    }
  }
);

router.post(
  "/admin/ops/email-outbox/retry-failed",
  requireAuth,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const result = await retryFailedEmailOutboxRows();

      await recordAdminActivity({
        adminId: req.auth!.userId,
        action: "retry_failed_email_outbox_rows",
        entityType: "email_outbox",
        entityId: null,
        details: {
          updated: result.updated
        }
      });

      res.status(200).json(result);
    } catch (error) {
      logger.error("Admin email outbox bulk retry error", {
        error: error instanceof Error ? error.message : "Unknown bulk retry error"
      });
      res.status(500).json({ message: "Unable to retry failed email rows right now." });
    }
  }
);

router.post(
  "/admin/ops/email-outbox/:id/reset-failed",
  requireAuth,
  authorizeRoles("admin"),
  async (req, res) => {
    const outboxId = getValidatedUuid(req.params.id);

    if (!outboxId) {
      res.status(400).json({ message: "Email outbox id is invalid." });
      return;
    }

    try {
      const response = await resetFailedEmailOutboxRow(outboxId);

      if (response.result === "not_found") {
        res.status(404).json({ message: "Email outbox row was not found." });
        return;
      }

      await recordAdminActivity({
        adminId: req.auth!.userId,
        action: "reset_failed_email_outbox_row",
        entityType: "email_outbox",
        entityId: outboxId,
        details: {
          result: response.result,
          orderId: response.row?.orderId ?? null,
          recipientType: response.row?.recipientType ?? null,
          recipientEmail: response.row?.recipientEmail ?? null,
          sellerId: response.row?.sellerId ?? null
        }
      });

      res.status(200).json(response);
    } catch (error) {
      logger.error("Admin email outbox reset error", {
        outboxId,
        error: error instanceof Error ? error.message : "Unknown outbox reset error"
      });
      res.status(500).json({ message: "Unable to reset the failed email row right now." });
    }
  }
);

export default router;
