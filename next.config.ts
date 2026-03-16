import type { NextConfig } from "next";

const devOrigins = process.env.REPLIT_DEV_DOMAIN
  ? [process.env.REPLIT_DEV_DOMAIN]
  : [];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  serverExternalPackages: ["pg"],
  ...(devOrigins.length > 0 ? { allowedDevOrigins: devOrigins } : {}),
};

export default nextConfig;
