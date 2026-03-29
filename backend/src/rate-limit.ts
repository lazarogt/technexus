import rateLimit from "express-rate-limit";

const defaultWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);

export const apiRateLimit = rateLimit({
  windowMs: defaultWindowMs,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests from this client. Please try again later."
  }
});

export const authRateLimit = rateLimit({
  windowMs: defaultWindowMs,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS ?? 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please try again later."
  }
});
