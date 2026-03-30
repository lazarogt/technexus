import { Router } from "express";
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
import { requireActor, requireUserAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/role.middleware";

export const orderRouter = Router();

orderRouter.get("/metrics", metrics);
orderRouter.get(
  "/seller",
  requireUserAuth,
  requireRoles("seller", "admin"),
  (req, _res, next) => {
    if (req.actor?.role === "seller") {
      req.query.sellerId = req.actor.userId;
    }
    next();
  },
  indexOrders
);
orderRouter.post("/", requireActor, storeOrder);
orderRouter.get("/", requireActor, indexOrders);
orderRouter.patch(
  "/:id/status",
  requireUserAuth,
  requireRoles("seller", "admin"),
  updateManagedOrderStatus
);
orderRouter.get(
  "/admin/outbox",
  requireUserAuth,
  requireRoles("admin"),
  outboxOverview
);
orderRouter.get(
  "/admin/outbox/worker-health",
  requireUserAuth,
  requireRoles("admin"),
  outboxWorkerHealth
);
orderRouter.post(
  "/admin/outbox/retry-failed",
  requireUserAuth,
  requireRoles("admin"),
  retryFailedOutbox
);
orderRouter.post(
  "/admin/outbox/:id/retry",
  requireUserAuth,
  requireRoles("admin"),
  retryOutbox
);
orderRouter.post(
  "/admin/outbox/:id/reset-failed",
  requireUserAuth,
  requireRoles("admin"),
  resetFailedOutbox
);
