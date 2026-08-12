import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@oryvex/shared"],
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
