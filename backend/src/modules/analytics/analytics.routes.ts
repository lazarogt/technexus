import { Router } from "express";
import { captureAnalyticsEvent } from "./analytics.controller";

export const analyticsRouter = Router();

analyticsRouter.post("/", captureAnalyticsEvent);
