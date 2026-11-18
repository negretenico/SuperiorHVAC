/**
 * The one place that decides how a `todo()` value from src/config/business.ts renders.
 * - production build: hidden (the element is not rendered at all)
 * - `next dev`: a small visible "TODO: <label>" marker so the maintainer sees what's missing
 * Render through <Fill> (src/components/Fill.tsx) rather than calling this directly.
 */
import { isTodo, type Maybe } from "../config/business";

export type Resolved<T> = { kind: "value"; value: T } | { kind: "marker"; text: string } | { kind: "hidden" };

export const showTodoMarkers = (env: string | undefined = process.env.NODE_ENV): boolean => env === "development";

/** The real value, or undefined when it's still todo() (or not set). */
export function filled<T>(value: Maybe<T> | undefined): T | undefined {
  return value === undefined || isTodo(value) ? undefined : value;
}

export function resolveMaybe<T>(value: Maybe<T> | undefined, env: string | undefined = process.env.NODE_ENV): Resolved<T> {
  if (value === undefined) return { kind: "hidden" };
  if (isTodo(value)) return showTodoMarkers(env) ? { kind: "marker", text: `TODO: ${value.__todo}` } : { kind: "hidden" };
  return { kind: "value", value };
}
