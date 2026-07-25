[![npm version](https://img.shields.io/npm/v/@siteping/dashboard)](https://www.npmjs.com/package/@siteping/dashboard)
[![Docs](https://img.shields.io/badge/docs-siteping.dev-0066ff)](https://siteping.dev/docs/dashboard)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

# @siteping/dashboard

**A Linear-style triage inbox for your SitePing feedback.**

`<SitepingInbox />` is a keyboard-first React component that lists every feedback your clients sent through [`@siteping/widget`](https://www.npmjs.com/package/@siteping/widget) — annotated screenshots re-rendered as the client framed them, status triage (open / in progress / resolved / won't fix) with undo, search, and deep links back to the live page.

Part of [SitePing](https://github.com/NeosiaNexus/SitePing) — **[documentation](https://siteping.dev/docs/dashboard)**.

## Install

```bash
npm install @siteping/dashboard
```

React 18 or 19 (peer dependency). Ships ESM **and** CJS, zero runtime dependencies besides React.

## Quick start

```tsx
import { SitepingInbox } from "@siteping/dashboard";

<SitepingInbox
  projects="my-app"
  endpoint="/api/siteping"
  apiKey={KEY}
  theme="auto"
/>
```

Give it a container with a height — it fills its parent (min 480 px) and adapts to the container's width, not the viewport.

Prefer your own UI? All the logic — fetching, filters, optimistic mutations, undo, pagination — is exposed as a headless hook:

```tsx
const inbox = useSitepingInbox({ projects: "my-app", endpoint: "/api/siteping" });
```

## Highlights

- **Keyboard-first** — `j`/`k` navigate, `e`/`p`/`x` toggle statuses, `u` undo, `/` search, `?` shows the cheat sheet
- **Three data modes** — HTTP `endpoint`, in-process `store`, or a fully custom 3-method `source` (tRPC/GraphQL/server actions)
- **Themeable without Shadow DOM** — scoped `spd-` classes and `--spd-*` CSS variables; light/dark/auto with live system-theme tracking
- **7 built-in locales** plus runtime custom locales via `registerLocale`

## Documentation

Props, headless API, theming variables with the correct override selectors, custom sources: **[siteping.dev/docs/dashboard](https://siteping.dev/docs/dashboard)**.

## License

[MIT](https://github.com/NeosiaNexus/SitePing/blob/main/LICENSE)
