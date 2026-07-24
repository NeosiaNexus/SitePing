"use client";

import { useEffect } from "react";

export function WidgetInit() {
  useEffect(() => {
    let destroyed = false;
    let instance: { destroy: () => void } | null = null;

    import("@siteping/widget").then(({ initSiteping }) => {
      if (destroyed) return;
      instance = initSiteping({
        endpoint: "/api/siteping",
        projectName: "demo",
        forceShow: true,
        accentColor: "#173CFF",
        locale: "en",
        // Demo: capture the annotated area (plus context) so the inbox at
        // /demo/inbox can re-render the annotation on the screenshot.
        enableScreenshot: true,
        // "Open on page" links from the inbox (?siteping=<id>) focus the annotation.
        deepLink: true,
        // Demo: capture console + failed XHR/fetch on each feedback so
        // viewers can replay how the page got into the state they
        // annotated. Safe in this sandbox — no PII is logged.
        captureDiagnostics: true,
      });
    });

    return () => {
      destroyed = true;
      instance?.destroy();
    };
  }, []);

  return null;
}
