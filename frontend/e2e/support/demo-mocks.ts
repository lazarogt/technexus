import type { Page, Route } from "@playwright/test";

const MOCK_CATEGORIES = [
  { id: "cat-laptops", name: "Laptops" },
  { id: "cat-accessories", name: "Accessories" }
];

const MOCK_PRODUCTS = [
  {
    id: "demo-product-1",
    name: "Demo Seller Laptop",
    description: "Portable workstation prepared for deterministic demo tests.",
    price: 1399,
    stock: 9,
    categoryId: "cat-laptops",
    categoryName: "Laptops",
    sellerId: "seller-demo-1",
    sellerName: "Seller One",
    averageRating: 4.8,
    reviewCount: 22,
    images: ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80"]
  },
  {
    id: "demo-product-2",
    name: "Demo Wireless Mouse",
    description: "Accessory used for deterministic filtering and spotlight checks.",
    price: 59,
    stock: 14,
    categoryId: "cat-accessories",
    categoryName: "Accessories",
    sellerId: "seller-demo-2",
    sellerName: "Seller Two",
    averageRating: 4.6,
    reviewCount: 11,
    images: ["https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=1200&q=80"]
  }
] as const;

const toProductListPayload = (products = MOCK_PRODUCTS) => ({
  products,
  pagination: {
    page: 1,
    pageSize: products.length,
    total: products.length,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false
  }
});

function filterProducts(route: Route) {
  const url = new URL(route.request().url());
  const search = (url.searchParams.get("search") ?? "").trim().toLocaleLowerCase();

  if (!search) {
    return [...MOCK_PRODUCTS];
  }

  return MOCK_PRODUCTS.filter((product) => product.name.toLocaleLowerCase().includes(search));
}

export async function mockDemoCatalog(page: Page) {
  await page.route("**/api/categories**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        categories: MOCK_CATEGORIES,
        pagination: { total: MOCK_CATEGORIES.length }
      })
    });
  });

  await page.route("**/api/products", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(toProductListPayload(filterProducts(route)))
    });
  });

  await page.route("**/api/products?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(toProductListPayload(filterProducts(route)))
    });
  });

  await page.route("**/api/products/*", async (route) => {
    const url = new URL(route.request().url());
    const productId = url.pathname.split("/").pop();
    const product = MOCK_PRODUCTS.find((entry) => entry.id === productId) ?? MOCK_PRODUCTS[0];

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ product })
    });
  });
}
