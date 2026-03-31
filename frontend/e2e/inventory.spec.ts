import { expect, test } from "@playwright/test";
import { getJson, loginApi } from "./support/api";
import { TEST_PRODUCTS, TEST_USERS } from "./support/test-data";
import { addProductToCartFromCatalog, loginViaUi } from "./support/ui";

test.describe("Inventory Flow", () => {
  // Creates a real order that drops stock below threshold, then verifies inventory and alert state.
  test("reduces stock after checkout and exposes a low-stock alert", async ({ page, request }) => {
    await addProductToCartFromCatalog(page, TEST_PRODUCTS.lowStock, 2);

    await page.goto("/cart");
    await page.getByTestId("checkout-button").click();
    await page.getByLabel("Nombre").fill("Low Stock Guest");
    await page.getByLabel("Correo").fill("low-stock-guest@example.com");
    await page.getByLabel("Teléfono").fill("5559876543");
    await page.getByLabel("Dirección de entrega").fill("123 Test Avenue");
    await page.getByRole("button", { name: "Continuar a revision" }).click();
    await page.getByRole("button", { name: "Ir a confirmacion" }).click();
    await page.getByRole("button", { name: "Confirmar pedido" }).click();

    await expect(page.getByTestId("checkout-success")).toContainText("Pedido confirmado");

    const seller = await loginApi(request, TEST_USERS.sellerOne.email, TEST_USERS.sellerOne.password);
    const sellerProducts = await getJson<{ products: Array<{ id: string; name: string }> }>(
      request,
      "/products/mine",
      seller.token
    );
    const lowStockProduct = sellerProducts.products.find((product) => product.name === TEST_PRODUCTS.lowStock);
    expect(lowStockProduct).toBeTruthy();

    const inventory = await getJson<{ stock: number; inventories: Array<{ quantity: number }> }>(
      request,
      `/inventory/products/${lowStockProduct!.id}`,
      seller.token
    );
    expect(inventory.stock).toBe(4);

    const alerts = await getJson<{ alerts: Array<{ productName: string }> }>(
      request,
      "/inventory/alerts",
      seller.token
    );
    expect(alerts.alerts.map((alert) => alert.productName)).toContain(TEST_PRODUCTS.lowStock);

    await loginViaUi(page, TEST_USERS.sellerOne.email, TEST_USERS.sellerOne.password);
    await page.goto("/seller/inventory");
    await page.getByTestId("inventory-product-select").selectOption({ label: TEST_PRODUCTS.lowStock });
    await expect(page.locator(".data-table tbody tr").first().locator("input").first()).toHaveValue("4");
    await expect(page.locator(".compact-list")).toContainText(TEST_PRODUCTS.lowStock);
  });
});
