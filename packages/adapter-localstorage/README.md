[![npm version](https://img.shields.io/npm/v/@siteping/adapter-localstorage)](https://www.npmjs.com/package/@siteping/adapter-localstorage)
[![Docs](https://img.shields.io/badge/docs-siteping.dev-0066ff)](https://siteping.dev/docs/adapters/localstorage)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

# @siteping/adapter-localstorage

Client-side store for [SitePing](https://github.com/NeosiaNexus/SitePing) — the whole feedback loop in the browser, no server required. Ideal for demos, prototypes, and docs sites.

**[Documentation](https://siteping.dev/docs/adapters/localstorage)**

## Install

```bash
npm install @siteping/adapter-localstorage
```

## Usage

```ts
import { initSiteping } from "@siteping/widget";
import { LocalStorageStore } from "@siteping/adapter-localstorage";

initSiteping({
  store: new LocalStorageStore(),   // options: { key?: string } — default "siteping_feedbacks"
  projectName: "my-demo",
});
```

Each visitor sees only their own feedback — data never leaves their browser. Corrupted stored data degrades to an empty list instead of crashing, quota pressure drops the screenshot before ever dropping the comment, and dates come back as real `Date` objects.

## License

[MIT](https://github.com/NeosiaNexus/SitePing/blob/main/LICENSE)
