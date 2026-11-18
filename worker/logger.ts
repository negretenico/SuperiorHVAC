import type { Logger } from "./contracts";

/**
 * Structured console logger. Workers Logs indexes object fields, so pass ids
 * (bookingId, kind, notifierId) as data. Never pass raw IPs or full customer records.
 */
export const consoleLogger: Logger = {
  info: (msg, data) => console.log({ level: "info", msg, ...data }),
  warn: (msg, data) => console.warn({ level: "warn", msg, ...data }),
  error: (msg, data) => console.error({ level: "error", msg, ...data }),
};
