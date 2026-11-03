import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: "/auth/:path*",
        destination: "/api/auth/:path*",
      },
    ];
  },
};

export default nextConfig;

