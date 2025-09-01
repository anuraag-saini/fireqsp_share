import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
      allowedOrigins: ['localhost:3000', 'fireqsp.com']
    },
  },
  
  // Add this for API routes
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: false,
  },
  
  // Webpack configuration to handle pdf-parse and similar libraries
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle pdf-parse and other problematic modules on server-side
      config.externals = config.externals || []
      config.externals.push({
        'pdf-parse': 'commonjs pdf-parse'
      })
    }
    return config
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ]
  }
};

export default nextConfig;