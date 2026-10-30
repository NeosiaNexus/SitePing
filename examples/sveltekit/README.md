# SitePing on SvelteKit

A minimal SvelteKit 3 app with the SitePing widget and its endpoint. Feedback is kept in memory, so it runs with no database.

## Run it

```bash
bun install && bun run dev   # or: npm install && npm run dev
```

Open the URL Vite prints and look bottom-right. Click the button, draw a rectangle around anything, write a comment, send it: it comes back as a pin. Feedback lives until the dev server restarts.

## How it works

| File | Role |
|---|---|
| [`src/routes/api/siteping/+server.ts`](src/routes/api/siteping/+server.ts) | The endpoint: `@siteping/server`'s handler over a `MemoryStore`, one export per HTTP method. Built on the first request, so a production build never needs the key. |
| [`src/routes/+layout.svelte`](src/routes/+layout.svelte) | The widget, mounted in `onMount` — browser only, never during server rendering — and destroyed with the layout. |
| [`src/env.ts`](src/env.ts) | Declares `SITEPING_API_KEY`: SvelteKit 3 only exposes declared variables, through `$app/env/private`. |

`forceShow: true` in the layout also shows the widget on `bun run preview` (a production build). On a real site, leave it out — the widget then shows in development only — or set it for your staging builds.

## Put it in your own SvelteKit app

1. `npm i @siteping/widget @siteping/server @siteping/adapter-memory`
2. Copy `src/routes/api/siteping/+server.ts` and `src/env.ts`.
3. Mount the widget in your root layout, as in `src/routes/+layout.svelte`.

On SvelteKit 2, read the key with `import { env } from "$env/dynamic/private"` instead and skip `src/env.ts`. The full walkthrough is on [siteping.dev/docs/frameworks/sveltekit](https://siteping.dev/docs/frameworks/sveltekit).

## Keep the feedback

Replace the `MemoryStore` with a store over your database — nothing else changes:

- PostgreSQL (Neon, Supabase…) or Turso with Drizzle: [`@siteping/adapter-drizzle`](https://siteping.dev/docs/adapters/drizzle)
- Prisma: [`@siteping/adapter-prisma`](https://siteping.dev/docs/adapters/prisma)

Before going live, set `SITEPING_API_KEY`: the handler refuses to start in production without it. With a key, reviewers without it can send feedback but not list pins — see [the security model](https://siteping.dev/docs/server#the-security-model-honestly).
