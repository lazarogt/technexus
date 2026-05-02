import { expect, test, type Page } from "@playwright/test";
import { mockDemoCatalog } from "./support/demo-mocks";

async function waitForTourStep(page: Page, matcher: string) {
  await page.waitForSelector(matcher, { timeout: 5000 });
  await expect(page.locator(".react-joyride__tooltip")).toBeVisible();
}

test.describe("Guided Demo Tour", () => {
  test.skip(process.env.E2E_DEMO_MODE !== "true", "Demo tour E2E runs only when E2E_DEMO_MODE=true.");

  test("auto-starts, navigates across demo roles, and can be replayed", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
    await mockDemoCatalog(page);

    await page.goto("/");
    const continueTour = page.getByRole("button", { name: /Continuar|Continue/i });
    const closeTour = page.getByRole("button", { name: /Cerrar|Close/i });

    await waitForTourStep(page, '[data-tour="navbar"]');
    await continueTour.click();

    await waitForTourStep(page, '[data-tour="search-bar"]');
    await continueTour.click();

    await waitForTourStep(page, '[data-testid="product-card"]');
    await page.waitForSelector('[data-tour="add-to-cart"]', { timeout: 5000 });
    await continueTour.click();

    await waitForTourStep(page, '[data-tour="cart-button"]');
    await continueTour.click();

    await page.waitForURL(/\/checkout$/);
    await waitForTourStep(page, "body");
    await continueTour.click();

    await page.waitForURL(/\/seller$/);
    await waitForTourStep(page, '[data-tour="dashboard-overview"]');
    await expect(page).toHaveURL(/\/seller$/);
    await expect(page.getByRole("heading", { name: /Centro de vendedores|Seller center/i })).toBeVisible();

    await continueTour.click();
    await page.waitForURL(/\/admin$/);
    await waitForTourStep(page, '[data-tour="dashboard-overview"]');
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: /Centro de administración|Admin center/i })).toBeVisible();

    await closeTour.first().click();
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem("technexus:demoTourSeen"))).toContain("true");

    await page.getByRole("button", { name: /Iniciar tour demo|Start Demo Tour/ }).click();
    await waitForTourStep(page, '[data-tour="navbar"]');
  });
});
