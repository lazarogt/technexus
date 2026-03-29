import fs from "node:fs";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";

export type LogLevel = "info" | "warn" | "error";
export type ServiceName = "api" | "email-worker" | "outbox";
export type LogContext = Record<string, unknown>;

type LogEntry = {
  level: LogLevel;
  service: ServiceName;
  message: string;
  timestamp: string;
  context: LogContext;
};

const logsDirectory = path.join(process.cwd(), "logs");
const logFilePath = path.join(logsDirectory, "app.log");

const serializeError = (error: Error) => ({
  name: error.name,
  message: error.message,
  stack: error.stack ?? null
});

const normalizeMessage = (message: unknown): string => {
  if (typeof message === "string") {
    return message;
  }

  if (message instanceof Error) {
    return message.message;
  }

  return "Structured log";
};

const normalizeContext = (value: unknown): LogContext => {
  if (value instanceof Error) {
    return { error: serializeError(value) };
  }

  if (Array.isArray(value)) {
    return { args: value };
  }

  if (value && typeof value === "object") {
    return value as LogContext;
  }

  if (value === undefined) {
    return {};
  }

  return { value };
};

const writeStructuredLog = (entry: LogEntry): void => {
  fs.mkdirSync(logsDirectory, { recursive: true });
  const line = JSON.stringify(entry);
  fs.appendFileSync(logFilePath, `${line}\n`, "utf8");

  const stream = entry.level === "error" ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
};

const writeLog = (
  level: LogLevel,
  service: ServiceName,
  message: unknown,
  context?: unknown
): void => {
  writeStructuredLog({
    level,
    service,
    message: normalizeMessage(message),
    timestamp: new Date().toISOString(),
    context: normalizeContext(context)
  });
};

export const createLogger = (service: ServiceName) => ({
  info(message: unknown, context?: unknown): void {
    writeLog("info", service, message, context);
  },
  warn(message: unknown, context?: unknown): void {
    writeLog("warn", service, message, context);
  },
  error(message: unknown, context?: unknown): void {
    writeLog("error", service, message, context);
  }
});

const defaultLogger = createLogger("api");

const parseConsoleArgs = (args: unknown[]): { message: unknown; context?: LogContext } => {
  if (args.length === 0) {
    return { message: "console call" };
  }

  if (args.length === 1) {
    return {
      message: args[0],
      context: args[0] instanceof Error ? { error: serializeError(args[0]) } : undefined
    };
  }

  const [message, ...rest] = args;
  const mergedContext = rest.reduce<LogContext>((accumulator, value, index) => {
    const normalized = normalizeContext(value);

    if ("value" in normalized || "args" in normalized || "error" in normalized) {
      accumulator[`arg${index + 1}`] = normalized;
      return accumulator;
    }

    return { ...accumulator, ...normalized };
  }, {});

  return { message, context: mergedContext };
};

export const installConsoleLogger = (): void => {
  console.log = (...args: unknown[]) => {
    const { message, context } = parseConsoleArgs(args);
    defaultLogger.info(message, context);
  };

  console.warn = (...args: unknown[]) => {
    const { message, context } = parseConsoleArgs(args);
    defaultLogger.warn(message, context);
  };

  console.error = (...args: unknown[]) => {
    const { message, context } = parseConsoleArgs(args);
    defaultLogger.error(message, context);
  };
};

export const requestLoggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();

  res.on("finish", () => {
    defaultLogger.info("HTTP request completed", {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip,
      userId: req.auth?.userId ?? null
    });
  });

  next();
};

export const logger = defaultLogger;
