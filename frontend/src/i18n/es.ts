import type { OrderStatus, UserRole } from "@/features/api/types";
import i18n from "@/i18n";

const translate = (key: string, options?: Record<string, unknown>) =>
  i18n.t(key, options) as string;

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  customer: translate("auth.customer"),
  seller: translate("auth.seller"),
  admin: "Administrador"
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  shipped: "Enviado",
  delivered: "Entregado"
};

export const ES = {
  buttons: {
    get addToCart() {
      return translate("buttons.addToCart");
    },
    get buyNow() {
      return translate("buttons.buyNow");
    },
    get checkout() {
      return translate("buttons.checkout");
    },
    get continue() {
      return translate("buttons.continue");
    },
    get continueToReview() {
      return translate("buttons.continueToReview");
    },
    get goToConfirmation() {
      return translate("buttons.goToConfirmation");
    },
    get confirmOrder() {
      return translate("buttons.confirmOrder");
    },
    get viewCart() {
      return translate("buttons.viewCart");
    },
    get viewCatalog() {
      return translate("buttons.viewCatalog");
    },
    get viewAll() {
      return translate("buttons.viewAll");
    },
    get viewOffers() {
      return translate("buttons.viewOffers");
    },
    get viewDetail() {
      return translate("buttons.viewDetail");
    },
    get viewFeaturedProducts() {
      return translate("buttons.viewFeaturedProducts");
    },
    get openFullCatalog() {
      return translate("buttons.openFullCatalog");
    },
    get keepShopping() {
      return translate("buttons.keepShopping");
    },
    get search() {
      return translate("buttons.search");
    },
    get close() {
      return translate("buttons.close");
    },
    get remove() {
      return translate("buttons.remove");
    },
    get logout() {
      return translate("buttons.logout");
    },
    get createAccount() {
      return translate("buttons.createAccount");
    },
    get signIn() {
      return translate("buttons.signIn");
    },
    get save() {
      return translate("buttons.save");
    },
    get clear() {
      return translate("buttons.clear");
    }
  },
  nav: {
    get main() {
      return translate("nav.main");
    },
    get account() {
      return translate("nav.account");
    },
    get orders() {
      return translate("nav.orders");
    },
    get cart() {
      return translate("nav.cart");
    },
    get exploreCategories() {
      return translate("nav.exploreCategories");
    },
    get allDepartments() {
      return translate("nav.allDepartments");
    }
  },
  labels: {
    get total() {
      return translate("labels.total");
    },
    get quantity() {
      return translate("labels.quantity");
    },
    get price() {
      return translate("labels.price");
    },
    get shipping() {
      return translate("labels.shipping");
    },
    get summary() {
      return translate("labels.summary");
    },
    get filters() {
      return translate("labels.filters");
    },
    get sort() {
      return translate("labels.sort");
    },
    get minPrice() {
      return translate("labels.minPrice");
    },
    get maxPrice() {
      return translate("labels.maxPrice");
    },
    get review() {
      return translate("labels.review");
    },
    get confirmation() {
      return translate("labels.confirmation");
    },
    get contact() {
      return translate("labels.contact");
    },
    get status() {
      return translate("labels.status");
    },
    get role() {
      return translate("labels.role");
    },
    get user() {
      return translate("labels.user");
    },
    get guest() {
      return translate("labels.guest");
    },
    get name() {
      return translate("labels.name");
    },
    get email() {
      return translate("labels.email");
    },
    get password() {
      return translate("labels.password");
    },
    get phone() {
      return translate("labels.phone");
    },
    get shippingAddress() {
      return translate("labels.shippingAddress");
    },
    get shippingCost() {
      return translate("labels.shippingCost");
    },
    get category() {
      return translate("labels.category");
    },
    get product() {
      return translate("labels.product");
    },
    get products() {
      return translate("labels.products");
    }
  },
  auth: {
    get loginEyebrow() {
      return translate("auth.loginEyebrow");
    },
    get loginTitle() {
      return translate("auth.loginTitle");
    },
    get registerEyebrow() {
      return translate("auth.registerEyebrow");
    },
    get registerTitle() {
      return translate("auth.registerTitle");
    },
    get noAccount() {
      return translate("auth.noAccount");
    },
    get alreadyHaveAccount() {
      return translate("auth.alreadyHaveAccount");
    },
    get accountType() {
      return translate("auth.accountType");
    }
  },
  search: {
    get placeholder() {
      return translate("search.placeholder");
    },
    get catalogPlaceholder() {
      return translate("search.catalogPlaceholder");
    },
    get ariaLabel() {
      return translate("search.ariaLabel");
    }
  },
  cart: {
    get updating() {
      return translate("cart.updating");
    },
    get quickPurchase() {
      return translate("cart.quickPurchase");
    },
    get emptyTitle() {
      return translate("cart.emptyTitle");
    },
    get emptyDescription() {
      return translate("cart.emptyDescription");
    },
    get emptySheetDescription() {
      return translate("cart.emptySheetDescription");
    },
    addedToCart(productName: string) {
      return translate("cart.addedToCart", { productName });
    },
    get toastTitle() {
      return translate("cart.toastTitle");
    },
    toastDescription(productName?: string) {
      return productName
        ? translate("cart.toastDescriptionNamed", { productName })
        : translate("cart.toastDescriptionFallback");
    },
    get secureDelivery() {
      return translate("cart.secureDelivery");
    }
  },
  product: {
    soldBy(sellerName: string) {
      return translate("product.soldBy", { sellerName });
    },
    get buyBoxEyebrow() {
      return translate("product.buyBoxEyebrow");
    },
    get deliveryTitle() {
      return translate("product.deliveryTitle");
    },
    get deliveryEta() {
      return translate("product.deliveryEta");
    },
    get trackingIncluded() {
      return translate("product.trackingIncluded");
    },
    get secureInventory() {
      return translate("product.secureInventory");
    },
    get noReviews() {
      return translate("product.noReviews");
    },
    get noReviewsDescription() {
      return translate("product.noReviewsDescription");
    },
    get trustPoints() {
      return i18n.t("product.trustPoints", { returnObjects: true }) as string[];
    },
    get buyBoxTrustPoints() {
      return i18n.t("product.buyBoxTrustPoints", { returnObjects: true }) as string[];
    },
    get liveCatalogNote() {
      return translate("product.liveCatalogNote");
    }
  },
  checkout: {
    steps: {
      get shipping() {
        return translate("checkout.steps.shipping");
      },
      get review() {
        return translate("checkout.steps.review");
      },
      get confirmation() {
        return translate("checkout.steps.confirmation");
      }
    },
    get title() {
      return translate("checkout.title");
    },
    get description() {
      return translate("checkout.description");
    },
    get accountBanner() {
      return translate("checkout.accountBanner");
    },
    get noProductsTitle() {
      return translate("checkout.noProductsTitle");
    },
    get noProductsDescription() {
      return translate("checkout.noProductsDescription");
    },
    get successEyebrow() {
      return translate("checkout.successEyebrow");
    },
    successTitle(orderId: string) {
      return translate("checkout.successTitle", { orderCode: orderId.slice(0, 8) });
    },
    get successDescription() {
      return translate("checkout.successDescription");
    },
    get confirmedTotal() {
      return translate("checkout.confirmedTotal");
    },
    get fallbackAddress() {
      return translate("checkout.fallbackAddress");
    },
    get readyToConfirm() {
      return translate("checkout.readyToConfirm");
    },
    get readyToConfirmDescription() {
      return translate("checkout.readyToConfirmDescription");
    },
    get noPhone() {
      return translate("checkout.noPhone");
    },
    get paymentMethod() {
      return translate("checkout.paymentMethod");
    },
    get summaryTitle() {
      return translate("checkout.summaryTitle");
    },
    get primaryAction() {
      return translate("checkout.primaryAction");
    },
    get primaryActionDescription() {
      return translate("checkout.primaryActionDescription");
    }
  },
  dashboard: {
    get sellerWorkspace() {
      return translate("dashboard.sections.seller.title");
    },
    get adminControlCenter() {
      return translate("dashboard.sections.admin.title");
    },
    get analytics() {
      return translate("dashboard.analytics");
    },
    get localAnalytics() {
      return translate("dashboard.localAnalytics");
    }
  }
} as const;

export function getProductCountLabel(count: number) {
  return translate("dashboard.productManagement.productCountTitle", { count });
}

export function getUserRoleLabel(role: UserRole) {
  return USER_ROLE_LABELS[role];
}

export function getOrderStatusLabel(status: OrderStatus) {
  return ORDER_STATUS_LABELS[status];
}
