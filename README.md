<div align="center">

<h1>SitePing</h1>

**Client feedback, pinned to the pixel.**

A lightweight feedback widget that lets your clients annotate websites during development.
Draw rectangles, leave comments, track bugs — directly on the live site.

[![npm version](https://img.shields.io/npm/v/@siteping/widget?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@siteping/widget)
[![npm downloads](https://img.shields.io/npm/dm/@siteping/widget?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@siteping/widget)
[![license](https://img.shields.io/npm/l/@siteping/widget?style=flat&colorA=000000&colorB=000000)](./LICENSE)
[![build](https://img.shields.io/github/actions/workflow/status/NeosiaNexus/SitePing/ci.yml?style=flat&colorA=000000&colorB=000000)](https://github.com/NeosiaNexus/SitePing/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@siteping/widget)](https://bundlephobia.com/package/@siteping/widget)

[Getting Started](#getting-started) &middot; [Configuration](#configuration) &middot; [API Reference](#api-reference) &middot; [CLI](#cli) &middot; [Architecture](#architecture)

</div>

---

## Why SitePing?

Stop chasing client feedback across Slack threads, email chains, and Notion docs. SitePing gives your clients a **contextual** way to leave feedback — anchored to the exact element they're looking at.

### SitePing vs. the alternatives

| | SitePing | Marker.io | BugHerd |
|---|---|---|---|
| **Self-hosted** | Yes — your DB, your data | No (SaaS) | No (SaaS) |
| **npm package** | `npm install` and go | npm + script tag | Script tag only |
| **Framework-native** | First-class Next.js support | Framework-agnostic | Framework-agnostic |
| **Pricing** | Free & open source | From $39/mo | From $42/mo |
| **DOM-anchored annotations** | Multi-selector (CSS + XPath + text) | Screenshot-based | Pin-based |
| **Annotations survive layout changes** | Yes (percentage-relative rects) | No (pixel coordinates) | Partially |
| **Customizable** | Full control (accent color, position, events) | Limited | Limited |

---

## Features

- **Rectangle annotations** — Clients draw directly on the page, with category + message
- **DOM-anchored persistence** — Annotations are tied to elements, not pixels. They survive layout changes
- **Shadow DOM isolation** — Widget CSS never leaks into your site, and your site CSS never breaks the widget
- **Radial menu** — Clean FAB with expandable actions (chat, annotate, toggle)
- **Feedback panel** — Searchable, filterable history with type chips and resolve/unresolve
- **Smart tooltips** — Hover a marker to preview, click to open the panel
- **Retry with backoff** — Failed submissions are queued in localStorage and retried automatically
- **Zero config auth** — Clients identify once (name + email), persisted locally
- **Full event system** — `onOpen`, `onClose`, `onFeedbackSent`, `onError`, `onAnnotationStart`, `onAnnotationEnd`
- **CLI scaffold** — `npx @siteping/cli init` sets up Prisma schema + API route
- **Monorepo** — Split into independent packages (`widget`, `adapter-prisma`, `cli`)
- **Dev-only by default** — Widget auto-hides in production unless `forceShow: true`

---

## Getting Started

### 1. Install

```bash
npm install @siteping/widget
# or
bun add @siteping/widget
```

### 2. Run the CLI

```bash
npx @siteping/cli init
```

This will:
- Add `SitepingFeedback` and `SitepingAnnotation` models to your `prisma/schema.prisma`
- Generate an API route at `app/api/siteping/route.ts`

Then push the schema:

```bash
npx prisma db push
```

### 3. Add the widget

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

That's it. Your clients can now draw rectangles on the site and leave feedback.

---

## Configuration

```ts
initSiteping({
  // Required
  endpoint: '/api/siteping',      // Your API route
  projectName: 'my-project',      // Scopes feedbacks to this project

  // Optional
  position: 'bottom-right',       // 'bottom-right' | 'bottom-left'
  accentColor: '#0066ff',         // Widget accent color
  theme: 'light',                 // 'light' | 'dark' | 'auto'
  locale: 'fr',                   // 'fr' | 'en' (default: 'fr')
  forceShow: false,               // Show in production? Default: false
  debug: false,                   // Enable debug logging

  // Events
  onOpen: () => {},
  onClose: () => {},
  onFeedbackSent: (feedback) => {},
  onError: (error) => {},
  onAnnotationStart: () => {},
  onAnnotationEnd: () => {},
  onSkip: (reason) => {},         // Called when widget is skipped (production/mobile)
})
```

### Return value

```ts
const widget = initSiteping({ ... })

widget.open()       // Open the feedback panel
widget.close()      // Close the feedback panel
widget.refresh()    // Refresh feedbacks from the server
widget.destroy()    // Remove the widget and clean up all DOM elements + listeners

// Event listeners (alternative to config callbacks)
const unsub = widget.on('feedbackSent', (feedback) => { ... })
unsub()             // Unsubscribe
widget.off('feedbackSent', handler)
```

---

## API Reference

### Server adapter

The adapter handles all API logic — validation, persistence, error handling.

```ts
// app/api/siteping/route.ts
import { createSitepingHandler } from '@siteping/adapter-prisma'
import { prisma } from '@/lib/prisma'

export const { GET, POST, PATCH, DELETE } = createSitepingHandler({ prisma })
```

#### Endpoints

| Method | Description | Status |
|--------|-------------|--------|
| `POST` | Create a feedback with annotations | `201` with full feedback object |
| `GET` | List feedbacks (filterable by type, status, search) | `200` with `{ feedbacks, total }` |
| `PATCH` | Resolve or unresolve a feedback | `200` with updated feedback |
| `DELETE` | Delete a feedback or all feedbacks for a project | `200` with `{ deleted: true }` |

#### Query parameters (GET)

| Param | Type | Description |
|-------|------|-------------|
| `projectName` | `string` | **Required.** Filter by project |
| `type` | `string` | Filter: `question`, `change`, `bug`, `other` |
| `status` | `string` | Filter: `open`, `resolved` |
| `search` | `string` | Full-text search on message content |
| `page` | `number` | Pagination (default: 1) |
| `limit` | `number` | Items per page (default: 50, max: 100) |

### Prisma schema

The CLI generates these models automatically. If you prefer manual setup:

```prisma
model SitepingFeedback {
  id          String   @id @default(cuid())
  projectName String
  type        String   // question | change | bug | other
  message     String
  status      String   @default("open")
  url         String
  viewport    String
  userAgent   String
  authorName  String
  authorEmail String
  clientId    String   @unique
  resolvedAt  DateTime?
  createdAt   DateTime @default(now())
  annotations SitepingAnnotation[]
}

model SitepingAnnotation {
  id               String   @id @default(cuid())
  feedbackId       String
  feedback         SitepingFeedback @relation(fields: [feedbackId], references: [id], onDelete: Cascade)
  cssSelector      String
  xpath            String
  textSnippet      String
  elementTag       String
  elementId        String?
  textPrefix       String
  textSuffix       String
  fingerprint      String
  neighborText     String
  xPct             Float
  yPct             Float
  wPct             Float
  hPct             Float
  scrollX          Float
  scrollY          Float
  viewportW        Int
  viewportH        Int
  devicePixelRatio Float    @default(1)
  createdAt        DateTime @default(now())
}
```

---

## CLI

```bash
npx @siteping/cli init
```

Interactive setup that:

1. Detects your `prisma/schema.prisma` file
2. Merges the Siteping models (idempotent — safe to run multiple times)
3. Generates the Next.js App Router API route

---

## Architecture

```
Browser                          Server
  |                                |
  |  initSiteping({ endpoint })    |
  |  ─── Widget (Shadow DOM) ───  |
  |    FAB (radial menu)           |
  |    Panel (history + filters)   |
  |    Annotator (draw rects)      |
  |    Markers + Tooltips          |
  |                                |
  |  ── POST /api/siteping ──────> |  createSitepingHandler({ prisma })
  |                                |    Zod validation
  |                                |    Prisma persistence
  |  <── 201 { feedback } ──────  |
  |                                |
  |  Marker appears on page        |
```

### Key design decisions

- **Shadow DOM (closed)** — Widget styles are fully isolated from the host page
- **Overlay outside Shadow DOM** — The annotation overlay and markers live in the main DOM to avoid clipping from `overflow:hidden` containers
- **Multi-selector anchoring** — Each annotation stores a CSS selector ([`@medv/finder`](https://github.com/antonmedv/finder)), XPath, and text snippet. Re-anchoring tries all three in order, inspired by [Hypothesis](https://web.hypothes.is/blog/fuzzy-anchoring/)
- **Percentage-relative rectangles** — Annotation positions are stored as fractions of the anchor element's bounding box, so they survive responsive layout changes
- **Event bus with error isolation** — User callbacks (`onError`, etc.) cannot crash internal widget logic

### Packages

| Package | Platform | Description |
|---------|----------|-------------|
| [`@siteping/widget`](https://www.npmjs.com/package/@siteping/widget) | Browser | Widget: `initSiteping()` |
| [`@siteping/adapter-prisma`](https://www.npmjs.com/package/@siteping/adapter-prisma) | Node.js | Server: `createSitepingHandler()` |
| [`@siteping/cli`](https://www.npmjs.com/package/@siteping/cli) | CLI | Setup: `init`, `sync`, `status`, `doctor` |

Each package is independently published and tree-shakeable. The widget bundle never includes Prisma or Zod. The adapter never includes DOM code.

---

## TypeScript

Full type definitions are included. Key exported types:

```ts
import type {
  SitepingConfig,
  SitepingInstance,
  SitepingPublicEvents,
  FeedbackType,       // 'question' | 'change' | 'bug' | 'other'
  FeedbackStatus,     // 'open' | 'resolved'
  FeedbackPayload,
  FeedbackResponse,
  AnnotationPayload,
  AnnotationResponse,
  AnchorData,
  RectData,
} from '@siteping/widget'
```

---

## Testing

```bash
# Unit tests (Vitest)
bun run test:run

# E2E tests (Playwright + Chromium)
bun run test:e2e

# Type check
bun run check
```

| Suite | Tests | What it covers |
|-------|-------|----------------|
| Unit (Vitest) | 238 | Zod validation, API handlers, EventBus, API client retry, identity persistence, theme normalization, DOM anchoring, resolver, fuzzy matching, fingerprinting, XPath, text context, i18n |
| E2E (Playwright) | 17 | Full browser: widget injection, FAB, panel, annotation draw, popup submit, marker creation, API persistence, cleanup |

---

## Troubleshooting

### Widget doesn't appear

The widget is **dev-only by default**. It auto-hides when `NODE_ENV=production` or `import.meta.env.MODE === 'production'`.

- **Fix:** Pass `forceShow: true` in the config to show it in production.
- The widget also hides on viewports narrower than **768px** (mobile). This is by design — annotation drawing requires a pointer device.

### Prisma errors after setup

If you see errors like `The table does not exist in the current database`, the schema hasn't been pushed yet.

```bash
npx prisma db push
```

If you changed your schema manually, ensure the `SitepingFeedback` and `SitepingAnnotation` models match the expected structure. Run `npx @siteping/cli doctor` to verify.

### Widget styles look broken

The widget renders inside a **closed Shadow DOM**, so host page styles cannot leak in. If you see style issues:

- Ensure no script is removing the `<siteping-widget>` element from the DOM.
- The annotation overlay and markers live **outside** the Shadow DOM (in the main DOM) to avoid `overflow: hidden` clipping. This is expected behavior.
- If a CSS reset targets `*` with `!important`, it may affect the overlay elements. Scope your reset to avoid `siteping-*` elements.

---

## Roadmap

- [ ] Drizzle adapter
- [ ] Dashboard UI for reviewing feedbacks
- [ ] MutationObserver for SPA re-anchoring
- [ ] Webhook notifications (Discord, Slack)
- [ ] Screenshot fallback when re-anchoring fails
- [x] Multi-language support (i18n)
- [ ] Nuxt / Astro / SvelteKit support

---

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

```bash
git clone https://github.com/NeosiaNexus/SitePing.git
cd SitePing
bun install
bun run build      # Build all packages
bun run test       # Tests in watch mode
bun run test:e2e   # E2E tests
```

---

## License

[MIT](./LICENSE)

---

<div align="center">
  <sub>Built by <a href="https://github.com/neosianexus">@neosianexus</a></sub>
</div>
