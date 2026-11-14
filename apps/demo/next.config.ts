import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@siteping/core"],
  output: "standalone",
  // `next dev` writes an AGENTS.md here whenever it detects a coding agent;
  // the repo's own CLAUDE.md already guides agents, so keep the tree clean.
  agentRules: false,
  experimental: {
    // Two root layouts: without it, unmatched URLs get Next's unbranded 404.
    globalNotFound: true,
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
