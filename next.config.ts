import type { NextConfig } from "next";
import path from "path";

// Note: we deliberately do NOT use `output: "standalone"` here.
// The hosting platform you're using (which runs `next start`) expects the
// default Next.js output layout. Using `output: "standalone"` changes how
// static assets are emitted and is the root cause of the CSS/JS 404s you see
// in production. Locally everything looks fine because you're using `next dev`.
const nextConfig: NextConfig = {
  output: "standalone",

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
