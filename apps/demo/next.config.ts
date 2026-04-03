import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@siteping/core"],
  output: "standalone",
};

export default nextConfig;
