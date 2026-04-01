import { expect, test } from "@playwright/test";
import { getJson, loginApi } from "./support/api";
import { TEST_PRODUCTS, TEST_USERS } from "./support/test-data";
import { addProductToCartFromCatalog, loginViaUi } from "./support/ui";

const analyticsProvider = process.env.E2E_ANALYTICS_PROVIDER ?? "internal";

test.describe("Analytics Flow", () => {
  // Generates real storefront traffic, then confirms the admin dashboard exposes internal metrics.
  test("renders local analytics metrics after storefront activity", async ({ page, request }) => {
    test.skip(analyticsProvider !== "internal", "This assertion only applies to internal analytics mode.");
    test.setTimeout(90_000);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Todo tu stack comercial/i })).toBeVisible();
    await addProductToCartFromCatalog(page, TEST_PRODUCTS.storefront);
    await page.goto("/cart");
    await expect(page.getByTestId("cart-total")).toBeVisible();
    await page.goto("/checkout");
    await expect(page.getByTestId("checkout-steps")).toBeVisible();
    await expect(page.getByTestId("checkout-step-1")).toContainText("Envio");

    const admin = await loginApi(request, TEST_USERS.admin.email, TEST_USERS.admin.password);

    await expect
      .poll(async () => {
        const overview = await getJson<{
          provider: string;
          funnel: { viewHome: number; viewProduct: number; addToCart: number; viewCart: number };
        }>(request, "/admin/analytics/overview?range=24h", admin.token);

        return overview.provider === "internal" &&
          overview.funnel.viewHome > 0 &&
          overview.funnel.viewProduct > 0 &&
          overview.funnel.addToCart > 0 &&
          overview.funnel.viewCart > 0;
      }, { timeout: 60000 })
      .toBe(true);

    const overview = await getJson<{
      funnel: { viewHome: number; viewProduct: number; addToCart: number; viewCart: number };
    }>(request, "/admin/analytics/overview?range=24h", admin.token);
    expect(overview.funnel.viewHome).toBeGreaterThan(0);
    expect(overview.funnel.viewProduct).toBeGreaterThan(0);
    expect(overview.funnel.addToCart).toBeGreaterThan(0);
    expect(overview.funnel.viewCart).toBeGreaterThan(0);

    await loginViaUi(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/admin/analytics");
    await expect(page.getByTestId("admin-analytics-page")).toBeVisible();
    await expect(page.getByTestId("analytics-metrics")).toBeVisible();
    await expect(page.getByText("Sesiones", { exact: true })).toBeVisible();
    await expect(page.getByText("Add to cart")).toBeVisible();
  });

  // Confirms the posthog build/runtime stays healthy while the local dashboard shows the expected informational state.
  test("shows the informational dashboard state in posthog mode", async ({ page }) => {
    test.skip(analyticsProvider !== "posthog", "This smoke check only applies to posthog mode.");

    await loginViaUi(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/admin/analytics");
    await expect(page.getByTestId("admin-analytics-page")).toBeVisible();
    await expect(page.getByTestId("analytics-provider-info")).toContainText("posthog");
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Todo tu stack comercial/i })).toBeVisible();
  });
});
