import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Server actions are enabled by default in Next 15; nothing to flip here yet.
  },
};

export default nextConfig;
