"use client";

import { useEffect } from "react";

/**
 * The widget's own desktop threshold. `forceShow` (which the docs site needs,
 * being a production build) bypasses the built-in viewport guard along with the
 * production one — so we re-apply it here rather than serve phone readers a
 * widget the docs themselves describe as desktop-only.
 */
const MIN_VIEWPORT_WIDTH = 768;

/**
 * Dogfoods the widget on the docs pages in client-side store mode — the
 * zero-server setup the quickstart describes. Feedback lands in the reader's
 * own localStorage; no endpoint involved.
 */
export function DocsWidget({ locale }: { locale: string }) {
  useEffect(() => {
    if (window.innerWidth < MIN_VIEWPORT_WIDTH) return;

    let destroyed = false;
    let instance: { destroy: () => void } | null = null;

    Promise.all([import("@siteping/widget"), import("@siteping/adapter-localstorage")]).then(
      ([{ initSiteping }, { LocalStorageStore }]) => {
        if (destroyed) return;
        instance = initSiteping({
          store: new LocalStorageStore({ key: "siteping_docs_feedbacks" }),
          projectName: "docs",
          forceShow: true,
          accentColor: "#173CFF",
          locale,
          position: "bottom-right",
        });
      },
    );

    return () => {
      destroyed = true;
      instance?.destroy();
    };
  }, [locale]);

  return null;
}
