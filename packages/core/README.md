# @siteping/core

**Internal package** — shared types, schema, and helpers for all `@siteping/*` packages.

`private: true`, never published to npm. It exports raw TypeScript (no build step) and is bundled into consumers via `noExternal: ["@siteping/core"]` in their tsup configs — which makes it the single source of truth for:

- All shared TypeScript types (`SitepingConfig`, `SitepingInstance`, `FeedbackRecord`, `SitepingStore`, …)
- Feedback statuses (`FEEDBACK_STATUSES`: `open` / `in_progress` / `resolved` / `wont_fix`) and `isClosedStatus()`
- The Prisma model definitions the CLI generates from (`SITEPING_MODELS`)
- Store error classes (`StoreNotFoundError`, `StoreDuplicateError`, `StorePersistenceError`) and their guards — the guards match on `code` as well as `instanceof`, because every package bundles its own copy
- `@siteping/core/testing` — `testSitepingStore(factory)`, the 40-test conformance suite every store adapter must pass

Consumers never install this package: everything relevant is re-exported by the published packages. End-user documentation lives at [siteping.dev/docs](https://siteping.dev/docs).
