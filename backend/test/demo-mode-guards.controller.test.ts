import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";

const createResponse = () => {
  const payload: { statusCode?: number; body?: unknown } = {};

  const res = {
    status(code: number) {
      payload.statusCode = code;
      return this;
    },
    json(body: unknown) {
      payload.body = body;
      return this;
    }
  } as unknown as Response;

  return { res, payload };
};

const invokeMiddleware = async (
  middleware: (req: Request, res: Response, next: NextFunction) => void,
  req: Request,
  res: Response
) => {
  await new Promise<void>((resolve, reject) => {
    middleware(req, res, (error?: unknown) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });

    setImmediate(resolve);
  });
};

test("destroyProduct blocks destructive actions in demo mode", async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET ??= "test-jwt-secret";
  process.env.REDIS_ENABLED ??= "false";
  process.env.CORS_ORIGIN ??= "http://localhost:3000";
  process.env.DEMO_MODE = "true";

  const { destroyProduct } = await import("../src/controllers/product.controller");
  const { res, payload } = createResponse();

  await invokeMiddleware(
    destroyProduct,
    {
      params: { id: "11111111-1111-4111-8111-111111111111" },
      actor: { role: "admin", userId: "admin-1" }
    } as unknown as Request,
    res
  );

  assert.equal(payload.statusCode, 403);
  assert.deepEqual(payload.body, { message: "Demo action disabled" });
});

test("destroyUser blocks destructive actions in demo mode", async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET ??= "test-jwt-secret";
  process.env.REDIS_ENABLED ??= "false";
  process.env.CORS_ORIGIN ??= "http://localhost:3000";
  process.env.DEMO_MODE = "true";

  const { destroyUser } = await import("../src/controllers/user.controller");
  const { res, payload } = createResponse();

  await invokeMiddleware(
    destroyUser,
    {
      params: { id: "11111111-1111-4111-8111-111111111111" },
      actor: { userId: "admin-1" }
    } as unknown as Request,
    res
  );

  assert.equal(payload.statusCode, 403);
  assert.deepEqual(payload.body, { message: "Demo action disabled" });
});
