[![npm version](https://img.shields.io/npm/v/@siteping/adapter-localstorage)](https://www.npmjs.com/package/@siteping/adapter-localstorage)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

# @siteping/adapter-localstorage

Client-side localStorage adapter for [Siteping](https://github.com/NeosiaNexus/SitePing) — feedback persistence without a server.

Part of the [@siteping](https://github.com/NeosiaNexus/SitePing) monorepo.

## Install

```bash
npm install @siteping/adapter-localstorage
```

## Usage

Pass the store directly to the widget — no server needed:

```ts
import { initSiteping } from '@siteping/widget'
import { LocalStorageStore } from '@siteping/adapter-localstorage'

const store = new LocalStorageStore()

initSiteping({
  store,
  projectName: 'my-project',
})
```

Feedback persists across page reloads via `localStorage`. Data is scoped to the current origin.

## API

### `new LocalStorageStore(options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `key` | `string` | `'siteping_feedbacks'` | localStorage key for data persistence |

### `store.clear()`

Remove all data from localStorage for this store key.

## Use Cases

- **Demo pages** — static pages with feedback persistence, zero server
- **Prototyping** — test the widget without setting up a database
- **Offline-first** — feedback stored locally, synced later

## Edge Cases

- **localStorage full** — `createFeedback` drops the screenshot (the heaviest field) and retries; if the write still fails — or a `updateFeedback` / `deleteFeedback` / `deleteAllFeedbacks` write fails — a `StorePersistenceError` is thrown so callers know the mutation was **not** persisted (detect it with `isStorePersistence`)
- **Corrupted data** — returns empty array, does not throw
- **Multiple stores** — use different `key` values for isolation

## Related Packages

| Package | Description |
|---------|-------------|
| [`@siteping/widget`](https://www.npmjs.com/package/@siteping/widget) | Browser feedback widget |
| [`@siteping/adapter-prisma`](https://www.npmjs.com/package/@siteping/adapter-prisma) | Server-side Prisma adapter |
| [`@siteping/adapter-memory`](https://www.npmjs.com/package/@siteping/adapter-memory) | In-memory adapter (testing, demos) |
| [`@siteping/cli`](https://www.npmjs.com/package/@siteping/cli) | CLI for project setup |

## License

[MIT](https://github.com/NeosiaNexus/SitePing/blob/main/LICENSE)
