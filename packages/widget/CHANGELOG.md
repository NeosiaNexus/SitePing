# Changelog

## [0.9.15](https://github.com/NeosiaNexus/SitePing/compare/widget-v0.9.14...widget-v0.9.15) (2026-06-17)


### Bug Fixes

* **widget:** re-fetch feedbacks on SPA navigation ([#181](https://github.com/NeosiaNexus/SitePing/issues/181)) ([a8eddda](https://github.com/NeosiaNexus/SitePing/commit/a8eddda4cb4feec8c6c764713498979476ec5ade))

## [0.9.14](https://github.com/NeosiaNexus/SitePing/compare/widget-v0.9.13...widget-v0.9.14) (2026-06-10)


### Features

* tech-lead review quick wins — a11y keyboard flow, store persistence contract, CSV formula guard ([#165](https://github.com/NeosiaNexus/SitePing/issues/165)) ([56f17a9](https://github.com/NeosiaNexus/SitePing/commit/56f17a99f159dc12707bcc0ec2f7c906bddf2a3f))

## [0.9.13](https://github.com/NeosiaNexus/SitePing/compare/widget-v0.9.12...widget-v0.9.13) (2026-06-01)


### Features

* **widget:** add showAnnotationsToggle config to hide the FAB marker-visibility item ([#130](https://github.com/NeosiaNexus/SitePing/issues/130)) ([6ecdf86](https://github.com/NeosiaNexus/SitePing/commit/6ecdf867c8ce360cdb4fc004c6f48a0e98542b62))
* **widget:** clarify FAB radial-item labels and icons ([#128](https://github.com/NeosiaNexus/SitePing/issues/128)) ([9168e98](https://github.com/NeosiaNexus/SitePing/commit/9168e98a538db072d3212ae92c723ee5a4616ba0))


### Bug Fixes

* **widget:** exclude annotator overlay from captured screenshots ([#125](https://github.com/NeosiaNexus/SitePing/issues/125)) ([af04013](https://github.com/NeosiaNexus/SitePing/commit/af040131606eb67c2ec2160e75a5fe033879ed18))
* **widget:** preserve FAB toggle hover label across icon swaps ([#129](https://github.com/NeosiaNexus/SitePing/issues/129)) ([4e25241](https://github.com/NeosiaNexus/SitePing/commit/4e252411c0606bdc0cdc4d8f44d6c89c2c5e788c))
* **widget:** raise identity prompt above the in-flight feedback popup ([#127](https://github.com/NeosiaNexus/SitePing/issues/127)) ([f19e36c](https://github.com/NeosiaNexus/SitePing/commit/f19e36cea470a1423595874e8858f51e122ab3ff))
* **widget:** theme-aware focus & hover backgrounds in dark mode ([#158](https://github.com/NeosiaNexus/SitePing/issues/158)) ([106b557](https://github.com/NeosiaNexus/SitePing/commit/106b557cd8133fb8428485cec5be50fc4f7d65b6)), closes [#157](https://github.com/NeosiaNexus/SitePing/issues/157)


### Miscellaneous

* **deps:** bump @medv/finder from 3.2.0 to 4.0.2 ([#152](https://github.com/NeosiaNexus/SitePing/issues/152)) ([84e72ab](https://github.com/NeosiaNexus/SitePing/commit/84e72ab90f5270846aa940a6c03cfe46fdec160d))
* **deps:** bump the production-dependencies group across 1 directory with 3 updates ([#145](https://github.com/NeosiaNexus/SitePing/issues/145)) ([b529a27](https://github.com/NeosiaNexus/SitePing/commit/b529a276c98ca929376d3e00b82abcf495f16905))

## [0.9.12](https://github.com/NeosiaNexus/SitePing/compare/widget-v0.9.11...widget-v0.9.12) (2026-05-20)


### Bug Fixes

* **widget:** keep popup visible with spinner during feedback submission ([#114](https://github.com/NeosiaNexus/SitePing/issues/114)) ([1ec5c27](https://github.com/NeosiaNexus/SitePing/commit/1ec5c2791850b42b96a26fcb2a0f8ee81793abab))
* **widget:** re-localize FAB + popup after locale chunk loads ([#107](https://github.com/NeosiaNexus/SitePing/issues/107)) ([0e501c2](https://github.com/NeosiaNexus/SitePing/commit/0e501c2a6cfe805dd397c5f7174ffadc755aa1e2))
* **widget:** wire FAB unread badge to marker mutations ([#112](https://github.com/NeosiaNexus/SitePing/issues/112)) ([7a6aa1d](https://github.com/NeosiaNexus/SitePing/commit/7a6aa1de9ce1cb34b1c48ec55d01c5e4e10effee))

## [0.9.11](https://github.com/NeosiaNexus/SitePing/compare/widget-v0.9.10...widget-v0.9.11) (2026-05-19)


### Bug Fixes

* **widget:** avoid stale identity retry replay ([#95](https://github.com/NeosiaNexus/SitePing/issues/95)) ([7177e58](https://github.com/NeosiaNexus/SitePing/commit/7177e58cdb4cc7cfbda1e6ff36a9cbee46ba8e5f))


### Refactoring

* **types:** tighten type safety across all packages ([1b212ba](https://github.com/NeosiaNexus/SitePing/commit/1b212bae29177e71abc15a88d0133b73cde346e5))

## [0.9.10](https://github.com/NeosiaNexus/SitePing/compare/widget-v0.9.9...widget-v0.9.10) (2026-05-19)


### Features

* **widget:** deep-link to annotations via URL query + focusFeedback API ([#91](https://github.com/NeosiaNexus/SitePing/issues/91)) ([b821e43](https://github.com/NeosiaNexus/SitePing/commit/b821e436ec4291314e4b58666a1d9aad51d2a8d2))


### Bug Fixes

* **widget:** opaque backdrop-filter fallback for .sp-detail ([#92](https://github.com/NeosiaNexus/SitePing/issues/92)) ([41bee72](https://github.com/NeosiaNexus/SitePing/commit/41bee726ef24bf9456ba5a2481ea24150ba574a8))

## [0.9.9](https://github.com/NeosiaNexus/SitePing/compare/widget-v0.9.8...widget-v0.9.9) (2026-05-19)


### Features

* **widget:** allow host apps to pre-fill identity via config ([#82](https://github.com/NeosiaNexus/SitePing/issues/82)) ([d1d4363](https://github.com/NeosiaNexus/SitePing/commit/d1d4363e2ae74a8bccb91125b24e2575b1f352a1))

## [0.9.8](https://github.com/NeosiaNexus/SitePing/compare/widget-v0.9.7...widget-v0.9.8) (2026-05-18)


### Features

* **core,widget:** typed error hierarchy with retryable flag ([#76](https://github.com/NeosiaNexus/SitePing/issues/76)) ([f942c58](https://github.com/NeosiaNexus/SitePing/commit/f942c58b0a7d1f765ca92ceeded59c1e34157515))
* **widget:** add useSiteping() React hook with StrictMode-safe lifecycle ([#72](https://github.com/NeosiaNexus/SitePing/issues/72)) ([6a303e8](https://github.com/NeosiaNexus/SitePing/commit/6a303e8be0e8e0d1a7f41dd546077943741cd0c7))
* **widget:** capture last 50 console messages + failed network requests with each feedback ([#71](https://github.com/NeosiaNexus/SitePing/issues/71)) ([726e1b8](https://github.com/NeosiaNexus/SitePing/commit/726e1b8a0d4dcef726ec6dc468c168fb73396dbc))


### Bug Fixes

* **docs:** correct bundle size claim and remove phantom v1.0.0 section ([#65](https://github.com/NeosiaNexus/SitePing/issues/65)) ([12f12ed](https://github.com/NeosiaNexus/SitePing/commit/12f12ed772c5cff8cd39d5e3a7ae0c12560e6a9c))
* **widget:** show tooltip on marker focus (WCAG 1.4.13) + harden focus trap ([#73](https://github.com/NeosiaNexus/SitePing/issues/73)) ([ed710e3](https://github.com/NeosiaNexus/SitePing/commit/ed710e3cdf406f7a4854985f0ffc8731fe9acbbf))
* **widget:** unify i18n across 6 panel modules — DE/ES/IT/PT/RU now fully translated ([1666a6f](https://github.com/NeosiaNexus/SitePing/commit/1666a6f22f0abda3bd360c151d12814393af4aed))


### Performance

* **widget:** lazy-load panel and i18n locales (-50% first-paint gzip) ([#68](https://github.com/NeosiaNexus/SitePing/issues/68)) ([fa0a674](https://github.com/NeosiaNexus/SitePing/commit/fa0a674d18078c511b4b9267baa9e793ebb666f3))


### Refactoring

* **widget,core:** share SegmentedControl, setButtonLoading, filter logic ([#75](https://github.com/NeosiaNexus/SitePing/issues/75)) ([8cb536b](https://github.com/NeosiaNexus/SitePing/commit/8cb536bca303b82e76a00e461d939da210054714))


### Tests

* fix vitest i18n setup (restore green main) ([#80](https://github.com/NeosiaNexus/SitePing/issues/80)) ([f622223](https://github.com/NeosiaNexus/SitePing/commit/f622223d31a79e891918673143660ddb5b1399c3))


### Miscellaneous

* biome organize imports ([26d98c5](https://github.com/NeosiaNexus/SitePing/commit/26d98c5984d3e580455ed9acfa0cad367c8d83d7))
* **deps:** reclassify @medv/finder, widen prisma peer range, harmonize engines ([#74](https://github.com/NeosiaNexus/SitePing/issues/74)) ([b28465d](https://github.com/NeosiaNexus/SitePing/commit/b28465dc762077a535b79dbaffb51faa73f68538))

## [0.9.7](https://github.com/NeosiaNexus/SitePing/compare/widget-v0.9.6...widget-v0.9.7) (2026-05-06)


### Features

* page-scoped annotations + semantic anchors (data-feedback-anchor) ([#55](https://github.com/NeosiaNexus/SitePing/issues/55)) ([db722de](https://github.com/NeosiaNexus/SitePing/commit/db722deab9f69cfdeb6fbe6f7f0bea57e2995e5c))
* screenshot capture with pluggable storage ([#58](https://github.com/NeosiaNexus/SitePing/issues/58)) ([f14ecd2](https://github.com/NeosiaNexus/SitePing/commit/f14ecd2f2f05a547a4a52e5a6ad4d794d438008c))


### Bug Fixes

* **widget:** clamp popup inside viewport when rect leaves no room above or below ([#54](https://github.com/NeosiaNexus/SitePing/issues/54)) ([1aeffd2](https://github.com/NeosiaNexus/SitePing/commit/1aeffd2ee25e9595faf8e30d9993abacda5a9eb7))


### Tests

* raise unit test coverage to 99%+ across all packages ([f2e9f9e](https://github.com/NeosiaNexus/SitePing/commit/f2e9f9e406a6f0a3971b9df864af4e96d742304a))

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
