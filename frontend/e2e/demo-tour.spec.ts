import { expect, test } from "@playwright/test";
import { mockDemoCatalog } from "./support/demo-mocks";

test.describe("Guided Demo Tour", () => {
  test.skip(process.env.E2E_DEMO_MODE !== "true", "Demo tour E2E runs only when E2E_DEMO_MODE=true.");

  test("auto-starts, navigates across demo roles, and can be replayed", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
    await mockDemoCatalog(page);

    await page.goto("/");
    await expect(page.getByTestId("button-primary")).toBeVisible();

    for (let step = 0; step < 5; step += 1) {
      await page.getByTestId("button-primary").click();
    }

    await expect(page).toHaveURL(/\/seller$/);
    await expect(page.getByRole("heading", { name: /Centro de vendedores|Seller center/i })).toBeVisible();

    await page.getByTestId("button-primary").click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: /Centro de administración|Admin center/i })).toBeVisible();

    await page.getByTestId("button-close").click();
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem("technexus:demoTourSeen"))).toContain("true");

    await page.getByRole("button", { name: /Iniciar tour demo|Start Demo Tour/ }).click();
    await expect(page.getByTestId("button-primary")).toBeVisible();
  });
});
