import { Router } from "express";
import { authRouter } from "./auth.routes";
import { userRouter } from "./user.routes";
import { categoryRouter } from "./category.routes";
import { productRouter } from "./product.routes";
import { cartRouter } from "./cart.routes";
import { orderRouter } from "./order.routes";
import { inventoryRouter } from "./inventory.routes";
import {
  login,
  profile,
  register,
  createGuest
} from "../controllers/auth.controller";
import {
  destroyCategory,
  indexCategories,
  storeCategory,
  updateManagedCategory
} from "../controllers/category.controller";
import {
  destroyProduct,
  indexProducts,
  sellerProducts,
  showProduct,
  storeProduct,
  updateManagedProduct
} from "../controllers/product.controller";
import { destroyCartItem, showCart, storeCartItem } from "../controllers/cart.controller";
import {
  indexOrders,
  metrics,
  outboxOverview,
  outboxWorkerHealth,
  resetFailedOutbox,
  retryFailedOutbox,
  retryOutbox,
  storeOrder,
  updateManagedOrderStatus
} from "../controllers/order.controller";
import {
  destroyUser,
  indexUsers,
  updateManagedUser
} from "../controllers/user.controller";
import { observabilityMetrics } from "../controllers/system.controller";
import { requireActor, requireUserAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/role.middleware";
import { authRateLimit } from "../middlewares/rate-limit.middleware";
import { productImageUpload } from "../middlewares/upload.middleware";
import { adminAnalyticsRouter, analyticsRouter } from "../modules/analytics/analytics.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/analytics", analyticsRouter);
apiRouter.use("/admin/analytics", requireUserAuth, requireRoles("admin"), adminAnalyticsRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/categories", categoryRouter);
apiRouter.use("/products", productRouter);
apiRouter.use("/cart", cartRouter);
apiRouter.use("/orders", orderRouter);
apiRouter.use("/inventory", inventoryRouter);
apiRouter.get("/observability/metrics", observabilityMetrics);
apiRouter.get("/metrics", metrics);
apiRouter.get(
  "/admin/ops/email-outbox",
  requireUserAuth,
  requireRoles("admin"),
  outboxOverview
);
apiRouter.get(
  "/admin/ops/worker-health",
  requireUserAuth,
  requireRoles("admin"),
  outboxWorkerHealth
);
apiRouter.post(
  "/admin/ops/email-outbox/retry-failed",
  requireUserAuth,
  requireRoles("admin"),
  retryFailedOutbox
);
apiRouter.post(
  "/admin/ops/email-outbox/:id/retry",
  requireUserAuth,
  requireRoles("admin"),
  retryOutbox
);
apiRouter.post(
  "/admin/ops/email-outbox/:id/reset-failed",
  requireUserAuth,
  requireRoles("admin"),
  resetFailedOutbox
);

export const legacyRouter = Router();

legacyRouter.post("/register", authRateLimit, register);
legacyRouter.post("/login", authRateLimit, login);
legacyRouter.post("/guest", authRateLimit, createGuest);
legacyRouter.get("/profile", requireUserAuth, profile);

legacyRouter.get("/categories", indexCategories);
legacyRouter.post("/categories", requireUserAuth, requireRoles("admin"), storeCategory);
legacyRouter.put("/categories/:id", requireUserAuth, requireRoles("admin"), updateManagedCategory);
legacyRouter.delete(
  "/categories/:id",
  requireUserAuth,
  requireRoles("admin"),
  destroyCategory
);

legacyRouter.get("/products", indexProducts);
legacyRouter.get("/products/mine", requireUserAuth, requireRoles("seller", "admin"), sellerProducts);
legacyRouter.get("/products/:id", showProduct);
legacyRouter.post(
  "/products",
  requireUserAuth,
  requireRoles("seller", "admin"),
  productImageUpload.array("images", 5),
  storeProduct
);
legacyRouter.put(
  "/products/:id",
  requireUserAuth,
  requireRoles("seller", "admin"),
  productImageUpload.array("images", 5),
  updateManagedProduct
);
legacyRouter.delete(
  "/products/:id",
  requireUserAuth,
  requireRoles("seller", "admin"),
  destroyProduct
);

legacyRouter.get("/cart", requireActor, showCart);
legacyRouter.post("/cart", requireActor, storeCartItem);
legacyRouter.delete("/cart", requireActor, destroyCartItem);

legacyRouter.post("/checkout", requireActor, storeOrder);
legacyRouter.get("/orders", requireActor, indexOrders);
legacyRouter.get(
  "/orders/seller",
  requireUserAuth,
  requireRoles("seller", "admin"),
  (req, _res, next) => {
    req.query.sellerId = req.actor!.role === "admin" ? req.query.sellerId : req.actor!.userId;
    next();
  },
  indexOrders
);
legacyRouter.patch(
  "/orders/:id/status",
  requireUserAuth,
  requireRoles("seller", "admin"),
  updateManagedOrderStatus
);
legacyRouter.put(
  "/orders/:id/status",
  requireUserAuth,
  requireRoles("seller", "admin"),
  updateManagedOrderStatus
);

legacyRouter.get("/admin/users", requireUserAuth, requireRoles("admin"), indexUsers);
legacyRouter.put("/admin/users/:id", requireUserAuth, requireRoles("admin"), updateManagedUser);
legacyRouter.delete("/admin/users/:id", requireUserAuth, requireRoles("admin"), destroyUser);
legacyRouter.get("/admin/orders", requireUserAuth, requireRoles("admin"), indexOrders);

legacyRouter.get("/observability/metrics", observabilityMetrics);
legacyRouter.get("/metrics", metrics);
legacyRouter.get(
  "/admin/ops/email-outbox",
  requireUserAuth,
  requireRoles("admin"),
  outboxOverview
);
legacyRouter.get(
  "/admin/ops/worker-health",
  requireUserAuth,
  requireRoles("admin"),
  outboxWorkerHealth
);
legacyRouter.post(
  "/admin/ops/email-outbox/retry-failed",
  requireUserAuth,
  requireRoles("admin"),
  retryFailedOutbox
);
legacyRouter.post(
  "/admin/ops/email-outbox/:id/retry",
  requireUserAuth,
  requireRoles("admin"),
  retryOutbox
);
legacyRouter.post(
  "/admin/ops/email-outbox/:id/reset-failed",
  requireUserAuth,
  requireRoles("admin"),
  resetFailedOutbox
);
