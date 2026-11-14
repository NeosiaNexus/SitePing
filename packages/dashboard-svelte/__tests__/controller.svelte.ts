/**
 * A `renderHook` / `act` / `waitFor` / `cleanup` quartet for
 * `createSitepingInbox`, shaped like @testing-library/react's — so the React
 * dashboard's controller suite runs against the Svelte port unchanged.
 *
 * - `renderHook(callback, { initialProps })` calls `callback` ONCE inside an
 *   `$effect.root` (a controller is created once, unlike a hook re-run per
 *   render). Its `props` argument is a live view of the latest props:
 *   `rerender(next)` swaps them, and a controller reading them through its
 *   options sees the change reactively.
 * - `act(fn)` runs `fn`, awaits it when it returns a promise and drains the
 *   microtask queue, then flushes pending effects (`flushSync`) — what
 *   React's act does for state updates.
 * - `waitFor(assertion)` retries with effects flushed before every attempt.
 */
import { flushSync } from "svelte";
import { vi } from "vitest";

const roots = new Set<() => void>();

export function renderHook<R, P extends object = Record<never, never>>(
  callback: (props: P) => R,
  options: { initialProps?: P } = {},
) {
  let props = $state.raw<P>(options.initialProps ?? ({} as P));
  const live = new Proxy({} as P, {
    get: (_target, key) => Reflect.get(props, key),
    has: (_target, key) => Reflect.has(props, key),
    ownKeys: () => Reflect.ownKeys(props),
    getOwnPropertyDescriptor: (_target, key) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(props, key);
      return descriptor ? { ...descriptor, configurable: true } : undefined;
    },
  });
  let value: R | undefined;
  const destroy = $effect.root(() => {
    value = callback(live);
  });
  roots.add(destroy);
  flushSync();
  return {
    result: {
      get current(): R {
        return value as R;
      },
    },
    rerender(next?: P): void {
      if (next !== undefined) props = next;
      flushSync();
    },
    unmount(): void {
      roots.delete(destroy);
      destroy();
    },
  };
}

export function act<T>(fn: () => T): T extends PromiseLike<infer U> ? Promise<U> : undefined;
export function act(fn: () => unknown): unknown {
  const result = fn();
  if (result && typeof (result as PromiseLike<unknown>).then === "function") {
    return (async () => {
      try {
        return await result;
      } finally {
        // Like React's async act: let the promise chains the callback set off
        // (an awaited handler's own awaits) settle before flushing.
        for (let i = 0; i < 10; i += 1) await Promise.resolve();
        flushSync();
      }
    })();
  }
  flushSync();
  return undefined;
}

export function waitFor<T>(assertion: () => T, options?: Parameters<typeof vi.waitFor>[1]): Promise<T> {
  return vi.waitFor(() => {
    flushSync();
    return assertion();
  }, options);
}

/** Tear down every controller still alive — their effects (debounce timers) included. */
export function cleanup(): void {
  for (const destroy of roots) destroy();
  roots.clear();
}
