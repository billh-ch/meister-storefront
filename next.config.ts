import type { NextConfig } from "next";
import { buildIndexingHeaders } from "./lib/seo/site";

const nextConfig: NextConfig = {
  async headers() {
    return buildIndexingHeaders();
  },
  images: {
    remotePatterns: [
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
