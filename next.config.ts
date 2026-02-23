import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // removes X-Powered-By: Next.js
  output: "standalone",
  serverExternalPackages: ["pg"],
};

export default nextConfig;
