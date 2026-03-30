import { Router } from "express";
import {
  indexInventoryAlerts,
  indexProductInventory,
  patchInventory
} from "../controllers/inventory.controller";
import { requireUserAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/role.middleware";

export const inventoryRouter = Router();

inventoryRouter.use(requireUserAuth, requireRoles("seller", "admin"));
inventoryRouter.get("/alerts", indexInventoryAlerts);
inventoryRouter.get("/products/:productId", indexProductInventory);
inventoryRouter.patch("/:inventoryId", patchInventory);

