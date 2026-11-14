# @siteping/dashboard-svelte

**The SitePing triage inbox for Svelte 5.**

A port of [`@siteping/dashboard`](../dashboard) (React): the same Linear-style, keyboard-first inbox for the feedback your clients send through [`@siteping/widget`](https://www.npmjs.com/package/@siteping/widget), with the same markup, `spd-` classes, `--spd-*` CSS variables, locales and wire protocol. Only the framework layer differs.

> Private workspace package for now (`"private": true`): not registered with release-please, not published to npm.

## Requirements

Svelte `^5.40` (runes, `createContext`). The package ships uncompiled `.svelte` components and `.svelte.js` modules under the `svelte` export condition, so your Svelte toolchain (SvelteKit, `@sveltejs/vite-plugin-svelte`) compiles them, SSR included.

## Quick start

```svelte
<script lang="ts">
  import { SitepingInbox } from "@siteping/dashboard-svelte";
</script>

<div style="height: 100vh">
  <SitepingInbox projects="my-app" endpoint="/api/siteping" theme="auto" />
</div>
```

Mount it on an admin page behind your app's login: on the endpoint's origin it sends your session cookie, for the server's `access` policy to check. Never put the `apiKey` in a client bundle (`PUBLIC_*`, `VITE_*`): it authorizes every status change and delete.

Give it a container with a height: it fills its parent (min 480 px) and adapts to the container's width, not the viewport.

## Props

Every prop of the React `<SitepingInbox />`, with two Svelte idioms:

| React | Svelte |
| --- | --- |
| `className="…"` | `class="…"` |
| `emptyState={<p>…</p>}` | an `emptyState` snippet |

```svelte
<SitepingInbox projects={["site-a", "site-b"]} store={memoryStore} locale="fr" density="compact">
  {#snippet emptyState()}
    <p>Nothing to triage yet.</p>
  {/snippet}
</SitepingInbox>
```

Source modes are exclusive, as in React: `endpoint` (+ `apiKey` / `headers`), `store`, or a custom `source`.

## Headless

`createSitepingInbox` is the counterpart of React's `useSitepingInbox`: the full state machine (fetching, debounced search, tab counts, optimistic status changes with undo and rollback, pagination, threads, permissions) without the UI. It returns the same `InboxState`, whose fields are live reactive getters:

```svelte
<script lang="ts">
  import { createSitepingInbox } from "@siteping/dashboard-svelte";

  let { project }: { project: string } = $props();

  // A getter keeps the options reactive; a plain object is read once.
  const inbox = createSitepingInbox(() => ({ projects: project, endpoint: "/api/siteping" }));
</script>

{#each inbox.items as feedback (feedback.id)}
  <button onclick={() => inbox.changeStatus(feedback.id, "resolved")}>{feedback.message}</button>
{/each}
```

Call it during component initialisation (it owns `$effect`s, torn down with the component). Methods are bound, so `const { changeStatus } = inbox` works; destructure actions, not state.

## Development

```bash
bun run build   # svelte-package → dist/, then scripts/link-core.mjs vendors @siteping/core
bun run check   # tsc + svelte-check --fail-on-warnings
bunx vitest run --project dashboard-svelte   # from the repo root
```

`@siteping/core` is an unpublished internal package. `scripts/link-core.mjs` bundles the core exports `dist/` uses into `dist/siteping-core/`, copies core's declarations next to them, and rewrites every import to that folder.

The framework-agnostic modules (`i18n/`, `format.ts`, `source.ts`, `theme.ts`, `styles.ts`, `inject-styles.ts`) are copies of the React package's. Keep them in step: a change there belongs in both packages.

The tests reuse the React package's suites. `__tests__/controller.svelte.ts` and `__tests__/render.ts` provide `renderHook` / `render` / `act` / `fireEvent` / `waitFor` shims shaped like `@testing-library/react`, so the assertions run unchanged.

## License

[MIT](https://github.com/NeosiaNexus/SitePing/blob/main/LICENSE)
