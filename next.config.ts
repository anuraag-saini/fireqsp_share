import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  api: {
    bodyParser: {
      sizeLimit: "50mb", // Adjust this based on your needs
    },
  },
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
    // This is the correct way for Next.js 15+
    serverActions: {
      bodySizeLimit: '50mb'
    },
  },
};

export default nextConfig;