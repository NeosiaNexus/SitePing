// Bundle budgets, gzipped. A budget covers what the browser downloads for a
// load step — an entry with every chunk it imports statically, or what a
// dynamic import adds — not a single file (see scripts/size-limit.mjs).
// Each limit is the measured size plus 1 kB, rounded up to the next 0.5 kB;
// raising one follows CONTRIBUTING "Bundle budgets".
import { fileURLToPath } from "node:url";
import { firstLoad, lazyLoad } from "../../scripts/size-limit.mjs";

const dir = fileURLToPath(new URL(".", import.meta.url));

export default [
  {
    name: "ESM first load (index.js + static chunks)",
    path: firstLoad(dir, "dist/index.js"),
    limit: "23 KB",
    gzip: true,
  },
  {
    name: "Locale dictionaries, all eight summed (lazy)",
    path: lazyLoad(dir, "dist/index.js", /^(de|es|fr|it|ja|ko|pt|ru)-/),
    limit: "12 KB",
    gzip: true,
  },
];
