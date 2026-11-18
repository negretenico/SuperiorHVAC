import type { ReactNode } from "react";
import type { Maybe } from "@/config/business";
import { resolveMaybe } from "@/lib/todo";
import styles from "./Fill.module.css";

/**
 * Renders a config value that may still be todo().
 * Production: the whole element is omitted. `next dev`: a small "TODO: <label>" marker.
 *   <Fill value={member.bio}>{(bio) => <p>{bio}</p>}</Fill>
 */
export function Fill<T>({
  value,
  children,
  env,
}: {
  value: Maybe<T> | undefined;
  children: (value: T) => ReactNode;
  /** Override NODE_ENV (tests only). */
  env?: string;
}) {
  const r = resolveMaybe(value, env);
  if (r.kind === "value") return <>{children(r.value)}</>;
  if (r.kind === "marker") return <span className={styles.todo}>{r.text}</span>;
  return null;
}
