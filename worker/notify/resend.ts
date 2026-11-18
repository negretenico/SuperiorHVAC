/** Email via the Resend HTTP API (https://resend.com/docs/api-reference/emails/send-email). */
import type { NotificationKind, Notifier, StoredBooking } from "../contracts";
import { messageFor, splitEmails } from "./messages";

export const RESEND_URL = "https://api.resend.com/emails";

interface SendEmail {
  apiKey: string;
  from: string;
  to: string[];
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  fetch: typeof fetch;
}

/** Resolves on 2xx; throws with status + Resend's message otherwise. */
export async function sendResendEmail(m: SendEmail): Promise<void> {
  const res = await m.fetch(RESEND_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${m.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: m.from,
      to: m.to,
      subject: m.subject,
      text: m.text,
      ...(m.html ? { html: m.html } : {}),
      ...(m.replyTo ? { reply_to: m.replyTo } : {}),
    }),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    throw new Error(`Resend HTTP ${res.status}: ${detail}`);
  }
}

export interface ResendNotifierConfig {
  apiKey: string;
  from: string;
  /** Reply-To for customer confirmations (REPLY_TO_EMAIL). */
  replyTo: string;
  /** OWNER_EMAIL, comma-separated allowed. */
  ownerEmail: string;
  fetch?: typeof fetch;
}

export class ResendNotifier implements Notifier {
  readonly id = "resend-email";
  readonly kinds: readonly NotificationKind[] = ["owner_alert", "customer_confirmation"];

  constructor(private readonly cfg: ResendNotifierConfig) {}

  async send(kind: NotificationKind, booking: StoredBooking): Promise<void> {
    const msg = messageFor(kind, booking);
    const toOwner = kind === "owner_alert";
    await sendResendEmail({
      apiKey: this.cfg.apiKey,
      from: this.cfg.from,
      to: toOwner ? splitEmails(this.cfg.ownerEmail) : [booking.email],
      // The owner replying to an alert should reach the customer.
      replyTo: toOwner ? booking.email : this.cfg.replyTo,
      ...msg,
      fetch: this.cfg.fetch ?? fetch,
    });
  }
}

export interface ResendOpsAlertConfig {
  apiKey: string;
  from: string;
  opsEmail: string;
  fetch?: typeof fetch;
}

/** CronDeps.alertOps backed by Resend: plain text to OPS_EMAIL. */
export function createResendOpsAlert(cfg: ResendOpsAlertConfig) {
  return (subject: string, body: string) =>
    sendResendEmail({
      apiKey: cfg.apiKey,
      from: cfg.from,
      to: splitEmails(cfg.opsEmail),
      subject: `[ops] ${subject}`,
      text: body,
      fetch: cfg.fetch ?? fetch,
    });
}
