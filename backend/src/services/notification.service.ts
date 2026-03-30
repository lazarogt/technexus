type EmailOrderItem = {
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

export type EmailOrderRecord = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string | null;
  shippingAddress?: string | null;
  shippingCost?: number | null;
  paymentMethod?: string | null;
  total: number;
  status: "pending" | "paid" | "shipped" | "delivered";
  createdAt: string;
  items: EmailOrderItem[];
};

type SellerGroup = {
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  items: EmailOrderItem[];
  subtotal: number;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

const orderStatusLabels = {
  pending: "Pending",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered"
} as const;

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const buildEmailLayout = (input: {
  eyebrow: string;
  title: string;
  intro: string;
  content: string;
}) => `
  <div style="background:#f3f6fb;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#132238;">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #dfe8f1;border-radius:18px;overflow:hidden;">
      <div style="padding:24px 24px 8px;">
        <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:#e8f3ff;color:#0e5277;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
          ${escapeHtml(input.eyebrow)}
        </div>
        <h1 style="margin:16px 0 10px;font-size:26px;line-height:1.2;">${escapeHtml(input.title)}</h1>
        <p style="margin:0;color:#4a6279;line-height:1.6;">${escapeHtml(input.intro)}</p>
      </div>
      <div style="padding:20px 24px 28px;line-height:1.65;color:#17314b;">
        ${input.content}
      </div>
    </div>
  </div>
`;

const renderDefinitionList = (rows: Array<{ label: string; value: string }>) => `
  <table style="width:100%;border-collapse:collapse;margin:0 0 16px;">
    <tbody>
      ${rows
        .map(
          (row) => `
            <tr>
              <td style="padding:6px 0;color:#5a7289;width:180px;vertical-align:top;">${escapeHtml(row.label)}</td>
              <td style="padding:6px 0;color:#17314b;font-weight:700;">${escapeHtml(row.value)}</td>
            </tr>
          `
        )
        .join("")}
    </tbody>
  </table>
`;

const renderItemsTable = (items: EmailOrderItem[]) => `
  <table style="width:100%;border-collapse:collapse;margin:16px 0 20px;">
    <thead style="background:#132238;color:#f7fbff;">
      <tr>
        <th style="padding:12px;text-align:left;">Product</th>
        <th style="padding:12px;text-align:center;">Qty</th>
        <th style="padding:12px;text-align:right;">Unit</th>
        <th style="padding:12px;text-align:right;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map(
          (item) => `
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #e7edf4;">${escapeHtml(item.productName)}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e7edf4;text-align:center;">${item.quantity}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e7edf4;text-align:right;">${currencyFormatter.format(item.price)}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e7edf4;text-align:right;">${currencyFormatter.format(item.subtotal)}</td>
            </tr>
          `
        )
        .join("")}
    </tbody>
  </table>
`;

export const groupOrderItemsBySeller = (order: EmailOrderRecord): SellerGroup[] => {
  const groups = new Map<string, SellerGroup>();

  for (const item of order.items) {
    const existing = groups.get(item.sellerId);

    if (existing) {
      existing.items.push(item);
      existing.subtotal += item.subtotal;
      continue;
    }

    groups.set(item.sellerId, {
      sellerId: item.sellerId,
      sellerName: item.sellerName,
      sellerEmail: item.sellerEmail,
      items: [item],
      subtotal: item.subtotal
    });
  }

  return Array.from(groups.values());
};

export const buildBuyerOrderEmail = (order: EmailOrderRecord) => {
  const html = buildEmailLayout({
    eyebrow: "Order Confirmed",
    title: `TechNexus order confirmed #${order.id}`,
    intro: "Your order was created successfully. Payment will be collected on delivery.",
    content: `
      ${renderDefinitionList([
        { label: "Order ID", value: order.id },
        { label: "Order date", value: new Date(order.createdAt).toLocaleString("en-US") },
        { label: "Buyer", value: order.userName },
        { label: "Buyer email", value: order.userEmail },
        ...(order.userPhone ? [{ label: "Phone", value: order.userPhone }] : []),
        ...(order.shippingAddress
          ? [{ label: "Shipping address", value: order.shippingAddress }]
          : []),
        ...(typeof order.shippingCost === "number"
          ? [{ label: "Shipping cost", value: currencyFormatter.format(order.shippingCost) }]
          : []),
        { label: "Order total", value: currencyFormatter.format(order.total) }
      ])}
      ${renderItemsTable(order.items)}
    `
  });

  const text = [
    `TechNexus order confirmed #${order.id}`,
    `Order date: ${new Date(order.createdAt).toLocaleString("en-US")}`,
    `Buyer: ${order.userName}`,
    `Buyer email: ${order.userEmail}`,
    order.userPhone ? `Phone: ${order.userPhone}` : null,
    order.shippingAddress ? `Shipping address: ${order.shippingAddress}` : null,
    typeof order.shippingCost === "number"
      ? `Shipping cost: ${currencyFormatter.format(order.shippingCost)}`
      : null,
    "",
    "Items:",
    ...order.items.map(
      (item) =>
        `- ${item.productName} | qty ${item.quantity} | ${currencyFormatter.format(item.subtotal)}`
    ),
    "",
    `Order total: ${currencyFormatter.format(order.total)}`
  ]
    .filter(Boolean)
    .join("\n");

  return { html, text };
};

export const buildSellerOrderEmail = (order: EmailOrderRecord, sellerGroup: SellerGroup) => {
  const html = buildEmailLayout({
    eyebrow: "New Order",
    title: `TechNexus new order #${order.id}`,
    intro: `A customer placed an order that includes products from ${sellerGroup.sellerName}.`,
    content: `
      ${renderDefinitionList([
        { label: "Order ID", value: order.id },
        { label: "Order date", value: new Date(order.createdAt).toLocaleString("en-US") },
        { label: "Buyer", value: order.userName },
        ...(order.userPhone ? [{ label: "Buyer phone", value: order.userPhone }] : []),
        ...(order.shippingAddress
          ? [{ label: "Shipping address", value: order.shippingAddress }]
          : []),
        { label: "Seller subtotal", value: currencyFormatter.format(sellerGroup.subtotal) }
      ])}
      ${renderItemsTable(sellerGroup.items)}
    `
  });

  const text = [
    `TechNexus new order #${order.id}`,
    `Order date: ${new Date(order.createdAt).toLocaleString("en-US")}`,
    `Buyer: ${order.userName}`,
    order.userPhone ? `Buyer phone: ${order.userPhone}` : null,
    order.shippingAddress ? `Shipping address: ${order.shippingAddress}` : null,
    "",
    "Your items:",
    ...sellerGroup.items.map(
      (item) =>
        `- ${item.productName} | qty ${item.quantity} | ${currencyFormatter.format(item.subtotal)}`
    ),
    "",
    `Seller subtotal: ${currencyFormatter.format(sellerGroup.subtotal)}`
  ]
    .filter(Boolean)
    .join("\n");

  return { html, text };
};

export const buildStatusUpdatedEmail = (
  order: EmailOrderRecord,
  previousStatus: EmailOrderRecord["status"]
) => {
  const html = buildEmailLayout({
    eyebrow: "Order Update",
    title: "Your order status changed",
    intro: `Your order moved from ${orderStatusLabels[previousStatus]} to ${orderStatusLabels[order.status]}.`,
    content: `
      ${renderDefinitionList([
        { label: "Order ID", value: order.id },
        { label: "Current status", value: orderStatusLabels[order.status] },
        { label: "Order total", value: currencyFormatter.format(order.total) }
      ])}
      ${renderItemsTable(order.items)}
    `
  });

  const text = [
    `Order ${order.id} status changed.`,
    `Previous status: ${orderStatusLabels[previousStatus]}`,
    `Current status: ${orderStatusLabels[order.status]}`,
    `Order total: ${currencyFormatter.format(order.total)}`
  ].join("\n");

  return { html, text };
};

