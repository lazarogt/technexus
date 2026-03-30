import { Router } from "express";
import {
  destroyCartItem,
  showCart,
  storeCartItem
} from "../controllers/cart.controller";
import { requireActor } from "../middlewares/auth.middleware";

export const cartRouter = Router();

cartRouter.use(requireActor);
cartRouter.get("/", showCart);
cartRouter.post("/", storeCartItem);
cartRouter.delete("/", destroyCartItem);

