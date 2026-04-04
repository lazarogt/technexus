import pino from "pino";
import { env } from "./config";

const baseLoggerOptions: pino.LoggerOptions = {
  level: env.logLevel,
  messageKey: "message",
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label })
  }
};

export const logger = pino({
  ...baseLoggerOptions,
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
