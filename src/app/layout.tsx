import type { Metadata } from "next";
import { business } from "@/config/business";
import "./globals.css";

// Phase 0 placeholder. Agent B replaces this with the chosen design + metadata + JSON-LD.
export const metadata: Metadata = {
  title: business.name,
  description: business.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
