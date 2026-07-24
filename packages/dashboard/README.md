[![npm version](https://img.shields.io/npm/v/@siteping/dashboard)](https://www.npmjs.com/package/@siteping/dashboard)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

# @siteping/dashboard

**A Linear-style triage inbox for your SitePing feedback.**

`<SitepingInbox />` is a keyboard-first React component that lists every feedback your clients sent through [`@siteping/widget`](https://www.npmjs.com/package/@siteping/widget) — with the annotated screenshot re-rendered exactly as the client framed it, console/network diagnostics, status triage (open / in progress / resolved / won't fix), undo, and deep links back to the live page.

Part of the [@siteping](https://github.com/NeosiaNexus/SitePing) monorepo.

## Install

```bash
npm install @siteping/dashboard
```

React 18+ is a peer dependency. The component ships as ESM with zero runtime dependencies besides React.

## Quick Start

### Endpoint mode (server adapter)

Point the inbox at the same API route your widget submits to — see [`@siteping/adapter-prisma`](https://www.npmjs.com/package/@siteping/adapter-prisma):

```tsx
import { SitepingInbox } from '@siteping/dashboard'

export function FeedbackPage() {
  return (
    <SitepingInbox
      endpoint="/api/siteping"
      projects={['my-project', 'landing']}
      theme="dark"
      accentColor="#0066ff"
    />
  )
}
```

### Store mode (no server)

Pass any `SitepingStore` directly — perfect for demos and client-side setups:

```tsx
import { SitepingInbox } from '@siteping/dashboard'
import { LocalStorageStore } from '@siteping/adapter-localstorage'

const store = new LocalStorageStore()

export function FeedbackPage() {
  return <SitepingInbox store={store} projects="my-demo" />
}
```

### Next.js (App Router)

The inbox is a client component:

```tsx
// app/feedback/page.tsx
'use client'

import { SitepingInbox } from '@siteping/dashboard'

export default function FeedbackPage() {
  return (
    <main style={{ height: '100vh', padding: 24 }}>
      <SitepingInbox endpoint="/api/siteping" projects="my-project" />
    </main>
  )
}
```

The root panel is `min-height: 480px` and fills its parent's height — size the wrapper to control it.

## Props

All `UseSitepingInboxOptions` (data) plus the presentation props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `projects` | `string \| string[]` | — | **Required.** Project name(s) to triage. A switcher appears when more than one |
| `endpoint` | `string` | — | API route of your server adapter (e.g. `/api/siteping`) |
| `store` | `SitepingStore` | — | Direct store for client-side mode. Wins over `endpoint` |
| `source` | `InboxSource` | — | Fully custom data source. Wins over `store` and `endpoint` |
| `apiKey` | `string` | — | Sent as `Authorization: Bearer <apiKey>` (endpoint mode) |
| `headers` | `Record<string, string> \| () => headers \| Promise<headers>` | — | Extra request headers, static or per-request (endpoint mode) |
| `pageSize` | `number` | `50` | Page size, clamped 1..100 |
| `accentColor` | `string` | `'#0066ff'` | Accent — hex (`#RGB`, `#RRGGBB`, `#RRGGBBAA`) |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | `auto` follows the system live |
| `density` | `'comfortable' \| 'compact'` | `'comfortable'` | Row height 44px / 36px |
| `locale` | `'en' \| 'fr' \| 'de' \| 'es' \| 'it' \| 'pt' \| 'ru'` | `'en'` | UI language; non-English dictionaries lazy-load |
| `className` | `string` | — | Appended to the root element |
| `deepLinkParam` | `string` | `'siteping'` | Query param used by "Open on page" links — match your widget's `deepLink` config |
| `emptyState` | `ReactNode` | — | Replaces the default "No feedback yet" state |
| `onStatusChange` | `(feedback, previous) => void` | — | Called after a successful status change |
| `onDelete` | `(feedback) => void` | — | Called after a successful delete |
| `onError` | `(error) => void` | — | Called on load or mutation errors |

## Headless hook

Everything the component does is available as a hook — bring your own UI:

```tsx
import { useSitepingInbox } from '@siteping/dashboard'

function MyInbox() {
  const inbox = useSitepingInbox({ endpoint: '/api/siteping', projects: 'my-project' })

  if (inbox.loading) return <p>Loading…</p>
  return (
    <ul>
      {inbox.items.map((item) => (
        <li key={item.id}>
          {item.message}
          <button onClick={() => inbox.changeStatus(item.id, 'resolved')}>Resolve</button>
        </li>
      ))}
    </ul>
  )
}
```

`useSitepingInbox` returns filters (`status`, `type`, `search`, `project`), pagination (`loadMore`, `hasMore`), per-status `counts`, focus/selection state, optimistic `changeStatus` / `deleteFeedback` with `undo`, and `refresh`. Status changes are applied optimistically and rolled back on error.

## Theming

- **Accent** — `accentColor` injects `--spd-accent`; every accent derivative is computed in CSS via `color-mix`, so one hex restyles the whole panel.
- **Dark / light** — `theme="auto"` (default) follows `prefers-color-scheme` live; `"light"` / `"dark"` pin it.
- **Density** — `density="compact"` drops rows from 44px to 36px for long lists.
- **CSS variables** — all styles are scoped under `.spd-root` and driven by custom properties you can override from your own stylesheet: `--spd-accent`, `--spd-bg`, `--spd-surface`, `--spd-raised`, `--spd-border`, `--spd-border-strong`, `--spd-text`, `--spd-text-2`, `--spd-text-3`, `--spd-font`, `--spd-mono`, `--spd-radius`, `--spd-radius-sm`, `--spd-radius-xs`, `--spd-row-h`.

```css
.my-app .spd-root {
  --spd-font: "My Brand Font", sans-serif;
  --spd-radius: 6px;
}
```

## Keyboard

| Key | Action |
|-----|--------|
| `j` / `↓` · `k` / `↑` | Move focus down / up |
| `Enter` / `o` | Open the focused feedback (Enter again: open on page) |
| `Esc` | Close drawer → close shortcuts → leave search |
| `e` | Toggle resolved |
| `p` | Toggle in progress |
| `x` | Toggle won't fix |
| `u` | Undo the last status change |
| `r` | Refresh |
| `/` | Focus search |
| `1`–`5` | Status tabs (all, open, in progress, resolved, won't fix) |
| `?` | Keyboard shortcuts overlay |

## Accessibility

The inbox is built and audited against WCAG 2.1 AA (axe-core, measured contrast ratios, real keyboard runs):

- **Fully keyboard-operable** — every interaction (triage, drawer, status menu, screenshot zoom, diagnostics expanders, undo) works without a pointer; focus is always visible and never dropped or trapped unintentionally. The overlay drawer is a proper modal (focus trap + restore).
- **Screen readers** — the list is a `listbox` with `aria-activedescendant` (selection = the opened record), status filters are a `radiogroup`, the drawer is a labeled dialog/region, metadata is a definition list, status changes and result counts are announced through polite live regions, and the component sets `lang` from its `locale`.
- **Contrast** — both themes meet AA (4.5:1 text / 3:1 non-text) on every measured pair, including the status-tinted chips and focus indicators.
- **Preferences respected** — `prefers-reduced-motion` disables every animation (including spinners); `forced-colors` gets system-color borders and `Highlight` focus outlines.

Found a gap? Please open an issue — accessibility reports are treated as bugs, not feature requests.

## i18n

Built-in locales: `en` (default), `fr`, `de`, `es`, `it`, `pt` (Brazilian), `ru`. English is bundled; other locales load as tiny lazy chunks. Add your own at runtime:

```ts
import { registerLocale } from '@siteping/dashboard'

registerLocale('nl', {
  'inbox.regionLabel': 'Feedback inbox',
  // …all keys — see src/i18n/types.ts
})
```

## Auth

In endpoint mode the inbox reads and mutates through your adapter route, which supports bearer auth out of the box ([`@siteping/adapter-prisma`](https://www.npmjs.com/package/@siteping/adapter-prisma) `apiKey` option):

```tsx
<SitepingInbox endpoint="/api/siteping" projects="my-project" apiKey={process.env.NEXT_PUBLIC_SITEPING_KEY} />
```

`apiKey` becomes `Authorization: Bearer <apiKey>` on every request. For cookie/session auth or custom schemes, use `headers` — it also accepts an async function, handy for refreshing tokens. The inbox is an **admin surface**: gate the page it renders on, and remember the widget's own submissions stay unauthenticated unless your adapter requires a key.

> **Counts queries** — the status tab counts are fetched as five extra `limit=1` queries (one per status + all) after each list load. They are cheap `COUNT` queries for SQL adapters, but if your endpoint is rate-limited, budget for them.

## Screenshots & annotation overlay

The evidence card re-renders the client's annotation rectangle on top of the screenshot using `screenshotRegion` (fractional coordinates captured by the widget). This requires **`@siteping/widget` ≥ this release** with `enableScreenshot: true` — older widgets cropped the screenshot to the rect itself, so legacy feedback renders its screenshot without the overlay (nothing breaks). Feedback without any screenshot falls back to the DOM anchor view (CSS selector + text snippet).

## License

MIT
