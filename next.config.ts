import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
    // This is the correct way for Next.js 15+
    serverActions: {
      bodySizeLimit: '50mb'
    },
  },
};

export default nextConfig;