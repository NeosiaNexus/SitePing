# Changelog

## [0.4.8](https://github.com/NeosiaNexus/SitePing/compare/cli-v0.4.7...cli-v0.4.8) (2026-06-14)


### Bug Fixes

* **cli:** avoid leading newline in prisma sync ([98f7c2a](https://github.com/NeosiaNexus/SitePing/commit/98f7c2a0a457734f54696481e30b39bb385fe6a9))

## [0.4.7](https://github.com/NeosiaNexus/SitePing/compare/cli-v0.4.6...cli-v0.4.7) (2026-06-01)


### Miscellaneous

* **deps-dev:** bump @clack/prompts from 0.9.1 to 1.4.0 ([#147](https://github.com/NeosiaNexus/SitePing/issues/147)) ([1d86fd2](https://github.com/NeosiaNexus/SitePing/commit/1d86fd2a323d14619c86def19acd1bbf0cf36d2b))
* **deps-dev:** bump commander from 13.1.0 to 14.0.3 ([#148](https://github.com/NeosiaNexus/SitePing/issues/148)) ([560c4f3](https://github.com/NeosiaNexus/SitePing/commit/560c4f3a1ca31d687f0243f98129e444b1de07d3))
* **deps-dev:** bump the dev-dependencies group with 2 updates ([#133](https://github.com/NeosiaNexus/SitePing/issues/133)) ([5a95afa](https://github.com/NeosiaNexus/SitePing/commit/5a95afa762350e3abd6cd9654fc9457427792ab4))

## [0.4.6](https://github.com/NeosiaNexus/SitePing/compare/cli-v0.4.5...cli-v0.4.6) (2026-05-19)


### Refactoring

* **types:** tighten type safety across all packages ([1b212ba](https://github.com/NeosiaNexus/SitePing/commit/1b212bae29177e71abc15a88d0133b73cde346e5))

## [0.4.5](https://github.com/NeosiaNexus/SitePing/compare/cli-v0.4.4...cli-v0.4.5) (2026-05-18)


### Features

* **widget:** capture last 50 console messages + failed network requests with each feedback ([#71](https://github.com/NeosiaNexus/SitePing/issues/71)) ([726e1b8](https://github.com/NeosiaNexus/SitePing/commit/726e1b8a0d4dcef726ec6dc468c168fb73396dbc))


### Miscellaneous

* **deps:** reclassify @medv/finder, widen prisma peer range, harmonize engines ([#74](https://github.com/NeosiaNexus/SitePing/issues/74)) ([b28465d](https://github.com/NeosiaNexus/SitePing/commit/b28465dc762077a535b79dbaffb51faa73f68538))

## [0.4.4](https://github.com/NeosiaNexus/SitePing/compare/cli-v0.4.3...cli-v0.4.4) (2026-05-06)


### Features

* page-scoped annotations + semantic anchors (data-feedback-anchor) ([#55](https://github.com/NeosiaNexus/SitePing/issues/55)) ([db722de](https://github.com/NeosiaNexus/SitePing/commit/db722deab9f69cfdeb6fbe6f7f0bea57e2995e5c))
* screenshot capture with pluggable storage ([#58](https://github.com/NeosiaNexus/SitePing/issues/58)) ([f14ecd2](https://github.com/NeosiaNexus/SitePing/commit/f14ecd2f2f05a547a4a52e5a6ad4d794d438008c))


### Tests

* raise unit test coverage to 99%+ across all packages ([f2e9f9e](https://github.com/NeosiaNexus/SitePing/commit/f2e9f9e406a6f0a3971b9df864af4e96d742304a))

## [0.4.3](https://github.com/NeosiaNexus/SitePing/compare/cli-v0.4.2...cli-v0.4.3) (2026-04-04)


### Bug Fixes

* **cli:** translate to English, exit codes, timeout, nativeType support ([2773cae](https://github.com/NeosiaNexus/SitePing/commit/2773cae20de4e6d6a01635cd100003c783b16765))
* comprehensive audit — 44 fixes across all packages ([60652ad](https://github.com/NeosiaNexus/SitePing/commit/60652ad03eb070fe18e2a4e943ea013f76070896))


### Tests

* add 184 tests across all packages + E2E for new features ([b7f869c](https://github.com/NeosiaNexus/SitePing/commit/b7f869c119c0a76f089d4e889d5b48be8b3e06c1))
* raise coverage to 93%+ with 110 new tests across all packages ([cb39737](https://github.com/NeosiaNexus/SitePing/commit/cb3973774a89dec2eafb6aeb6087d492647553c1))


### Documentation

* sync all documentation and CI with adapter-memory/localstorage packages ([1be3661](https://github.com/NeosiaNexus/SitePing/commit/1be36619c7c0b80d23cb4533fb2ca96beafa7bcf))

## [0.4.0](https://github.com/NeosiaNexus/SitePing/compare/cli-v0.3.0...cli-v0.4.0) (2026-04-03)

### Features

* docs, CI/CD, DX, and security improvements ([ae451e3](https://github.com/NeosiaNexus/SitePing/commit/ae451e3f883b61449fb87e965bc32d9bfb98c588))
* **repo:** add community files, npm keywords, and badges ([30645b4](https://github.com/NeosiaNexus/SitePing/commit/30645b42d5a52d945e7e3919ce197020e0f261d6))

### Bug Fixes

* resolve merge conflicts and post-merge issues ([e342ee8](https://github.com/NeosiaNexus/SitePing/commit/e342ee8cc3ade358d2a8c3685f5ae4080849c3ab))

### Refactoring

* **cli:** extract shared utils, bundle deps, fix language ([6118d9e](https://github.com/NeosiaNexus/SitePing/commit/6118d9ef522e51a1da62865fab4b627b6633e21e))

### Tests

* add coverage config, CLI tests, fix test quality ([27ad06d](https://github.com/NeosiaNexus/SitePing/commit/27ad06dd7dfcb75c5ffbf40a3a9c1282d89728f9))

### Documentation

* add README and LICENSE to each published package ([d4cfbf1](https://github.com/NeosiaNexus/SitePing/commit/d4cfbf16ca79562195be6374e74463f6aae7ceb0))

## [0.3.0](https://github.com/NeosiaNexus/SitePing/compare/cli-v0.2.0...cli-v0.3.0) (2026-04-03)

### ⚠ BREAKING CHANGES

* **main:** package renamed from @neosianexus/siteping to @siteping/*

### Refactoring

* **main:** migrate to @siteping/* monorepo with Turborepo ([e6b19a9](https://github.com/NeosiaNexus/SitePing/commit/e6b19a9675ca67eb5fc3888b45718c7e71a34b93))
