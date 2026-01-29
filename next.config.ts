import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable experimental features if needed
  experimental: {
    // serverActions is now stable in Next.js 14+
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zekaljruvbjezxlumuup.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
