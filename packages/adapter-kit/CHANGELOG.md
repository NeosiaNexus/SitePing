# Changelog

## [0.2.0](https://github.com/NeosiaNexus/SitePing/compare/adapter-kit-v0.1.2...adapter-kit-v0.2.0) (2026-10-30)


### ⚠ BREAKING CHANGES

* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517))
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460))

### Features

* **adapter-kit:** add a persistence-failure leg to the conformance suite ([#471](https://github.com/NeosiaNexus/SitePing/issues/471)) ([5772dc5](https://github.com/NeosiaNexus/SitePing/commit/5772dc50f6612af76423c15c521ab8a58f421bb2))
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460)) ([c9799ae](https://github.com/NeosiaNexus/SitePing/commit/c9799aecad15434b84a8df4ee78d3735017daf9d))
* **server:** notify status changes, deletions and replies through opt-in webhook events ([#483](https://github.com/NeosiaNexus/SitePing/issues/483)) ([1847516](https://github.com/NeosiaNexus/SitePing/commit/18475163282a7c44f19a03f9223e8875372da3ea))


### Bug Fixes

* **adapter-prisma,adapter-kit:** store text holding NUL or an unpaired surrogate ([#470](https://github.com/NeosiaNexus/SitePing/issues/470)) ([c059cb2](https://github.com/NeosiaNexus/SitePing/commit/c059cb2522f3dcfba388890f766be8d9d52cb7f9))
* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517)) ([060d935](https://github.com/NeosiaNexus/SitePing/commit/060d935500b484a123746cfa5888c562fc437ddb))
* **widget,dashboard,adapter-kit:** cap peer ranges at the majors CI runs ([#496](https://github.com/NeosiaNexus/SitePing/issues/496)) ([7c1afab](https://github.com/NeosiaNexus/SitePing/commit/7c1afab5360bb5bc353935b63d14e405067a09f4))
* **widget,dashboard,server:** export the types their public signatures use ([#477](https://github.com/NeosiaNexus/SitePing/issues/477)) ([f87ff7d](https://github.com/NeosiaNexus/SitePing/commit/f87ff7dec9c1a34679959db8d0cf426b4da87482))

## [0.1.2](https://github.com/NeosiaNexus/SitePing/compare/adapter-kit-v0.1.1...adapter-kit-v0.1.2) (2026-10-05)


### Features

* **adapter-drizzle:** add a Drizzle adapter for PostgreSQL and libSQL ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-kit:** export isUnreachableOffset and FeedbackCreateOutcome; conformance suite grows to 56 tests ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-localstorage:** expose createFeedbackIfAbsent ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-memory:** expose createFeedbackIfAbsent ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **core,server:** add discussion threads to feedback ([7cdca3b](https://github.com/NeosiaNexus/SitePing/commit/7cdca3b754c4b9e749772add28baafca38e021bb)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#280](https://github.com/NeosiaNexus/SitePing/issues/280)
* **server:** address independent audit findings ([511c3ff](https://github.com/NeosiaNexus/SitePing/commit/511c3ff732405331074066a6a262a5135817e760)), closes [#406](https://github.com/NeosiaNexus/SitePing/issues/406) [#364](https://github.com/NeosiaNexus/SitePing/issues/364)


### Bug Fixes

* **adapter-prisma:** notify webhooks once when the store reports its inserts; answer far pages from count ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* address independent audit findings on discussion threads ([988e95e](https://github.com/NeosiaNexus/SitePing/commit/988e95e8be134f4027cfd9c5a943e5c81dcf3903)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320)
* **core:** serialize collection-store mutations, harden store contracts ([21b81ef](https://github.com/NeosiaNexus/SitePing/commit/21b81efe995d6c45ef15a7ab1e300a821214311e)), closes [#341](https://github.com/NeosiaNexus/SitePing/issues/341) [#164](https://github.com/NeosiaNexus/SitePing/issues/164)

## [0.1.1](https://github.com/NeosiaNexus/SitePing/compare/adapter-kit-v0.1.0...adapter-kit-v0.1.1) (2026-09-03)


### Bug Fixes

* harden webhooks, validation, store engine and adapter contracts (audit 2026-09) ([#279](https://github.com/NeosiaNexus/SitePing/issues/279)) ([7336eea](https://github.com/NeosiaNexus/SitePing/commit/7336eea220938df4b34c8ece9270d246f772e61d))

## 0.1.0 (2026-07-28)


### Features

* type-safe contracts + mechanical extension paths (adapters, locales, packages) ([#247](https://github.com/NeosiaNexus/SitePing/issues/247)) ([75cd2f5](https://github.com/NeosiaNexus/SitePing/commit/75cd2f5024509e5552bfbcf7587a0d67819909a6))

## Changelog
