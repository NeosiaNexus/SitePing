import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@siteping/core"],
  output: "standalone",
  experimental: {
    // Two root layouts: without it, unmatched URLs get Next's unbranded 404.
    globalNotFound: true,
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
