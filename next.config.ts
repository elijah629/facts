import type { NextConfig } from "next";

const buildDate = new Date().toISOString().slice(0, 10);

const nextConfig: NextConfig = {
  typedRoutes: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: buildDate,
  },
};

export default nextConfig;
