import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    compress: true,
    output: 'standalone',
    experimental: {
        optimizePackageImports: ['lucide-react'],
    },
}

export default nextConfig
