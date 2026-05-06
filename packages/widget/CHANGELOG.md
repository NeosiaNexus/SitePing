# Changelog

## [0.9.6](https://github.com/NeosiaNexus/SitePing/compare/widget-v0.9.5...widget-v0.9.6) (2026-05-02)


### Features

* **widget:** add Brazilian Portuguese (pt) locale ([#41](https://github.com/NeosiaNexus/SitePing/issues/41)) ([ebee6d7](https://github.com/NeosiaNexus/SitePing/commit/ebee6d70d715b23624d4732c65c096002f463a75))
* **widget:** add German (de) locale ([#43](https://github.com/NeosiaNexus/SitePing/issues/43)) ([f028235](https://github.com/NeosiaNexus/SitePing/commit/f028235ce8dd40a42c4cd108ddc333b4fa646175))
* **widget:** add Italian (it) locale ([#42](https://github.com/NeosiaNexus/SitePing/issues/42)) ([d67fe88](https://github.com/NeosiaNexus/SitePing/commit/d67fe88e9edeb9f604b973fc47d049d55ced3481))
* **widget:** add panel enhancements — stats, sort, bulk, export, detail, shortcuts ([f3e8833](https://github.com/NeosiaNexus/SitePing/commit/f3e88333babf88d5426bc32b087a7b1210c17ef3))
* **widget:** add Russian (ru) locale ([#30](https://github.com/NeosiaNexus/SitePing/issues/30)) ([ce7c17b](https://github.com/NeosiaNexus/SitePing/commit/ce7c17be67900d8a0903f8d272383efd1ce49c0a))
* **widget:** add Spanish (es) locale ([#44](https://github.com/NeosiaNexus/SitePing/issues/44)) ([8fb4fd3](https://github.com/NeosiaNexus/SitePing/commit/8fb4fd332d642d0e6c05557d07a635c7696ceb53))
* **widget:** replace 8 filter chips with type dropdown + status segmented control ([0564010](https://github.com/NeosiaNexus/SitePing/commit/056401009b485609fa8a705218b144d7cabf60d5))


### Bug Fixes

* **widget,adapter-prisma:** harden retry queue, panel UX, and PATCH ownership ([26301d3](https://github.com/NeosiaNexus/SitePing/commit/26301d34f23c62a7e623741ca6f815841088ca4f))
* **widget:** fall back to body when no ancestor contains the drawn rect ([5a994f2](https://github.com/NeosiaNexus/SitePing/commit/5a994f21cb94ffd4ecda462a242ad78da5f521c8))
* **widget:** lift panel header above sticky filters so export dropdown overlays correctly ([d4ea6b8](https://github.com/NeosiaNexus/SitePing/commit/d4ea6b83d84dcb6760c6e53125de3585110f4410))


### Tests

* **widget:** add coverage for panel-bulk ([#38](https://github.com/NeosiaNexus/SitePing/issues/38)) ([52e126c](https://github.com/NeosiaNexus/SitePing/commit/52e126c00d4f699a0ddcf9ac333929dfe263b306))
* **widget:** add coverage for panel-sort ([#39](https://github.com/NeosiaNexus/SitePing/issues/39)) ([9dbd2c5](https://github.com/NeosiaNexus/SitePing/commit/9dbd2c5053d266df181b024b5b534cfb2508d31b))
* **widget:** add export utils coverage ([#40](https://github.com/NeosiaNexus/SitePing/issues/40)) ([a82d74e](https://github.com/NeosiaNexus/SitePing/commit/a82d74e1cafc4cacb9852be08a1157e6ca012c18))


### Miscellaneous

* harmonize locale rollout — types, docs, coverage thresholds ([40f7166](https://github.com/NeosiaNexus/SitePing/commit/40f71663d78156b5d46a9b1f7d7e938788a96e08))

## [0.9.5](https://github.com/NeosiaNexus/SitePing/compare/widget-v0.9.4...widget-v0.9.5) (2026-04-05)


### Bug Fixes

* **widget:** add button loading spinner and fix stale GET cache on mutations ([bab698d](https://github.com/NeosiaNexus/SitePing/commit/bab698db4f5ca4f9020657196f3ddb6b689907a9))

## [0.9.4](https://github.com/NeosiaNexus/SitePing/compare/widget-v0.9.3...widget-v0.9.4) (2026-04-04)


### Bug Fixes

* **widget:** prevent spam-click race condition on resolve/delete buttons ([9958150](https://github.com/NeosiaNexus/SitePing/commit/9958150f0be87df3a95f0d5816e68921827ab9c7))

## [0.9.3](https://github.com/NeosiaNexus/SitePing/compare/widget-v0.9.2...widget-v0.9.3) (2026-04-04)


### Features

* add adapter-memory, adapter-localstorage, and widget store mode ([efa8b64](https://github.com/NeosiaNexus/SitePing/commit/efa8b64197d1a612146b0c988f1b708cd594b373))


### Bug Fixes

* comprehensive audit — 44 fixes across all packages ([60652ad](https://github.com/NeosiaNexus/SitePing/commit/60652ad03eb070fe18e2a4e943ea013f76070896))
* **widget:** performance, security, DX, and dark theme overhaul ([b0422fe](https://github.com/NeosiaNexus/SitePing/commit/b0422fe27e2f76780956848fa8c1898710bcfe30))
* **widget:** preserve runtime NODE_ENV check for Shadow DOM mode in bundle ([4cf482b](https://github.com/NeosiaNexus/SitePing/commit/4cf482ba5c56f89dade7875b86eead4c124e11d7))


### Tests

* add 184 tests across all packages + E2E for new features ([b7f869c](https://github.com/NeosiaNexus/SitePing/commit/b7f869c119c0a76f089d4e889d5b48be8b3e06c1))
* raise coverage to 93%+ with 110 new tests across all packages ([cb39737](https://github.com/NeosiaNexus/SitePing/commit/cb3973774a89dec2eafb6aeb6087d492647553c1))


### Documentation

* update all documentation for adapter pattern and new packages ([bcdbd46](https://github.com/NeosiaNexus/SitePing/commit/bcdbd46cfe7f504f659335176e9454b66f3a4547))

## [0.9.0](https://github.com/NeosiaNexus/SitePing/compare/widget-v0.8.1...widget-v0.9.0) (2026-04-03)

### Features

* docs, CI/CD, DX, and security improvements ([ae451e3](https://github.com/NeosiaNexus/SitePing/commit/ae451e3f883b61449fb87e965bc32d9bfb98c588))
* **repo:** add community files, npm keywords, and badges ([30645b4](https://github.com/NeosiaNexus/SitePing/commit/30645b42d5a52d945e7e3919ce197020e0f261d6))
* **widget:** add i18n system with French and English locales ([0fe17d7](https://github.com/NeosiaNexus/SitePing/commit/0fe17d7bae454d30b94ae48a607fba97ba353460))
* **widget:** comprehensive accessibility improvements ([fb28f81](https://github.com/NeosiaNexus/SitePing/commit/fb28f815aac309ee87e7f0b26b8326663a2e6c5e))

### Bug Fixes

* resolve merge conflicts and post-merge issues ([e342ee8](https://github.com/NeosiaNexus/SitePing/commit/e342ee8cc3ade358d2a8c3685f5ae4080849c3ab))
* **widget:** fix double callbacks, unhandled promises, biome rules ([849af37](https://github.com/NeosiaNexus/SitePing/commit/849af378fb32ea0ee60468471e71f5dc5b56a66a))

### Performance

* **widget:** minify bundle, add DB indexes, optimize retry ([58e5e11](https://github.com/NeosiaNexus/SitePing/commit/58e5e113e2b67e860556fa68bc8b9fc7246fcfe0))

### Documentation

* add README and LICENSE to each published package ([d4cfbf1](https://github.com/NeosiaNexus/SitePing/commit/d4cfbf16ca79562195be6374e74463f6aae7ceb0))

## [0.8.1](https://github.com/NeosiaNexus/SitePing/compare/widget-v0.8.0...widget-v0.8.1) (2026-04-03)

### Documentation

* **widget:** clarify launcher jsdoc ([1a14004](https://github.com/NeosiaNexus/SitePing/commit/1a14004a8373fd8ed33af37c9e977164e2a5443e))

## [0.8.0](https://github.com/NeosiaNexus/SitePing/compare/widget-v0.7.0...widget-v0.8.0) (2026-04-03)

### ⚠ BREAKING CHANGES

* **main:** package renamed from @neosianexus/siteping to @siteping/*

### Refactoring

* **main:** migrate to @siteping/* monorepo with Turborepo ([e6b19a9](https://github.com/NeosiaNexus/SitePing/commit/e6b19a9675ca67eb5fc3888b45718c7e71a34b93))
