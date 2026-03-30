import { Router } from "express";
import {
  destroyUser,
  indexUsers,
  showUser,
  storeUser,
  updateManagedUser
} from "../controllers/user.controller";
import { requireRoles } from "../middlewares/role.middleware";
import { requireUserAuth } from "../middlewares/auth.middleware";

export const userRouter = Router();

userRouter.use(requireUserAuth, requireRoles("admin"));
userRouter.get("/", indexUsers);
userRouter.post("/", storeUser);
userRouter.get("/:id", showUser);
userRouter.patch("/:id", updateManagedUser);
userRouter.delete("/:id", destroyUser);

