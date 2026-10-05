# Changelog

## [0.5.4](https://github.com/NeosiaNexus/SitePing/compare/adapter-memory-v0.5.3...adapter-memory-v0.5.4) (2026-10-05)


### Features

* **adapter-drizzle:** add a Drizzle adapter for PostgreSQL and libSQL ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-kit:** export isUnreachableOffset and FeedbackCreateOutcome; conformance suite grows to 56 tests ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-localstorage:** expose createFeedbackIfAbsent ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-memory:** expose createFeedbackIfAbsent ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-prisma:** delegate createSitepingHandler to @siteping/server and accept every server option (access, hooks, beforeCreate, presentFeedback, waitUntil, logger, describeError) ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))
* **core,server:** add discussion threads to feedback ([7cdca3b](https://github.com/NeosiaNexus/SitePing/commit/7cdca3b754c4b9e749772add28baafca38e021bb)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#280](https://github.com/NeosiaNexus/SitePing/issues/280)
* **server:** add @siteping/server, a store-agnostic HTTP handler ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1)), closes [#306](https://github.com/NeosiaNexus/SitePing/issues/306)


### Bug Fixes

* **adapter-prisma:** make @prisma/client an optional peer dependency (Bun then no longer warns about an out-of-range @prisma/client; npm and pnpm still do) ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))
* **adapter-prisma:** notify webhooks once when the store reports its inserts; answer far pages from count ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* address independent audit findings on discussion threads ([988e95e](https://github.com/NeosiaNexus/SitePing/commit/988e95e8be134f4027cfd9c5a943e5c81dcf3903)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320)
* **core:** serialize collection-store mutations, harden store contracts ([21b81ef](https://github.com/NeosiaNexus/SitePing/commit/21b81efe995d6c45ef15a7ab1e300a821214311e)), closes [#341](https://github.com/NeosiaNexus/SitePing/issues/341) [#164](https://github.com/NeosiaNexus/SitePing/issues/164)


### Documentation

* **adapter-memory:** mount the store with @siteping/server and point the conformance suite at @siteping/adapter-kit/testing ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))

## [0.5.3](https://github.com/NeosiaNexus/SitePing/compare/adapter-memory-v0.5.2...adapter-memory-v0.5.3) (2026-07-28)


### Features

* type-safe contracts + mechanical extension paths (adapters, locales, packages) ([#247](https://github.com/NeosiaNexus/SitePing/issues/247)) ([75cd2f5](https://github.com/NeosiaNexus/SitePing/commit/75cd2f5024509e5552bfbcf7587a0d67819909a6))

## [0.5.2](https://github.com/NeosiaNexus/SitePing/compare/adapter-memory-v0.5.1...adapter-memory-v0.5.2) (2026-07-26)


### Bug Fixes

* **core:** clamp non-positive page and limit instead of slicing from the tail ([#242](https://github.com/NeosiaNexus/SitePing/issues/242)) ([8d989a3](https://github.com/NeosiaNexus/SitePing/commit/8d989a3bfb4a80c107a968fc66379e76ff830ea8))


### Documentation

* **site:** ship siteping.dev/docs — verified bilingual documentation + slimmed READMEs ([#241](https://github.com/NeosiaNexus/SitePing/issues/241)) ([252073f](https://github.com/NeosiaNexus/SitePing/commit/252073f2eb11a99980d81eecb5ed37b23c3894f8))

## [0.5.1](https://github.com/NeosiaNexus/SitePing/compare/adapter-memory-v0.5.0...adapter-memory-v0.5.1) (2026-07-25)


### Bug Fixes

* ship fully resolvable type declarations for every published package ([#232](https://github.com/NeosiaNexus/SitePing/issues/232)) ([01a8085](https://github.com/NeosiaNexus/SitePing/commit/01a8085c90fab4e721eaede8def9a4d9f5eefcc0))

## [0.5.0](https://github.com/NeosiaNexus/SitePing/compare/adapter-memory-v0.4.6...adapter-memory-v0.5.0) (2026-07-24)


### ⚠ BREAKING CHANGES

* **widget:** render the 4-state model and capture screenshots with context
* **adapter-prisma:** 4-state validation, statuses bucket filter, screenshotRegion persistence

### Features

* **adapter-localstorage:** persist screenshotRegion and support multi-status queries ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **adapter-memory:** persist screenshotRegion and support multi-status queries ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **adapter-prisma:** 4-state validation, statuses bucket filter, screenshotRegion persistence ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **cli:** generate the screenshotRegion Json? column via siteping init/sync ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **core:** 4-state feedback model, screenshotRegion metadata and multi-status queries ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **dashboard:** @siteping/dashboard — Linear-style triage inbox with keyboard-first triage, annotated-screenshot evidence card, store/endpoint modes, theming and 7 locales; WCAG 2.1 AA verified (axe: zero violations) ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **demo:** freelancer inbox at /demo/inbox with a seeded triage backlog and real annotated screenshots ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* triage inbox (@siteping/dashboard), 4-state statuses and annotated screenshots ([#201](https://github.com/NeosiaNexus/SitePing/issues/201)) ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **widget:** render the 4-state model and capture screenshots with context ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))

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
