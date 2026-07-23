# Changelog

## [0.5.0](https://github.com/NeosiaNexus/SitePing/compare/adapter-prisma-v0.4.9...adapter-prisma-v0.5.0) (2026-07-23)


### ⚠ BREAKING CHANGES

* **adapter-prisma:** migrate validation to zod 4 ([#199](https://github.com/NeosiaNexus/SitePing/issues/199))

### Features

* **adapter-prisma:** migrate validation to zod 4 ([#199](https://github.com/NeosiaNexus/SitePing/issues/199)) ([2dd9604](https://github.com/NeosiaNexus/SitePing/commit/2dd9604236750becf4039e8050924e29891ae267))

## [0.4.9](https://github.com/NeosiaNexus/SitePing/compare/adapter-prisma-v0.4.8...adapter-prisma-v0.4.9) (2026-06-10)


### Features

* tech-lead review quick wins — a11y keyboard flow, store persistence contract, CSV formula guard ([#165](https://github.com/NeosiaNexus/SitePing/issues/165)) ([56f17a9](https://github.com/NeosiaNexus/SitePing/commit/56f17a99f159dc12707bcc0ec2f7c906bddf2a3f))

## [0.4.8](https://github.com/NeosiaNexus/SitePing/compare/adapter-prisma-v0.4.7...adapter-prisma-v0.4.8) (2026-05-19)


### Refactoring

* **types:** tighten type safety across all packages ([1b212ba](https://github.com/NeosiaNexus/SitePing/commit/1b212bae29177e71abc15a88d0133b73cde346e5))

## [0.4.7](https://github.com/NeosiaNexus/SitePing/compare/adapter-prisma-v0.4.6...adapter-prisma-v0.4.7) (2026-05-18)


### Features

* **adapter-prisma:** webhooks for Slack, Discord, and generic endpoints ([#70](https://github.com/NeosiaNexus/SitePing/issues/70)) ([74a42a7](https://github.com/NeosiaNexus/SitePing/commit/74a42a730dc2ce99de2978d90c378e9794fd1fd5))
* **widget:** capture last 50 console messages + failed network requests with each feedback ([#71](https://github.com/NeosiaNexus/SitePing/issues/71)) ([726e1b8](https://github.com/NeosiaNexus/SitePing/commit/726e1b8a0d4dcef726ec6dc468c168fb73396dbc))


### Bug Fixes

* **adapter-prisma:** require apiKey for DELETE/PATCH in production ([#63](https://github.com/NeosiaNexus/SitePing/issues/63)) ([16df663](https://github.com/NeosiaNexus/SitePing/commit/16df6634100a4669b330e69784a5853bea55367e))
* **adapter-prisma:** sanitize clientId to prevent path traversal ([#64](https://github.com/NeosiaNexus/SitePing/issues/64)) ([f911e2f](https://github.com/NeosiaNexus/SitePing/commit/f911e2f14efe1e7309cb2053bdb419bbbedc66a8))


### Miscellaneous

* **deps:** reclassify @medv/finder, widen prisma peer range, harmonize engines ([#74](https://github.com/NeosiaNexus/SitePing/issues/74)) ([b28465d](https://github.com/NeosiaNexus/SitePing/commit/b28465dc762077a535b79dbaffb51faa73f68538))

## [0.4.6](https://github.com/NeosiaNexus/SitePing/compare/adapter-prisma-v0.4.5...adapter-prisma-v0.4.6) (2026-05-06)


### Bug Fixes

* **adapter-prisma:** make ?search filter work on SQLite ([#46](https://github.com/NeosiaNexus/SitePing/issues/46)) ([d555e6c](https://github.com/NeosiaNexus/SitePing/commit/d555e6c678e290ae2f531685a1ee2197b30b3edc))

## [0.4.5](https://github.com/NeosiaNexus/SitePing/compare/adapter-prisma-v0.4.4...adapter-prisma-v0.4.5) (2026-05-06)


### Features

* page-scoped annotations + semantic anchors (data-feedback-anchor) ([#55](https://github.com/NeosiaNexus/SitePing/issues/55)) ([db722de](https://github.com/NeosiaNexus/SitePing/commit/db722deab9f69cfdeb6fbe6f7f0bea57e2995e5c))
* screenshot capture with pluggable storage ([#58](https://github.com/NeosiaNexus/SitePing/issues/58)) ([f14ecd2](https://github.com/NeosiaNexus/SitePing/commit/f14ecd2f2f05a547a4a52e5a6ad4d794d438008c))


### Tests

* raise unit test coverage to 99%+ across all packages ([f2e9f9e](https://github.com/NeosiaNexus/SitePing/commit/f2e9f9e406a6f0a3971b9df864af4e96d742304a))

## [0.4.4](https://github.com/NeosiaNexus/SitePing/compare/adapter-prisma-v0.4.3...adapter-prisma-v0.4.4) (2026-05-02)


### Bug Fixes

* **widget,adapter-prisma:** harden retry queue, panel UX, and PATCH ownership ([26301d3](https://github.com/NeosiaNexus/SitePing/commit/26301d34f23c62a7e623741ca6f815841088ca4f))

## [0.4.3](https://github.com/NeosiaNexus/SitePing/compare/adapter-prisma-v0.4.2...adapter-prisma-v0.4.3) (2026-04-04)


### Features

* add adapter-memory, adapter-localstorage, and widget store mode ([efa8b64](https://github.com/NeosiaNexus/SitePing/commit/efa8b64197d1a612146b0c988f1b708cd594b373))


### Bug Fixes

* **adapter-prisma:** auth granularity, project isolation, clean API surface ([416685d](https://github.com/NeosiaNexus/SitePing/commit/416685d6c3d3fe128e460373eb07fda88556a231))
* comprehensive audit — 44 fixes across all packages ([60652ad](https://github.com/NeosiaNexus/SitePing/commit/60652ad03eb070fe18e2a4e943ea013f76070896))


### Tests

* add 184 tests across all packages + E2E for new features ([b7f869c](https://github.com/NeosiaNexus/SitePing/commit/b7f869c119c0a76f089d4e889d5b48be8b3e06c1))


### Documentation

* update all documentation for adapter pattern and new packages ([bcdbd46](https://github.com/NeosiaNexus/SitePing/commit/bcdbd46cfe7f504f659335176e9454b66f3a4547))

## [0.4.0](https://github.com/NeosiaNexus/SitePing/compare/adapter-prisma-v0.3.0...adapter-prisma-v0.4.0) (2026-04-03)

### Features

* docs, CI/CD, DX, and security improvements ([ae451e3](https://github.com/NeosiaNexus/SitePing/commit/ae451e3f883b61449fb87e965bc32d9bfb98c588))
* **repo:** add community files, npm keywords, and badges ([30645b4](https://github.com/NeosiaNexus/SitePing/commit/30645b42d5a52d945e7e3919ce197020e0f261d6))

### Bug Fixes

* resolve merge conflicts and post-merge issues ([e342ee8](https://github.com/NeosiaNexus/SitePing/commit/e342ee8cc3ade358d2a8c3685f5ae4080849c3ab))

### Refactoring

* **architecture:** add SitepingStore interface, sync types ([c2afd03](https://github.com/NeosiaNexus/SitePing/commit/c2afd0353554c4277217059be94325ac60387835))

### Tests

* add coverage config, CLI tests, fix test quality ([27ad06d](https://github.com/NeosiaNexus/SitePing/commit/27ad06dd7dfcb75c5ffbf40a3a9c1282d89728f9))

### Documentation

* add README and LICENSE to each published package ([d4cfbf1](https://github.com/NeosiaNexus/SitePing/commit/d4cfbf16ca79562195be6374e74463f6aae7ceb0))

## [0.3.0](https://github.com/NeosiaNexus/SitePing/compare/adapter-prisma-v0.2.0...adapter-prisma-v0.3.0) (2026-04-03)

### ⚠ BREAKING CHANGES

* **main:** package renamed from @neosianexus/siteping to @siteping/*

### Refactoring

* **main:** migrate to @siteping/* monorepo with Turborepo ([e6b19a9](https://github.com/NeosiaNexus/SitePing/commit/e6b19a9675ca67eb5fc3888b45718c7e71a34b93))
