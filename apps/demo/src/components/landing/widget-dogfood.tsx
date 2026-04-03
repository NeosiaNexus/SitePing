"use client";

import { useEffect } from "react";

export function WidgetDogfood() {
  useEffect(() => {
    let destroyed = false;
    let instance: { destroy: () => void } | null = null;

    import("@siteping/widget").then(({ initSiteping }) => {
      if (destroyed) return;
      instance = initSiteping({
        endpoint: "/api/siteping",
        projectName: "landing",
        forceShow: true,
        accentColor: "#173CFF",
        locale: "en",
        position: "bottom-right",
      });
    });

    return () => {
      destroyed = true;
      instance?.destroy();
    };
  }, []);

  return null;
}
