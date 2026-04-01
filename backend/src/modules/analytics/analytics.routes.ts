import { Router } from "express";
import { captureAnalyticsEvent, showAnalyticsOverview } from "./analytics.controller";

export const analyticsRouter = Router();
export const adminAnalyticsRouter = Router();

analyticsRouter.post("/", captureAnalyticsEvent);
adminAnalyticsRouter.get("/overview", showAnalyticsOverview);
