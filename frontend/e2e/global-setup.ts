import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { API_URL, HEALTH_URL, TEST_CATEGORIES, TEST_IMAGE_URLS, TEST_PRODUCTS, TEST_USERS } from "./support/test-data";

const frontendDir = path.resolve(process.cwd());
const repoRoot = path.resolve(frontendDir, "..");
const backendDir = path.resolve(repoRoot, "backend");
const runtimeDir = path.resolve(frontendDir, ".e2e-runtime", "backend");
const runtimePidPath = path.resolve(frontendDir, ".e2e-runtime", "backend.pid");

function runCommand(command: string, args: string[], cwd: string, timeout?: number) {
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
    timeout
  });
}

async function waitForBackend(url: string, timeoutMs: number) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the service is ready.
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Backend was not ready at ${url} within ${timeoutMs}ms`);
}

function stopLocalBackendIfNeeded() {
  try {
    const pid = Number.parseInt(fs.readFileSync(runtimePidPath, "utf8").trim(), 10);

    if (Number.isFinite(pid)) {
      process.kill(pid, "SIGTERM");
    }
  } catch {
    // Ignore missing process.
  } finally {
    fs.rmSync(runtimePidPath, { force: true });
  }
}

function stopProcessListeningOnPort(port: number) {
  try {
    const output = execFileSync("lsof", [`-tiTCP:${port}`, "-sTCP:LISTEN"], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "ignore"]
    })
      .toString()
      .trim();

    if (!output) {
      return;
    }

    for (const line of output.split("\n")) {
      const pid = Number.parseInt(line.trim(), 10);

      if (Number.isFinite(pid)) {
        try {
          process.kill(pid, "SIGTERM");
        } catch {
          // Ignore missing process.
        }
      }
    }
  } catch {
    // Ignore missing listeners.
  }
}

async function startLocalBackend() {
  fs.rmSync(runtimeDir, { recursive: true, force: true });
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.copyFileSync(path.resolve(backendDir, ".env"), path.resolve(runtimeDir, ".env"));
  fs.mkdirSync(path.resolve(runtimeDir, "uploads"), { recursive: true });

  const tsxCommand = path.resolve(backendDir, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
  const child = spawn(tsxCommand, ["watch", path.resolve(backendDir, "src/index.ts")], {
    cwd: runtimeDir,
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      BACKEND_PORT: "4000"
    }
  });

  child.unref();
  fs.mkdirSync(path.dirname(runtimePidPath), { recursive: true });
  fs.writeFileSync(runtimePidPath, String(child.pid));
}

async function waitForPostgres(timeoutMs: number) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      runCommand("docker", ["compose", "exec", "-T", "postgres", "pg_isready", "-U", "technexus", "-d", "technexus"], repoRoot);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  throw new Error("Postgres was not ready within timeout");
}

async function apiRequest<T>(
  pathName: string,
  init: {
    method?: string;
    token?: string;
    body?: BodyInit | Record<string, unknown>;
  } = {}
) {
  const headers = new Headers();

  if (init.token) {
    headers.set("Authorization", `Bearer ${init.token}`);
  }

  const isForm = init.body instanceof FormData;

  if (init.body && !isForm) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${pathName}`, {
    method: init.method ?? "GET",
    headers,
    body:
      init.body && !isForm && typeof init.body !== "string"
        ? JSON.stringify(init.body)
        : (init.body as BodyInit | undefined)
  });

  if (!response.ok) {
    throw new Error(`API request failed for ${pathName}: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as T;
}

async function provisionUsers() {
  await apiRequest("/auth/register", {
    method: "POST",
    body: {
      name: TEST_USERS.sellerOne.name,
      email: TEST_USERS.sellerOne.email,
      password: TEST_USERS.sellerOne.password,
      role: "seller"
    }
  });

  await apiRequest("/auth/register", {
    method: "POST",
    body: {
      name: TEST_USERS.sellerTwo.name,
      email: TEST_USERS.sellerTwo.email,
      password: TEST_USERS.sellerTwo.password,
      role: "seller"
    }
  });

  await apiRequest("/auth/register", {
    method: "POST",
    body: {
      name: TEST_USERS.customer.name,
      email: TEST_USERS.customer.email,
      password: TEST_USERS.customer.password,
      role: "customer"
    }
  });
}

async function provisionCatalog() {
  const admin = await apiRequest<{ token: string; user: { id: string } }>("/auth/login", {
    method: "POST",
    body: {
      email: TEST_USERS.admin.email,
      password: TEST_USERS.admin.password
    }
  });

  const sellerOne = await apiRequest<{ token: string; user: { id: string } }>("/auth/login", {
    method: "POST",
    body: {
      email: TEST_USERS.sellerOne.email,
      password: TEST_USERS.sellerOne.password
    }
  });

  const sellerTwo = await apiRequest<{ token: string; user: { id: string } }>("/auth/login", {
    method: "POST",
    body: {
      email: TEST_USERS.sellerTwo.email,
      password: TEST_USERS.sellerTwo.password
    }
  });

  const categoryDevices = await apiRequest<{ category: { id: string } }>("/categories", {
    method: "POST",
    token: admin.token,
    body: { name: TEST_CATEGORIES.devices }
  });

  const categoryAccessories = await apiRequest<{ category: { id: string } }>("/categories", {
    method: "POST",
    token: admin.token,
    body: { name: TEST_CATEGORIES.accessories }
  });

  const sellerOneProducts = [
    {
      name: TEST_PRODUCTS.storefront,
      description: "E2E storefront laptop for product navigation and cart checks.",
      price: 1499,
      stock: 12,
      categoryId: categoryDevices.category.id,
      imageUrls: [TEST_IMAGE_URLS.laptop]
    },
    {
      name: TEST_PRODUCTS.multiSellerOne,
      description: "E2E seller one product for multi-seller checkout coverage.",
      price: 899,
      stock: 10,
      categoryId: categoryDevices.category.id,
      imageUrls: [TEST_IMAGE_URLS.laptop]
    },
    {
      name: TEST_PRODUCTS.lowStock,
      description: "E2E low stock product to validate alert creation after checkout.",
      price: 59,
      stock: 6,
      categoryId: categoryAccessories.category.id,
      imageUrls: [TEST_IMAGE_URLS.accessory]
    }
  ];

  for (const product of sellerOneProducts) {
    const formData = new FormData();
    formData.set("name", product.name);
    formData.set("description", product.description);
    formData.set("price", String(product.price));
    formData.set("stock", String(product.stock));
    formData.set("categoryId", product.categoryId);
    formData.set("imageUrls", JSON.stringify(product.imageUrls));

    await apiRequest("/products", {
      method: "POST",
      token: sellerOne.token,
      body: formData
    });
  }

  const sellerTwoForm = new FormData();
  sellerTwoForm.set("name", TEST_PRODUCTS.multiSellerTwo);
  sellerTwoForm.set("description", "E2E seller two product for multi-seller checkout coverage.");
  sellerTwoForm.set("price", "79");
  sellerTwoForm.set("stock", "10");
  sellerTwoForm.set("categoryId", categoryAccessories.category.id);
  sellerTwoForm.set("imageUrls", JSON.stringify([TEST_IMAGE_URLS.accessory]));

  await apiRequest("/products", {
    method: "POST",
    token: sellerTwo.token,
    body: sellerTwoForm
  });
}

export default async function globalSetup() {
  stopLocalBackendIfNeeded();
  stopProcessListeningOnPort(4000);
  runCommand("docker", ["compose", "down", "--remove-orphans"], repoRoot);
  runCommand("docker", ["compose", "up", "-d", "postgres"], repoRoot);
  await waitForPostgres(60_000);
  runCommand("node", ["scripts/prisma.cjs", "migrate", "reset", "--force", "--skip-generate", "--skip-seed"], backendDir);
  runCommand("npm", ["run", "db:seed"], backendDir);

  try {
    runCommand("docker", ["compose", "up", "-d", "--build", "--force-recreate", "backend"], repoRoot, 90_000);
    await waitForBackend(HEALTH_URL, 120_000);
  } catch {
    runCommand("docker", ["compose", "rm", "-sf", "backend"], repoRoot);
    await startLocalBackend();
    await waitForBackend(HEALTH_URL, 60_000);
  }

  await provisionUsers();
  await provisionCatalog();
}
