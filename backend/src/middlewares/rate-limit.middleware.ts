import rateLimit from "express-rate-limit";
import { env } from "../utils/config";

const skipSystemEndpoints = (req: { path: string }) =>
  req.path.startsWith("/health") ||
  req.path.startsWith("/metrics") ||
  req.path.startsWith("/observability");

const buildLimiter = (limit: number) =>
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: skipSystemEndpoints,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
        code: "RATE_LIMIT_EXCEEDED"
      });
    }
  });

export const generalRateLimit = buildLimiter(env.RATE_LIMIT_MAX_REQUESTS);

export const authRateLimit = buildLimiter(env.AUTH_RATE_LIMIT_MAX_REQUESTS);
