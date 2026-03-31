import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { API_URL } from "./test-data";

type LoginResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "seller" | "customer";
  };
};

type SessionPayload = {
  kind: "user" | "guest";
  token: string;
  guestSessionId?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "seller" | "customer";
  };
};

export async function loginApi(
  request: APIRequestContext,
  email: string,
  password: string
) {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: { email, password }
  });

  expect(response.ok()).toBeTruthy();
  return (await response.json()) as LoginResponse;
}

export async function getJson<T>(
  request: APIRequestContext,
  path: string,
  token?: string
) {
  const response = await request.get(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });

  expect(response.ok()).toBeTruthy();
  return (await response.json()) as T;
}

export async function readLocalSession(page: Page) {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem("technexus:session");

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as SessionPayload;
  });
}

export async function trackFrontendErrors(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  return {
    async assertClean() {
      expect(pageErrors, "page errors").toEqual([]);
      expect(consoleErrors, "console errors").toEqual([]);
    }
  };
}
