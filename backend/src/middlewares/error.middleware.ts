import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { recordError } from "../services/observability.service";
import { AppError, isAppError } from "../utils/errors";
import { logger } from "../utils/logger";

export const notFoundMiddleware = (_req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(404, "NOT_FOUND", "The requested resource was not found."));
};

export const errorMiddleware = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  recordError();

  if (error instanceof MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Each image must be 5MB or smaller."
        : error.code === "LIMIT_FILE_COUNT"
          ? "You can upload up to 5 images per product."
          : error.message;

    res.status(400).json({ message });
    return;
  }

  if (error instanceof Error && error.message === "Only JPG, PNG, WEBP and GIF images are allowed.") {
    res.status(400).json({ message: error.message });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      message: error.issues[0]?.message ?? "Validation failed.",
      code: "VALIDATION_ERROR",
      details: error.flatten()
    });
    return;
  }

  if (isAppError(error)) {
    res.status(error.statusCode).json({
      message: error.message,
      code: error.code,
      details: error.details
    });
    return;
  }

  logger.error(
    {
      err: error,
      requestId: req.requestId,
      method: req.method,
      route: req.originalUrl,
      error: error instanceof Error ? error.message : "Unknown unhandled error"
    },
    "Unhandled request error"
  );
  res.status(500).json({ message: "Internal server error." });
};
