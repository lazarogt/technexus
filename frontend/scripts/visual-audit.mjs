import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:5173";
const API_URL = process.env.API_URL ?? "http://127.0.0.1:4000";
const OUTPUT_DIR = process.env.OUTPUT_DIR ?? path.resolve(process.cwd(), "output/playwright");
const TOKEN_STORAGE_KEY = "technexus_auth_token";

const credentials = {
  admin: {
    email: process.env.TECHNEXUS_ADMIN_EMAIL ?? "admin@technexus.local",
    password: process.env.TECHNEXUS_ADMIN_PASSWORD ?? "Adm1n!TechNexus#2026"
  },
  seller: {
    email: process.env.TECHNEXUS_SELLER_EMAIL ?? "seller@technexus.local",
    password: process.env.TECHNEXUS_SELLER_PASSWORD ?? "Sell3r!TechNexus#2026"
  },
  customer: {
    email: process.env.TECHNEXUS_CUSTOMER_EMAIL ?? "customer@technexus.local",
    password: process.env.TECHNEXUS_CUSTOMER_PASSWORD ?? "Cust0mer!TechNexus#2026"
  }
};

const routeChecks = [
  {
    key: "marketplace",
    path: "/",
    auth: "customer",
    required: [
      { name: "search input", locator: (page) => page.getByLabel(/search products/i) },
      { name: "cart link", locator: (page) => page.getByRole("link", { name: /cart/i }).first() }
    ],
    extraAudit: async (page, artifacts) => {
      const quickViewButton = page.getByRole("button", { name: /open quick view/i }).first();
      await quickViewButton.click();
      await page.getByRole("dialog").first().waitFor({ state: "visible" });
      await page.screenshot({
        fullPage: true,
        path: path.join(OUTPUT_DIR, `${artifacts.index}-marketplace-quick-view.png`)
      });
      await page.getByRole("button", { name: /close quick view/i }).click();
    }
  },
  {
    key: "product",
    path: "/product/:id",
    auth: "customer",
    required: [
      { name: "product title", locator: (page) => page.getByRole("heading", { level: 1 }).first() },
      { name: "add to cart", locator: (page) => page.getByRole("button", { name: /add .* to cart|adding|out of stock/i }).first() }
    ]
  },
  {
    key: "checkout",
    path: "/checkout",
    auth: "customer",
    required: [
      { name: "checkout copy", locator: (page) => page.getByText(/review a multi-seller cart/i).first() },
      { name: "place order button", locator: (page) => page.getByRole("button", { name: /confirm.*order|place order|submit/i }).first() }
    ]
  },
  {
    key: "seller-dashboard-products",
    path: "/seller/dashboard",
    auth: "seller",
    required: [
      { name: "dashboard heading", locator: (page) => page.getByRole("heading", { name: /manage products, orders and revenue/i }).first() },
      { name: "products tab", locator: (page) => page.getByRole("tab", { name: /my products/i }) }
    ]
  },
  {
    key: "seller-dashboard-orders",
    path: "/seller/dashboard",
    auth: "seller",
    required: [
      { name: "orders tab", locator: (page) => page.getByRole("tab", { name: /^orders$/i }) },
      { name: "orders table search", locator: (page) => page.getByLabel(/search seller orders/i) }
    ],
    extraAudit: async (page) => {
      await page.getByRole("tab", { name: /^orders$/i }).click();
      await page.getByRole("tabpanel").waitFor({ state: "visible" });
    }
  },
  {
    key: "seller-dashboard-stats",
    path: "/seller/dashboard",
    auth: "seller",
    required: [
      { name: "stats tab", locator: (page) => page.getByRole("tab", { name: /^stats$/i }) },
      { name: "seller revenue metric", locator: (page) => page.getByText(/revenue/i).first() }
    ],
    extraAudit: async (page) => {
      await page.getByRole("tab", { name: /^stats$/i }).click();
      await page.getByRole("tabpanel").waitFor({ state: "visible" });
    }
  },
  {
    key: "admin-ops",
    path: "/admin/ops",
    auth: "admin",
    required: [
      { name: "email queue heading", locator: (page) => page.getByRole("heading", { name: /email queue/i }).first() },
      { name: "auto refresh select", locator: (page) => page.getByLabel(/auto refresh interval/i) }
    ]
  }
];

async function ensureDir(directory) {
  await fs.mkdir(directory, { recursive: true });
}

async function login(email, password) {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error(`Login failed for ${email}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchFirstProductId() {
  const response = await fetch(`${API_URL}/products?page=1&limit=1`);

  if (!response.ok) {
    throw new Error(`Unable to fetch products: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  const firstProduct = payload.products?.[0];

  if (!firstProduct?.id) {
    throw new Error("No products available for visual audit.");
  }

  return firstProduct.id;
}

async function createContext(browser, token) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: {
      width: 1440,
      height: 1200
    }
  });

  await context.addInitScript(
    ({ tokenStorageKey, authToken }) => {
      window.localStorage.setItem(tokenStorageKey, authToken);
      window.__TECHNEXUS_AUDIT__ = {
        longTasks: [],
        layoutShiftScore: 0
      };

      const captureEntry = (entry) => ({
        name: entry.name,
        duration: entry.duration,
        startTime: entry.startTime
      });

      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__TECHNEXUS_AUDIT__.longTasks.push(captureEntry(entry));
          }
        }).observe({ entryTypes: ["longtask"] });
      } catch {}

      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              window.__TECHNEXUS_AUDIT__.layoutShiftScore += entry.value;
            }
          }
        }).observe({ entryTypes: ["layout-shift"] });
      } catch {}
    },
    {
      tokenStorageKey: TOKEN_STORAGE_KEY,
      authToken: token
    }
  );

  return context;
}

async function auditRoute({ browser, tokens, productId, route, index }) {
  const context = await createContext(browser, tokens[route.auth]);
  const page = await context.newPage();
  const renderErrors = [];
  const failedRequests = [];

  page.on("pageerror", (error) => {
    renderErrors.push(`pageerror: ${error.message}`);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      renderErrors.push(`console: ${message.text()}`);
    }
  });

  page.on("response", (response) => {
    if (response.status() >= 400) {
      const url = response.url();

      if (!url.includes("favicon.ico")) {
        failedRequests.push(`${response.status()} ${url}`);
      }
    }
  });

  const resolvedPath = route.path.replace(":id", productId);
  await page.goto(resolvedPath, { waitUntil: "networkidle" });

  const missingElements = [];

  for (const item of route.required) {
    const locator = item.locator(page);
    const count = await locator.count();

    if (count === 0 || !(await locator.first().isVisible())) {
      missingElements.push(item.name);
    }
  }

  if (route.extraAudit) {
    await route.extraAudit(page, { index: String(index).padStart(2, "0") });
  }

  await page.screenshot({
    fullPage: true,
    path: path.join(OUTPUT_DIR, `${String(index).padStart(2, "0")}-${route.key}.png`)
  });

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  const perf = await page.evaluate(() => {
    const audit = window.__TECHNEXUS_AUDIT__ ?? { longTasks: [], layoutShiftScore: 0 };
    const navigationEntry = performance.getEntriesByType("navigation")[0];

    return {
      longTaskCount: audit.longTasks.length,
      longTaskDuration: audit.longTasks.reduce((total, entry) => total + entry.duration, 0),
      layoutShiftScore: audit.layoutShiftScore,
      domContentLoadedMs: navigationEntry?.domContentLoadedEventEnd ?? 0,
      loadEventMs: navigationEntry?.loadEventEnd ?? 0
    };
  });

  await context.close();

  return {
    route: resolvedPath,
    key: route.key,
    missingElements,
    renderErrors,
    failedRequests,
    accessibilityViolations: axe.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.length
    })),
    performance: perf
  };
}

function summarize(report) {
  const renderProblems = report.filter((item) => item.renderErrors.length || item.failedRequests.length || item.missingElements.length);
  const accessibilityProblems = report.filter((item) => item.accessibilityViolations.length);
  const performanceProblems = report.filter(
    (item) =>
      item.performance.longTaskCount > 0 ||
      item.performance.longTaskDuration > 50 ||
      item.performance.layoutShiftScore > 0.1
  );

  return {
    renderProblems,
    accessibilityProblems,
    performanceProblems
  };
}

async function writeReport(report) {
  const summary = summarize(report);
  const jsonPath = path.join(OUTPUT_DIR, "visual-audit-report.json");
  const markdownPath = path.join(OUTPUT_DIR, "visual-audit-report.md");

  await fs.writeFile(
    jsonPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl: BASE_URL,
        apiUrl: API_URL,
        report,
        summary: {
          renderProblemCount: summary.renderProblems.length,
          accessibilityProblemCount: summary.accessibilityProblems.length,
          performanceProblemCount: summary.performanceProblems.length
        }
      },
      null,
      2
    )
  );

  const markdown = [
    "# TechNexus Visual Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Base URL: ${BASE_URL}`,
    `API URL: ${API_URL}`,
    "",
    "## Render Errors",
    summary.renderProblems.length
      ? summary.renderProblems
          .map((item) => {
            const lines = [`- ${item.key} (${item.route})`];

            item.renderErrors.forEach((entry) => lines.push(`  - ${entry}`));
            item.failedRequests.forEach((entry) => lines.push(`  - ${entry}`));
            item.missingElements.forEach((entry) => lines.push(`  - missing: ${entry}`));

            return lines.join("\n");
          })
          .join("\n")
      : "- None",
    "",
    "## Accessibility Problems",
    summary.accessibilityProblems.length
      ? summary.accessibilityProblems
          .map((item) =>
            [
              `- ${item.key} (${item.route})`,
              ...item.accessibilityViolations.map(
                (violation) =>
                  `  - ${violation.id} [${violation.impact ?? "unknown"}]: ${violation.help} (${violation.nodes} nodes)`
              )
            ].join("\n")
          )
          .join("\n")
      : "- None",
    "",
    "## Animation and Performance Problems",
    summary.performanceProblems.length
      ? summary.performanceProblems
          .map(
            (item) =>
              `- ${item.key} (${item.route}): longTasks=${item.performance.longTaskCount}, longTaskDuration=${item.performance.longTaskDuration.toFixed(2)}ms, layoutShift=${item.performance.layoutShiftScore.toFixed(4)}`
          )
          .join("\n")
      : "- None"
  ].join("\n");

  await fs.writeFile(markdownPath, `${markdown}\n`);

  return summary;
}

async function main() {
  await ensureDir(OUTPUT_DIR);

  const productId = await fetchFirstProductId();
  const [adminLogin, sellerLogin, customerLogin] = await Promise.all([
    login(credentials.admin.email, credentials.admin.password),
    login(credentials.seller.email, credentials.seller.password),
    login(credentials.customer.email, credentials.customer.password)
  ]);

  const tokens = {
    admin: adminLogin.token,
    seller: sellerLogin.token,
    customer: customerLogin.token
  };

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
  });

  try {
    const report = [];

    for (const [index, route] of routeChecks.entries()) {
      report.push(
        await auditRoute({
          browser,
          productId,
          route,
          tokens,
          index: index + 1
        })
      );
    }

    const summary = await writeReport(report);

    console.log(JSON.stringify({
      generatedAt: new Date().toISOString(),
      reportPath: path.join(OUTPUT_DIR, "visual-audit-report.md"),
      summary: {
        renderProblems: summary.renderProblems.length,
        accessibilityProblems: summary.accessibilityProblems.length,
        performanceProblems: summary.performanceProblems.length
      }
    }, null, 2));

    if (
      summary.renderProblems.length > 0 ||
      summary.accessibilityProblems.length > 0 ||
      summary.performanceProblems.length > 0
    ) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
