/**
 * Worker entry: serves the Next.js static export via the ASSETS binding and handles /api/*.
 * Routing lives in ./app.ts, real dependencies are built in ./deps.ts. Keep this file thin.
 */
import { createWorker } from "./app";
import { buildServices } from "./deps";

export default createWorker((env) => buildServices(env));
