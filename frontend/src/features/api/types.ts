export type UserRole = "admin" | "seller" | "customer";
export type OrderStatus = "pending" | "paid" | "shipped" | "delivered";
export type OutboxStatus = "pending" | "sent" | "failed";

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type Category = {
  id: string;
  name: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  categoryName: string;
  sellerId: string;
  sellerName: string;
  averageRating: number;
  reviewCount: number;
  images: string[];
  reviews?: ProductReview[];
};

export type ProductReview = {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type ProductListResponse = {
  products: Product[];
  pagination: PaginationMeta;
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isBlocked: boolean;
  createdAt: string;
};

export type AuthResponse = {
  token: string;
  user: PublicUser;
};

export type GuestResponse = {
  token: string;
  guestSessionId: string;
  expiresAt: string;
};

export type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  productName: string;
  productDescription: string;
  productPrice: number;
  productStock: number;
  productImages: string[];
  categoryId: string;
  categoryName: string;
  sellerId: string;
  sellerName: string;
  subtotal: number;
};

export type CartSummary = {
  items: CartItem[];
  total: number;
};

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  productDescription: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  quantity: number;
  price: number;
  subtotal: number;
  images: string[];
};

export type OrderRecord = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  shippingAddress: string | null;
  shippingCost: number;
  paymentMethod: "cash_on_delivery";
  total: number;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
};

export type OrderListResponse = {
  orders: OrderRecord[];
  pagination: PaginationMeta;
};

export type InventoryRecord = {
  id: string;
  productId: string;
  locationId: string;
  locationName: string;
  quantity: number;
  lowStockThreshold: number;
  updatedAt: string;
};

export type InventoryByProduct = {
  productId: string;
  stock: number;
  inventories: InventoryRecord[];
};

export type InventoryAlert = {
  id: string;
  productId: string;
  productName: string;
  sellerId: string;
  inventoryId: string;
  locationId: string;
  locationName: string;
  triggeredQty: number;
  threshold: number;
  createdAt: string;
};

export type UserListResponse = {
  users: PublicUser[];
  pagination: PaginationMeta;
};

export type DashboardMetrics = {
  email_outbox_total: number;
  email_outbox_pending: number;
  email_outbox_failed: number;
  email_outbox_sent: number;
};

export type AnalyticsRange = "24h" | "7d" | "30d";

export type AnalyticsProductMetric = {
  productId: string;
  productName: string;
  count: number;
};

export type AnalyticsRecentEvent = {
  id: string;
  event: string;
  userId: string | null;
  sessionId: string;
  createdAt: string;
  data: Record<string, unknown> | null;
};

export type AnalyticsOverview = {
  provider: "internal" | "posthog";
  range: AnalyticsRange;
  generatedAt: string;
  totalSessions: number;
  funnel: {
    viewHome: number;
    viewProduct: number;
    addToCart: number;
    viewCart: number;
    startCheckout: number;
    completeOrder: number;
    addToCartRate: number;
    checkoutCompletionRate: number;
    cartViewRate: number;
  };
  topProducts: {
    views: AnalyticsProductMetric[];
    carts: AnalyticsProductMetric[];
  };
  recentEvents: AnalyticsRecentEvent[];
};

export type WorkerHealth = {
  isStarted: boolean;
  isProcessing: boolean;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastProcessedAt: string | null;
  lastError: string | null;
  lastProcessedCount: number;
  processedJobsCount: number;
  failedJobsCount: number;
  lastRunDurationMs: number | null;
  startedAt: string | null;
  uptimeSeconds: number;
  secondsSinceLastRun: number;
  status: "healthy" | "degraded" | "down";
};

export type OutboxRow = {
  id: string;
  orderId: string;
  recipientType: "buyer" | "seller";
  recipientEmail: string;
  sellerId: string | null;
  subject: string;
  status: OutboxStatus;
  attempts: number;
  lastError: string | null;
  nextAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OutboxOverview = {
  metrics: DashboardMetrics;
  rows: OutboxRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  filters: {
    status: OutboxStatus | null;
    from: string | null;
    to: string | null;
    retryCount: number | null;
  };
  alerts: string[];
};

export type AdminMetricsResponse = {
  metrics: DashboardMetrics;
  orders: OrderListResponse;
  products: ProductListResponse;
  users: UserListResponse;
  alerts: InventoryAlert[];
};

export type ProductPayload = {
  name: string;
  description: string;
  price: number | string;
  stock: number | string;
  categoryId: string;
  sellerId?: string;
  imageUrls: string[];
  files: File[];
};

export type ProductFilters = {
  page?: number;
  limit?: number;
  categoryId?: string;
  sellerId?: string;
  search?: string;
  sort?: string;
  includeDeleted?: boolean;
};
