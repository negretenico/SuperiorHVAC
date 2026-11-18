/**
 * NOTIFIER=log: prints each email to the console instead of sending it.
 * For local dev and e2e only; it never touches the network.
 */
import type { NotificationKind, Notifier, StoredBooking } from "../contracts";
import { messageFor, splitEmails } from "./messages";

type Write = (s: string) => void;
const consoleWrite: Write = (s) => console.log(s);

export interface LogNotifierConfig {
  ownerEmail: string;
  write?: Write;
}

export class LogNotifier implements Notifier {
  readonly id = "log-email";
  readonly kinds: readonly NotificationKind[] = ["owner_alert", "customer_confirmation"];

  constructor(private readonly cfg: LogNotifierConfig) {}

  async send(kind: NotificationKind, booking: StoredBooking): Promise<void> {
    const msg = messageFor(kind, booking);
    const to = kind === "owner_alert" ? splitEmails(this.cfg.ownerEmail) : [booking.email];
    (this.cfg.write ?? consoleWrite)(
      [`[NOTIFIER=log] ${kind} (not sent)`, `To: ${to.join(", ")}`, `Subject: ${msg.subject}`, "", msg.text].join("\n"),
    );
  }
}

/** CronDeps.alertOps for NOTIFIER=log. */
export function createLogOpsAlert(write: Write = consoleWrite) {
  return async (subject: string, body: string) => {
    write([`[NOTIFIER=log] ops alert (not sent)`, `Subject: [ops] ${subject}`, "", body].join("\n"));
  };
}
