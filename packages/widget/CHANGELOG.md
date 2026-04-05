# Changelog

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
