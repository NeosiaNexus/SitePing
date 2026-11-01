# Changelog

## [0.2.0](https://github.com/NeosiaNexus/SitePing/compare/adapter-drizzle-v0.1.0...adapter-drizzle-v0.2.0) (2026-10-30)


### ⚠ BREAKING CHANGES

* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517))
* **adapter-prisma:** upload screenshots under the stored feedback's id, and share one logger ([#495](https://github.com/NeosiaNexus/SitePing/issues/495))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473))
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460))

### Features

* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460)) ([c9799ae](https://github.com/NeosiaNexus/SitePing/commit/c9799aecad15434b84a8df4ee78d3735017daf9d))
* **server:** notify status changes, deletions and replies through opt-in webhook events ([#483](https://github.com/NeosiaNexus/SitePing/issues/483)) ([1847516](https://github.com/NeosiaNexus/SitePing/commit/18475163282a7c44f19a03f9223e8875372da3ea))


### Bug Fixes

* **adapter-prisma,adapter-kit:** store text holding NUL or an unpaired surrogate ([#470](https://github.com/NeosiaNexus/SitePing/issues/470)) ([c059cb2](https://github.com/NeosiaNexus/SitePing/commit/c059cb2522f3dcfba388890f766be8d9d52cb7f9))
* **adapter-prisma:** upload screenshots under the stored feedback's id, and share one logger ([#495](https://github.com/NeosiaNexus/SitePing/issues/495)) ([59ac33f](https://github.com/NeosiaNexus/SitePing/commit/59ac33f52db86ce97f6f62d9471649e1b288dfda))
* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517)) ([060d935](https://github.com/NeosiaNexus/SitePing/commit/060d935500b484a123746cfa5888c562fc437ddb))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473)) ([fc1013c](https://github.com/NeosiaNexus/SitePing/commit/fc1013c9b3e3f4ea1655451ca386657ccc34831b))


### Miscellaneous

* **deps-dev:** bump the dev-dependencies group across 1 directory with 11 updates ([#442](https://github.com/NeosiaNexus/SitePing/issues/442)) ([d3965b3](https://github.com/NeosiaNexus/SitePing/commit/d3965b32f85bb3c6f9f0928d5f9e4ec9014271c1))

## 0.1.0 (2026-10-05)


### Features

* **adapter-drizzle:** add a Drizzle adapter for PostgreSQL and libSQL ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-kit:** export isUnreachableOffset and FeedbackCreateOutcome; conformance suite grows to 56 tests ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-localstorage:** expose createFeedbackIfAbsent ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-memory:** expose createFeedbackIfAbsent ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-prisma:** delegate createSitepingHandler to @siteping/server and accept every server option (access, hooks, beforeCreate, presentFeedback, waitUntil, logger, describeError) ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))
* **core,server:** add discussion threads to feedback ([7cdca3b](https://github.com/NeosiaNexus/SitePing/commit/7cdca3b754c4b9e749772add28baafca38e021bb)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#280](https://github.com/NeosiaNexus/SitePing/issues/280)
* **server:** add @siteping/server, a store-agnostic HTTP handler ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1)), closes [#306](https://github.com/NeosiaNexus/SitePing/issues/306)
* **widget,dashboard:** show and reply to discussion threads ([d6721e4](https://github.com/NeosiaNexus/SitePing/commit/d6721e4972593229578ade211ac2b006f9dffb0f)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#331](https://github.com/NeosiaNexus/SitePing/issues/331)


### Bug Fixes

* **adapter-drizzle,widget:** address independent audit findings ([de9763d](https://github.com/NeosiaNexus/SitePing/commit/de9763ddcc191d48ba9faa897441db749524bd6f)), closes [#348](https://github.com/NeosiaNexus/SitePing/issues/348)
* **adapter-prisma:** make @prisma/client an optional peer dependency (Bun then no longer warns about an out-of-range @prisma/client; npm and pnpm still do) ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))
* **adapter-prisma:** notify webhooks once when the store reports its inserts; answer far pages from count ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-prisma:** run screenshot deletes at most 32 at a time ([d2ee80c](https://github.com/NeosiaNexus/SitePing/commit/d2ee80c858f24f4f7dc22a0ed1c70649efcef5e5))
* address independent audit findings on discussion threads ([988e95e](https://github.com/NeosiaNexus/SitePing/commit/988e95e8be134f4027cfd9c5a943e5c81dcf3903)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320)
* **screenshot-storage:** address independent audit findings ([d2ee80c](https://github.com/NeosiaNexus/SitePing/commit/d2ee80c858f24f4f7dc22a0ed1c70649efcef5e5))
* **widget:** cut long console lines and URLs on a code-point boundary ([de9763d](https://github.com/NeosiaNexus/SitePing/commit/de9763ddcc191d48ba9faa897441db749524bd6f))


### Documentation

* **adapter-memory:** mount the store with @siteping/server and point the conformance suite at @siteping/adapter-kit/testing ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))

## Changelog
