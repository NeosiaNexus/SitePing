# Changelog

## [0.7.0](https://github.com/NeosiaNexus/SitePing/compare/cli-v0.6.0...cli-v0.7.0) (2026-10-30)


### ⚠ BREAKING CHANGES

* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460))
* **server,cli,adapter-prisma:** size MySQL columns for every value the server accepts ([#451](https://github.com/NeosiaNexus/SitePing/issues/451))
* **widget:** render the 4-state model and capture screenshots with context
* **adapter-prisma:** 4-state validation, statuses bucket filter, screenshotRegion persistence
* **main:** package renamed from @neosianexus/siteping to @siteping/*

### Features

* **adapter-localstorage:** persist screenshotRegion and support multi-status queries ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **adapter-memory:** persist screenshotRegion and support multi-status queries ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **adapter-prisma:** 4-state validation, statuses bucket filter, screenshotRegion persistence ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **cli:** generate the screenshotRegion Json? column via siteping init/sync ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **core,server:** add discussion threads to feedback ([7cdca3b](https://github.com/NeosiaNexus/SitePing/commit/7cdca3b754c4b9e749772add28baafca38e021bb)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#280](https://github.com/NeosiaNexus/SitePing/issues/280)
* **core:** 4-state feedback model, screenshotRegion metadata and multi-status queries ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **dashboard:** @siteping/dashboard — Linear-style triage inbox with keyboard-first triage, annotated-screenshot evidence card, store/endpoint modes, theming and 7 locales; WCAG 2.1 AA verified (axe: zero violations) ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **demo:** freelancer inbox at /demo/inbox with a seeded triage backlog and real annotated screenshots ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* docs, CI/CD, DX, and security improvements ([ae451e3](https://github.com/NeosiaNexus/SitePing/commit/ae451e3f883b61449fb87e965bc32d9bfb98c588))
* page-scoped annotations + semantic anchors (data-feedback-anchor) ([#55](https://github.com/NeosiaNexus/SitePing/issues/55)) ([db722de](https://github.com/NeosiaNexus/SitePing/commit/db722deab9f69cfdeb6fbe6f7f0bea57e2995e5c))
* **repo:** add community files, npm keywords, and badges ([30645b4](https://github.com/NeosiaNexus/SitePing/commit/30645b42d5a52d945e7e3919ce197020e0f261d6))
* **repo:** add community files, npm keywords, and badges ([998237d](https://github.com/NeosiaNexus/SitePing/commit/998237dcf83352ca4be257be91aa8b727049d0d4))
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460)) ([c9799ae](https://github.com/NeosiaNexus/SitePing/commit/c9799aecad15434b84a8df4ee78d3735017daf9d))
* screenshot capture with pluggable storage ([#58](https://github.com/NeosiaNexus/SitePing/issues/58)) ([f14ecd2](https://github.com/NeosiaNexus/SitePing/commit/f14ecd2f2f05a547a4a52e5a6ad4d794d438008c))
* triage inbox (@siteping/dashboard), 4-state statuses and annotated screenshots ([#201](https://github.com/NeosiaNexus/SitePing/issues/201)) ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* type-safe contracts + mechanical extension paths (adapters, locales, packages) ([#247](https://github.com/NeosiaNexus/SitePing/issues/247)) ([75cd2f5](https://github.com/NeosiaNexus/SitePing/commit/75cd2f5024509e5552bfbcf7587a0d67819909a6))
* **widget:** capture last 50 console messages + failed network requests with each feedback ([#71](https://github.com/NeosiaNexus/SitePing/issues/71)) ([726e1b8](https://github.com/NeosiaNexus/SitePing/commit/726e1b8a0d4dcef726ec6dc468c168fb73396dbc))
* **widget:** render the 4-state model and capture screenshots with context ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))


### Bug Fixes

* address independent audit findings on discussion threads ([988e95e](https://github.com/NeosiaNexus/SitePing/commit/988e95e8be134f4027cfd9c5a943e5c81dcf3903)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320)
* **cli:** avoid leading newline in prisma sync ([98f7c2a](https://github.com/NeosiaNexus/SitePing/commit/98f7c2a0a457734f54696481e30b39bb385fe6a9))
* **cli:** generate a route that builds its handler on the first request ([#453](https://github.com/NeosiaNexus/SitePing/issues/453)) ([9798d4d](https://github.com/NeosiaNexus/SitePing/commit/9798d4dd16359d0cc03552e3e4da0f1c348d361d))
* **cli:** make sync, status and doctor robust to real-world schemas ([1dcfb6a](https://github.com/NeosiaNexus/SitePing/commit/1dcfb6a86475c4afa1d281a4a0e010f19c7b6c3a)), closes [#169](https://github.com/NeosiaNexus/SitePing/issues/169) [#249](https://github.com/NeosiaNexus/SitePing/issues/249)
* **cli:** point init at the live schema docs and an npx command ([#481](https://github.com/NeosiaNexus/SitePing/issues/481)) ([1a57ccd](https://github.com/NeosiaNexus/SitePing/commit/1a57ccd970f711ae8b55ba5431af61664b15c1c2))
* **cli:** run under plain Node — createRequire shim + Object.groupBy polyfill ([#221](https://github.com/NeosiaNexus/SitePing/issues/221)) ([45ee65d](https://github.com/NeosiaNexus/SitePing/commit/45ee65de4ed164b683d76e8ac6adc3b5bbe8240e))
* **cli:** translate to English, exit codes, timeout, nativeType support ([2773cae](https://github.com/NeosiaNexus/SitePing/commit/2773cae20de4e6d6a01635cd100003c783b16765))
* comprehensive audit — 44 fixes across all packages ([60652ad](https://github.com/NeosiaNexus/SitePing/commit/60652ad03eb070fe18e2a4e943ea013f76070896))
* harden webhooks, validation, store engine and adapter contracts (audit 2026-09) ([#279](https://github.com/NeosiaNexus/SitePing/issues/279)) ([7336eea](https://github.com/NeosiaNexus/SitePing/commit/7336eea220938df4b34c8ece9270d246f772e61d))
* resolve merge conflicts and post-merge issues ([e342ee8](https://github.com/NeosiaNexus/SitePing/commit/e342ee8cc3ade358d2a8c3685f5ae4080849c3ab))
* **server,cli,adapter-prisma:** size MySQL columns for every value the server accepts ([#451](https://github.com/NeosiaNexus/SitePing/issues/451)) ([acedb18](https://github.com/NeosiaNexus/SitePing/commit/acedb1836ac19ddc63d6dc73c23b661df5447880))
* **widget:** fix double callbacks, unhandled promises, biome rules ([849af37](https://github.com/NeosiaNexus/SitePing/commit/849af378fb32ea0ee60468471e71f5dc5b56a66a))
* **widget:** fix double callbacks, unhandled promises, biome rules ([887cbaa](https://github.com/NeosiaNexus/SitePing/commit/887cbaabc67dc1d7887c142ae2c307025d227a03))


### Performance

* **widget:** minify bundle, add DB indexes, optimize retry ([58e5e11](https://github.com/NeosiaNexus/SitePing/commit/58e5e113e2b67e860556fa68bc8b9fc7246fcfe0))
* **widget:** minify bundle, add DB indexes, optimize retry ([d196b68](https://github.com/NeosiaNexus/SitePing/commit/d196b68b391b0c9849fee24e1f73173d7a7a6525))


### Refactoring

* **cli:** extract shared utils, bundle deps, fix language ([6118d9e](https://github.com/NeosiaNexus/SitePing/commit/6118d9ef522e51a1da62865fab4b627b6633e21e))
* **cli:** extract shared utils, bundle deps, fix language ([3e3d3ca](https://github.com/NeosiaNexus/SitePing/commit/3e3d3cada808f511cf5e3f8111671ce8283ef3ad))
* **main:** migrate to @siteping/* monorepo with Turborepo ([e6b19a9](https://github.com/NeosiaNexus/SitePing/commit/e6b19a9675ca67eb5fc3888b45718c7e71a34b93))
* **types:** tighten type safety across all packages ([1b212ba](https://github.com/NeosiaNexus/SitePing/commit/1b212bae29177e71abc15a88d0133b73cde346e5))


### Tests

* add 184 tests across all packages + E2E for new features ([b7f869c](https://github.com/NeosiaNexus/SitePing/commit/b7f869c119c0a76f089d4e889d5b48be8b3e06c1))
* add coverage config, CLI tests, fix test quality ([27ad06d](https://github.com/NeosiaNexus/SitePing/commit/27ad06dd7dfcb75c5ffbf40a3a9c1282d89728f9))
* add coverage config, CLI tests, fix test quality ([d586732](https://github.com/NeosiaNexus/SitePing/commit/d586732f3df97f6cda5bba09a2fe48a60b06ac8e))
* **cli:** stage permission errors without chmod so the suite passes as root ([#376](https://github.com/NeosiaNexus/SitePing/issues/376)) ([6e34edc](https://github.com/NeosiaNexus/SitePing/commit/6e34edcd5d1bd62c7853d6dacfe874930f1683b4)), closes [#368](https://github.com/NeosiaNexus/SitePing/issues/368)
* raise coverage to 93%+ with 110 new tests across all packages ([cb39737](https://github.com/NeosiaNexus/SitePing/commit/cb3973774a89dec2eafb6aeb6087d492647553c1))
* raise unit test coverage to 99%+ across all packages ([f2e9f9e](https://github.com/NeosiaNexus/SitePing/commit/f2e9f9e406a6f0a3971b9df864af4e96d742304a))


### Documentation

* add README and LICENSE to each published package ([d4cfbf1](https://github.com/NeosiaNexus/SitePing/commit/d4cfbf16ca79562195be6374e74463f6aae7ceb0))
* **site:** ship siteping.dev/docs — verified bilingual documentation + slimmed READMEs ([#241](https://github.com/NeosiaNexus/SitePing/issues/241)) ([252073f](https://github.com/NeosiaNexus/SitePing/commit/252073f2eb11a99980d81eecb5ed37b23c3894f8))
* sync all documentation and CI with adapter-memory/localstorage packages ([1be3661](https://github.com/NeosiaNexus/SitePing/commit/1be36619c7c0b80d23cb4533fb2ca96beafa7bcf))


### Miscellaneous

* add siteping.dev links, OG images, favicon, and error pages ([5d4db70](https://github.com/NeosiaNexus/SitePing/commit/5d4db70a55c3711285252ff6e4c99ad760a0eda6))
* **deps-dev:** bump @clack/prompts from 0.9.1 to 1.4.0 ([#147](https://github.com/NeosiaNexus/SitePing/issues/147)) ([1d86fd2](https://github.com/NeosiaNexus/SitePing/commit/1d86fd2a323d14619c86def19acd1bbf0cf36d2b))
* **deps-dev:** bump commander from 13.1.0 to 14.0.3 ([#148](https://github.com/NeosiaNexus/SitePing/issues/148)) ([560c4f3](https://github.com/NeosiaNexus/SitePing/commit/560c4f3a1ca31d687f0243f98129e444b1de07d3))
* **deps-dev:** bump commander from 14.0.3 to 15.0.0 ([#227](https://github.com/NeosiaNexus/SitePing/issues/227)) ([903b9fa](https://github.com/NeosiaNexus/SitePing/commit/903b9faacebfb5c616794c96a708859782ab287a))
* **deps-dev:** bump the dev-dependencies group across 1 directory with 6 updates ([#195](https://github.com/NeosiaNexus/SitePing/issues/195)) ([bc53c84](https://github.com/NeosiaNexus/SitePing/commit/bc53c8446541a1f9a57adcf1003f9cf29515a60e))
* **deps-dev:** bump the dev-dependencies group across 1 directory with 7 updates ([#295](https://github.com/NeosiaNexus/SitePing/issues/295)) ([703b4c6](https://github.com/NeosiaNexus/SitePing/commit/703b4c67a3680a9ab9fc58d73a213dfc8144d9a0))
* **deps-dev:** bump the dev-dependencies group with 2 updates ([#133](https://github.com/NeosiaNexus/SitePing/issues/133)) ([5a95afa](https://github.com/NeosiaNexus/SitePing/commit/5a95afa762350e3abd6cd9654fc9457427792ab4))
* **deps-dev:** bump vitest from 3.2.7 to 4.1.10 in the vitest group across 1 directory ([#240](https://github.com/NeosiaNexus/SitePing/issues/240)) ([dca82f0](https://github.com/NeosiaNexus/SitePing/commit/dca82f078173c78d1703a7a8512adf1bffbc24ca))
* **deps:** reclassify @medv/finder, widen prisma peer range, harmonize engines ([#74](https://github.com/NeosiaNexus/SitePing/issues/74)) ([b28465d](https://github.com/NeosiaNexus/SitePing/commit/b28465dc762077a535b79dbaffb51faa73f68538))
* release main ([69156f1](https://github.com/NeosiaNexus/SitePing/commit/69156f1c65602bf866d7559647ae20687b6782d5))
* release main ([#143](https://github.com/NeosiaNexus/SitePing/issues/143)) ([4ab64a4](https://github.com/NeosiaNexus/SitePing/commit/4ab64a4b7b7aeeface0ecfb011ba10ef536f001f))
* release main ([#179](https://github.com/NeosiaNexus/SitePing/issues/179)) ([8e17796](https://github.com/NeosiaNexus/SitePing/commit/8e1779641abe6ab03a2693d3da0af1ae7bcf43b1))
* release main ([#19](https://github.com/NeosiaNexus/SitePing/issues/19)) ([c72d917](https://github.com/NeosiaNexus/SitePing/commit/c72d91717bb43049e0c1103a4a3d7f66a54a5a16))
* release main ([#198](https://github.com/NeosiaNexus/SitePing/issues/198)) ([e4ba232](https://github.com/NeosiaNexus/SitePing/commit/e4ba2327190c4f8c4926e607a5e5766a6d0a9b66))
* release main ([#20](https://github.com/NeosiaNexus/SitePing/issues/20)) ([a6e3f4d](https://github.com/NeosiaNexus/SitePing/commit/a6e3f4df54810ca0511eb301d79f8a1854ce01e0))
* release main ([#202](https://github.com/NeosiaNexus/SitePing/issues/202)) ([953baab](https://github.com/NeosiaNexus/SitePing/commit/953baabe6d78146d1970456f1e9b6ecd53dc6a86))
* release main ([#21](https://github.com/NeosiaNexus/SitePing/issues/21)) ([9867b31](https://github.com/NeosiaNexus/SitePing/commit/9867b31c226a7754120de326f11b054c97e2371a))
* release main ([#222](https://github.com/NeosiaNexus/SitePing/issues/222)) ([df30a8f](https://github.com/NeosiaNexus/SitePing/commit/df30a8f65e96631d230c81fb7bdd9c841a48a0f6))
* release main ([#239](https://github.com/NeosiaNexus/SitePing/issues/239)) ([7a0c6a6](https://github.com/NeosiaNexus/SitePing/commit/7a0c6a6b6f9b11d3d5ab2b2975009a36e9852f7b))
* release main ([#245](https://github.com/NeosiaNexus/SitePing/issues/245)) ([16a35d2](https://github.com/NeosiaNexus/SitePing/commit/16a35d26972b75239b8d5d320e0de31b946efeca))
* release main ([#250](https://github.com/NeosiaNexus/SitePing/issues/250)) ([191ed11](https://github.com/NeosiaNexus/SitePing/commit/191ed11453baaab25b4503e4b374449955ec7b9b))
* release main ([#251](https://github.com/NeosiaNexus/SitePing/issues/251)) ([9550c57](https://github.com/NeosiaNexus/SitePing/commit/9550c57b7fae1dd1f691c11aef55e13d6bc9f3f1))
* release main ([#297](https://github.com/NeosiaNexus/SitePing/issues/297)) ([2e8cc58](https://github.com/NeosiaNexus/SitePing/commit/2e8cc58728f6d39e83db5ef32e437530acaa0605))
* release main ([#356](https://github.com/NeosiaNexus/SitePing/issues/356)) ([3df0253](https://github.com/NeosiaNexus/SitePing/commit/3df02534a3dec57288b8b2445de951b21196ad5f))
* release main ([#45](https://github.com/NeosiaNexus/SitePing/issues/45)) ([8166be1](https://github.com/NeosiaNexus/SitePing/commit/8166be111f1578b469408682f366cbf2c66cbc07))
* release main ([#467](https://github.com/NeosiaNexus/SitePing/issues/467)) ([5d1cfad](https://github.com/NeosiaNexus/SitePing/commit/5d1cfad3451db8771cf67030bdf2694cae648b25))
* release main ([#77](https://github.com/NeosiaNexus/SitePing/issues/77)) ([af0b492](https://github.com/NeosiaNexus/SitePing/commit/af0b4922800834cd807a784875c37d4189219619))
* release main ([#8](https://github.com/NeosiaNexus/SitePing/issues/8)) ([c5bc4eb](https://github.com/NeosiaNexus/SitePing/commit/c5bc4eba8f7548dc6af6e01db4e3bd53e1809560))
* release main ([#9](https://github.com/NeosiaNexus/SitePing/issues/9)) ([caa20d6](https://github.com/NeosiaNexus/SitePing/commit/caa20d65caf7073a4549d98413e31e036330bc1e))
* release main ([#96](https://github.com/NeosiaNexus/SitePing/issues/96)) ([4e66546](https://github.com/NeosiaNexus/SitePing/commit/4e665462dde1ce81a049bd2cdbedfaf53ff85d6a))
* rename repo to SitePing and improve project presence ([c1c6e1b](https://github.com/NeosiaNexus/SitePing/commit/c1c6e1bfa3f1a00f8df3523a3e8beb26422a886a))

## [0.6.0](https://github.com/NeosiaNexus/SitePing/compare/cli-v0.5.7...cli-v0.6.0) (2026-10-30)


### ⚠ BREAKING CHANGES

* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460))
* **server,cli,adapter-prisma:** size MySQL columns for every value the server accepts ([#451](https://github.com/NeosiaNexus/SitePing/issues/451))

### Features

* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460)) ([c9799ae](https://github.com/NeosiaNexus/SitePing/commit/c9799aecad15434b84a8df4ee78d3735017daf9d))


### Bug Fixes

* **cli:** generate a route that builds its handler on the first request ([#453](https://github.com/NeosiaNexus/SitePing/issues/453)) ([9798d4d](https://github.com/NeosiaNexus/SitePing/commit/9798d4dd16359d0cc03552e3e4da0f1c348d361d))
* **cli:** point init at the live schema docs and an npx command ([#481](https://github.com/NeosiaNexus/SitePing/issues/481)) ([1a57ccd](https://github.com/NeosiaNexus/SitePing/commit/1a57ccd970f711ae8b55ba5431af61664b15c1c2))
* **server,cli,adapter-prisma:** size MySQL columns for every value the server accepts ([#451](https://github.com/NeosiaNexus/SitePing/issues/451)) ([acedb18](https://github.com/NeosiaNexus/SitePing/commit/acedb1836ac19ddc63d6dc73c23b661df5447880))

## [0.5.7](https://github.com/NeosiaNexus/SitePing/compare/cli-v0.5.6...cli-v0.5.7) (2026-10-05)


### Features

* **core,server:** add discussion threads to feedback ([7cdca3b](https://github.com/NeosiaNexus/SitePing/commit/7cdca3b754c4b9e749772add28baafca38e021bb)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#280](https://github.com/NeosiaNexus/SitePing/issues/280)


### Bug Fixes

* address independent audit findings on discussion threads ([988e95e](https://github.com/NeosiaNexus/SitePing/commit/988e95e8be134f4027cfd9c5a943e5c81dcf3903)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320)
* **cli:** make sync, status and doctor robust to real-world schemas ([1dcfb6a](https://github.com/NeosiaNexus/SitePing/commit/1dcfb6a86475c4afa1d281a4a0e010f19c7b6c3a)), closes [#169](https://github.com/NeosiaNexus/SitePing/issues/169) [#249](https://github.com/NeosiaNexus/SitePing/issues/249)


### Tests

* **cli:** stage permission errors without chmod so the suite passes as root ([#376](https://github.com/NeosiaNexus/SitePing/issues/376)) ([6e34edc](https://github.com/NeosiaNexus/SitePing/commit/6e34edcd5d1bd62c7853d6dacfe874930f1683b4)), closes [#368](https://github.com/NeosiaNexus/SitePing/issues/368)

## [0.5.6](https://github.com/NeosiaNexus/SitePing/compare/cli-v0.5.5...cli-v0.5.6) (2026-09-23)


### Miscellaneous

* **deps-dev:** bump the dev-dependencies group across 1 directory with 7 updates ([#295](https://github.com/NeosiaNexus/SitePing/issues/295)) ([703b4c6](https://github.com/NeosiaNexus/SitePing/commit/703b4c67a3680a9ab9fc58d73a213dfc8144d9a0))

## [0.5.5](https://github.com/NeosiaNexus/SitePing/compare/cli-v0.5.4...cli-v0.5.5) (2026-09-03)


### Bug Fixes

* harden webhooks, validation, store engine and adapter contracts (audit 2026-09) ([#279](https://github.com/NeosiaNexus/SitePing/issues/279)) ([7336eea](https://github.com/NeosiaNexus/SitePing/commit/7336eea220938df4b34c8ece9270d246f772e61d))


### Miscellaneous

* **deps-dev:** bump vitest from 3.2.7 to 4.1.10 in the vitest group across 1 directory ([#240](https://github.com/NeosiaNexus/SitePing/issues/240)) ([dca82f0](https://github.com/NeosiaNexus/SitePing/commit/dca82f078173c78d1703a7a8512adf1bffbc24ca))

## [0.5.4](https://github.com/NeosiaNexus/SitePing/compare/cli-v0.5.3...cli-v0.5.4) (2026-07-28)


### Features

* type-safe contracts + mechanical extension paths (adapters, locales, packages) ([#247](https://github.com/NeosiaNexus/SitePing/issues/247)) ([75cd2f5](https://github.com/NeosiaNexus/SitePing/commit/75cd2f5024509e5552bfbcf7587a0d67819909a6))

## [0.5.3](https://github.com/NeosiaNexus/SitePing/compare/cli-v0.5.2...cli-v0.5.3) (2026-07-26)


### Documentation

* **site:** ship siteping.dev/docs — verified bilingual documentation + slimmed READMEs ([#241](https://github.com/NeosiaNexus/SitePing/issues/241)) ([252073f](https://github.com/NeosiaNexus/SitePing/commit/252073f2eb11a99980d81eecb5ed37b23c3894f8))

## [0.5.2](https://github.com/NeosiaNexus/SitePing/compare/cli-v0.5.1...cli-v0.5.2) (2026-07-25)


### Miscellaneous

* **deps-dev:** bump commander from 14.0.3 to 15.0.0 ([#227](https://github.com/NeosiaNexus/SitePing/issues/227)) ([903b9fa](https://github.com/NeosiaNexus/SitePing/commit/903b9faacebfb5c616794c96a708859782ab287a))

## [0.5.1](https://github.com/NeosiaNexus/SitePing/compare/cli-v0.5.0...cli-v0.5.1) (2026-07-25)


### Bug Fixes

* **cli:** run under plain Node — createRequire shim + Object.groupBy polyfill ([#221](https://github.com/NeosiaNexus/SitePing/issues/221)) ([45ee65d](https://github.com/NeosiaNexus/SitePing/commit/45ee65de4ed164b683d76e8ac6adc3b5bbe8240e))

## [0.5.0](https://github.com/NeosiaNexus/SitePing/compare/cli-v0.4.9...cli-v0.5.0) (2026-07-24)


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

## [0.4.9](https://github.com/NeosiaNexus/SitePing/compare/cli-v0.4.8...cli-v0.4.9) (2026-07-23)


### Miscellaneous

* **deps-dev:** bump the dev-dependencies group across 1 directory with 6 updates ([#195](https://github.com/NeosiaNexus/SitePing/issues/195)) ([bc53c84](https://github.com/NeosiaNexus/SitePing/commit/bc53c8446541a1f9a57adcf1003f9cf29515a60e))

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
