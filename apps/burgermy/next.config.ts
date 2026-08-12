import type { NextConfig } from "next";

const basePath = process.env.BURGERMY_BASE_PATH || "";

const nextConfig: NextConfig = {
  transpilePackages: ["@oryvex/shared"],
  output: "export",
  trailingSlash: true,
  ...(basePath ? { basePath, assetPrefix: `${basePath}/` } : {}),
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BURGERMY_BASE_PATH: basePath },
};

export default nextConfig;
