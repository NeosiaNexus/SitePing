:robot: I have created a release *beep* *boop*
---


<details><summary>adapter-prisma: 0.8.0</summary>

## [0.8.0](https://github.com/NeosiaNexus/SitePing/compare/adapter-prisma-v0.7.0...adapter-prisma-v0.8.0) (2026-10-30)


###   BREAKING CHANGES

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
* **dashboard:** @siteping/dashboard  Linear-style triage inbox with keyboard-first triage, annotated-screenshot evidence card, store/endpoint modes, theming and 7 locales; WCAG 2.1 AA verified (axe: zero violations) ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
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
* tech-lead review quick wins  a11y keyboard flow, store persistence contract, CSV formula guard ([#165](https://github.com/NeosiaNexus/SitePing/issues/165)) ([56f17a9](https://github.com/NeosiaNexus/SitePing/commit/56f17a99f159dc12707bcc0ec2f7c906bddf2a3f))
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
* comprehensive audit  44 fixes across all packages ([60652ad](https://github.com/NeosiaNexus/SitePing/commit/60652ad03eb070fe18e2a4e943ea013f76070896))
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
* **site:** ship siteping.dev/docs  verified bilingual documentation + slimmed READMEs ([#241](https://github.com/NeosiaNexus/SitePing/issues/241)) ([252073f](https://github.com/NeosiaNexus/SitePing/commit/252073f2eb11a99980d81eecb5ed37b23c3894f8))
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
</details>

<details><summary>adapter-memory: 0.7.0</summary>

## [0.7.0](https://github.com/NeosiaNexus/SitePing/compare/adapter-memory-v0.6.0...adapter-memory-v0.7.0) (2026-10-30)


###   BREAKING CHANGES

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
* **dashboard:** @siteping/dashboard  Linear-style triage inbox with keyboard-first triage, annotated-screenshot evidence card, store/endpoint modes, theming and 7 locales; WCAG 2.1 AA verified (axe: zero violations) ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **demo:** freelancer inbox at /demo/inbox with a seeded triage backlog and real annotated screenshots ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* page-scoped annotations + semantic anchors (data-feedback-anchor) ([#55](https://github.com/NeosiaNexus/SitePing/issues/55)) ([db722de](https://github.com/NeosiaNexus/SitePing/commit/db722deab9f69cfdeb6fbe6f7f0bea57e2995e5c))
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460)) ([c9799ae](https://github.com/NeosiaNexus/SitePing/commit/c9799aecad15434b84a8df4ee78d3735017daf9d))
* screenshot capture with pluggable storage ([#58](https://github.com/NeosiaNexus/SitePing/issues/58)) ([f14ecd2](https://github.com/NeosiaNexus/SitePing/commit/f14ecd2f2f05a547a4a52e5a6ad4d794d438008c))
* **server:** add @siteping/server, a store-agnostic HTTP handler ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1)), closes [#306](https://github.com/NeosiaNexus/SitePing/issues/306)
* **server:** notify status changes, deletions and replies through opt-in webhook events ([#483](https://github.com/NeosiaNexus/SitePing/issues/483)) ([1847516](https://github.com/NeosiaNexus/SitePing/commit/18475163282a7c44f19a03f9223e8875372da3ea))
* tech-lead review quick wins  a11y keyboard flow, store persistence contract, CSV formula guard ([#165](https://github.com/NeosiaNexus/SitePing/issues/165)) ([56f17a9](https://github.com/NeosiaNexus/SitePing/commit/56f17a99f159dc12707bcc0ec2f7c906bddf2a3f))
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
* **site:** ship siteping.dev/docs  verified bilingual documentation + slimmed READMEs ([#241](https://github.com/NeosiaNexus/SitePing/issues/241)) ([252073f](https://github.com/NeosiaNexus/SitePing/commit/252073f2eb11a99980d81eecb5ed37b23c3894f8))


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
</details>

<details><summary>adapter-localstorage: 0.7.0</summary>

## [0.7.0](https://github.com/NeosiaNexus/SitePing/compare/adapter-localstorage-v0.6.0...adapter-localstorage-v0.7.0) (2026-10-30)


###   BREAKING CHANGES

* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473))
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460))
* **widget:** render the 4-state model and capture screenshots with context
* **adapter-prisma:** 4-state validation, statuses bucket filter, screenshotRegion persistence

### Features

* **adapter-drizzle:** add a Drizzle adapter for PostgreSQL and libSQL ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-kit:** add a persistence-failure leg to the conformance suite ([#471](https://github.com/NeosiaNexus/SitePing/issues/471)) ([5772dc5](https://github.com/NeosiaNexus/SitePing/commit/5772dc50f6612af76423c15c521ab8a58f421bb2))
* **adapter-kit:** export isUnreachableOffset and FeedbackCreateOutcome; conformance suite grows to 56 tests ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-localstorage:** expose createFeedbackIfAbsent ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-localstorage:** persist screenshotRegion and support multi-status queries ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **adapter-memory:** expose createFeedbackIfAbsent ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-memory:** persist screenshotRegion and support multi-status queries ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **adapter-prisma:** 4-state validation, statuses bucket filter, screenshotRegion persistence ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* add adapter-memory, adapter-localstorage, and widget store mode ([efa8b64](https://github.com/NeosiaNexus/SitePing/commit/efa8b64197d1a612146b0c988f1b708cd594b373))
* **cli:** generate the screenshotRegion Json? column via siteping init/sync ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **core,server:** add discussion threads to feedback ([7cdca3b](https://github.com/NeosiaNexus/SitePing/commit/7cdca3b754c4b9e749772add28baafca38e021bb)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#280](https://github.com/NeosiaNexus/SitePing/issues/280)
* **core:** 4-state feedback model, screenshotRegion metadata and multi-status queries ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **dashboard:** @siteping/dashboard  Linear-style triage inbox with keyboard-first triage, annotated-screenshot evidence card, store/endpoint modes, theming and 7 locales; WCAG 2.1 AA verified (axe: zero violations) ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **demo:** freelancer inbox at /demo/inbox with a seeded triage backlog and real annotated screenshots ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* page-scoped annotations + semantic anchors (data-feedback-anchor) ([#55](https://github.com/NeosiaNexus/SitePing/issues/55)) ([db722de](https://github.com/NeosiaNexus/SitePing/commit/db722deab9f69cfdeb6fbe6f7f0bea57e2995e5c))
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460)) ([c9799ae](https://github.com/NeosiaNexus/SitePing/commit/c9799aecad15434b84a8df4ee78d3735017daf9d))
* screenshot capture with pluggable storage ([#58](https://github.com/NeosiaNexus/SitePing/issues/58)) ([f14ecd2](https://github.com/NeosiaNexus/SitePing/commit/f14ecd2f2f05a547a4a52e5a6ad4d794d438008c))
* **server:** notify status changes, deletions and replies through opt-in webhook events ([#483](https://github.com/NeosiaNexus/SitePing/issues/483)) ([1847516](https://github.com/NeosiaNexus/SitePing/commit/18475163282a7c44f19a03f9223e8875372da3ea))
* tech-lead review quick wins  a11y keyboard flow, store persistence contract, CSV formula guard ([#165](https://github.com/NeosiaNexus/SitePing/issues/165)) ([56f17a9](https://github.com/NeosiaNexus/SitePing/commit/56f17a99f159dc12707bcc0ec2f7c906bddf2a3f))
* triage inbox (@siteping/dashboard), 4-state statuses and annotated screenshots ([#201](https://github.com/NeosiaNexus/SitePing/issues/201)) ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* type-safe contracts + mechanical extension paths (adapters, locales, packages) ([#247](https://github.com/NeosiaNexus/SitePing/issues/247)) ([75cd2f5](https://github.com/NeosiaNexus/SitePing/commit/75cd2f5024509e5552bfbcf7587a0d67819909a6))
* **widget:** capture last 50 console messages + failed network requests with each feedback ([#71](https://github.com/NeosiaNexus/SitePing/issues/71)) ([726e1b8](https://github.com/NeosiaNexus/SitePing/commit/726e1b8a0d4dcef726ec6dc468c168fb73396dbc))
* **widget:** render the 4-state model and capture screenshots with context ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))


### Bug Fixes

* **adapter-prisma:** notify webhooks once when the store reports its inserts; answer far pages from count ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* address independent audit findings on discussion threads ([988e95e](https://github.com/NeosiaNexus/SitePing/commit/988e95e8be134f4027cfd9c5a943e5c81dcf3903)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320)
* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517)) ([060d935](https://github.com/NeosiaNexus/SitePing/commit/060d935500b484a123746cfa5888c562fc437ddb))
* **core:** serialize collection-store mutations, harden store contracts ([21b81ef](https://github.com/NeosiaNexus/SitePing/commit/21b81efe995d6c45ef15a7ab1e300a821214311e)), closes [#341](https://github.com/NeosiaNexus/SitePing/issues/341) [#164](https://github.com/NeosiaNexus/SitePing/issues/164)
* harden webhooks, validation, store engine and adapter contracts (audit 2026-09) ([#279](https://github.com/NeosiaNexus/SitePing/issues/279)) ([7336eea](https://github.com/NeosiaNexus/SitePing/commit/7336eea220938df4b34c8ece9270d246f772e61d))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473)) ([fc1013c](https://github.com/NeosiaNexus/SitePing/commit/fc1013c9b3e3f4ea1655451ca386657ccc34831b))
* ship fully resolvable type declarations for every published package ([#232](https://github.com/NeosiaNexus/SitePing/issues/232)) ([01a8085](https://github.com/NeosiaNexus/SitePing/commit/01a8085c90fab4e721eaede8def9a4d9f5eefcc0))


### Refactoring

* **widget,core:** share SegmentedControl, setButtonLoading, filter logic ([#75](https://github.com/NeosiaNexus/SitePing/issues/75)) ([8cb536b](https://github.com/NeosiaNexus/SitePing/commit/8cb536bca303b82e76a00e461d939da210054714))


### Documentation

* **site:** ship siteping.dev/docs  verified bilingual documentation + slimmed READMEs ([#241](https://github.com/NeosiaNexus/SitePing/issues/241)) ([252073f](https://github.com/NeosiaNexus/SitePing/commit/252073f2eb11a99980d81eecb5ed37b23c3894f8))


### Miscellaneous

* **deps:** reclassify @medv/finder, widen prisma peer range, harmonize engines ([#74](https://github.com/NeosiaNexus/SitePing/issues/74)) ([b28465d](https://github.com/NeosiaNexus/SitePing/commit/b28465dc762077a535b79dbaffb51faa73f68538))
* release main ([#166](https://github.com/NeosiaNexus/SitePing/issues/166)) ([34b8226](https://github.com/NeosiaNexus/SitePing/commit/34b8226cf044b3defdc6a7ff90e55c5c84550573))
* release main ([#202](https://github.com/NeosiaNexus/SitePing/issues/202)) ([953baab](https://github.com/NeosiaNexus/SitePing/commit/953baabe6d78146d1970456f1e9b6ecd53dc6a86))
* release main ([#21](https://github.com/NeosiaNexus/SitePing/issues/21)) ([9867b31](https://github.com/NeosiaNexus/SitePing/commit/9867b31c226a7754120de326f11b054c97e2371a))
* release main ([#233](https://github.com/NeosiaNexus/SitePing/issues/233)) ([84e5010](https://github.com/NeosiaNexus/SitePing/commit/84e501071113a80c3dfc74ee51190cab27b325d7))
* release main ([#245](https://github.com/NeosiaNexus/SitePing/issues/245)) ([16a35d2](https://github.com/NeosiaNexus/SitePing/commit/16a35d26972b75239b8d5d320e0de31b946efeca))
* release main ([#250](https://github.com/NeosiaNexus/SitePing/issues/250)) ([191ed11](https://github.com/NeosiaNexus/SitePing/commit/191ed11453baaab25b4503e4b374449955ec7b9b))
* release main ([#251](https://github.com/NeosiaNexus/SitePing/issues/251)) ([9550c57](https://github.com/NeosiaNexus/SitePing/commit/9550c57b7fae1dd1f691c11aef55e13d6bc9f3f1))
* release main ([#356](https://github.com/NeosiaNexus/SitePing/issues/356)) ([3df0253](https://github.com/NeosiaNexus/SitePing/commit/3df02534a3dec57288b8b2445de951b21196ad5f))
* release main ([#45](https://github.com/NeosiaNexus/SitePing/issues/45)) ([8166be1](https://github.com/NeosiaNexus/SitePing/commit/8166be111f1578b469408682f366cbf2c66cbc07))
* release main ([#467](https://github.com/NeosiaNexus/SitePing/issues/467)) ([5d1cfad](https://github.com/NeosiaNexus/SitePing/commit/5d1cfad3451db8771cf67030bdf2694cae648b25))
* release main ([#77](https://github.com/NeosiaNexus/SitePing/issues/77)) ([af0b492](https://github.com/NeosiaNexus/SitePing/commit/af0b4922800834cd807a784875c37d4189219619))
</details>

<details><summary>adapter-kit: 0.3.0</summary>

## [0.3.0](https://github.com/NeosiaNexus/SitePing/compare/adapter-kit-v0.2.0...adapter-kit-v0.3.0) (2026-10-30)


###   BREAKING CHANGES

* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517))
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460))

### Features

* **adapter-drizzle:** add a Drizzle adapter for PostgreSQL and libSQL ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-kit:** add a persistence-failure leg to the conformance suite ([#471](https://github.com/NeosiaNexus/SitePing/issues/471)) ([5772dc5](https://github.com/NeosiaNexus/SitePing/commit/5772dc50f6612af76423c15c521ab8a58f421bb2))
* **adapter-kit:** export isUnreachableOffset and FeedbackCreateOutcome; conformance suite grows to 56 tests ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-localstorage:** expose createFeedbackIfAbsent ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-memory:** expose createFeedbackIfAbsent ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **core,server:** add discussion threads to feedback ([7cdca3b](https://github.com/NeosiaNexus/SitePing/commit/7cdca3b754c4b9e749772add28baafca38e021bb)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#280](https://github.com/NeosiaNexus/SitePing/issues/280)
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460)) ([c9799ae](https://github.com/NeosiaNexus/SitePing/commit/c9799aecad15434b84a8df4ee78d3735017daf9d))
* **server:** address independent audit findings ([511c3ff](https://github.com/NeosiaNexus/SitePing/commit/511c3ff732405331074066a6a262a5135817e760)), closes [#406](https://github.com/NeosiaNexus/SitePing/issues/406) [#364](https://github.com/NeosiaNexus/SitePing/issues/364)
* **server:** notify status changes, deletions and replies through opt-in webhook events ([#483](https://github.com/NeosiaNexus/SitePing/issues/483)) ([1847516](https://github.com/NeosiaNexus/SitePing/commit/18475163282a7c44f19a03f9223e8875372da3ea))
* type-safe contracts + mechanical extension paths (adapters, locales, packages) ([#247](https://github.com/NeosiaNexus/SitePing/issues/247)) ([75cd2f5](https://github.com/NeosiaNexus/SitePing/commit/75cd2f5024509e5552bfbcf7587a0d67819909a6))


### Bug Fixes

* **adapter-prisma,adapter-kit:** store text holding NUL or an unpaired surrogate ([#470](https://github.com/NeosiaNexus/SitePing/issues/470)) ([c059cb2](https://github.com/NeosiaNexus/SitePing/commit/c059cb2522f3dcfba388890f766be8d9d52cb7f9))
* **adapter-prisma:** notify webhooks once when the store reports its inserts; answer far pages from count ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* address independent audit findings on discussion threads ([988e95e](https://github.com/NeosiaNexus/SitePing/commit/988e95e8be134f4027cfd9c5a943e5c81dcf3903)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320)
* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517)) ([060d935](https://github.com/NeosiaNexus/SitePing/commit/060d935500b484a123746cfa5888c562fc437ddb))
* **core:** serialize collection-store mutations, harden store contracts ([21b81ef](https://github.com/NeosiaNexus/SitePing/commit/21b81efe995d6c45ef15a7ab1e300a821214311e)), closes [#341](https://github.com/NeosiaNexus/SitePing/issues/341) [#164](https://github.com/NeosiaNexus/SitePing/issues/164)
* harden webhooks, validation, store engine and adapter contracts (audit 2026-09) ([#279](https://github.com/NeosiaNexus/SitePing/issues/279)) ([7336eea](https://github.com/NeosiaNexus/SitePing/commit/7336eea220938df4b34c8ece9270d246f772e61d))
* **widget,dashboard,adapter-kit:** cap peer ranges at the majors CI runs ([#496](https://github.com/NeosiaNexus/SitePing/issues/496)) ([7c1afab](https://github.com/NeosiaNexus/SitePing/commit/7c1afab5360bb5bc353935b63d14e405067a09f4))
* **widget,dashboard,server:** export the types their public signatures use ([#477](https://github.com/NeosiaNexus/SitePing/issues/477)) ([f87ff7d](https://github.com/NeosiaNexus/SitePing/commit/f87ff7dec9c1a34679959db8d0cf426b4da87482))


### Miscellaneous

* release main ([#250](https://github.com/NeosiaNexus/SitePing/issues/250)) ([191ed11](https://github.com/NeosiaNexus/SitePing/commit/191ed11453baaab25b4503e4b374449955ec7b9b))
* release main ([#251](https://github.com/NeosiaNexus/SitePing/issues/251)) ([9550c57](https://github.com/NeosiaNexus/SitePing/commit/9550c57b7fae1dd1f691c11aef55e13d6bc9f3f1))
* release main ([#356](https://github.com/NeosiaNexus/SitePing/issues/356)) ([3df0253](https://github.com/NeosiaNexus/SitePing/commit/3df02534a3dec57288b8b2445de951b21196ad5f))
* release main ([#467](https://github.com/NeosiaNexus/SitePing/issues/467)) ([5d1cfad](https://github.com/NeosiaNexus/SitePing/commit/5d1cfad3451db8771cf67030bdf2694cae648b25))
</details>

<details><summary>dashboard: 0.4.0</summary>

## [0.4.0](https://github.com/NeosiaNexus/SitePing/compare/dashboard-v0.3.0...dashboard-v0.4.0) (2026-10-30)


###   BREAKING CHANGES

* **widget,dashboard:** align the widget and the dashboard before 1.0 ([#476](https://github.com/NeosiaNexus/SitePing/issues/476))
* **dashboard:** rename the inbox filter setters setStatusFilter and setTypeFilter ([#475](https://github.com/NeosiaNexus/SitePing/issues/475))
* **widget,dashboard:** settle the API leftovers before 1.0 ([#474](https://github.com/NeosiaNexus/SitePing/issues/474))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473))
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460))
* **widget:** render the 4-state model and capture screenshots with context
* **adapter-prisma:** 4-state validation, statuses bucket filter, screenshotRegion persistence

### Features

* **adapter-localstorage:** persist screenshotRegion and support multi-status queries ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **adapter-memory:** persist screenshotRegion and support multi-status queries ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **adapter-prisma:** 4-state validation, statuses bucket filter, screenshotRegion persistence ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **cli:** generate the screenshotRegion Json? column via siteping init/sync ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **core,server:** add discussion threads to feedback ([7cdca3b](https://github.com/NeosiaNexus/SitePing/commit/7cdca3b754c4b9e749772add28baafca38e021bb)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#280](https://github.com/NeosiaNexus/SitePing/issues/280)
* **core:** 4-state feedback model, screenshotRegion metadata and multi-status queries ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **dashboard:** @siteping/dashboard  Linear-style triage inbox with keyboard-first triage, annotated-screenshot evidence card, store/endpoint modes, theming and 7 locales; WCAG 2.1 AA verified (axe: zero violations) ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **dashboard:** resolve relative page links against a siteUrl ([#503](https://github.com/NeosiaNexus/SitePing/issues/503)) ([89e0c16](https://github.com/NeosiaNexus/SitePing/commit/89e0c1696b3626499d6e7e8a8d00ef14f707adf5))
* **demo:** freelancer inbox at /demo/inbox with a seeded triage backlog and real annotated screenshots ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* **i18n:** add a Japanese (ja) locale to the widget and dashboard ([4faa755](https://github.com/NeosiaNexus/SitePing/commit/4faa75552afd1bfcb14aa019ea77fcc2549baa96)), closes [#47](https://github.com/NeosiaNexus/SitePing/issues/47) [#320](https://github.com/NeosiaNexus/SitePing/issues/320)
* **i18n:** add a Korean (ko) locale to the widget and dashboard ([#430](https://github.com/NeosiaNexus/SitePing/issues/430)) ([90fbdee](https://github.com/NeosiaNexus/SitePing/commit/90fbdee725e0c56207bc2c1856aeb22a96ceca1d))
* **integration-issues:** keep one GitHub/GitLab issue per feedback ([#383](https://github.com/NeosiaNexus/SitePing/issues/383)) ([dc291e0](https://github.com/NeosiaNexus/SitePing/commit/dc291e01e9eee1934a05530830a0d31c2780621e)), closes [#318](https://github.com/NeosiaNexus/SitePing/issues/318)
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460)) ([c9799ae](https://github.com/NeosiaNexus/SitePing/commit/c9799aecad15434b84a8df4ee78d3735017daf9d))
* server-declared permissions and a read-only reviewer mode ([afd38aa](https://github.com/NeosiaNexus/SitePing/commit/afd38aaeef4358e9a82a7f7fac0303c6f920036a)), closes [#101](https://github.com/NeosiaNexus/SitePing/issues/101)
* **server,dashboard:** scope email access by project and permissions by comment ([#494](https://github.com/NeosiaNexus/SitePing/issues/494)) ([5261ea1](https://github.com/NeosiaNexus/SitePing/commit/5261ea1df5a0da70e650de95ad51f54f69235534))
* **server:** address independent audit findings ([511c3ff](https://github.com/NeosiaNexus/SitePing/commit/511c3ff732405331074066a6a262a5135817e760)), closes [#406](https://github.com/NeosiaNexus/SitePing/issues/406) [#364](https://github.com/NeosiaNexus/SitePing/issues/364)
* triage inbox (@siteping/dashboard), 4-state statuses and annotated screenshots ([#201](https://github.com/NeosiaNexus/SitePing/issues/201)) ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
* type-safe contracts + mechanical extension paths (adapters, locales, packages) ([#247](https://github.com/NeosiaNexus/SitePing/issues/247)) ([75cd2f5](https://github.com/NeosiaNexus/SitePing/commit/75cd2f5024509e5552bfbcf7587a0d67819909a6))
* **widget,dashboard:** show and reply to discussion threads ([d6721e4](https://github.com/NeosiaNexus/SitePing/commit/d6721e4972593229578ade211ac2b006f9dffb0f)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#331](https://github.com/NeosiaNexus/SitePing/issues/331)
* **widget:** render the 4-state model and capture screenshots with context ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))


### Bug Fixes

* **adapter-prisma:** redact authorEmail and strip clientId from unauthenticated HTTP responses (fixes [#105](https://github.com/NeosiaNexus/SitePing/issues/105)) ([#208](https://github.com/NeosiaNexus/SitePing/issues/208)) ([2a511e7](https://github.com/NeosiaNexus/SitePing/commit/2a511e762009ac1a17d5b6e08e6ab1bf04884b0d))
* address independent audit findings on discussion threads ([988e95e](https://github.com/NeosiaNexus/SitePing/commit/988e95e8be134f4027cfd9c5a943e5c81dcf3903)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320)
* **core:** serialize collection-store mutations, harden store contracts ([21b81ef](https://github.com/NeosiaNexus/SitePing/commit/21b81efe995d6c45ef15a7ab1e300a821214311e)), closes [#341](https://github.com/NeosiaNexus/SitePing/issues/341) [#164](https://github.com/NeosiaNexus/SitePing/issues/164)
* **dashboard:** append list params to an endpoint with a query string ([c61e3bf](https://github.com/NeosiaNexus/SitePing/commit/c61e3bfc7b511faf2fbcd5d5509b89e58ba43471))
* **dashboard:** make optimistic updates, pagination and focus race-free ([4a83abb](https://github.com/NeosiaNexus/SitePing/commit/4a83abba5155b7c92d3ed01b8dd33a5091aca7a1)), closes [#252](https://github.com/NeosiaNexus/SitePing/issues/252) [#164](https://github.com/NeosiaNexus/SitePing/issues/164)
* **dashboard:** re-place a save that a loading page 1 was read before ([#492](https://github.com/NeosiaNexus/SitePing/issues/492)) ([d209b6c](https://github.com/NeosiaNexus/SitePing/commit/d209b6c4d25fca7d1735f29ba8efdfe4c676d2e3))
* **dashboard:** rename the inbox filter setters setStatusFilter and setTypeFilter ([#475](https://github.com/NeosiaNexus/SitePing/issues/475)) ([9c4f1b5](https://github.com/NeosiaNexus/SitePing/commit/9c4f1b5d48673b2fafd2cd3673b4de2d5c61fca6))
* **dashboard:** render a screenshot only from a safe URL, like the widget ([#488](https://github.com/NeosiaNexus/SitePing/issues/488)) ([c3acfd0](https://github.com/NeosiaNexus/SitePing/commit/c3acfd0a4ba8dc9d12efea8272d6892114bcc781))
* **dashboard:** ship the "use client" directive on both entries ([#452](https://github.com/NeosiaNexus/SitePing/issues/452)) ([bd9804b](https://github.com/NeosiaNexus/SitePing/commit/bd9804bfac0a3c86fb455df145e978b18324ba91))
* **i18n:** merge registerLocale overrides over built-in dictionaries ([#446](https://github.com/NeosiaNexus/SitePing/issues/446)) ([0b2ef1c](https://github.com/NeosiaNexus/SitePing/commit/0b2ef1c2c41920e4af289a8d2bce66e6595d8466))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473)) ([fc1013c](https://github.com/NeosiaNexus/SitePing/commit/fc1013c9b3e3f4ea1655451ca386657ccc34831b))
* ship fully resolvable type declarations for every published package ([#232](https://github.com/NeosiaNexus/SitePing/issues/232)) ([01a8085](https://github.com/NeosiaNexus/SitePing/commit/01a8085c90fab4e721eaede8def9a4d9f5eefcc0))
* **widget,dashboard,adapter-kit:** cap peer ranges at the majors CI runs ([#496](https://github.com/NeosiaNexus/SitePing/issues/496)) ([7c1afab](https://github.com/NeosiaNexus/SitePing/commit/7c1afab5360bb5bc353935b63d14e405067a09f4))
* **widget,dashboard,server:** export the types their public signatures use ([#477](https://github.com/NeosiaNexus/SitePing/issues/477)) ([f87ff7d](https://github.com/NeosiaNexus/SitePing/commit/f87ff7dec9c1a34679959db8d0cf426b4da87482))
* **widget,dashboard:** align the widget and the dashboard before 1.0 ([#476](https://github.com/NeosiaNexus/SitePing/issues/476)) ([c0ce341](https://github.com/NeosiaNexus/SitePing/commit/c0ce3418947c8d920abba9fe48043038c7cb80e5))
* **widget,dashboard:** bring two text colors up to WCAG AA contrast ([#498](https://github.com/NeosiaNexus/SitePing/issues/498)) ([5795088](https://github.com/NeosiaNexus/SitePing/commit/57950888061cb90196f15241896aec92eda7bd5c))
* **widget,dashboard:** settle the API leftovers before 1.0 ([#474](https://github.com/NeosiaNexus/SitePing/issues/474)) ([de96fe8](https://github.com/NeosiaNexus/SitePing/commit/de96fe85480a3a13451e83effb34bfd01c8f6c1a))
* **widget,dashboard:** treat 408 and 429 as transient, honoring Retry-After ([#448](https://github.com/NeosiaNexus/SitePing/issues/448)) ([b540097](https://github.com/NeosiaNexus/SitePing/commit/b540097df4b63a730cc81e42033c56abb2e4e105))
* **widget:** clamp diagnostics buffers to the server's 50 / 20 entries ([c61e3bf](https://github.com/NeosiaNexus/SitePing/commit/c61e3bfc7b511faf2fbcd5d5509b89e58ba43471))
* **widget:** harden the send path, retry queue and captured context ([c61e3bf](https://github.com/NeosiaNexus/SitePing/commit/c61e3bfc7b511faf2fbcd5d5509b89e58ba43471)), closes [#307](https://github.com/NeosiaNexus/SitePing/issues/307) [#342](https://github.com/NeosiaNexus/SitePing/issues/342) [#344](https://github.com/NeosiaNexus/SitePing/issues/344)
* **widget:** record diagnostics URLs without credentials, query or hash ([c61e3bf](https://github.com/NeosiaNexus/SitePing/commit/c61e3bfc7b511faf2fbcd5d5509b89e58ba43471))


### Performance

* **dashboard,widget:** reclaim bundle size and tighten size budgets ([0f8a21e](https://github.com/NeosiaNexus/SitePing/commit/0f8a21e824225eb0f68e2eced583d154f4fe3790)), closes [#311](https://github.com/NeosiaNexus/SitePing/issues/311) [#313](https://github.com/NeosiaNexus/SitePing/issues/313)


### Refactoring

* **adapter-prisma:** share the 200-char identity cap with the widget ([c61e3bf](https://github.com/NeosiaNexus/SitePing/commit/c61e3bfc7b511faf2fbcd5d5509b89e58ba43471))
* **dashboard:** build deep links with core's shared helper ([dc291e0](https://github.com/NeosiaNexus/SitePing/commit/dc291e01e9eee1934a05530830a0d31c2780621e))


### Tests

* **dashboard:** unmount hooks in use-inbox tests  post-teardown debounce flake (fixes [#206](https://github.com/NeosiaNexus/SitePing/issues/206)) ([#212](https://github.com/NeosiaNexus/SitePing/issues/212)) ([2f74b78](https://github.com/NeosiaNexus/SitePing/commit/2f74b78df326597926b70051dec1bdea6e701fc6))


### Documentation

* **dashboard:** keep the admin apiKey out of the client bundle ([#455](https://github.com/NeosiaNexus/SitePing/issues/455)) ([92a0822](https://github.com/NeosiaNexus/SitePing/commit/92a08222c540717dd6958ac0329d2902f6ab5998))
* **site:** ship siteping.dev/docs  verified bilingual documentation + slimmed READMEs ([#241](https://github.com/NeosiaNexus/SitePing/issues/241)) ([252073f](https://github.com/NeosiaNexus/SitePing/commit/252073f2eb11a99980d81eecb5ed37b23c3894f8))


### Miscellaneous

* **deps-dev:** bump size-limit to 14.0.0 and replace preset-small-lib with @size-limit/file ([#294](https://github.com/NeosiaNexus/SitePing/issues/294)) ([2c56057](https://github.com/NeosiaNexus/SitePing/commit/2c56057b7d01de65bd446a0029a2377376fd34a9))
* **deps-dev:** bump the dev-dependencies group with 4 updates ([#284](https://github.com/NeosiaNexus/SitePing/issues/284)) ([b632f09](https://github.com/NeosiaNexus/SitePing/commit/b632f093912de591573a270767654b4c6e613f26))
* **deps-dev:** bump the dev-dependencies group with 7 updates ([#262](https://github.com/NeosiaNexus/SitePing/issues/262)) ([8be0415](https://github.com/NeosiaNexus/SitePing/commit/8be04151442a492d9b10a269b33d705c5c2c980c))
* **deps-dev:** bump the size-limit group across 1 directory with 2 updates ([#428](https://github.com/NeosiaNexus/SitePing/issues/428)) ([d10d533](https://github.com/NeosiaNexus/SitePing/commit/d10d53309a234f501782fd918085c594b2cffc76))
* **deps-dev:** bump the size-limit group with 2 updates ([#433](https://github.com/NeosiaNexus/SitePing/issues/433)) ([4719aff](https://github.com/NeosiaNexus/SitePing/commit/4719affea784de15538e4c8376a8e8f1ff4c6825))
* **deps-dev:** bump the size-limit group with 2 updates ([#468](https://github.com/NeosiaNexus/SitePing/issues/468)) ([d414ec7](https://github.com/NeosiaNexus/SitePing/commit/d414ec7ac80810c86d22d1600fc7ba786124a811))
* **deps-dev:** bump vitest from 3.2.7 to 4.1.10 in the vitest group across 1 directory ([#240](https://github.com/NeosiaNexus/SitePing/issues/240)) ([dca82f0](https://github.com/NeosiaNexus/SitePing/commit/dca82f078173c78d1703a7a8512adf1bffbc24ca))
* **deps:** bump the production-dependencies group across 1 directory with 7 updates ([#287](https://github.com/NeosiaNexus/SitePing/issues/287)) ([2d7d264](https://github.com/NeosiaNexus/SitePing/commit/2d7d2646a75276d6c8b53beb9ff070726ebdf5e4))
* release main ([#202](https://github.com/NeosiaNexus/SitePing/issues/202)) ([953baab](https://github.com/NeosiaNexus/SitePing/commit/953baabe6d78146d1970456f1e9b6ecd53dc6a86))
* release main ([#211](https://github.com/NeosiaNexus/SitePing/issues/211)) ([7032bd6](https://github.com/NeosiaNexus/SitePing/commit/7032bd62e607cf85cdd575dfcc6129b3d2bc418e))
* release main ([#213](https://github.com/NeosiaNexus/SitePing/issues/213)) ([22fca85](https://github.com/NeosiaNexus/SitePing/commit/22fca85a993b46ee8ee7880ca5cc2dd61d5a6b6d))
* release main ([#233](https://github.com/NeosiaNexus/SitePing/issues/233)) ([84e5010](https://github.com/NeosiaNexus/SitePing/commit/84e501071113a80c3dfc74ee51190cab27b325d7))
* release main ([#245](https://github.com/NeosiaNexus/SitePing/issues/245)) ([16a35d2](https://github.com/NeosiaNexus/SitePing/commit/16a35d26972b75239b8d5d320e0de31b946efeca))
* release main ([#250](https://github.com/NeosiaNexus/SitePing/issues/250)) ([191ed11](https://github.com/NeosiaNexus/SitePing/commit/191ed11453baaab25b4503e4b374449955ec7b9b))
* release main ([#251](https://github.com/NeosiaNexus/SitePing/issues/251)) ([9550c57](https://github.com/NeosiaNexus/SitePing/commit/9550c57b7fae1dd1f691c11aef55e13d6bc9f3f1))
* release main ([#297](https://github.com/NeosiaNexus/SitePing/issues/297)) ([2e8cc58](https://github.com/NeosiaNexus/SitePing/commit/2e8cc58728f6d39e83db5ef32e437530acaa0605))
* release main ([#356](https://github.com/NeosiaNexus/SitePing/issues/356)) ([3df0253](https://github.com/NeosiaNexus/SitePing/commit/3df02534a3dec57288b8b2445de951b21196ad5f))
* release main ([#437](https://github.com/NeosiaNexus/SitePing/issues/437)) ([9858802](https://github.com/NeosiaNexus/SitePing/commit/985880203fd9416cb298ab357d470adc5806f015))
* release main ([#467](https://github.com/NeosiaNexus/SitePing/issues/467)) ([5d1cfad](https://github.com/NeosiaNexus/SitePing/commit/5d1cfad3451db8771cf67030bdf2694cae648b25))
</details>

<details><summary>cli: 0.7.0</summary>

## [0.7.0](https://github.com/NeosiaNexus/SitePing/compare/cli-v0.6.0...cli-v0.7.0) (2026-10-30)


###   BREAKING CHANGES

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
* **dashboard:** @siteping/dashboard  Linear-style triage inbox with keyboard-first triage, annotated-screenshot evidence card, store/endpoint modes, theming and 7 locales; WCAG 2.1 AA verified (axe: zero violations) ([07e4c29](https://github.com/NeosiaNexus/SitePing/commit/07e4c29af5d522fd1a8ea124d6365b4e3463c96b))
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
* **cli:** run under plain Node  createRequire shim + Object.groupBy polyfill ([#221](https://github.com/NeosiaNexus/SitePing/issues/221)) ([45ee65d](https://github.com/NeosiaNexus/SitePing/commit/45ee65de4ed164b683d76e8ac6adc3b5bbe8240e))
* **cli:** translate to English, exit codes, timeout, nativeType support ([2773cae](https://github.com/NeosiaNexus/SitePing/commit/2773cae20de4e6d6a01635cd100003c783b16765))
* comprehensive audit  44 fixes across all packages ([60652ad](https://github.com/NeosiaNexus/SitePing/commit/60652ad03eb070fe18e2a4e943ea013f76070896))
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
* **site:** ship siteping.dev/docs  verified bilingual documentation + slimmed READMEs ([#241](https://github.com/NeosiaNexus/SitePing/issues/241)) ([252073f](https://github.com/NeosiaNexus/SitePing/commit/252073f2eb11a99980d81eecb5ed37b23c3894f8))
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
</details>

<details><summary>adapter-drizzle: 0.3.0</summary>

## [0.3.0](https://github.com/NeosiaNexus/SitePing/compare/adapter-drizzle-v0.2.0...adapter-drizzle-v0.3.0) (2026-10-30)


###   BREAKING CHANGES

* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517))
* **adapter-prisma:** upload screenshots under the stored feedback's id, and share one logger ([#495](https://github.com/NeosiaNexus/SitePing/issues/495))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473))
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460))

### Features

* **adapter-drizzle:** add a Drizzle adapter for PostgreSQL and libSQL ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-kit:** export isUnreachableOffset and FeedbackCreateOutcome; conformance suite grows to 56 tests ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-localstorage:** expose createFeedbackIfAbsent ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-memory:** expose createFeedbackIfAbsent ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-prisma:** delegate createSitepingHandler to @siteping/server and accept every server option (access, hooks, beforeCreate, presentFeedback, waitUntil, logger, describeError) ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))
* **core,server:** add discussion threads to feedback ([7cdca3b](https://github.com/NeosiaNexus/SitePing/commit/7cdca3b754c4b9e749772add28baafca38e021bb)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#280](https://github.com/NeosiaNexus/SitePing/issues/280)
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460)) ([c9799ae](https://github.com/NeosiaNexus/SitePing/commit/c9799aecad15434b84a8df4ee78d3735017daf9d))
* **server:** add @siteping/server, a store-agnostic HTTP handler ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1)), closes [#306](https://github.com/NeosiaNexus/SitePing/issues/306)
* **server:** notify status changes, deletions and replies through opt-in webhook events ([#483](https://github.com/NeosiaNexus/SitePing/issues/483)) ([1847516](https://github.com/NeosiaNexus/SitePing/commit/18475163282a7c44f19a03f9223e8875372da3ea))
* **widget,dashboard:** show and reply to discussion threads ([d6721e4](https://github.com/NeosiaNexus/SitePing/commit/d6721e4972593229578ade211ac2b006f9dffb0f)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#331](https://github.com/NeosiaNexus/SitePing/issues/331)


### Bug Fixes

* **adapter-drizzle,widget:** address independent audit findings ([de9763d](https://github.com/NeosiaNexus/SitePing/commit/de9763ddcc191d48ba9faa897441db749524bd6f)), closes [#348](https://github.com/NeosiaNexus/SitePing/issues/348)
* **adapter-prisma,adapter-kit:** store text holding NUL or an unpaired surrogate ([#470](https://github.com/NeosiaNexus/SitePing/issues/470)) ([c059cb2](https://github.com/NeosiaNexus/SitePing/commit/c059cb2522f3dcfba388890f766be8d9d52cb7f9))
* **adapter-prisma:** make @prisma/client an optional peer dependency (Bun then no longer warns about an out-of-range @prisma/client; npm and pnpm still do) ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))
* **adapter-prisma:** notify webhooks once when the store reports its inserts; answer far pages from count ([eb9c3a1](https://github.com/NeosiaNexus/SitePing/commit/eb9c3a1b546e6ca20cf94f02c8cd73ac3e7d97b0))
* **adapter-prisma:** run screenshot deletes at most 32 at a time ([d2ee80c](https://github.com/NeosiaNexus/SitePing/commit/d2ee80c858f24f4f7dc22a0ed1c70649efcef5e5))
* **adapter-prisma:** upload screenshots under the stored feedback's id, and share one logger ([#495](https://github.com/NeosiaNexus/SitePing/issues/495)) ([59ac33f](https://github.com/NeosiaNexus/SitePing/commit/59ac33f52db86ce97f6f62d9471649e1b288dfda))
* address independent audit findings on discussion threads ([988e95e](https://github.com/NeosiaNexus/SitePing/commit/988e95e8be134f4027cfd9c5a943e5c81dcf3903)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320)
* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517)) ([060d935](https://github.com/NeosiaNexus/SitePing/commit/060d935500b484a123746cfa5888c562fc437ddb))
* **screenshot-storage:** address independent audit findings ([d2ee80c](https://github.com/NeosiaNexus/SitePing/commit/d2ee80c858f24f4f7dc22a0ed1c70649efcef5e5))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473)) ([fc1013c](https://github.com/NeosiaNexus/SitePing/commit/fc1013c9b3e3f4ea1655451ca386657ccc34831b))
* **widget:** cut long console lines and URLs on a code-point boundary ([de9763d](https://github.com/NeosiaNexus/SitePing/commit/de9763ddcc191d48ba9faa897441db749524bd6f))


### Documentation

* **adapter-memory:** mount the store with @siteping/server and point the conformance suite at @siteping/adapter-kit/testing ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))


### Miscellaneous

* **deps-dev:** bump the dev-dependencies group across 1 directory with 11 updates ([#442](https://github.com/NeosiaNexus/SitePing/issues/442)) ([d3965b3](https://github.com/NeosiaNexus/SitePing/commit/d3965b32f85bb3c6f9f0928d5f9e4ec9014271c1))
* release main ([#356](https://github.com/NeosiaNexus/SitePing/issues/356)) ([3df0253](https://github.com/NeosiaNexus/SitePing/commit/3df02534a3dec57288b8b2445de951b21196ad5f))
* release main ([#467](https://github.com/NeosiaNexus/SitePing/issues/467)) ([5d1cfad](https://github.com/NeosiaNexus/SitePing/commit/5d1cfad3451db8771cf67030bdf2694cae648b25))
</details>

<details><summary>server: 0.3.0</summary>

## [0.3.0](https://github.com/NeosiaNexus/SitePing/compare/server-v0.2.0...server-v0.3.0) (2026-10-30)


###   BREAKING CHANGES

* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517))
* **adapter-kit:** require verifyProjectOwnership on every store ([#507](https://github.com/NeosiaNexus/SitePing/issues/507))
* **adapter-prisma:** upload screenshots under the stored feedback's id, and share one logger ([#495](https://github.com/NeosiaNexus/SitePing/issues/495))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473))
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460))
* **server,cli,adapter-prisma:** size MySQL columns for every value the server accepts ([#451](https://github.com/NeosiaNexus/SitePing/issues/451))

### Features

* **adapter-prisma:** delegate createSitepingHandler to @siteping/server and accept every server option (access, hooks, beforeCreate, presentFeedback, waitUntil, logger, describeError) ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))
* **core,server:** add discussion threads to feedback ([7cdca3b](https://github.com/NeosiaNexus/SitePing/commit/7cdca3b754c4b9e749772add28baafca38e021bb)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#280](https://github.com/NeosiaNexus/SitePing/issues/280)
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460)) ([c9799ae](https://github.com/NeosiaNexus/SitePing/commit/c9799aecad15434b84a8df4ee78d3735017daf9d))
* server-declared permissions and a read-only reviewer mode ([afd38aa](https://github.com/NeosiaNexus/SitePing/commit/afd38aaeef4358e9a82a7f7fac0303c6f920036a)), closes [#101](https://github.com/NeosiaNexus/SitePing/issues/101)
* **server,dashboard:** scope email access by project and permissions by comment ([#494](https://github.com/NeosiaNexus/SitePing/issues/494)) ([5261ea1](https://github.com/NeosiaNexus/SitePing/commit/5261ea1df5a0da70e650de95ad51f54f69235534))
* **server:** add @siteping/server, a store-agnostic HTTP handler ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1)), closes [#306](https://github.com/NeosiaNexus/SitePing/issues/306)
* **server:** address independent audit findings ([511c3ff](https://github.com/NeosiaNexus/SitePing/commit/511c3ff732405331074066a6a262a5135817e760)), closes [#406](https://github.com/NeosiaNexus/SitePing/issues/406) [#364](https://github.com/NeosiaNexus/SitePing/issues/364)
* **server:** notify status changes, deletions and replies through opt-in webhook events ([#483](https://github.com/NeosiaNexus/SitePing/issues/483)) ([1847516](https://github.com/NeosiaNexus/SitePing/commit/18475163282a7c44f19a03f9223e8875372da3ea))
* **server:** publish the wire protocol as OpenAPI, with a version signal ([#469](https://github.com/NeosiaNexus/SitePing/issues/469)) ([bbb4580](https://github.com/NeosiaNexus/SitePing/commit/bbb4580d333ee296c54f0fece29dfaa77cba8d8c))
* **widget,dashboard:** show and reply to discussion threads ([d6721e4](https://github.com/NeosiaNexus/SitePing/commit/d6721e4972593229578ade211ac2b006f9dffb0f)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#331](https://github.com/NeosiaNexus/SitePing/issues/331)


### Bug Fixes

* **adapter-kit:** require verifyProjectOwnership on every store ([#507](https://github.com/NeosiaNexus/SitePing/issues/507)) ([4c1ecda](https://github.com/NeosiaNexus/SitePing/commit/4c1ecda4a97b020f0a056345b59d21cbbcd6feeb))
* **adapter-prisma:** make @prisma/client an optional peer dependency (Bun then no longer warns about an out-of-range @prisma/client; npm and pnpm still do) ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))
* **adapter-prisma:** upload screenshots under the stored feedback's id, and share one logger ([#495](https://github.com/NeosiaNexus/SitePing/issues/495)) ([59ac33f](https://github.com/NeosiaNexus/SitePing/commit/59ac33f52db86ce97f6f62d9471649e1b288dfda))
* address independent audit findings on discussion threads ([988e95e](https://github.com/NeosiaNexus/SitePing/commit/988e95e8be134f4027cfd9c5a943e5c81dcf3903)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320)
* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517)) ([060d935](https://github.com/NeosiaNexus/SitePing/commit/060d935500b484a123746cfa5888c562fc437ddb))
* **server,cli,adapter-prisma:** size MySQL columns for every value the server accepts ([#451](https://github.com/NeosiaNexus/SitePing/issues/451)) ([acedb18](https://github.com/NeosiaNexus/SitePing/commit/acedb1836ac19ddc63d6dc73c23b661df5447880))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473)) ([fc1013c](https://github.com/NeosiaNexus/SitePing/commit/fc1013c9b3e3f4ea1655451ca386657ccc34831b))
* **widget,dashboard,server:** export the types their public signatures use ([#477](https://github.com/NeosiaNexus/SitePing/issues/477)) ([f87ff7d](https://github.com/NeosiaNexus/SitePing/commit/f87ff7dec9c1a34679959db8d0cf426b4da87482))


### Documentation

* **adapter-memory:** mount the store with @siteping/server and point the conformance suite at @siteping/adapter-kit/testing ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))
* **server:** add a Better Auth recipe for access control ([03abaa1](https://github.com/NeosiaNexus/SitePing/commit/03abaa1e08dba8897dee6ccd1b7eabf68f6c0a31))
* **server:** add an OpenID Connect recipe for custom access ([#379](https://github.com/NeosiaNexus/SitePing/issues/379)) ([98ea96c](https://github.com/NeosiaNexus/SitePing/commit/98ea96c15cb0ef63cf095468b45ba34e55481708)), closes [#85](https://github.com/NeosiaNexus/SitePing/issues/85)


### Miscellaneous

* **deps-dev:** bump the dev-dependencies group across 1 directory with 11 updates ([#442](https://github.com/NeosiaNexus/SitePing/issues/442)) ([d3965b3](https://github.com/NeosiaNexus/SitePing/commit/d3965b32f85bb3c6f9f0928d5f9e4ec9014271c1))
* **deps-dev:** bump the dev-dependencies group across 1 directory with 5 updates ([#429](https://github.com/NeosiaNexus/SitePing/issues/429)) ([fd2d708](https://github.com/NeosiaNexus/SitePing/commit/fd2d7089fcd0cc3566cbeee8ebde7e51227e9391))
* release main ([#356](https://github.com/NeosiaNexus/SitePing/issues/356)) ([3df0253](https://github.com/NeosiaNexus/SitePing/commit/3df02534a3dec57288b8b2445de951b21196ad5f))
* release main ([#437](https://github.com/NeosiaNexus/SitePing/issues/437)) ([9858802](https://github.com/NeosiaNexus/SitePing/commit/985880203fd9416cb298ab357d470adc5806f015))
* release main ([#467](https://github.com/NeosiaNexus/SitePing/issues/467)) ([5d1cfad](https://github.com/NeosiaNexus/SitePing/commit/5d1cfad3451db8771cf67030bdf2694cae648b25))
</details>

<details><summary>screenshot-storage: 0.3.0</summary>

## [0.3.0](https://github.com/NeosiaNexus/SitePing/compare/screenshot-storage-v0.2.0...screenshot-storage-v0.3.0) (2026-10-30)


###   BREAKING CHANGES

* **adapter-prisma:** upload screenshots under the stored feedback's id, and share one logger ([#495](https://github.com/NeosiaNexus/SitePing/issues/495))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473))
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460))

### Features

* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460)) ([c9799ae](https://github.com/NeosiaNexus/SitePing/commit/c9799aecad15434b84a8df4ee78d3735017daf9d))
* **screenshot-storage:** add cacheControl option for S3 objects and the serve handler ([#426](https://github.com/NeosiaNexus/SitePing/issues/426)) ([2dee963](https://github.com/NeosiaNexus/SitePing/commit/2dee963def5eb455f04822659edb1d683d070569)), closes [#416](https://github.com/NeosiaNexus/SitePing/issues/416)
* **screenshot-storage:** add S3, Cloudflare Images, file and DB storage ([a2672f5](https://github.com/NeosiaNexus/SitePing/commit/a2672f509b47f6f5181d480cfc0ee0faed361885))


### Bug Fixes

* **adapter-prisma:** run screenshot deletes at most 32 at a time ([d2ee80c](https://github.com/NeosiaNexus/SitePing/commit/d2ee80c858f24f4f7dc22a0ed1c70649efcef5e5))
* **adapter-prisma:** upload screenshots under the stored feedback's id, and share one logger ([#495](https://github.com/NeosiaNexus/SitePing/issues/495)) ([59ac33f](https://github.com/NeosiaNexus/SitePing/commit/59ac33f52db86ce97f6f62d9471649e1b288dfda))
* **screenshot-storage:** address independent audit findings ([d2ee80c](https://github.com/NeosiaNexus/SitePing/commit/d2ee80c858f24f4f7dc22a0ed1c70649efcef5e5))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473)) ([fc1013c](https://github.com/NeosiaNexus/SitePing/commit/fc1013c9b3e3f4ea1655451ca386657ccc34831b))


### Miscellaneous

* **deps-dev:** bump the dev-dependencies group across 1 directory with 11 updates ([#442](https://github.com/NeosiaNexus/SitePing/issues/442)) ([d3965b3](https://github.com/NeosiaNexus/SitePing/commit/d3965b32f85bb3c6f9f0928d5f9e4ec9014271c1))
* release main ([#356](https://github.com/NeosiaNexus/SitePing/issues/356)) ([3df0253](https://github.com/NeosiaNexus/SitePing/commit/3df02534a3dec57288b8b2445de951b21196ad5f))
* release main ([#467](https://github.com/NeosiaNexus/SitePing/issues/467)) ([5d1cfad](https://github.com/NeosiaNexus/SitePing/commit/5d1cfad3451db8771cf67030bdf2694cae648b25))
</details>

<details><summary>integration-issues: 0.3.0</summary>

## [0.3.0](https://github.com/NeosiaNexus/SitePing/compare/integration-issues-v0.2.0...integration-issues-v0.3.0) (2026-10-30)


###   BREAKING CHANGES

* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460))

### Features

* **integration-issues:** address independent audit findings ([6d7b994](https://github.com/NeosiaNexus/SitePing/commit/6d7b99436173f83040e491a17060104414f99ea1)), closes [#318](https://github.com/NeosiaNexus/SitePing/issues/318)
* **integration-issues:** keep one GitHub/GitLab issue per feedback ([#383](https://github.com/NeosiaNexus/SitePing/issues/383)) ([dc291e0](https://github.com/NeosiaNexus/SitePing/commit/dc291e01e9eee1934a05530830a0d31c2780621e)), closes [#318](https://github.com/NeosiaNexus/SitePing/issues/318)
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460)) ([c9799ae](https://github.com/NeosiaNexus/SitePing/commit/c9799aecad15434b84a8df4ee78d3735017daf9d))
* **server:** address independent audit findings ([511c3ff](https://github.com/NeosiaNexus/SitePing/commit/511c3ff732405331074066a6a262a5135817e760)), closes [#406](https://github.com/NeosiaNexus/SitePing/issues/406) [#364](https://github.com/NeosiaNexus/SitePing/issues/364)


### Bug Fixes

* **integration-issues:** accept undefined for every optional setting ([#506](https://github.com/NeosiaNexus/SitePing/issues/506)) ([9762a45](https://github.com/NeosiaNexus/SitePing/commit/9762a455189ee4fcb84ed2606e23c437645efdcd))
* **integration-issues:** depend on no @siteping/server version ([#459](https://github.com/NeosiaNexus/SitePing/issues/459)) ([4746c9a](https://github.com/NeosiaNexus/SitePing/commit/4746c9ae591067671920602c35994d9eab89b063))


### Refactoring

* **dashboard:** build deep links with core's shared helper ([dc291e0](https://github.com/NeosiaNexus/SitePing/commit/dc291e01e9eee1934a05530830a0d31c2780621e))


### Miscellaneous

* **deps-dev:** bump the dev-dependencies group across 1 directory with 11 updates ([#442](https://github.com/NeosiaNexus/SitePing/issues/442)) ([d3965b3](https://github.com/NeosiaNexus/SitePing/commit/d3965b32f85bb3c6f9f0928d5f9e4ec9014271c1))
* release main ([#356](https://github.com/NeosiaNexus/SitePing/issues/356)) ([3df0253](https://github.com/NeosiaNexus/SitePing/commit/3df02534a3dec57288b8b2445de951b21196ad5f))
* release main ([#467](https://github.com/NeosiaNexus/SitePing/issues/467)) ([5d1cfad](https://github.com/NeosiaNexus/SitePing/commit/5d1cfad3451db8771cf67030bdf2694cae648b25))
</details>

---
This PR was generated with [Release Please](https://github.com/googleapis/release-please). See [documentation](https://github.com/googleapis/release-please#release-please).