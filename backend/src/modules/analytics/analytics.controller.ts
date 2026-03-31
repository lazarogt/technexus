import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { logger } from "../../utils/logger";
import { analyticsEventNames, storeAnalyticsEvent } from "./analytics.service";

const analyticsEventSchema = z.object({
  event: z.enum(analyticsEventNames),
  userId: z.string().uuid().optional(),
  sessionId: z.string().trim().min(1).max(120),
  data: z.record(z.string(), z.unknown()).optional()
});

export const captureAnalyticsEvent = (req: Request, res: Response) => {
  const payload = analyticsEventSchema.parse(req.body);
  const trustedUserId = req.actor?.type === "user" ? req.actor.userId ?? null : null;

  res.status(202).json({ accepted: true });

  void storeAnalyticsEvent({
    event: payload.event,
    sessionId: payload.sessionId,
    userId: trustedUserId,
    data: payload.data as Prisma.InputJsonObject | undefined
  }).catch((error) => {
    logger.error(
      {
        event: payload.event,
        sessionId: payload.sessionId,
        error: error instanceof Error ? error.message : "Unknown analytics persistence error"
      },
      "Unable to persist analytics event"
    );
  });
};
