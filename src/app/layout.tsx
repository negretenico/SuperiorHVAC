import type { Metadata, Viewport } from "next";
import { Fraunces, Inter_Tight } from "next/font/google";
import { business } from "@/config/business";
import { siteUrl } from "@/lib/seo";
import { businessJsonLd } from "@/lib/jsonld";
import { analyticsBeacon } from "@/lib/analytics";
import { JsonLd } from "@/components/JsonLd";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CallBar } from "@/components/site/CallBar";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  // Pages set their own title via pageMetadata(); this is the fallback.
  title: { default: business.name, template: `%s | ${business.name}` },
  description: business.tagline,
  applicationName: business.name,
  openGraph: { siteName: business.name, type: "website", locale: "en_US" },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E8ECE9" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1514" },
  ],
};

// Cloudflare Web Analytics: set NEXT_PUBLIC_CF_ANALYTICS_TOKEN at build time to include the beacon.
const beacon = analyticsBeacon(process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN);

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${interTight.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <JsonLd data={businessJsonLd()} />
        <Header />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <Footer />
        <CallBar />
        {beacon ? <script defer src={beacon.src} data-cf-beacon={beacon["data-cf-beacon"]} /> : null}
      </body>
    </html>
  );
}
