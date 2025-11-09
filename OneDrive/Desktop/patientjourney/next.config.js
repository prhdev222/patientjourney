/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverActions: true,
  },
  images: {
    domains: [],
  },
  webpack: (config, { isServer }) => {
    // Fix for Prisma Client in Next.js
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    // Fix for path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, '.'),
    }
    return config
  },
  // PWA Configuration
  // Will be added when implementing PWA
}

module.exports = nextConfig


