"use client";

import { useEffect } from "react";

/**
 * The docs site keeps its dogfood widget off phone-width screens: a phone
 * reader is reading, and a floating button over a narrow page gets in the way.
 * The widget itself renders at every width by default, with a phone layout.
 * `forceShow` (which the docs site needs, being a production build) bypasses
 * `minViewportWidth` along with the production guard, so the check lives here.
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
