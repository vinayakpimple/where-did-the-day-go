import type { NextConfig } from "next";
import path from "node:path";
import { CESIUM_BASE_URL } from "./lib/cesium-cdn";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  poweredByHeader: false,
  compress: true,
  serverExternalPackages: ["cesium"],
  experimental: { optimizePackageImports: [] },
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.DefinePlugin({
        CESIUM_BASE_URL: JSON.stringify(CESIUM_BASE_URL),
      }),
    );
    config.resolve.fallback = {
      ...config.resolve.fallback,
      http: false,
      https: false,
      zlib: false,
      url: false,
      fs: false,
    };
    return config;
  },
  async redirects() {
    return [{ source: "/", destination: "/en", permanent: false }];
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    }];
  },
};
export default nextConfig;
