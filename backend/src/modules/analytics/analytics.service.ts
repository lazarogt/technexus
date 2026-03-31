import type { Prisma } from "@prisma/client";
import { prisma } from "../../services/prisma.service";

export const analyticsEventNames = [
  "view_home",
  "view_product",
  "add_to_cart",
  "view_cart",
  "start_checkout",
  "complete_order"
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];

export type CreateAnalyticsEventInput = {
  event: AnalyticsEventName;
  sessionId: string;
  userId: string | null;
  data?: Prisma.InputJsonValue;
};

export async function storeAnalyticsEvent(input: CreateAnalyticsEventInput) {
  await prisma.analyticsEvent.create({
    data: {
      event: input.event,
      sessionId: input.sessionId,
      userId: input.userId,
      data: input.data
    }
  });
}
