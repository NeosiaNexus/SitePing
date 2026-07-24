[![npm version](https://img.shields.io/npm/v/@siteping/widget)](https://www.npmjs.com/package/@siteping/widget)
[![Live Demo](https://img.shields.io/badge/demo-try%20it%20live-22c55e)](https://siteping.dev/demo)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

# @siteping/widget

**Client feedback, pinned to the pixel.**

A lightweight feedback widget that lets your clients annotate websites during development. Draw rectangles, leave comments, track bugs — directly on the live site.

Part of the [@siteping](https://github.com/NeosiaNexus/SitePing) monorepo — **[try the live demo](https://siteping.dev/demo)**.

## Install

```bash
npm install @siteping/widget
```

## Quick Start

```tsx
// app/layout.tsx (or any client component)
'use client'

import { initSiteping } from '@siteping/widget'
import { useEffect } from 'react'

export default function Layout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const { destroy } = initSiteping({
      endpoint: '/api/siteping',
      projectName: 'my-project',
    })
    return destroy
  }, [])

  return <html><body>{children}</body></html>
}
```

You also need a server-side adapter — see [`@siteping/adapter-prisma`](https://www.npmjs.com/package/@siteping/adapter-prisma).

### Client-side mode (no server)

Use a `store` instead of an `endpoint` to bypass HTTP entirely:

```ts
import { initSiteping } from '@siteping/widget'
import { LocalStorageStore } from '@siteping/adapter-localstorage'

initSiteping({
  store: new LocalStorageStore(),
  projectName: 'my-demo',
})
```

Feedback persists in `localStorage` — no server, no database. Perfect for demos and prototyping. See [`@siteping/adapter-localstorage`](https://www.npmjs.com/package/@siteping/adapter-localstorage) and [`@siteping/adapter-memory`](https://www.npmjs.com/package/@siteping/adapter-memory).

> **Framework-agnostic** — Works with any frontend framework (React, Vue, Svelte, Astro) or plain HTML. No framework dependency required.

> **~49 KB gzipped** today; after the upcoming bundle split (in progress), target is ~30 KB gzipped on first paint. Zero framework dependencies.

## Configuration

All configuration options for `initSiteping()`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endpoint` | `string` | — | Your API route (e.g. `/api/siteping`). Required unless `store` is provided |
| `store` | `SitepingStore` | — | Direct store for client-side mode. When set, bypasses HTTP |
| `apiKey` | `string` | — | Sent as `Authorization: Bearer <apiKey>` on every HTTP request. **Visible to every visitor** — see [Authentication](#authentication) before using it on a public site. Ignored in store mode |
| `headers` | `Record<string, string>` or `() => headers` (sync or async) | — | Extra HTTP request headers, static or computed per request (e.g. a short-lived session token). An explicit `Authorization` entry overrides `apiKey`. Ignored in store mode |
| `projectName` | `string` | — | **Required.** Scopes feedbacks to this project |
| `position` | `'bottom-right' \| 'bottom-left'` | `'bottom-right'` | Widget FAB position |
| `accentColor` | `string` | `'#0066ff'` | Widget accent color — hex color (`#RGB`, `#RRGGBB`, `#RRGGBBAA`) |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'light'` | Widget color theme |
| `locale` | `'en' \| 'fr' \| 'de' \| 'es' \| 'it' \| 'pt' \| 'ru'` | `'en'` | Widget UI language. Unknown locales fall back to English |
| `forceShow` | `boolean` | `false` | Render the widget even when it would normally be skipped — bypasses **both** the production guard and the mobile-viewport guard |
| `minViewportWidth` | `number` | `768` | Minimum viewport width (px) for the widget to render; below it `onSkip('mobile')` fires. Set `0` to allow mobile viewports |
| `debug` | `boolean` | `false` | Enable debug logging to console |
| `identity` | `{ name: string; email: string }` | — | Pre-fill author identity from the host (SSO). When set, the widget skips the identity modal |
| `deepLink` | `boolean \| { param?: string }` | `false` | On initial load, focus the annotation referenced by `?siteping=<id>` (or a custom query key). SPA navigations are ignored — use `focusFeedback()` for route-change focus |
| `watchNavigation` | `boolean` | `true` | Auto re-fetch feedbacks on client-side (SPA) navigation. The widget patches the History API + listens for `popstate`/`hashchange`, so the panel list and markers follow route changes even when the widget is mounted once in a persistent layout (e.g. Next.js App Router). Re-fetches data only — it never re-scrolls. Set `false` to opt out and drive updates via `refresh()` |
| `enableRightClickComment` | `boolean` | `false` | Right-click anywhere on the page to instantly open the comment composer at the cursor. Modifier-key right-clicks (Shift/Ctrl/Alt/Meta) fall through to the native context menu. Right-clicks on SitePing's own UI are ignored. Note: on Android, `contextmenu` fires on long-press — relevant for ≥768 px tablets where the widget loads |

> **Custom translations** — Use `registerLocale(code, translations)` to add your own locale at runtime.

### Event callbacks

| Option | Signature | Description |
|--------|-----------|-------------|
| `onOpen` | `() => void` | Called when the feedback panel opens |
| `onClose` | `() => void` | Called when the feedback panel closes |
| `onFeedbackSent` | `(feedback) => void` | Called after a feedback is successfully submitted |
| `onError` | `(error) => void` | Called on API or internal errors |
| `onAnnotationStart` | `() => void` | Called when annotation drawing starts |
| `onAnnotationEnd` | `() => void` | Called when annotation drawing ends |
| `onSkip` | `(reason) => void` | Called when widget is skipped (production/mobile) |

```ts
initSiteping({
  endpoint: '/api/siteping',
  projectName: 'my-project',
  position: 'bottom-right',
  accentColor: '#0066ff',
  theme: 'light',
  locale: 'en',
  forceShow: false,
  debug: false,
  onOpen: () => {},
  onClose: () => {},
  onFeedbackSent: (feedback) => {},
  onError: (error) => {},
  onAnnotationStart: () => {},
  onAnnotationEnd: () => {},
  onSkip: (reason) => {},
})
```

### Authentication

With the default [`@siteping/adapter-prisma`](https://www.npmjs.com/package/@siteping/adapter-prisma) handlers and an `apiKey` configured server-side, **POST** and **OPTIONS** stay public — anonymous visitors can keep submitting feedback with zero widget config — while **GET**, **PATCH**, and **DELETE** require `Authorization: Bearer <apiKey>`. Without auth, the widget can submit but cannot list markers, resolve, or delete. See the [adapter-prisma Authentication docs](https://www.npmjs.com/package/@siteping/adapter-prisma#authentication) for the server-side setup.

For **internal tools already behind your own login**, a static key is fine:

```ts
initSiteping({
  endpoint: '/api/siteping',
  projectName: 'my-project',
  apiKey: process.env.NEXT_PUBLIC_SITEPING_KEY, // shipped to the browser!
})
```

> **⚠️ The widget runs in every visitor's browser.** Anything you put in `apiKey` (or static `headers`) is readable in your page source and grants GET/PATCH/DELETE on your feedback API. Never ship a static key on a public site.

For **public sites**, use the `headers` callback to send a short-lived token minted by your backend for the signed-in reviewer. It runs once per request (sync or async), and an explicit `Authorization` entry overrides `apiKey`:

```ts
initSiteping({
  endpoint: '/api/siteping',
  projectName: 'my-project',
  headers: async () => {
    const { token } = await fetch('/api/siteping-token').then((r) => r.json())
    return { Authorization: `Bearer ${token}` }
  },
})
```

Queued offline feedbacks never store headers — auth is re-computed when the queue is flushed on the next page load.

Two constraints to know:

- **Values are read at init.** Changing `apiKey` or swapping the `headers` value after `initSiteping()` has run has no effect until you destroy and re-init. The `headers` **callback** is the escape hatch: it's invoked on every request, so read rotating tokens from a ref or module variable inside it rather than closing over React state.
- **Cross-origin:** adapter-prisma's CORS preflight allows the `Content-Type` and `Authorization` headers only. Put credentials in `Authorization` (not a custom header name), or keep the endpoint same-origin.

## Return value API

`initSiteping()` returns a `SitepingInstance` with the following methods:

```ts
const widget = initSiteping({ ... })

widget.open()       // Open the feedback panel
widget.close()      // Close the feedback panel
widget.refresh()    // Refresh feedbacks from the server
widget.destroy()    // Remove the widget and clean up all DOM elements + listeners

// Scroll a specific annotation into view, pin its highlight, and pulse the
// marker. Counterpart to the `deepLink` config option for hosts that drive
// focus from JS (e.g. a notification click handler) instead of a URL query.
// Returns `false` when no visible marker matches the given ID (unknown ID,
// filtered by `scopeAnnotationsByUrl`, or markers not yet loaded — initial
// fetch is async).
widget.focusFeedback('feedback-id') // => boolean
```

## Event system

Use `widget.on()` / `widget.off()` as an alternative to config callbacks:

```ts
const widget = initSiteping({ ... })

// Subscribe to events
const unsub = widget.on('feedback:sent', (feedback) => {
  console.log('New feedback:', feedback.id)
})

widget.on('feedback:deleted', (id) => {
  console.log('Feedback deleted:', id)
})

widget.on('panel:open', () => {
  console.log('Panel opened')
})

widget.on('panel:close', () => {
  console.log('Panel closed')
})

// Unsubscribe
unsub()                              // via returned function
widget.off('feedback:sent', handler) // via off()
```

### All public events

| Event | Payload | Description |
|-------|---------|-------------|
| `feedback:sent` | `FeedbackResponse` | Fired after a feedback is successfully submitted |
| `feedback:deleted` | `string` (feedback id) | Fired after a feedback is deleted |
| `panel:open` | — | Fired when the feedback panel opens |
| `panel:close` | — | Fired when the feedback panel closes |

## CSP Requirements

The widget uses Shadow DOM (closed mode) for encapsulation, but overlay components (annotation layer, screenshot flash) live outside the shadow root. If your site enforces a strict Content Security Policy, you need to allow inline styles:

```
style-src 'unsafe-inline';
```

## Features

- Rectangle annotations with category + message
- DOM-anchored persistence (CSS selector + XPath + text snippet)
- Shadow DOM isolation (closed mode)
- Feedback panel with search, filters, resolve/unresolve
- Retry with backoff (queued in localStorage)
- Dev-only by default (auto-hides in production)

## Related Packages

| Package | Description |
|---------|-------------|
| [`@siteping/adapter-prisma`](https://www.npmjs.com/package/@siteping/adapter-prisma) | Server-side Prisma adapter |
| [`@siteping/adapter-memory`](https://www.npmjs.com/package/@siteping/adapter-memory) | In-memory adapter (testing, demos) |
| [`@siteping/adapter-localstorage`](https://www.npmjs.com/package/@siteping/adapter-localstorage) | Client-side localStorage adapter |
| [`@siteping/cli`](https://www.npmjs.com/package/@siteping/cli) | CLI for project setup |

## License

[MIT](https://github.com/NeosiaNexus/SitePing/blob/main/LICENSE)
