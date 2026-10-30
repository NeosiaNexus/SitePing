# Changelog

## [0.2.0](https://github.com/NeosiaNexus/SitePing/compare/screenshot-storage-v0.1.0...screenshot-storage-v0.2.0) (2026-10-30)


### ⚠ BREAKING CHANGES

* **adapter-prisma:** upload screenshots under the stored feedback's id, and share one logger ([#495](https://github.com/NeosiaNexus/SitePing/issues/495))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473))
* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460))

### Features

* require Node.js 22 or later ([#460](https://github.com/NeosiaNexus/SitePing/issues/460)) ([c9799ae](https://github.com/NeosiaNexus/SitePing/commit/c9799aecad15434b84a8df4ee78d3735017daf9d))


### Bug Fixes

* **adapter-prisma:** upload screenshots under the stored feedback's id, and share one logger ([#495](https://github.com/NeosiaNexus/SitePing/issues/495)) ([59ac33f](https://github.com/NeosiaNexus/SitePing/commit/59ac33f52db86ce97f6f62d9471649e1b288dfda))
* **server,widget,dashboard:** freeze the error contract on structural guards ([#473](https://github.com/NeosiaNexus/SitePing/issues/473)) ([fc1013c](https://github.com/NeosiaNexus/SitePing/commit/fc1013c9b3e3f4ea1655451ca386657ccc34831b))


### Miscellaneous

* **deps-dev:** bump the dev-dependencies group across 1 directory with 11 updates ([#442](https://github.com/NeosiaNexus/SitePing/issues/442)) ([d3965b3](https://github.com/NeosiaNexus/SitePing/commit/d3965b32f85bb3c6f9f0928d5f9e4ec9014271c1))

## 0.1.0 (2026-10-05)


### Features

* **screenshot-storage:** add cacheControl option for S3 objects and the serve handler ([#426](https://github.com/NeosiaNexus/SitePing/issues/426)) ([2dee963](https://github.com/NeosiaNexus/SitePing/commit/2dee963def5eb455f04822659edb1d683d070569)), closes [#416](https://github.com/NeosiaNexus/SitePing/issues/416)
* **screenshot-storage:** add S3, Cloudflare Images, file and DB storage ([a2672f5](https://github.com/NeosiaNexus/SitePing/commit/a2672f509b47f6f5181d480cfc0ee0faed361885))


### Bug Fixes

* **adapter-prisma:** run screenshot deletes at most 32 at a time ([d2ee80c](https://github.com/NeosiaNexus/SitePing/commit/d2ee80c858f24f4f7dc22a0ed1c70649efcef5e5))
* **screenshot-storage:** address independent audit findings ([d2ee80c](https://github.com/NeosiaNexus/SitePing/commit/d2ee80c858f24f4f7dc22a0ed1c70649efcef5e5))

## Changelog
