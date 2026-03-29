import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { createLogger, type ServiceName } from "./lib/logger";
import type { MessageRecord } from "./messages";
import type { OrderItemRecord, OrderRecord, OrderStatus } from "./orders";
import { recordEmailSendFailure, recordEmailSendSuccess } from "./services/metrics-service";

type MailTransport = {
  verify: () => Promise<unknown>;
  sendMail: (options: SMTPTransport.Options & {
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
  }) => Promise<unknown>;
};

type SellerGroup = {
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  items: OrderItemRecord[];
  subtotal: number;
};

export type EmailNotificationPayload = {
  orderId: string;
  recipientRole: "buyer" | "seller" | "customer" | "recipient";
  to: string;
  subject: string;
  html: string;
  text: string;
  sellerId?: string | null;
  service?: ServiceName;
};

export type EmailDeliveryResult =
  | { status: "sent" }
  | { status: "disabled" }
  | {
      status: "failed";
      errorCode?: string;
      errorMessage: string;
    };

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

const orderStatusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered"
};

const paymentMethodLabels: Record<string, string> = {
  cash_on_delivery: "Cash on delivery"
};

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT ?? 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD;
const smtpSecure = process.env.SMTP_SECURE === "true";
const fromAddress = process.env.SMTP_FROM ?? (smtpUser ? `TechNexus <${smtpUser}>` : "");

let mailTransport: MailTransport | null = null;
let emailEnabled = false;
let emailInitialized = false;
let transportFactory: () => MailTransport | null = createSmtpTransport;
const apiLogger = createLogger("api");
const emailWorkerLogger = createLogger("email-worker");

const escapeHtml = (value: string): string => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const nl2br = (value: string): string => {
  return escapeHtml(value).replaceAll("\n", "<br />");
};

const getMailerErrorCode = (error: unknown): string | undefined => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }

  return undefined;
};

const normalizeMailerErrorCode = (error: unknown): string | undefined => {
  const code = getMailerErrorCode(error);

  if (
    code &&
    ["ECONNECTION", "EAUTH", "ETIMEDOUT", "EDNS", "ESOCKET", "ERESPONSE"].includes(code)
  ) {
    return code;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "responseCode" in error &&
    typeof (error as { responseCode?: unknown }).responseCode === "number"
  ) {
    return "ERESPONSE";
  }

  return code;
};

const getDeliveryContactLines = (order: OrderRecord): string[] => {
  const lines = [
    `Buyer: ${order.userName}`,
    `Email: ${order.userEmail}`
  ];

  if (order.userPhone) {
    lines.push(`Phone: ${order.userPhone}`);
  }

  return lines;
};

const getPaymentMethodLabel = (paymentMethod?: string | null): string => {
  if (!paymentMethod) {
    return paymentMethodLabels.cash_on_delivery;
  }

  return paymentMethodLabels[paymentMethod] ?? paymentMethod;
};

const buildEmailLayout = (input: {
  eyebrow: string;
  title: string;
  intro: string;
  content: string;
}): string => {
  return `
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
};

const renderItemsTable = (items: OrderItemRecord[]): string => {
  const rows = items
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
    .join("");

  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0 20px;">
      <thead style="background:#132238;color:#f7fbff;">
        <tr>
          <th style="padding:12px;text-align:left;">Product</th>
          <th style="padding:12px;text-align:center;">Qty</th>
          <th style="padding:12px;text-align:right;">Unit</th>
          <th style="padding:12px;text-align:right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const renderDefinitionList = (rows: Array<{ label: string; value: string }>): string => {
  return `
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
};

export const groupOrderItemsBySeller = (order: OrderRecord): SellerGroup[] => {
  const groups = new Map<string, SellerGroup>();

  order.items.forEach((item) => {
    if (!groups.has(item.sellerId)) {
      groups.set(item.sellerId, {
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        sellerEmail: item.sellerEmail,
        items: [],
        subtotal: 0
      });
    }

    const currentGroup = groups.get(item.sellerId)!;
    currentGroup.items.push(item);
    currentGroup.subtotal += item.subtotal;
  });

  return Array.from(groups.values());
};

export const buildBuyerOrderEmail = (
  order: OrderRecord
): { html: string; text: string } => {
  const detailRows = [
    { label: "Order ID", value: order.id },
    { label: "Order date", value: new Date(order.createdAt).toLocaleString("en-US") },
    { label: "Buyer", value: order.userName },
    { label: "Buyer email", value: order.userEmail },
    ...(order.userPhone ? [{ label: "Phone", value: order.userPhone }] : []),
    ...(order.shippingAddress
      ? [{ label: "Shipping address", value: order.shippingAddress }]
      : []),
    { label: "Payment method", value: getPaymentMethodLabel(order.paymentMethod) },
    ...(typeof order.shippingCost === "number"
      ? [{ label: "Shipping cost", value: currencyFormatter.format(order.shippingCost) }]
      : []),
    { label: "Order total", value: currencyFormatter.format(order.total) }
  ];

  const html = buildEmailLayout({
    eyebrow: "Order Confirmed",
    title: `TechNexus order confirmed #${order.id}`,
    intro: "Your order was created successfully. Payment will be collected on delivery.",
    content: `
      ${renderDefinitionList(detailRows)}
      ${renderItemsTable(order.items)}
      <p style="margin:0;font-weight:700;">Total due on delivery: ${currencyFormatter.format(order.total)}</p>
    `
  });

  const text = [
    `TechNexus order confirmed #${order.id}`,
    `Order date: ${new Date(order.createdAt).toLocaleString("en-US")}`,
    ...getDeliveryContactLines(order),
    order.shippingAddress ? `Shipping address: ${order.shippingAddress}` : null,
    `Payment method: ${getPaymentMethodLabel(order.paymentMethod)}`,
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

export const buildSellerOrderEmail = (
  order: OrderRecord,
  sellerGroup: SellerGroup
): { html: string; text: string } => {
  const detailRows = [
    { label: "Order ID", value: order.id },
    { label: "Order date", value: new Date(order.createdAt).toLocaleString("en-US") },
    { label: "Buyer", value: order.userName },
    ...(order.userPhone ? [{ label: "Buyer phone", value: order.userPhone }] : []),
    ...(order.shippingAddress
      ? [{ label: "Shipping address", value: order.shippingAddress }]
      : []),
    { label: "Seller subtotal", value: currencyFormatter.format(sellerGroup.subtotal) }
  ];

  const html = buildEmailLayout({
    eyebrow: "New Order",
    title: `TechNexus new order #${order.id}`,
    intro: `A customer placed an order that includes products from ${sellerGroup.sellerName}.`,
    content: `
      ${renderDefinitionList(detailRows)}
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

const buildOrderStatusUpdatedEmail = (
  order: OrderRecord,
  previousStatus: OrderStatus
): { html: string; text: string } => {
  const html = buildEmailLayout({
    eyebrow: "Order Update",
    title: "Your order status changed",
    intro: `Your order moved from ${orderStatusLabels[previousStatus]} to ${orderStatusLabels[order.status]}.`,
    content: `
      ${renderDefinitionList([
        { label: "Order ID", value: order.id },
        { label: "Current status", value: orderStatusLabels[order.status] },
        { label: "Payment method", value: getPaymentMethodLabel(order.paymentMethod) },
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

function createSmtpTransport(): MailTransport | null {
  if (!smtpHost || !smtpUser || !fromAddress) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: smtpPass
      ? {
          user: smtpUser,
          pass: smtpPass
        }
      : undefined
  });
}

const ensureEmailService = async (): Promise<boolean> => {
  if (emailInitialized) {
    return emailEnabled;
  }

  emailInitialized = true;
  mailTransport = transportFactory();

  if (!mailTransport) {
    apiLogger.warn("Email service disabled: SMTP configuration is incomplete.");
    emailEnabled = false;
    return false;
  }

  try {
    await mailTransport.verify();
    emailEnabled = true;
    apiLogger.info("SMTP transport verified successfully.");
  } catch (error) {
    emailEnabled = false;
    apiLogger.error("SMTP transport verification failed. Email sending disabled.", {
      error: error instanceof Error ? error.message : "Unknown SMTP verify error"
    });
  }

  return emailEnabled;
};

export const deliverEmailNotification = async (
  input: EmailNotificationPayload
): Promise<EmailDeliveryResult> => {
  const logger = input.service === "email-worker" ? emailWorkerLogger : apiLogger;
  const isReady = await ensureEmailService();

  if (!isReady || !mailTransport || !input.to.trim()) {
    return { status: "disabled" };
  }

  try {
    await mailTransport.sendMail({
      from: fromAddress,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text
    });
    recordEmailSendSuccess();
    logger.info("Email notification sent", {
      orderId: input.orderId,
      recipientRole: input.recipientRole,
      recipientEmail: input.to,
      sellerId: input.sellerId ?? null
    });
    return { status: "sent" };
  } catch (error) {
    const errorCode = normalizeMailerErrorCode(error);
    recordEmailSendFailure();
    logger.error("Unable to send email notification", {
      orderId: input.orderId,
      recipientRole: input.recipientRole,
      recipientEmail: input.to,
      sellerId: input.sellerId ?? null,
      code: errorCode,
      message: error instanceof Error ? error.message : "Unknown email error"
    });
    return {
      status: "failed",
      errorCode,
      errorMessage: error instanceof Error ? error.message : "Unknown email error"
    };
  }
};

export const initEmailService = async (): Promise<boolean> => {
  return ensureEmailService();
};

export const sendOrderCreatedEmails = async (order: OrderRecord): Promise<void> => {
  const buyerEmail = buildBuyerOrderEmail(order);
  const sellerGroups = groupOrderItemsBySeller(order);

  const jobs: Promise<void>[] = [
    deliverEmailNotification({
      orderId: order.id,
      recipientRole: "buyer",
      to: order.userEmail,
      subject: `TechNexus order confirmed #${order.id}`,
      html: buyerEmail.html,
      text: buyerEmail.text
    }).then(() => undefined)
  ];

  sellerGroups.forEach((sellerGroup) => {
    if (!sellerGroup.sellerEmail.trim()) {
      return;
    }

    const sellerEmail = buildSellerOrderEmail(order, sellerGroup);

    jobs.push(
      deliverEmailNotification({
        orderId: order.id,
        recipientRole: "seller",
        to: sellerGroup.sellerEmail,
        subject: `TechNexus new order #${order.id}`,
        html: sellerEmail.html,
        text: sellerEmail.text,
        sellerId: sellerGroup.sellerId
      }).then(() => undefined)
    );
  });

  await Promise.allSettled(jobs);
};

export const sendOrderStatusUpdatedEmail = async (
  order: OrderRecord,
  previousStatus: OrderStatus
): Promise<void> => {
  const email = buildOrderStatusUpdatedEmail(order, previousStatus);

  await deliverEmailNotification({
    orderId: order.id,
    recipientRole: "buyer",
    to: order.userEmail,
    subject: `TechNexus order ${order.id.slice(0, 8)} is now ${orderStatusLabels[order.status]}`,
    html: email.html,
    text: email.text
  });
};

export const sendInternalMessageEmail = async (
  message: MessageRecord
): Promise<void> => {
  const html = buildEmailLayout({
    eyebrow: "New Message",
    title: `You received a message from ${message.senderName}`,
    intro: "There is a new internal conversation waiting for you inside TechNexus.",
    content: `
      <p style="margin:0 0 12px;"><strong>Subject:</strong> ${escapeHtml(message.subject)}</p>
      ${
        message.orderId
          ? `<p style="margin:0 0 12px;"><strong>Related order:</strong> ${escapeHtml(message.orderId)}</p>`
          : ""
      }
      <div style="padding:16px;border-radius:16px;background:#f6fbff;border:1px solid #e1edf6;">
        ${nl2br(message.body)}
      </div>
    `
  });

  await deliverEmailNotification({
    orderId: message.orderId ?? "message",
    recipientRole: "recipient",
    to: message.recipientEmail,
    subject: `TechNexus message: ${message.subject}`,
    html,
    text: `New message from ${message.senderName}: ${message.body}`
  });
};

export const __testUtils = {
  buildBuyerOrderEmail,
  buildSellerOrderEmail,
  groupOrderItemsBySeller,
  setTransport(transport: MailTransport | null, enabled = true) {
    mailTransport = transport;
    emailEnabled = enabled;
    emailInitialized = true;
  },
  setTransportFactory(factory: () => MailTransport | null) {
    transportFactory = factory;
  },
  reset() {
    mailTransport = null;
    emailEnabled = false;
    emailInitialized = false;
    transportFactory = createSmtpTransport;
  }
};
