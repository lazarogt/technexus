import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
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

  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({
      success: false,
      message: "Request body is not valid JSON.",
      code: "INVALID_JSON"
    });
    return;
  }

  if (error instanceof MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Each image must be 5MB or smaller."
        : error.code === "LIMIT_FILE_COUNT"
          ? "You can upload up to 5 images per product."
          : error.message;

    res.status(400).json({ success: false, message });
    return;
  }

  if (error instanceof Error && error.message === "Only JPG, PNG, WEBP and GIF images are allowed.") {
    res.status(400).json({ success: false, message: error.message });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: error.issues[0]?.message ?? "Validation failed.",
      code: "VALIDATION_ERROR",
      details: error.flatten()
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({
        success: false,
        message: "A record conflict was detected while saving the request.",
        code: "CONFLICT"
      });
      return;
    }

    if (error.code === "P2003" || error.code === "P2025") {
      res.status(400).json({
        success: false,
        message: "One or more related records are invalid for this request.",
        code: "INVALID_RELATION"
      });
      return;
    }
  }

  if (isAppError(error)) {
    res.status(error.statusCode).json({
      success: false,
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
  res.status(500).json({ success: false, message: "Internal server error." });
};
