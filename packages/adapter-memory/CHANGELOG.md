# Changelog

## [0.4.6](https://github.com/NeosiaNexus/SitePing/compare/adapter-memory-v0.4.5...adapter-memory-v0.4.6) (2026-06-10)


### Features

* tech-lead review quick wins — a11y keyboard flow, store persistence contract, CSV formula guard ([#165](https://github.com/NeosiaNexus/SitePing/issues/165)) ([56f17a9](https://github.com/NeosiaNexus/SitePing/commit/56f17a99f159dc12707bcc0ec2f7c906bddf2a3f))

## [0.4.5](https://github.com/NeosiaNexus/SitePing/compare/adapter-memory-v0.4.4...adapter-memory-v0.4.5) (2026-05-18)


### Features

* **widget:** capture last 50 console messages + failed network requests with each feedback ([#71](https://github.com/NeosiaNexus/SitePing/issues/71)) ([726e1b8](https://github.com/NeosiaNexus/SitePing/commit/726e1b8a0d4dcef726ec6dc468c168fb73396dbc))


### Refactoring

* **widget,core:** share SegmentedControl, setButtonLoading, filter logic ([#75](https://github.com/NeosiaNexus/SitePing/issues/75)) ([8cb536b](https://github.com/NeosiaNexus/SitePing/commit/8cb536bca303b82e76a00e461d939da210054714))


### Miscellaneous

* **deps:** reclassify @medv/finder, widen prisma peer range, harmonize engines ([#74](https://github.com/NeosiaNexus/SitePing/issues/74)) ([b28465d](https://github.com/NeosiaNexus/SitePing/commit/b28465dc762077a535b79dbaffb51faa73f68538))

## [0.4.4](https://github.com/NeosiaNexus/SitePing/compare/adapter-memory-v0.4.3...adapter-memory-v0.4.4) (2026-05-06)


### Features

* page-scoped annotations + semantic anchors (data-feedback-anchor) ([#55](https://github.com/NeosiaNexus/SitePing/issues/55)) ([db722de](https://github.com/NeosiaNexus/SitePing/commit/db722deab9f69cfdeb6fbe6f7f0bea57e2995e5c))
* screenshot capture with pluggable storage ([#58](https://github.com/NeosiaNexus/SitePing/issues/58)) ([f14ecd2](https://github.com/NeosiaNexus/SitePing/commit/f14ecd2f2f05a547a4a52e5a6ad4d794d438008c))

## [0.4.3](https://github.com/NeosiaNexus/SitePing/compare/adapter-memory-v0.4.2...adapter-memory-v0.4.3) (2026-04-04)


### Features

* add adapter-memory, adapter-localstorage, and widget store mode ([efa8b64](https://github.com/NeosiaNexus/SitePing/commit/efa8b64197d1a612146b0c988f1b708cd594b373))

## 0.4.2 (2026-04-04)

### Features

- Initial release
- `MemoryStore` implementing `SitepingStore` interface
- Zero dependencies, works in any JS environment
- `clear()` method for resetting store state
