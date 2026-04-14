import path from 'path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Lock turbopack root to project directory so the watcher doesn't
  // scan parent folders. Critical for memory — without this, Turbopack
  // tries to watch sibling projects and large data dirs.
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    // Tree-shake heavy barrel imports to cut compile memory and bundle size
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@tanstack/react-query',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-popover',
      '@radix-ui/react-tooltip',
    ],
  },
  // Cap dev cache so old route entries don't pile up in memory
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  images: {
    unoptimized: true,
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
