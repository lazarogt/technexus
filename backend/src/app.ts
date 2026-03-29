import cors from "cors";
import express from "express";
import path from "path";
import { requestLoggingMiddleware } from "./logger";
import { apiRateLimit, authRateLimit } from "./rate-limit";
import routes from "./routes";

export const createApp = () => {
  const app = express();
  const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:8080")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const uploadsDirectory = path.join(process.cwd(), "uploads");

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(null, false);
      }
    })
  );
  app.use(express.json());
  app.use(requestLoggingMiddleware);
  app.use(apiRateLimit);
  app.use("/register", authRateLimit);
  app.use("/login", authRateLimit);
  app.use("/uploads", express.static(uploadsDirectory));
  app.use(routes);

  return app;
};
