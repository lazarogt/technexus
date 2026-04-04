import { expect, test } from "@playwright/test";
import { TEST_CATEGORIES, TEST_PRODUCTS } from "./support/test-data";
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

  // Covers the CRO-focused desktop experience without changing the live cart and product flows.
  test("keeps desktop CRO cues visible on product cards, mini-cart, and buy box", async ({ page }) => {
    await page.goto(`/products?search=${encodeURIComponent(TEST_PRODUCTS.storefront)}`);

    const productCard = page.locator(".product-card", { has: page.getByText(TEST_PRODUCTS.storefront, { exact: true }) }).first();
    await expect(productCard).toBeVisible({ timeout: 15000 });
    await expect(productCard.getByText("Pago contra entrega", { exact: true })).toBeVisible();
    await expect(productCard.locator(".product-stock-pill")).toContainText(/En stock|Pocas unidades|Sin stock/);

    const initialTransform = await productCard.evaluate((element) => window.getComputedStyle(element).transform);
    await productCard.hover();
    await expect
      .poll(async () => productCard.evaluate((element) => window.getComputedStyle(element).transform))
      .not.toBe(initialTransform);

    await productCard.getByText(TEST_PRODUCTS.storefront, { exact: true }).click();
    await expect(page.getByTestId("buybox")).toBeVisible();
    await expect(page.getByTestId("product-stock-highlight")).toContainText(/En stock|Pocas unidades|Sin stock/);
    await expect(page.getByTestId("buybox")).toContainText("Compra segura");
    await expect(page.getByTestId("buybox")).toContainText("Pago contra entrega");

    await page.getByTestId("buybox-add-to-cart").click();
    const miniCartPanel = page.getByTestId("mini-cart-panel");
    await expect
      .poll(async () => {
        if (await miniCartPanel.isVisible()) {
          return "visible";
        }

        return (await page.getByTestId("cart-trigger").getAttribute("aria-expanded")) ?? "false";
      })
      .toMatch(/visible|true/);
    if (!(await miniCartPanel.isVisible())) {
      await page.getByTestId("cart-trigger").click();
    }
    await expect(miniCartPanel).toBeVisible();
    await expect(miniCartPanel).toContainText("Checkout rapido");
    await expect(miniCartPanel).toContainText(/pago contra entrega/i);
  });

  test("filters storefront categories by category ID and clears back to all products", async ({ page }) => {
    await page.goto("/products");

    await expect(page.getByRole("button", { name: TEST_CATEGORIES.devices })).toBeVisible();
    await expect(page.getByRole("button", { name: TEST_CATEGORIES.accessories })).toBeVisible();

    await page.getByRole("button", { name: TEST_CATEGORIES.accessories }).click();
    await expect.poll(() => new URL(page.url()).searchParams.has("categoryId")).toBe(true);
    await expect(page.getByText(TEST_PRODUCTS.lowStock, { exact: true })).toBeVisible();
    await expect(page.getByText(TEST_PRODUCTS.multiSellerTwo, { exact: true })).toBeVisible();
    await expect(page.getByText(TEST_PRODUCTS.storefront, { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: TEST_CATEGORIES.devices }).click();
    await expect(page.getByText(TEST_PRODUCTS.storefront, { exact: true })).toBeVisible();
    await expect(page.getByText(TEST_PRODUCTS.multiSellerOne, { exact: true })).toBeVisible();
    await expect(page.getByText(TEST_PRODUCTS.lowStock, { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Todas" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("categoryId")).toBeNull();
    await expect(page.getByText(TEST_PRODUCTS.storefront, { exact: true })).toBeVisible();
    await expect(page.getByText(TEST_PRODUCTS.lowStock, { exact: true })).toBeVisible();
  });

  // Verifies the mobile sticky CTA and mini-cart sheet on the nginx-served storefront.
  test("keeps the mobile CTA and mini-cart sheet usable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto(`/products?search=${encodeURIComponent(TEST_PRODUCTS.storefront)}`);
    const productCard = page.locator(".product-card", { has: page.getByText(TEST_PRODUCTS.storefront, { exact: true }) }).first();
    await expect(productCard).toBeVisible({ timeout: 15000 });
    await productCard.getByText(TEST_PRODUCTS.storefront, { exact: true }).click();

    await expect(page.getByTestId("mobile-buybar")).toBeVisible();
    await expect(page.getByTestId("mobile-buybar")).toContainText("Agregar al carrito");
    const currentCartCount = Number.parseInt((await page.getByTestId("cart-count").textContent()) ?? "0", 10);
    await page.getByTestId("mobile-buybar").getByRole("button", { name: "Agregar al carrito" }).click();
    await expect(page.getByTestId("cart-count")).toHaveText(String(currentCartCount + 1));

    const miniCartSheet = page.getByTestId("mini-cart-sheet");
    if (!(await miniCartSheet.isVisible())) {
      await page.getByTestId("cart-trigger").click();
    }
    await expect(miniCartSheet).toBeVisible();
    await expect(miniCartSheet).toContainText("Checkout rapido");
  });
});
