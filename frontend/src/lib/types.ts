export type UserRole = "customer" | "seller" | "admin";
export type OrderStatus = "pending" | "paid" | "shipped" | "delivered";
export type AdminTab = "users" | "sellers" | "products" | "orders" | "ops";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isBlocked?: boolean;
  createdAt?: string;
};

export type ManagedUser = UserProfile & {
  isBlocked: boolean;
  createdAt?: string;
};

export type ManagedUserDraft = {
  name: string;
  email: string;
  role: UserRole;
  isBlocked: boolean;
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
  images: string[];
};

export type CatalogSort =
  | "latest"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "name-desc";

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

export type GroupedCartSeller = {
  sellerId: string;
  sellerName: string;
  items: CartItem[];
  subtotal: number;
};

export type GuestCheckoutForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

export type CheckoutPayload = {
  buyerPhone: string;
  shippingAddress: string;
  shippingCost: number;
};

export type CheckoutResponse = {
  message: string;
  order: Order;
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

export type Order = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string | null;
  shippingAddress?: string | null;
  shippingCost?: number | null;
  paymentMethod?: string | null;
  total: number;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
};

export type EmailOutboxStatus = "pending" | "sent" | "failed";

export type EmailOutboxMetrics = {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  retrying: number;
  oldestPendingAgeSeconds: number | null;
  failedAttemptsCount: number;
  failedLastFiveMinutes: number;
};

export type AlertRecord = {
  code: "failed-emails-threshold" | "pending-emails-threshold" | "worker-inactive";
  severity: "warning" | "critical";
  message: string;
  triggeredAt: string;
  context: Record<string, unknown>;
};

export type EmailOutboxFilters = {
  status: EmailOutboxStatus | null;
  from: string | null;
  to: string | null;
  retryCount: number | null;
};

export type EmailOutboxPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type EmailOutboxRow = {
  id: string;
  orderId: string;
  recipientType: "buyer" | "seller";
  recipientEmail: string;
  sellerId: string | null;
  subject: string;
  status: EmailOutboxStatus;
  attempts: number;
  lastError: string | null;
  nextAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmailOutboxOverview = {
  metrics: EmailOutboxMetrics;
  rows: EmailOutboxRow[];
  pagination: EmailOutboxPagination;
  filters: EmailOutboxFilters;
  alerts: AlertRecord[];
};

export type EmailOutboxWorkerHealth = {
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

export type MetricsSnapshot = {
  email_outbox_total: number;
  email_outbox_pending: number;
  email_outbox_failed: number;
  email_outbox_sent: number;
  email_send_success_total: number;
  email_send_failure_total: number;
  email_retry_total: number;
  worker_uptime_seconds: number;
  avg_email_processing_time_ms: number;
};

export type AuthResponse = {
  token: string;
  user: UserProfile;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type CategoryListResponse = {
  categories: Category[];
  pagination: PaginationMeta;
};

export type ProductListResponse = {
  products: Product[];
  pagination: PaginationMeta;
};

export type OrderListResponse = {
  orders: Order[];
  pagination: PaginationMeta;
};

export type MessageRecord = {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderRole: UserRole;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  recipientRole: UserRole;
  orderId: string | null;
  subject: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type MessageListResponse = {
  messages: MessageRecord[];
  unreadCount: number;
};

export type MessageContact = {
  id: string;
  name: string;
  role: UserRole;
  email: string;
};

export type SellerSummary = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  productCount: number;
  activeListings: number;
  orderCount: number;
  revenue: number;
};

export const tokenStorageKey = "technexus_auth_token";

export const defaultRegisterForm = {
  name: "",
  email: "",
  password: "",
  role: "customer" as Exclude<UserRole, "admin">
};

export const defaultLoginForm = {
  email: "",
  password: ""
};

export const defaultCategoryForm = {
  name: ""
};

export const defaultProductForm = {
  name: "",
  description: "",
  price: "",
  stock: "",
  categoryId: ""
};

export const defaultGuestCheckoutForm: GuestCheckoutForm = {
  name: "",
  email: "",
  phone: "",
  address: ""
};

export const defaultMessageForm = {
  recipientId: "",
  orderId: "",
  subject: "",
  body: ""
};

export const emptyCart: CartSummary = {
  items: [],
  total: 0
};

export const emptyPagination: PaginationMeta = {
  page: 1,
  pageSize: 1,
  total: 0,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false
};

export const statusLabelMap: Record<OrderStatus, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  shipped: "Enviado",
  delivered: "Entregado"
};

export const adminTabLabelMap: Record<AdminTab, string> = {
  users: "Usuarios",
  sellers: "Vendedores",
  products: "Productos",
  orders: "Pedidos",
  ops: "Ops"
};

export const catalogSortOptions: Array<{ value: CatalogSort; label: string }> = [
  { value: "latest", label: "Mas recientes" },
  { value: "price-asc", label: "Precio: menor a mayor" },
  { value: "price-desc", label: "Precio: mayor a menor" },
  { value: "name-asc", label: "Nombre: A-Z" },
  { value: "name-desc", label: "Nombre: Z-A" }
];
