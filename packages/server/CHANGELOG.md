# Changelog

## [0.3.0](https://github.com/NeosiaNexus/SitePing/compare/server-v0.2.0...server-v0.3.0) (2026-10-30)


### ⚠ BREAKING CHANGES

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

## [0.2.0](https://github.com/NeosiaNexus/SitePing/compare/server-v0.1.1...server-v0.2.0) (2026-10-30)


### ⚠ BREAKING CHANGES

* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517))
* **adapter-kit:** require verifyProjectOwnership on every store ([#507](https://github.com/NeosiaNexus/SitePing/issues/507))
* **adapter-prisma:** upload screenshots under the stored feedback's id, and share one logger ([#495](https://github.com/NeosiaNexus/SitePing/issues/495))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473))
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460))
* **server,cli,adapter-prisma:** size MySQL columns for every value the server accepts ([#451](https://github.com/NeosiaNexus/SitePing/issues/451))

### Features

* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460)) ([c9799ae](https://github.com/NeosiaNexus/SitePing/commit/c9799aecad15434b84a8df4ee78d3735017daf9d))
* **server,dashboard:** scope email access by project and permissions by comment ([#494](https://github.com/NeosiaNexus/SitePing/issues/494)) ([5261ea1](https://github.com/NeosiaNexus/SitePing/commit/5261ea1df5a0da70e650de95ad51f54f69235534))
* **server:** notify status changes, deletions and replies through opt-in webhook events ([#483](https://github.com/NeosiaNexus/SitePing/issues/483)) ([1847516](https://github.com/NeosiaNexus/SitePing/commit/18475163282a7c44f19a03f9223e8875372da3ea))
* **server:** publish the wire protocol as OpenAPI, with a version signal ([#469](https://github.com/NeosiaNexus/SitePing/issues/469)) ([bbb4580](https://github.com/NeosiaNexus/SitePing/commit/bbb4580d333ee296c54f0fece29dfaa77cba8d8c))


### Bug Fixes

* **adapter-kit:** require verifyProjectOwnership on every store ([#507](https://github.com/NeosiaNexus/SitePing/issues/507)) ([4c1ecda](https://github.com/NeosiaNexus/SitePing/commit/4c1ecda4a97b020f0a056345b59d21cbbcd6feeb))
* **adapter-prisma:** upload screenshots under the stored feedback's id, and share one logger ([#495](https://github.com/NeosiaNexus/SitePing/issues/495)) ([59ac33f](https://github.com/NeosiaNexus/SitePing/commit/59ac33f52db86ce97f6f62d9471649e1b288dfda))
* **core,adapter-kit:** make a repeated clientId throw StoreDuplicateError in every store ([#517](https://github.com/NeosiaNexus/SitePing/issues/517)) ([060d935](https://github.com/NeosiaNexus/SitePing/commit/060d935500b484a123746cfa5888c562fc437ddb))
* **server,cli,adapter-prisma:** size MySQL columns for every value the server accepts ([#451](https://github.com/NeosiaNexus/SitePing/issues/451)) ([acedb18](https://github.com/NeosiaNexus/SitePing/commit/acedb1836ac19ddc63d6dc73c23b661df5447880))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473)) ([fc1013c](https://github.com/NeosiaNexus/SitePing/commit/fc1013c9b3e3f4ea1655451ca386657ccc34831b))
* **widget,dashboard,server:** export the types their public signatures use ([#477](https://github.com/NeosiaNexus/SitePing/issues/477)) ([f87ff7d](https://github.com/NeosiaNexus/SitePing/commit/f87ff7dec9c1a34679959db8d0cf426b4da87482))


### Miscellaneous

* **deps-dev:** bump the dev-dependencies group across 1 directory with 11 updates ([#442](https://github.com/NeosiaNexus/SitePing/issues/442)) ([d3965b3](https://github.com/NeosiaNexus/SitePing/commit/d3965b32f85bb3c6f9f0928d5f9e4ec9014271c1))

## [0.1.1](https://github.com/NeosiaNexus/SitePing/compare/server-v0.1.0...server-v0.1.1) (2026-10-18)


### Miscellaneous

* **deps-dev:** bump the dev-dependencies group across 1 directory with 5 updates ([#429](https://github.com/NeosiaNexus/SitePing/issues/429)) ([fd2d708](https://github.com/NeosiaNexus/SitePing/commit/fd2d7089fcd0cc3566cbeee8ebde7e51227e9391))

## 0.1.0 (2026-10-05)


### Features

* **adapter-prisma:** delegate createSitepingHandler to @siteping/server and accept every server option (access, hooks, beforeCreate, presentFeedback, waitUntil, logger, describeError) ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))
* **core,server:** add discussion threads to feedback ([7cdca3b](https://github.com/NeosiaNexus/SitePing/commit/7cdca3b754c4b9e749772add28baafca38e021bb)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#280](https://github.com/NeosiaNexus/SitePing/issues/280)
* server-declared permissions and a read-only reviewer mode ([afd38aa](https://github.com/NeosiaNexus/SitePing/commit/afd38aaeef4358e9a82a7f7fac0303c6f920036a)), closes [#101](https://github.com/NeosiaNexus/SitePing/issues/101)
* **server:** add @siteping/server, a store-agnostic HTTP handler ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1)), closes [#306](https://github.com/NeosiaNexus/SitePing/issues/306)
* **server:** address independent audit findings ([511c3ff](https://github.com/NeosiaNexus/SitePing/commit/511c3ff732405331074066a6a262a5135817e760)), closes [#406](https://github.com/NeosiaNexus/SitePing/issues/406) [#364](https://github.com/NeosiaNexus/SitePing/issues/364)
* **widget,dashboard:** show and reply to discussion threads ([d6721e4](https://github.com/NeosiaNexus/SitePing/commit/d6721e4972593229578ade211ac2b006f9dffb0f)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320) [#331](https://github.com/NeosiaNexus/SitePing/issues/331)


### Bug Fixes

* **adapter-prisma:** make @prisma/client an optional peer dependency (Bun then no longer warns about an out-of-range @prisma/client; npm and pnpm still do) ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))
* address independent audit findings on discussion threads ([988e95e](https://github.com/NeosiaNexus/SitePing/commit/988e95e8be134f4027cfd9c5a943e5c81dcf3903)), closes [#320](https://github.com/NeosiaNexus/SitePing/issues/320)


### Documentation

* **adapter-memory:** mount the store with @siteping/server and point the conformance suite at @siteping/adapter-kit/testing ([53cb760](https://github.com/NeosiaNexus/SitePing/commit/53cb7603eaed6b19334a8178e947a2322b939ec1))
* **server:** add a Better Auth recipe for access control ([03abaa1](https://github.com/NeosiaNexus/SitePing/commit/03abaa1e08dba8897dee6ccd1b7eabf68f6c0a31))
* **server:** add an OpenID Connect recipe for custom access ([#379](https://github.com/NeosiaNexus/SitePing/issues/379)) ([98ea96c](https://github.com/NeosiaNexus/SitePing/commit/98ea96c15cb0ef63cf095468b45ba34e55481708)), closes [#85](https://github.com/NeosiaNexus/SitePing/issues/85)

## Changelog
