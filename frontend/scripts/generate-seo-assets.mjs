import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");

const siteUrlEnv = process.env.VITE_SITE_URL?.trim();
const siteUrl = (siteUrlEnv || "http://localhost:3000").replace(/\/$/, "");
const apiBaseUrl = (
  process.env.VITE_SITEMAP_API_URL?.trim() ||
  process.env.VITE_API_URL?.trim() ||
  "http://localhost:4000"
).replace(/\/$/, "");

if (process.env.CI === "true" && !siteUrlEnv) {
  throw new Error("VITE_SITE_URL must be set in CI builds so sitemap.xml uses the public site origin.");
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildCategoryPath(category) {
  return `/category/${slugify(category.name)}-${category.id}`;
}

function buildProductPath(product) {
  return `/product/${slugify(product.name)}-${product.id}`;
}

async function fetchJson(resourcePath) {
  const response = await fetch(`${apiBaseUrl}${resourcePath}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${resourcePath}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchAllProducts() {
  const pageSize = 100;
  const firstPage = await fetchJson(`/api/products?page=1&limit=${pageSize}`);
  const products = [...(firstPage.products ?? [])];
  const totalPages = Math.max(1, Number(firstPage.pagination?.totalPages ?? 1));

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await fetchJson(`/api/products?page=${page}&limit=${pageSize}`);
    products.push(...(nextPage.products ?? []));
  }

  return products;
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildSitemapXml(urls) {
  const entries = urls
    .map(
      (url) => `  <url>
    <loc>${escapeXml(url)}</loc>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

async function main() {
  const [{ categories = [] }, products] = await Promise.all([
    fetchJson("/api/categories"),
    fetchAllProducts()
  ]);

  const urls = [
    `${siteUrl}/`,
    `${siteUrl}/products`,
    ...categories.map((category) => `${siteUrl}${buildCategoryPath(category)}`),
    ...products.map((product) => `${siteUrl}${buildProductPath(product)}`)
  ];

  const uniqueUrls = [...new Set(urls)];
  const sitemapXml = buildSitemapXml(uniqueUrls);
  const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;

  await mkdir(publicDir, { recursive: true });
  await writeFile(path.join(publicDir, "sitemap.xml"), sitemapXml, "utf8");
  await writeFile(path.join(publicDir, "robots.txt"), robotsTxt, "utf8");
}

main().catch((error) => {
  console.error("Failed to generate SEO assets.", error);
  process.exitCode = 1;
});
