import type { Order, OrderItem } from "@prisma/client";

type OrderRecord = Order & {
  items: OrderItem[];
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
};

const shippingAddressToString = (shippingAddress: unknown): string | null => {
  if (!shippingAddress) {
    return null;
  }

  if (typeof shippingAddress === "string") {
    return shippingAddress;
  }

  if (
    typeof shippingAddress === "object" &&
    shippingAddress !== null &&
    "formatted" in shippingAddress &&
    typeof shippingAddress.formatted === "string"
  ) {
    return shippingAddress.formatted;
  }

  return JSON.stringify(shippingAddress);
};

export const toOrderDto = (order: OrderRecord) => ({
  id: order.id,
  userId: order.userId ?? order.guestSessionId ?? "",
  userName: order.buyerName || order.user?.name || "Guest",
  userEmail: order.buyerEmail || order.user?.email || "",
  userPhone: order.buyerPhone,
  shippingAddress: shippingAddressToString(order.shippingAddress),
  shippingCost: Number(order.shippingCost),
  paymentMethod: order.paymentMethod,
  total: Number(order.total),
  status: order.status,
  createdAt: order.createdAt.toISOString(),
  items: order.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    productDescription: item.productDescription,
    sellerId: item.sellerId,
    sellerName: item.sellerName,
    sellerEmail: item.sellerEmail,
    quantity: item.quantity,
    price: Number(item.price),
    subtotal: Number(item.subtotal),
    images: Array.isArray(item.images) ? item.images : []
  }))
});

