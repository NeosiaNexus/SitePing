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
      });
    });

    return () => {
      destroyed = true;
      instance?.destroy();
    };
  }, []);

  return null;
}
