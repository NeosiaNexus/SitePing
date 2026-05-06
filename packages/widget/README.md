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

> **~23KB gzipped** — zero framework dependencies.

## Configuration

All configuration options for `initSiteping()`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endpoint` | `string` | — | Your API route (e.g. `/api/siteping`). Required unless `store` is provided |
| `store` | `SitepingStore` | — | Direct store for client-side mode. When set, bypasses HTTP |
| `projectName` | `string` | — | **Required.** Scopes feedbacks to this project |
| `position` | `'bottom-right' \| 'bottom-left'` | `'bottom-right'` | Widget FAB position |
| `accentColor` | `string` | `'#0066ff'` | Widget accent color — hex color (`#RGB`, `#RRGGBB`, `#RRGGBBAA`) |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'light'` | Widget color theme |
| `locale` | `'en' \| 'fr' \| 'de' \| 'es' \| 'it' \| 'pt' \| 'ru'` | `'en'` | Widget UI language. Unknown locales fall back to English |
| `forceShow` | `boolean` | `false` | Show the widget in production (hidden by default) |
| `debug` | `boolean` | `false` | Enable debug logging to console |

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

## Return value API

`initSiteping()` returns a `SitepingInstance` with the following methods:

```ts
const widget = initSiteping({ ... })

widget.open()       // Open the feedback panel
widget.close()      // Close the feedback panel
widget.refresh()    // Refresh feedbacks from the server
widget.destroy()    // Remove the widget and clean up all DOM elements + listeners
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
