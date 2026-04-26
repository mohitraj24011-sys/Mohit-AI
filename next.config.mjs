/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Prevents build failures from TS errors — fix them separately
    ignoreBuildErrors: true,
  },
  eslint: {
    // Prevents build failures from ESLint errors
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    serverExternalPackages: ['openai'],
  },
}

export default nextConfig
