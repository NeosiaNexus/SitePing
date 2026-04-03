# @siteping/widget

**Client feedback, pinned to the pixel.**

A lightweight feedback widget that lets your clients annotate websites during development. Draw rectangles, leave comments, track bugs — directly on the live site.

Part of the [@siteping](https://github.com/NeosiaNexus/siteping) monorepo.

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

## Configuration

```ts
initSiteping({
  // Required
  endpoint: '/api/siteping',
  projectName: 'my-project',

  // Optional
  position: 'bottom-right',       // 'bottom-right' | 'bottom-left'
  forceShow: false,               // Show in production? Default: false

  // Events
  onOpen: () => {},
  onClose: () => {},
  onFeedbackSent: (feedback) => {},
  onError: (error) => {},
  onAnnotationStart: () => {},
  onAnnotationEnd: () => {},
})
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
| [`@siteping/cli`](https://www.npmjs.com/package/@siteping/cli) | CLI for project setup |

## License

[MIT](https://github.com/NeosiaNexus/siteping/blob/main/LICENSE)
