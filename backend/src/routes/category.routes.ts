import { Router } from "express";
import {
  destroyCategory,
  indexCategories,
  storeCategory,
  updateManagedCategory
} from "../controllers/category.controller";
import { requireRoles } from "../middlewares/role.middleware";
import { requireUserAuth } from "../middlewares/auth.middleware";

export const categoryRouter = Router();

categoryRouter.get("/", indexCategories);
categoryRouter.post("/", requireUserAuth, requireRoles("admin"), storeCategory);
categoryRouter.put("/:id", requireUserAuth, requireRoles("admin"), updateManagedCategory);
categoryRouter.delete("/:id", requireUserAuth, requireRoles("admin"), destroyCategory);

