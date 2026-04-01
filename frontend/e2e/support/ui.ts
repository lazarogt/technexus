import { expect, type Page } from "@playwright/test";

export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForFunction(() => window.localStorage.getItem("technexus:session") !== null);
  await page.waitForURL((url) => !url.pathname.endsWith("/login"));
}

export async function logoutViaUi(page: Page) {
  await page.getByRole("button", { name: "Salir" }).click();
}

export async function addProductToCartFromCatalog(page: Page, productName: string, quantity = 1) {
  await page.goto(`/products?search=${encodeURIComponent(productName)}`);
  const productCard = page.locator(".product-card", { has: page.getByText(productName, { exact: true }) }).first();
  await expect(productCard).toBeVisible({ timeout: 15000 });
  await productCard.getByText(productName, { exact: true }).click();
  const currentCartCount = Number.parseInt((await page.getByTestId("cart-count").textContent()) ?? "0", 10);

  if (quantity > 1) {
    await page.getByTestId("buybox-quantity").fill(String(quantity));
  }

  await page.getByTestId("buybox-add-to-cart").click();
  await expect(page.getByTestId("cart-count")).toHaveText(String(currentCartCount + 1));
}
