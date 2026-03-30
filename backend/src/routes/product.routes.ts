import { Router } from "express";
import {
  destroyProduct,
  indexProducts,
  sellerProducts,
  showProduct,
  storeProduct,
  updateManagedProduct
} from "../controllers/product.controller";
import { requireRoles } from "../middlewares/role.middleware";
import { requireUserAuth } from "../middlewares/auth.middleware";
import { productImageUpload } from "../middlewares/upload.middleware";

export const productRouter = Router();

productRouter.get("/", indexProducts);
productRouter.get("/mine", requireUserAuth, requireRoles("seller", "admin"), sellerProducts);
productRouter.get("/:id", showProduct);
productRouter.post(
  "/",
  requireUserAuth,
  requireRoles("seller", "admin"),
  productImageUpload.array("images", 5),
  storeProduct
);
productRouter.put(
  "/:id",
  requireUserAuth,
  requireRoles("seller", "admin"),
  productImageUpload.array("images", 5),
  updateManagedProduct
);
productRouter.delete("/:id", requireUserAuth, requireRoles("seller", "admin"), destroyProduct);

