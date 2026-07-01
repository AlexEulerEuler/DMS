import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${apiUrl}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
