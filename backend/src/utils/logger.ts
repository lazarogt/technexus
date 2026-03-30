import pino from "pino";
import { env } from "./config";

export const logger = pino({
  level: env.isProduction ? "info" : "debug",
  transport: env.isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard"
        }
      }
});

export const childLogger = (bindings: Record<string, unknown>) => logger.child(bindings);

