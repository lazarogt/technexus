import path from "node:path";
import { expect, test } from "@playwright/test";
import { createUniqueProductName, TEST_CATEGORIES, TEST_IMAGE_URLS, TEST_USERS } from "./support/test-data";
import { loginViaUi } from "./support/ui";

test.describe("Seller Flow", () => {
  // Seller creates a real product using both file upload and URL images, then verifies storefront visibility.
  test("seller creates a product with image upload and image URL", async ({ page }) => {
    const uniqueProductName = createUniqueProductName();
    const uploadFile = path.resolve(process.cwd(), "e2e/fixtures/product-upload.png");

    await loginViaUi(page, TEST_USERS.sellerOne.email, TEST_USERS.sellerOne.password);
    await page.goto("/seller/products");

    await page.getByLabel("Nombre").fill(uniqueProductName);
    await page.getByLabel("Descripción").fill("Playwright generated seller product with live backend persistence.");
    await page.getByLabel("Precio").fill("129");
    await page.getByLabel("Stock").fill("9");
    await page.getByLabel("Categoría").selectOption({ label: TEST_CATEGORIES.devices });
    await page.getByTestId("product-image-urls").fill(TEST_IMAGE_URLS.laptop);
    await page.getByTestId("product-image-upload").setInputFiles(uploadFile);
    await page.getByTestId("product-save-button").click();

    await expect(page.getByRole("cell", { name: new RegExp(uniqueProductName) })).toBeVisible();

    await page.goto(`/products?search=${encodeURIComponent(uniqueProductName)}`);
    await expect(page.locator(".product-card", { has: page.getByText(uniqueProductName, { exact: true }) }).first()).toBeVisible();
  });
});
