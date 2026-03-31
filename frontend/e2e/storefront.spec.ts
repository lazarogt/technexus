import { expect, test } from "@playwright/test";
import { TEST_PRODUCTS } from "./support/test-data";
import { addProductToCartFromCatalog } from "./support/ui";
import { trackFrontendErrors } from "./support/api";

test.describe("Storefront Flow", () => {
  // Covers the public storefront with real catalog data and live cart API calls.
  test("loads home, navigates to product detail, and updates the cart", async ({ page }) => {
    const frontendErrors = await trackFrontendErrors(page);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Todo tu stack comercial/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ofertas" })).toBeVisible();

    await addProductToCartFromCatalog(page, TEST_PRODUCTS.storefront);
    await expect(page.getByRole("heading", { name: TEST_PRODUCTS.storefront })).toBeVisible();
    await expect(page.getByTestId("cart-count")).toHaveText("1");

    await page.goto("/cart");
    await expect(page.locator('[data-testid^="cart-item-"]')).toHaveCount(1);
    await expect(page.getByTestId("cart-total")).toBeVisible();
    await expect(page.getByTestId("checkout-button")).toBeVisible();

    await frontendErrors.assertClean();
  });
});
