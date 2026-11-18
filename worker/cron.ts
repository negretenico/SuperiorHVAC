import { MAX_NOTIFY_ATTEMPTS, RETENTION_MONTHS, type CronDeps, type NotificationRecord } from "./contracts";
import { errorMessage } from "./http";

export interface CronReport {
  retried: number;
  recovered: number;
  exhausted: number;
  purged: number;
}

/** Retries handled per run; the cron fires every 15 min, so a backlog drains quickly. */
export const RETRY_BATCH = 50;

/** Scheduled every 15 min. Spec: worker/cron.test.ts. Never throws. */
export async function runCron(deps: CronDeps): Promise<CronReport> {
  const report: CronReport = { retried: 0, recovered: 0, exhausted: 0, purged: 0 };
  const problems: string[] = [];

  try {
    const rows = await deps.store.listRetryable(MAX_NOTIFY_ATTEMPTS, RETRY_BATCH);
    for (const row of rows) {
      try {
        await retryOne(row, deps, report);
      } catch (err) {
        deps.log.error("cron retry crashed", { ...ids(row), error: errorMessage(err) });
        problems.push(`Retry of ${row.kind} for booking ${row.bookingId} crashed: ${errorMessage(err)}`);
      }
    }
  } catch (err) {
    deps.log.error("cron retry pass failed", { error: errorMessage(err) });
    problems.push(`Could not list failed notifications: ${errorMessage(err)}`);
  }

  try {
    report.purged = await deps.store.purgeBefore(retentionCutoff(deps.now()));
  } catch (err) {
    deps.log.error("cron purge failed", { error: errorMessage(err) });
    problems.push(`Could not purge old bookings: ${errorMessage(err)}`);
  }

  if (problems.length > 0) {
    await safeAlert(deps, "Booking cron had errors", problems.join("\n"));
  }
  deps.log.info("cron finished", { ...report });
  return report;
}

async function retryOne(row: NotificationRecord, deps: CronDeps, report: CronReport) {
  const notifier = deps.notifiers.find((n) => n.id === row.notifierId && n.kinds.includes(row.kind));
  if (!notifier) {
    deps.log.warn("cron skipped notification: notifier not registered", ids(row));
    return;
  }
  const booking = await deps.store.getBooking(row.bookingId);
  if (!booking) {
    deps.log.warn("cron skipped notification: booking not found", ids(row));
    return;
  }

  report.retried++;
  const attempts = row.attempts + 1;
  try {
    await notifier.send(row.kind, booking);
    await deps.store.upsertNotification({
      ...row,
      status: "sent",
      attempts,
      lastError: null,
      updatedAt: deps.now().toISOString(),
    });
    report.recovered++;
    deps.log.info("cron notification recovered", { ...ids(row), attempts });
    return;
  } catch (err) {
    const lastError = errorMessage(err);
    await deps.store.upsertNotification({
      ...row,
      status: "failed",
      attempts,
      lastError,
      updatedAt: deps.now().toISOString(),
    });
    deps.log.error("cron notification retry failed", { ...ids(row), attempts, error: lastError });
    if (attempts >= MAX_NOTIFY_ATTEMPTS) {
      report.exhausted++;
      await safeAlert(
        deps,
        `Booking notification gave up: ${row.kind} for ${booking.name}`,
        [
          `A ${row.kind} notification failed ${attempts} times and will not be retried.`,
          "",
          `Booking: ${booking.id} (created ${booking.createdAt})`,
          `Notifier: ${row.notifierId}`,
          `Customer: ${booking.name}`,
          `Phone: ${booking.phone}`,
          `Email: ${booking.email}`,
          `Service: ${booking.service}, ZIP ${booking.zip}`,
          `Last error: ${lastError}`,
          "",
          "Please call the customer directly.",
        ].join("\n"),
      );
    }
  }
}

/** Now minus RETENTION_MONTHS calendar months (UTC). */
export function retentionCutoff(now: Date): Date {
  const d = new Date(now.getTime());
  d.setUTCMonth(d.getUTCMonth() - RETENTION_MONTHS);
  return d;
}

async function safeAlert(deps: CronDeps, subject: string, body: string) {
  try {
    await deps.alertOps(subject, body);
  } catch (err) {
    deps.log.error("ops alert failed", { error: errorMessage(err) });
  }
}

function ids(row: NotificationRecord) {
  return { bookingId: row.bookingId, kind: row.kind, notifierId: row.notifierId };
}
