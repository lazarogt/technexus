import { describe, expect, it } from "vitest";
import type { Category, Product } from "@/features/api/types";
import {
  buildBadgeMap,
  getCustomersAlsoBought,
  getRelatedProducts,
  orderCategories
} from "@/components/store/storefront-data";

function createProduct(overrides: Partial<Product>): Product {
  return {
    id: overrides.id ?? "product-1",
    name: overrides.name ?? "Dell XPS 13",
    description: overrides.description ?? "Compact performance laptop",
    price: overrides.price ?? 1299,
    stock: overrides.stock ?? 24,
    categoryId: overrides.categoryId ?? "cat-laptops",
    categoryName: overrides.categoryName ?? "Laptops",
    sellerId: overrides.sellerId ?? "seller-1",
    sellerName: overrides.sellerName ?? "TechZone",
    averageRating: overrides.averageRating ?? 4.7,
    reviewCount: overrides.reviewCount ?? 32,
    images: overrides.images ?? ["/uploads/xps.jpg"],
    reviews: overrides.reviews
  };
}

describe("storefront-data helpers", () => {
  it("orders categories with the primary storefront sequence first", () => {
    const categories: Category[] = [
      { id: "4", name: "Accessories" },
      { id: "2", name: "Monitors" },
      { id: "5", name: "Networking" },
      { id: "1", name: "Laptops" },
      { id: "3", name: "Gaming" }
    ];

    expect(orderCategories(categories).map((category) => category.name)).toEqual([
      "Laptops",
      "Monitors",
      "Accessories",
      "Gaming",
      "Networking"
    ]);
  });

  it("builds badge sets for best sellers, trending products and limited stock", () => {
    const products = [
      createProduct({ id: "best", reviewCount: 100, averageRating: 4.9, stock: 20 }),
      createProduct({ id: "trend", reviewCount: 42, averageRating: 4.8, stock: 18, sellerId: "seller-2" }),
      createProduct({ id: "steady", reviewCount: 18, averageRating: 4.4, stock: 26, sellerId: "seller-4" }),
      createProduct({ id: "solid", reviewCount: 14, averageRating: 4.3, stock: 14, sellerId: "seller-6" }),
      createProduct({ id: "alt", reviewCount: 11, averageRating: 4.2, stock: 12, sellerId: "seller-7" }),
      createProduct({ id: "low", reviewCount: 1, averageRating: 3.9, stock: 4, sellerId: "seller-5" })
    ];

    const badgeMap = buildBadgeMap(products);

    expect(badgeMap.get("best")).toContain("bestSeller");
    expect(badgeMap.get("trend")).toContain("trending");
    expect(badgeMap.get("low")).toContain("limitedStock");
  });

  it("keeps related and also-bought recommendations away from the current product", () => {
    const current = createProduct({ id: "current", price: 1000, categoryId: "cat-1", sellerId: "seller-1" });
    const pool = [
      createProduct({ id: "same-category", price: 980, categoryId: "cat-1", sellerId: "seller-2" }),
      createProduct({ id: "same-seller", price: 1020, categoryId: "cat-2", sellerId: "seller-1" }),
      createProduct({ id: "cross-sell", price: 1100, categoryId: "cat-3", sellerId: "seller-3" })
    ];

    const related = getRelatedProducts(current, [current, ...pool], 2);
    const alsoBought = getCustomersAlsoBought(current, [current, ...pool], 2);

    expect(related.map((product) => product.id)).not.toContain("current");
    expect(alsoBought.map((product) => product.id)).not.toContain("current");
  });
});
