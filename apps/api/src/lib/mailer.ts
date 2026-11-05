import nodemailer, { Transporter } from "nodemailer";

/** Escapes user-supplied strings before embedding them in HTML email bodies. */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

let _transporter: Transporter | null = null;
let _alertTransporter: Transporter | null = null;

function buildTransport(user: string, pass: string): Transporter {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    // secure=true → SMTPS (port 465). Set SMTP_SECURE=false for port 587 STARTTLS.
    secure: process.env.SMTP_SECURE !== "false",
    auth: { user, pass },
  });
}

/**
 * Returns a cached Nodemailer SMTP transporter for user-facing notifications.
 * Configured from SMTP_USER / SMTP_PASS. Returns null when not set.
 */
export function getMailTransporter(): Transporter | null {
  if (_transporter) return _transporter;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;

  _transporter = buildTransport(user, pass);
  return _transporter;
}

/**
 * Returns a cached Nodemailer SMTP transporter for developer alert emails.
 * Uses ALERT_SMTP_USER / ALERT_SMTP_PASS if set; falls back to the primary
 * transporter credentials when the alert address shares the same SMTP account.
 */
export function getAlertTransporter(): Transporter | null {
  if (_alertTransporter) return _alertTransporter;

  const user = process.env.ALERT_SMTP_USER ?? process.env.SMTP_USER;
  const pass = process.env.ALERT_SMTP_PASS ?? process.env.SMTP_PASS;
  if (!user || !pass) return null;

  const alertUser = process.env.ALERT_SMTP_USER;
  if (alertUser) {
    _alertTransporter = buildTransport(user, pass);
  } else {
    // Reuse the primary transporter — same SMTP credentials.
    _alertTransporter = getMailTransporter();
  }
  return _alertTransporter;
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends a user-facing transactional email (notifications, OTP, welcome, etc.)
 * using the primary SMTP account. FROM address is EMAIL_FROM env var, which
 * should be set to noreply@<domain>.
 *
 * - Swallows SMTP errors so a transport failure never blocks an auth or
 *   notification flow.
 * - In non-production: always prints email details to stdout so developers can
 *   read OTP codes without a real inbox.
 *
 * Security: `opts` is always assembled from server-controlled code. No
 * user-supplied value is spread at the sendMail call site, preventing
 * envelope-key injection (CVE-2025-NNNN-style attacks).
 */
export async function sendTransactionalEmail(opts: SendEmailOptions): Promise<void> {
  const from = process.env.EMAIL_FROM || "GEM <noreply@example.com>";
  const transporter = getMailTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({ from, ...opts });
    } catch (err) {
      console.error("[mailer] SMTP send failed", {
        to: opts.to,
        subject: opts.subject,
        error: (err as Error).message,
      });
    }
  } else {
    console.warn("[mailer] sendTransactionalEmail called but SMTP is not configured");
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[mailer:dev]", { to: opts.to, subject: opts.subject, text: opts.text });
  }
}

/**
 * Sends a developer alert email (error reports, admin alerts, etc.)
 * using the alert SMTP account. FROM address is ALERT_EMAIL_FROM env var,
 * which should be set to devalert@<domain>.
 *
 * Falls back gracefully: if ALERT_EMAIL_FROM is not set, uses EMAIL_FROM.
 * If ALERT_SMTP_USER/PASS are not set, reuses the primary SMTP credentials.
 */
export async function sendAlertEmail(opts: SendEmailOptions): Promise<void> {
  const from = process.env.ALERT_EMAIL_FROM ?? process.env.EMAIL_FROM ?? "GEM Alerts <devalert@example.com>";
  const transporter = getAlertTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({ from, ...opts });
    } catch (err) {
      console.error("[mailer] alert SMTP send failed", {
        to: opts.to,
        subject: opts.subject,
        error: (err as Error).message,
      });
    }
  } else {
    console.warn("[mailer] sendAlertEmail called but SMTP is not configured");
  }
}

/**
 * Verify SMTP connectivity. Call once at startup; logs result but never throws.
 */
export async function verifyMailTransporter(): Promise<void> {
  const transporter = getMailTransporter();
  if (!transporter) {
    console.info("[mailer] SMTP not configured — notification emails disabled");
    return;
  }
  try {
    await transporter.verify();
    console.info("[mailer] SMTP connection verified OK");
  } catch (err) {
    console.error("[mailer] SMTP verify failed — emails will not be delivered:", (err as Error).message);
  }
}
