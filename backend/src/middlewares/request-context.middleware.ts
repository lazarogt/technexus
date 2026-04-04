import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { recordRequest } from "../services/observability.service";

const REQUEST_ID_HEADER = "X-Request-Id";

export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const incomingRequestId = req.header(REQUEST_ID_HEADER);
  const requestId = incomingRequestId?.trim() || crypto.randomUUID();

  req.requestId = requestId;
  res.locals.requestStartedAt = Date.now();
  res.setHeader(REQUEST_ID_HEADER, requestId);
  res.on("finish", () => {
    recordRequest();
  });

  next();
};
