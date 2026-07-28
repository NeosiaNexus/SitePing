# Changelog

## [0.2.6](https://github.com/NeosiaNexus/SitePing/compare/dashboard-v0.2.5...dashboard-v0.2.6) (2026-07-28)


### Miscellaneous

* **deps-dev:** bump vitest from 3.2.7 to 4.1.10 in the vitest group across 1 directory ([#240](https://github.com/NeosiaNexus/SitePing/issues/240)) ([dca82f0](https://github.com/NeosiaNexus/SitePing/commit/dca82f078173c78d1703a7a8512adf1bffbc24ca))

## [0.2.5](https://github.com/NeosiaNexus/SitePing/compare/dashboard-v0.2.4...dashboard-v0.2.5) (2026-07-28)


### Features

* type-safe contracts + mechanical extension paths (adapters, locales, packages) ([#247](https://github.com/NeosiaNexus/SitePing/issues/247)) ([75cd2f5](https://github.com/NeosiaNexus/SitePing/commit/75cd2f5024509e5552bfbcf7587a0d67819909a6))

## [0.2.4](https://github.com/NeosiaNexus/SitePing/compare/dashboard-v0.2.3...dashboard-v0.2.4) (2026-07-26)


### Documentation

* **site:** ship siteping.dev/docs — verified bilingual documentation + slimmed READMEs ([#241](https://github.com/NeosiaNexus/SitePing/issues/241)) ([252073f](https://github.com/NeosiaNexus/SitePing/commit/252073f2eb11a99980d81eecb5ed37b23c3894f8))

## [0.2.3](https://github.com/NeosiaNexus/SitePing/compare/dashboard-v0.2.2...dashboard-v0.2.3) (2026-07-25)


### Bug Fixes

* ship fully resolvable type declarations for every published package ([#232](https://github.com/NeosiaNexus/SitePing/issues/232)) ([01a8085](https://github.com/NeosiaNexus/SitePing/commit/01a8085c90fab4e721eaede8def9a4d9f5eefcc0))

## [0.2.2](https://github.com/NeosiaNexus/SitePing/compare/dashboard-v0.2.1...dashboard-v0.2.2) (2026-07-24)


### Tests

* **dashboard:** unmount hooks in use-inbox tests — post-teardown debounce flake (fixes [#206](https://github.com/NeosiaNexus/SitePing/issues/206)) ([#212](https://github.com/NeosiaNexus/SitePing/issues/212)) ([2f74b78](https://github.com/NeosiaNexus/SitePing/commit/2f74b78df326597926b70051dec1bdea6e701fc6))

## [0.2.1](https://github.com/NeosiaNexus/SitePing/compare/dashboard-v0.2.0...dashboard-v0.2.1) (2026-07-24)


### Bug Fixes

* **adapter-prisma:** redact authorEmail and strip clientId from unauthenticated HTTP responses (fixes [#105](https://github.com/NeosiaNexus/SitePing/issues/105)) ([#208](https://github.com/NeosiaNexus/SitePing/issues/208)) ([2a511e7](https://github.com/NeosiaNexus/SitePing/commit/2a511e762009ac1a17d5b6e08e6ab1bf04884b0d))

## [0.2.0](https://github.com/NeosiaNexus/SitePing/compare/dashboard-v0.1.0...dashboard-v0.2.0) (2026-07-24)


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
