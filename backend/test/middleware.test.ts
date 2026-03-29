import assert from "node:assert/strict";
import test from "node:test";
import { authorizeRoles } from "../src/middleware";

test("admin-only middleware blocks non-admin access", () => {
  const middleware = authorizeRoles("admin");
  let nextCalled = false;
  const req = {
    auth: {
      userId: "user-1",
      role: "seller"
    }
  } as const;
  const res = {
    statusCode: 200,
    payload: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
      return this;
    }
  };

  middleware(req as never, res as never, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("admin-only middleware allows admins through", () => {
  const middleware = authorizeRoles("admin");
  let nextCalled = false;
  const req = {
    auth: {
      userId: "user-1",
      role: "admin"
    }
  } as const;
  const res = {
    status() {
      return this;
    },
    json() {
      return this;
    }
  };

  middleware(req as never, res as never, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});
