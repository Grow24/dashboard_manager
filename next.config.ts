import type { NextConfig } from "next";
import path from "path";

// We use the default Next.js output (no `output: "standalone"`), because the
// app is run with `next start` in Docker. This matches how you run it locally
// after `npm run build` and keeps the asset paths identical.

// If CSS/JS assets 404 on Zeabur (e.g. app behind a proxy/subpath), set in Zeabur:
//   NEXT_PUBLIC_ASSET_PREFIX=https://your-app.zeabur.app
// or the path prefix Zeabur uses for your app (no trailing slash).
const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? "";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  ...(assetPrefix && { assetPrefix }),
  ...(basePath && { basePath }),

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias["@"] = path.resolve(__dirname, ".");
    return config;
  },
};

export default nextConfig;
