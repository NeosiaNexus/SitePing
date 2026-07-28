# @siteping/adapter-kit

Everything needed to build — and conformance-test — a custom [Siteping](https://siteping.dev) store adapter.

```ts
import { createCollectionStore, type SitepingStore } from "@siteping/adapter-kit";

// A complete adapter over any snapshot backend, in ~15 lines:
export function createMyStore(): SitepingStore {
  let records = load();
  return createCollectionStore({
    load: () => records,
    persist: (next) => save((records = next)),
    generateId: () => crypto.randomUUID(),
  });
}
```

Verify it with the shared conformance suite (vitest):

```ts
import { testSitepingStore } from "@siteping/adapter-kit/testing";
import { createMyStore } from "../src/index.js";

testSitepingStore(() => createMyStore());
```

**[Full guide → siteping.dev/docs/adapters/writing-an-adapter](https://siteping.dev/docs/adapters/writing-an-adapter)**

## License

MIT
