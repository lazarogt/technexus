import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { env } from "../utils/config";
import { logger } from "../utils/logger";

export type EmailDeliveryResult =
  | { status: "sent" }
  | { status: "disabled" }
  | { status: "failed"; errorMessage: string; errorCode?: string };

let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;
let initialized = false;
let enabled = false;

const createTransport = () =>
  nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });

export const initializeEmailService = async () => {
  if (initialized) {
    return enabled;
  }

  initialized = true;

  if (!env.EMAIL_ENABLED) {
    enabled = false;
    logger.info("Email delivery disabled by configuration");
    return enabled;
  }

  transporter = createTransport();

  try {
    await transporter.verify();
    enabled = true;
    logger.info("SMTP transport verified");
  } catch (error) {
    enabled = false;
    logger.error(
      { error: error instanceof Error ? error.message : "Unknown SMTP error" },
      "SMTP verification failed"
    );
  }

  return enabled;
};

export const sendEmail = async (input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) => {
  await initializeEmailService();

  if (!enabled || !transporter || !input.to.trim()) {
    return { status: "disabled" } satisfies EmailDeliveryResult;
  }

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text
    });

    return { status: "sent" } satisfies EmailDeliveryResult;
  } catch (error) {
    return {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown email delivery error",
      errorCode:
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : undefined
    } satisfies EmailDeliveryResult;
  }
};
