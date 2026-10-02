# Changelog

## [0.2.8](https://github.com/NeosiaNexus/SitePing/compare/dashboard-v0.2.7...dashboard-v0.2.8) (2026-09-29)


### Features

* **core,server:** add discussion threads to feedback ([7cdca3b](https://github.com/NeosiaNexus/SitePing/commit/7cdca3b754c4b9e749772add28baafca38e021bb)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#280](https://github.com/NeosiaNexus/SitePing/issues/280)
* **i18n:** add a Japanese (ja) locale to the widget and dashboard ([4faa755](https://github.com/NeosiaNexus/SitePing/commit/4faa75552afd1bfcb14aa019ea77fcc2549baa96)), closes [#47](https://github.com/NeosiaNexus/SitePing/issues/47) [#320](https://github.com/NeosiaNexus/SitePing/issues/320)
* **integration-issues:** keep one GitHub/GitLab issue per feedback ([#383](https://github.com/NeosiaNexus/SitePing/issues/383)) ([dc291e0](https://github.com/NeosiaNexus/SitePing/commit/dc291e01e9eee1934a05530830a0d31c2780621e)), closes [#318](https://github.com/NeosiaNexus/SitePing/issues/318)
* server-declared permissions and a read-only reviewer mode ([afd38aa](https://github.com/NeosiaNexus/SitePing/commit/afd38aaeef4358e9a82a7f7fac0303c6f920036a)), closes [#101](https://github.com/NeosiaNexus/SitePing/issues/101)
* **server:** address independent audit findings ([511c3ff](https://github.com/NeosiaNexus/SitePing/commit/511c3ff732405331074066a6a262a5135817e760)), closes [#406](https://github.com/NeosiaNexus/SitePing/issues/406) [#364](https://github.com/NeosiaNexus/SitePing/issues/364)
* **widget,dashboard:** show and reply to discussion threads ([d6721e4](https://github.com/NeosiaNexus/SitePing/commit/d6721e4972593229578ade211ac2b006f9dffb0f)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#331](https://github.com/NeosiaNexus/SitePing/issues/331)


### Bug Fixes

* address independent audit findings on discussion threads ([988e95e](https://github.com/NeosiaNexus/SitePing/commit/988e95e8be134f4027cfd9c5a943e5c81dcf3903)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320)
* **core:** serialize collection-store mutations, harden store contracts ([21b81ef](https://github.com/NeosiaNexus/SitePing/commit/21b81efe995d6c45ef15a7ab1e300a821214311e)), closes [#341](https://github.com/NeosiaNexus/SitePing/issues/341) [#164](https://github.com/NeosiaNexus/SitePing/issues/164)
* **dashboard:** append list params to an endpoint with a query string ([c61e3bf](https://github.com/NeosiaNexus/SitePing/commit/c61e3bfc7b511faf2fbcd5d5509b89e58ba43471))
* **dashboard:** make optimistic updates, pagination and focus race-free ([4a83abb](https://github.com/NeosiaNexus/SitePing/commit/4a83abba5155b7c92d3ed01b8dd33a5091aca7a1)), closes [#252](https://github.com/NeosiaNexus/SitePing/issues/252) [#164](https://github.com/NeosiaNexus/SitePing/issues/164)
* **widget:** clamp diagnostics buffers to the server's 50 / 20 entries ([c61e3bf](https://github.com/NeosiaNexus/SitePing/commit/c61e3bfc7b511faf2fbcd5d5509b89e58ba43471))
* **widget:** harden the send path, retry queue and captured context ([c61e3bf](https://github.com/NeosiaNexus/SitePing/commit/c61e3bfc7b511faf2fbcd5d5509b89e58ba43471)), closes [#307](https://github.com/NeosiaNexus/SitePing/issues/307) [#342](https://github.com/NeosiaNexus/SitePing/issues/342) [#344](https://github.com/NeosiaNexus/SitePing/issues/344)
* **widget:** record diagnostics URLs without credentials, query or hash ([c61e3bf](https://github.com/NeosiaNexus/SitePing/commit/c61e3bfc7b511faf2fbcd5d5509b89e58ba43471))


### Performance

* **dashboard,widget:** reclaim bundle size and tighten size budgets ([0f8a21e](https://github.com/NeosiaNexus/SitePing/commit/0f8a21e824225eb0f68e2eced583d154f4fe3790)), closes [#311](https://github.com/NeosiaNexus/SitePing/issues/311) [#313](https://github.com/NeosiaNexus/SitePing/issues/313)


### Refactoring

* **adapter-prisma:** share the 200-char identity cap with the widget ([c61e3bf](https://github.com/NeosiaNexus/SitePing/commit/c61e3bfc7b511faf2fbcd5d5509b89e58ba43471))
* **dashboard:** build deep links with core's shared helper ([dc291e0](https://github.com/NeosiaNexus/SitePing/commit/dc291e01e9eee1934a05530830a0d31c2780621e))

## [0.2.7](https://github.com/NeosiaNexus/SitePing/compare/dashboard-v0.2.6...dashboard-v0.2.7) (2026-09-23)


### Miscellaneous

* **deps-dev:** bump size-limit to 14.0.0 and replace preset-small-lib with @size-limit/file ([#294](https://github.com/NeosiaNexus/SitePing/issues/294)) ([2c56057](https://github.com/NeosiaNexus/SitePing/commit/2c56057b7d01de65bd446a0029a2377376fd34a9))
* **deps-dev:** bump the dev-dependencies group with 4 updates ([#284](https://github.com/NeosiaNexus/SitePing/issues/284)) ([b632f09](https://github.com/NeosiaNexus/SitePing/commit/b632f093912de591573a270767654b4c6e613f26))
* **deps:** bump the production-dependencies group across 1 directory with 7 updates ([#287](https://github.com/NeosiaNexus/SitePing/issues/287)) ([2d7d264](https://github.com/NeosiaNexus/SitePing/commit/2d7d2646a75276d6c8b53beb9ff070726ebdf5e4))

## [0.2.6](https://github.com/NeosiaNexus/SitePing/compare/dashboard-v0.2.5...dashboard-v0.2.6) (2026-09-03)


### Miscellaneous

* **deps-dev:** bump the dev-dependencies group with 7 updates ([#262](https://github.com/NeosiaNexus/SitePing/issues/262)) ([8be0415](https://github.com/NeosiaNexus/SitePing/commit/8be04151442a492d9b10a269b33d705c5c2c980c))
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
