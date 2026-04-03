# @siteping/core

**Internal package** -- shared types and schema definitions for all `@siteping/*` packages.

Part of the [@siteping](https://github.com/NeosiaNexus/siteping) monorepo.

## Internal Package

This package is `private: true` and is **never published to npm**. It exports raw TypeScript (no build step) and is bundled directly into consumers via `noExternal: ["@siteping/core"]` in their tsup config.

This makes `@siteping/core` the **single source of truth** for:

- All shared TypeScript types
- The Prisma model definitions used by the CLI to generate schemas

## Main Exports

### Types

| Type | Description |
|------|-------------|
| `SitepingConfig` | Widget initialization options (endpoint, projectName, position, accentColor, events) |
| `SitepingInstance` | Return value of `initSiteping()` — contains `destroy()` |
| `FeedbackType` | `'question' \| 'changement' \| 'bug' \| 'autre'` |
| `FeedbackStatus` | `'open' \| 'resolved'` |
| `FeedbackPayload` | Shape of the POST request body sent by the widget |
| `FeedbackResponse` | Shape of feedback objects returned by the API |
| `AnnotationPayload` | Annotation data sent with a feedback (anchor + rect + viewport) |
| `AnnotationResponse` | Annotation as returned by the API |
| `AnchorData` | Multi-selector anchoring data (CSS selector, XPath, text snippet, fingerprint) |
| `RectData` | Percentage-relative rectangle within the anchor element |
| `FieldDef` | Schema field definition used by `SITEPING_MODELS` |

### Schema

| Export | Description |
|--------|-------------|
| `SITEPING_MODELS` | TypeScript representation of the Prisma models (`SitepingFeedback`, `SitepingAnnotation`). Used by the CLI to generate and sync the actual `.prisma` schema. |

## How It's Consumed

```ts
// In tsup.config.ts of widget, adapter-prisma, or cli:
export default defineConfig({
  noExternal: ["@siteping/core"],
  // ...
})
```

This inlines the raw TS exports at build time -- no separate build step needed for core.

## License

[MIT](https://github.com/NeosiaNexus/siteping/blob/main/LICENSE)
