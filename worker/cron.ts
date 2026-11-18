import type { CronDeps } from "./contracts";

export interface CronReport {
  retried: number;
  recovered: number;
  exhausted: number;
  purged: number;
}

/** Scheduled every 15 min. Spec: worker/cron.test.ts. */
export async function runCron(_deps: CronDeps): Promise<CronReport> {
  throw new Error("not implemented: runCron");
}
