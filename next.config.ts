import type { NextConfig } from "next";
import path from "path";

// We use the default Next.js output (no `output: "standalone"`), because the
// app is run with `next start` in Docker. This matches how you run it locally
// after `npm run build` and keeps the asset paths identical.
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname, ".");
    return config;
  },
};

export default nextConfig;
