import fs from "node:fs";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./utils/config";
import { logger } from "./utils/logger";
import { optionalActor } from "./middlewares/auth.middleware";
import { generalRateLimit } from "./middlewares/rate-limit.middleware";
import { errorMiddleware, notFoundMiddleware } from "./middlewares/error.middleware";
import { apiRouter, legacyRouter } from "./routes";

export const createApp = () => {
  fs.mkdirSync(env.uploadsDir, { recursive: true });

  const app = express();

  app.use(
    pinoHttp({
      logger
    })
  );
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
      credentials: true
    })
  );
  app.use(generalRateLimit);
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(optionalActor);

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  app.use("/uploads", express.static(env.uploadsDir));
  app.use("/api", apiRouter);
  app.use("/", legacyRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};

