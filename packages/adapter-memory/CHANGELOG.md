# Changelog

## [0.7.0](https://github.com/NeosiaNexus/SitePing/compare/adapter-memory-v0.6.0...adapter-memory-v0.7.0) (2026-10-30)


### ⚠ BREAKING CHANGES

* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473))
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460))
* **widget:** render the 4-state model and capture screenshots with context
* **adapter-prisma:** 4-state validation, statuses bucket filter, screenshotRegion persistence

### Features

* **adapter-drizzle:** add a Drizzle adapter for PostgreSQL and libSQL ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-kit:** export isUnreachableOffset and FeedbackCreateOutcome; conformance suite grows to 56 tests ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-localstorage:** expose createFeedbackIfAbsent ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-localstorage:** persist screenshotRegion and support multi-status queries ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **adapter-memory:** expose createFeedbackIfAbsent ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-memory:** persist screenshotRegion and support multi-status queries ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **adapter-prisma:** 4-state validation, statuses bucket filter, screenshotRegion persistence ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **adapter-prisma:** delegate createSitepingHandler to @siteping/server and accept every server option (access, hooks, beforeCreate, presentFeedback, waitUntil, logger, describeError) ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))
* add adapter-memory, adapter-localstorage, and widget store mode ([efa8b64](https://github.com/NeosiaNexus/SitePing/commit/efa8b64197d1a612146b0c988f1b708cd594b373))
* **cli:** generate the screenshotRegion Json? column via siteping init/sync ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **core,server:** add discussion threads to feedback ([7cdca3b](https://github.com/NeosiaNexus/SitePing/commit/7cdca3b754c4b9e749772add28baafca38e021bb)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#280](https://github.com/NeosiaNexus/SitePing/issues/280)
* **core:** 4-state feedback model, screenshotRegion metadata and multi-status queries ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **dashboard:** @siteping/dashboard — Linear-style triage inbox with keyboard-first triage, annotated-screenshot evidence card, store/endpoint modes, theming and 7 locales; WCAG 2.1 AA verified (axe: zero violations) ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **demo:** freelancer inbox at /demo/inbox with a seeded triage backlog and real annotated screenshots ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* page-scoped annotations + semantic anchors (data-feedback-anchor) ([#55](https://github.com/NeosiaNexus/SitePing/issues/55)) ([db722de](https://github.com/NeosiaNexus/SitePing/commit/db722deab9f69cfdeb6fbe6f7f0bea57e2995e5c))
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460)) ([c9799ae](https://github.com/NeosiaNexus/SitePing/commit/c9799aecad15434b84a8df4ee78d3735017daf9d))
* screenshot capture with pluggable storage ([#58](https://github.com/NeosiaNexus/SitePing/issues/58)) ([f14ecd2](https://github.com/NeosiaNexus/SitePing/commit/f14ecd2f2f05a547a4a52e5a6ad4d794d438008c))
* **server:** add @siteping/server, a store-agnostic HTTP handler ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1)), closes [#306](https://github.com/NeosiaNexus/SitePing/issues/306)
* **server:** notify status changes, deletions and replies through opt-in webhook events ([#483](https://github.com/NeosiaNexus/SitePing/issues/483)) ([1847516](https://github.com/NeosiaNexus/SitePing/commit/18475163282a7c44f19a03f9223e8875372da3ea))
* tech-lead review quick wins — a11y keyboard flow, store persistence contract, CSV formula guard ([#165](https://github.com/NeosiaNexus/SitePing/issues/165)) ([56f17a9](https://github.com/NeosiaNexus/SitePing/commit/56f17a99f159dc12707bcc0ec2f7c906bddf2a3f))
* triage inbox (@siteping/dashboard), 4-state statuses and annotated screenshots ([#201](https://github.com/NeosiaNexus/SitePing/issues/201)) ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* type-safe contracts + mechanical extension paths (adapters, locales, packages) ([#247](https://github.com/NeosiaNexus/SitePing/issues/247)) ([75cd2f5](https://github.com/NeosiaNexus/SitePing/commit/75cd2f5024509e5552bfbcf7587a0d67819909a6))
* **widget:** capture last 50 console messages + failed network requests with each feedback ([#71](https://github.com/NeosiaNexus/SitePing/issues/71)) ([726e1b8](https://github.com/NeosiaNexus/SitePing/commit/726e1b8a0d4dcef726ec6dc468c168fb73396dbc))
* **widget:** render the 4-state model and capture screenshots with context ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))


### Bug Fixes

* **adapter-prisma:** make @prisma/client an optional peer dependency (Bun then no longer warns about an out-of-range @prisma/client; npm and pnpm still do) ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))
* **adapter-prisma:** notify webhooks once when the store reports its inserts; answer far pages from count ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* address independent audit findings on discussion threads ([988e95e](https://github.com/NeosiaNexus/SitePing/commit/988e95e8be134f4027cfd9c5a943e5c81dcf3903)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320)
* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517)) ([060d935](https://github.com/NeosiaNexus/SitePing/commit/060d935500b484a123746cfa5888c562fc437ddb))
* **core:** serialize collection-store mutations, harden store contracts ([21b81ef](https://github.com/NeosiaNexus/SitePing/commit/21b81efe995d6c45ef15a7ab1e300a821214311e)), closes [#341](https://github.com/NeosiaNexus/SitePing/issues/341) [#164](https://github.com/NeosiaNexus/SitePing/issues/164)
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473)) ([fc1013c](https://github.com/NeosiaNexus/SitePing/commit/fc1013c9b3e3f4ea1655451ca386657ccc34831b))
* ship fully resolvable type declarations for every published package ([#232](https://github.com/NeosiaNexus/SitePing/issues/232)) ([01a8085](https://github.com/NeosiaNexus/SitePing/commit/01a8085c90fab4e721eaede8def9a4d9f5eefcc0))


### Refactoring

* **widget,core:** share SegmentedControl, setButtonLoading, filter logic ([#75](https://github.com/NeosiaNexus/SitePing/issues/75)) ([8cb536b](https://github.com/NeosiaNexus/SitePing/commit/8cb536bca303b82e76a00e461d939da210054714))


### Documentation

* **adapter-memory:** mount the store with @siteping/server and point the conformance suite at @siteping/adapter-kit/testing ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))
* **site:** ship siteping.dev/docs — verified bilingual documentation + slimmed READMEs ([#241](https://github.com/NeosiaNexus/SitePing/issues/241)) ([252073f](https://github.com/NeosiaNexus/SitePing/commit/252073f2eb11a99980d81eecb5ed37b23c3894f8))


### Miscellaneous

* **deps:** reclassify @medv/finder, widen prisma peer range, harmonize engines ([#74](https://github.com/NeosiaNexus/SitePing/issues/74)) ([b28465d](https://github.com/NeosiaNexus/SitePing/commit/b28465dc762077a535b79dbaffb51faa73f68538))
* release main ([#166](https://github.com/NeosiaNexus/SitePing/issues/166)) ([34b8226](https://github.com/NeosiaNexus/SitePing/commit/34b8226cf044b3defdc6a7ff90e55c5c84550573))
* release main ([#202](https://github.com/NeosiaNexus/SitePing/issues/202)) ([953baab](https://github.com/NeosiaNexus/SitePing/commit/953baabe6d78146d1970456f1e9b6ecd53dc6a86))
* release main ([#21](https://github.com/NeosiaNexus/SitePing/issues/21)) ([9867b31](https://github.com/NeosiaNexus/SitePing/commit/9867b31c226a7754120de326f11b054c97e2371a))
* release main ([#233](https://github.com/NeosiaNexus/SitePing/issues/233)) ([84e5010](https://github.com/NeosiaNexus/SitePing/commit/84e501071113a80c3dfc74ee51190cab27b325d7))
* release main ([#245](https://github.com/NeosiaNexus/SitePing/issues/245)) ([16a35d2](https://github.com/NeosiaNexus/SitePing/commit/16a35d26972b75239b8d5d320e0de31b946efeca))
* release main ([#250](https://github.com/NeosiaNexus/SitePing/issues/250)) ([191ed11](https://github.com/NeosiaNexus/SitePing/commit/191ed11453baaab25b4503e4b374449955ec7b9b))
* release main ([#356](https://github.com/NeosiaNexus/SitePing/issues/356)) ([3df0253](https://github.com/NeosiaNexus/SitePing/commit/3df02534a3dec57288b8b2445de951b21196ad5f))
* release main ([#45](https://github.com/NeosiaNexus/SitePing/issues/45)) ([8166be1](https://github.com/NeosiaNexus/SitePing/commit/8166be111f1578b469408682f366cbf2c66cbc07))
* release main ([#467](https://github.com/NeosiaNexus/SitePing/issues/467)) ([5d1cfad](https://github.com/NeosiaNexus/SitePing/commit/5d1cfad3451db8771cf67030bdf2694cae648b25))
* release main ([#77](https://github.com/NeosiaNexus/SitePing/issues/77)) ([af0b492](https://github.com/NeosiaNexus/SitePing/commit/af0b4922800834cd807a784875c37d4189219619))

## [0.6.0](https://github.com/NeosiaNexus/SitePing/compare/adapter-memory-v0.5.4...adapter-memory-v0.6.0) (2026-10-30)


### ⚠ BREAKING CHANGES

* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473))
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460))

### Features

* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460)) ([c9799ae](https://github.com/NeosiaNexus/SitePing/commit/c9799aecad15434b84a8df4ee78d3735017daf9d))
* **server:** notify status changes, deletions and replies through opt-in webhook events ([#483](https://github.com/NeosiaNexus/SitePing/issues/483)) ([1847516](https://github.com/NeosiaNexus/SitePing/commit/18475163282a7c44f19a03f9223e8875372da3ea))


### Bug Fixes

* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517)) ([060d935](https://github.com/NeosiaNexus/SitePing/commit/060d935500b484a123746cfa5888c562fc437ddb))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473)) ([fc1013c](https://github.com/NeosiaNexus/SitePing/commit/fc1013c9b3e3f4ea1655451ca386657ccc34831b))

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
