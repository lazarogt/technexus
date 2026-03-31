export const FRONTEND_URL = "http://localhost:5173";
export const API_URL = "http://localhost:4000/api";
export const HEALTH_URL = "http://localhost:4000/health";

export const TEST_USERS = {
  admin: {
    name: "TechNexus Admin",
    email: "admin@example.com",
    password: "Admin1234!"
  },
  sellerOne: {
    name: "E2E Seller One",
    email: "e2e-seller-one@example.com",
    password: "Seller1234!"
  },
  sellerTwo: {
    name: "E2E Seller Two",
    email: "e2e-seller-two@example.com",
    password: "Seller2234!"
  },
  customer: {
    name: "E2E Customer",
    email: "e2e-customer@example.com",
    password: "Customer1234!"
  }
} as const;

export const TEST_CATEGORIES = {
  devices: "E2E Devices",
  accessories: "E2E Accessories"
} as const;

export const TEST_PRODUCTS = {
  storefront: "E2E Office Laptop",
  multiSellerOne: "E2E Multi Seller Laptop",
  multiSellerTwo: "E2E Multi Seller Mouse",
  lowStock: "E2E Low Stock Probe"
} as const;

export const TEST_IMAGE_URLS = {
  laptop:
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80",
  accessory:
    "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=1200&q=80"
} as const;

export function createUniqueProductName(prefix = "E2E Seller Upload Product") {
  return `${prefix} ${Date.now()}`;
}
