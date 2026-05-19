<div align="center">

<h1>SitePing</h1>

**Client feedback, pinned to the pixel.**

A lightweight feedback widget that lets your clients annotate websites during development.
Draw rectangles, leave comments, track bugs — directly on the live site.

![Demo](./demo.gif)

[![Website](https://img.shields.io/badge/website-siteping.dev-000000?style=flat&colorA=000000&colorB=000000)](https://siteping.dev)
[![Live Demo](https://img.shields.io/badge/demo-try%20it%20live-22c55e?style=flat&colorA=000000)](https://siteping.dev/demo)
[![npm version](https://img.shields.io/npm/v/@siteping/widget?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@siteping/widget)
[![npm downloads](https://img.shields.io/npm/dm/@siteping/widget?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@siteping/widget)
[![license](https://img.shields.io/npm/l/@siteping/widget?style=flat&colorA=000000&colorB=000000)](./LICENSE)
[![build](https://img.shields.io/github/actions/workflow/status/NeosiaNexus/SitePing/ci.yml?style=flat&colorA=000000&colorB=000000)](https://github.com/NeosiaNexus/SitePing/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![Bundle Size](https://img.shields.io/badge/widget-%E2%89%A454%20KB%20gzip%20(ESM)-blue)](./packages/widget/.size-limit.json)

[Getting Started](#getting-started) &middot; [Configuration](#configuration) &middot; [API Reference](#api-reference) &middot; [CLI](#cli) &middot; [Architecture](#architecture)

</div>

> **[See SitePing in action →](https://siteping.dev/demo)** — Draw annotations, leave feedback, track bugs directly on the live site.

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
- **Monorepo** — Split into independent packages (`widget`, `adapter-prisma`, `adapter-memory`, `adapter-localstorage`, `cli`)
- **Dev-only by default** — Widget auto-hides in production unless `forceShow: true`
- **Lightweight** — ~49 KB gzipped today; after the upcoming bundle split (in progress), target is ~30 KB gzipped on first paint

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

#### React (recommended)

```tsx
"use client"

import { useSiteping } from "@siteping/widget/react"

export default function Layout({ children }: { children: React.ReactNode }) {
  useSiteping({
    endpoint: "/api/siteping",
    projectName: "my-app",
  })
  return <>{children}</>
}
```

The `useSiteping` hook handles StrictMode double-mounts safely and tears the widget down on unmount. It returns the live instance so you can drive it programmatically from anywhere:

```tsx
"use client"
import { useSiteping } from "@siteping/widget/react"

export function HelpButton() {
  const widget = useSiteping({ endpoint: "/api/siteping", projectName: "my-app" })
  return <button onClick={() => widget?.open()}>Need help?</button>
}
```

React is declared as an optional peer dep — installing `@siteping/widget` alone won't pull React in, and the `/react` entry only resolves when you actually import it.

#### Vanilla JS / Any framework

```html
<script type="module">
  import { initSiteping } from '@siteping/widget'

  const widget = initSiteping({
    endpoint: '/api/siteping',
    projectName: 'my-project',
    forceShow: true,
  })

  // Clean up when needed
  // widget.destroy()
</script>
```

The widget is framework-agnostic — it works with React, Vue, Svelte, Astro, or plain HTML.

That's it. Your clients can now draw rectangles on the site and leave feedback.

---

## Configuration

```ts
initSiteping({
  // Required (one of endpoint or store)
  endpoint: '/api/siteping',      // Your API route (HTTP mode)
  // OR
  store: new LocalStorageStore(), // Direct store (client-side mode, no server)
  projectName: 'my-project',      // Scopes feedbacks to this project

  // Optional
  position: 'bottom-right',       // 'bottom-right' | 'bottom-left'
  accentColor: '#0066ff',         // Widget accent color
  theme: 'light',                 // 'light' | 'dark' | 'auto'
  locale: 'en',                   // 'en' | 'fr' (default: 'en')
  forceShow: false,               // Show in production? Default: false
  debug: false,                   // Enable debug logging
  identity: {                     // Pre-fill author from the host (SSO apps).
    name: 'Alice',                // When set, skips localStorage + modal.
    email: 'alice@example.com',
  },

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
const unsub = widget.on('feedback:sent', (feedback) => { ... })
unsub()             // Unsubscribe
widget.off('feedback:sent', handler)

// All public events:
// 'feedback:sent'    — fired after a feedback is successfully submitted
// 'feedback:deleted' — fired after a feedback is deleted (receives feedback id)
// 'panel:open'       — fired when the feedback panel opens
// 'panel:close'      — fired when the feedback panel closes
```

---

## Host-provided identity

Apps with their own authentication (SSO, NextAuth, Symfony Security, …) can pre-fill the feedback author directly:

```ts
initSiteping({
  endpoint: '/api/siteping',
  projectName: 'my-app',
  identity: { name: currentUser.fullName, email: currentUser.email },
})
```

When `identity` is set, the widget skips both the localStorage lookup and the identity modal — useful when the host already knows who the user is. The value is **not persisted**: pass the current user on every render so the widget always reflects the live signed-in state.

When `identity` is unset (default), the widget falls back to the existing behavior — localStorage first, modal as a last resort.

---

## Diagnostics capture

Turn on `captureDiagnostics` and every feedback ships with the last few `console.*` messages and failed network requests (HTTP ≥ 400 or network error). Closes the loop on the dreaded *"this page just doesn't work"* report.

```ts
initSiteping({
  endpoint: '/api/siteping',
  projectName: 'my-project',
  captureDiagnostics: true,
})
```

Or with per-channel control:

```ts
captureDiagnostics: {
  console: true,
  network: true,
  maxConsoleEntries: 50,   // default
  maxNetworkEntries: 20,   // default
}
```

The reviewer panel shows a collapsible **Diagnostics** section on each feedback that has captured data — colour-coded console levels and a status/method/URL line per failed request.

**Storage migration.** The Prisma schema gains a `diagnostics Json?` column. Existing installs need to re-run the sync:

```bash
npx siteping sync
npx prisma db push
```

The column is nullable so existing rows are unaffected. Hosts who don't want the migration can leave `captureDiagnostics` off — the widget never sends the field and the adapter never asks Prisma to write it.

**Privacy.** Console messages may contain whatever your app logs (user emails, IDs, …). Failed network URLs include the query string but never the response body. Inform end users in environments where they might log sensitive values, or restrict capture to internal builds.

---

## Notifications

Fire a Slack, Discord, or generic HTTP webhook every time a feedback is created — useful for surfacing client feedback in the team channel without leaving the chat.

```ts
// app/api/siteping/route.ts
import { createSitepingHandler } from '@siteping/adapter-prisma'
import { prisma } from '@/lib/prisma'

export const { GET, POST, PATCH, DELETE, OPTIONS } = createSitepingHandler({
  prisma,
  webhooks: [
    {
      url: process.env.SLACK_WEBHOOK_URL!,
      type: 'slack',
    },
    {
      url: process.env.DISCORD_WEBHOOK_URL!,
      type: 'discord',
    },
  ],
})
```

You can pass a single config or an array. Each entry accepts:

| Option | Type | Description |
|--------|------|-------------|
| `url` | `string` | **Required.** Endpoint to POST to (Slack/Discord incoming webhook, or your own). |
| `type` | `'slack' \| 'discord' \| 'generic'` | Payload format. Defaults to `'generic'` (raw `FeedbackRecord` JSON). |
| `headers` | `Record<string, string>` | Extra headers merged on top of `Content-Type: application/json` (sign payloads, add bearer tokens, …). |
| `timeoutMs` | `number` | Abort after this many ms. Defaults to `5000`. |
| `onError` | `(err, feedbackId) => void` | Observe delivery failures (network error, non-2xx, timeout). Without it, errors land in `console.warn`. |

**Behaviour**

- **Fire-and-forget.** The widget gets its `201` response before any webhook is awaited — a slow Slack response never blocks the user.
- **Per-webhook isolation.** One failing receiver does not stop the others.
- **Generic payload.** When `type` is omitted, the body is the full feedback record — wire your own formatter (Microsoft Teams, Mattermost, custom dashboard, …).

```ts
// Generic receiver — verify signatures, persist to your own queue, etc.
webhooks: [
  {
    url: 'https://my-server.example.com/notify',
    headers: { 'X-Signature': process.env.WEBHOOK_SECRET! },
    onError: (err, id) => logger.warn({ err, feedbackId: id }, 'webhook failed'),
  },
]
```

---

## API Reference

### Server adapter

The adapter handles all API logic — validation, persistence, error handling.

```ts
// app/api/siteping/route.ts
import { createSitepingHandler } from '@siteping/adapter-prisma'
import { prisma } from '@/lib/prisma'

export const { GET, POST, PATCH, DELETE, OPTIONS } = createSitepingHandler({ prisma })
```

> **Note:** The handler does not include rate limiting. Consider adding rate limiting middleware in production.

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
  diagnostics Json?    // captureDiagnostics snapshot — optional
  viewport    String
  userAgent   String
  authorName  String
  authorEmail String
  clientId    String   @unique
  resolvedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
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
HTTP mode (endpoint)                Client-side mode (store)
                                    
Browser              Server         Browser
  |                    |              |
  |  initSiteping()    |              |  initSiteping({ store })
  |  Widget ────────>  |              |  Widget ── StoreClient
  |                    |              |               |
  |  POST /api/siteping|              |       LocalStorageStore
  |  ───────────────>  |              |       or MemoryStore
  |                    |              |
  |  Handler           |              |  No server needed
  |    Zod validation  |              |
  |    Prisma / Store  |              |
  |  <── 201 ────────  |              |
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
| [`@siteping/adapter-memory`](https://www.npmjs.com/package/@siteping/adapter-memory) | Any | In-memory store (testing, demos, serverless) |
| [`@siteping/adapter-localstorage`](https://www.npmjs.com/package/@siteping/adapter-localstorage) | Browser | Client-side localStorage store (demos, prototyping) |
| [`@siteping/cli`](https://www.npmjs.com/package/@siteping/cli) | CLI | Setup: `init`, `sync`, `status`, `doctor` |

Each package is independently published and tree-shakeable. The widget bundle never includes Prisma or Zod. The adapter never includes DOM code.

All adapters implement the `SitepingStore` interface — swap adapters without changing any other code.

---

## Data & Privacy

- **What the widget collects:** author name, email, feedback message, page URL, viewport dimensions, user agent, and DOM anchoring data (CSS selector, XPath, text snippet, element coordinates).
- **No screenshots or full DOM snapshots** are captured — only the minimal data needed to re-anchor annotations.
- **Self-hosted** — all data is stored in your own database. Nothing is sent to third-party servers.
- **Sensitive URL parameters are automatically stripped** before submission to prevent accidental data leakage.

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
| Unit (Vitest) | ~1300 | Zod validation, API handlers, store conformance, adapter tests, EventBus, API client retry, identity persistence, theme normalization, DOM anchoring, resolver, fuzzy matching, fingerprinting, XPath, text context, i18n |
| E2E (Playwright) | 29 (×3 browsers) | Full browser: widget injection, FAB, panel, annotation draw, popup submit, marker creation, API persistence, i18n, search, touch, event delegation, cleanup |

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

### Security notes

- By default, the API has **no authentication**. Anyone who knows the endpoint URL can read, create, and delete feedbacks. For production, always set the `apiKey` option in `createSitepingHandler({ prisma, apiKey: process.env.SITEPING_API_KEY })`.
- The widget sends feedback without authentication (it runs in the browser). The `apiKey` protects admin operations (GET, PATCH, DELETE).
- Add rate limiting at your framework/infrastructure level to prevent abuse.

### Widget styles look broken

The widget renders inside a **closed Shadow DOM**, so host page styles cannot leak in. If you see style issues:

- Ensure no script is removing the `<siteping-widget>` element from the DOM.
- The annotation overlay and markers live **outside** the Shadow DOM (in the main DOM) to avoid `overflow: hidden` clipping. This is expected behavior.
- If a CSS reset targets `*` with `!important`, it may affect the overlay elements. Scope your reset to avoid `siteping-*` elements.

---

## Upgrading

See [CHANGELOG.md](./CHANGELOG.md) for version history.

---

## Roadmap

**Recently shipped**

- ✅ Multi-language support — 7 built-in locales (`en`, `fr`, `de`, `es`, `it`, `pt`, `ru`)
- ✅ Client-side store mode (no server needed)
- ✅ In-memory + localStorage adapters
- ✅ Adapter conformance test suite (22 tests, shared across adapters)
- ✅ Webhook notifications (Slack, Discord, generic HTTP) — see [Notifications](#notifications)

**Up next**

- 🚧 Drizzle adapter — [help wanted](https://github.com/NeosiaNexus/SitePing/labels/help%20wanted)
- 🚧 Framework example apps (Astro, SvelteKit, Nuxt) — [good first issues](https://github.com/NeosiaNexus/SitePing/labels/good%20first%20issue)
- 🚧 MutationObserver for SPA re-anchoring

**Planned**

- 📋 Dashboard UI for reviewing feedbacks
- 📋 Screenshot fallback when re-anchoring fails

> Want to help ship these? Browse [`good first issue`](https://github.com/NeosiaNexus/SitePing/labels/good%20first%20issue) and [`help wanted`](https://github.com/NeosiaNexus/SitePing/labels/help%20wanted).

---

## Contributing

Contributions are welcome — first-time contributors especially.

**Where to start**

- 🌱 [`good first issue`](https://github.com/NeosiaNexus/SitePing/labels/good%20first%20issue) — small, well-scoped tasks (locales, examples, docs, CLI flags)
- 🎯 [`help wanted`](https://github.com/NeosiaNexus/SitePing/labels/help%20wanted) — meatier features (new adapters, dashboard)
- 📖 [Contributing guide](./CONTRIBUTING.md) — local setup, architecture, release flow
- 🌍 Adding a new locale takes three small steps — see [Adding a Locale](./CONTRIBUTING.md#adding-a-locale)

**Quick setup**

```bash
git clone https://github.com/NeosiaNexus/SitePing.git
cd SitePing
bun install
bun run build      # Build all packages
bun run test       # Tests in watch mode
bun run test:e2e   # E2E tests
```

---

## Acknowledgements

A big thank you to the [Trade-su/SitePing](https://github.com/Trade-su/SitePing) fork — Valerii ([@Trade-su](https://github.com/Trade-su)) and grizodubov ([@grizodubov](https://github.com/grizodubov)) — for the work that inspired several upstream features. Forks that ship real ideas back are the best kind.

Specifically:

- **Page-scoped annotations + semantic anchors** (`data-feedback-anchor`) — solves the cross-page leak when CSS selectors accidentally match unrelated elements.
- **Screenshot capture** via `html2canvas` — adapted upstream with a pluggable `ScreenshotStorage` so production users can offload to S3/R2 instead of bloating Postgres.
- **Popup positioning fix** — clamps inside the viewport when the drawn rect leaves no room above or below.

If you maintain a fork that adds features, opening an upstream PR or even just an issue describing what you've built is incredibly valuable — it lets the community benefit beyond your fork's user base.

---

## Contributors

Every line of code, locale, doc fix, and bug report makes SitePing better. Huge thanks to everyone who has shown up — first-time contributors especially.

This project follows the [all-contributors](https://allcontributors.org) specification — every kind of contribution counts ([emoji key](https://allcontributors.org/docs/en/emoji-key)).

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/NeosiaNexus"><img src="https://avatars.githubusercontent.com/u/63867369?v=4?s=100" width="100px;" alt="Olsen Matheo"/><br /><sub><b>Olsen Matheo</b></sub></a><br /><a href="https://github.com/NeosiaNexus/SitePing/commits?author=NeosiaNexus" title="Code">💻</a> <a href="#maintenance-NeosiaNexus" title="Maintenance">🚧</a> <a href="https://github.com/NeosiaNexus/SitePing/commits?author=NeosiaNexus" title="Documentation">📖</a> <a href="#design-NeosiaNexus" title="Design">🎨</a> <a href="#infra-NeosiaNexus" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#ideas-NeosiaNexus" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/NeosiaNexus/SitePing/pulls?q=is%3Apr+reviewed-by%3ANeosiaNexus" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/NeosiaNexus/SitePing/commits?author=NeosiaNexus" title="Tests">⚠️</a> <a href="#projectManagement-NeosiaNexus" title="Project Management">📆</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/alceops"><img src="https://avatars.githubusercontent.com/u/278831803?v=4?s=100" width="100px;" alt="Alce"/><br /><sub><b>Alce</b></sub></a><br /><a href="https://github.com/NeosiaNexus/SitePing/commits?author=alceops" title="Code">💻</a> <a href="#translation-alceops" title="Translation">🌍</a> <a href="https://github.com/NeosiaNexus/SitePing/commits?author=alceops" title="Tests">⚠️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/reikjarloekl"><img src="https://avatars.githubusercontent.com/u/839540?v=4?s=100" width="100px;" alt="Jörn Bungartz"/><br /><sub><b>Jörn Bungartz</b></sub></a><br /><a href="https://github.com/NeosiaNexus/SitePing/issues?q=author%3Areikjarloekl" title="Bug reports">🐛</a> <a href="https://github.com/NeosiaNexus/SitePing/commits?author=reikjarloekl" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

> Want to be in this list? Code, docs, translations, bug reports, design ideas — all count. See [CONTRIBUTING.md](./CONTRIBUTING.md) to get started. The [@all-contributors](https://allcontributors.org/docs/en/bot/usage) bot can add you automatically when a maintainer comments `@all-contributors please add @your-username for code, doc`.

### Activity

![SitePing activity](https://repobeats.axiom.co/api/embed/9ac0c24e3801b4397a9ed90af984dfec23323d1c.svg "Repobeats analytics image")

<sub>Activity graph powered by <a href="https://repobeats.axiom.co">Repobeats</a>.</sub>

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=NeosiaNexus/SitePing&type=Date)](https://star-history.com/#NeosiaNexus/SitePing&Date)

---

## License

[MIT](./LICENSE)

---

<div align="center">
  <sub>Built by <a href="https://github.com/neosianexus">@neosianexus</a></sub>
</div>
