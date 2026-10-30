# SitePing on Astro

A minimal Astro 7 site with the SitePing widget and its endpoint, two pages and the `ClientRouter`. Feedback is kept in memory, so it runs with no database.

## Run it

Astro 7 needs Node 22.23.4 or later.

```bash
bun install && bun run dev   # or: npm install && npm run dev
```

Open http://localhost:4321 and look bottom-right. Click the button, draw a rectangle around anything, write a comment, send it: it comes back as a pin. Feedback lives until the dev server restarts.

## How it works

| File | Role |
|---|---|
| [`src/pages/api/siteping.ts`](src/pages/api/siteping.ts) | The endpoint: `@siteping/server`'s handler over a `MemoryStore`, one export per HTTP method, rendered on demand (`prerender = false`). Built on the first request, so a production build never needs the key. |
| [`src/layouts/Layout.astro`](src/layouts/Layout.astro) | The widget, in a `<script>` that Astro bundles for the browser — no UI framework needed. The `ClientRouter` swaps the whole `<body>` on navigation, so the widget is mounted on `astro:page-load` and released on `astro:before-swap`. |
| [`astro.config.mjs`](astro.config.mjs) | The `@astrojs/node` adapter for the on-demand endpoint, and `SITEPING_API_KEY` declared as a server secret with `astro:env`. |

`forceShow: true` in the layout also shows the widget on `bun run preview` (a production build). On a real site, leave it out — the widget then shows in development only — or set it for your staging builds.

## Put it in your own Astro site

1. `npm i @siteping/widget @siteping/server @siteping/adapter-memory`, plus a [server adapter](https://docs.astro.build/en/guides/on-demand-rendering/) if you don't have one.
2. Copy `src/pages/api/siteping.ts` and the `env` block of `astro.config.mjs`.
3. Add the `<script>` of `src/layouts/Layout.astro` to your layout. Without the `ClientRouter`, a plain `initSiteping({ … })` call is enough.

The full walkthrough is on [siteping.dev/docs/frameworks/astro](https://siteping.dev/docs/frameworks/astro).

## Keep the feedback

Replace the `MemoryStore` with a store over your database — nothing else changes:

- PostgreSQL (Neon, Supabase…) or Turso with Drizzle: [`@siteping/adapter-drizzle`](https://siteping.dev/docs/adapters/drizzle)
- Prisma: [`@siteping/adapter-prisma`](https://siteping.dev/docs/adapters/prisma)

Before going live, set `SITEPING_API_KEY`: the handler refuses to start in production without it. With a key, reviewers without it can send feedback but not list pins — see [the security model](https://siteping.dev/docs/server#the-security-model-honestly).
