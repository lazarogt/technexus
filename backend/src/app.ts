import fs from "node:fs";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./utils/config";
import { AppError } from "./utils/errors";
import { logger } from "./utils/logger";
import { optionalActor } from "./middlewares/auth.middleware";
import { requestContextMiddleware } from "./middlewares/request-context.middleware";
import { generalRateLimit } from "./middlewares/rate-limit.middleware";
import { errorMiddleware, notFoundMiddleware } from "./middlewares/error.middleware";
import { apiRouter, legacyRouter } from "./routes";
import { health } from "./controllers/system.controller";

const getRouteLabel = (req: express.Request) => {
  if (req.route?.path) {
    const routePath = Array.isArray(req.route.path) ? req.route.path.join("|") : req.route.path;
    return `${req.baseUrl}${routePath}`;
  }

  return req.originalUrl.split("?")[0];
};

export const createApp = () => {
  fs.mkdirSync(env.uploadsDir, { recursive: true });

  const app = express();
  app.disable("x-powered-by");

  app.use(requestContextMiddleware);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.requestId ?? "unknown-request",
      customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) {
          return "error";
        }

        if (res.statusCode >= 400) {
          return "warn";
        }

        return "info";
      },
      customProps: (req, res) => ({
        requestId: req.requestId,
        method: req.method,
        route: getRouteLabel(req),
        statusCode: res.statusCode,
        responseTimeMs: Math.max(0, Date.now() - Number(res.locals.requestStartedAt ?? Date.now()))
      })
    })
  );
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          imgSrc: ["'self'", "data:", "https:"],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"]
        }
      },
      crossOriginResourcePolicy: {
        policy: "cross-origin"
      },
      frameguard: {
        action: "deny"
      },
      hsts: env.isProduction
    })
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }

        if (env.corsAllowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new AppError(403, "CORS_ORIGIN_DENIED", "Origin is not allowed by CORS."));
      },
      credentials: false,
      exposedHeaders: ["X-Request-Id"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
    })
  );
  app.use(generalRateLimit);
  app.use(express.json({ limit: env.REQUEST_BODY_LIMIT }));
  app.use(
    express.urlencoded({
      extended: true,
      limit: env.REQUEST_BODY_LIMIT,
      parameterLimit: env.URLENCODED_PARAMETER_LIMIT
    })
  );
  app.use(optionalActor);

  app.get("/health", health);
  app.use(
    "/uploads",
    express.static(env.uploadsDir, {
      dotfiles: "deny",
      index: false,
      setHeaders: (res) => {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("X-Content-Type-Options", "nosniff");
      }
    })
  );
  app.use("/api", apiRouter);
  app.use("/", legacyRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};
