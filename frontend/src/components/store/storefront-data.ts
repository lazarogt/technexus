import i18n from "@/i18n";
import type { Category, Product } from "@/features/api/types";

export const PRIMARY_CATEGORY_ORDER = ["Laptops", "PC Components", "Monitors", "Accessories", "Gaming"] as const;

export type StoreBadge = "bestSeller" | "trending" | "limitedStock";

export type SellerSpotlight = {
  sellerId: string;
  sellerName: string;
  productCount: number;
  averageRating: number;
  reviewCount: number;
  startingPrice: number;
  heroProduct: Product;
};

export type StorefrontCollections = {
  trending: Product[];
  deals: Product[];
  topSellers: SellerSpotlight[];
  badgeMap: Map<string, StoreBadge[]>;
};

function sortByName<T extends { name: string }>(items: T[]) {
  return [...items].sort((left, right) => left.name.localeCompare(right.name));
}

function getMomentumScore(product: Product) {
  return product.averageRating * 30 + product.reviewCount * 4 + Math.min(product.stock, 24);
}

function getDealScore(product: Product) {
  const priceRelief = Math.max(0, 1800 - product.price) / 30;
  return product.averageRating * 24 + product.reviewCount * 2 + priceRelief;
}

function getSimilarityScore(reference: Product, candidate: Product) {
  const priceGap = Math.abs(reference.price - candidate.price);
  const priceAffinity = Math.max(0, 28 - (priceGap / Math.max(reference.price, 1)) * 30);
  return (
    (candidate.categoryId === reference.categoryId ? 48 : 0) +
    (candidate.sellerId === reference.sellerId ? 18 : 0) +
    candidate.averageRating * 9 +
    Math.min(candidate.reviewCount, 18) +
    priceAffinity
  );
}

function getCrossSellScore(reference: Product, candidate: Product) {
  const priceGap = Math.abs(reference.price - candidate.price);
  const priceAffinity = Math.max(0, 30 - (priceGap / Math.max(reference.price, 1)) * 24);
  return (
    (candidate.categoryId !== reference.categoryId ? 20 : 6) +
    (candidate.sellerId !== reference.sellerId ? 16 : 4) +
    candidate.averageRating * 10 +
    Math.min(candidate.reviewCount, 16) +
    priceAffinity +
    Math.min(candidate.stock, 14)
  );
}

export function orderCategories(categories: Category[]) {
  const categoryByName = new Map(categories.map((category) => [category.name, category]));
  const ordered = PRIMARY_CATEGORY_ORDER.flatMap((name) => {
    const category = categoryByName.get(name);
    return category ? [category] : [];
  });
  const usedIds = new Set(ordered.map((category) => category.id));
  const remaining = sortByName(categories.filter((category) => !usedIds.has(category.id)));

  return [...ordered, ...remaining];
}

export function getTrendingProducts(products: Product[], limit = 8) {
  return [...products]
    .sort((left, right) => getMomentumScore(right) - getMomentumScore(left) || right.reviewCount - left.reviewCount || left.price - right.price)
    .slice(0, limit);
}

export function getDealProducts(products: Product[], limit = 8) {
  return [...products]
    .filter((product) => product.stock > 0)
    .sort((left, right) => getDealScore(right) - getDealScore(left) || left.price - right.price || right.reviewCount - left.reviewCount)
    .slice(0, limit);
}

export function getTopSellers(products: Product[], limit = 4): SellerSpotlight[] {
  const sellerMap = new Map<string, SellerSpotlight>();

  for (const product of products) {
    const existing = sellerMap.get(product.sellerId);

    if (!existing) {
      sellerMap.set(product.sellerId, {
        sellerId: product.sellerId,
        sellerName: product.sellerName,
        productCount: 1,
        averageRating: product.averageRating,
        reviewCount: product.reviewCount,
        startingPrice: product.price,
        heroProduct: product
      });
      continue;
    }

    const productCount = existing.productCount + 1;
    const weightedRating =
      (existing.averageRating * existing.productCount + product.averageRating) / productCount;

    existing.productCount = productCount;
    existing.averageRating = weightedRating;
    existing.reviewCount += product.reviewCount;
    existing.startingPrice = Math.min(existing.startingPrice, product.price);

    if (getMomentumScore(product) > getMomentumScore(existing.heroProduct)) {
      existing.heroProduct = product;
    }
  }

  return [...sellerMap.values()]
    .sort(
      (left, right) =>
        right.reviewCount + right.productCount * 8 - (left.reviewCount + left.productCount * 8) ||
        right.averageRating - left.averageRating
    )
    .slice(0, limit);
}

export function buildBadgeMap(products: Product[]) {
  const badgeMap = new Map<string, StoreBadge[]>();
  const bestSellerIds = new Set(getTopSellers(products, 4).map((seller) => seller.heroProduct.id));
  const trendingIds = new Set(getTrendingProducts(products, 10).map((product) => product.id));

  for (const product of products) {
    const badges: StoreBadge[] = [];

    if (bestSellerIds.has(product.id)) {
      badges.push("bestSeller");
    }

    if (trendingIds.has(product.id) && badges.length < 2) {
      badges.push("trending");
    }

    if (product.stock > 0 && product.stock <= 8 && badges.length < 2) {
      badges.push("limitedStock");
    }

    badgeMap.set(product.id, badges);
  }

  return badgeMap;
}

export function buildStorefrontCollections(products: Product[]): StorefrontCollections {
  return {
    trending: getTrendingProducts(products, 8),
    deals: getDealProducts(products, 8),
    topSellers: getTopSellers(products, 4),
    badgeMap: buildBadgeMap(products)
  };
}

export function getProductBadges(product: Product, badgeMap: Map<string, StoreBadge[]>) {
  return badgeMap.get(product.id) ?? [];
}

export function getStoreBadgeTone(badge: StoreBadge) {
  switch (badge) {
    case "bestSeller":
      return "highlight" as const;
    case "trending":
      return "signal" as const;
    default:
      return "neutral" as const;
  }
}

export function getStoreBadgeLabel(badge: StoreBadge) {
  return i18n.t(`product.badges.${badge}`);
}

export function getRelatedProducts(reference: Product, products: Product[], limit = 8) {
  return [...products]
    .filter((candidate) => candidate.id !== reference.id)
    .sort((left, right) => getSimilarityScore(reference, right) - getSimilarityScore(reference, left))
    .slice(0, limit);
}

export function getCustomersAlsoBought(reference: Product, products: Product[], limit = 8) {
  return [...products]
    .filter((candidate) => candidate.id !== reference.id)
    .sort((left, right) => getCrossSellScore(reference, right) - getCrossSellScore(reference, left))
    .slice(0, limit);
}

export function getRatingLabel(product: Pick<Product, "averageRating" | "reviewCount">) {
  if (product.reviewCount <= 0) {
    return i18n.t("product.ratingNew");
  }

  return i18n.t("product.ratingLabel", {
    rating: product.averageRating.toFixed(1),
    count: product.reviewCount
  });
}
