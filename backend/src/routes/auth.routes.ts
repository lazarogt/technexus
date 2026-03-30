import { Router } from "express";
import { createGuest, login, profile, register } from "../controllers/auth.controller";
import { authRateLimit } from "../middlewares/rate-limit.middleware";
import { requireUserAuth } from "../middlewares/auth.middleware";

export const authRouter = Router();

authRouter.post("/register", authRateLimit, register);
authRouter.post("/login", authRateLimit, login);
authRouter.post("/guest", authRateLimit, createGuest);
authRouter.get("/profile", requireUserAuth, profile);

