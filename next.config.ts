import type { NextConfig } from "next";
import { buildIndexingHeaders } from "./lib/seo/site";
import { buildAgentNegotiationHeaders } from "./lib/agents/headers";

// Product images are rewritten to the NEXT_PUBLIC_WC_URL origin (see
// lib/woocommerce/mappers/resolve-image-url.ts), so allow exactly that origin
// for next/image. This keeps the allow-list in step with the configured
// backend instead of a hardcoded hostname.
function wooCommerceImagePatterns(): NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
> {
  const raw = process.env.NEXT_PUBLIC_WC_URL;
  if (!raw) return [];
  try {
    const url = new URL(raw);
    return [
      {
        protocol: url.protocol === "http:" ? "http" : "https",
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
        pathname: "/wp-content/uploads/**",
        search: "",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  async headers() {
    return [...buildIndexingHeaders(), ...buildAgentNegotiationHeaders()];
  },
  images: {
    remotePatterns: [
      ...wooCommerceImagePatterns(),
      {
        protocol: "https",
        hostname: "wordrepss.kudu-ulmer.ts.net",
        port: "8443",
        pathname: "/wp-content/uploads/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "rpiwordpress.kudu-ulmer.ts.net",
        port: "8443",
        pathname: "/wp-content/uploads/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.ngrok-free.app",
      },
      {
        protocol: "https",
        hostname: "*.trycloudflare.com",
      },
    ],
  },
};

export default nextConfig;
