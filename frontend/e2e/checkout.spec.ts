import { expect, test, type Page } from "@playwright/test";
import { getJson, loginApi, readLocalSession, trackFrontendErrors } from "./support/api";
import { TEST_USERS } from "./support/test-data";

async function addFirstAvailableProductToCart(page: Page) {
  await page.goto("/products");

  const productCard = page.locator('[data-testid="product-card"]').first();
  await expect(productCard).toBeVisible({ timeout: 15000 });
  await productCard.click();

  const addToCart = page.locator('[data-testid="add-to-cart"]').first();
  const addToCartFallback = page.locator("text=/Agregar al carrito|Add to cart/i").first();
  const currentCartCount = Number.parseInt((await page.getByTestId("cart-count").textContent()) ?? "0", 10);

  if (await addToCart.isVisible({ timeout: 5000 }).catch(() => false)) {
    await addToCart.click();
  } else {
    await addToCartFallback.click();
  }

  await expect
    .poll(async () => Number.parseInt((await page.getByTestId("cart-count").textContent()) ?? "0", 10))
    .toBeGreaterThan(currentCartCount);
}

test.describe("Checkout Flow", () => {
  // Multi-seller guest checkout with real order creation and outbox verification.
  test("checks out as guest, creates an order, and writes email outbox rows", async ({ page, request }) => {
    const frontendErrors = await trackFrontendErrors(page);

    await page.addInitScript(() => {
      window.localStorage.setItem("technexus:demoTourSeen", "true");
    });

    await addFirstAvailableProductToCart(page);

    await page.goto("/cart");
    await page.getByTestId("checkout-button").click();

    await page.getByLabel("Nombre").fill("Guest Checkout");
    await page.getByLabel("Correo").fill("guest-checkout@example.com");
    await page.getByLabel("Teléfono").fill("5551234567");
    await page.getByLabel("Dirección de entrega").fill("742 Evergreen Terrace");
    await page.getByRole("button", { name: /Continuar a la revisión|Continue to review/i }).click();
    await page.getByRole("button", { name: /Ir a la confirmación|Go to confirmation/i }).click();
    await page.getByRole("button", { name: /Confirmar pedido|Confirm order/i }).click();

    await expect(page.getByTestId("checkout-success")).toContainText("Pedido confirmado");

    const guestSession = await readLocalSession(page);
    expect(guestSession?.kind).toBe("guest");

    const guestOrders = await getJson<{
      orders: Array<{ id: string; items: Array<{ productName: string; sellerId: string }> }>;
    }>(
      request,
      "/orders",
      guestSession?.token
    );

    const currentOrder = guestOrders.orders[0];
    expect(currentOrder.items.length).toBeGreaterThan(0);
    expect(currentOrder.items.every((item) => item.productName.trim().length > 0)).toBeTruthy();

    const admin = await loginApi(request, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const outbox = await getJson<{ rows: Array<{ orderId: string; recipientType: "buyer" | "seller" }> }>(
      request,
      "/orders/admin/outbox",
      admin.token
    );

    const expectedSellerNotifications = new Set(currentOrder.items.map((item) => item.sellerId)).size;
    const currentOrderRows = outbox.rows.filter((row) => row.orderId === currentOrder.id);
    expect(currentOrderRows).toHaveLength(1 + expectedSellerNotifications);
    expect(currentOrderRows.filter((row) => row.recipientType === "buyer")).toHaveLength(1);
    expect(currentOrderRows.filter((row) => row.recipientType === "seller")).toHaveLength(expectedSellerNotifications);

    await frontendErrors.assertClean();
  });
});
