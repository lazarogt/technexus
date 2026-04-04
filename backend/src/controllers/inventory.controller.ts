import { z } from "zod";
import { asyncHandler } from "../utils/async-handler";
import {
  listInventoryAlerts,
  listInventoryByProduct,
  updateInventoryRecord
} from "../services/inventory.service";
import { inventoryIdParamSchema, productIdParamSchema } from "../utils/request-validation";

const updateInventorySchema = z.object({
  quantity: z.number().int().nonnegative().optional(),
  lowStockThreshold: z.number().int().nonnegative().optional()
});

export const indexProductInventory = asyncHandler(async (req, res) => {
  const params = productIdParamSchema.parse(req.params);
  const data = await listInventoryByProduct(
    {
      role: req.actor!.role!,
      userId: req.actor!.userId!
    },
    params.productId
  );
  res.status(200).json(data);
});

export const patchInventory = asyncHandler(async (req, res) => {
  const params = inventoryIdParamSchema.parse(req.params);
  const payload = updateInventorySchema.parse(req.body);
  const inventory = await updateInventoryRecord(
    {
      role: req.actor!.role!,
      userId: req.actor!.userId!
    },
    params.inventoryId,
    payload
  );
  res.status(200).json({ inventory });
});

export const indexInventoryAlerts = asyncHandler(async (req, res) => {
  const alerts = await listInventoryAlerts({
    role: req.actor!.role!,
    userId: req.actor!.userId!
  });
  res.status(200).json({ alerts });
});
