/**
 * React helper for `@siteping/widget`.
 *
 * `useSiteping` initialises the widget once for the lifetime of the component
 * tree, even under React.StrictMode's double-invoke effect dance. Returns the
 * `SitepingInstance` so consumers can drive `open()` / `close()` / `refresh()`
 * programmatically from anywhere in their tree.
 *
 * Why a dedicated entry instead of a snippet in the README:
 * - StrictMode mounts every effect twice in dev, which the obvious
 *   `useEffect(() => { const i = initSiteping(...); return i.destroy }, [])`
 *   handles fine for *re-mount*, but not for the brief window where the
 *   second mount sees a still-alive widget (the widget's own singleton guard
 *   logs an info message and returns the existing instance — surprising
 *   noise for developers).
 * - The hook also captures the latest `config` in a ref so callbacks (e.g.
 *   `onFeedbackSent`) read closure values without re-initialising the widget.
 *
 * Peer dep on react ≥ 18 (declared as optional in package.json), so projects
 * that never import `@siteping/widget/react` don't need React installed.
 */

import type { SitepingConfig, SitepingInstance } from "@siteping/core";
import { useEffect, useRef, useState } from "react";
import { initSiteping } from "./index.js";

/**
 * Initialise the SitePing widget for the lifetime of the calling component.
 *
 * Safe to call from a Server Component file as long as the component itself
 * is marked `"use client"` — the hook bails out cleanly on the server because
 * `useEffect` never runs there.
 *
 * @example Next.js App Router
 * ```tsx
 * "use client"
 * import { useSiteping } from "@siteping/widget/react"
 *
 * export function FeedbackProvider({ children }: { children: React.ReactNode }) {
 *   useSiteping({
 *     endpoint: "/api/siteping",
 *     projectName: "my-app",
 *   })
 *   return <>{children}</>
 * }
 * ```
 *
 * @example Driving the panel programmatically
 * ```tsx
 * "use client"
 * import { useSiteping } from "@siteping/widget/react"
 *
 * export function HelpButton() {
 *   const widget = useSiteping({ endpoint: "/api/siteping", projectName: "my-app" })
 *   return <button onClick={() => widget?.open()}>Need help?</button>
 * }
 * ```
 */
export function useSiteping(config: SitepingConfig): SitepingInstance | null {
  // Keep callbacks fresh without retriggering the init effect. The widget
  // captures the *initial* config; we mirror updated handlers via the bridge
  // below so consumers can change `onFeedbackSent` between renders without
  // tearing the widget down.
  const configRef = useRef(config);
  configRef.current = config;

  const [instance, setInstance] = useState<SitepingInstance | null>(null);

  useEffect(() => {
    // `mounted` flag deals with the StrictMode double-effect: the cleanup of
    // the first run fires between the two `init` calls, so we set the flag
    // false in cleanup and skip late state updates. The widget itself has
    // its own singleton guard, so even if we managed to call init() twice
    // in a row we'd get the same instance back.
    let mounted = true;
    const created = initSiteping(configRef.current);
    if (!mounted) {
      // Cleanup already ran (StrictMode dev edge case) — tear down to avoid
      // leaving a dangling widget in the DOM.
      created.destroy();
      return;
    }

    // Bridge mutable callbacks: subscribe through the widget's public event
    // bus so we can call whatever the *latest* config has set. This lets
    // hosts change `onFeedbackSent`, `onError`, etc. between renders without
    // recreating the widget.
    const unsubSent = created.on("feedback:sent", (fb) => {
      configRef.current.onFeedbackSent?.(fb);
    });
    const unsubOpen = created.on("panel:open", () => {
      configRef.current.onOpen?.();
    });
    const unsubClose = created.on("panel:close", () => {
      configRef.current.onClose?.();
    });

    setInstance(created);

    return () => {
      mounted = false;
      unsubSent();
      unsubOpen();
      unsubClose();
      created.destroy();
      setInstance(null);
    };
    // The init effect intentionally has an empty dep array — config changes
    // are forwarded through configRef.current, not through re-init. Hosts
    // that need a fresh widget (e.g. swapping endpoint at runtime) should
    // unmount the component that owns the hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return instance;
}
