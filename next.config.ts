import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable strict mode for better type checking
  typescript: {
    ignoreBuildErrors: false,
  },
  // ESLint runs separately
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Server-only modules should not be bundled for client
  serverExternalPackages: [],
};

export default nextConfig;