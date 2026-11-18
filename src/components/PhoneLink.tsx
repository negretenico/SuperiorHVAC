import type { ReactNode } from "react";
import { business } from "@/config/business";

/**
 * The only way the phone number is rendered: always a tel: link with the display format.
 * Pass children only for a short label like "Call" (the number is then in aria-label).
 */
export function PhoneLink({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <a
      className={["num", className].filter(Boolean).join(" ")}
      href={`tel:${business.phoneE164}`}
      aria-label={children ? `Call ${business.phoneDisplay}` : undefined}
    >
      {children ?? business.phoneDisplay}
    </a>
  );
}
