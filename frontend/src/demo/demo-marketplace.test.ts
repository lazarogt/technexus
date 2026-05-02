import { describe, expect, it } from "vitest";
import { DEMO_ORDERS, DEMO_PRODUCTS, DEMO_SELLERS } from "@/demo/demo-marketplace";

describe("demo marketplace seed", () => {
  it("contains consistent relational demo data", () => {
    expect(DEMO_PRODUCTS.length).toBeGreaterThanOrEqual(3);
    expect(DEMO_SELLERS.length).toBeGreaterThanOrEqual(2);
    expect(DEMO_ORDERS.length).toBeGreaterThanOrEqual(1);

    const sellerIds = new Set(DEMO_SELLERS.map((seller) => seller.id));
    for (const product of DEMO_PRODUCTS) {
      expect(sellerIds.has(product.sellerId)).toBe(true);
    }

    const productIds = new Set(DEMO_PRODUCTS.map((product) => product.id));
    for (const order of DEMO_ORDERS) {
      for (const item of order.items) {
        expect(productIds.has(item.productId)).toBe(true);
      }
    }
  });
});
