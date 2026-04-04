import { z } from "zod";
import { OrderStatus } from "@prisma/client";
import { asyncHandler } from "../utils/async-handler";
import {
  createOrderFromCart,
  listOrders,
  updateOrderStatus
} from "../services/order.service";
import {
  getMetricsSnapshot,
  getOutboxOverview,
  getOutboxWorkerHealth,
  getPrometheusMetrics,
  resetFailedOutboxRow,
  retryFailedOutboxRows,
  retryOutboxById
} from "../services/outbox.service";
import { idParamSchema, metricsFormatQuerySchema, orderListQuerySchema, outboxOverviewQuerySchema } from "../utils/request-validation";

const createOrderSchema = z.object({
  buyerName: z.string().trim().min(2).optional(),
  buyerEmail: z.string().email().optional(),
  buyerPhone: z.string().trim().min(7).optional(),
  shippingAddress: z.string().trim().min(5).optional(),
  shippingCost: z.union([z.string(), z.number()]).optional()
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus)
});

export const storeOrder = asyncHandler(async (req, res) => {
  const payload = createOrderSchema.parse(req.body);
  const response = await createOrderFromCart(req.actor!, payload);
  res.status(201).json(response);
});

export const indexOrders = asyncHandler(async (req, res) => {
  const query = orderListQuerySchema.parse(req.query);
  const response = await listOrders(req.actor!, {
    page: query.page,
    limit: query.limit ?? query.pageSize,
    status: query.status,
    sellerId: query.sellerId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo
  });
  res.status(200).json(response);
});

export const updateManagedOrderStatus = asyncHandler(async (req, res) => {
  const params = idParamSchema.parse(req.params);
  const payload = updateStatusSchema.parse(req.body);
  const order = await updateOrderStatus(
    {
      role: req.actor!.role!,
      userId: req.actor!.userId!
    },
    params.id,
    payload.status
  );
  res.status(200).json({ order });
});

export const metrics = asyncHandler(async (req, res) => {
  const query = metricsFormatQuerySchema.parse(req.query);

  if (query.format === "json") {
    res.status(200).json(await getMetricsSnapshot());
    return;
  }

  res.type("text/plain").status(200).send(await getPrometheusMetrics());
});

export const outboxOverview = asyncHandler(async (req, res) => {
  const query = outboxOverviewQuerySchema.parse(req.query);

  const overview = await getOutboxOverview({
    page: query.page,
    limit: query.limit,
    status: query.status ?? null
  });
  res.status(200).json(overview);
});

export const outboxWorkerHealth = asyncHandler(async (_req, res) => {
  res.status(200).json({ worker: getOutboxWorkerHealth() });
});

export const retryOutbox = asyncHandler(async (req, res) => {
  const params = idParamSchema.parse(req.params);
  const response = await retryOutboxById(params.id);
  if (response.result === "not_found") {
    res.status(404).json({ message: "Email outbox row was not found." });
    return;
  }
  res.status(200).json(response);
});

export const retryFailedOutbox = asyncHandler(async (_req, res) => {
  res.status(200).json(await retryFailedOutboxRows());
});

export const resetFailedOutbox = asyncHandler(async (req, res) => {
  const params = idParamSchema.parse(req.params);
  const response = await resetFailedOutboxRow(params.id);
  if (response.result === "not_found") {
    res.status(404).json({ message: "Email outbox row was not found." });
    return;
  }
  res.status(200).json(response);
});
