import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@oryvex/shared"],
  output: "export",
  trailingSlash: true,
  basePath: "/burgermy",
  assetPrefix: "/burgermy/",
  images: { unoptimized: true },
};

export default nextConfig;
