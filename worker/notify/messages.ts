/**
 * Email content for each notification kind. Pure functions; business facts come only from
 * src/config/business.ts. All user-supplied text is escaped before it goes into HTML.
 */
import { business } from "../../src/config/business";
import type { TimeWindow } from "../../src/lib/booking";
import type { NotificationKind, StoredBooking } from "../contracts";

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  asap: "As soon as possible",
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** "+14195550142" → "419-555-0142" (same style as business.phoneDisplay). */
export function formatUsPhone(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : e164;
}

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
const serviceName = (slug: string) => business.services.find((s) => s.slug === slug)?.name ?? slug;
const timeLabel = (w: string) => TIME_WINDOW_LABELS[w as TimeWindow] ?? w;
const telLink = (e164: string, label: string) => `<a href="tel:${escapeHtml(e164)}">${escapeHtml(label)}</a>`;
const paragraphs = (s: string) => escapeHtml(s).replace(/\r?\n/g, "<br>");

function page(body: string): string {
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:16px;line-height:1.5;color:#1a1a1a">${body}</body></html>`;
}

/** Short, scannable alert for the owner. Reply goes to the customer. */
export function ownerAlert(b: StoredBooking): EmailContent {
  const service = serviceName(b.service);
  const phone = formatUsPhone(b.phone);
  const where = b.street ? `${b.street}, ${b.zip}` : `ZIP ${b.zip}`;
  const when = timeLabel(b.timeWindow);
  const issue = b.details || "(no details given)";

  const text = [
    `New service request`,
    ``,
    `Name:    ${b.name}`,
    `Service: ${service}`,
    `Phone:   ${phone}`,
    `When:    ${when}`,
    `Where:   ${where}`,
    `Email:   ${b.email}`,
    ``,
    `Issue:`,
    issue,
    ``,
    `Booking ${b.id}`,
  ].join("\n");

  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#555;vertical-align:top">${label}</td><td style="padding:4px 0"><strong>${value}</strong></td></tr>`;
  const html = page(
    `<h1 style="font-size:20px;margin:0 0 12px">New request: ${escapeHtml(service)}</h1>` +
      `<table style="border-collapse:collapse">` +
      row("Name", escapeHtml(b.name)) +
      row("Phone", telLink(b.phone, phone)) +
      row("When", escapeHtml(when)) +
      row("Where", escapeHtml(where)) +
      row("Email", escapeHtml(b.email)) +
      `</table>` +
      `<p style="margin:16px 0 4px;color:#555">Issue</p><p style="margin:0">${paragraphs(issue)}</p>` +
      `<p style="margin:24px 0 0;color:#777;font-size:13px">Booking ${escapeHtml(b.id)}</p>`,
  );

  return { subject: oneLine(`New request: ${service}, ${b.name}`), text, html };
}

/** Warm, plain confirmation for the customer. */
export function customerConfirmation(b: StoredBooking): EmailContent {
  const first = b.name.split(/\s+/)[0] || b.name;
  const service = serviceName(b.service);
  const when = timeLabel(b.timeWindow).toLowerCase();
  const custPhone = formatUsPhone(b.phone);

  const lines = [
    `Hi ${first},`,
    ``,
    `Thanks for reaching out to ${business.name}. We got your request for ${service}, and we'll call you at ${custPhone} to confirm a time (you said ${when} works best).`,
    ``,
    `If something changes or it can't wait, call us at ${business.phoneDisplay}.`,
    ``,
    `Thanks,`,
    business.name,
  ];

  const html = page(
    `<p>Hi ${escapeHtml(first)},</p>` +
      `<p>Thanks for reaching out to ${escapeHtml(business.name)}. We got your request for ${escapeHtml(service)}, ` +
      `and we'll call you at ${escapeHtml(custPhone)} to confirm a time (you said ${escapeHtml(when)} works best).</p>` +
      `<p>If something changes or it can't wait, call us at ${telLink(business.phoneE164, business.phoneDisplay)}.</p>` +
      `<p>Thanks,<br>${escapeHtml(business.name)}</p>`,
  );

  return { subject: `${business.name}: we got your request`, text: lines.join("\n"), html };
}

export function messageFor(kind: NotificationKind, b: StoredBooking): EmailContent {
  return kind === "owner_alert" ? ownerAlert(b) : customerConfirmation(b);
}

/** OWNER_EMAIL / OPS_EMAIL may be comma-separated. */
export function splitEmails(list: string): string[] {
  return list
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
