import { expect, test } from "@playwright/test";
import { API_URL } from "./support/test-data";
import { readLocalSession, trackFrontendErrors } from "./support/api";
import { mockDemoCatalog } from "./support/demo-mocks";

const DEMO_START_TOUR = /Iniciar tour demo|Start Demo Tour/;
const ADMIN_LABEL = /Administrador|Admin/;
const SELLER_LABEL = /Vendedor|Seller/;
const CUSTOMER_LABEL = /Cliente|Comprador|Customer/;
const ACCOUNT_TITLE = /Mi cuenta|My account/;
const SELLER_TITLE = /Centro de vendedores|Seller center/;
const ADMIN_TITLE = /Centro de administracion|Centro de administración|Admin center/;
const FALLBACK_IMAGE_FRAGMENT = "photo-1516321318423-f06f85e504b3";

test.describe("Demo Mode Validation", () => {
  test.skip(process.env.E2E_DEMO_MODE !== "true", "Demo validation runs only when E2E_DEMO_MODE=true.");

  test("loads publicly, measures first paint budget, switches demo roles, and blocks destructive actions", async ({
    page,
    request
  }) => {
    const frontendErrors = await trackFrontendErrors(page);

    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem("technexus:demoTourSeen", "true");
    });
    await mockDemoCatalog(page);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Encuentra tu próximo dispositivo|Find your next device/i })).toBeVisible();

    const sessionBeforeCart = await readLocalSession(page);
    expect(sessionBeforeCart).toBeNull();

    const navigationTiming = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      return navigation
        ? {
            domContentLoadedMs: navigation.domContentLoadedEventEnd,
            loadMs: navigation.loadEventEnd
          }
        : null;
    });

    expect(navigationTiming).not.toBeNull();
    expect(navigationTiming?.domContentLoadedMs ?? Number.POSITIVE_INFINITY).toBeLessThan(3_000);

    await page.getByRole("button", { name: ADMIN_LABEL }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: ADMIN_TITLE })).toBeVisible();

    await page.getByRole("button", { name: SELLER_LABEL }).click();
    await expect(page).toHaveURL(/\/seller$/);
    await expect(page.getByRole("heading", { name: SELLER_TITLE })).toBeVisible();

    await page.getByRole("button", { name: CUSTOMER_LABEL }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole("heading", { name: ACCOUNT_TITLE })).toBeVisible();

    const demoSessionResponse = await request.post(`${API_URL}/auth/demo-session`, {
      data: { role: "admin" }
    });
    expect(demoSessionResponse.ok()).toBeTruthy();

    const demoSession = (await demoSessionResponse.json()) as { token: string };
    const usersResponse = await request.get(`${API_URL}/users?limit=5`, {
      headers: { Authorization: `Bearer ${demoSession.token}` }
    });
    expect(usersResponse.ok()).toBeTruthy();
    const usersPayload = (await usersResponse.json()) as {
      users: Array<{ id: string; role: "admin" | "seller" | "customer" }>;
    };
    const targetUser = usersPayload.users.find((user) => user.role !== "admin");
    expect(targetUser).toBeTruthy();

    const productsResponse = await request.get(`${API_URL}/products?limit=1`);
    expect(productsResponse.ok()).toBeTruthy();
    const productsPayload = (await productsResponse.json()) as {
      products: Array<{ id: string }>;
    };
    expect(productsPayload.products.length).toBeGreaterThan(0);

    const deleteUserResponse = await request.delete(`${API_URL}/users/${targetUser!.id}`, {
      headers: { Authorization: `Bearer ${demoSession.token}` }
    });
    expect(deleteUserResponse.status()).toBe(403);
    await expect(deleteUserResponse.json()).resolves.toEqual({ message: "Demo action disabled" });

    const deleteProductResponse = await request.delete(`${API_URL}/products/${productsPayload.products[0].id}`, {
      headers: { Authorization: `Bearer ${demoSession.token}` }
    });
    expect(deleteProductResponse.status()).toBe(403);
    await expect(deleteProductResponse.json()).resolves.toEqual({ message: "Demo action disabled" });

    await frontendErrors.assertClean();
  });

  test("keeps demo fail-safes stable across API failures, image fallback, and mobile tour layout", async ({ page }) => {
    const frontendErrors = await trackFrontendErrors(page, {
      ignoreConsolePatterns: [/Failed to load resource: the server responded with a status of 500/]
    });

    await page.route("**/api/products**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Simulated catalog failure" })
      });
    });

    await page.goto("/products?search=force-demo-failure");
    await expect(page.locator(".empty-state")).toBeVisible();

    await page.unroute("**/api/products**");
    await mockDemoCatalog(page);

    await page.goto("/");
    const firstCardImage = page.locator(".product-card img").first();
    await expect(firstCardImage).toBeVisible();

    const fallbackSrc = await firstCardImage.evaluate((image) => {
      image.setAttribute("src", "https://invalid.technexus.local/broken-demo-image.png");
      image.dispatchEvent(new Event("error"));
      return image.getAttribute("src");
    });
    expect(fallbackSrc).toContain(FALLBACK_IMAGE_FRAGMENT);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
    await page.goto("/");
    await page.waitForSelector('[data-tour="navbar"]', { timeout: 5000 });

    const tooltip = page.locator(".react-joyride__tooltip");
    await expect(tooltip).toBeVisible();

    const viewport = page.viewportSize();
    const tooltipBox = await tooltip.boundingBox();
    expect(viewport).not.toBeNull();
    expect(tooltipBox).not.toBeNull();
    expect((tooltipBox?.x ?? 0) + (tooltipBox?.width ?? 0)).toBeLessThanOrEqual((viewport?.width ?? 0) - 4);
    expect((tooltipBox?.y ?? 0) + (tooltipBox?.height ?? 0)).toBeLessThanOrEqual((viewport?.height ?? 0) - 4);

    await page.getByRole("button", { name: /Cerrar|Close/ }).click();
    await expect(page.getByRole("button", { name: DEMO_START_TOUR })).toBeVisible();

    await frontendErrors.assertClean();
  });
});
