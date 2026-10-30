# Changelog

## [0.8.0](https://github.com/NeosiaNexus/SitePing/compare/adapter-prisma-v0.7.0...adapter-prisma-v0.8.0) (2026-10-30)


### ⚠ BREAKING CHANGES

* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517))
* **adapter-kit:** require verifyProjectOwnership on every store ([#507](https://github.com/NeosiaNexus/SitePing/issues/507))
* **adapter-prisma:** upload screenshots under the stored feedback's id, and share one logger ([#495](https://github.com/NeosiaNexus/SitePing/issues/495))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473))
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460))
* **adapter-prisma:** type the handler's data source as prisma XOR store ([#458](https://github.com/NeosiaNexus/SitePing/issues/458))
* **server,cli,adapter-prisma:** size MySQL columns for every value the server accepts ([#451](https://github.com/NeosiaNexus/SitePing/issues/451))
* **widget:** render the 4-state model and capture screenshots with context
* **adapter-prisma:** 4-state validation, statuses bucket filter, screenshotRegion persistence
* **adapter-prisma:** migrate validation to zod 4 ([#199](https://github.com/NeosiaNexus/SitePing/issues/199))
* **main:** package renamed from @neosianexus/siteping to @siteping/*

### Features

* **adapter-drizzle:** add a Drizzle adapter for PostgreSQL and libSQL ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-kit:** export isUnreachableOffset and FeedbackCreateOutcome; conformance suite grows to 56 tests ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-localstorage:** expose createFeedbackIfAbsent ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-localstorage:** persist screenshotRegion and support multi-status queries ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **adapter-memory:** expose createFeedbackIfAbsent ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-memory:** persist screenshotRegion and support multi-status queries ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **adapter-prisma:** 4-state validation, statuses bucket filter, screenshotRegion persistence ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **adapter-prisma:** delegate createSitepingHandler to @siteping/server and accept every server option (access, hooks, beforeCreate, presentFeedback, waitUntil, logger, describeError) ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))
* **adapter-prisma:** migrate validation to zod 4 ([#199](https://github.com/NeosiaNexus/SitePing/issues/199)) ([2dd9604](https://github.com/NeosiaNexus/SitePing/commit/2dd9604236750becf4039e8050924e29891ae267))
* **adapter-prisma:** webhooks for Slack, Discord, and generic endpoints ([#70](https://github.com/NeosiaNexus/SitePing/issues/70)) ([74a42a7](https://github.com/NeosiaNexus/SitePing/commit/74a42a730dc2ce99de2978d90c378e9794fd1fd5))
* add adapter-memory, adapter-localstorage, and widget store mode ([efa8b64](https://github.com/NeosiaNexus/SitePing/commit/efa8b64197d1a612146b0c988f1b708cd594b373))
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
* **screenshot-storage:** add S3, Cloudflare Images, file and DB storage ([a2672f5](https://github.com/NeosiaNexus/SitePing/commit/a2672f509b47f6f5181d480cfc0ee0faed361885))
* **server,dashboard:** scope email access by project and permissions by comment ([#494](https://github.com/NeosiaNexus/SitePing/issues/494)) ([5261ea1](https://github.com/NeosiaNexus/SitePing/commit/5261ea1df5a0da70e650de95ad51f54f69235534))
* **server:** add @siteping/server, a store-agnostic HTTP handler ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1)), closes [#306](https://github.com/NeosiaNexus/SitePing/issues/306)
* **server:** address independent audit findings ([511c3ff](https://github.com/NeosiaNexus/SitePing/commit/511c3ff732405331074066a6a262a5135817e760)), closes [#406](https://github.com/NeosiaNexus/SitePing/issues/406) [#364](https://github.com/NeosiaNexus/SitePing/issues/364)
* **server:** notify status changes, deletions and replies through opt-in webhook events ([#483](https://github.com/NeosiaNexus/SitePing/issues/483)) ([1847516](https://github.com/NeosiaNexus/SitePing/commit/18475163282a7c44f19a03f9223e8875372da3ea))
* tech-lead review quick wins — a11y keyboard flow, store persistence contract, CSV formula guard ([#165](https://github.com/NeosiaNexus/SitePing/issues/165)) ([56f17a9](https://github.com/NeosiaNexus/SitePing/commit/56f17a99f159dc12707bcc0ec2f7c906bddf2a3f))
* triage inbox (@siteping/dashboard), 4-state statuses and annotated screenshots ([#201](https://github.com/NeosiaNexus/SitePing/issues/201)) ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* type-safe contracts + mechanical extension paths (adapters, locales, packages) ([#247](https://github.com/NeosiaNexus/SitePing/issues/247)) ([75cd2f5](https://github.com/NeosiaNexus/SitePing/commit/75cd2f5024509e5552bfbcf7587a0d67819909a6))
* **widget,dashboard:** show and reply to discussion threads ([d6721e4](https://github.com/NeosiaNexus/SitePing/commit/d6721e4972593229578ade211ac2b006f9dffb0f)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#331](https://github.com/NeosiaNexus/SitePing/issues/331)
* **widget:** add i18n system with French and English locales ([0fe17d7](https://github.com/NeosiaNexus/SitePing/commit/0fe17d7bae454d30b94ae48a607fba97ba353460))
* **widget:** add i18n system with French and English locales ([c41d7c4](https://github.com/NeosiaNexus/SitePing/commit/c41d7c4c23a3e618a290555120ce83a6a9b1718e))
* **widget:** capture last 50 console messages + failed network requests with each feedback ([#71](https://github.com/NeosiaNexus/SitePing/issues/71)) ([726e1b8](https://github.com/NeosiaNexus/SitePing/commit/726e1b8a0d4dcef726ec6dc468c168fb73396dbc))
* **widget:** render the 4-state model and capture screenshots with context ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))


### Bug Fixes

* **adapter-kit:** require verifyProjectOwnership on every store ([#507](https://github.com/NeosiaNexus/SitePing/issues/507)) ([4c1ecda](https://github.com/NeosiaNexus/SitePing/commit/4c1ecda4a97b020f0a056345b59d21cbbcd6feeb))
* **adapter-prisma,adapter-kit:** store text holding NUL or an unpaired surrogate ([#470](https://github.com/NeosiaNexus/SitePing/issues/470)) ([c059cb2](https://github.com/NeosiaNexus/SitePing/commit/c059cb2522f3dcfba388890f766be8d9d52cb7f9))
* **adapter-prisma,widget:** harden validation, webhooks, CORS, ordering ([c5a3328](https://github.com/NeosiaNexus/SitePing/commit/c5a33285618116d8527d432a870e6438b8fccc70)), closes [#323](https://github.com/NeosiaNexus/SitePing/issues/323) [#307](https://github.com/NeosiaNexus/SitePing/issues/307) [#249](https://github.com/NeosiaNexus/SitePing/issues/249)
* **adapter-prisma:** auth granularity, project isolation, clean API surface ([416685d](https://github.com/NeosiaNexus/SitePing/commit/416685d6c3d3fe128e460373eb07fda88556a231))
* **adapter-prisma:** make ?search filter work on SQLite ([#46](https://github.com/NeosiaNexus/SitePing/issues/46)) ([d555e6c](https://github.com/NeosiaNexus/SitePing/commit/d555e6c678e290ae2f531685a1ee2197b30b3edc))
* **adapter-prisma:** make @prisma/client an optional peer dependency (Bun then no longer warns about an out-of-range @prisma/client; npm and pnpm still do) ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))
* **adapter-prisma:** notify webhooks once when the store reports its inserts; answer far pages from count ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-prisma:** redact authorEmail and strip clientId from unauthenticated HTTP responses (fixes [#105](https://github.com/NeosiaNexus/SitePing/issues/105)) ([#208](https://github.com/NeosiaNexus/SitePing/issues/208)) ([2a511e7](https://github.com/NeosiaNexus/SitePing/commit/2a511e762009ac1a17d5b6e08e6ab1bf04884b0d))
* **adapter-prisma:** require apiKey for DELETE/PATCH in production ([#63](https://github.com/NeosiaNexus/SitePing/issues/63)) ([16df663](https://github.com/NeosiaNexus/SitePing/commit/16df6634100a4669b330e69784a5853bea55367e))
* **adapter-prisma:** run screenshot deletes at most 32 at a time ([d2ee80c](https://github.com/NeosiaNexus/SitePing/commit/d2ee80c858f24f4f7dc22a0ed1c70649efcef5e5))
* **adapter-prisma:** sanitize clientId to prevent path traversal ([#64](https://github.com/NeosiaNexus/SitePing/issues/64)) ([f911e2f](https://github.com/NeosiaNexus/SitePing/commit/f911e2f14efe1e7309cb2053bdb419bbbedc66a8))
* **adapter-prisma:** type the handler's data source as prisma XOR store ([#458](https://github.com/NeosiaNexus/SitePing/issues/458)) ([d173b0f](https://github.com/NeosiaNexus/SitePing/commit/d173b0fc8dafb62efa84a351c66149234bd9f6af))
* **adapter-prisma:** upload screenshots under the stored feedback's id, and share one logger ([#495](https://github.com/NeosiaNexus/SitePing/issues/495)) ([59ac33f](https://github.com/NeosiaNexus/SitePing/commit/59ac33f52db86ce97f6f62d9471649e1b288dfda))
* address independent audit findings on discussion threads ([988e95e](https://github.com/NeosiaNexus/SitePing/commit/988e95e8be134f4027cfd9c5a943e5c81dcf3903)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320)
* comprehensive audit — 44 fixes across all packages ([60652ad](https://github.com/NeosiaNexus/SitePing/commit/60652ad03eb070fe18e2a4e943ea013f76070896))
* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517)) ([060d935](https://github.com/NeosiaNexus/SitePing/commit/060d935500b484a123746cfa5888c562fc437ddb))
* **core:** serialize collection-store mutations, harden store contracts ([21b81ef](https://github.com/NeosiaNexus/SitePing/commit/21b81efe995d6c45ef15a7ab1e300a821214311e)), closes [#341](https://github.com/NeosiaNexus/SitePing/issues/341) [#164](https://github.com/NeosiaNexus/SitePing/issues/164)
* **dashboard:** append list params to an endpoint with a query string ([c61e3bf](https://github.com/NeosiaNexus/SitePing/commit/c61e3bfc7b511faf2fbcd5d5509b89e58ba43471))
* harden webhooks, validation, store engine and adapter contracts (audit 2026-09) ([#279](https://github.com/NeosiaNexus/SitePing/issues/279)) ([7336eea](https://github.com/NeosiaNexus/SitePing/commit/7336eea220938df4b34c8ece9270d246f772e61d))
* resolve merge conflicts and post-merge issues ([e342ee8](https://github.com/NeosiaNexus/SitePing/commit/e342ee8cc3ade358d2a8c3685f5ae4080849c3ab))
* **screenshot-storage:** address independent audit findings ([d2ee80c](https://github.com/NeosiaNexus/SitePing/commit/d2ee80c858f24f4f7dc22a0ed1c70649efcef5e5))
* **server,cli,adapter-prisma:** size MySQL columns for every value the server accepts ([#451](https://github.com/NeosiaNexus/SitePing/issues/451)) ([acedb18](https://github.com/NeosiaNexus/SitePing/commit/acedb1836ac19ddc63d6dc73c23b661df5447880))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473)) ([fc1013c](https://github.com/NeosiaNexus/SitePing/commit/fc1013c9b3e3f4ea1655451ca386657ccc34831b))
* ship fully resolvable type declarations for every published package ([#232](https://github.com/NeosiaNexus/SitePing/issues/232)) ([01a8085](https://github.com/NeosiaNexus/SitePing/commit/01a8085c90fab4e721eaede8def9a4d9f5eefcc0))
* **widget,adapter-prisma:** harden retry queue, panel UX, and PATCH ownership ([26301d3](https://github.com/NeosiaNexus/SitePing/commit/26301d34f23c62a7e623741ca6f815841088ca4f))
* **widget:** clamp diagnostics buffers to the server's 50 / 20 entries ([c61e3bf](https://github.com/NeosiaNexus/SitePing/commit/c61e3bfc7b511faf2fbcd5d5509b89e58ba43471))
* **widget:** fix double callbacks, unhandled promises, biome rules ([849af37](https://github.com/NeosiaNexus/SitePing/commit/849af378fb32ea0ee60468471e71f5dc5b56a66a))
* **widget:** fix double callbacks, unhandled promises, biome rules ([887cbaa](https://github.com/NeosiaNexus/SitePing/commit/887cbaabc67dc1d7887c142ae2c307025d227a03))
* **widget:** harden the send path, retry queue and captured context ([c61e3bf](https://github.com/NeosiaNexus/SitePing/commit/c61e3bfc7b511faf2fbcd5d5509b89e58ba43471)), closes [#307](https://github.com/NeosiaNexus/SitePing/issues/307) [#342](https://github.com/NeosiaNexus/SitePing/issues/342) [#344](https://github.com/NeosiaNexus/SitePing/issues/344)
* **widget:** record diagnostics URLs without credentials, query or hash ([c61e3bf](https://github.com/NeosiaNexus/SitePing/commit/c61e3bfc7b511faf2fbcd5d5509b89e58ba43471))


### Performance

* **widget:** minify bundle, add DB indexes, optimize retry ([58e5e11](https://github.com/NeosiaNexus/SitePing/commit/58e5e113e2b67e860556fa68bc8b9fc7246fcfe0))
* **widget:** minify bundle, add DB indexes, optimize retry ([d196b68](https://github.com/NeosiaNexus/SitePing/commit/d196b68b391b0c9849fee24e1f73173d7a7a6525))


### Refactoring

* **adapter-prisma:** share the 200-char identity cap with the widget ([c61e3bf](https://github.com/NeosiaNexus/SitePing/commit/c61e3bfc7b511faf2fbcd5d5509b89e58ba43471))
* **architecture:** add SitepingStore interface, sync types ([c2afd03](https://github.com/NeosiaNexus/SitePing/commit/c2afd0353554c4277217059be94325ac60387835))
* **main:** migrate to @siteping/* monorepo with Turborepo ([e6b19a9](https://github.com/NeosiaNexus/SitePing/commit/e6b19a9675ca67eb5fc3888b45718c7e71a34b93))
* **types:** tighten type safety across all packages ([1b212ba](https://github.com/NeosiaNexus/SitePing/commit/1b212bae29177e71abc15a88d0133b73cde346e5))


### Tests

* **adapter-prisma:** run the conformance suite against a real SQLite database ([#472](https://github.com/NeosiaNexus/SitePing/issues/472)) ([6460938](https://github.com/NeosiaNexus/SitePing/commit/6460938ab529d1d7ae20e6dc922b42a5dcee8cc9))
* add 184 tests across all packages + E2E for new features ([b7f869c](https://github.com/NeosiaNexus/SitePing/commit/b7f869c119c0a76f089d4e889d5b48be8b3e06c1))
* add coverage config, CLI tests, fix test quality ([27ad06d](https://github.com/NeosiaNexus/SitePing/commit/27ad06dd7dfcb75c5ffbf40a3a9c1282d89728f9))
* add coverage config, CLI tests, fix test quality ([d586732](https://github.com/NeosiaNexus/SitePing/commit/d586732f3df97f6cda5bba09a2fe48a60b06ac8e))
* raise unit test coverage to 99%+ across all packages ([f2e9f9e](https://github.com/NeosiaNexus/SitePing/commit/f2e9f9e406a6f0a3971b9df864af4e96d742304a))


### Documentation

* **adapter-memory:** mount the store with @siteping/server and point the conformance suite at @siteping/adapter-kit/testing ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))
* add README and LICENSE to each published package ([d4cfbf1](https://github.com/NeosiaNexus/SitePing/commit/d4cfbf16ca79562195be6374e74463f6aae7ceb0))
* position SitePing as the open-source, self-hosted Marker.io alternative ([#520](https://github.com/NeosiaNexus/SitePing/issues/520)) ([258ede6](https://github.com/NeosiaNexus/SitePing/commit/258ede6db1baba1ff77247afd215dad4fc82364b))
* **site:** ship siteping.dev/docs — verified bilingual documentation + slimmed READMEs ([#241](https://github.com/NeosiaNexus/SitePing/issues/241)) ([252073f](https://github.com/NeosiaNexus/SitePing/commit/252073f2eb11a99980d81eecb5ed37b23c3894f8))
* update all documentation for adapter pattern and new packages ([bcdbd46](https://github.com/NeosiaNexus/SitePing/commit/bcdbd46cfe7f504f659335176e9454b66f3a4547))


### Miscellaneous

* add siteping.dev links, OG images, favicon, and error pages ([5d4db70](https://github.com/NeosiaNexus/SitePing/commit/5d4db70a55c3711285252ff6e4c99ad760a0eda6))
* **deps-dev:** bump vitest from 3.2.7 to 4.1.10 in the vitest group across 1 directory ([#240](https://github.com/NeosiaNexus/SitePing/issues/240)) ([dca82f0](https://github.com/NeosiaNexus/SitePing/commit/dca82f078173c78d1703a7a8512adf1bffbc24ca))
* **deps:** bump the production-dependencies group across 1 directory with 6 updates ([#299](https://github.com/NeosiaNexus/SitePing/issues/299)) ([b8b0655](https://github.com/NeosiaNexus/SitePing/commit/b8b06553c7c860c27229f9447f6bd5082b27011e))
* **deps:** bump the production-dependencies group across 1 directory with 7 updates ([#287](https://github.com/NeosiaNexus/SitePing/issues/287)) ([2d7d264](https://github.com/NeosiaNexus/SitePing/commit/2d7d2646a75276d6c8b53beb9ff070726ebdf5e4))
* **deps:** reclassify @medv/finder, widen prisma peer range, harmonize engines ([#74](https://github.com/NeosiaNexus/SitePing/issues/74)) ([b28465d](https://github.com/NeosiaNexus/SitePing/commit/b28465dc762077a535b79dbaffb51faa73f68538))
* release main ([69156f1](https://github.com/NeosiaNexus/SitePing/commit/69156f1c65602bf866d7559647ae20687b6782d5))
* release main ([#166](https://github.com/NeosiaNexus/SitePing/issues/166)) ([34b8226](https://github.com/NeosiaNexus/SitePing/commit/34b8226cf044b3defdc6a7ff90e55c5c84550573))
* release main ([#19](https://github.com/NeosiaNexus/SitePing/issues/19)) ([c72d917](https://github.com/NeosiaNexus/SitePing/commit/c72d91717bb43049e0c1103a4a3d7f66a54a5a16))
* release main ([#198](https://github.com/NeosiaNexus/SitePing/issues/198)) ([e4ba232](https://github.com/NeosiaNexus/SitePing/commit/e4ba2327190c4f8c4926e607a5e5766a6d0a9b66))
* release main ([#20](https://github.com/NeosiaNexus/SitePing/issues/20)) ([a6e3f4d](https://github.com/NeosiaNexus/SitePing/commit/a6e3f4df54810ca0511eb301d79f8a1854ce01e0))
* release main ([#202](https://github.com/NeosiaNexus/SitePing/issues/202)) ([953baab](https://github.com/NeosiaNexus/SitePing/commit/953baabe6d78146d1970456f1e9b6ecd53dc6a86))
* release main ([#21](https://github.com/NeosiaNexus/SitePing/issues/21)) ([9867b31](https://github.com/NeosiaNexus/SitePing/commit/9867b31c226a7754120de326f11b054c97e2371a))
* release main ([#211](https://github.com/NeosiaNexus/SitePing/issues/211)) ([7032bd6](https://github.com/NeosiaNexus/SitePing/commit/7032bd62e607cf85cdd575dfcc6129b3d2bc418e))
* release main ([#233](https://github.com/NeosiaNexus/SitePing/issues/233)) ([84e5010](https://github.com/NeosiaNexus/SitePing/commit/84e501071113a80c3dfc74ee51190cab27b325d7))
* release main ([#245](https://github.com/NeosiaNexus/SitePing/issues/245)) ([16a35d2](https://github.com/NeosiaNexus/SitePing/commit/16a35d26972b75239b8d5d320e0de31b946efeca))
* release main ([#25](https://github.com/NeosiaNexus/SitePing/issues/25)) ([24dc6f6](https://github.com/NeosiaNexus/SitePing/commit/24dc6f661efa375a2a45d84b1dddb0dd1e36b057))
* release main ([#250](https://github.com/NeosiaNexus/SitePing/issues/250)) ([191ed11](https://github.com/NeosiaNexus/SitePing/commit/191ed11453baaab25b4503e4b374449955ec7b9b))
* release main ([#251](https://github.com/NeosiaNexus/SitePing/issues/251)) ([9550c57](https://github.com/NeosiaNexus/SitePing/commit/9550c57b7fae1dd1f691c11aef55e13d6bc9f3f1))
* release main ([#297](https://github.com/NeosiaNexus/SitePing/issues/297)) ([2e8cc58](https://github.com/NeosiaNexus/SitePing/commit/2e8cc58728f6d39e83db5ef32e437530acaa0605))
* release main ([#356](https://github.com/NeosiaNexus/SitePing/issues/356)) ([3df0253](https://github.com/NeosiaNexus/SitePing/commit/3df02534a3dec57288b8b2445de951b21196ad5f))
* release main ([#45](https://github.com/NeosiaNexus/SitePing/issues/45)) ([8166be1](https://github.com/NeosiaNexus/SitePing/commit/8166be111f1578b469408682f366cbf2c66cbc07))
* release main ([#467](https://github.com/NeosiaNexus/SitePing/issues/467)) ([5d1cfad](https://github.com/NeosiaNexus/SitePing/commit/5d1cfad3451db8771cf67030bdf2694cae648b25))
* release main ([#59](https://github.com/NeosiaNexus/SitePing/issues/59)) ([09dd240](https://github.com/NeosiaNexus/SitePing/commit/09dd240021a75aabde5e1a980f865afc352470bb))
* release main ([#77](https://github.com/NeosiaNexus/SitePing/issues/77)) ([af0b492](https://github.com/NeosiaNexus/SitePing/commit/af0b4922800834cd807a784875c37d4189219619))
* release main ([#8](https://github.com/NeosiaNexus/SitePing/issues/8)) ([c5bc4eb](https://github.com/NeosiaNexus/SitePing/commit/c5bc4eba8f7548dc6af6e01db4e3bd53e1809560))
* release main ([#9](https://github.com/NeosiaNexus/SitePing/issues/9)) ([caa20d6](https://github.com/NeosiaNexus/SitePing/commit/caa20d65caf7073a4549d98413e31e036330bc1e))
* release main ([#96](https://github.com/NeosiaNexus/SitePing/issues/96)) ([4e66546](https://github.com/NeosiaNexus/SitePing/commit/4e665462dde1ce81a049bd2cdbedfaf53ff85d6a))
* rename repo to SitePing and improve project presence ([c1c6e1b](https://github.com/NeosiaNexus/SitePing/commit/c1c6e1bfa3f1a00f8df3523a3e8beb26422a886a))

## [0.7.0](https://github.com/NeosiaNexus/SitePing/compare/adapter-prisma-v0.6.7...adapter-prisma-v0.7.0) (2026-10-30)


### ⚠ BREAKING CHANGES

* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517))
* **adapter-kit:** require verifyProjectOwnership on every store ([#507](https://github.com/NeosiaNexus/SitePing/issues/507))
* **adapter-prisma:** upload screenshots under the stored feedback's id, and share one logger ([#495](https://github.com/NeosiaNexus/SitePing/issues/495))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473))
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460))
* **adapter-prisma:** type the handler's data source as prisma XOR store ([#458](https://github.com/NeosiaNexus/SitePing/issues/458))
* **server,cli,adapter-prisma:** size MySQL columns for every value the server accepts ([#451](https://github.com/NeosiaNexus/SitePing/issues/451))

### Features

* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460)) ([c9799ae](https://github.com/NeosiaNexus/SitePing/commit/c9799aecad15434b84a8df4ee78d3735017daf9d))
* **server,dashboard:** scope email access by project and permissions by comment ([#494](https://github.com/NeosiaNexus/SitePing/issues/494)) ([5261ea1](https://github.com/NeosiaNexus/SitePing/commit/5261ea1df5a0da70e650de95ad51f54f69235534))
* **server:** notify status changes, deletions and replies through opt-in webhook events ([#483](https://github.com/NeosiaNexus/SitePing/issues/483)) ([1847516](https://github.com/NeosiaNexus/SitePing/commit/18475163282a7c44f19a03f9223e8875372da3ea))


### Bug Fixes

* **adapter-kit:** require verifyProjectOwnership on every store ([#507](https://github.com/NeosiaNexus/SitePing/issues/507)) ([4c1ecda](https://github.com/NeosiaNexus/SitePing/commit/4c1ecda4a97b020f0a056345b59d21cbbcd6feeb))
* **adapter-prisma,adapter-kit:** store text holding NUL or an unpaired surrogate ([#470](https://github.com/NeosiaNexus/SitePing/issues/470)) ([c059cb2](https://github.com/NeosiaNexus/SitePing/commit/c059cb2522f3dcfba388890f766be8d9d52cb7f9))
* **adapter-prisma:** type the handler's data source as prisma XOR store ([#458](https://github.com/NeosiaNexus/SitePing/issues/458)) ([d173b0f](https://github.com/NeosiaNexus/SitePing/commit/d173b0fc8dafb62efa84a351c66149234bd9f6af))
* **adapter-prisma:** upload screenshots under the stored feedback's id, and share one logger ([#495](https://github.com/NeosiaNexus/SitePing/issues/495)) ([59ac33f](https://github.com/NeosiaNexus/SitePing/commit/59ac33f52db86ce97f6f62d9471649e1b288dfda))
* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517)) ([060d935](https://github.com/NeosiaNexus/SitePing/commit/060d935500b484a123746cfa5888c562fc437ddb))
* **server,cli,adapter-prisma:** size MySQL columns for every value the server accepts ([#451](https://github.com/NeosiaNexus/SitePing/issues/451)) ([acedb18](https://github.com/NeosiaNexus/SitePing/commit/acedb1836ac19ddc63d6dc73c23b661df5447880))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473)) ([fc1013c](https://github.com/NeosiaNexus/SitePing/commit/fc1013c9b3e3f4ea1655451ca386657ccc34831b))


### Tests

* **adapter-prisma:** run the conformance suite against a real SQLite database ([#472](https://github.com/NeosiaNexus/SitePing/issues/472)) ([6460938](https://github.com/NeosiaNexus/SitePing/commit/6460938ab529d1d7ae20e6dc922b42a5dcee8cc9))


### Documentation

* position SitePing as the open-source, self-hosted Marker.io alternative ([#520](https://github.com/NeosiaNexus/SitePing/issues/520)) ([258ede6](https://github.com/NeosiaNexus/SitePing/commit/258ede6db1baba1ff77247afd215dad4fc82364b))

## [0.6.7](https://github.com/NeosiaNexus/SitePing/compare/adapter-prisma-v0.6.6...adapter-prisma-v0.6.7) (2026-10-05)


### Features

* **adapter-drizzle:** add a Drizzle adapter for PostgreSQL and libSQL ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-kit:** export isUnreachableOffset and FeedbackCreateOutcome; conformance suite grows to 56 tests ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-localstorage:** expose createFeedbackIfAbsent ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-memory:** expose createFeedbackIfAbsent ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-prisma:** delegate createSitepingHandler to @siteping/server and accept every server option (access, hooks, beforeCreate, presentFeedback, waitUntil, logger, describeError) ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))
* **core,server:** add discussion threads to feedback ([7cdca3b](https://github.com/NeosiaNexus/SitePing/commit/7cdca3b754c4b9e749772add28baafca38e021bb)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#280](https://github.com/NeosiaNexus/SitePing/issues/280)
* **screenshot-storage:** add S3, Cloudflare Images, file and DB storage ([a2672f5](https://github.com/NeosiaNexus/SitePing/commit/a2672f509b47f6f5181d480cfc0ee0faed361885))
* **server:** add @siteping/server, a store-agnostic HTTP handler ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1)), closes [#306](https://github.com/NeosiaNexus/SitePing/issues/306)
* **server:** address independent audit findings ([511c3ff](https://github.com/NeosiaNexus/SitePing/commit/511c3ff732405331074066a6a262a5135817e760)), closes [#406](https://github.com/NeosiaNexus/SitePing/issues/406) [#364](https://github.com/NeosiaNexus/SitePing/issues/364)
* **widget,dashboard:** show and reply to discussion threads ([d6721e4](https://github.com/NeosiaNexus/SitePing/commit/d6721e4972593229578ade211ac2b006f9dffb0f)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#331](https://github.com/NeosiaNexus/SitePing/issues/331)


### Bug Fixes

* **adapter-prisma,widget:** harden validation, webhooks, CORS, ordering ([c5a3328](https://github.com/NeosiaNexus/SitePing/commit/c5a33285618116d8527d432a870e6438b8fccc70)), closes [#323](https://github.com/NeosiaNexus/SitePing/issues/323) [#307](https://github.com/NeosiaNexus/SitePing/issues/307) [#249](https://github.com/NeosiaNexus/SitePing/issues/249)
* **adapter-prisma:** make @prisma/client an optional peer dependency (Bun then no longer warns about an out-of-range @prisma/client; npm and pnpm still do) ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))
* **adapter-prisma:** notify webhooks once when the store reports its inserts; answer far pages from count ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-prisma:** run screenshot deletes at most 32 at a time ([d2ee80c](https://github.com/NeosiaNexus/SitePing/commit/d2ee80c858f24f4f7dc22a0ed1c70649efcef5e5))
* address independent audit findings on discussion threads ([988e95e](https://github.com/NeosiaNexus/SitePing/commit/988e95e8be134f4027cfd9c5a943e5c81dcf3903)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320)
* **core:** serialize collection-store mutations, harden store contracts ([21b81ef](https://github.com/NeosiaNexus/SitePing/commit/21b81efe995d6c45ef15a7ab1e300a821214311e)), closes [#341](https://github.com/NeosiaNexus/SitePing/issues/341) [#164](https://github.com/NeosiaNexus/SitePing/issues/164)
* **dashboard:** append list params to an endpoint with a query string ([c61e3bf](https://github.com/NeosiaNexus/SitePing/commit/c61e3bfc7b511faf2fbcd5d5509b89e58ba43471))
* **screenshot-storage:** address independent audit findings ([d2ee80c](https://github.com/NeosiaNexus/SitePing/commit/d2ee80c858f24f4f7dc22a0ed1c70649efcef5e5))
* **widget:** clamp diagnostics buffers to the server's 50 / 20 entries ([c61e3bf](https://github.com/NeosiaNexus/SitePing/commit/c61e3bfc7b511faf2fbcd5d5509b89e58ba43471))
* **widget:** harden the send path, retry queue and captured context ([c61e3bf](https://github.com/NeosiaNexus/SitePing/commit/c61e3bfc7b511faf2fbcd5d5509b89e58ba43471)), closes [#307](https://github.com/NeosiaNexus/SitePing/issues/307) [#342](https://github.com/NeosiaNexus/SitePing/issues/342) [#344](https://github.com/NeosiaNexus/SitePing/issues/344)
* **widget:** record diagnostics URLs without credentials, query or hash ([c61e3bf](https://github.com/NeosiaNexus/SitePing/commit/c61e3bfc7b511faf2fbcd5d5509b89e58ba43471))


### Refactoring

* **adapter-prisma:** share the 200-char identity cap with the widget ([c61e3bf](https://github.com/NeosiaNexus/SitePing/commit/c61e3bfc7b511faf2fbcd5d5509b89e58ba43471))


### Documentation

* **adapter-memory:** mount the store with @siteping/server and point the conformance suite at @siteping/adapter-kit/testing ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))

## [0.6.6](https://github.com/NeosiaNexus/SitePing/compare/adapter-prisma-v0.6.5...adapter-prisma-v0.6.6) (2026-09-23)


### Miscellaneous

* **deps:** bump the production-dependencies group across 1 directory with 6 updates ([#299](https://github.com/NeosiaNexus/SitePing/issues/299)) ([b8b0655](https://github.com/NeosiaNexus/SitePing/commit/b8b06553c7c860c27229f9447f6bd5082b27011e))
* **deps:** bump the production-dependencies group across 1 directory with 7 updates ([#287](https://github.com/NeosiaNexus/SitePing/issues/287)) ([2d7d264](https://github.com/NeosiaNexus/SitePing/commit/2d7d2646a75276d6c8b53beb9ff070726ebdf5e4))

## [0.6.5](https://github.com/NeosiaNexus/SitePing/compare/adapter-prisma-v0.6.4...adapter-prisma-v0.6.5) (2026-09-03)


### Bug Fixes

* harden webhooks, validation, store engine and adapter contracts (audit 2026-09) ([#279](https://github.com/NeosiaNexus/SitePing/issues/279)) ([7336eea](https://github.com/NeosiaNexus/SitePing/commit/7336eea220938df4b34c8ece9270d246f772e61d))


### Miscellaneous

* **deps-dev:** bump vitest from 3.2.7 to 4.1.10 in the vitest group across 1 directory ([#240](https://github.com/NeosiaNexus/SitePing/issues/240)) ([dca82f0](https://github.com/NeosiaNexus/SitePing/commit/dca82f078173c78d1703a7a8512adf1bffbc24ca))

## [0.6.4](https://github.com/NeosiaNexus/SitePing/compare/adapter-prisma-v0.6.3...adapter-prisma-v0.6.4) (2026-07-28)


### Features

* type-safe contracts + mechanical extension paths (adapters, locales, packages) ([#247](https://github.com/NeosiaNexus/SitePing/issues/247)) ([75cd2f5](https://github.com/NeosiaNexus/SitePing/commit/75cd2f5024509e5552bfbcf7587a0d67819909a6))

## [0.6.3](https://github.com/NeosiaNexus/SitePing/compare/adapter-prisma-v0.6.2...adapter-prisma-v0.6.3) (2026-07-26)


### Documentation

* **site:** ship siteping.dev/docs — verified bilingual documentation + slimmed READMEs ([#241](https://github.com/NeosiaNexus/SitePing/issues/241)) ([252073f](https://github.com/NeosiaNexus/SitePing/commit/252073f2eb11a99980d81eecb5ed37b23c3894f8))

## [0.6.2](https://github.com/NeosiaNexus/SitePing/compare/adapter-prisma-v0.6.1...adapter-prisma-v0.6.2) (2026-07-25)


### Bug Fixes

* ship fully resolvable type declarations for every published package ([#232](https://github.com/NeosiaNexus/SitePing/issues/232)) ([01a8085](https://github.com/NeosiaNexus/SitePing/commit/01a8085c90fab4e721eaede8def9a4d9f5eefcc0))

## [0.6.1](https://github.com/NeosiaNexus/SitePing/compare/adapter-prisma-v0.6.0...adapter-prisma-v0.6.1) (2026-07-24)


### Bug Fixes

* **adapter-prisma:** redact authorEmail and strip clientId from unauthenticated HTTP responses (fixes [#105](https://github.com/NeosiaNexus/SitePing/issues/105)) ([#208](https://github.com/NeosiaNexus/SitePing/issues/208)) ([2a511e7](https://github.com/NeosiaNexus/SitePing/commit/2a511e762009ac1a17d5b6e08e6ab1bf04884b0d))

## [0.6.0](https://github.com/NeosiaNexus/SitePing/compare/adapter-prisma-v0.5.0...adapter-prisma-v0.6.0) (2026-07-24)


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
