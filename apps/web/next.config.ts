import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  transpilePackages: ["@aethon/core", "@aethon/ui"]
};

export default nextConfig;
