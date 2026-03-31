import { expect, test } from "@playwright/test";
import { TEST_USERS } from "./support/test-data";
import { loginViaUi, logoutViaUi } from "./support/ui";

test.describe("Auth Flow", () => {
  // Real role-based login coverage against the live backend.
  test("logs in as admin and lands on admin dashboard", async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin.email, TEST_USERS.admin.password);

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Admin control center" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Operaciones/ })).toBeVisible();
  });

  test("logs in as seller and sees seller workspace", async ({ page }) => {
    await loginViaUi(page, TEST_USERS.sellerOne.email, TEST_USERS.sellerOne.password);

    await expect(page).toHaveURL(/\/seller$/);
    await expect(page.getByRole("heading", { name: "Seller workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Inventario/ })).toBeVisible();
  });

  test("logs in as customer and sees customer account UI", async ({ page }) => {
    await loginViaUi(page, TEST_USERS.customer.email, TEST_USERS.customer.password);

    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole("heading", { name: "Mi cuenta" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Pedidos/ })).toBeVisible();
    await logoutViaUi(page);
    await expect(page).toHaveURL(/\/login$/);
  });
});
