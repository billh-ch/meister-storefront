import type { NextConfig } from "next";
import { buildIndexingHeaders } from "./lib/seo/site";
import { buildAgentNegotiationHeaders } from "./lib/agents/headers";

const nextConfig: NextConfig = {
  async headers() {
    return [...buildIndexingHeaders(), ...buildAgentNegotiationHeaders()];
  },
  images: {
    // Pre-generated responsive files avoid runtime image transformation quotas.
    loader: 'custom',
    loaderFile: './lib/images/loader.ts',
    deviceSizes: [320, 640, 960, 1280, 1600],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rpiwordpress.kudu-ulmer.ts.net",
        port: "8443",
        pathname: "/wp-content/uploads/**",
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
