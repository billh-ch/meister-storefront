import type { NextConfig } from "next";
import { buildIndexingHeaders } from "./lib/seo/site";
import { buildAgentNegotiationHeaders } from "./lib/agents/headers";

const nextConfig: NextConfig = {
  async headers() {
    return [...buildIndexingHeaders(), ...buildAgentNegotiationHeaders()];
  },
  images: {
    // Vercel returns HTTP 402 for uncached image transforms; serve available originals.
    unoptimized: true,
    remotePatterns: [
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
