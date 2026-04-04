import rateLimit from "express-rate-limit";
import { env } from "../utils/config";

const skipSystemEndpoints = (req: { path: string }) =>
  req.path.startsWith("/health") ||
  req.path.startsWith("/metrics") ||
  req.path.startsWith("/observability");

export const generalRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: skipSystemEndpoints
});

export const authRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: skipSystemEndpoints
});
