import type { NextConfig } from "next";

const rawBackendUrl = process.env.BACKEND_URL?.trim();
const backendUrl = rawBackendUrl ? rawBackendUrl.replace(/\/+$/, "") : null;

const nextConfig: NextConfig = {
  async rewrites() {
    if (!backendUrl) {
      return [];
    }

    return [
      {
        source: "/backend/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
