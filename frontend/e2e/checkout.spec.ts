import { expect, test } from "@playwright/test";
import { getJson, loginApi, readLocalSession, trackFrontendErrors } from "./support/api";
import { TEST_PRODUCTS, TEST_USERS } from "./support/test-data";
import { addProductToCartFromCatalog } from "./support/ui";

test.describe("Checkout Flow", () => {
  // Multi-seller guest checkout with real order creation and outbox verification.
  test("checks out as guest, creates an order, and writes email outbox rows", async ({ page, request }) => {
    const frontendErrors = await trackFrontendErrors(page);

    await addProductToCartFromCatalog(page, TEST_PRODUCTS.multiSellerOne);
    await addProductToCartFromCatalog(page, TEST_PRODUCTS.multiSellerTwo);

    await page.goto("/cart");
    await page.getByTestId("checkout-button").click();

    await page.getByLabel("Nombre").fill("Guest Checkout");
    await page.getByLabel("Correo").fill("guest-checkout@example.com");
    await page.getByLabel("Teléfono").fill("5551234567");
    await page.getByLabel("Dirección de entrega").fill("742 Evergreen Terrace");
    await page.getByRole("button", { name: "Confirmar pedido" }).click();

    await expect(page.getByTestId("checkout-success")).toContainText("Pedido confirmado");

    const guestSession = await readLocalSession(page);
    expect(guestSession?.kind).toBe("guest");

    const guestOrders = await getJson<{ orders: Array<{ id: string; items: Array<{ productName: string }> }> }>(
      request,
      "/orders",
      guestSession?.token
    );

    expect(guestOrders.orders[0].items.map((item) => item.productName)).toEqual(
      expect.arrayContaining([TEST_PRODUCTS.multiSellerOne, TEST_PRODUCTS.multiSellerTwo])
    );

    const admin = await loginApi(request, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const outbox = await getJson<{ rows: Array<{ orderId: string; recipientType: "buyer" | "seller" }> }>(
      request,
      "/orders/admin/outbox",
      admin.token
    );

    const currentOrderRows = outbox.rows.filter((row) => row.orderId === guestOrders.orders[0].id);
    expect(currentOrderRows).toHaveLength(3);
    expect(currentOrderRows.filter((row) => row.recipientType === "buyer")).toHaveLength(1);
    expect(currentOrderRows.filter((row) => row.recipientType === "seller")).toHaveLength(2);

    await frontendErrors.assertClean();
  });
});
