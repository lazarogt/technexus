import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import bcrypt from "bcryptjs";
import request from "supertest";
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from "vitest";

const {
  sentEmails
} = vi.hoisted(() => ({
  sentEmails: [] as Array<{
    to: string;
    subject: string;
    html: string;
    text: string;
  }>
}));

vi.mock("../src/services/email.service", async () => {
  return {
    initializeEmailService: vi.fn().mockResolvedValue(true),
    sendEmail: vi.fn(async (input: { to: string; subject: string; html: string; text: string }) => {
      sentEmails.push(input);
      return { status: "sent" as const };
    })
  };
});

type AppModule = typeof import("../src/app");
type PrismaModule = typeof import("../src/services/prisma.service");
type CacheModule = typeof import("../src/services/cache.service");
type OutboxModule = typeof import("../src/services/outbox.service");
type ConfigModule = typeof import("../src/utils/config");
type LoggedEmail = (typeof sentEmails)[number];

let appModule: AppModule;
let prismaModule: PrismaModule;
let cacheModule: CacheModule;
let outboxModule: OutboxModule;
let configModule: ConfigModule;
let api: ReturnType<typeof request>;
let sampleImagePath: string;
let tempDir: string;

const pngFixtureBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn0jUsAAAAASUVORK5CYII=";

const runBackendCommand = (...args: string[]) => {
  execFileSync("node", args, {
    cwd: path.resolve(process.cwd()),
    env: {
      ...process.env,
      NODE_ENV: "test",
      REDIS_ENABLED: "false",
      TEST_POSTGRES_DB: process.env.TEST_POSTGRES_DB ?? "technexus_test"
    },
    stdio: "inherit"
  });
};

const runResetAndSeedCommand = () => {
  runBackendCommand("scripts/resetAndSeed.js");
};

const runDemoCommand = () => {
  runBackendCommand("scripts/demoSeed/index.js");
};

const authHeader = (token: string) => ({
  Authorization: `Bearer ${token}`
});

const waitFor = async <T>(callback: () => Promise<T>, timeoutMs = 2_000) => {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      return await callback();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  throw lastError ?? new Error("Condition was not met before timeout.");
};

const resetUploads = async () => {
  await fs.mkdir(configModule.env.uploadsDir, { recursive: true });

  const entries = await fs.readdir(configModule.env.uploadsDir, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      if (entry.name.startsWith("seed-marketplace-")) {
        return;
      }

      await fs.rm(path.join(configModule.env.uploadsDir, entry.name), {
        recursive: true,
        force: true
      });
    })
  );
};

const resetDatabase = async () => {
  await prismaModule.prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "AnalyticsEvent",
      "EmailOutbox",
      "OrderItem",
      "Order",
      "CartItem",
      "Review",
      "Cart",
      "LowStockAlert",
      "Inventory",
      "ProductImage",
      "Product",
      "Location",
      "Category",
      "GuestSession",
      "User"
    RESTART IDENTITY CASCADE
  `);

  const passwordHash = await bcrypt.hash(
    configModule.env.TECHNEXUS_ADMIN_PASSWORD,
    configModule.env.PASSWORD_SALT_ROUNDS
  );

  await prismaModule.prisma.user.create({
    data: {
      name: "TechNexus Admin",
      email: configModule.env.TECHNEXUS_ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      role: "admin",
      isBlocked: false
    }
  });

  await cacheModule.cacheService.clear();
  sentEmails.length = 0;
  await resetUploads();
};

const registerUser = async (input: {
  name: string;
  email: string;
  password: string;
  role: "seller" | "customer";
}) => {
  const response = await api.post("/api/auth/register").send(input);
  expect(response.status).toBe(201);
  return response.body as {
    token: string;
    user: { id: string; email: string; role: string };
  };
};

const loginUser = async (input: { email: string; password: string }, basePath = "/api/auth/login") => {
  const response = await api.post(basePath).send(input);
  expect(response.status).toBe(200);
  return response.body as {
    token: string;
    user: { id: string; email: string; role: string };
  };
};

const createAdminCategory = async (token: string, name = "Components") => {
  const response = await api
    .post("/api/categories")
    .set(authHeader(token))
    .send({ name });

  expect(response.status).toBe(201);
  return response.body.category as { id: string; name: string };
};

const createProductWithUpload = async (input: {
  token: string;
  name: string;
  description: string;
  price: string;
  stock: string;
  categoryId: string;
}) => {
  const response = await api
    .post("/api/products")
    .set(authHeader(input.token))
    .field("name", input.name)
    .field("description", input.description)
    .field("price", input.price)
    .field("stock", input.stock)
    .field("categoryId", input.categoryId)
    .attach("images", sampleImagePath);

  expect(response.status).toBe(201);
  return response.body.product as {
    id: string;
    name: string;
    price: number;
    stock: number;
    sellerId: string;
    images: string[];
  };
};

const createProductWithUrl = async (input: {
  token: string;
  name: string;
  description: string;
  price: string;
  stock: string;
  categoryId: string;
  imageUrl: string;
}) => {
  const response = await api
    .post("/api/products")
    .set(authHeader(input.token))
    .field("name", input.name)
    .field("description", input.description)
    .field("price", input.price)
    .field("stock", input.stock)
    .field("categoryId", input.categoryId)
    .field("imageUrls", JSON.stringify([input.imageUrl]));

  expect(response.status).toBe(201);
  return response.body.product as {
    id: string;
    name: string;
    price: number;
    stock: number;
    sellerId: string;
    images: string[];
  };
};

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.REDIS_ENABLED = "false";
  process.env.TEST_POSTGRES_DB ??= "technexus_test";

  runBackendCommand("scripts/prepareTestDatabase.cjs");
  runBackendCommand("node_modules/tsx/dist/cli.mjs", "prisma/seed.ts");

  appModule = await import("../src/app");
  prismaModule = await import("../src/services/prisma.service");
  cacheModule = await import("../src/services/cache.service");
  outboxModule = await import("../src/services/outbox.service");
  configModule = await import("../src/utils/config");

  await prismaModule.connectDatabase();
  await cacheModule.cacheService.connect();

  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "technexus-smoke-"));
  sampleImagePath = path.join(tempDir, "sample.png");
  await fs.writeFile(sampleImagePath, Buffer.from(pngFixtureBase64, "base64"));

  api = request(appModule.createApp());
}, 60_000);

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  if (cacheModule?.cacheService) {
    await cacheModule.cacheService.disconnect();
  }
  if (prismaModule?.prisma) {
    await prismaModule.prisma.$disconnect();
  }
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
  if (configModule?.env?.uploadsDir) {
    await resetUploads();
  }
}, 30_000);

describe("TechNexus smoke suite", () => {
  it("verifies authentication, JWT protection and role restrictions", async () => {
    // Admin login uses the seeded account and should yield a working JWT.
    const admin = await loginUser({
      email: configModule.env.TECHNEXUS_ADMIN_EMAIL,
      password: configModule.env.TECHNEXUS_ADMIN_PASSWORD
    });
    const seller = await registerUser({
      name: "Seller One",
      email: "seller.one@example.com",
      password: "Seller1234!",
      role: "seller"
    });
    const customer = await registerUser({
      name: "Customer One",
      email: "customer.one@example.com",
      password: "Customer1234!",
      role: "customer"
    });

    const guestResponse = await api.post("/api/auth/guest").send({});
    expect(guestResponse.status).toBe(201);
    expect(guestResponse.body.token).toEqual(expect.any(String));
    expect(guestResponse.body.guestSessionId).toEqual(expect.any(String));

    const profileResponse = await api
      .get("/api/auth/profile")
      .set(authHeader(customer.token));
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.user.email).toBe("customer.one@example.com");

    const invalidTokenResponse = await api
      .get("/api/auth/profile")
      .set(authHeader("invalid-token"));
    expect(invalidTokenResponse.status).toBe(401);

    const adminUsersResponse = await api
      .get("/api/users")
      .set(authHeader(admin.token));
    expect(adminUsersResponse.status).toBe(200);
    expect(adminUsersResponse.body.users).toHaveLength(3);

    const customerForbiddenResponse = await api
      .get("/api/users")
      .set(authHeader(customer.token));
    expect(customerForbiddenResponse.status).toBe(403);

    const guestForbiddenResponse = await api
      .get("/api/users")
      .set(authHeader(guestResponse.body.token));
    expect(guestForbiddenResponse.status).toBe(401);

    const sellerForbiddenCategoryResponse = await api
      .post("/api/categories")
      .set(authHeader(seller.token))
      .send({ name: "Forbidden Category" });
    expect(sellerForbiddenCategoryResponse.status).toBe(403);
  });

  it("returns stable product creation responses for success, validation, auth and invalid relations", async () => {
    const admin = await loginUser({
      email: configModule.env.TECHNEXUS_ADMIN_EMAIL,
      password: configModule.env.TECHNEXUS_ADMIN_PASSWORD
    });
    const seller = await registerUser({
      name: "Seller Validation",
      email: "seller.validation@example.com",
      password: "Seller1234!",
      role: "seller"
    });
    const otherSeller = await registerUser({
      name: "Seller Other",
      email: "seller.other@example.com",
      password: "Seller1234!",
      role: "seller"
    });
    const category = await createAdminCategory(admin.token, "Validation Category");

    const unauthorizedResponse = await api
      .post("/api/products")
      .field("name", "Unauthorized Product")
      .field("description", "This request should be rejected.")
      .field("price", "99.99")
      .field("stock", "2")
      .field("categoryId", category.id)
      .attach("images", sampleImagePath);

    expect(unauthorizedResponse.status).toBe(401);

    const missingFieldsResponse = await api
      .post("/api/products")
      .set(authHeader(seller.token))
      .field("name", "Broken Product")
      .field("price", "99.99")
      .field("stock", "2")
      .field("categoryId", category.id)
      .attach("images", sampleImagePath);

    expect(missingFieldsResponse.status).toBe(400);
    expect(missingFieldsResponse.body.success).toBe(false);

    const invalidCategoryResponse = await api
      .post("/api/products")
      .set(authHeader(seller.token))
      .field("name", "Invalid Category Product")
      .field("description", "This product points to a missing category.")
      .field("price", "39.99")
      .field("stock", "2")
      .field("categoryId", "11111111-1111-4111-8111-111111111111")
      .attach("images", sampleImagePath);

    expect(invalidCategoryResponse.status).toBe(400);
    expect(invalidCategoryResponse.body.success).toBe(false);
    expect(invalidCategoryResponse.body.message).toBe("The selected category does not exist.");

    const invalidSellerInjectionResponse = await api
      .post("/api/products")
      .set(authHeader(admin.token))
      .field("name", "Injected Seller Product")
      .field("description", "This request uses a seller id that does not exist.")
      .field("price", "49.99")
      .field("stock", "3")
      .field("categoryId", category.id)
      .field("sellerId", "22222222-2222-4222-8222-222222222222")
      .attach("images", sampleImagePath);

    expect(invalidSellerInjectionResponse.status).toBe(400);
    expect(invalidSellerInjectionResponse.body.success).toBe(false);
    expect(invalidSellerInjectionResponse.body.message).toBe("The selected seller does not exist.");

    const createdResponse = await api
      .post("/api/products")
      .set(authHeader(seller.token))
      .field("name", "Secured Product")
      .field("description", "This product should be created successfully.")
      .field("price", "59.99")
      .field("stock", "5")
      .field("categoryId", category.id)
      .field("sellerId", otherSeller.user.id)
      .attach("images", sampleImagePath);

    expect(createdResponse.status).toBe(201);
    expect(createdResponse.body.product.name).toBe("Secured Product");
    expect(createdResponse.body.product.sellerId).toBe(seller.user.id);
  });

  it("verifies seller product CRUD, upload storage, image URLs and list/read endpoints", async () => {
    // Sellers should be able to create products with uploaded files and remote URLs.
    const admin = await loginUser({
      email: configModule.env.TECHNEXUS_ADMIN_EMAIL,
      password: configModule.env.TECHNEXUS_ADMIN_PASSWORD
    });
    const seller = await registerUser({
      name: "Seller Two",
      email: "seller.two@example.com",
      password: "Seller1234!",
      role: "seller"
    });
    const customer = await registerUser({
      name: "Customer Two",
      email: "customer.two@example.com",
      password: "Customer1234!",
      role: "customer"
    });
    const category = await createAdminCategory(admin.token, "Audio");
    const otherCategory = await createAdminCategory(admin.token, "Peripherals");

    const uploadedProduct = await createProductWithUpload({
      token: seller.token,
      name: "Studio Headphones",
      description: "Closed-back headphones for monitoring.",
      price: "129.99",
      stock: "6",
      categoryId: category.id
    });

    expect(uploadedProduct.images[0]).toMatch(/^\/uploads\//);
    await expect(
      fs.access(path.join(configModule.env.uploadsDir, path.basename(uploadedProduct.images[0])))
    ).resolves.toBeUndefined();

    const urlProduct = await createProductWithUrl({
      token: seller.token,
      name: "USB Microphone",
      description: "Podcast microphone with USB connectivity.",
      price: "89.50",
      stock: "4",
      categoryId: category.id,
      imageUrl: "https://cdn.example.com/microphone.jpg"
    });

    expect(urlProduct.images).toEqual(["https://cdn.example.com/microphone.jpg"]);

    const filteredOutProduct = await createProductWithUrl({
      token: seller.token,
      name: "Streaming Deck",
      description: "Customizable shortcuts for live production workflows.",
      price: "199.00",
      stock: "3",
      categoryId: otherCategory.id,
      imageUrl: "https://cdn.example.com/streaming-deck.jpg"
    });

    const customerCreateForbidden = await api
      .post("/api/products")
      .set(authHeader(customer.token))
      .field("name", "Should Fail")
      .field("description", "This should not be created.")
      .field("price", "10")
      .field("stock", "1")
      .field("categoryId", category.id)
      .attach("images", sampleImagePath);
    expect(customerCreateForbidden.status).toBe(403);

    const updateResponse = await api
      .put(`/api/products/${uploadedProduct.id}`)
      .set(authHeader(seller.token))
      .field("name", "Studio Headphones Pro")
      .field("price", "149.99")
      .field("stock", "8");

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.product.name).toBe("Studio Headphones Pro");
    expect(updateResponse.body.product.price).toBe(149.99);
    expect(updateResponse.body.product.stock).toBe(8);

    const apiListResponse = await api.get("/api/products");
    expect(apiListResponse.status).toBe(200);
    expect(apiListResponse.body.products).toHaveLength(3);

    const legacyListResponse = await api.get("/products");
    expect(legacyListResponse.status).toBe(200);
    expect(legacyListResponse.body.products).toHaveLength(3);

    const filteredListResponse = await api.get(`/api/products?categoryId=${category.id}`);
    expect(filteredListResponse.status).toBe(200);
    expect(filteredListResponse.body.products).toHaveLength(2);
    expect(
      filteredListResponse.body.products.map((product: { id: string }) => product.id)
    ).toEqual(expect.arrayContaining([uploadedProduct.id, urlProduct.id]));
    expect(
      filteredListResponse.body.products.map((product: { id: string }) => product.id)
    ).not.toContain(filteredOutProduct.id);

    const readResponse = await api.get(`/api/products/${uploadedProduct.id}`);
    expect(readResponse.status).toBe(200);
    expect(readResponse.body.product.id).toBe(uploadedProduct.id);
    expect(readResponse.body.product.images[0]).toMatch(/^\/uploads\//);

    const deleteResponse = await api
      .delete(`/api/products/${urlProduct.id}`)
      .set(authHeader(seller.token));
    expect(deleteResponse.status).toBe(200);

    const deletedReadResponse = await api.get(`/api/products/${urlProduct.id}`);
    expect(deletedReadResponse.status).toBe(404);

    const listAfterDelete = await api.get("/api/products");
    expect(listAfterDelete.body.products).toHaveLength(2);
  });

  it("verifies inventory endpoints, low-stock alerts, multi-seller COD checkout and email fan-out", async () => {
    // A customer order across multiple sellers must compute totals server-side, decrement stock and fan out emails correctly.
    const admin = await loginUser({
      email: configModule.env.TECHNEXUS_ADMIN_EMAIL,
      password: configModule.env.TECHNEXUS_ADMIN_PASSWORD
    });
    const sellerOne = await registerUser({
      name: "Seller Alpha",
      email: "seller.alpha@example.com",
      password: "Seller1234!",
      role: "seller"
    });
    const sellerTwo = await registerUser({
      name: "Seller Beta",
      email: "seller.beta@example.com",
      password: "Seller1234!",
      role: "seller"
    });
    const customer = await registerUser({
      name: "Customer Three",
      email: "customer.three@example.com",
      password: "Customer1234!",
      role: "customer"
    });
    const category = await createAdminCategory(admin.token, "Computing");

    const sellerOneProduct = await createProductWithUpload({
      token: sellerOne.token,
      name: "Mechanical Keyboard",
      description: "Mechanical keyboard with hot-swappable switches.",
      price: "99.99",
      stock: "8",
      categoryId: category.id
    });
    const sellerTwoProduct = await createProductWithUrl({
      token: sellerTwo.token,
      name: "Ergonomic Mouse",
      description: "Ergonomic mouse with programmable buttons.",
      price: "49.50",
      stock: "6",
      categoryId: category.id,
      imageUrl: "https://cdn.example.com/mouse.jpg"
    });

    const inventoryResponse = await api
      .get(`/api/inventory/products/${sellerOneProduct.id}`)
      .set(authHeader(sellerOne.token));
    expect(inventoryResponse.status).toBe(200);
    expect(inventoryResponse.body.stock).toBe(8);
    expect(inventoryResponse.body.inventories).toHaveLength(1);

    const patchedInventory = await api
      .patch(`/api/inventory/${inventoryResponse.body.inventories[0].id}`)
      .set(authHeader(sellerOne.token))
      .send({ quantity: 8, lowStockThreshold: 6 });
    expect(patchedInventory.status).toBe(200);
    expect(patchedInventory.body.inventory.quantity).toBe(8);
    expect(patchedInventory.body.inventory.lowStockThreshold).toBe(6);

    const addFirstItem = await api
      .post("/api/cart")
      .set(authHeader(customer.token))
      .send({ productId: sellerOneProduct.id, quantity: 3 });
    expect(addFirstItem.status).toBe(200);

    const addSecondItem = await api
      .post("/api/cart")
      .set(authHeader(customer.token))
      .send({ productId: sellerTwoProduct.id, quantity: 2 });
    expect(addSecondItem.status).toBe(200);

    const checkoutResponse = await api
      .post("/api/orders")
      .set(authHeader(customer.token))
      .send({
        buyerPhone: "+1 555 111 2222",
        shippingAddress: "742 Evergreen Terrace",
        shippingCost: 12.5
      });

    expect(checkoutResponse.status).toBe(201);
    expect(checkoutResponse.body.order.items).toHaveLength(2);
    expect(checkoutResponse.body.order.items[0].sellerId).toBe(sellerOne.user.id);
    expect(checkoutResponse.body.order.items[1].sellerId).toBe(sellerTwo.user.id);
    expect(checkoutResponse.body.order.total).toBe(411.47);

    const sellerOneAfterOrder = await api.get(`/api/products/${sellerOneProduct.id}`);
    const sellerTwoAfterOrder = await api.get(`/api/products/${sellerTwoProduct.id}`);
    expect(sellerOneAfterOrder.body.product.stock).toBe(5);
    expect(sellerTwoAfterOrder.body.product.stock).toBe(4);

    const alertsResponse = await api
      .get("/api/inventory/alerts")
      .set(authHeader(sellerOne.token));
    expect(alertsResponse.status).toBe(200);
    expect(alertsResponse.body.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productId: sellerOneProduct.id,
          triggeredQty: 5,
          threshold: 6
        })
      ])
    );

    const outboxBeforeProcessing = await api
      .get("/api/admin/ops/email-outbox")
      .set(authHeader(admin.token));
    expect(outboxBeforeProcessing.status).toBe(200);
    expect(outboxBeforeProcessing.body.rows).toHaveLength(3);

    const processedCount = await outboxModule.processOutboxBatch();
    expect(processedCount).toBe(3);
    expect(sentEmails).toHaveLength(3);

    const buyerEmail = sentEmails.find(
      (email: LoggedEmail) => email.to === "customer.three@example.com"
    );
    const sellerOneEmail = sentEmails.find(
      (email: LoggedEmail) => email.to === "seller.alpha@example.com"
    );
    const sellerTwoEmail = sentEmails.find(
      (email: LoggedEmail) => email.to === "seller.beta@example.com"
    );

    expect(buyerEmail?.text).toContain("Mechanical Keyboard");
    expect(buyerEmail?.text).toContain("Ergonomic Mouse");
    expect(sellerOneEmail?.text).toContain("Mechanical Keyboard");
    expect(sellerOneEmail?.text).not.toContain("Ergonomic Mouse");
    expect(sellerTwoEmail?.text).toContain("Ergonomic Mouse");
    expect(sellerTwoEmail?.text).not.toContain("Mechanical Keyboard");

    const outboxAfterProcessing = await api
      .get("/admin/ops/email-outbox")
      .set(authHeader(admin.token));
    expect(outboxAfterProcessing.status).toBe(200);
    expect(outboxAfterProcessing.body.rows.every((row: { status: string }) => row.status === "sent")).toBe(
      true
    );
  }, 20_000);

  it("verifies guest checkout and legacy checkout/cart endpoints", async () => {
    // Guest sessions should be able to maintain a cart and place COD orders through the legacy endpoints too.
    const admin = await loginUser(
      {
        email: configModule.env.TECHNEXUS_ADMIN_EMAIL,
        password: configModule.env.TECHNEXUS_ADMIN_PASSWORD
      },
      "/login"
    );
    const seller = await registerUser({
      name: "Seller Guest",
      email: "seller.guest@example.com",
      password: "Seller1234!",
      role: "seller"
    });
    const category = await createAdminCategory(admin.token, "Guest Checkout");
    const product = await createProductWithUrl({
      token: seller.token,
      name: "Laptop Stand",
      description: "Adjustable aluminum laptop stand.",
      price: "39.90",
      stock: "5",
      categoryId: category.id,
      imageUrl: "https://cdn.example.com/laptop-stand.jpg"
    });

    const guestResponse = await api.post("/guest").send({});
    expect(guestResponse.status).toBe(201);

    const addCartResponse = await api
      .post("/cart")
      .set(authHeader(guestResponse.body.token))
      .send({ productId: product.id, quantity: 1 });
    expect(addCartResponse.status).toBe(200);
    expect(addCartResponse.body.items).toHaveLength(1);

    const checkoutResponse = await api
      .post("/checkout")
      .set(authHeader(guestResponse.body.token))
      .send({
        buyerName: "Guest Buyer",
        buyerEmail: "guest.buyer@example.com",
        buyerPhone: "+1 555 000 0000",
        shippingAddress: "123 Guest Street",
        shippingCost: 10
      });

    expect(checkoutResponse.status).toBe(201);
    expect(checkoutResponse.body.order.userEmail).toBe("guest.buyer@example.com");
    expect(checkoutResponse.body.order.total).toBe(49.9);

    const guestOrders = await api
      .get("/api/orders")
      .set(authHeader(guestResponse.body.token));
    expect(guestOrders.status).toBe(200);
    expect(guestOrders.body.orders).toHaveLength(1);
  });

  it("accepts analytics ingestion, validates payloads and persists trusted actor context", async () => {
    const admin = await loginUser({
      email: configModule.env.TECHNEXUS_ADMIN_EMAIL,
      password: configModule.env.TECHNEXUS_ADMIN_PASSWORD
    });
    const customer = await registerUser({
      name: "Analytics Customer",
      email: "analytics.customer@example.com",
      password: "Customer123!",
      role: "customer"
    });

    const authenticatedResponse = await api
      .post("/api/analytics")
      .set(authHeader(customer.token))
      .send({
        event: "view_home",
        userId: "00000000-0000-0000-0000-000000000000",
        sessionId: "session-authenticated",
        data: {
          source: "homepage"
        }
      });

    expect(authenticatedResponse.status).toBe(202);

    await waitFor(async () => {
      const event = await prismaModule.prisma.analyticsEvent.findFirst({
        where: {
          sessionId: "session-authenticated"
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      expect(event).not.toBeNull();
      expect(event?.userId).toBe(customer.user.id);
      expect(event?.data).toMatchObject({ source: "homepage" });
      return event;
    });

    const anonymousResponse = await api.post("/api/analytics").send({
      event: "view_cart",
      userId: customer.user.id,
      sessionId: "session-anonymous",
      data: {
        items: 0
      }
    });

    expect(anonymousResponse.status).toBe(202);

    await waitFor(async () => {
      const event = await prismaModule.prisma.analyticsEvent.findFirst({
        where: {
          sessionId: "session-anonymous"
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      expect(event).not.toBeNull();
      expect(event?.userId).toBeNull();
      expect(event?.data).toMatchObject({ items: 0 });
      return event;
    });

    const invalidResponse = await api.post("/api/analytics").send({
      event: "unknown_event",
      sessionId: ""
    });

    expect(invalidResponse.status).toBe(400);

    const overviewResponse = await api
      .get("/api/admin/analytics/overview")
      .query({ range: "24h" })
      .set(authHeader(admin.token));

    expect(overviewResponse.status).toBe(200);
    expect(overviewResponse.body.provider).toBe(configModule.env.ANALYTICS_PROVIDER);
    expect(overviewResponse.body.funnel.viewHome).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(overviewResponse.body.recentEvents)).toBe(true);
  });

  it("runs db:reset-seed without deleting users and exposes the seeded catalog", async () => {
    const seller = await registerUser({
      name: "Seed Seller",
      email: "seed.seller@example.com",
      password: "Seller1234!",
      role: "seller"
    });
    await registerUser({
      name: "Seed Customer",
      email: "seed.customer@example.com",
      password: "Customer1234!",
      role: "customer"
    });

    const usersBefore = await prismaModule.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true
      },
      orderBy: {
        email: "asc"
      }
    });

    runResetAndSeedCommand();
    await prismaModule.prisma.$disconnect();
    await prismaModule.connectDatabase();

    const productsResponse = await api.get("/api/products").query({ limit: 50 });
    expect(productsResponse.status).toBe(200);
    expect(productsResponse.body.products.length).toBeGreaterThanOrEqual(20);

    const categoriesResponse = await api.get("/api/categories").query({ limit: 50 });
    expect(categoriesResponse.status).toBe(200);
    expect(categoriesResponse.body.categories.map((category: { name: string }) => category.name)).toEqual(
      expect.arrayContaining(["Laptops", "PC Components", "Monitors", "Accessories"])
    );

    const usersAfter = await prismaModule.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true
      },
      orderBy: {
        email: "asc"
      }
    });

    expect(usersAfter).toEqual(usersBefore);

    const admin = await prismaModule.prisma.user.findUnique({
      where: {
        email: configModule.env.TECHNEXUS_ADMIN_EMAIL.toLowerCase()
      }
    });
    expect(admin?.role).toBe("admin");

    const seededProducts = await prismaModule.prisma.product.findMany({
      include: {
        category: true
      }
    });
    expect(seededProducts.length).toBeGreaterThanOrEqual(20);
    expect(new Set(seededProducts.map((product) => product.category.name))).toEqual(
      new Set(["Laptops", "PC Components", "Monitors", "Accessories"])
    );
    expect(new Set(seededProducts.map((product) => product.sellerId))).toEqual(new Set([seller.user.id]));
  }, 30_000);

  it("runs db:demo and populates products, orders, reviews and analytics without deleting users", async () => {
    const seededSeller = await registerUser({
      name: "Demo Seller",
      email: "demo.seller@example.com",
      password: "Seller1234!",
      role: "seller"
    });
    await registerUser({
      name: "Buyer One",
      email: "buyer.one@example.com",
      password: "Customer1234!",
      role: "customer"
    });
    await registerUser({
      name: "Buyer Two",
      email: "buyer.two@example.com",
      password: "Customer1234!",
      role: "customer"
    });
    await registerUser({
      name: "Buyer Three",
      email: "buyer.three@example.com",
      password: "Customer1234!",
      role: "customer"
    });
    await registerUser({
      name: "Buyer Four",
      email: "buyer.four@example.com",
      password: "Customer1234!",
      role: "customer"
    });
    await registerUser({
      name: "Buyer Five",
      email: "buyer.five@example.com",
      password: "Customer1234!",
      role: "customer"
    });
    await registerUser({
      name: "Buyer Six",
      email: "buyer.six@example.com",
      password: "Customer1234!",
      role: "customer"
    });

    const admin = await loginUser({
      email: configModule.env.TECHNEXUS_ADMIN_EMAIL,
      password: configModule.env.TECHNEXUS_ADMIN_PASSWORD
    });

    const usersBefore = await prismaModule.prisma.user.findMany({
      select: {
        id: true,
        email: true
      },
      orderBy: {
        email: "asc"
      }
    });

    runDemoCommand();
    await prismaModule.prisma.$disconnect();
    await prismaModule.connectDatabase();

    const usersAfter = await prismaModule.prisma.user.findMany({
      select: {
        id: true,
        email: true
      },
      orderBy: {
        email: "asc"
      }
    });
    expect(usersAfter).toEqual(usersBefore);

    const sellerCount = await prismaModule.prisma.user.count({
      where: {
        role: "seller",
        deletedAt: null,
        isBlocked: false
      }
    });
    expect(sellerCount).toBeGreaterThanOrEqual(5);

    const productsResponse = await api.get("/api/products").query({ limit: 80 });
    expect(productsResponse.status).toBe(200);
    expect(productsResponse.body.products.length).toBeGreaterThanOrEqual(40);
    expect(productsResponse.body.products.every((product: { averageRating: number; reviewCount: number }) => typeof product.averageRating === "number" && product.reviewCount > 0)).toBe(true);

    const productDetailResponse = await api.get(`/api/products/${productsResponse.body.products[0].id}`);
    expect(productDetailResponse.status).toBe(200);
    expect(productDetailResponse.body.product.reviews.length).toBeGreaterThanOrEqual(2);

    const ordersResponse = await api.get("/api/orders").set(authHeader(admin.token)).query({ limit: 100 });
    expect(ordersResponse.status).toBe(200);
    expect(ordersResponse.body.orders.length).toBeGreaterThanOrEqual(30);

    const analyticsResponse = await api
      .get("/api/admin/analytics/overview")
      .set(authHeader(admin.token))
      .query({ range: "30d" });
    expect(analyticsResponse.status).toBe(200);
    expect(analyticsResponse.body.funnel.viewHome).toBeGreaterThan(0);
    expect(analyticsResponse.body.funnel.completeOrder).toBeGreaterThan(0);
    expect(analyticsResponse.body.topProducts.views.length).toBeGreaterThan(0);

    const sellerProductsResponse = await api
      .get("/api/products/mine")
      .set(authHeader(seededSeller.token));
    expect(sellerProductsResponse.status).toBe(200);
    expect(sellerProductsResponse.body.products.length).toBeGreaterThan(0);

    const sellerOrdersResponse = await api
      .get("/api/orders/seller")
      .set(authHeader(seededSeller.token));
    expect(sellerOrdersResponse.status).toBe(200);
    expect(sellerOrdersResponse.body.orders.length).toBeGreaterThan(0);

    const adminAfter = await prismaModule.prisma.user.findUnique({
      where: {
        email: configModule.env.TECHNEXUS_ADMIN_EMAIL.toLowerCase()
      }
    });
    expect(adminAfter?.role).toBe("admin");

    const negativeInventoryCount = await prismaModule.prisma.inventory.count({
      where: {
        quantity: {
          lt: 0
        }
      }
    });
    expect(negativeInventoryCount).toBe(0);

    const orders = await prismaModule.prisma.order.findMany({
      orderBy: {
        createdAt: "asc"
      }
    });
    expect(orders[0].createdAt.getTime()).toBeGreaterThan(
      Date.now() - 31 * 24 * 60 * 60 * 1000
    );
  }, 60_000);

  it("verifies legacy and /api endpoints respond without 404s on basic requests", async () => {
    // Core discovery endpoints should answer on both compatibility surfaces.
    const admin = await loginUser({
      email: configModule.env.TECHNEXUS_ADMIN_EMAIL,
      password: configModule.env.TECHNEXUS_ADMIN_PASSWORD
    });

    const responses = await Promise.all([
      api.get("/health"),
      api.get("/api/products"),
      api.get("/products"),
      api.get("/api/categories"),
      api.get("/categories"),
      api.get("/api/observability/metrics"),
      api.get("/observability/metrics"),
      api.get("/api/metrics"),
      api.get("/metrics"),
      api.get("/api/admin/ops/worker-health").set(authHeader(admin.token)),
      api.get("/admin/ops/worker-health").set(authHeader(admin.token))
    ]);

    for (const response of responses) {
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(400);
    }

    expect(responses[0].body.status).toBe("ok");
    expect(Array.isArray(responses[1].body.products)).toBe(true);
    expect(Array.isArray(responses[3].body.categories)).toBe(true);
    expect(typeof responses[5].body.totalRequests).toBe("number");
  });
});
