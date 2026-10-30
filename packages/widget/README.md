[![npm version](https://img.shields.io/npm/v/@siteping/widget)](https://www.npmjs.com/package/@siteping/widget)
[![Live Demo](https://img.shields.io/badge/demo-try%20it%20live-22c55e)](https://siteping.dev/demo)
[![Docs](https://img.shields.io/badge/docs-siteping.dev-0066ff)](https://siteping.dev/docs/widget)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

# @siteping/widget

**Client feedback, pinned to the page.**

The widget of SitePing, the open-source, self-hosted alternative to Marker.io. Your clients draw rectangles (or right-click, or tap an element on a phone), leave comments and reply in a thread — directly on your dev or staging site, anchored to the exact DOM element.

Part of [SitePing](https://github.com/NeosiaNexus/SitePing) — **[live demo](https://siteping.dev/demo)** · **[documentation](https://siteping.dev/docs/widget)**.

## Install

```bash
npm install @siteping/widget
```

## Quick start

React (the hook survives StrictMode double-mounts and tears down on unmount):

```tsx
"use client";
import { useSiteping } from "@siteping/widget/react";

export function Feedback() {
  useSiteping({ endpoint: "/api/siteping", projectName: "my-app" });
  return null;
}
```

Any other framework, or none:

```ts
import { initSiteping } from "@siteping/widget";

const widget = initSiteping({ endpoint: "/api/siteping", projectName: "my-app" });
// widget.open() / .close() / .refresh() / .focusFeedback(id) / .on(...) / .destroy()
```

No server? Pass `store: new LocalStorageStore()` (from `@siteping/adapter-localstorage`) instead of `endpoint` and the whole loop runs in the browser.

## Highlights

- **DOM-anchored annotations** — each one records several signals for its element (CSS selector, XPath, text, structure, an optional `data-feedback-anchor` key); on reload every match is scored and the best one wins, so annotations survive deploys and layout changes
- **Dev-only by default** — hides in production builds (`NODE_ENV`); `forceShow: true` for staging. Renders at every width, with a phone layout (`minViewportWidth` keeps it off small screens)
- **Opt-in extras** — screenshots of the annotated area (with `data-siteping-ignore="true"` privacy masking), console/network diagnostics, instant right-click comments that never hijack keyboard or modifier-key menus
- **Panel actions** — your own buttons and links in the feedback detail view: create a ticket, hand a feedback to an agent, open it in your tracker
- **Reliable** — failed sends retry with backoff, then wait in a localStorage queue for the next page load
- **Isolated & light** — closed Shadow DOM, ~59 kB gzip on first load (ESM: the entry and the chunk it imports); the panel (~10 kB), screenshot engine, and non-English locales load on demand
- **9 built-in locales** — en, fr, de, es, it, pt, ru, ja, ko (BCP-47 tags like `fr-CA` resolve automatically)

## Documentation

Every option with its real default and behavior: **[siteping.dev/docs/widget/configuration](https://siteping.dev/docs/widget/configuration)** — plus [screenshots & masking](https://siteping.dev/docs/widget/screenshots), [right-click comments](https://siteping.dev/docs/widget/right-click), [panel actions](https://siteping.dev/docs/widget/panel-actions), and [how anchoring works](https://siteping.dev/docs/widget/anchoring).

## License

[MIT](https://github.com/NeosiaNexus/SitePing/blob/main/LICENSE)
