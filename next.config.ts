import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static: `next build` writes ./out, served by the Worker's ASSETS binding.
  output: "export",
  // /services/ac-repair/ -> out/services/ac-repair/index.html (clean URLs on Workers assets)
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
