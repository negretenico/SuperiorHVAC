"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./booking.module.css";
import { TURNSTILE_SCRIPT_SRC, TURNSTILE_SITE_KEY } from "./turnstile-config";

interface RenderOptions {
  sitekey: string;
  theme?: "auto" | "light" | "dark";
  size?: "normal" | "flexible" | "compact";
  callback?: (token: string) => void;
  "error-callback"?: (code: string) => boolean | void;
  "expired-callback"?: () => void;
  "timeout-callback"?: () => void;
}

interface TurnstileApi {
  render(container: HTMLElement, options: RenderOptions): string | undefined;
  reset(widgetId?: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

/** Inject the Turnstile script once per page load; later calls reuse the same promise. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing")));
    script.onerror = () => {
      scriptPromise = null; // allow a retry on the next mount
      script.remove();
      reject(new Error("turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

interface Props {
  /** Must be stable (useCallback). Receives a token, or null when it is lost. */
  onToken: (token: string | null) => void;
  /** Increment to reset the widget (e.g. after the server rejected the token). */
  resetSignal: number;
  /** Shown when the widget can't load or errors: how to reach us instead. */
  fallback: ReactNode;
}

/** Cloudflare Turnstile, explicitly rendered. Mount it only where it's needed (step 3). */
export function Turnstile({ onToken, resetSignal, fallback }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [problem, setProblem] = useState<"load" | "error" | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const lost = () => {
      setReady(false);
      onToken(null);
    };
    loadTurnstile()
      .then((ts) => {
        const el = containerRef.current;
        if (cancelled || !el) return;
        widgetId.current =
          ts.render(el, {
            sitekey: TURNSTILE_SITE_KEY,
            theme: "auto",
            // The normal widget is 300px wide; fall back to compact on very narrow panels.
            size: el.clientWidth > 0 && el.clientWidth < 300 ? "compact" : "flexible",
            callback: (token) => {
              setProblem(null);
              setReady(true);
              onToken(token);
            },
            "error-callback": () => {
              setProblem("error");
              lost();
              return true; // handled: Turnstile retries on its own
            },
            // With the default refresh-expired="auto" the widget renews itself; drop the stale token meanwhile.
            "expired-callback": lost,
            "timeout-callback": lost,
          }) ?? null;
      })
      .catch(() => {
        if (!cancelled) setProblem("load");
      });
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
      onToken(null);
    };
  }, [onToken]);

  useEffect(() => {
    if (resetSignal > 0 && widgetId.current && window.turnstile) {
      setReady(false);
      window.turnstile.reset(widgetId.current);
    }
  }, [resetSignal]);

  return (
    <div className={styles.turnstile}>
      <div ref={containerRef} id="bk-turnstileToken" tabIndex={-1} data-testid="turnstile"
        data-state={ready ? "ready" : "pending"}
        className={styles.turnstileBox} />
      {problem && (
        <p className={styles.hint} role="status">
          {problem === "load"
            ? "The spam check couldn't load. Check your connection and refresh the page. "
            : "The spam check hit a snag and is retrying. "}
          {fallback}
        </p>
      )}
    </div>
  );
}
