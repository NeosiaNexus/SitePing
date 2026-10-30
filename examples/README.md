# Examples

Runnable apps that show SitePing in a framework, each one standalone: its own `package.json`, the published `@siteping/*` packages from npm, no database (feedback is kept in memory).

| Example | Framework |
|---|---|
| [`astro`](astro) | Astro 7, with the `ClientRouter` |
| [`sveltekit`](sveltekit) | SvelteKit 3 |

```bash
cd examples/<name>
bun install && bun run dev   # or: npm install && npm run dev
```

They are not part of the monorepo's workspaces, so the root install, build and checks leave them alone. Guides for other stacks — Nuxt, a Vite SPA, plain HTML — are on [siteping.dev/docs/frameworks](https://siteping.dev/docs/frameworks).
